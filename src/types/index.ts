

 export interface CalculationResults {
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
   pagoTotalRecargosExtras: number; // Suma del pago por recargos y horas extras únicamente
   pagoTotalConSalario: number; // Suma de pagoTotalRecargosExtras + SALARIO_BASE_QUINCENAL
   duracionTotalTrabajadaHoras: number; // Duración total trabajada en horas (descontando descansos)
 }

 export interface CalculationError {
   error: string; // Mensaje de error
 }
