
export interface CalculationResults {
  horasDetalladas: {
    Ordinaria_Diurna_Base: number;        // Horas dentro de jornada, diurnas, sin recargo base adicional
    Recargo_Noct_Base: number;            // Horas dentro de jornada, nocturnas (solo valor del recargo)
    Recargo_Dom_Diurno_Base: number;      // Horas dentro de jornada, dominical/festivo diurno (solo valor del recargo)
    Recargo_Dom_Noct_Base: number;      // Horas dentro de jornada, dominical/festivo nocturno (solo valor del recargo)
    HED: number;                         // Hora Extra Diurna (L-S)
    HEN: number;                         // Hora Extra Nocturna (L-S)
    HEDD_F: number;                      // Hora Extra Dominical/Festiva Diurna
    HEND_F: number;                      // Hora Extra Dominical/Festiva Nocturna
  };
  pagosDetallados: {
    Ordinaria_Diurna_Base: number;      // Pago base ya incluido en salario, aquí solo acumula recargos si aplican
    Recargo_Noct_Base: number;          // Valor acumulado del recargo nocturno sobre horas base
    Recargo_Dom_Diurno_Base: number;    // Valor acumulado del recargo dom/fest diurno sobre horas base
    Recargo_Dom_Noct_Base: number;    // Valor acumulado del recargo dom/fest nocturno sobre horas base
    HED: number;                       // Pago completo (base + extra) de HED
    HEN: number;                       // Pago completo (base + extra) de HEN
    HEDD_F: number;                    // Pago completo (base + recargo dom/fest + extra) de HEDD_F
    HEND_F: number;                    // Pago completo (base + recargo dom/fest + extra) de HEND_F
  };
  pagoTotal: number; // Suma de todos los pagos detallados (recargos de horas base + pago completo de horas extras)
  duracionTotalTrabajadaHoras: number; // Total horas trabajadas reales (descontando descanso si aplica)
}

export interface CalculationError {
  error: string; // Mensaje de error
}

export interface WorkdayInput {
  startDate: Date;      // Fecha de inicio
  startTime: string;    // "HH:mm" - Hora de inicio
  endTime: string;      // "HH:mm" - Hora de fin
  endsNextDay: boolean; // Indica si la jornada termina al día siguiente
  includeBreak: boolean;// Indica si se debe descontar el descanso estándar
}
