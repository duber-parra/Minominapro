
'use server';

import {
    parse, format, addHours, addDays,
    isBefore, isAfter, isEqual, isSameDay,
    startOfDay, endOfDay, getDay, getHours, getMinutes,
    differenceInSeconds, setHours, setMinutes, setSeconds, setMilliseconds,
    isValid, getYear
} from 'date-fns';
import type { z } from 'zod';
import type { WorkdayFormValues } from '@/components/workday-form'; // Adjust path if needed
import type { CalculationResults, CalculationError } from '@/types';
import { getColombianHolidays } from '@/services/colombian-holidays';


// --- Constantes y Parámetros ---
const HORAS_JORNADA_BASE = 7.66; // Horas base antes de considerar extras
const HORA_NOCTURNA_INICIO = 21; // 9 PM (inclusive)
const HORA_NOCTURNA_FIN = 6;   // 6 AM (exclusive)

// Valores por hora (pesos colombianos)
// ESTE ES EL OBJETO QUE DEBES ACTUALIZAR SI LOS VALORES CAMBIAN:
const VALORES = {
    "Recargo_Noct_Base": 2166,          // Recargo Nocturno (dentro de las 7.66h base, laboral)
    "HED": 7736.41,                        // Hora Extra Diurna (después de 7.66h,laboral, hasta las 9 pm )
    "HEN": 10830.98,                        // Hora Extra Nocturna (después de 7.66h, laboral)
    "Recargo_Dom_Diurno_Base": 4642,    // Recargo Dominical/Festivo Diurno (dentro de 7.66h)
    "Recargo_Dom_Noct_Base": 6808,    // Recargo Dominical/Festivo Nocturno (dentro de 7.66h)
    "HEDD_F": 12378.26,                     // Hora Extra Dominical/Festiva Diurna (después de 7.66h)
    "HEND_F": 15472.83,                     // Hora Extra Dominical/Festiva Nocturna (después de 7.66h)
    "Ordinaria_Diurna_Base": 0          // Horas base diurnas laborales (sin recargo adicional sobre el salario)
};
// const SALARIO_BASE_QUINCENAL = 711750; // Salario base quincenal will be handled at the summary level

// Cache para festivos
let festivosCache: { [year: number]: Set<string> } = {};

async function getFestivosSet(year: number): Promise<Set<string>> {
    if (festivosCache[year]) {
        return festivosCache[year];
    }
    try {
        const holidays = await getColombianHolidays(year);
        // Ensure holidays is an array before mapping
        if (!Array.isArray(holidays)) {
             console.error(`Error: getColombianHolidays(${year}) did not return an array.`);
             throw new Error(`Formato de respuesta inválido para festivos de ${year}.`);
        }
        const festivosSet = new Set(holidays.map(h => {
             // Add validation for holiday object structure if needed
             if (!h || typeof h.year !== 'number' || typeof h.month !== 'number' || typeof h.day !== 'number') {
                 console.error(`Error: Invalid holiday object structure for year ${year}:`, h);
                 // Depending on strictness, you might throw or just skip this entry
                 // throw new Error(`Estructura de festivo inválida.`);
                 return ''; // Skip invalid entry if Set creation handles empty strings ok
             }
             try {
                // Validate date components before formatting
                const dateToFormat = new Date(h.year, h.month - 1, h.day);
                if (!isValid(dateToFormat) || getYear(dateToFormat) !== h.year) {
                    console.error(`Error: Invalid date components for holiday in year ${year}:`, h);
                    return ''; // Skip invalid date
                }
                return format(dateToFormat, 'yyyy-MM-dd');
             } catch (formatError) {
                 console.error(`Error formatting holiday date for year ${year}:`, h, formatError);
                 return ''; // Skip on formatting error
             }
        }));
        // Filter out any empty strings added due to errors
        const validFestivosSet = new Set(Array.from(festivosSet).filter(dateStr => dateStr !== ''));
        festivosCache[year] = validFestivosSet;
        return validFestivosSet;
    } catch (error) {
        console.error(`Error al obtener o procesar festivos para ${year}:`, error);
        // Re-lanzar el error para que sea capturado por el try-catch principal
        // Provide a more user-friendly message if possible, or keep technical detail for logs
        const userMessage = `Error consultando/procesando festivos para ${year}. Verifique la fuente de datos.`;
        throw new Error(userMessage + ` Detalle: ${error instanceof Error ? error.message : String(error)}`);
    }
}


async function esFestivo(fecha: Date): Promise<boolean> {
    const year = getYear(fecha);
    try {
        const festivos = await getFestivosSet(year); // Can throw if getFestivosSet fails
        const fechaStr = format(fecha, 'yyyy-MM-dd');
        return festivos.has(fechaStr);
    } catch (error) {
        // Log the specific error and re-throw to be caught by the main handler
        console.error(`Error checking if date ${format(fecha, 'yyyy-MM-dd')} is a holiday:`, error);
        throw error; // Re-throw the original error (which should include details from getFestivosSet)
    }
}

function esDominical(fecha: Date): boolean {
    return getDay(fecha) === 0; // 0 = Domingo
}

// Helper to parse HH:mm time string into hours and minutes
function parseTimeString(timeStr: string | undefined): { hours: number; minutes: number } | null {
    if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) return null;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return { hours, minutes };
}


// --- Lógica Principal de Cálculo ---
// Returns calculation for a SINGLE workday
export async function calculateSingleWorkday(
    values: WorkdayFormValues,
    id: string // Pass the unique ID for this calculation
): Promise<CalculationResults | CalculationError> {

    try { // <--- Start of main try block
        const { startDate, startTime, endTime, endsNextDay, includeBreak, breakStartTime, breakEndTime } = values;

        // --- Parseo y Validación Inicial ---
        const inicioDtStr = `${format(startDate, 'yyyy-MM-dd')} ${startTime}`;
        const inicioDt = parse(inicioDtStr, 'yyyy-MM-dd HH:mm', new Date());

        if (!isValid(inicioDt)) {
            return { error: `ID ${id}: Fecha u hora de inicio inválida.` };
        }

        let finDt: Date;
        let finDtStr = `${format(startDate, 'yyyy-MM-dd')} ${endTime}`;
        if (endsNextDay) {
            finDtStr = `${format(addDays(startDate, 1), 'yyyy-MM-dd')} ${endTime}`;
        }
        finDt = parse(finDtStr, 'yyyy-MM-dd HH:mm', new Date());


        if (!isValid(finDt)) {
            return { error: `ID ${id}: Fecha u hora de fin inválida.` };
        }

        if (isBefore(finDt, inicioDt) || isEqual(finDt, inicioDt)) {
            return { error: `ID ${id}: La hora de fin debe ser posterior a la hora de inicio.` };
        }

        // --- Validar y parsear horas de descanso si aplica ---
        let parsedBreakStart: { hours: number; minutes: number } | null = null;
        let parsedBreakEnd: { hours: number; minutes: number } | null = null;
        let breakDurationSeconds = 0; // Initialize break duration

        if (includeBreak) {
            parsedBreakStart = parseTimeString(breakStartTime);
            parsedBreakEnd = parseTimeString(breakEndTime);

            if (!parsedBreakStart || !parsedBreakEnd) {
                 return { error: `ID ${id}: Formato de hora de descanso inválido (HH:mm).` };
            }
            if (parsedBreakEnd.hours < parsedBreakStart.hours || (parsedBreakEnd.hours === parsedBreakStart.hours && parsedBreakEnd.minutes <= parsedBreakStart.minutes)) {
                 return { error: `ID ${id}: La hora de fin del descanso debe ser posterior a la hora de inicio.` };
            }

             // Calculate break duration in seconds
             const breakStartTotalMinutes = parsedBreakStart.hours * 60 + parsedBreakStart.minutes;
             const breakEndTotalMinutes = parsedBreakEnd.hours * 60 + parsedBreakEnd.minutes;
             breakDurationSeconds = (breakEndTotalMinutes - breakStartTotalMinutes) * 60;

        }


        // --- Obtener Festivos para los años involucrados ---
        // This will throw if getFestivosSet fails internally
        await getFestivosSet(getYear(inicioDt));
        if (!isSameDay(inicioDt, finDt)) {
            await getFestivosSet(getYear(finDt));
        }


        // --- Inicializar contadores ---
        let horasClasificadas: CalculationResults['horasDetalladas'] = {
            "Ordinaria_Diurna_Base": 0.0,
            "Recargo_Noct_Base": 0.0,
            "Recargo_Dom_Diurno_Base": 0.0,
            "Recargo_Dom_Noct_Base": 0.0,
            "HED": 0.0,
            "HEN": 0.0,
            "HEDD_F": 0.0,
            "HEND_F": 0.0
        };
        let duracionTotalSegundosBrutos = differenceInSeconds(finDt, inicioDt);
        let duracionTotalTrabajadaSegundos = duracionTotalSegundosBrutos - (includeBreak ? breakDurationSeconds : 0);

        if (duracionTotalTrabajadaSegundos < 0) duracionTotalTrabajadaSegundos = 0; // Ensure it doesn't go negative

        let segundosTrabajadosAcumulados = 0; // To track the extra hours threshold

        // --- Iterar minuto a minuto sobre el tiempo BRUTO (antes de descontar descanso) ---
        let cursorDt = inicioDt;

        while (isBefore(cursorDt, finDt)) {
            const cursorPlusOneMin = addHours(cursorDt, 1 / 60); // Siguiente minuto

            // Punto medio del intervalo de 1 minuto para evaluar condiciones
            const puntoEvaluacion = addHours(cursorDt, 1 / 120); // +30 segundos
            const horaEval = getHours(puntoEvaluacion);
            const minutoEval = getMinutes(puntoEvaluacion); // Necesario para descansos precisos

            // Verificar si es Descanso usando los tiempos parseados si includeBreak es true
            let esDescanso = false;
            if (includeBreak && parsedBreakStart && parsedBreakEnd) {
                 const horaActualTotalMinutos = horaEval * 60 + minutoEval;
                 const inicioDescansoTotalMinutos = parsedBreakStart.hours * 60 + parsedBreakStart.minutes;
                 const finDescansoTotalMinutos = parsedBreakEnd.hours * 60 + parsedBreakEnd.minutes;

                 // El descanso es inclusivo en el inicio y exclusivo en el fin
                 esDescanso = horaActualTotalMinutos >= inicioDescansoTotalMinutos && horaActualTotalMinutos < finDescansoTotalMinutos;
            }

            if (!esDescanso) {
                // Solo clasificar si NO es descanso
                segundosTrabajadosAcumulados += 60; // Sumar un minuto efectivamente trabajado
                const horasTrabajadasAcumuladas = segundosTrabajadosAcumulados / 3600.0;
                const esHoraExtra = horasTrabajadasAcumuladas > HORAS_JORNADA_BASE;
                // The call to esFestivo is within the try-catch; if it fails, it will be caught.
                const esFestivoDominical = await esFestivo(puntoEvaluacion) || esDominical(puntoEvaluacion);
                const esNocturna = horaEval >= HORA_NOCTURNA_INICIO || horaEval < HORA_NOCTURNA_FIN;

                // --- Clasificación del minuto ---
                let categoria: keyof typeof horasClasificadas | null = null;

                if (esHoraExtra) {
                    if (esFestivoDominical) {
                        categoria = esNocturna ? "HEND_F" : "HEDD_F";
                    } else {
                        categoria = esNocturna ? "HEN" : "HED";
                    }
                } else { // Dentro de la jornada base
                    if (esFestivoDominical) {
                        categoria = esNocturna ? "Recargo_Dom_Noct_Base" : "Recargo_Dom_Diurno_Base";
                    } else { // Día laboral
                        if (esNocturna) {
                            categoria = "Recargo_Noct_Base";
                        } else {
                             // Para las horas base diurnas, no sumamos recargo, pero sí contamos las horas.
                             horasClasificadas["Ordinaria_Diurna_Base"] += 1 / 60;
                             // No asignamos categoría para no sumar recargo de VALORES["Ordinaria_Diurna_Base"] que es 0
                        }
                    }
                }

                // Sumar el minuto a la categoría correspondiente (si no es Ordinaria_Diurna_Base)
                if (categoria && categoria !== "Ordinaria_Diurna_Base") {
                    horasClasificadas[categoria] += 1 / 60;
                }
            }

            cursorDt = cursorPlusOneMin; // Avanzar al siguiente minuto
        }

         // --- Calcular Pagos ---
         let pagoTotalRecargosExtras = 0;
         const pagoDetallado: { [key: string]: number } = {};

         for (const key in horasClasificadas) {
             const horas = horasClasificadas[key as keyof typeof horasClasificadas];
             if (horas > 0) {
                  const valorHora = VALORES[key as keyof typeof VALORES] ?? 0; // Usar VALORES directos
                  // Agregar validación por si acaso VALORES no tuviera una clave esperada
                  if (valorHora === undefined && key !== "Ordinaria_Diurna_Base") {
                       console.warn(`ID ${id}: No se encontró valor para la categoría '${key}' en VALORES.`);
                       // Podrías lanzar un error aquí si es crítico
                       // throw new Error(`ID ${id}: Configuración de VALORES incompleta. Falta '${key}'.`);
                  }
                  const pagoCategoria = horas * (valorHora ?? 0);
                  pagoTotalRecargosExtras += pagoCategoria;
                  pagoDetallado[key] = pagoCategoria;
             } else {
                pagoDetallado[key] = 0; // Asegurar que todas las claves existan en el resultado
             }
         }


        // No sumar el salario base aquí, se hará en el resumen quincenal
        // const pagoTotalConSalario = pagoTotalRecargosExtras + SALARIO_BASE_QUINCENAL;

        // --- Retornar Resultados ---
        return {
            id: id, // Include the ID in the result
            inputData: values, // Store the input data used
            horasDetalladas: horasClasificadas,
            pagoDetallado: pagoDetallado,
            pagoTotalRecargosExtras: pagoTotalRecargosExtras, // Only extras/surcharges for this day
            pagoTotalConSalario: pagoTotalRecargosExtras, // Temporarily set this, might remove later as it's not quincenal total
            duracionTotalTrabajadaHoras: duracionTotalTrabajadaSegundos / 3600.0, // Include actual worked duration for the day
        };

    } catch (error) { // <--- Catch block for the main try
        console.error(`ID ${id}: Error inesperado durante el cálculo:`, error);
        // Return a CalculationError object with a specific or generic message
        // Include the ID in the error message for better tracking
        const errorMessage = `ID ${id}: Error inesperado durante el cálculo. ${error instanceof Error ? error.message : String(error)}`;
        return {
            error: errorMessage // Return the detailed error message
        };
    }
}

