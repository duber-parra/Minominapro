// src/lib/pdf-exporter.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { QuincenalCalculationSummary } from '@/types';
import { labelMap, displayOrder, formatCurrency, formatHours } from '@/components/results-display'; // Import helpers

// Extend jsPDF interface for autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export function exportPayrollToPDF(
    summary: QuincenalCalculationSummary,
    employeeId: string,
    periodStart: Date,
    periodEnd: Date
): void {
    const doc = new jsPDF();
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
    doc.text(`Colaborador: ${employeeId}`, 14, currentY);
    currentY += 6;
    doc.text(`Período: ${format(periodStart, 'dd/MM/yyyy', { locale: es })} - ${format(periodEnd, 'dd/MM/yyyy', { locale: es })}`, 14, currentY);
    currentY += 10;

    // --- Summary Table ---
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumen Devengado', 14, currentY);
    currentY += 6;

    const head = [['Categoría', 'Horas', 'Pago (Recargo/Extra)']];
    const body = displayOrder
        .map(key => {
            const horasCategoria = summary.totalHorasDetalladas[key];
            const pagoCategoria = summary.totalPagoDetallado[key];

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
             { content: formatHours(summary.totalDuracionTrabajadaHorasQuincena), styles: { halign: 'right', fontStyle: 'bold' } },
             ''
        ],
        [
            { content: 'Total Recargos y Horas Extras Quincenales:', styles: { fontStyle: 'bold' } },
            '',
            { content: formatCurrency(summary.totalPagoRecargosExtrasQuincena), styles: { halign: 'right', fontStyle: 'bold', textColor: [0, 128, 128] } } // Teal color
        ],
         [
            { content: '+ Salario Base Quincenal:', styles: { fontStyle: 'normal', textColor: [100, 100, 100] } }, // Gray color
            '',
            { content: formatCurrency(summary.salarioBaseQuincenal), styles: { halign: 'right', fontStyle: 'normal', textColor: [100, 100, 100] } }
        ],
         ['-', '-', '-'], // Separator line visually in the table
         [
            { content: 'Pago Bruto Estimado Quincenal:', styles: { fontStyle: 'bold', fontSize: 11 } },
            '',
            { content: formatCurrency(summary.pagoTotalConSalarioQuincena), styles: { halign: 'right', fontStyle: 'bold', fontSize: 11, textColor: [40, 54, 123] } } // Dark Blue color
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
        didDrawPage: (data) => {
            currentY = data.cursor?.y ?? currentY; // Update currentY after table is drawn
        },
         // Style for separator rows
        willDrawCell: (data) => {
            if (data.row.raw[0] === '-' && data.row.raw[1] === '-' && data.row.raw[2] === '-') {
                 // Make the separator row thinner and gray
                 doc.setDrawColor(200, 200, 200); // Light gray line color
                 doc.setLineWidth(0.1);
                 // Redraw the bottom line of the cell
                 doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
                 // Prevent default cell drawing for this row
                 return false;
            }
             // Reset line width and color for other cells
             doc.setLineWidth(0.2);
             doc.setDrawColor(0);
        },
         // Ensure text aligns correctly for styled rows (bold, colored)
         didParseCell: (data) => {
              if (typeof data.cell.raw === 'object' && data.cell.raw !== null && 'content' in data.cell.raw) {
                   data.cell.text = String(data.cell.raw.content); // Ensure text is set from content object
                   // Apply styles defined in the content object
                   Object.assign(data.cell.styles, data.cell.raw.styles);
              }
         }
    });

    // Move Y position down after the table
    // autoTable updates the cursor position in its data object
    // currentY is updated in didDrawPage hook


    // --- Signature Area ---
    const signatureY = pageHeight - 35; // Position signatures near bottom
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
    const footerText = `Nota: Este es un cálculo bruto estimado para ${summary.diasCalculados} días. El pago final incluirá deducciones legales, otros ingresos/deducciones y políticas específicas.`;
    doc.text(footerText, 14, pageHeight - 10);


    // --- Save the PDF ---
    const filename = `Nomina_${employeeId}_${format(periodStart, 'yyyyMMdd')}-${format(periodEnd, 'yyyyMMdd')}.pdf`;
    doc.save(filename);
}
