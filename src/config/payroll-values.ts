// src/config/payroll-values.ts

/**
 * @fileOverview Configuration file for payroll values.
 * This file exports constants used in payroll calculations, specifically the hourly rates for different types of work hours
 * and other global payroll constants.
 * It is separated from 'use server' files to allow importing constants into client components without violating 'use server' rules.
 */

// Valores por hora (pesos colombianos)
// ESTE ES EL OBJETO QUE DEBES ACTUALIZAR SI LOS VALORES CAMBIAN:
export const VALORES = {
    "Recargo_Noct_Base": 2265,          // Recargo Nocturno (dentro de las 7.33h base, laboral)
    "HED": 8087.5,                      // Hora Extra Diurna (después de 7.33h, laboral)
    "HEN": 11323,                       // Hora Extra Nocturna (después de 7.33h, laboral)
    // Recargos Dominicales (solo domingos)
    "Recargo_Dom_Diurno_Base": 5176,    // Recargo Dominical Diurno (dentro de 7.33h)
    "Recargo_Dom_Noct_Base": 7440.5,    // Recargo Dominical Nocturno (dentro de 7.33h)
    "HED_Dom": 13264,                    // Hora Extra Dominical Diurna (después de 7.33h)
    "HEN_Dom": 16498.5,                  // Hora Extra Dominical Nocturna (después de 7.33h)
    // Recargos Festivos (solo festivos)
    "Recargo_Fest_Diurno_Base": 5176,   // Recargo Festivo Diurno (dentro de 7.33h)
    "Recargo_Fest_Noct_Base": 7440.5,   // Recargo Festivo Nocturno (dentro de 7.33h)
    "HED_Fest": 13264,                   // Hora Extra Festiva Diurna (después de 7.33h)
    "HEN_Fest": 16498.5,                 // Hora Extra Festiva Nocturna (después de 7.33h)
    "Compensatorio_dia_festivo_trabajado": 47425, // Día festivo trabajado (se paga si no se da un día compensado remunerado)
    "Ordinaria_Diurna_Base": 0          // Horas base diurnas laborales (sin recargo adicional sobre el salario)
};

// Valor del auxilio de transporte quincenal
export const AUXILIO_TRANSPORTE_VALOR_QUINCENAL = 100000;
