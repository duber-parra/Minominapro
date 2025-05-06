module.exports = {

"[project]/src/services/colombian-holidays.ts [app-rsc] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
/**
 * Representa una fecha.
 */ __turbopack_context__.s({
    "getColombianHolidays": (()=>getColombianHolidays)
});
async function getColombianHolidays(year) {
    // TODO: Implementar esto llamando a una API externa o usando una biblioteca confiable.
    // Ejemplo de estructura placeholder:
    // const response = await fetch(`https://api.example.com/holidays/co/${year}`);
    // if (!response.ok) {
    //   throw new Error('Fallo al obtener los festivos');
    // }
    // const holidays = await response.json();
    // return holidays.map(holiday => ({ year: year, month: ..., day: ... }));
    console.warn(`Obteniendo festivos para ${year} - Usando datos de ejemplo. Implementar llamada API.`);
    // Datos de ejemplo SOLO para desarrollo/pruebas
    if (year === 2024) {
        return [
            {
                year: 2024,
                month: 1,
                day: 1
            },
            {
                year: 2024,
                month: 1,
                day: 8
            },
            {
                year: 2024,
                month: 3,
                day: 25
            },
            {
                year: 2024,
                month: 3,
                day: 28
            },
            {
                year: 2024,
                month: 3,
                day: 29
            },
            {
                year: 2024,
                month: 5,
                day: 1
            },
            {
                year: 2024,
                month: 5,
                day: 13
            },
            {
                year: 2024,
                month: 6,
                day: 3
            },
            {
                year: 2024,
                month: 6,
                day: 10
            },
            {
                year: 2024,
                month: 7,
                day: 1
            },
            {
                year: 2024,
                month: 7,
                day: 20
            },
            {
                year: 2024,
                month: 8,
                day: 7
            },
            {
                year: 2024,
                month: 8,
                day: 19
            },
            {
                year: 2024,
                month: 10,
                day: 14
            },
            {
                year: 2024,
                month: 11,
                day: 4
            },
            {
                year: 2024,
                month: 11,
                day: 11
            },
            {
                year: 2024,
                month: 12,
                day: 8
            },
            {
                year: 2024,
                month: 12,
                day: 25
            } // Inmaculada Concepción, Navidad
        ];
    }
    if (year === 2025) {
        return [
            {
                year: 2025,
                month: 1,
                day: 1
            },
            {
                year: 2025,
                month: 1,
                day: 6
            },
            {
                year: 2025,
                month: 3,
                day: 24
            },
            {
                year: 2025,
                month: 4,
                day: 17
            },
            {
                year: 2025,
                month: 4,
                day: 18
            },
            {
                year: 2025,
                month: 5,
                day: 1
            },
            {
                year: 2025,
                month: 6,
                day: 2
            },
            {
                year: 2025,
                month: 6,
                day: 23
            },
            {
                year: 2025,
                month: 6,
                day: 30
            },
            {
                year: 2025,
                month: 7,
                day: 20
            },
            {
                year: 2025,
                month: 8,
                day: 7
            },
            {
                year: 2025,
                month: 8,
                day: 18
            },
            {
                year: 2025,
                month: 10,
                day: 13
            },
            {
                year: 2025,
                month: 11,
                day: 3
            },
            {
                year: 2025,
                month: 11,
                day: 17
            },
            {
                year: 2025,
                month: 12,
                day: 8
            },
            {
                year: 2025,
                month: 12,
                day: 25
            } // Navidad
        ];
    }
    if (year === 2023) {
        return [
            {
                year: 2023,
                month: 1,
                day: 1
            },
            {
                year: 2023,
                month: 1,
                day: 9
            },
            {
                year: 2023,
                month: 3,
                day: 20
            },
            {
                year: 2023,
                month: 4,
                day: 6
            },
            {
                year: 2023,
                month: 4,
                day: 7
            },
            {
                year: 2023,
                month: 5,
                day: 1
            },
            {
                year: 2023,
                month: 5,
                day: 22
            },
            {
                year: 2023,
                month: 6,
                day: 12
            },
            {
                year: 2023,
                month: 6,
                day: 19
            },
            {
                year: 2023,
                month: 7,
                day: 3
            },
            {
                year: 2023,
                month: 7,
                day: 20
            },
            {
                year: 2023,
                month: 8,
                day: 7
            },
            {
                year: 2023,
                month: 8,
                day: 21
            },
            {
                year: 2023,
                month: 10,
                day: 16
            },
            {
                year: 2023,
                month: 11,
                day: 6
            },
            {
                year: 2023,
                month: 11,
                day: 13
            },
            {
                year: 2023,
                month: 12,
                day: 8
            },
            {
                year: 2023,
                month: 12,
                day: 25
            }
        ];
    }
    // Retorna array vacío si no hay datos de ejemplo o la API falla en el futuro
    return [];
}
}}),
"[project]/src/actions/calculate-workday.ts [app-rsc] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
/* __next_internal_action_entry_do_not_use__ {"4026aa123204f78013cd3e6ea51971798c662f40c0":"calculateWorkday"} */ __turbopack_context__.s({
    "calculateWorkday": (()=>calculateWorkday)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/server-reference.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$app$2d$render$2f$encryption$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/app-render/encryption.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$parse$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/date-fns/parse.mjs [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$format$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/date-fns/format.mjs [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$addHours$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/date-fns/addHours.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$addDays$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/date-fns/addDays.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$isBefore$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/date-fns/isBefore.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$isEqual$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/date-fns/isEqual.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$getDay$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/date-fns/getDay.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$getHours$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/date-fns/getHours.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$getMinutes$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/date-fns/getMinutes.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$differenceInSeconds$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/date-fns/differenceInSeconds.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$isValid$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/date-fns/isValid.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$getYear$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/date-fns/getYear.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$parseISO$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/date-fns/parseISO.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$colombian$2d$holidays$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/services/colombian-holidays.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-validate.js [app-rsc] (ecmascript)");
;
;
;
;
// --- Constantes y Parámetros ---
const HORAS_JORNADA_BASE = 7.66; // Horas base antes de considerar extras
const HORA_NOCTURNA_INICIO = 21; // 9 PM (inclusive)
const HORA_NOCTURNA_FIN = 6; // 6 AM (exclusive)
// Valores por hora (pesos colombianos)
// ESTE ES EL OBJETO QUE DEBES ACTUALIZAR SI LOS VALORES CAMBIAN:
const VALORES = {
    "Recargo_Noct_Base": 2166,
    "HED": 7736.41,
    "HEN": 10830.98,
    "Recargo_Dom_Diurno_Base": 4642,
    "Recargo_Dom_Noct_Base": 6808,
    "HEDD_F": 12378.26,
    "HEND_F": 15472.83,
    "Ordinaria_Diurna_Base": 0 // Horas base diurnas laborales (sin recargo adicional sobre el salario)
};
// SALARIO_BASE_QUINCENAL is now handled by the calling payroll calculation action
// const SALARIO_BASE_QUINCENAL = 711750;
// Cache para festivos
let festivosCache = {};
async function getFestivosSet(year) {
    if (festivosCache[year]) {
        return festivosCache[year];
    }
    try {
        const holidays = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$colombian$2d$holidays$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getColombianHolidays"])(year);
        // Ensure dates from service are handled correctly (assuming they are {year, month, day})
        const festivosSet = new Set(holidays.map((h)=>{
            // Construct date carefully, month is 0-indexed in JS Date constructor
            const dateStr = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$format$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])(new Date(h.year, h.month - 1, h.day), 'yyyy-MM-dd');
            return dateStr;
        }));
        festivosCache[year] = festivosSet;
        return festivosSet;
    } catch (error) {
        console.error("Error al obtener festivos:", error);
        return new Set();
    }
}
async function esFestivo(fecha) {
    // Ensure 'fecha' is a Date object
    if (!(fecha instanceof Date) || !(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$isValid$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["isValid"])(fecha)) {
        console.error("Invalid date passed to esFestivo:", fecha);
        return false; // Or throw an error
    }
    const year = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$getYear$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getYear"])(fecha);
    const festivos = await getFestivosSet(year);
    const fechaStr = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$format$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])(fecha, 'yyyy-MM-dd');
    return festivos.has(fechaStr);
}
function esDominical(fecha) {
    // Ensure 'fecha' is a Date object
    if (!(fecha instanceof Date) || !(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$isValid$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["isValid"])(fecha)) {
        console.error("Invalid date passed to esDominical:", fecha);
        return false; // Or throw an error
    }
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$getDay$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getDay"])(fecha) === 0; // 0 = Domingo
}
// Helper to parse HH:mm time string into hours and minutes
function parseTimeString(timeStr) {
    if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) return null;
    const [hours, minutes] = timeStr.split(':').map(Number);
    // Basic validation for hours/minutes ranges
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return {
        hours,
        minutes
    };
}
async function /*#__TURBOPACK_DISABLE_EXPORT_MERGING__*/ calculateWorkday(values// Use the defined type
) {
    const { startDate, startTime, endTime, endsNextDay, includeBreak, breakStartTime, breakEndTime } = values;
    // --- Parseo y Validación Inicial ---
    // Ensure startDate is a Date object
    const baseDate = startDate instanceof Date && (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$isValid$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["isValid"])(startDate) ? startDate : (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$parseISO$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["parseISO"])(startDate); // Attempt parse if string
    if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$isValid$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["isValid"])(baseDate)) {
        return {
            error: "Fecha de inicio inválida."
        };
    }
    const inicioDtStr = `${(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$format$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])(baseDate, 'yyyy-MM-dd')} ${startTime}`;
    const inicioDt = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$parse$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["parse"])(inicioDtStr, 'yyyy-MM-dd HH:mm', new Date());
    if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$isValid$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["isValid"])(inicioDt)) {
        return {
            error: "Fecha u hora de inicio inválida."
        };
    }
    let finDt;
    let finDateBase = endsNextDay ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$addDays$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["addDays"])(baseDate, 1) : baseDate;
    let finDtStr = `${(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$format$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])(finDateBase, 'yyyy-MM-dd')} ${endTime}`;
    finDt = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$parse$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["parse"])(finDtStr, 'yyyy-MM-dd HH:mm', new Date());
    if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$isValid$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["isValid"])(finDt)) {
        return {
            error: "Fecha u hora de fin inválida."
        };
    }
    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$isBefore$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["isBefore"])(finDt, inicioDt) || (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$isEqual$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["isEqual"])(finDt, inicioDt)) {
        return {
            error: "La hora de fin debe ser posterior a la hora de inicio."
        };
    }
    // --- Validar y parsear horas de descanso si aplica ---
    let parsedBreakStart = null;
    let parsedBreakEnd = null;
    let breakDurationSeconds = 0;
    if (includeBreak) {
        parsedBreakStart = parseTimeString(breakStartTime);
        parsedBreakEnd = parseTimeString(breakEndTime);
        if (!parsedBreakStart || !parsedBreakEnd) {
            return {
                error: "Formato de hora de descanso inválido (HH:mm)."
            };
        }
        if (parsedBreakEnd.hours < parsedBreakStart.hours || parsedBreakEnd.hours === parsedBreakStart.hours && parsedBreakEnd.minutes <= parsedBreakStart.minutes) {
            return {
                error: "La hora de fin del descanso debe ser posterior a la hora de inicio."
            };
        }
        const breakStartTotalMinutes = parsedBreakStart.hours * 60 + parsedBreakStart.minutes;
        const breakEndTotalMinutes = parsedBreakEnd.hours * 60 + parsedBreakEnd.minutes;
        breakDurationSeconds = (breakEndTotalMinutes - breakStartTotalMinutes) * 60;
        // Ensure break duration is not longer than the shift itself (simple check)
        const shiftDurationSeconds = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$differenceInSeconds$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["differenceInSeconds"])(finDt, inicioDt);
        if (breakDurationSeconds >= shiftDurationSeconds) {
            // This might be valid in some cases (e.g., split shift), but often indicates an error.
            // Let's allow it for now but maybe add a warning later.
            console.warn("Break duration is equal to or longer than the shift duration.");
        // breakDurationSeconds = shiftDurationSeconds; // Cap break duration?
        }
    }
    // --- Obtener Festivos para los años involucrados (already handled by payroll action caller) ---
    // Assuming the cache is populated before this function is called in loop
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
    let duracionTotalTrabajadaSegundos = 0; // This will accumulate actual worked time
    let segundosTrabajadosAcumulados = 0; // To track the extra hours threshold
    // --- Iterar minuto a minuto sobre el tiempo BRUTO (antes de descontar descanso) ---
    let cursorDt = inicioDt;
    while((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$isBefore$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["isBefore"])(cursorDt, finDt)){
        const cursorPlusOneMin = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$addHours$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["addHours"])(cursorDt, 1 / 60); // Siguiente minuto
        // Ensure we don't go past finDt if the last interval is less than a minute
        const currentSegmentEnd = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$isBefore$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["isBefore"])(cursorPlusOneMin, finDt) ? cursorPlusOneMin : finDt;
        const segmentDurationSeconds = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$differenceInSeconds$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["differenceInSeconds"])(currentSegmentEnd, cursorDt);
        // Punto medio del intervalo para evaluar condiciones
        // Using the start of the minute interval (cursorDt) is sufficient and simpler
        const puntoEvaluacion = cursorDt; // Evaluate conditions based on the start of the minute
        const horaEval = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$getHours$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getHours"])(puntoEvaluacion);
        const minutoEval = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$getMinutes$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getMinutes"])(puntoEvaluacion);
        // Verificar si es Descanso usando los tiempos parseados si includeBreak es true
        let esDescanso = false;
        if (includeBreak && parsedBreakStart && parsedBreakEnd) {
            const horaActualTotalMinutos = horaEval * 60 + minutoEval;
            const inicioDescansoTotalMinutos = parsedBreakStart.hours * 60 + parsedBreakStart.minutes;
            const finDescansoTotalMinutos = parsedBreakEnd.hours * 60 + parsedBreakEnd.minutes;
            esDescanso = horaActualTotalMinutos >= inicioDescansoTotalMinutos && horaActualTotalMinutos < finDescansoTotalMinutos;
        }
        if (!esDescanso) {
            // Solo clasificar si NO es descanso
            duracionTotalTrabajadaSegundos += segmentDurationSeconds; // Accumulate actual worked seconds
            segundosTrabajadosAcumulados += segmentDurationSeconds; // Track seconds worked for threshold check
            const horasTrabajadasAcumuladas = segundosTrabajadosAcumulados / 3600.0;
            const esHoraExtra = horasTrabajadasAcumuladas > HORAS_JORNADA_BASE;
            const esFestivoDominical = await esFestivo(puntoEvaluacion) || esDominical(puntoEvaluacion);
            const esNocturna = horaEval >= HORA_NOCTURNA_INICIO || horaEval < HORA_NOCTURNA_FIN;
            // --- Clasificación del minuto/segment ---
            let categoria = null;
            const durationToAdd = segmentDurationSeconds / 3600.0; // Duration in hours for this segment
            if (esHoraExtra) {
                if (esFestivoDominical) {
                    categoria = esNocturna ? "HEND_F" : "HEDD_F";
                } else {
                    categoria = esNocturna ? "HEN" : "HED";
                }
            } else {
                if (esFestivoDominical) {
                    categoria = esNocturna ? "Recargo_Dom_Noct_Base" : "Recargo_Dom_Diurno_Base";
                } else {
                    if (esNocturna) {
                        categoria = "Recargo_Noct_Base";
                    } else {
                        // Horas base diurnas, no tienen recargo, solo contar las horas.
                        horasClasificadas["Ordinaria_Diurna_Base"] += durationToAdd;
                    // No assign categoria here to avoid multiplying by VALORES["Ordinaria_Diurna_Base"] (which is 0)
                    }
                }
            }
            // Sumar la duración (en horas) a la categoría correspondiente
            if (categoria && categoria !== "Ordinaria_Diurna_Base") {
                horasClasificadas[categoria] += durationToAdd;
            }
        }
        cursorDt = currentSegmentEnd; // Avanzar al final del segmento actual
    }
    // --- Calcular Pagos ---
    let pagoTotalRecargosExtras = 0;
    const pagoDetallado = {
        "Ordinaria_Diurna_Base": 0,
        "Recargo_Noct_Base": 0,
        "Recargo_Dom_Diurno_Base": 0,
        "Recargo_Dom_Noct_Base": 0,
        "HED": 0,
        "HEN": 0,
        "HEDD_F": 0,
        "HEND_F": 0
    };
    for(const key in horasClasificadas){
        const catKey = key;
        const horas = horasClasificadas[catKey];
        if (horas > 0 && catKey !== "Ordinaria_Diurna_Base") {
            const valorHora = VALORES[catKey] ?? 0;
            const pagoCategoria = horas * valorHora;
            pagoTotalRecargosExtras += pagoCategoria;
            pagoDetallado[catKey] = pagoCategoria;
        }
    }
    // The pagoTotalConSalario calculation is removed as it's handled by the payroll action
    // --- Retornar Resultados ---
    return {
        horasDetalladas: horasClasificadas,
        pagoDetallado: pagoDetallado,
        pagoTotalRecargosExtras: pagoTotalRecargosExtras,
        pagoTotalConSalario: pagoTotalRecargosExtras,
        duracionTotalTrabajadaHoras: duracionTotalTrabajadaSegundos / 3600.0
    };
}
;
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ensureServerEntryExports"])([
    calculateWorkday
]);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(calculateWorkday, "4026aa123204f78013cd3e6ea51971798c662f40c0", null);
}}),
"[project]/src/actions/calculate-payroll.ts [app-rsc] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
/* __next_internal_action_entry_do_not_use__ {"406e5572c26fe3340a95572249ff8e54185ea08316":"calculateBiWeeklyPayroll"} */ __turbopack_context__.s({
    "calculateBiWeeklyPayroll": (()=>calculateBiWeeklyPayroll)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/server-reference.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$app$2d$render$2f$encryption$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/app-render/encryption.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$actions$2f$calculate$2d$workday$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/actions/calculate-workday.ts [app-rsc] (ecmascript)"); // Import the single workday calculator
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$colombian$2d$holidays$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/services/colombian-holidays.ts [app-rsc] (ecmascript)"); // Needed for holiday checks
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$format$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/date-fns/format.mjs [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$getYear$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/date-fns/getYear.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-validate.js [app-rsc] (ecmascript)");
;
;
;
;
;
const SALARIO_MINIMO_MENSUAL_LEGAL_VIGENTE = 1300000; // Example 2024. Adjust as needed.
const AUXILIO_TRANSPORTE_MENSUAL = 162000; // Example 2024. Adjust as needed.
const TOPE_SALARIO_AUXILIO_TRANSPORTE = SALARIO_MINIMO_MENSUAL_LEGAL_VIGENTE * 2; // Up to 2x SMLMV
const PORCENTAJE_SALUD = 0.04; // 4%
const PORCENTAJE_PENSION = 0.04; // 4%
// --- Helper Function to Initialize Aggregated Results ---
function initializeAggregatedResults() {
    return {
        Ordinaria_Diurna_Base: 0,
        Recargo_Noct_Base: 0,
        Recargo_Dom_Diurno_Base: 0,
        Recargo_Dom_Noct_Base: 0,
        HED: 0,
        HEN: 0,
        HEDD_F: 0,
        HEND_F: 0,
        totalHorasTrabajadas: 0
    };
}
function initializeAggregatedPagos() {
    return {
        Ordinaria_Diurna_Base: 0,
        Recargo_Noct_Base: 0,
        Recargo_Dom_Diurno_Base: 0,
        Recargo_Dom_Noct_Base: 0,
        HED: 0,
        HEN: 0,
        HEDD_F: 0,
        HEND_F: 0,
        totalHorasTrabajadas: 0
    };
}
async function /*#__TURBOPACK_DISABLE_EXPORT_MERGING__*/ calculateBiWeeklyPayroll(input) {
    const { id_colaborador, fecha_inicio, fecha_fin, turnos, salarioBaseQuincenal, aplicarAuxilioTransporte, otrasDeducciones, otrosIngresos } = input;
    if (!turnos || turnos.length === 0) {
        // Handle case with no shifts - might still have base salary, deductions, etc.
        console.warn(`No shifts found for ${id_colaborador} between ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$format$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])(fecha_inicio, 'yyyy-MM-dd')} and ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$format$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])(fecha_fin, 'yyyy-MM-dd')}. Calculating based on salary only.`);
    // Proceed with calculations based only on salary and fixed values if applicable
    }
    // --- Preload Holidays for the relevant years ---
    const startYear = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$getYear$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getYear"])(fecha_inicio);
    const endYear = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$getYear$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getYear"])(fecha_fin);
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$colombian$2d$holidays$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getColombianHolidays"])(startYear);
    if (startYear !== endYear) {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$colombian$2d$holidays$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getColombianHolidays"])(endYear);
    }
    // --- Initialize Aggregation Variables ---
    let horasAgregadas = initializeAggregatedResults();
    let pagosAgregados = initializeAggregatedPagos();
    let totalExtrasRecargosQuincenal = 0;
    let totalHorasTrabajadasQuincenal = 0;
    // --- Phase 2: Iterate Through Each Shift and Calculate ---
    for (const turno of turnos){
        // Adapt Turno to WorkdayFormValues format expected by calculateWorkday
        const workdayInput = {
            startDate: turno.fecha,
            startTime: turno.hora_entrada,
            endTime: turno.hora_salida,
            endsNextDay: turno.termina_dia_siguiente,
            includeBreak: turno.info_descanso.incluye_descanso,
            breakStartTime: turno.info_descanso.hora_inicio_descanso,
            breakEndTime: turno.info_descanso.hora_fin_descanso
        };
        const workdayResult = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$actions$2f$calculate$2d$workday$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["calculateWorkday"])(workdayInput);
        if ('error' in workdayResult) {
            console.error(`Error calculating workday for shift ${turno.id} on ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$format$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])(turno.fecha, 'yyyy-MM-dd')}: ${workdayResult.error}`);
            // Decide how to handle errors: skip shift, return error for whole payroll, etc.
            // For now, let's return an error for the whole payroll calculation
            return {
                error: `Error en cálculo de turno ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$format$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])(turno.fecha, 'yyyy-MM-dd')}: ${workdayResult.error}`
            };
        }
        // Aggregate results
        Object.keys(horasAgregadas).forEach((key)=>{
            if (key !== 'totalHorasTrabajadas' && key in workdayResult.horasDetalladas) {
                horasAgregadas[key] += workdayResult.horasDetalladas[key];
            }
        });
        Object.keys(pagosAgregados).forEach((key)=>{
            if (key !== 'totalHorasTrabajadas' && key in workdayResult.pagoDetallado) {
                pagosAgregados[key] += workdayResult.pagoDetallado[key];
            }
        });
        totalExtrasRecargosQuincenal += workdayResult.pagoTotalRecargosExtras;
        totalHorasTrabajadasQuincenal += workdayResult.duracionTotalTrabajadaHoras;
        horasAgregadas.totalHorasTrabajadas = totalHorasTrabajadasQuincenal; // Update total hours worked
    }
    // --- Calculate Devengado (Earnings) ---
    const subtotalDevengadoQuincenal = salarioBaseQuincenal + totalExtrasRecargosQuincenal;
    // --- Calculate Auxilio de Transporte Eligibility and Value ---
    // Estimate monthly salary based on bi-weekly base for eligibility check
    const salarioMensualEstimado = salarioBaseQuincenal * 2; // Approximation
    const esElegibleAuxilioTransporte = salarioMensualEstimado <= TOPE_SALARIO_AUXILIO_TRANSPORTE;
    const auxilioTransporteAplicado = aplicarAuxilioTransporte && esElegibleAuxilioTransporte ? AUXILIO_TRANSPORTE_MENSUAL / 2 // Bi-weekly portion
     : 0;
    // --- Calculate Total Other Income ---
    const totalOtrosIngresos = otrosIngresos.reduce((sum, ingreso)=>sum + ingreso.valor, 0);
    // --- Calculate Total Gross Earnings ---
    const totalDevengadoBrutoQuincenal = subtotalDevengadoQuincenal + auxilioTransporteAplicado + totalOtrosIngresos;
    // --- Calculate Social Security Contributions (IBC and Deductions) ---
    // Base calculation: Total earnings excluding non-salary items (like auxilio transporte)
    let ibc_Quincenal_Calculado = subtotalDevengadoQuincenal + totalOtrosIngresos; // Start with salary + extras/recargos + other *income*
    // Check minimum wage rule: IBC cannot be less than 1 SMLMV (pro-rated for bi-weekly)
    const salarioMinimoQuincenal = SALARIO_MINIMO_MENSUAL_LEGAL_VIGENTE / 2;
    const ibc_Final_Quincenal = Math.max(ibc_Quincenal_Calculado, salarioMinimoQuincenal);
    const deduccionSaludQuincenal = ibc_Final_Quincenal * PORCENTAJE_SALUD;
    const deduccionPensionQuincenal = ibc_Final_Quincenal * PORCENTAJE_PENSION;
    // --- Calculate Total Other Deductions ---
    const totalOtrasDeducciones = otrasDeducciones.reduce((sum, deduccion)=>sum + deduccion.valor, 0);
    // --- Calculate Net Pay ---
    const subtotalNetoParcialQuincenal = totalDevengadoBrutoQuincenal - deduccionSaludQuincenal - deduccionPensionQuincenal;
    const netoAPagarQuincenal = subtotalNetoParcialQuincenal - totalOtrasDeducciones;
    // --- Construct Final Result Object ---
    const finalResult = {
        id_colaborador,
        fecha_inicio,
        fecha_fin,
        horasDetalladasAgregadas: horasAgregadas,
        pagoDetalladoAgregado: pagosAgregados,
        totalExtrasRecargosQuincenal,
        salarioBaseQuincenal,
        subtotalDevengadoQuincenal,
        esElegibleAuxilioTransporte,
        auxilioTransporteAplicado,
        totalOtrosIngresos,
        totalDevengadoBrutoQuincenal,
        ibc_Quincenal_Calculado,
        ibc_Final_Quincenal,
        deduccionSaludQuincenal,
        deduccionPensionQuincenal,
        totalOtrasDeducciones,
        otrasDeduccionesDetalle: otrasDeducciones,
        subtotalNetoParcialQuincenal,
        netoAPagarQuincenal
    };
    return finalResult;
}
;
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ensureServerEntryExports"])([
    calculateBiWeeklyPayroll
]);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(calculateBiWeeklyPayroll, "406e5572c26fe3340a95572249ff8e54185ea08316", null);
}}),
"[project]/.next-internal/server/app/page/actions.js { ACTIONS_MODULE0 => \"[project]/src/actions/calculate-payroll.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript) <locals>": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.s({});
;
}}),
"[project]/.next-internal/server/app/page/actions.js { ACTIONS_MODULE0 => \"[project]/src/actions/calculate-payroll.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript) <module evaluation>": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.s({});
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$actions$2f$calculate$2d$payroll$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/actions/calculate-payroll.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$next$2d$internal$2f$server$2f$app$2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$src$2f$actions$2f$calculate$2d$payroll$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i('[project]/.next-internal/server/app/page/actions.js { ACTIONS_MODULE0 => "[project]/src/actions/calculate-payroll.ts [app-rsc] (ecmascript)" } [app-rsc] (server actions loader, ecmascript) <locals>');
}}),
"[project]/.next-internal/server/app/page/actions.js { ACTIONS_MODULE0 => \"[project]/src/actions/calculate-payroll.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript) <exports>": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.s({
    "406e5572c26fe3340a95572249ff8e54185ea08316": (()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$actions$2f$calculate$2d$payroll$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["calculateBiWeeklyPayroll"])
});
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$actions$2f$calculate$2d$payroll$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/actions/calculate-payroll.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$next$2d$internal$2f$server$2f$app$2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$src$2f$actions$2f$calculate$2d$payroll$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i('[project]/.next-internal/server/app/page/actions.js { ACTIONS_MODULE0 => "[project]/src/actions/calculate-payroll.ts [app-rsc] (ecmascript)" } [app-rsc] (server actions loader, ecmascript) <locals>');
}}),
"[project]/.next-internal/server/app/page/actions.js { ACTIONS_MODULE0 => \"[project]/src/actions/calculate-payroll.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.s({
    "406e5572c26fe3340a95572249ff8e54185ea08316": (()=>__TURBOPACK__imported__module__$5b$project$5d2f2e$next$2d$internal$2f$server$2f$app$2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$src$2f$actions$2f$calculate$2d$payroll$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$exports$3e$__["406e5572c26fe3340a95572249ff8e54185ea08316"])
});
var __TURBOPACK__imported__module__$5b$project$5d2f2e$next$2d$internal$2f$server$2f$app$2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$src$2f$actions$2f$calculate$2d$payroll$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i('[project]/.next-internal/server/app/page/actions.js { ACTIONS_MODULE0 => "[project]/src/actions/calculate-payroll.ts [app-rsc] (ecmascript)" } [app-rsc] (server actions loader, ecmascript) <module evaluation>');
var __TURBOPACK__imported__module__$5b$project$5d2f2e$next$2d$internal$2f$server$2f$app$2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$src$2f$actions$2f$calculate$2d$payroll$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$exports$3e$__ = __turbopack_context__.i('[project]/.next-internal/server/app/page/actions.js { ACTIONS_MODULE0 => "[project]/src/actions/calculate-payroll.ts [app-rsc] (ecmascript)" } [app-rsc] (server actions loader, ecmascript) <exports>');
}}),
"[project]/src/app/favicon.ico.mjs { IMAGE => \"[project]/src/app/favicon.ico (static in ecmascript)\" } [app-rsc] (structured image object, ecmascript, Next.js server component)": ((__turbopack_context__) => {

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.n(__turbopack_context__.i("[project]/src/app/favicon.ico.mjs { IMAGE => \"[project]/src/app/favicon.ico (static in ecmascript)\" } [app-rsc] (structured image object, ecmascript)"));
}}),
"[project]/src/app/layout.tsx [app-rsc] (ecmascript, Next.js server component)": ((__turbopack_context__) => {

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.n(__turbopack_context__.i("[project]/src/app/layout.tsx [app-rsc] (ecmascript)"));
}}),
"[project]/src/app/page.tsx (client reference/proxy) <module evaluation>": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.s({
    "default": (()=>__TURBOPACK__default__export__)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2d$edge$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server-edge.js [app-rsc] (ecmascript)");
;
const __TURBOPACK__default__export__ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2d$edge$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call the default export of [project]/src/app/page.tsx <module evaluation> from the server, but it's on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/src/app/page.tsx <module evaluation>", "default");
}}),
"[project]/src/app/page.tsx (client reference/proxy)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.s({
    "default": (()=>__TURBOPACK__default__export__)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2d$edge$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server-edge.js [app-rsc] (ecmascript)");
;
const __TURBOPACK__default__export__ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2d$edge$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call the default export of [project]/src/app/page.tsx from the server, but it's on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/src/app/page.tsx", "default");
}}),
"[project]/src/app/page.tsx [app-rsc] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$page$2e$tsx__$28$client__reference$2f$proxy$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/src/app/page.tsx (client reference/proxy) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$page$2e$tsx__$28$client__reference$2f$proxy$29$__ = __turbopack_context__.i("[project]/src/app/page.tsx (client reference/proxy)");
;
__turbopack_context__.n(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$page$2e$tsx__$28$client__reference$2f$proxy$29$__);
}}),
"[project]/src/app/page.tsx [app-rsc] (ecmascript, Next.js server component)": ((__turbopack_context__) => {

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.n(__turbopack_context__.i("[project]/src/app/page.tsx [app-rsc] (ecmascript)"));
}}),

};

//# sourceMappingURL=_a1e838a2._.js.map