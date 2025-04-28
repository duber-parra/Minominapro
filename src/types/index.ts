
export interface CalculationResults {
  horasDetalladas: {
    Ordinaria_Diurna_Base: number;
    Recargo_Noct_Base: number;
    Recargo_Dom_Diurno_Base: number;
    Recargo_Dom_Noct_Base: number;
    HED: number; // Hora Extra Diurna
    HEN: number; // Hora Extra Nocturna
    HEDD_F: number; // Hora Extra Dominical/Festiva Diurna
    HEND_F: number; // Hora Extra Dominical/Festiva Nocturna
  };
  pagosDetallados: {
    Ordinaria_Diurna_Base: number; // Pago base ya incluido en salario, aquí solo recargos/extras
    Recargo_Noct_Base: number;
    Recargo_Dom_Diurno_Base: number;
    Recargo_Dom_Noct_Base: number;
    HED: number;
    HEN: number;
    HEDD_F: number;
    HEND_F: number;
  };
  pagoTotal: number; // Suma de todos los pagos detallados (recargos y extras)
  duracionTotalTrabajadaHoras: number; // Total horas trabajadas reales (descontando descanso si aplica)
}

export interface CalculationError {
  error: string;
}

export interface WorkdayInput {
  startDate: Date;
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  endsNextDay: boolean;
  includeBreak: boolean;
}
