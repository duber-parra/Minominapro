// src/lib/pdf-exporter.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import type { QuincenalCalculationSummary } from '@/types';
import { labelMap, displayOrder, formatCurrency, formatHours } from '@/components/results-display'; // Import helpers

// Extend jsPDF interface for autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface PayrollData {
    employeeId: string;
    periodStart: Date;
    periodEnd: Date;
    summary: QuincenalCalculationSummary;
}

// Helper function to draw a single payroll report page
function drawPayrollPage(doc: jsPDF, data: PayrollData): number {
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

    // --- Summary Table ---
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumen Devengado', 14, currentY);
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

     // Add Totals Rows to the body
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
            { content: 'Pago Bruto Estimado Quincenal:', styles: { fontStyle: 'bold', fontSize: 11 } },
            '',
            { content: formatCurrency(data.summary.pagoTotalConSalarioQuincena), styles: { halign: 'right', fontStyle: 'bold', fontSize: 11, textColor: [40, 54, 123] } } // Dark Blue color
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
        didDrawPage: (hookData) => {
            // Update currentY after table is drawn for this specific page
            // Note: This might need adjustment if autoTable splits across pages itself
            currentY = hookData.cursor?.y ?? currentY;
        },
         // Style for separator rows
        willDrawCell: (hookData) => {
            if (hookData.row.raw[0] === '-' && hookData.row.raw[1] === '-' && hookData.row.raw[2] === '-') {
                 // Make the separator row thinner and gray
                 doc.setDrawColor(200, 200, 200); // Light gray line color
                 doc.setLineWidth(0.1);
                 // Redraw the bottom line of the cell
                 doc.line(hookData.cell.x, hookData.cell.y + hookData.cell.height, hookData.cell.x + hookData.cell.width, hookData.cell.y + hookData.cell.height);
                 // Prevent default cell drawing for this row
                 return false;
            }
             // Reset line width and color for other cells
             doc.setLineWidth(0.2);
             doc.setDrawColor(0);
        },
         // Ensure text aligns correctly for styled rows (bold, colored)
         didParseCell: (hookData) => {
              if (typeof hookData.cell.raw === 'object' && hookData.cell.raw !== null && 'content' in hookData.cell.raw) {
                   hookData.cell.text = String(hookData.cell.raw.content); // Ensure text is set from content object
                   // Apply styles defined in the content object
                   Object.assign(hookData.cell.styles, hookData.cell.raw.styles);
              }
         }
    });

    // Move Y position down after the table
    // currentY is updated in didDrawPage hook

    // --- Signature Area ---
    // Ensure signature area doesn't overlap with the table or footer
    let signatureY = currentY + 20; // Add some space after the table
    if (signatureY > pageHeight - 35) { // If too close to bottom, place it fixed distance from bottom
        signatureY = pageHeight - 35;
    }

    const signatureXMargin = 30;
    const signatureWidth = (pageWidth - signatureXMargin * 2) / 2 - 10; // Width for each signature line

    doc.setLineWidth(0.3);
    doc.line(signatureXMargin, signatureY, signatureXMargin + signatureWidth, signatureY); // Employer line
    doc.line(pageWidth - signatureXMargin - signatureWidth, signatureY, pageWidth - signatureXMargin, signatureY); // Employee line

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Firma Empleador', signatureXMargin + signatureWidth / 2, signatureY + 5, { align: 'center' });
    doc.text('Firma Colaborador', pageWidth - signatureXMargin - signatureWidth / 2, signatureY + 5, { align: 'center' });

    // --- Footer Note ---
    doc.setFontSize(8);
    doc.setTextColor(150); // Gray color
    const footerText = `Nota: Este es un cálculo bruto estimado para ${data.summary.diasCalculados} días. El pago final incluirá deducciones legales, otros ingresos/deducciones y políticas específicas.`;
    doc.text(footerText, 14, pageHeight - 10);

    return currentY; // Return the Y position after drawing this page's content
}

// --- Single Payroll Export ---
export function exportPayrollToPDF(
    summary: QuincenalCalculationSummary,
    employeeId: string,
    periodStart: Date,
    periodEnd: Date
): void {
    const doc = new jsPDF();
    const payrollData: PayrollData = { employeeId, periodStart, periodEnd, summary };

    drawPayrollPage(doc, payrollData);

    // --- Save the PDF ---
    const filename = `Nomina_${employeeId}_${format(periodStart, 'yyyyMMdd')}-${format(periodEnd, 'yyyyMMdd')}.pdf`;
    doc.save(filename);
}

// --- Bulk Payroll Export ---
export function exportAllPayrollsToPDF(allPayrollData: PayrollData[]): void {
    if (!allPayrollData || allPayrollData.length === 0) {
        console.warn("No payroll data provided for bulk export.");
        return;
    }

    const doc = new jsPDF();
    let isFirstPage = true;

    allPayrollData.forEach((payrollData, index) => {
        if (!isFirstPage) {
            doc.addPage(); // Add a new page for each subsequent payroll report
        }
        drawPayrollPage(doc, payrollData);
        isFirstPage = false;
    });

    // --- Save the combined PDF ---
    const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
    const filename = `Reporte_Nominas_${timestamp}.pdf`;
    doc.save(filename);
}
