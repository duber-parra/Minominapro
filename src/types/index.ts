
// src/types/index.ts

import type { WorkdayFormValues } from '@/components/workday-form';

 export interface CalculationResults {
   id: string; // Unique identifier for this specific calculation (e.g., timestamp or UUID)
   inputData: Omit<WorkdayFormValues, 'startDate'> & { startDate: Date }; // Use Date object consistently
   horasDetalladas: {
     Ordinaria_Diurna_Base: number;      // Horas dentro de jornada (7.66h), diurnas, sin recargo base adicional
     Recargo_Noct_Base: number;            // Horas dentro de jornada (7.66h), nocturnas (solo valor del recargo)
     Recargo_Dom_Diurno_Base: number;      // Horas dentro de jornada (7.66h), dominical/festivo diurno (solo valor del recargo)
     Recargo_Dom_Noct_Base: number;      // Horas dentro de jornada (7.66h), dominical/festivo nocturno (solo valor del recargo)
     HED: number;                          // Horas extras (después de 7.66h), diurnas, laborales
     HEN: number;                          // Horas extras (después de 7.66h), nocturnas, laborales
     HEDD_F: number;                       // Horas extras (después de 7.66h), diurnas, dominicales/festivas
     HEND_F: number;                       // Horas extras (después de 7.66h), nocturnas, dominicales/festivas
   };
   pagoDetallado: {
     [key in keyof CalculationResults['horasDetalladas']]: number; // Pago por cada categoría de hora
   };
   pagoTotalRecargosExtras: number; // Suma del pago por recargos y horas extras únicamente para este día
   pagoTotalConSalario: number; // Represents ONLY the extra pay for the day
   duracionTotalTrabajadaHoras: number; // Duración total trabajada en horas (descontando descansos) para este día
 }

 export interface CalculationError {
   error: string; // Mensaje de error
 }

 // Represents the aggregated results for the entire pay period (quincena) BEFORE manual adjustments AND transport allowance
 export interface QuincenalCalculationSummary {
    totalHorasDetalladas: CalculationResults['horasDetalladas'];
    totalPagoDetallado: CalculationResults['pagoDetallado'];
    totalPagoRecargosExtrasQuincena: number;
    salarioBaseQuincenal: number; // Assuming this is fixed for the period
    pagoTotalConSalarioQuincena: number; // Represents Base + Extras/Recargos only. Transport, other income/deductions are handled separately.
    totalDuracionTrabajadaHorasQuincena: number;
    diasCalculados: number; // Number of days included in this summary
 }

 // Type guard to check if an object is a CalculationError
 export function isCalculationError(obj: any): obj is CalculationError {
    // Check if obj exists and has an 'error' property that is a string
    return obj && typeof obj === 'object' && typeof obj.error === 'string';
 }

 // Interface for individual adjustment items (Income or Deduction)
 export interface AdjustmentItem {
     id: string; // Unique ID for the item (e.g., timestamp + random)
     monto: number; // Amount (always positive)
     descripcion: string; // Optional description
 }


 // Represents the data structure for a saved payroll entry in localStorage
 export interface SavedPayrollData {
    key: string; // The localStorage key for this entry (e.g., payroll_123_2023-10-01_2023-10-15)
    employeeId: string;
    periodStart: Date;
    periodEnd: Date;
    summary: QuincenalCalculationSummary; // The calculated summary BEFORE adjustments and transport allowance
    otrosIngresosLista: AdjustmentItem[]; // List of other income items
    otrasDeduccionesLista: AdjustmentItem[]; // List of other deduction items
    incluyeAuxTransporte: boolean; // Flag indicating if transport allowance was included for this saved period
    createdAt?: Date; // Optional: Timestamp when the payroll was saved/calculated
 }


    