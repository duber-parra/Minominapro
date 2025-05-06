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
"[project]/src/config/payroll-values.ts [app-rsc] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
// src/config/payroll-values.ts
/**
 * @fileOverview Configuration file for payroll values.
 * This file exports constants used in payroll calculations, specifically the hourly rates for different types of work hours.
 * It is separated from 'use server' files to allow importing constants into client components without violating 'use server' rules.
 */ // Valores por hora (pesos colombianos)
// ESTE ES EL OBJETO QUE DEBES ACTUALIZAR SI LOS VALORES CAMBIAN:
__turbopack_context__.s({
    "VALORES": (()=>VALORES)
});
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
}}),
"[project]/src/actions/calculate-workday.ts [app-rsc] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
/* __next_internal_action_entry_do_not_use__ {"600794c3604139c4f9fa00e7152a2fa86283639485":"calculateSingleWorkday"} */ __turbopack_context__.s({
    "calculateSingleWorkday": (()=>calculateSingleWorkday)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/server-reference.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$app$2d$render$2f$encryption$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/app-render/encryption.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$parse$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/date-fns/parse.mjs [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$format$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/date-fns/format.mjs [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$addHours$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/date-fns/addHours.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$addDays$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/date-fns/addDays.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$isBefore$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/date-fns/isBefore.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$isEqual$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/date-fns/isEqual.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$isSameDay$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/date-fns/isSameDay.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$getDay$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/date-fns/getDay.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$getHours$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/date-fns/getHours.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$getMinutes$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/date-fns/getMinutes.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$isValid$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/date-fns/isValid.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$getYear$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/date-fns/getYear.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$colombian$2d$holidays$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/services/colombian-holidays.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$payroll$2d$values$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/config/payroll-values.ts [app-rsc] (ecmascript)"); // Import from new location
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-validate.js [app-rsc] (ecmascript)");
;
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
// const VALORES = { ... } // Now imported from @/config/payroll-values
// Cache para festivos
let festivosCache = {};
async function getFestivosSet(year) {
    if (festivosCache[year]) {
        return festivosCache[year];
    }
    try {
        const holidays = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$colombian$2d$holidays$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getColombianHolidays"])(year);
        if (!Array.isArray(holidays)) {
            console.error(`[getFestivosSet] Error: getColombianHolidays(${year}) no devolvió un array.`);
            throw new Error(`Formato de respuesta inválido para festivos de ${year}.`);
        }
        const festivosSet = new Set(holidays.map((h)=>{
            if (!h || typeof h.year !== 'number' || typeof h.month !== 'number' || typeof h.day !== 'number') {
                console.error(`[getFestivosSet] Error: Estructura de objeto festivo inválida para ${year}:`, h);
                return '';
            }
            try {
                const dateToFormat = new Date(h.year, h.month - 1, h.day);
                if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$isValid$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["isValid"])(dateToFormat) || (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$getYear$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getYear"])(dateToFormat) !== h.year) {
                    console.error(`[getFestivosSet] Error: Componentes de fecha inválidos para festivo en ${year}:`, h);
                    return '';
                }
                return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$format$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])(dateToFormat, 'yyyy-MM-dd');
            } catch (formatError) {
                console.error(`[getFestivosSet] Error formateando fecha festiva para ${year}:`, h, formatError);
                return '';
            }
        }));
        const validFestivosSet = new Set(Array.from(festivosSet).filter((dateStr)=>dateStr !== ''));
        festivosCache[year] = validFestivosSet;
        return validFestivosSet;
    } catch (error) {
        console.error(`[getFestivosSet] Error al obtener o procesar festivos para ${year}:`, error);
        const userMessage = `Error consultando festivos para ${year}. Verifique la fuente de datos.`;
        throw new Error(userMessage + ` Detalle: ${error instanceof Error ? error.message : String(error)}`);
    }
}
async function esFestivo(fecha) {
    const year = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$getYear$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getYear"])(fecha);
    try {
        const festivos = await getFestivosSet(year);
        const fechaStr = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$format$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])(fecha, 'yyyy-MM-dd');
        return festivos.has(fechaStr);
    } catch (error) {
        console.error(`[esFestivo] Error verificando si ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$format$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])(fecha, 'yyyy-MM-dd')} es festivo:`, error);
        throw new Error(`Error al verificar festivo: ${error instanceof Error ? error.message : String(error)}`);
    }
}
function esDominical(fecha) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$getDay$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getDay"])(fecha) === 0; // 0 = Domingo
}
function parseTimeString(timeStr) {
    if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) return null;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return {
        hours,
        minutes
    };
}
async function /*#__TURBOPACK_DISABLE_EXPORT_MERGING__*/ calculateSingleWorkday(values, id) {
    try {
        const { startDate, startTime, endTime, endsNextDay, includeBreak, breakStartTime, breakEndTime } = values;
        // --- Parseo y Validación Inicial ---
        if (!startDate || !(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$isValid$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["isValid"])(startDate)) {
            return {
                error: `ID ${id}: Fecha de inicio inválida.`
            };
        }
        const inicioDtStr = `${(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$format$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])(startDate, 'yyyy-MM-dd')} ${startTime}`;
        const inicioDt = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$parse$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["parse"])(inicioDtStr, 'yyyy-MM-dd HH:mm', new Date());
        if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$isValid$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["isValid"])(inicioDt)) {
            return {
                error: `ID ${id}: Fecha u hora de inicio inválida (${inicioDtStr}).`
            };
        }
        let finDtBase = startDate;
        if (endsNextDay) {
            finDtBase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$addDays$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["addDays"])(startDate, 1);
        }
        const finDtStr = `${(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$format$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])(finDtBase, 'yyyy-MM-dd')} ${endTime}`;
        const finDt = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$parse$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["parse"])(finDtStr, 'yyyy-MM-dd HH:mm', new Date());
        if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$isValid$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["isValid"])(finDt)) {
            return {
                error: `ID ${id}: Fecha u hora de fin inválida (${finDtStr}).`
            };
        }
        if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$isBefore$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["isBefore"])(finDt, inicioDt) || (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$isEqual$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["isEqual"])(finDt, inicioDt)) {
            return {
                error: `ID ${id}: La hora de fin debe ser posterior a la hora de inicio.`
            };
        }
        let parsedBreakStart = null;
        let parsedBreakEnd = null;
        let breakDurationSeconds = 0;
        if (includeBreak) {
            parsedBreakStart = parseTimeString(breakStartTime);
            parsedBreakEnd = parseTimeString(breakEndTime);
            if (!parsedBreakStart || !parsedBreakEnd) {
                return {
                    error: `ID ${id}: Formato de hora de descanso inválido (HH:mm).`
                };
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
        await getFestivosSet((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$getYear$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getYear"])(inicioDt));
        if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$isSameDay$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["isSameDay"])(inicioDt, finDt)) {
            await getFestivosSet((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$getYear$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getYear"])(finDt));
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
        let segundosTrabajadosAcumulados = 0;
        // --- Iterar minuto a minuto ---
        let cursorDt = inicioDt;
        while((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$isBefore$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["isBefore"])(cursorDt, finDt)){
            const cursorPlusOneMin = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$addHours$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["addHours"])(cursorDt, 1 / 60);
            const puntoEvaluacion = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$addHours$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["addHours"])(cursorDt, 1 / 120);
            const horaEval = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$getHours$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getHours"])(puntoEvaluacion);
            const minutoEval = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$getMinutes$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getMinutes"])(puntoEvaluacion);
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
                let esFestivoDominical;
                try {
                    esFestivoDominical = await esFestivo(puntoEvaluacion) || esDominical(puntoEvaluacion);
                } catch (holidayError) {
                    console.error(`ID ${id}: Error verificando festivo/dominical para ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$format$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])(puntoEvaluacion, 'yyyy-MM-dd')}:`, holidayError);
                    // Decide how to handle: throw, return error, or default to false? Returning error is safer.
                    return {
                        error: `ID ${id}: Error al verificar si ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$format$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])(puntoEvaluacion, 'dd/MM')} es festivo/domingo. ${holidayError instanceof Error ? holidayError.message : ''}`
                    };
                }
                const esNocturna = horaEval >= HORA_NOCTURNA_INICIO || horaEval < HORA_NOCTURNA_FIN;
                let categoria = null;
                if (esHoraExtra) {
                    if (esFestivoDominical) categoria = esNocturna ? "HEND_F" : "HEDD_F";
                    else categoria = esNocturna ? "HEN" : "HED";
                } else {
                    if (esFestivoDominical) categoria = esNocturna ? "Recargo_Dom_Noct_Base" : "Recargo_Dom_Diurno_Base";
                    else if (esNocturna) categoria = "Recargo_Noct_Base";
                    else horasClasificadas["Ordinaria_Diurna_Base"] += 1 / 60;
                }
                if (categoria && categoria !== "Ordinaria_Diurna_Base") {
                    horasClasificadas[categoria] += 1 / 60;
                }
            }
            cursorDt = cursorPlusOneMin;
        }
        // --- Calcular Pagos ---
        let pagoTotalRecargosExtras = 0;
        const pagoDetallado = {};
        for(const key in horasClasificadas){
            const horas = horasClasificadas[key];
            const valorHora = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$payroll$2d$values$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["VALORES"][key];
            if (valorHora === undefined && key !== "Ordinaria_Diurna_Base") {
                console.error(`ID ${id}: No se encontró valor para la categoría '${key}' en VALORES.`);
                // Consider throwing an error for missing critical configuration
                return {
                    error: `ID ${id}: Configuración de pagos incompleta. Falta valor para '${key}'.`
                };
            }
            if (horas > 0 && key !== "Ordinaria_Diurna_Base") {
                const pagoCategoria = horas * (valorHora ?? 0);
                pagoTotalRecargosExtras += pagoCategoria;
                pagoDetallado[key] = pagoCategoria;
            } else {
                pagoDetallado[key] = 0; // Ensure all keys exist, base diurnal has 0 extra payment
            }
        }
        return {
            id: id,
            inputData: {
                ...values,
                startDate
            },
            horasDetalladas: horasClasificadas,
            pagoDetallado: pagoDetallado,
            pagoTotalRecargosExtras: pagoTotalRecargosExtras,
            pagoTotalConSalario: pagoTotalRecargosExtras,
            duracionTotalTrabajadaHoras: duracionTotalTrabajadaSegundos / 3600.0
        };
    } catch (error) {
        console.error(`[calculateSingleWorkday: ID ${id}] Error inesperado:`, error);
        // Provide a more generic but informative error message for unexpected issues
        const errorMessage = `ID ${id}: Error inesperado en el servidor durante el cálculo. Detalles: ${error instanceof Error ? error.message : String(error)}`;
        return {
            error: errorMessage
        };
    }
}
;
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ensureServerEntryExports"])([
    calculateSingleWorkday
]);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(calculateSingleWorkday, "600794c3604139c4f9fa00e7152a2fa86283639485", null);
}}),
"[project]/.next-internal/server/app/page/actions.js { ACTIONS_MODULE0 => \"[project]/src/actions/calculate-workday.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript) <locals>": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.s({});
;
}}),
"[project]/.next-internal/server/app/page/actions.js { ACTIONS_MODULE0 => \"[project]/src/actions/calculate-workday.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript) <module evaluation>": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.s({});
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$actions$2f$calculate$2d$workday$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/actions/calculate-workday.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$next$2d$internal$2f$server$2f$app$2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$src$2f$actions$2f$calculate$2d$workday$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i('[project]/.next-internal/server/app/page/actions.js { ACTIONS_MODULE0 => "[project]/src/actions/calculate-workday.ts [app-rsc] (ecmascript)" } [app-rsc] (server actions loader, ecmascript) <locals>');
}}),
"[project]/.next-internal/server/app/page/actions.js { ACTIONS_MODULE0 => \"[project]/src/actions/calculate-workday.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript) <exports>": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.s({
    "600794c3604139c4f9fa00e7152a2fa86283639485": (()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$actions$2f$calculate$2d$workday$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["calculateSingleWorkday"])
});
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$actions$2f$calculate$2d$workday$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/actions/calculate-workday.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$next$2d$internal$2f$server$2f$app$2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$src$2f$actions$2f$calculate$2d$workday$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i('[project]/.next-internal/server/app/page/actions.js { ACTIONS_MODULE0 => "[project]/src/actions/calculate-workday.ts [app-rsc] (ecmascript)" } [app-rsc] (server actions loader, ecmascript) <locals>');
}}),
"[project]/.next-internal/server/app/page/actions.js { ACTIONS_MODULE0 => \"[project]/src/actions/calculate-workday.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.s({
    "600794c3604139c4f9fa00e7152a2fa86283639485": (()=>__TURBOPACK__imported__module__$5b$project$5d2f2e$next$2d$internal$2f$server$2f$app$2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$src$2f$actions$2f$calculate$2d$workday$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$exports$3e$__["600794c3604139c4f9fa00e7152a2fa86283639485"])
});
var __TURBOPACK__imported__module__$5b$project$5d2f2e$next$2d$internal$2f$server$2f$app$2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$src$2f$actions$2f$calculate$2d$workday$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i('[project]/.next-internal/server/app/page/actions.js { ACTIONS_MODULE0 => "[project]/src/actions/calculate-workday.ts [app-rsc] (ecmascript)" } [app-rsc] (server actions loader, ecmascript) <module evaluation>');
var __TURBOPACK__imported__module__$5b$project$5d2f2e$next$2d$internal$2f$server$2f$app$2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$src$2f$actions$2f$calculate$2d$workday$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$exports$3e$__ = __turbopack_context__.i('[project]/.next-internal/server/app/page/actions.js { ACTIONS_MODULE0 => "[project]/src/actions/calculate-workday.ts [app-rsc] (ecmascript)" } [app-rsc] (server actions loader, ecmascript) <exports>');
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

//# sourceMappingURL=_b14daba2._.js.map