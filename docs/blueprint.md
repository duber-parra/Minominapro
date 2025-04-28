# **App Name**: Workday Calculator

## Core Features:

- Input Collection: Accept user input for start date, start time, and end time of work period, as well as boolean for 'end on next day' and 'include break time'.
- Hours Calculation: Use an LLM as a tool to determine the total work hours, considering breaks, night hours, holidays, and overtime. Calculate the additional payments based on the official Colombian labor laws, including payments for night hours, work on holidays and overtime.
- Results Display: Display a detailed breakdown of regular hours, night hours, holiday hours, and overtime, as well as the monetary compensation for each category.

## Style Guidelines:

- Primary color: Dark blue (#1A237E) for a professional and reliable feel.
- Secondary color: Light gray (#ECEFF1) for backgrounds and neutral elements.
- Accent: Teal (#26A69A) to highlight key information and call-to-action buttons.
- Clean and structured layout for easy data input and results display.
- Use simple and clear icons to represent different categories of hours and payments.

## Original User Request:
// --- Importar funciones necesarias de date-fns ---
// Asegúrate de tener date-fns instalado (npm install date-fns)
// O ajusta la ruta si usas el CDN como en el HTML de ejemplo.
// Si usas CDN directamente en <script type="module">, necesitarías importar desde la URL completa.
// Para simplificar aquí, asumimos que puedes importar así:
import { 
    parse, format, addHours, addDays, 
    isBefore, isAfter, isEqual, isSameDay, 
    startOfDay, endOfDay, getDay, getHours, getMinutes,
    differenceInSeconds, setHours, setMinutes, setSeconds, setMilliseconds,
    isValid // Para verificar fechas
} from 'https://cdn.jsdelivr.net/npm/date-fns@2.29.3/esm/index.js'; 
// ¡IMPORTANTE!: La URL del CDN puede cambiar o no funcionar directamente con import. 
// La forma más robusta es usar un bundler (Webpack, Vite) o descargar la librería.

// --- Elementos del DOM ---
const fechaInicioEl = document.getElementById('fechaInicio');
const horaInicioEl = document.getElementById('horaInicio');
const horaFinEl = document.getElementById('horaFin');
const terminoDiaSiguienteEl = document.getElementById('terminoDiaSiguiente');
const descansoHabilitadoEl = document.getElementById('descansoHabilitado');
const calcularBtn = document.getElementById('calcularBtn');
const resultadosEl = document.getElementById('resultados');

// --- Constantes y Parámetros ---
const HORAS_JORNADA_BASE = 7.6;
// Usamos números 0-23 para horas
const HORA_NOCTURNA_INICIO = 21; // 9 PM
const HORA_NOCTURNA_FIN = 6;   // 6 AM
const HORA_INICIO_DESCANSO = 15; // 3 PM
const HORA_FIN_DESCANSO = 18; // 6 PM

// Valores por hora (pesos colombianos)
const VALORES = {
    "Recargo_Noct_Base": 2166,
    "HED": 1547,
    "HEN": 4642,
    "Recargo_Dom_Diurno_Base": 4642,
    "Recargo_Dom_Noct_Base": 6808,
    "HEDD_F": 6189, // Hora Extra Dominical/Festiva Diurna
    "HEND_F": 9284, // Hora Extra Dominical/Festiva Nocturna
    "Ordinaria_Diurna_Base": 0 // No genera recargo extra sobre el base
};
const SALARIO_BASE_QUINCENAL = 711750; // Añadido para el cálculo final

// --- Calendario Festivos Colombia 2025 (Ejemplo Estático) ---
const FESTIVOS_2025 = [ // Formato 'YYYY-MM-DD'
    '2025-01-01', // Año Nuevo
    '2025-01-06', // Reyes Magos
    '2025-03-24', // San José
    '2025-04-17', // Jueves Santo
    '2025-04-18', // Viernes Santo
    '2025-05-01', // Día del Trabajo
    '2025-06-02', // Ascensión del Señor
    '2025-06-23', // Corpus Christi
    '2025-06-30', // Sagrado Corazón / San Pedro y San Pablo
    '2025-07-20', // Día de la Independencia
    '2025-08-07', // Batalla de Boyacá
    '2025-08-18', // Asunción de la Virgen
    '2025-10-13', // Día de la Raza
    '2025-11-03', // Todos los Santos
    '2025-11-17', // Independencia de Cartagena
    '2025-12-08', // Inmaculada Concepción
    '2025-12-25', // Navidad
];

function esFestivo(fecha) { // fecha es un objeto Date de date-fns
    const fechaStr = format(fecha, 'yyyy-MM-dd');
    return FESTIVOS_2025.includes(fechaStr);
}

// --- Lógica de UI: Calcular Hora Fin por Defecto ---
function actualizarHoraFinDefault() {
    const fechaInicioStr = fechaInicioEl.value;
    const horaInicioStr = horaInicioEl.value;

    if (fechaInicioStr && horaInicioStr) {
        // Combinar fecha y hora de inicio
        // 'parse' necesita un formato específico. Ajusta si tu input type="time" da otro formato.
        // Asumimos 'HH:mm' para la hora.
        const inicioDt = parse(`${fechaInicioStr} ${horaInicioStr}`, 'yyyy-MM-dd HH:mm', new Date());

        if (isValid(inicioDt)) {
            // Calcular fin default (+10 horas)
            const finDtDefault = addHours(inicioDt, 10);

            // Actualizar campo hora fin
            horaFinEl.value = format(finDtDefault, 'HH:mm');

            // Actualizar checkbox "terminó día siguiente"
            terminoDiaSiguienteEl.checked = !isSameDay(inicioDt, finDtDefault);
        }
    }
}

// Añadir listeners para actualizar el default
fechaInicioEl.addEventListener('change', actualizarHoraFinDefault);
horaInicioEl.addEventListener('change', actualizarHoraFinDefault);


// --- Lógica Principal de Cálculo ---

function clasificarYCalcularRecargos(inicioDt, finDt, descansoHabilitado) {

    // --- Validación Inicial ---
    if (!isValid(inicioDt) || !isValid(finDt) || isBefore(finDt, inicioDt)) {
        return { error: "Fechas inválidas o fecha fin anterior a fecha inicio." };
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
    let duracionTotalTrabajadaSegundos = 0; // Para calcular el umbral después del descanso

    // --- Paso 1: Determinar Puntos Clave y Segmentos ---
    let puntosClave = new Set([inicioDt.getTime(), finDt.getTime()]); // Usar timestamps para evitar duplicados de objetos Date

    // Añadir medianoches
    let fechaCursor = startOfDay(inicioDt);
    while (isBefore(fechaCursor, finDt)) {
        const medianoche = endOfDay(fechaCursor); // Medianoche es fin del día
         // Solo añadir si está estrictamente entre inicio y fin
        if (isAfter(medianoche, inicioDt) && isBefore(medianoche, finDt)) {
             puntosClave.add(medianoche.getTime());
        }
        fechaCursor = addDays(fechaCursor, 1);
    }

    // Añadir cambios de horario (6 AM y 9 PM)
     fechaCursor = startOfDay(inicioDt);
     while (isBefore(fechaCursor, addDays(endOfDay(finDt), 1))) { // Iterar hasta el día después del fin
        const seisAM = setMilliseconds(setSeconds(setMinutes(setHours(fechaCursor, HORA_NOCTURNA_FIN), 0), 0), 0);
        const nuevePM = setMilliseconds(setSeconds(setMinutes(setHours(fechaCursor, HORA_NOCTURNA_INICIO), 0), 0), 0);
        
        if (isAfter(seisAM, inicioDt) && isBefore(seisAM, finDt)) {
            puntosClave.add(seisAM.getTime());
        }
         if (isAfter(nuevePM, inicioDt) && isBefore(nuevePM, finDt)) {
            puntosClave.add(nuevePM.getTime());
        }
        fechaCursor = addDays(fechaCursor, 1);
     }
     
    // (Omitimos añadir umbral aquí, lo calcularemos después del descanso si aplica)

    // Ordenar los puntos (timestamps) y convertir de nuevo a Dates
    const puntosOrdenados = Array.from(puntosClave).sort((a, b) => a - b).map(ts => new Date(ts));


    // --- Paso 2: Iterar y Clasificar Segmentos (Calculando duración trabajada real) ---
    for (let i = 0; i < puntosOrdenados.length - 1; i++) {
        const tInicioSegmento = puntosOrdenados[i];
        const tFinSegmento = puntosOrdenados[i + 1];

        if (isEqual(tFinSegmento, tInicioSegmento)) continue;

        // Punto medio para evaluar condiciones
        const duracionSegmentoSegundosTotal = differenceInSeconds(tFinSegmento, tInicioSegmento);
        const puntoEvaluacion = addHours(tInicioSegmento, (duracionSegmentoSegundosTotal / 3600.0) / 2); // Aproximado, usar tInicio está bien tambien
        const horaEval = getHours(puntoEvaluacion);

        // Lógica de Descanso: Si está habilitado y el segmento cae DENTRO del descanso, no suma duración trabajada
        let duracionTrabajadaSegmentoSegundos = duracionSegmentoSegundosTotal;
        if (descansoHabilitado && horaEval >= HORA_INICIO_DESCANSO && horaEval < HORA_FIN_DESCANSO) {
            // Este segmento es de descanso, no se cuenta para el umbral ni para las horas pagas
             duracionTrabajadaSegmentoSegundos = 0; 
             // Podríamos refinar para calcular si SOLO PARTE del segmento cae en descanso
        }
        
        // Acumular duración trabajada (en segundos)
        duracionTotalTrabajadaSegundos += duracionTrabajadaSegmentoSegundos;
    }

    // --- Calcular Umbral basado en horas trabajadas REALES ---
    const duracionTotalTrabajadaHoras = duracionTotalTrabajadaSegundos / 3600.0;
    const esJornadaConExtras = duracionTotalTrabajadaHoras > HORAS_JORNADA_BASE;
    
    // Ahora, necesitamos re-iterar o una lógica para saber qué punto corresponde al umbral
    // Enfoque más simple: calcular el tiempo de umbral relativo al inicio REAL trabajado
    let segundosTrabajadosAcum = 0;
    let umbralFinDt = null; // El timestamp exacto donde se cumplen las 7.6h trabajadas

     if (esJornadaConExtras) {
         for (let i = 0; i < puntosOrdenados.length - 1; i++) {
            const tInicioSegmento = puntosOrdenados[i];
            const tFinSegmento = puntosOrdenados[i + 1];
            if (isEqual(tFinSegmento, tInicioSegmento))
  