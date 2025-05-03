
// src/lib/csv-utils.ts

import type { SavedPayrollData } from '@/types';
import { formatCurrency, formatHours } from '@/components/results-display'; // Assuming these are exported and correct
import { format } from 'date-fns';

// Helper function to calculate final net pay for CSV export
const calculateNetoAPagarForCSV = (payroll: SavedPayrollData): number => {
    const baseMasExtras = payroll.summary.pagoTotalConSalarioQuincena;
    const auxTransporteValorConfig = 100000; // Centralize this if possible
    const auxTransporteAplicado = payroll.incluyeAuxTransporte ? auxTransporteValorConfig : 0;
    const totalOtrosIngresos = (payroll.otrosIngresosLista || []).reduce((sum, item) => sum + item.monto, 0);
    const totalOtrasDeduccionesManuales = (payroll.otrasDeduccionesLista || []).reduce((sum, item) => sum + item.monto, 0);

    const totalDevengadoBruto = baseMasExtras + auxTransporteAplicado + totalOtrosIngresos;
    const ibcEstimadoQuincenal = baseMasExtras + totalOtrosIngresos;
    const deduccionSaludQuincenal = ibcEstimadoQuincenal * 0.04;
    const deduccionPensionQuincenal = ibcEstimadoQuincenal * 0.04;
    const totalDeduccionesLegales = deduccionSaludQuincenal + deduccionPensionQuincenal;
    const subtotalNetoParcial = totalDevengadoBruto - totalDeduccionesLegales;
    return subtotalNetoParcial - totalOtrasDeduccionesManuales;
};


/**
 * Generates CSV content from an array of saved payroll data.
 *
 * @param payrolls - Array of SavedPayrollData objects.
 * @param headers - Optional array of header strings for the CSV.
 * @param dataMapper - Function to map each payroll object to an array of values corresponding to the headers.
 * @returns A string containing the CSV content, ready for download.
 */
export function generateCSVContent<T>(
    data: T[],
    headers: string[],
    dataMapper: (item: T) => (string | number | undefined)[]
): string {
    const csvRows: string[][] = [];
    csvRows.push(headers); // Add header row

    data.forEach(item => {
        const rowValues = dataMapper(item);
        // Map values to strings, handling potential undefined/null and commas/newlines
        const processedRow = rowValues.map(field => {
            let stringField = String(field ?? ''); // Convert to string, default empty
            // If field contains comma, newline, or double quote, enclose in double quotes and escape existing double quotes
            if (stringField.includes(',') || stringField.includes('\n') || stringField.includes('"')) {
                stringField = `"${stringField.replace(/"/g, '""')}"`;
            }
            return stringField;
        });
        csvRows.push(processedRow);
    });

    // Join rows with newline and create data URI
    const csvString = csvRows.map(row => row.join(",")).join("\n");
    return "data:text/csv;charset=utf-8," + encodeURIComponent(csvString);
}


/**
 * Specific CSV generation function for a single payroll.
 * @param payroll - The SavedPayrollData object for the single payroll.
 * @returns A string containing the CSV content for the single payroll.
 */
export function generateSinglePayrollCSV(payroll: SavedPayrollData): string {
    const headers = [
        "ID Empleado", "Período Inicio", "Período Fin", "Salario Base",
        "Total Extras/Recargos", "Aux. Transporte", "Otros Ingresos", "Total Devengado",
        "Ded. Salud (4%)", "Ded. Pensión (4%)", "Otras Deducciones", "Neto Pagado",
        "Total Horas"
    ];

    const dataMapper = (p: SavedPayrollData) => {
         const baseMasExtras = p.summary.pagoTotalConSalarioQuincena;
         const auxTransporteValorConfig = 100000;
         const auxTransporteAplicado = p.incluyeAuxTransporte ? auxTransporteValorConfig : 0;
         const totalOtrosIngresos = (p.otrosIngresosLista || []).reduce((sum, item) => sum + item.monto, 0);
         const totalOtrasDeduccionesManuales = (p.otrasDeduccionesLista || []).reduce((sum, item) => sum + item.monto, 0);

         const totalDevengadoBruto = baseMasExtras + auxTransporteAplicado + totalOtrosIngresos;
         const ibcEstimadoQuincenal = baseMasExtras + totalOtrosIngresos;
         const deduccionSaludQuincenal = ibcEstimadoQuincenal * 0.04;
         const deduccionPensionQuincenal = ibcEstimadoQuincenal * 0.04;
         const netoFinal = calculateNetoAPagarForCSV(p); // Use helper

         return [
             p.employeeId,
             format(p.periodStart, 'yyyy-MM-dd'),
             format(p.periodEnd, 'yyyy-MM-dd'),
             p.summary.salarioBaseQuincenal, // Use number directly
             p.summary.totalPagoRecargosExtrasQuincena, // Use number
             auxTransporteAplicado, // Use number
             totalOtrosIngresos, // Use number
             totalDevengadoBruto, // Use number
             deduccionSaludQuincenal, // Use number
             deduccionPensionQuincenal, // Use number
             totalOtrasDeduccionesManuales, // Use number
             netoFinal, // Use number
             p.summary.totalDuracionTrabajadaHorasQuincena, // Use number
         ];
     };


    return generateCSVContent([payroll], headers, dataMapper);
}

/**
 * Specific CSV generation function for multiple payrolls.
 * @param payrolls - Array of SavedPayrollData objects.
 * @returns A string containing the CSV content for all payrolls.
 */
export function generateBulkPayrollCSV(payrolls: SavedPayrollData[]): string {
     const headers = [
         "ID Empleado", "Período Inicio", "Período Fin", "Salario Base",
         "Total Extras/Recargos", "Aux. Transporte", "Otros Ingresos", "Total Devengado",
         "Ded. Salud (4%)", "Ded. Pensión (4%)", "Otras Deducciones", "Neto Pagado",
         "Total Horas"
     ];

    const dataMapper = (p: SavedPayrollData) => {
         const baseMasExtras = p.summary.pagoTotalConSalarioQuincena;
         const auxTransporteValorConfig = 100000;
         const auxTransporteAplicado = p.incluyeAuxTransporte ? auxTransporteValorConfig : 0;
         const totalOtrosIngresos = (p.otrosIngresosLista || []).reduce((sum, item) => sum + item.monto, 0);
         const totalOtrasDeduccionesManuales = (p.otrasDeduccionesLista || []).reduce((sum, item) => sum + item.monto, 0);

         const totalDevengadoBruto = baseMasExtras + auxTransporteAplicado + totalOtrosIngresos;
         const ibcEstimadoQuincenal = baseMasExtras + totalOtrosIngresos;
         const deduccionSaludQuincenal = ibcEstimadoQuincenal * 0.04;
         const deduccionPensionQuincenal = ibcEstimadoQuincenal * 0.04;
         const netoFinal = calculateNetoAPagarForCSV(p); // Use helper

         return [
             p.employeeId,
             format(p.periodStart, 'yyyy-MM-dd'),
             format(p.periodEnd, 'yyyy-MM-dd'),
             p.summary.salarioBaseQuincenal,
             p.summary.totalPagoRecargosExtrasQuincena,
             auxTransporteAplicado,
             totalOtrosIngresos,
             totalDevengadoBruto,
             deduccionSaludQuincenal,
             deduccionPensionQuincenal,
             totalOtrasDeduccionesManuales,
             netoFinal,
             p.summary.totalDuracionTrabajadaHorasQuincena,
         ];
     };

    return generateCSVContent(payrolls, headers, dataMapper);
}


// Function to trigger CSV download
export function downloadCSV(csvContent: string, filename: string): void {
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link); // Required for FF
    link.click();
    document.body.removeChild(link);
}
