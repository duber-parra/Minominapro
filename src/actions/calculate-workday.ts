'use server';

import {
    parse, format, addHours, addDays,
    isBefore, isAfter, isEqual, isSameDay,
    startOfDay, endOfDay, getDay, getHours, addSeconds,
    differenceInSeconds, setHours, setMinutes, setSeconds, setMilliseconds,
    isValid
} from 'date-fns';
import { getColombianHolidays } from '@/services/colombian-holidays';
import type { CalculationResults, CalculationError, WorkdayInput } from '@/types';


// --- Constantes y Parámetros ---
const HORAS_JORNADA_BASE = 7.6; // Horas base antes de considerar extras (ej: 47h/sem / 6 dias = 7.83, pero para cálculo diario se suele usar 8h o valor acuerdo. ¡AJUSTAR!)
const HORA_NOCTURNA_INICIO = 21; // 9 PM (inclusive)
const HORA_NOCTURNA_FIN = 6;   // 6 AM (exclusive)
const HORA_INICIO_DESCANSO = 15; // 3 PM (inclusive)
const HORA_FIN_DESCANSO = 18; // 6 PM (exclusive)

// Valores por hora (pesos colombianos) - Ejemplo basado en SMMLV 2024 ($1,300,000) + Aux ($162,000) --> Valor Hora Ordinaria ~$5,416.67
// ESTOS VALORES SON EJEMPLOS Y DEBEN SER CALCULADOS CON PRECISIÓN SEGÚN NORMATIVA Y SALARIO REAL
const VALORES_RECARGOS_EXTRAS = {
    "Recargo_Noct_Base": 5417 * 0.35,          // Recargo 35% sobre hora ordinaria por ser nocturna
    "HED": 5417 * 0.25,                       // Valor extra por hora extra diurna (25% adicional al valor base)
    "HEN": 5417 * 0.75,                       // Valor extra por hora extra nocturna (75% adicional al valor base)
    "Recargo_Dom_Diurno_Base": 5417 * 0.75,    // Recargo 75% sobre hora ordinaria por ser dominical/festiva diurna
    "Recargo_Dom_Noct_Base": 5417 * (0.75 + 0.35), // Recargo 75% (dominical) + 35% (nocturno) = 110%
    "HEDD_F": 5417 * (1 + 0.75 + 0.25),       // Valor hora (100%) + Recargo Dom (75%) + Recargo Extra Diurna (25%) = 200% --> Extra es 100%
    "HEND_F": 5417 * (1 + 0.75 + 0.75),       // Valor hora (100%) + Recargo Dom (75%) + Recargo Extra Nocturna (75%) = 250% --> Extra es 150%
    "Ordinaria_Diurna_Base": 0                // La hora base no tiene recargo *adicional* en sí misma
};

// Valor hora base - Ejemplo: Salario Mínimo 2024 / 235 horas mensuales (aproximado legal)
const VALOR_HORA_BASE_EJEMPLO = 1300000 / 235; // Aproximadamente $5,532


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
        return { error: "Formato de fecha u hora de inicio inválido." };
    }

    let finDtBase = parse(endDateTimeStr, 'yyyy-MM-dd HH:mm', new Date());
     if (!isValid(finDtBase)) {
        return { error: "Formato de hora de fin inválido." };
    }

    // Ajustar fecha de fin si termina al día siguiente
    let finDt = endsNextDay ? addDays(finDtBase, 1) : finDtBase;

    // Validación final
    if (isBefore(finDt, inicioDt) || isEqual(finDt, inicioDt)) {
        return { error: "La hora de fin debe ser posterior a la hora de inicio." };
    }

    // --- Obtener Festivos ---
    const year = inicioDt.getFullYear();
    let festivos = await getColombianHolidays(year);
     // Considerar año siguiente si el periodo cruza el año
     if (finDt.getFullYear() > year) {
         const festivosSiguienteAno = await getColombianHolidays(finDt.getFullYear());
         festivos = festivos.concat(festivosSiguienteAno); // Usar concat para evitar mutación directa
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
    // Inicializa pagos a cero, reflejando solo recargos/extras (el pago base se asume cubierto por salario)
    let pagosDetallados: { [key in keyof typeof horasClasificadas]: number } = {
        "Ordinaria_Diurna_Base": 0.0, // Solo acumula recargos, no el valor base
        "Recargo_Noct_Base": 0.0,
        "Recargo_Dom_Diurno_Base": 0.0,
        "Recargo_Dom_Noct_Base": 0.0,
        "HED": 0.0, // Acumula el valor completo de la hora extra (base + extra)
        "HEN": 0.0,
        "HEDD_F": 0.0,
        "HEND_F": 0.0
    };
    let duracionTotalTrabajadaSegundos = 0;


    // --- Paso 1: Determinar Puntos Clave y Segmentos ---
    // Usa un Set para evitar duplicados y luego convierte a array y ordena
    let puntosClaveTimestamps = new Set([inicioDt.getTime(), finDt.getTime()]);

    // Añadir medianoches dentro del intervalo
    let fechaCursorMedianoche = startOfDay(inicioDt);
    while (isBefore(fechaCursorMedianoche, finDt)) {
        const medianocheSiguiente = addDays(startOfDay(fechaCursorMedianoche), 1); // Punto exacto de medianoche (inicio del día siguiente)
         if (isAfter(medianocheSiguiente, inicioDt) && isBefore(medianocheSiguiente, finDt)) {
             puntosClaveTimestamps.add(medianocheSiguiente.getTime());
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
                puntosClaveTimestamps.add(punto.getTime());
            }
        });

        fechaCursorCambio = addDays(fechaCursorCambio, 1);
     }

    const puntosOrdenados = Array.from(puntosClaveTimestamps).sort((a, b) => a - b).map(ts => new Date(ts));


    // --- Paso 2: Calcular Duración Trabajada Real (descontando descanso) ---
    for (let i = 0; i < puntosOrdenados.length - 1; i++) {
        const tInicioSegmento = puntosOrdenados[i];
        const tFinSegmento = puntosOrdenados[i + 1];

        if (isEqual(tFinSegmento, tInicioSegmento)) continue;

        const duracionSegmentoSegundosTotal = differenceInSeconds(tFinSegmento, tInicioSegmento);
        // Evaluar si el *inicio* del segmento cae en descanso
        const horaInicioSegmento = getHours(tInicioSegmento);

        if (!estaEnDescanso(horaInicioSegmento, includeBreak)) {
            duracionTotalTrabajadaSegundos += duracionSegmentoSegundosTotal;
        }
    }

    const duracionTotalTrabajadaHoras = duracionTotalTrabajadaSegundos / 3600.0;
    // Umbral de horas extras basado en las horas *trabajadas realmente*
    const umbralHorasExtrasSegundos = Math.min(duracionTotalTrabajadaSegundos, HORAS_JORNADA_BASE * 3600.0);


    // --- Paso 3: Iterar, Clasificar y Calcular Pagos (Considerando Extras) ---
    let segundosTrabajadosAcum = 0; // Acumulador de segundos *efectivamente trabajados*

    for (let i = 0; i < puntosOrdenados.length - 1; i++) {
        const tInicioSegmento = puntosOrdenados[i];
        const tFinSegmento = puntosOrdenados[i + 1];

        if (isEqual(tFinSegmento, tInicioSegmento)) continue;

        // Punto de evaluación ligeramente dentro del segmento para evitar problemas de borde
        const puntoEvaluacion = addSeconds(tInicioSegmento, 1);
        const horaEval = getHours(puntoEvaluacion);
        //const diaEval = getDay(puntoEvaluacion); // No se usa directamente aquí
        const esDiaFestivo = await esFestivo(puntoEvaluacion, festivos);
        const esDiaDominicalOFestivo = esDominical(puntoEvaluacion) || esDiaFestivo;
        const esHoraNocturna = esNocturno(horaEval);
        const esDescanso = estaEnDescanso(horaEval, includeBreak);

        if (esDescanso) {
            continue; // Saltar completamente los segmentos de descanso
        }

        const duracionSegmentoTrabajadoSegundos = differenceInSeconds(tFinSegmento, tInicioSegmento);

        let segundosEnOrdinaria = 0;
        let segundosEnExtra = 0;

        // Determinar cuánto de este segmento es ordinario y cuánto es extra
        const finAcumuladoSiSumamosSegmento = segundosTrabajadosAcum + duracionSegmentoTrabajadoSegundos;

        if (segundosTrabajadosAcum >= umbralHorasExtrasSegundos) {
             // Todo este segmento es extra porque ya superamos el umbral
             segundosEnExtra = duracionSegmentoTrabajadoSegundos;
        } else if (finAcumuladoSiSumamosSegmento > umbralHorasExtrasSegundos) {
             // El segmento cruza el umbral: parte ordinaria, parte extra
             segundosEnOrdinaria = umbralHorasExtrasSegundos - segundosTrabajadosAcum;
             segundosEnExtra = duracionSegmentoTrabajadoSegundos - segundosEnOrdinaria;
        } else {
             // Todo este segmento es ordinario
             segundosEnOrdinaria = duracionSegmentoTrabajadoSegundos;
        }

        // Solo actualizar el acumulador con los segundos trabajados de este segmento
        segundosTrabajadosAcum += duracionSegmentoTrabajadoSegundos;


         // Clasificar y calcular pago para la porción ORDINARIA (dentro de la jornada base)
        if (segundosEnOrdinaria > 0) {
            const horasOrdinarias = segundosEnOrdinaria / 3600.0;
            let tipoBase = "Ordinaria_Diurna_Base";
            let valorRecargoBase = VALORES_RECARGOS_EXTRAS["Ordinaria_Diurna_Base"]; // = 0

             if (esDiaDominicalOFestivo) {
                tipoBase = esHoraNocturna ? "Recargo_Dom_Noct_Base" : "Recargo_Dom_Diurno_Base";
                valorRecargoBase = VALORES_RECARGOS_EXTRAS[tipoBase as keyof typeof VALORES_RECARGOS_EXTRAS];
            } else if (esHoraNocturna) {
                tipoBase = "Recargo_Noct_Base";
                valorRecargoBase = VALORES_RECARGOS_EXTRAS[tipoBase as keyof typeof VALORES_RECARGOS_EXTRAS];
            }

            horasClasificadas[tipoBase as keyof typeof horasClasificadas] += horasOrdinarias;
             // Acumulamos solo el valor del RECARGO para las horas base
            pagosDetallados[tipoBase as keyof typeof pagosDetallados] += horasOrdinarias * valorRecargoBase;
        }

         // Clasificar y calcular pago para la porción EXTRA (excede la jornada base)
        if (segundosEnExtra > 0) {
            const horasExtras = segundosEnExtra / 3600.0;
            let tipoExtra = "HED"; // Hora Extra Diurna (L-S) por defecto
            let valorPagoExtra = VALORES_RECARGOS_EXTRAS["HED"];

            if (esDiaDominicalOFestivo) {
                 tipoExtra = esHoraNocturna ? "HEND_F" : "HEDD_F";
                 valorPagoExtra = VALORES_RECARGOS_EXTRAS[tipoExtra as keyof typeof VALORES_RECARGOS_EXTRAS];
            } else if (esHoraNocturna) {
                 tipoExtra = "HEN";
                 valorPagoExtra = VALORES_RECARGOS_EXTRAS[tipoExtra as keyof typeof VALORES_RECARGOS_EXTRAS];
            }

            horasClasificadas[tipoExtra as keyof typeof horasClasificadas] += horasExtras;
             // Las horas extras se pagan completas (BASE + EXTRA)
             // Sumamos el valor hora base MÁS el valor extra correspondiente
             pagosDetallados[tipoExtra as keyof typeof pagosDetallados] += horasExtras * (VALOR_HORA_BASE_EJEMPLO + valorPagoExtra);
        }
    }

    // --- Calcular Pago Total ---
    // Suma todos los valores acumulados en pagosDetallados (recargos de horas base + pago completo de horas extras)
    const pagoTotal = Object.values(pagosDetallados).reduce((sum, pago) => sum + pago, 0);


    return {
        horasDetalladas: horasClasificadas,
        pagosDetallados: pagosDetallados,
        pagoTotal: pagoTotal,
        duracionTotalTrabajadaHoras: duracionTotalTrabajadaHoras
    };
}
