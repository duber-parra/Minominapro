import { calculateSingleWorkday } from './calculate-workday';
import { PayrollSettings } from '@/types'; // Adjust the path if necessary
import { parseISO, format, getDay, isSameDay, isWithinInterval } from 'date-fns'; // Needed for date manipulation and checks

// Mock of the esFestivo function if it makes external calls or has complex logic
// import * as holidayUtils from './holiday-utils'; // Assuming esFestivo is in this file
// jest.mock('./holiday-utils');
// const mockEsFestivo = holidayUtils.esFestivo as jest.Mock;

// Mock the esFestivo implementation to return false for non-defined holidays in tests
// If you have specific holidays to test, you would define them here.
const mockEsFestivo = jest.fn().mockImplementation((date: Date) => {
   // Add logic here if you need specific dates to be considered holidays in tests
   // const formattedDate = format(date, 'yyyy-MM-dd');
   // const festivos = ['2025-01-01', '2025-12-25']; // Example holidays for testing
   // return festivos.includes(formattedDate);
   return false; // Default to false for most test dates unless specified
});

// Replace the actual esFestivo in the module with the mock
jest.mock('./holiday-utils', () => ({
  ...jest.requireActual('./holiday-utils'),
  esFestivo: mockEsFestivo,
}));


describe('calculateSingleWorkday', () => {

  // Define a mock payroll settings object to be used in tests
  const mockPayrollSettings: PayrollSettings = {
      recargoNoctBase: 2166,
      hed: 1547,
      hen: 4642,
      recargoDomDiurnoBase: 4642,
      recargoDomNoctBase: 6808,
      heddF: 6189,
      hendF: 9284,
      ordinariaDiurnaBase: 0, // Assuming 0 extra recargo for base ordinary diurnal pay component (it's part of salary)
      umbralHorasDiarias: 7.66, // Use the precise 7.66 hours for base jornada
      horaNocturnaInicio: 21, // 9 PM
      horaNocturnaFin: 6, // 6 AM
      // Add other settings as needed for your specific payroll rules
      salarioMensual: 1300000, // Example salary
      diasHabilesMes: 25, // Example
  };


  beforeEach(() => {
    // Reset the mock before each test to ensure clean state
    mockEsFestivo.mockClear();
     // You might need to reset any internal counters if your function was not pure,
     // but calculateSingleWorkday seems designed to be pure based on inputs.
  });


  it('should correctly calculate pay for a shift crossing midnight from Saturday to Sunday, exceeding base jornada', async () => {
    // Datos de entrada para el Turno 1: Sábado 11:00 AM - Domingo 3:00 AM (+1d)
    const inputValues = {
      id: 'turno1',
      startDate: '2025-05-03', // Sábado
      startTime: '11:00',
      endTime: '03:00', // 3:00 AM
      endsNextDay: true,
      includeBreak: false, // Sin descanso para este turno
      breakStartTime: '',
      breakEndTime: '',
    };

    // Ensure mockEsFestivo returns false for the relevant dates if not actual holidays
    mockEsFestivo.mockImplementation((date: Date) => {
        const formattedDate = format(date, 'yyyy-MM-dd');
        return formattedDate === '2025-05-03' || formattedDate === '2025-05-04' ? false : false; // Sab & Dom not holidays
    });


    const result = await calculateSingleWorkday(inputValues, mockPayrollSettings);

    // *** Verificaciones (Assertions) ***

    // Total duration: 11:00 AM Sab to 3:00 AM Dom = 16 hours
    expect(result.duracionTotalTrabajadaHoras).toBeCloseTo(16.00, 2);

    // Expected detailed hours based on 7.66h base jornada:
    // Turno: Sábado 11:00 AM to Sunday 3:00 AM (16 hours total)
    // Jornada Base: 7.66 hours (459.6 minutes)
    // 11:00 AM Sat + 7.66 hours = 18:39:36 Sat (approx 6:39 PM)

    // Base hours (first 7.66 hours of the shift):
    // 11:00 AM Sat to 18:39:36 Sat -> All before 9 PM, on Saturday (not Dom/Fest). Classified as Ordinaria Diurna Base.
    // Ordinaria_Diurna_Base: 7.66 hours

    // Extra hours (after 7.66 hours of the shift):
    // 18:39:36 Sat to 21:00 Sat (9:00 PM) -> Extra, Diurnal, Saturday (not Dom/Fest). Classified as HED.
    // Duration: 21:00 - 18:39:36 = 2 hours 20 minutes 24 seconds = ~2.34 hours
    // HED: ~2.34 hours

    // 21:00 Sat to 00:00 Sun (midnight) -> Extra, Nocturnal, Saturday (not Dom/Fest). Classified as HEN.
    // Duration: 3 hours
    // HEN: 3.00 hours

    // 00:00 Sun to 03:00 Sun (3:00 AM) -> Extra, Nocturnal, Sunday (Dom/Fest). Classified as HEND_F.
    // Duration: 3 hours
    // HEND_F: 3.00 hours

    // Total: 7.66 + 2.34 + 3.00 + 3.00 = 16.00 hours.

    expect(result.horasDetalladas.Ordinaria_Diurna_Base).toBeCloseTo(7.66, 2);
    expect(result.horasDetalladas.HED).toBeCloseTo(2.34, 2);
    expect(result.horasDetalladas.HEN).toBeCloseTo(3.00, 2);
    expect(result.horasDetalladas.HEND_F).toBeCloseTo(3.00, 2);

    expect(result.horasDetalladas.Recargo_Noct_Base).toBeCloseTo(0, 2);
    expect(result.horasDetalladas.Recargo_Dom_Diurno_Base).toBeCloseTo(0, 2);
    expect(result.horasDetalladas.Recargo_Dom_Noct_Base).toBeCloseTo(0, 2);
    expect(result.horasDetalladas.HEDD_F).toBeCloseTo(0, 2);


    // Verify total recargos/extras payment
    // Expected: (2.34 * HED) + (3.00 * HEN) + (3.00 * HEND_F)
    const expectedPagoRecargosExtras = (2.34 * mockPayrollSettings.hed) +
                                       (3.00 * mockPayrollSettings.hen) +
                                       (3.00 * mockPayrollSettings.hendF);
    expect(result.pagoTotalRecargosExtras).toBeCloseTo(expectedPagoRecargosExtras, 2);

     // Assuming pagoTotalConSalario includes Ordinaria_Diurna_Base pay component based on monthly salary
     // Salario por hora base diurna = salarioMensual / (diasHabilesMes * umbralHorasDiarias)
     const salarioHoraBaseDiurna = mockPayrollSettings.salarioMensual / (mockPayrollSettings.diasHabilesMes * mockPayrollSettings.umbralHorasDiarias);
     const expectedPagoTotalConSalario = (result.horasDetalladas.Ordinaria_Diurna_Base * salarioHoraBaseDiurna) + expectedPagoRecargosExtras;

    expect(result.pagoTotalConSalario).toBeCloseTo(expectedPagoTotalConSalario, 2);


    expect(result.id).toBe('turno1');
    // Optionally, verify inputData structure if important
    // expect(result.inputData).toEqual(expect.objectContaining(inputValues));

  });

  it('should correctly calculate pay for a shift with a break and crossing midnight', async () => {
      // Datos para Turno 5: Miércoles 11:00 AM - Jueves 3:00 AM (+1d), Descanso: 3:00 PM - 6:00 PM
      const inputValuesTurno5 = {
           id: 'turno5',
           startDate: '2025-05-07', // Miércoles
           startTime: '11:00',
           endTime: '03:00', // 3:00 AM
           endsNextDay: true,
           includeBreak: true,
           breakStartTime: '15:00', // 3:00 PM
           breakEndTime: '18:00', // 6:00 PM
      };

      // Ensure mockEsFestivo returns false for the relevant dates if not actual holidays
       mockEsFestivo.mockImplementation((date: Date) => {
           const formattedDate = format(date, 'yyyy-MM-dd');
           return formattedDate === '2025-05-07' || formattedDate === '2025-05-08' ? false : false; // Mie & Jue not holidays
       });


      const result5 = await calculateSingleWorkday(inputValuesTurno5, mockPayrollSettings);

      // *** Verificaciones (Assertions) para Turno 5 ***
      // Turno total gross: 11:00 Mié a 3:00 Jue = 16 hours
      // Descanso: 3:00 PM Mié a 6:00 PM Mié = 3 hours
      // Total hours worked: 16 - 3 = 13 hours

      expect(result5.duracionTotalTrabajadaHoras).toBeCloseTo(13.00, 2);

      // Expected classification for Turno 5:
      // Turno: Miércoles 11:00 AM to Jueves 3:00 AM
      // Descanso: Miércoles 3:00 PM to 6:00 PM
      // Jornada Base: 7.66 hours (459.6 minutes)

      // Worked hours BEFORE break: 11:00 AM to 3:00 PM = 4 hours. (Ordinaria Diurna Base)
      // Worked hours AFTER break: 6:00 PM Mié to 3:00 AM Jue = 9 hours.
      // Total worked = 4 + 9 = 13 hours.

      // Base Jornada (7.66 hours)
      // First 4 hours are ODB (11 AM - 3 PM).
      // Remaining base hours: 7.66 - 4 = 3.66 hours. These start after the break (from 6:00 PM).
      // From 6:00 PM Mie to 9:00 PM Mie (3 hours) are diurnal.
      // From 9:00 PM Mie onwards are nocturnal.

      // The 3.66 remaining base hours:
      // The first 3 hours of this segment (6 PM to 9 PM) are Ordinaria Diurna Base.
      // Remaining base hours: 3.66 - 3 = 0.66 hours.
      // These 0.66 hours fall after 9 PM on Wednesday, so they are Recargo Nocturno Base.

      // Summary Base Jornada (7.66 hours):
      // 4.00 hours (11 AM - 3 PM) Ordinaria Diurna Base
      // 3.00 hours (6 PM - 9 PM) Ordinaria Diurna Base
      // 0.66 hours (9 PM - 9:39:36 PM approx) Recargo Nocturno Base
      // Total Base: 4 + 3 + 0.66 = 7.66 hours.

      // Extra Hours (after 7.66 hours worked, which is approx 9:39:36 PM Mié):
      // Shift ends at 3:00 AM Thu.
      // From 9:39:36 PM Mié to 3:00 AM Jue: Remaining extra nocturnal hours.
      // Total nocturnal hours after 9 PM Mié: From 9 PM Mié to 3 AM Jue = 6 hours.
      // We already classified 0.66 hours as Recargo Nocturno Base in this segment.
      // Remaining extra nocturnal hours: 6.00 - 0.66 = 5.34 hours.
      // Since it's a normal weekday, they are HEN.

      // Summary Extra Hours (13 - 7.66 = 5.34 hours):
      // 5.34 hours (approx 9:39:36 PM Mié to 3 AM Jue) Extra Nocturna (HEN)

      // Total classified hours: 4 (ODB) + 3 (ODB) + 0.66 (RNB) + 5.34 (HEN) = 13.00 hours. Matches total worked.

      expect(result5.horasDetalladas.Ordinaria_Diurna_Base).toBeCloseTo(7.00, 2); // 4.00 + 3.00
      expect(result5.horasDetalladas.Recargo_Noct_Base).toBeCloseTo(0.66, 2);
      expect(result5.horasDetalladas.HEN).toBeCloseTo(5.34, 2);

      expect(result5.horasDetalladas.HED).toBeCloseTo(0, 2);
      expect(result5.horasDetalladas.Recargo_Dom_Diurno_Base).toBeCloseTo(0, 2);
      expect(result5.horasDetallada<ctrl60>s.Recargo_Dom_Noct_Base).toBeCloseTo(0, 2);
      expect(result5.horasDetalladas.HEDD_F).toBeCloseTo(0, 2);
      expect(result5.horasDetalladas.HEND_F).toBeCloseTo(0, 2);


      // Verify total recargos/extras payment
      // Expected: (0.66 * Recargo_Noct_Base) + (5.34 * HEN)
       const expectedPagoRecargosExtras5 = (0.66 * mockPayrollSettings.recargoNoctBase) +
                                          (5.34 * mockPayrollSettings.hen);
       expect(result5.pagoTotalRecargosExtras).toBeCloseTo(expectedPagoRecargosExtras5, 2);

       // Verify total pay including base diurnal pay component
        const salarioHoraBaseDiurna5 = mockPayrollSettings.salarioMensual / (mockPayrollSettings.diasHabilesMes * mockPayrollSettings.umbralHorasDiarias);
        const expectedPagoTotalConSalario5 = (result5.horasDetalladas.Ordinaria_Diurna_Base * salarioHoraBaseDiurna5) + expectedPagoRecargosExtras5;

       expect(result5.pagoTotalConSalario).toBeCloseTo(expectedPagoTotalConSalario5, 2);


       expect(result5.id).toBe('turno5');
       // Optionally, verify inputData structure if important
       // expect(result5.inputData).toEqual(expect.objectContaining(inputValuesTurno5));
  });


  // Add more test cases here for other scenarios:
  // - Shift entirely within a weekday, exceeding base
  // - Shift entirely within a weekend/holiday
  // - Shift crossing into a holiday
  // - Shift with a break crossing midnight
  // - Shift with multiple breaks (if your logic supports it)
  // - Edge cases (e.g., 7.66 hour exactly shift, shifts less than an hour)

});