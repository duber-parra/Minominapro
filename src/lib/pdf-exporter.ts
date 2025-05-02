
// src/lib/pdf-exporter.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import type { QuincenalCalculationSummary, AdjustmentItem, SavedPayrollData } from '@/types'; // Added AdjustmentItem and SavedPayrollData
import { labelMap, displayOrder, formatCurrency, formatHours } from '@/components/results-display'; // Import helpers
import { formatTo12Hour } from './time-utils'; // Import the helper

// Extend jsPDF interface for autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

// Interface representing all data needed for a single payroll page
interface PayrollPageData {
    employeeId: string;
    periodStart: Date;
    periodEnd: Date;
    summary: QuincenalCalculationSummary;
    otrosIngresosLista: AdjustmentItem[];
    otrasDeduccionesLista: AdjustmentItem[];
    auxTransporteAplicado: number; // Amount of transport allowance applied
}


// Helper function to draw a single payroll report page (Kept for single export, but not used in modified bulk export)
function drawPayrollPage(doc: jsPDF, data: PayrollPageData): number { // Use the new combined interface
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    let currentY = 15; // Start position for content

    // --- Header ---
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Comprobante de Nómina Quincenal', pageWidth / 2, currentY, { align: 'center' });
    currentY += 10;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Colaborador: ${data.employeeId}`, 14, currentY);
    currentY += 6;
    doc.text(`Período: ${format(data.periodStart, 'dd/MM/yyyy', { locale: es })} - ${format(data.periodEnd, 'dd/MM/yyyy', { locale: es })}`, 14, currentY);
    currentY += 10;

    // --- Devengado Table (Base + Extras/Recargos) ---
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumen Horas y Recargos/Extras', 14, currentY);
    currentY += 6;

    const head = [['Categoría', 'Horas', 'Pago (Recargo/Extra)']];
    const bodyHours = displayOrder
        .map(key => {
            const horasCategoria = data.summary.totalHorasDetalladas[key];
            const pagoCategoria = data.summary.totalPagoDetallado[key];

             // Conditionally display rows based on whether they have values
             if (key === 'Ordinaria_Diurna_Base' && horasCategoria <= 0) return null;
             if (key !== 'Ordinaria_Diurna_Base' && horasCategoria <= 0 && pagoCategoria <= 0) return null;


            const label = labelMap[key] || key; // Use labelMap
            const formattedHours = formatHours(horasCategoria);
            const formattedPayment = key === 'Ordinaria_Diurna_Base' ? '-' : formatCurrency(pagoCategoria);

            return [label, formattedHours, formattedPayment];
        })
        .filter(row => row !== null) as (string | number)[][]; // Filter out null rows and assert type

    // Add Totals for Hours section
     bodyHours.push(
         ['-', '-', '-'], // Separator line visually in the table
         [
              { content: 'Total Horas Trabajadas en Quincena:', styles: { fontStyle: 'bold' } },
              { content: formatHours(data.summary.totalDuracionTrabajadaHorasQuincena), styles: { halign: 'right', fontStyle: 'bold' } },
              ''
         ],
         [
             { content: 'Total Recargos y Horas Extras Quincenales:', styles: { fontStyle: 'bold' } },
             '',
             { content: formatCurrency(data.summary.totalPagoRecargosExtrasQuincena), styles: { halign: 'right', fontStyle: 'bold', textColor: [76, 67, 223] } } // Use primary color
         ]
    );

    autoTable(doc, {
        head: head,
        body: bodyHours,
        startY: currentY,
        theme: 'grid',
        headStyles: { fillColor: [226, 232, 240], textColor: [30, 41, 59] }, // Adjusted colors (example: slate)
        columnStyles: {
            0: { cellWidth: 'auto' },
            1: { halign: 'right' },
            2: { halign: 'right' },
        },
        didDrawPage: (hookData) => { currentY = hookData.cursor?.y ?? currentY; },
        didParseCell: (hookData) => {
             // Style separator rows
             if (hookData.cell.raw === '-') {
                 hookData.cell.styles.fillColor = [230, 230, 230]; // Light gray fill
                 hookData.cell.styles.minCellHeight = 1; // Make separator thin
                 hookData.cell.styles.cellPadding = 0;
                 hookData.cell.text = ''; // Clear the text
            }
         }
    });

    currentY += 5; // Add some space

    // --- Otros Devengados Section ---
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Otros Devengados', 14, currentY);
    currentY += 6;

    const baseMasExtras = data.summary.pagoTotalConSalarioQuincena;
    const totalOtrosIngresosManuales = (data.otrosIngresosLista || []).reduce((sum, item) => sum + item.monto, 0);
    const totalDevengadoBruto = baseMasExtras + data.auxTransporteAplicado + totalOtrosIngresosManuales;
    const ibcEstimado = baseMasExtras + totalOtrosIngresosManuales; // IBC excludes transport allowance

    const devengadoBody = [
         ['Salario Base Quincenal', formatCurrency(data.summary.salarioBaseQuincenal)],
         ['(+) Total Recargos/Extras', formatCurrency(data.summary.totalPagoRecargosExtrasQuincena)],
    ];
    if (data.auxTransporteAplicado > 0) {
        devengadoBody.push(['(+) Auxilio de Transporte', formatCurrency(data.auxTransporteAplicado)]);
    }
    if ((data.otrosIngresosLista || []).length > 0) {
        (data.otrosIngresosLista).forEach(item => {
             devengadoBody.push([`(+) ${item.descripcion || 'Otro Ingreso'}`, formatCurrency(item.monto)]);
        });
    }
    devengadoBody.push(
         ['-', '-'], // Separator
         [{ content: 'Total Devengado Bruto Estimado:', styles: { fontStyle: 'bold' } }, { content: formatCurrency(totalDevengadoBruto), styles: { fontStyle: 'bold' } }]
    );


    autoTable(doc, {
        body: devengadoBody,
        startY: currentY,
        theme: 'plain',
        columnStyles: { 1: { halign: 'right' } },
        didDrawPage: (hookData) => { currentY = hookData.cursor?.y ?? currentY; },
        didParseCell: (hookData) => {
            // Style separator rows
             if (hookData.cell.raw === '-') {
                 hookData.cell.styles.fontStyle = 'normal'; // Ensure separator is not bold
                 hookData.cell.styles.minCellHeight = 1;
                 hookData.cell.styles.cellPadding = 0;
                 // Draw a line instead of text for separator
                 if (hookData.column.index === 0) {
                    doc.setDrawColor(200, 200, 200); // Light gray line
                    doc.line(hookData.cell.x, hookData.cell.y + hookData.cell.height / 2, hookData.cell.x + hookData.cell.width, hookData.cell.y + hookData.cell.height / 2);
                 }
                 hookData.cell.text = ''; // Clear text
            }
        }
    });

    currentY += 5; // Add space


    // --- Deducciones Legales ---
    const deduccionSaludQuincenal = ibcEstimado * 0.04;
    const deduccionPensionQuincenal = ibcEstimado * 0.04;
    const totalDeduccionesLegales = deduccionSaludQuincenal + deduccionPensionQuincenal;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Deducciones Legales (Estimadas)', 14, currentY);
    currentY += 6;

    autoTable(doc, {
        body: [
            [`Deducción Salud (4% s/IBC: ${formatCurrency(ibcEstimado)})`, formatCurrency(deduccionSaludQuincenal)],
            [`Deducción Pensión (4% s/IBC: ${formatCurrency(ibcEstimado)})`, formatCurrency(deduccionPensionQuincenal)],
            [{ content: 'Total Deducciones Legales:', styles: { fontStyle: 'bold' } }, { content: formatCurrency(totalDeduccionesLegales), styles: { fontStyle: 'bold' } }]
        ],
        startY: currentY,
        theme: 'plain',
        columnStyles: { 1: { halign: 'right' } },
        didDrawPage: (hookData) => { currentY = hookData.cursor?.y ?? currentY; },
    });

    currentY += 5; // Add space

    // --- Subtotal Neto Parcial ---
    const subtotalNetoParcial = totalDevengadoBruto - totalDeduccionesLegales;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Subtotal (Dev. Bruto - Ded. Ley):', 14, currentY);
    doc.text(formatCurrency(subtotalNetoParcial), pageWidth - 14, currentY, { align: 'right' });
    currentY += 10;


    // --- Otras Deducciones (Manuales) ---
    const totalOtrasDeduccionesManuales = (data.otrasDeduccionesLista || []).reduce((sum, item) => sum + item.monto, 0);
     if ((data.otrasDeduccionesLista || []).length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Otras Deducciones / Descuentos', 14, currentY);
        currentY += 6;
        autoTable(doc, {
            body: (data.otrasDeduccionesLista || []).map(item => [`(-) ${item.descripcion || 'Deducción'}`, formatCurrency(item.monto)]),
            startY: currentY,
            theme: 'plain',
            columnStyles: { 1: { halign: 'right', textColor: [200, 0, 0] } }, // Reddish color
            didDrawPage: (hookData) => { currentY = hookData.cursor?.y ?? currentY; },
        });
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Total Otras Deducciones:', 14, currentY + 5);
        doc.text(formatCurrency(totalOtrasDeduccionesManuales), pageWidth - 14, currentY + 5, { align: 'right' });
        currentY += 10;
    }

    // --- Neto a Pagar Final ---
     const netoAPagar = subtotalNetoParcial - totalOtrasDeduccionesManuales;
     doc.setFontSize(14);
     doc.setFont('helvetica', 'bold');
     doc.text('Neto a Pagar Estimado Quincenal:', 14, currentY);
     doc.text(formatCurrency(netoAPagar), pageWidth - 14, currentY, { align: 'right', textColor: [76, 67, 223] }); // Use primary color #4C43DF
     currentY += 15;

    // --- Signature Area ---
    let signatureY = currentY;
    // Check if signature area fits on the current page, add new page if necessary
    if (signatureY > pageHeight - 35) {
        doc.addPage();
        signatureY = 15; // Reset Y for new page
    }
    const signatureXMargin = 30;
    const signatureWidth = (pageWidth - signatureXMargin * 2) / 2 - 10;
    doc.setLineWidth(0.3);
    doc.line(signatureXMargin, signatureY, signatureXMargin + signatureWidth, signatureY);
    doc.line(pageWidth - signatureXMargin - signatureWidth, signatureY, pageWidth - signatureXMargin, signatureY);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Firma Empleador', signatureXMargin + signatureWidth / 2, signatureY + 5, { align: 'center' });
    doc.text('Firma Colaborador', pageWidth - signatureXMargin - signatureWidth / 2, signatureY + 5, { align: 'center' });
    currentY = signatureY + 15; // Update currentY after signatures

    // --- Footer Note ---
    // Check if footer note fits, add new page if necessary BEFORE drawing
     if (currentY > pageHeight - 10) {
        doc.addPage();
        currentY = pageHeight - 10; // Position at bottom of new page
     } else {
         currentY = pageHeight - 10; // Position at bottom of current page
     }
    doc.setFontSize(8);
    doc.setTextColor(150);
    const footerText = `Nota: Cálculo bruto estimado para ${data.summary.diasCalculados} días. IBC (*sin aux. transporte) y deducciones legales son aproximadas. Incluye ajustes manuales.`;
    doc.text(footerText, 14, currentY);

    return currentY; // Return the Y position after drawing this page's content
}

// --- Single Payroll Export ---
export function exportPayrollToPDF(
    summary: QuincenalCalculationSummary,
    employeeId: string,
    periodStart: Date,
    periodEnd: Date,
    otrosIngresosLista: AdjustmentItem[], // Add income list parameter
    otrasDeduccionesLista: AdjustmentItem[], // Add deduction list parameter
    auxTransporteAplicado: number // Add transport allowance parameter
): void {
    const doc = new jsPDF();
    // Construct the full data object needed by drawPayrollPage
    const payrollData: PayrollPageData = {
        employeeId,
        periodStart,
        periodEnd,
        summary,
        otrosIngresosLista,
        otrasDeduccionesLista,
        auxTransporteAplicado
    };

    drawPayrollPage(doc, payrollData);

    // --- Save the PDF ---
    const filename = `Nomina_${employeeId}_${format(periodStart, 'yyyyMMdd')}-${format(periodEnd, 'yyyyMMdd')}.pdf`;
    doc.save(filename);
}

// Helper function to calculate final net pay for display/export
const calculateNetoAPagar = (payroll: SavedPayrollData): number => {
    const baseMasExtras = payroll.summary.pagoTotalConSalarioQuincena;
    const auxTransporteValorConfig = 100000; // Assuming this value, ideally get from config
    const auxTransporteAplicado = payroll.incluyeAuxTransporte ? auxTransporteValorConfig : 0;
    const totalOtrosIngresos = (payroll.otrosIngresosLista || []).reduce((sum, item) => sum + item.monto, 0);
    const totalOtrasDeducciones = (payroll.otrasDeduccionesLista || []).reduce((sum, item) => sum + item.monto, 0);

    // Calculate Total Devengado Bruto
    const totalDevengadoBruto = baseMasExtras + auxTransporteAplicado + totalOtrosIngresos;

    // Estimate legal deductions (IBC excludes transport allowance)
    const ibcEstimadoQuincenal = baseMasExtras + totalOtrosIngresos;
    const deduccionSaludQuincenal = ibcEstimadoQuincenal * 0.04;
    const deduccionPensionQuincenal = ibcEstimadoQuincenal * 0.04;
    const totalDeduccionesLegales = deduccionSaludQuincenal + deduccionPensionQuincenal;

    // Calculate Subtotal Neto Parcial
    const subtotalNetoParcial = totalDevengadoBruto - totalDeduccionesLegales;

    // Calculate final net pay
    return subtotalNetoParcial - totalOtrasDeducciones;
};


// --- Bulk Payroll Export (Modified for List Format) ---
export function exportAllPayrollsToPDF(allPayrollData: SavedPayrollData[]): void {
    if (!allPayrollData || allPayrollData.length === 0) {
        console.warn("No payroll data provided for bulk export.");
        return;
    }

    const doc = new jsPDF();
    let currentY = 15; // Start position
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const leftMargin = 14;
    const rightMargin = 14;
    const signatureColumnWidth = 80; // Width for the signature column
    const dataColumnWidth = pageWidth - leftMargin - rightMargin - signatureColumnWidth - 10; // Width for data column (-10 for margin)

    // --- Header ---
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Listado de Pago de Nómina Quincenal', pageWidth / 2, currentY, { align: 'center' });
    currentY += 10;

    // Use the period from the first payroll entry as the header period (assuming all are for the same period)
    if (allPayrollData.length > 0) {
        const firstPayroll = allPayrollData[0];
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(`Período: ${format(firstPayroll.periodStart, 'dd/MM/yyyy', { locale: es })} - ${format(firstPayroll.periodEnd, 'dd/MM/yyyy', { locale: es })}`, pageWidth / 2, currentY, { align: 'center' });
        currentY += 15;
    }

    // --- Table Header ---
    const head = [['ID Colaborador', 'Nombre', 'Neto a Pagar', 'Firma']]; // Simplified header

    // --- Table Body ---
    const body = allPayrollData.map(payroll => {
        const netoFinal = calculateNetoAPagar(payroll);
        // Placeholder for name - ideally, you'd fetch the name based on ID
        const employeeName = `Colaborador ${payroll.employeeId}`; // Replace with actual name lookup if possible
        return [
            payroll.employeeId,
            employeeName, // Placeholder or actual name
            formatCurrency(netoFinal),
            '', // Empty cell for signature space
        ];
    });

    autoTable(doc, {
        head: head,
        body: body,
        startY: currentY,
        theme: 'grid',
        headStyles: {
            fillColor: [76, 67, 223], // Primary color
            textColor: [255, 255, 255], // White text
            fontStyle: 'bold',
        },
        columnStyles: {
            0: { cellWidth: 80 }, // ID Colaborador
            1: { cellWidth: 'auto' }, // Nombre
            2: { halign: 'right', cellWidth: 80 }, // Neto a Pagar
            3: { cellWidth: signatureColumnWidth, minCellHeight: 20 }, // Firma (ensure min height)
        },
        didDrawCell: (data) => {
            // Add a line in the signature cell for signing
            if (data.column.index === 3 && data.cell.section === 'body') {
                const cell = data.cell;
                const signatureLineY = cell.y + cell.height - 5; // Position line near bottom
                const signatureLineXStart = cell.x + 5;
                const signatureLineXEnd = cell.x + cell.width - 5;
                doc.setDrawColor(200, 200, 200); // Light gray line
                doc.setLineWidth(0.5);
                doc.line(signatureLineXStart, signatureLineY, signatureLineXEnd, signatureLineY);
            }
        },
        didDrawPage: (hookData) => {
            currentY = hookData.cursor?.y ?? currentY;
            // Add page numbers if needed
            const pageNum = doc.internal.getNumberOfPages();
            doc.setFontSize(8);
            doc.text(`Página ${pageNum}`, pageWidth - rightMargin, pageHeight - 10, { align: 'right' });
        },
    });

    // --- Save the combined PDF ---
    const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
    const filename = `Listado_Pago_Nominas_${timestamp}.pdf`;
    doc.save(filename);
}

// Helper to parse HH:MM to minutes (same as in page.tsx, consider moving to utils)
const parseTimeToMinutes = (timeStr: string): number => {
    if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
};
    
