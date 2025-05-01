// src/lib/payroll-utils.ts

import type { CalculationResults, QuincenalCalculationSummary } from '@/types';

// Example fixed salary for demonstration - consider making this configurable if needed elsewhere
const SALARIO_BASE_QUINCENAL_FIJO = 711750;

/**
 * Calculates the quincenal summary from an array of daily calculation results.
 * @param calculatedDays - Array of CalculationResults for the period.
 * @param salarioBase - The base fortnightly salary. Defaults to SALARIO_BASE_QUINCENAL_FIJO.
 * @returns The QuincenalCalculationSummary or null if no days are provided.
 */
export function calculateQuincenalSummary(
    calculatedDays: CalculationResults[],
    salarioBase: number = SALARIO_BASE_QUINCENAL_FIJO
): QuincenalCalculationSummary | null {
    if (!calculatedDays || calculatedDays.length === 0) {
        return null;
    }

    const initialSummary: QuincenalCalculationSummary = {
        totalHorasDetalladas: {
            Ordinaria_Diurna_Base: 0, Recargo_Noct_Base: 0, Recargo_Dom_Diurno_Base: 0,
            Recargo_Dom_Noct_Base: 0, HED: 0, HEN: 0, HEDD_F: 0, HEND_F: 0,
        },
        totalPagoDetallado: {
            Ordinaria_Diurna_Base: 0, Recargo_Noct_Base: 0, Recargo_Dom_Diurno_Base: 0,
            Recargo_Dom_Noct_Base: 0, HED: 0, HEN: 0, HEDD_F: 0, HEND_F: 0,
        },
        totalPagoRecargosExtrasQuincena: 0,
        salarioBaseQuincenal: salarioBase,
        pagoTotalConSalarioQuincena: salarioBase, // Start with base salary
        totalDuracionTrabajadaHorasQuincena: 0,
        diasCalculados: calculatedDays.length,
    };

    return calculatedDays.reduce((summary, currentDay) => {
        // Use Object.keys on the summary's structure to ensure all categories are processed
        Object.keys(summary.totalHorasDetalladas).forEach(key => {
            const category = key as keyof CalculationResults['horasDetalladas'];
            // Accumulate hours and payments safely, defaulting to 0 if a category is somehow missing in currentDay
            summary.totalHorasDetalladas[category] += currentDay.horasDetalladas[category] ?? 0;
            summary.totalPagoDetallado[category] += currentDay.pagoDetallado[category] ?? 0;
        });
        summary.totalPagoRecargosExtrasQuincena += currentDay.pagoTotalRecargosExtras;
        summary.totalDuracionTrabajadaHorasQuincena += currentDay.duracionTotalTrabajadaHoras;
        summary.pagoTotalConSalarioQuincena += currentDay.pagoTotalRecargosExtras; // Add only the extras/surcharges
        return summary;
    }, initialSummary);
}
