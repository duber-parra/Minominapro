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
    "Recargo_Noct_Base": 2166,          // Recargo Nocturno (dentro de las 7.66h base, laboral)
    "HED": 7736.41,                        // Hora Extra Diurna (después de 7.66h, laboral, hasta las 9 pm)
    "HEN": 10830.98,                       // Hora Extra Nocturna (después de 7.66h, laboral)
    "Recargo_Dom_Diurno_Base": 4642,    // Recargo Dominical/Festivo Diurno (dentro de 7.66h)
    "Recargo_Dom_Noct_Base": 6808,    // Recargo Dominical/Festivo Nocturno (dentro de 7.66h)
    "HEDD_F": 12378.26,                    // Hora Extra Dominical/Festiva Diurna (después de 7.66h)
    "HEND_F": 15472.83,                    // Hora Extra Dominical/Festiva Nocturna (después de 7.66h)
    "Ordinaria_Diurna_Base": 0          // Horas base diurnas laborales (sin recargo adicional sobre el salario)
};

// Valor del auxilio de transporte quincenal
export const AUXILIO_TRANSPORTE_VALOR_QUINCENAL = 100000;
