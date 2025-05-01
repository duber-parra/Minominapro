
import type { WorkdayFormValues } from '@/components/workday-form';


 export interface CalculationResults {
   id: string; // Unique identifier for this specific calculation (e.g., timestamp or UUID)
   inputData: WorkdayFormValues; // Store the input that generated this result for editing
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
   pagoTotalConSalario: number; // Suma de pagoTotalRecargosExtras + SALARIO_BASE_QUINCENAL (para un solo día, puede no ser útil)
   duracionTotalTrabajadaHoras: number; // Duración total trabajada en horas (descontando descansos) para este día
 }

 export interface CalculationError {
   error: string; // Mensaje de error
 }

 // Represents the aggregated results for the entire pay period (quincena)
 export interface QuincenalCalculationSummary {
    totalHorasDetalladas: CalculationResults['horasDetalladas'];
    totalPagoDetallado: CalculationResults['pagoDetallado'];
    totalPagoRecargosExtrasQuincena: number;
    salarioBaseQuincenal: number; // Assuming this is fixed for the period
    pagoTotalConSalarioQuincena: number;
    totalDuracionTrabajadaHorasQuincena: number;
    diasCalculados: number; // Number of days included in this summary
 }

 // Type guard to check if an object is a CalculationError
 export function isCalculationError(obj: any): obj is CalculationError {
    return obj && typeof obj.error === 'string';
 }
