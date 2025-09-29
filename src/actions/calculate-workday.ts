
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
import { getPayrollValores, esDiaDominical } from '@/lib/payroll-config-utils';
import type { PayrollValues } from '@/hooks/use-payroll-config';


// --- Constantes y Parámetros ---
const HORAS_JORNADA_BASE = 7.33; // Horas base antes de considerar extras
const HORA_NOCTURNA_INICIO = 21; // 9 PM (inclusive)
const HORA_NOCTURNA_FIN = 6;   // 6 AM (exclusive)

// Valores por hora (pesos colombianos)
// ESTE ES EL OBJETO QUE DEBES ACTUALIZAR SI LOS VALORES CAMBIAN:
// const VALORES = { ... } // Now imported from @/config/payroll-values

// Cache para festivos
let festivosCache: { [year: number]: Set<string> } = {};

async function getFestivosSet(year: number): Promise<Set<string>> {
    if (festivosCache[year]) {
        return festivosCache[year];
    }
    try {
        const holidays = await getColombianHolidays(year);
        if (!Array.isArray(holidays)) {
             console.error(`[getFestivosSet] Error: getColombianHolidays(${year}) no devolvió un array.`);
             throw new Error(`Formato de respuesta inválido para festivos de ${year}.`);
        }
        const festivosSet = new Set(holidays.map(h => {
             if (!h || typeof h.year !== 'number' || typeof h.month !== 'number' || typeof h.day !== 'number') {
                 console.error(`[getFestivosSet] Error: Estructura de objeto festivo inválida para ${year}:`, h);
                 return '';
             }
             try {
                const dateToFormat = new Date(h.year, h.month - 1, h.day);
                if (!isValid(dateToFormat) || getYear(dateToFormat) !== h.year) {
                    console.error(`[getFestivosSet] Error: Componentes de fecha inválidos para festivo en ${year}:`, h);
                    return '';
                }
                return format(dateToFormat, 'yyyy-MM-dd');
             } catch (formatError) {
                 console.error(`[getFestivosSet] Error formateando fecha festiva para ${year}:`, h, formatError);
                 return '';
             }
        }));
        const validFestivosSet = new Set(Array.from(festivosSet).filter(dateStr => dateStr !== ''));
        festivosCache[year] = validFestivosSet;
        return validFestivosSet;
    } catch (error) {
        console.error(`[getFestivosSet] Error al obtener o procesar festivos para ${year}:`, error);
        const userMessage = `Error consultando festivos para ${year}. Verifique la fuente de datos.`;
        throw new Error(userMessage + ` Detalle: ${error instanceof Error ? error.message : String(error)}`);
    }
}


async function esFestivo(fecha: Date): Promise<boolean> {
    const year = getYear(fecha);
    try {
        const festivos = await getFestivosSet(year);
        const fechaStr = format(fecha, 'yyyy-MM-dd');
        return festivos.has(fechaStr);
    } catch (error) {
        console.error(`[esFestivo] Error verificando si ${format(fecha, 'yyyy-MM-dd')} es festivo:`, error);
        throw new Error(`Error al verificar festivo: ${error instanceof Error ? error.message : String(error)}`);
    }
}

function esDomincalLocal(fecha: Date, diasConfig?: { domingo: boolean; lunes: boolean; martes: boolean; miercoles: boolean; jueves: boolean; viernes: boolean; sabado: boolean; }): boolean {
    // Si no se pasa configuración, usar comportamiento por defecto (solo domingos)
    if (!diasConfig) {
        return getDay(fecha) === 0; // 0 = Domingo
    }
    
    // Usar la configuración personalizada de días dominicales
    const dayOfWeek = getDay(fecha); // 0 = Sunday, 1 = Monday, etc.
    
    switch (dayOfWeek) {
        case 0: return diasConfig.domingo;
        case 1: return diasConfig.lunes;
        case 2: return diasConfig.martes;
        case 3: return diasConfig.miercoles;
        case 4: return diasConfig.jueves;
        case 5: return diasConfig.viernes;
        case 6: return diasConfig.sabado;
        default: return false;
    }
}

function parseTimeString(timeStr: string | undefined): { hours: number; minutes: number } | null {
    if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) return null;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return { hours, minutes };
}


// --- Lógica Principal de Cálculo ---
export async function calculateSingleWorkday(
    values: WorkdayFormValues,
    id: string,
    customValues?: PayrollValues,
    diasDominicalesConfig?: { domingo: boolean; lunes: boolean; martes: boolean; miercoles: boolean; jueves: boolean; viernes: boolean; sabado: boolean; }
): Promise<CalculationResults | CalculationError> {

    try {
        const { startDate, startTime, endTime, endsNextDay, includeBreak, breakStartTime, breakEndTime, compensatorioDiaFestivo, diaDescanso } = values;

        // --- Obtener valores de configuración ---
        const VALORES = customValues || getPayrollValores();

        // --- Manejo especial para días de descanso ---
        if (diaDescanso) {
            return {
                id,
                inputData: {
                    ...values,
                    startDate: startDate instanceof Date ? startDate : new Date(startDate)
                },
                duracionTotalTrabajadaHoras: 0,
                horasDetalladas: {
                    Ordinaria_Diurna_Base: 0,
                    Recargo_Noct_Base: 0,
                    Recargo_Dom_Diurno_Base: 0,
                    Recargo_Dom_Noct_Base: 0,
                    Recargo_Fest_Diurno_Base: 0,
                    Recargo_Fest_Noct_Base: 0,
                    HED: 0,
                    HEN: 0,
                    HED_Dom: 0,
                    HEN_Dom: 0,
                    HED_Fest: 0,
                    HEN_Fest: 0,
                    Compensatorio_dia_festivo_trabajado: 0,
                },
                pagoDetallado: {
                    Ordinaria_Diurna_Base: 0,
                    Recargo_Noct_Base: 0,
                    Recargo_Dom_Diurno_Base: 0,
                    Recargo_Dom_Noct_Base: 0,
                    Recargo_Fest_Diurno_Base: 0,
                    Recargo_Fest_Noct_Base: 0,
                    HED: 0,
                    HEN: 0,
                    HED_Dom: 0,
                    HEN_Dom: 0,
                    HED_Fest: 0,
                    HEN_Fest: 0,
                    Compensatorio_dia_festivo_trabajado: 0,
                },
                pagoTotalRecargosExtras: 0,
                pagoTotalConSalario: 0,
                tipoTurno: 'Día de Descanso',
                observaciones: 'Día registrado como descanso - 0 horas trabajadas'
            };
        }

        // --- Parseo y Validación Inicial ---
        if (!startDate || !isValid(startDate)) {
            return { error: `ID ${id}: Fecha de inicio inválida.` };
        }
        const inicioDtStr = `${format(startDate, 'yyyy-MM-dd')} ${startTime}`;
        const inicioDt = parse(inicioDtStr, 'yyyy-MM-dd HH:mm', new Date());

        if (!isValid(inicioDt)) {
            return { error: `ID ${id}: Fecha u hora de inicio inválida (${inicioDtStr}).` };
        }

        let finDtBase = startDate;
        if (endsNextDay) {
            finDtBase = addDays(startDate, 1);
        }
        const finDtStr = `${format(finDtBase, 'yyyy-MM-dd')} ${endTime}`;
        const finDt = parse(finDtStr, 'yyyy-MM-dd HH:mm', new Date());


        if (!isValid(finDt)) {
            return { error: `ID ${id}: Fecha u hora de fin inválida (${finDtStr}).` };
        }

        if (isBefore(finDt, inicioDt) || isEqual(finDt, inicioDt)) {
            return { error: `ID ${id}: La hora de fin debe ser posterior a la hora de inicio.` };
        }

        // --- Detectar si es día festivo ---
        let isFestivo = false;
        try {
            const year = getYear(startDate);
            const holidays = await getColombianHolidays(year);
            const dateStr = format(startDate, 'yyyy-MM-dd');
            isFestivo = holidays.some(holiday => {
                const holidayDate = format(new Date(holiday.year, holiday.month - 1, holiday.day), 'yyyy-MM-dd');
                return holidayDate === dateStr;
            });
        } catch (error) {
            console.warn(`[calculateSingleWorkday: ID ${id}] Error checking holidays, assuming not festive:`, error);
            isFestivo = false;
        }

        let parsedBreakStart: { hours: number; minutes: number } | null = null;
        let parsedBreakEnd: { hours: number; minutes: number } | null = null;
        let breakDurationSeconds = 0;

        if (includeBreak) {
            parsedBreakStart = parseTimeString(breakStartTime);
            parsedBreakEnd = parseTimeString(breakEndTime);

            if (!parsedBreakStart || !parsedBreakEnd) {
                 return { error: `ID ${id}: Formato de hora de descanso inválido (HH:mm).` };
            }

             const breakStartTotalMinutes = parsedBreakStart.hours * 60 + parsedBreakStart.minutes;
             const breakEndTotalMinutes = parsedBreakEnd.hours * 60 + parsedBreakEnd.minutes;
             if (breakEndTotalMinutes > breakStartTotalMinutes) {
                breakDurationSeconds = (breakEndTotalMinutes - breakStartTotalMinutes) * 60;
             } else {
                 console.warn(`ID ${id}: Hora fin descanso (${breakEndTime}) no posterior a inicio (${breakStartTime}), ignorando descanso.`);
                 breakDurationSeconds = 0;
             }
        }

        // --- Obtener Festivos ---
        await getFestivosSet(getYear(inicioDt));
        if (!isSameDay(inicioDt, finDt)) {
            await getFestivosSet(getYear(finDt));
        }

        // --- Inicializar contadores ---
        let horasClasificadas: CalculationResults['horasDetalladas'] = {
            "Ordinaria_Diurna_Base": 0.0, "Recargo_Noct_Base": 0.0, 
            "Recargo_Dom_Diurno_Base": 0.0, "Recargo_Dom_Noct_Base": 0.0, 
            "Recargo_Fest_Diurno_Base": 0.0, "Recargo_Fest_Noct_Base": 0.0,
            "HED": 0.0, "HEN": 0.0, 
            "HED_Dom": 0.0, "HEN_Dom": 0.0, 
            "HED_Fest": 0.0, "HEN_Fest": 0.0, "Compensatorio_dia_festivo_trabajado": 0.0
        };
        let duracionTotalTrabajadaSegundos = 0;
        let segundosTrabajadosAcumulados = 0;

        // --- Iterar minuto a minuto ---
        let cursorDt = inicioDt;
        while (isBefore(cursorDt, finDt)) {
            const cursorPlusOneMin = addHours(cursorDt, 1 / 60);
            const puntoEvaluacion = addHours(cursorDt, 1 / 120);
            const horaEval = getHours(puntoEvaluacion);
            const minutoEval = getMinutes(puntoEvaluacion);

            let esDescanso = false;
            if (includeBreak && parsedBreakStart && parsedBreakEnd && breakDurationSeconds > 0) {
                 const horaActualTotalMinutos = horaEval * 60 + minutoEval;
                 const inicioDescansoTotalMinutos = parsedBreakStart.hours * 60 + parsedBreakStart.minutes;
                 const finDescansoTotalMinutos = parsedBreakEnd.hours * 60 + parsedBreakEnd.minutes;
                 esDescanso = horaActualTotalMinutos >= inicioDescansoTotalMinutos && horaActualTotalMinutos < finDescansoTotalMinutos;
            }

            if (!esDescanso) {
                duracionTotalTrabajadaSegundos += 60;
                segundosTrabajadosAcumulados += 60;
                const horasTrabajadasAcumuladas = segundosTrabajadosAcumulados / 3600.0;
                const esHoraExtra = horasTrabajadasAcumuladas > HORAS_JORNADA_BASE;

                let esFestivo_flag: boolean;
                let esDominical_flag: boolean;
                try {
                    esFestivo_flag = await esFestivo(puntoEvaluacion);
                    esDominical_flag = esDomincalLocal(puntoEvaluacion, diasDominicalesConfig);
                } catch (holidayError) {
                     console.error(`ID ${id}: Error verificando festivo/dominical para ${format(puntoEvaluacion, 'yyyy-MM-dd')}:`, holidayError);
                     // Decide how to handle: throw, return error, or default to false? Returning error is safer.
                     return { error: `ID ${id}: Error al verificar si ${format(puntoEvaluacion, 'dd/MM')} es festivo/domingo. ${holidayError instanceof Error ? holidayError.message : ''}` };
                }

                const esNocturna = horaEval >= HORA_NOCTURNA_INICIO || horaEval < HORA_NOCTURNA_FIN;

                let categoria: keyof typeof horasClasificadas | null = null;

                if (esHoraExtra) {
                    if (esFestivo_flag) categoria = esNocturna ? "HEN_Fest" : "HED_Fest";
                    else if (esDominical_flag) categoria = esNocturna ? "HEN_Dom" : "HED_Dom";
                    else categoria = esNocturna ? "HEN" : "HED";
                } else {
                    if (esFestivo_flag) categoria = esNocturna ? "Recargo_Fest_Noct_Base" : "Recargo_Fest_Diurno_Base";
                    else if (esDominical_flag) categoria = esNocturna ? "Recargo_Dom_Noct_Base" : "Recargo_Dom_Diurno_Base";
                    else if (esNocturna) categoria = "Recargo_Noct_Base";
                    else horasClasificadas["Ordinaria_Diurna_Base"] += 1 / 60;
                }

                if (categoria) {
                    horasClasificadas[categoria] += 1 / 60;
                }
            }
            cursorDt = cursorPlusOneMin;
        }

         // --- Calcular Pagos ---
         let pagoTotalRecargosExtras = 0;
         const pagoDetallado: CalculationResults['pagoDetallado'] = {
             "Ordinaria_Diurna_Base": 0,
             "Recargo_Noct_Base": 0,
             "Recargo_Dom_Diurno_Base": 0,
             "Recargo_Dom_Noct_Base": 0,
             "Recargo_Fest_Diurno_Base": 0,
             "Recargo_Fest_Noct_Base": 0,
             "HED": 0,
             "HEN": 0,
             "HED_Dom": 0,
             "HEN_Dom": 0,
             "HED_Fest": 0,
             "HEN_Fest": 0,
             "Compensatorio_dia_festivo_trabajado": 0
         };

         for (const key in horasClasificadas) {
             const horas = horasClasificadas[key as keyof typeof horasClasificadas];
             const valorHora = VALORES[key as keyof typeof VALORES];

             if (valorHora === undefined && key !== "Ordinaria_Diurna_Base") {
                 console.error(`ID ${id}: No se encontró valor para la categoría '${key}' en VALORES.`);
                 // Consider throwing an error for missing critical configuration
                 return { error: `ID ${id}: Configuración de pagos incompleta. Falta valor para '${key}'.` };
             }

             if (horas > 0 && key !== "Ordinaria_Diurna_Base") {
                 const pagoCategoria = horas * (valorHora ?? 0);
                 pagoTotalRecargosExtras += pagoCategoria;
                 pagoDetallado[key as keyof typeof pagoDetallado] = pagoCategoria;
             } else {
                 pagoDetallado[key as keyof typeof pagoDetallado] = 0; // Ensure all keys exist, base diurnal has 0 extra payment
             }
         }

        // --- Manejo de Compensatorio Día Festivo ---
        if (compensatorioDiaFestivo && isFestivo) {
            const compensatorioValue = VALORES.Compensatorio_dia_festivo_trabajado || 0;
            horasClasificadas.Compensatorio_dia_festivo_trabajado = 1; // Mark as 1 unit
            pagoDetallado.Compensatorio_dia_festivo_trabajado = compensatorioValue;
            pagoTotalRecargosExtras += compensatorioValue;
        }

        return {
            id: id,
            inputData: { ...values, startDate }, // Ensure startDate is passed as Date
            horasDetalladas: horasClasificadas,
            pagoDetallado: pagoDetallado,
            pagoTotalRecargosExtras: pagoTotalRecargosExtras,
            pagoTotalConSalario: pagoTotalRecargosExtras, // Represents only extras for the day
            duracionTotalTrabajadaHoras: duracionTotalTrabajadaSegundos / 3600.0,
        };

    } catch (error) {
        console.error(`[calculateSingleWorkday: ID ${id}] Error inesperado:`, error);
        // Provide a more generic but informative error message for unexpected issues
        const errorMessage = `ID ${id}: Error inesperado en el servidor durante el cálculo. Detalles: ${error instanceof Error ? error.message : String(error)}`;
        return { error: errorMessage };
    }
}
