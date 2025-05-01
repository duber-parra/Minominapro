
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
// No longer needed as defaults, will be passed from form
// const HORA_INICIO_DESCANSO = 15; // 3 PM (inclusive)
// const HORA_FIN_DESCANSO = 18; // 6 PM (exclusive)

// Valores por hora (pesos colombianos)
// ESTE ES EL OBJETO QUE DEBES ACTUALIZAR SI LOS VALORES CAMBIAN:
const VALORES = {
    "Recargo_Noct_Base": 2166,          // Recargo Nocturno (dentro de las 7.6h base, laboral)
    "HED": 7736.41,                        // Hora Extra Diurna (después de 7.6h,laboral, hasta las 9 pm )
    "HEN": 10830.98,                        // Hora Extra Nocturna (después de 7.6h, laboral)
    "Recargo_Dom_Diurno_Base": 4642,    // Recargo Dominical/Festivo Diurno (dentro de 7.6h)
    "Recargo_Dom_Noct_Base": 6808,    // Recargo Dominical/Festivo Nocturno (dentro de 7.6h)
    "HEDD_F": 12378.26,                     // Hora Extra Dominical/Festiva Diurna (después de 7.6h)
    "HEND_F": 15472.83,                     // Hora Extra Dominical/Festiva Nocturna (después de 7.6h)
    "Ordinaria_Diurna_Base": 0          // Horas base diurnas laborales (sin recargo adicional sobre el salario)
};
const SALARIO_BASE_QUINCENAL = 711750; // Salario base quincenal para sumar al final

// Cache para festivos
let festivosCache: { [year: number]: Set<string> } = {};

async function getFestivosSet(year: number): Promise<Set<string>> {
    if (festivosCache[year]) {
        return festivosCache[year];
    }
    try {
        const holidays = await getColombianHolidays(year);
        const festivosSet = new Set(holidays.map(h => format(new Date(h.year, h.month - 1, h.day), 'yyyy-MM-dd')));
        festivosCache[year] = festivosSet;
        return festivosSet;
    } catch (error) {
        console.error("Error al obtener festivos:", error);
        // Devolver Set vacío en caso de error para no bloquear el cálculo
        return new Set();
    }
}

async function esFestivo(fecha: Date): Promise<boolean> {
    const year = getYear(fecha);
    const festivos = await getFestivosSet(year);
    const fechaStr = format(fecha, 'yyyy-MM-dd');
    return festivos.has(fechaStr);
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
export async function calculateWorkday(
    values: WorkdayFormValues
): Promise<CalculationResults | CalculationError> {

    const { startDate, startTime, endTime, endsNextDay, includeBreak, breakStartTime, breakEndTime } = values;

    // --- Parseo y Validación Inicial ---
    const inicioDtStr = `${format(startDate, 'yyyy-MM-dd')} ${startTime}`;
    const inicioDt = parse(inicioDtStr, 'yyyy-MM-dd HH:mm', new Date());

    if (!isValid(inicioDt)) {
        return { error: "Fecha u hora de inicio inválida." };
    }

    let finDt: Date;
    let finDtStr = `${format(startDate, 'yyyy-MM-dd')} ${endTime}`;
    if (endsNextDay) {
        finDtStr = `${format(addDays(startDate, 1), 'yyyy-MM-dd')} ${endTime}`;
    }
    finDt = parse(finDtStr, 'yyyy-MM-dd HH:mm', new Date());


    if (!isValid(finDt)) {
        return { error: "Fecha u hora de fin inválida." };
    }

    if (isBefore(finDt, inicioDt) || isEqual(finDt, inicioDt)) {
        return { error: "La hora de fin debe ser posterior a la hora de inicio." };
    }

    // --- Validar y parsear horas de descanso si aplica ---
    let parsedBreakStart: { hours: number; minutes: number } | null = null;
    let parsedBreakEnd: { hours: number; minutes: number } | null = null;

    if (includeBreak) {
        parsedBreakStart = parseTimeString(breakStartTime);
        parsedBreakEnd = parseTimeString(breakEndTime);

        if (!parsedBreakStart || !parsedBreakEnd) {
             return { error: "Formato de hora de descanso inválido (HH:mm)." };
        }
        if (parsedBreakEnd.hours < parsedBreakStart.hours || (parsedBreakEnd.hours === parsedBreakStart.hours && parsedBreakEnd.minutes <= parsedBreakStart.minutes)) {
             return { error: "La hora de fin del descanso debe ser posterior a la hora de inicio." };
        }
    }


    // --- Obtener Festivos para los años involucrados ---
    await getFestivosSet(getYear(inicioDt));
    if (!isSameDay(inicioDt, finDt)) {
        await getFestivosSet(getYear(finDt));
    }


    // --- Inicializar contadores ---
    let horasClasificadas = {
        "Ordinaria_Diurna_Base": 0.0,
        "Recargo_Noct_Base": 0.0,
        "Recargo_Dom_Diurno_Base": 0.0,
        "Recargo_Dom_Noct_Base": 0.0,
        "HED": 0.0,
        "HEN": 0.0,
        "HEDD_F": 0.0,
        "HEND_F": 0.0
    };
    let duracionTotalTrabajadaSegundos = 0;
    let segundosTrabajadosAcumulados = 0; // Para rastrear el umbral de horas extra

    // --- Iterar minuto a minuto ---
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
            duracionTotalTrabajadaSegundos += 60; // Sumar un minuto trabajado
            const horasTrabajadasAcumuladas = duracionTotalTrabajadaSegundos / 3600.0;
            const esHoraExtra = horasTrabajadasAcumuladas > HORAS_JORNADA_BASE;
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
                         // Podríamos omitir la suma aquí si solo queremos recargos, pero lo mantenemos por claridad.
                         horasClasificadas["Ordinaria_Diurna_Base"] += 1 / 60;
                         // No asignamos categoría para no sumar recargo de VALORES["Ordinaria_Diurna_Base"] que es 0
                    }
                }
            }

            // Sumar el minuto a la categoría correspondiente (si no es Ordinaria_Diurna_Base)
            if (categoria && categoria !== "Ordinaria_Diurna_Base") {
                horasClasificadas[categoria] += 1 / 60;
            }
             // Asegurarnos de contar también las horas base diurnas dominicales/festivas y nocturnas para el total
             else if (categoria === null && !esNocturna && !esFestivoDominical && !esHoraExtra) {
                 // Ya sumado arriba
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
              const pagoCategoria = horas * valorHora;
              pagoTotalRecargosExtras += pagoCategoria;
              pagoDetallado[key] = pagoCategoria;
         } else {
            pagoDetallado[key] = 0; // Asegurar que todas las claves existan en el resultado
         }
     }


    // Sumar el salario base quincenal al pago total de recargos y extras
    const pagoTotalConSalario = pagoTotalRecargosExtras + SALARIO_BASE_QUINCENAL;

    // --- Retornar Resultados ---
    return {
        horasDetalladas: horasClasificadas,
        pagoDetallado: pagoDetallado,
        pagoTotalRecargosExtras: pagoTotalRecargosExtras, // Mantenemos el total solo de recargos/extras
        pagoTotalConSalario: pagoTotalConSalario, // Añadimos el total con salario
        duracionTotalTrabajadaHoras: duracionTotalTrabajadaSegundos / 3600.0, // Incluir duración real trabajada
    };
}

