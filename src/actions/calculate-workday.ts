'use server';

import {
    parse, format, addHours, addDays,
    isBefore, isAfter, isEqual, isSameDay,
    startOfDay, endOfDay, getDay, getHours,
    differenceInSeconds, setHours, setMinutes, setSeconds, setMilliseconds,
    isValid
} from 'date-fns';
import { getColombianHolidays } from '@/services/colombian-holidays';
import type { CalculationResults, CalculationError, WorkdayInput } from '@/types';


// --- Constantes y Parámetros ---
const HORAS_JORNADA_BASE = 7.6; // Horas base antes de considerar extras
const HORA_NOCTURNA_INICIO = 21; // 9 PM (inclusive)
const HORA_NOCTURNA_FIN = 6;   // 6 AM (exclusive)
const HORA_INICIO_DESCANSO = 15; // 3 PM (inclusive)
const HORA_FIN_DESCANSO = 18; // 6 PM (exclusive)

// Valores por hora (pesos colombianos) - Ejemplo
const VALORES_RECARGOS_EXTRAS = {
    "Recargo_Noct_Base": 2166,       // Recargo sobre hora ordinaria por ser nocturna
    "HED": 1547,                    // Valor extra por hora extra diurna (adicional al valor base)
    "HEN": 4642,                    // Valor extra por hora extra nocturna (adicional al valor base)
    "Recargo_Dom_Diurno_Base": 4642, // Recargo sobre hora ordinaria por ser dominical/festiva diurna
    "Recargo_Dom_Noct_Base": 6808,  // Recargo sobre hora ordinaria por ser dominical/festiva nocturna
    "HEDD_F": 6189,                 // Valor extra por hora extra dominical/festiva diurna
    "HEND_F": 9284,                 // Valor extra por hora extra dominical/festiva nocturna
    "Ordinaria_Diurna_Base": 0      // La hora base no tiene recargo *adicional* en sí misma
};

// Asumimos un valor hora base para calcular los pagos. ¡ESTO DEBERÍA SER DINÁMICO O CONFIGURABLE!
// Ejemplo: Salario Mínimo 2025 (hipotético) / 240 horas mensuales
const VALOR_HORA_BASE_EJEMPLO = 1300000 / 240;


async function esFestivo(fecha: Date, festivos: { year: number; month: number; day: number }[]): Promise<boolean> {
    const fechaStr = format(fecha, 'yyyy-MM-dd');
    return festivos.some(f => format(new Date(f.year, f.month - 1, f.day), 'yyyy-MM-dd') === fechaStr);
}

function esNocturno(hora: number): boolean {
    return hora >= HORA_NOCTURNA_INICIO || hora < HORA_NOCTURNA_FIN;
}

function esDominical(fecha: Date): boolean {
    return getDay(fecha) === 0; // 0 = Domingo
}

function estaEnDescanso(hora: number, descansoHabilitado: boolean): boolean {
    return descansoHabilitado && hora >= HORA_INICIO_DESCANSO && hora < HORA_FIN_DESCANSO;
}


export async function calculateWorkday(
    input: WorkdayInput
): Promise<CalculationResults | CalculationError> {

    const { startDate, startTime, endTime, endsNextDay, includeBreak } = input;

    // --- Parse Fechas ---
    const startDateTimeStr = `${format(startDate, 'yyyy-MM-dd')} ${startTime}`;
    let endDateTimeStr = `${format(startDate, 'yyyy-MM-dd')} ${endTime}`;

    const inicioDt = parse(startDateTimeStr, 'yyyy-MM-dd HH:mm', new Date());

    if (!isValid(inicioDt)) {
        return { error: "Invalid start date or time format." };
    }

    let finDtBase = parse(endDateTimeStr, 'yyyy-MM-dd HH:mm', new Date());
     if (!isValid(finDtBase)) {
        return { error: "Invalid end time format." };
    }

    // Adjust end date if endsNextDay is true
    let finDt = endsNextDay ? addDays(finDtBase, 1) : finDtBase;

    // Final validation
    if (isBefore(finDt, inicioDt) || isEqual(finDt, inicioDt)) {
        return { error: "End time must be after start time." };
    }

    // --- Obtener Festivos ---
    const year = inicioDt.getFullYear();
    const festivos = await getColombianHolidays(year);
     // Considerar año siguiente si el periodo cruza el año
     if (finDt.getFullYear() > year) {
         const festivosSiguienteAno = await getColombianHolidays(finDt.getFullYear());
         festivos.push(...festivosSiguienteAno);
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
    let pagosDetallados = { ...horasClasificadas }; // Inicializar con ceros
    let duracionTotalTrabajadaSegundos = 0;


    // --- Paso 1: Determinar Puntos Clave y Segmentos ---
    let puntosClave = new Set([inicioDt.getTime(), finDt.getTime()]);

    // Añadir medianoches
    let fechaCursorMedianoche = startOfDay(inicioDt);
    while (isBefore(fechaCursorMedianoche, finDt)) {
        const medianoche = endOfDay(fechaCursorMedianoche);
        if (isAfter(medianoche, inicioDt) && isBefore(medianoche, finDt)) {
             puntosClave.add(medianoche.getTime());
        }
        fechaCursorMedianoche = addDays(fechaCursorMedianoche, 1);
    }

    // Añadir cambios de horario (6 AM y 9 PM) y bordes de descanso (3 PM, 6 PM) si aplica
     let fechaCursorCambio = startOfDay(inicioDt);
     // Extender un día más para capturar cambios si finDt es justo a medianoche o inicio de hora
     const limiteCursorCambio = addDays(endOfDay(finDt), 1);

     while (isBefore(fechaCursorCambio, limiteCursorCambio)) {
        const puntosDelDia = [
            setMilliseconds(setSeconds(setMinutes(setHours(fechaCursorCambio, HORA_NOCTURNA_FIN), 0), 0), 0), // 6 AM
            setMilliseconds(setSeconds(setMinutes(setHours(fechaCursorCambio, HORA_NOCTURNA_INICIO), 0), 0), 0) // 9 PM
        ];

        if(includeBreak) {
            puntosDelDia.push(
                setMilliseconds(setSeconds(setMinutes(setHours(fechaCursorCambio, HORA_INICIO_DESCANSO), 0), 0), 0), // 3 PM
                setMilliseconds(setSeconds(setMinutes(setHours(fechaCursorCambio, HORA_FIN_DESCANSO), 0), 0), 0)  // 6 PM
            )
        }

        puntosDelDia.forEach(punto => {
             if (isValid(punto) && isAfter(punto, inicioDt) && isBefore(punto, finDt)) {
                puntosClave.add(punto.getTime());
            }
        });

        fechaCursorCambio = addDays(fechaCursorCambio, 1);
     }

    const puntosOrdenados = Array.from(puntosClave).sort((a, b) => a - b).map(ts => new Date(ts));


    // --- Paso 2: Calcular Duración Trabajada Real (descontando descanso) ---
    for (let i = 0; i < puntosOrdenados.length - 1; i++) {
        const tInicioSegmento = puntosOrdenados[i];
        const tFinSegmento = puntosOrdenados[i + 1];

        if (isEqual(tFinSegmento, tInicioSegmento)) continue;

        const duracionSegmentoSegundosTotal = differenceInSeconds(tFinSegmento, tInicioSegmento);
        const horaInicioSegmento = getHours(tInicioSegmento); // Evaluar al inicio del segmento

        if (!estaEnDescanso(horaInicioSegmento, includeBreak)) {
            duracionTotalTrabajadaSegundos += duracionSegmentoSegundosTotal;
        }
    }

    const duracionTotalTrabajadaHoras = duracionTotalTrabajadaSegundos / 3600.0;
    const umbralHorasExtrasSegundos = HORAS_JORNADA_BASE * 3600.0;


    // --- Paso 3: Iterar, Clasificar y Calcular Pagos (Considerando Extras) ---
    let segundosTrabajadosAcum = 0; // Acumulador para determinar cuándo empiezan las extras

    for (let i = 0; i < puntosOrdenados.length - 1; i++) {
        const tInicioSegmento = puntosOrdenados[i];
        const tFinSegmento = puntosOrdenados[i + 1];

        if (isEqual(tFinSegmento, tInicioSegmento)) continue;

        const duracionSegmentoSegundosTotal = differenceInSeconds(tFinSegmento, tInicioSegmento);
        const puntoEvaluacion = addSeconds(tInicioSegmento, 1); // Evaluar justo después del inicio
        const horaEval = getHours(puntoEvaluacion);
        const diaEval = getDay(puntoEvaluacion);
        const esDiaFestivo = await esFestivo(puntoEvaluacion, festivos);
        const esDiaDominicalOFestivo = esDominical(puntoEvaluacion) || esDiaFestivo;
        const esHoraNocturna = esNocturno(horaEval);
        const esDescanso = estaEnDescanso(horaEval, includeBreak);

        if (esDescanso) {
            continue; // Saltar segmentos de descanso para el cálculo de pago
        }

        let duracionSegmentoTrabajadoSegundos = duracionSegmentoSegundosTotal;
        let segundosEnOrdinaria = 0;
        let segundosEnExtra = 0;

        const inicioExtrasEnEsteSegmento = segundosTrabajadosAcum < umbralHorasExtrasSegundos && (segundosTrabajadosAcum + duracionSegmentoTrabajadoSegundos) > umbralHorasExtrasSegundos;

        if (segundosTrabajadosAcum >= umbralHorasExtrasSegundos) {
             // Todo este segmento es extra
             segundosEnExtra = duracionSegmentoTrabajadoSegundos;
        } else if (inicioExtrasEnEsteSegmento) {
             // Parte ordinaria, parte extra
             segundosEnOrdinaria = umbralHorasExtrasSegundos - segundosTrabajadosAcum;
             segundosEnExtra = duracionSegmentoTrabajadoSegundos - segundosEnOrdinaria;
        } else {
             // Todo este segmento es ordinario
             segundosEnOrdinaria = duracionSegmentoTrabajadoSegundos;
        }

        segundosTrabajadosAcum += duracionSegmentoTrabajadoSegundos; // Actualizar acumulador


         // Clasificar y calcular pago para la porción ORDINARIA
        if (segundosEnOrdinaria > 0) {
            const horasOrdinarias = segundosEnOrdinaria / 3600.0;
            let tipoBase = "Ordinaria_Diurna_Base";
            let valorRecargoBase = VALORES_RECARGOS_EXTRAS["Ordinaria_Diurna_Base"]; // = 0

             if (esDiaDominicalOFestivo) {
                tipoBase = esHoraNocturna ? "Recargo_Dom_Noct_Base" : "Recargo_Dom_Diurno_Base";
                valorRecargoBase = VALORES_RECARGOS_EXTRAS[tipoBase];
            } else if (esHoraNocturna) {
                tipoBase = "Recargo_Noct_Base";
                valorRecargoBase = VALORES_RECARGOS_EXTRAS[tipoBase];
            }

            horasClasificadas[tipoBase as keyof typeof horasClasificadas] += horasOrdinarias;
             // El pago base se asume cubierto por el salario. Aquí sumamos solo el RECARGO.
            pagosDetallados[tipoBase as keyof typeof pagosDetallados] += horasOrdinarias * valorRecargoBase;
        }

         // Clasificar y calcular pago para la porción EXTRA
        if (segundosEnExtra > 0) {
            const horasExtras = segundosEnExtra / 3600.0;
            let tipoExtra = "HED"; // Hora Extra Diurna (Weekday)
            let valorPagoExtraCompleto = VALOR_HORA_BASE_EJEMPLO + VALORES_RECARGOS_EXTRAS["HED"]; // Base + Valor Extra

            if (esDiaDominicalOFestivo) {
                 tipoExtra = esHoraNocturna ? "HEND_F" : "HEDD_F";
                 valorPagoExtraCompleto = VALOR_HORA_BASE_EJEMPLO + VALORES_RECARGOS_EXTRAS[tipoExtra];
            } else if (esHoraNocturna) {
                 tipoExtra = "HEN";
                 valorPagoExtraCompleto = VALOR_HORA_BASE_EJEMPLO + VALORES_RECARGOS_EXTRAS[tipoExtra];
            }

             horasClasificadas[tipoExtra as keyof typeof horasClasificadas] += horasExtras;
             // Las horas extras se pagan completas (base + extra)
             pagosDetallados[tipoExtra as keyof typeof pagosDetallados] += horasExtras * valorPagoExtraCompleto;
        }
    }

    // --- Calcular Pago Total ---
    const pagoTotal = Object.values(pagosDetallados).reduce((sum, pago) => sum + pago, 0);


    return {
        horasDetalladas: horasClasificadas,
        pagosDetallados: pagosDetallados,
        pagoTotal: pagoTotal,
        duracionTotalTrabajadaHoras: duracionTotalTrabajadaHoras
    };
}
