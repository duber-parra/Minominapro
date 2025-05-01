// src/lib/pdf-exporter.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import type { QuincenalCalculationSummary, AdjustmentItem, SavedPayrollData } from '@/types'; // Added AdjustmentItem and SavedPayrollData
import { labelMap, displayOrder, formatCurrency, formatHours } from '@/components/results-display'; // Import helpers

// Extend jsPDF interface for autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface SinglePayrollDataForPDF extends SavedPayrollData { // Use SavedPayrollData as it contains all needed info
    // Redundant fields already in SavedPayrollData:
    // employeeId: string;
    // periodStart: Date;
    // periodEnd: Date;
    // summary: QuincenalCalculationSummary;
    // otrosIngresosLista: AdjustmentItem[];
    // otrasDeduccionesLista: AdjustmentItem[];
}

// Helper function to draw a single payroll report page
function drawPayrollPage(doc: jsPDF, data: SinglePayrollDataForPDF): number {
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

    // --- Summary Table (Devengado Bruto) ---
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumen Devengado (Base + Extras/Recargos)', 14, currentY);
    currentY += 6;

    const head = [['Categoría', 'Horas', 'Pago (Recargo/Extra)']];
    const body = displayOrder
        .map(key => {
            const horasCategoria = data.summary.totalHorasDetalladas[key];
            const pagoCategoria = data.summary.totalPagoDetallado[key];

             // Conditionally display rows based on whether they have values
             if (key === 'Ordinaria_Diurna_Base' && horasCategoria <= 0) return null;
             if (key !== 'Ordinaria_Diurna_Base' && horasCategoria <= 0 && pagoCategoria <= 0) return null;


            const label = key === 'Ordinaria_Diurna_Base' ? labelMap[key] : (labelMap[key] || key);
            const formattedHours = formatHours(horasCategoria);
            const formattedPayment = key === 'Ordinaria_Diurna_Base' ? '-' : formatCurrency(pagoCategoria);

            return [label, formattedHours, formattedPayment];
        })
        .filter(row => row !== null) as (string | number)[][]; // Filter out null rows and assert type

    // Add Totals for Devengado Bruto section
     body.push(
         ['-', '-', '-'], // Separator line visually in the table
         [
              { content: 'Total Horas Trabajadas en Quincena:', styles: { fontStyle: 'bold' } },
              { content: formatHours(data.summary.totalDuracionTrabajadaHorasQuincena), styles: { halign: 'right', fontStyle: 'bold' } },
              ''
         ],
         [
             { content: 'Total Recargos y Horas Extras Quincenales:', styles: { fontStyle: 'bold' } },
             '',
             { content: formatCurrency(data.summary.totalPagoRecargosExtrasQuincena), styles: { halign: 'right', fontStyle: 'bold', textColor: [0, 128, 128] } } // Teal color
         ],
          [
             { content: '+ Salario Base Quincenal:', styles: { fontStyle: 'normal', textColor: [100, 100, 100] } }, // Gray color
             '',
             { content: formatCurrency(data.summary.salarioBaseQuincenal), styles: { halign: 'right', fontStyle: 'normal', textColor: [100, 100, 100] } }
         ],
         ['-', '-', '-'], // Separator line visually in the table
         [
             { content: 'Total Devengado Bruto Estimado:', styles: { fontStyle: 'bold', fontSize: 11 } },
             '',
             { content: formatCurrency(data.summary.pagoTotalConSalarioQuincena), styles: { halign: 'right', fontStyle: 'bold', fontSize: 11 } } // Normal color for this total
         ]
    );


    autoTable(doc, {
        head: head,
        body: body,
        startY: currentY,
        theme: 'grid',
        headStyles: { fillColor: [210, 221, 234], textColor: [40, 54, 123] }, // Light blue header, dark blue text
        columnStyles: {
            0: { cellWidth: 'auto' },
            1: { halign: 'right' },
            2: { halign: 'right' },
        },
        didDrawPage: (hookData) => { currentY = hookData.cursor?.y ?? currentY; },
        willDrawCell: (hookData) => { /* Separator logic - keep as is */ },
        didParseCell: (hookData) => { /* Parsing logic - keep as is */ }
    });

    currentY += 5; // Add some space

    // --- Deducciones Legales ---
    const devengadoBruto = data.summary.pagoTotalConSalarioQuincena;
    // Placeholder for IBC - Needs proper calculation based on Colombian law (excluding Aux Transporte if applicable)
    const ibcEstimadoQuincenal = devengadoBruto; // Simple estimation, NEEDS REFINEMENT
    const deduccionSaludQuincenal = ibcEstimadoQuincenal * 0.04;
    const deduccionPensionQuincenal = ibcEstimadoQuincenal * 0.04;
    const totalDeduccionesLegales = deduccionSaludQuincenal + deduccionPensionQuincenal;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Deducciones Legales (Estimadas)', 14, currentY);
    currentY += 6;

    autoTable(doc, {
        body: [
            ['Deducción Salud (4% s/IBC)', formatCurrency(deduccionSaludQuincenal)],
            ['Deducción Pensión (4% s/IBC)', formatCurrency(deduccionPensionQuincenal)],
            [{ content: 'Total Deducciones Legales:', styles: { fontStyle: 'bold' } }, { content: formatCurrency(totalDeduccionesLegales), styles: { fontStyle: 'bold' } }]
        ],
        startY: currentY,
        theme: 'plain',
        columnStyles: { 1: { halign: 'right' } },
        didDrawPage: (hookData) => { currentY = hookData.cursor?.y ?? currentY; },
    });

    currentY += 5; // Add space

    // --- Subtotal Neto Parcial ---
    const subtotalNetoParcial = devengadoBruto - totalDeduccionesLegales;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Subtotal Neto Parcial:', 14, currentY);
    doc.text(formatCurrency(subtotalNetoParcial), pageWidth - 14, currentY, { align: 'right' });
    currentY += 10;


    // --- Otros Ingresos ---
    const totalOtrosIngresos = (data.otrosIngresosLista || []).reduce((sum, item) => sum + item.monto, 0);
    if ((data.otrosIngresosLista || []).length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Otros Ingresos / Ajustes a Favor', 14, currentY);
        currentY += 6;
        autoTable(doc, {
            body: (data.otrosIngresosLista || []).map(item => [item.descripcion || 'Ingreso', `+ ${formatCurrency(item.monto)}`]),
            startY: currentY,
            theme: 'plain',
            columnStyles: { 1: { halign: 'right', textColor: [0, 100, 0] } }, // Green color for income
            didDrawPage: (hookData) => { currentY = hookData.cursor?.y ?? currentY; },
        });
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Total Otros Ingresos:', 14, currentY + 5);
        doc.text(formatCurrency(totalOtrosIngresos), pageWidth - 14, currentY + 5, { align: 'right' });
        currentY += 10;
    }


    // --- Otras Deducciones ---
    const totalOtrasDeducciones = (data.otrasDeduccionesLista || []).reduce((sum, item) => sum + item.monto, 0);
     if ((data.otrasDeduccionesLista || []).length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Otras Deducciones / Descuentos', 14, currentY);
        currentY += 6;
        autoTable(doc, {
            body: (data.otrasDeduccionesLista || []).map(item => [item.descripcion || 'Deducción', `- ${formatCurrency(item.monto)}`]),
            startY: currentY,
            theme: 'plain',
            columnStyles: { 1: { halign: 'right', textColor: [255, 0, 0] } }, // Red color for deductions
            didDrawPage: (hookData) => { currentY = hookData.cursor?.y ?? currentY; },
        });
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Total Otras Deducciones:', 14, currentY + 5);
        doc.text(formatCurrency(totalOtrasDeducciones), pageWidth - 14, currentY + 5, { align: 'right' });
        currentY += 10;
    }

    // --- Neto a Pagar Final ---
     const netoAPagar = subtotalNetoParcial + totalOtrosIngresos - totalOtrasDeducciones;
     doc.setFontSize(14);
     doc.setFont('helvetica', 'bold');
     doc.text('Neto a Pagar Estimado Quincenal:', 14, currentY);
     doc.text(formatCurrency(netoAPagar), pageWidth - 14, currentY, { align: 'right', textColor: [40, 54, 123] }); // Dark Blue
     currentY += 15;

    // --- Signature Area ---
    let signatureY = currentY;
    if (signatureY > pageHeight - 35) { signatureY = pageHeight - 35; }
    const signatureXMargin = 30;
    const signatureWidth = (pageWidth - signatureXMargin * 2) / 2 - 10;
    doc.setLineWidth(0.3);
    doc.line(signatureXMargin, signatureY, signatureXMargin + signatureWidth, signatureY);
    doc.line(pageWidth - signatureXMargin - signatureWidth, signatureY, pageWidth - signatureXMargin, signatureY);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Firma Empleador', signatureXMargin + signatureWidth / 2, signatureY + 5, { align: 'center' });
    doc.text('Firma Colaborador', pageWidth - signatureXMargin - signatureWidth / 2, signatureY + 5, { align: 'center' });

    // --- Footer Note ---
    doc.setFontSize(8);
    doc.setTextColor(150);
    const footerText = `Nota: Cálculo bruto estimado para ${data.summary.diasCalculados} días. IBC y deducciones legales son aproximadas. Incluye ajustes manuales.`;
    doc.text(footerText, 14, pageHeight - 10);

    return currentY; // Return the Y position after drawing this page's content
}

// --- Single Payroll Export ---
export function exportPayrollToPDF(
    summary: QuincenalCalculationSummary,
    employeeId: string,
    periodStart: Date,
    periodEnd: Date,
    otrosIngresosLista: AdjustmentItem[], // Add income list parameter
    otrasDeduccionesLista: AdjustmentItem[] // Add deduction list parameter
): void {
    const doc = new jsPDF();
    // Construct the full data object needed by drawPayrollPage
    const payrollData: SinglePayrollDataForPDF = {
        key: `pdf_${employeeId}_${format(periodStart, 'yyyyMMdd')}`, // Dummy key for PDF generation context
        employeeId,
        periodStart,
        periodEnd,
        summary,
        otrosIngresosLista,
        otrasDeduccionesLista,
        createdAt: new Date() // Dummy creation date
    };

    drawPayrollPage(doc, payrollData);

    // --- Save the PDF ---
    const filename = `Nomina_${employeeId}_${format(periodStart, 'yyyyMMdd')}-${format(periodEnd, 'yyyyMMdd')}.pdf`;
    doc.save(filename);
}

// --- Bulk Payroll Export ---
// exportAllPayrollsToPDF now directly uses SavedPayrollData which includes adjustments
export function exportAllPayrollsToPDF(allPayrollData: SavedPayrollData[]): void {
    if (!allPayrollData || allPayrollData.length === 0) {
        console.warn("No payroll data provided for bulk export.");
        return;
    }

    const doc = new jsPDF();
    let isFirstPage = true;

    allPayrollData.forEach((payrollData) => { // payrollData is already SavedPayrollData
        if (!isFirstPage) {
            doc.addPage(); // Add a new page for each subsequent payroll report
        }
        // Pass the complete SavedPayrollData object
        drawPayrollPage(doc, payrollData);
        isFirstPage = false;
    });

    // --- Save the combined PDF ---
    const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
    const filename = `Reporte_Nominas_${timestamp}.pdf`;
    doc.save(filename);
}
