// src/types/payroll-settings.ts

import type { QuincenalCalculationSummary } from './index'; // Import QuincenalCalculationSummary

export interface PayrollSettings {
  id?: string; // Document ID, usually 'global' or a specific config set ID
  salarioBaseQuincenal: number;
  umbralHorasDiarias: number;
  auxilioTransporte: number;
  recargoNoctBase: number;
  hed: number; // Hora Extra Diurna
  hen: number; // Hora Extra Nocturna
  recargoDomDiurnoBase: number;
  recargoDomNoctBase: number;
  heddF: number; // Hora Extra Dominical/Festiva Diurna
  hendF: number; // Hora Extra Dominical/Festiva Nocturna
  ordinariaDiurnaBase: number; // Typically 0 if base salary covers this
  // Add any other configurable values here
  lastUpdated?: Date;
  summary?: QuincenalCalculationSummary; // Optional: for default summary if needed
}

const defaultSummary: QuincenalCalculationSummary = {
    totalHorasDetalladas: { Ordinaria_Diurna_Base: 0, Recargo_Noct_Base: 0, Recargo_Dom_Diurno_Base: 0, Recargo_Dom_Noct_Base: 0, HED: 0, HEN: 0, HEDD_F: 0, HEND_F: 0 },
    totalPagoDetallado: { Ordinaria_Diurna_Base: 0, Recargo_Noct_Base: 0, Recargo_Dom_Diurno_Base: 0, Recargo_Dom_Noct_Base: 0, HED: 0, HEN: 0, HEDD_F: 0, HEND_F: 0 },
    totalPagoRecargosExtrasQuincena: 0,
    salarioBaseQuincenal: 0, // Will be overridden by the main salarioBaseQuincenal
    pagoTotalConSalarioQuincena: 0, // Will be overridden
    totalDuracionTrabajadaHorasQuincena: 0,
    diasCalculados: 0,
};

export const defaultPayrollSettings: PayrollSettings = {
  salarioBaseQuincenal: 711750,
  umbralHorasDiarias: 7.66,
  auxilioTransporte: 100000, // Consistent with previous usage in page.tsx
  recargoNoctBase: 2166,
  hed: 7736.41,
  hen: 10830.98,
  recargoDomDiurnoBase: 4642,
  recargoDomNoctBase: 6808,
  heddF: 12378.26,
  hendF: 15472.83,
  ordinariaDiurnaBase: 0,
  summary: { // Provide a default summary structure
    ...defaultSummary,
    salarioBaseQuincenal: 711750, // ensure this matches
    pagoTotalConSalarioQuincena: 711750, // ensure this matches
  }
};
