// src/lib/pdf-exporter.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import type { QuincenalCalculationSummary, AdjustmentItem, SavedPayrollData, Employee } from '@/types'; // Added Employee type
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
    employeeName?: string; // Optional employee name
    periodStart: Date;
    periodEnd: Date;
    summary: QuincenalCalculationSummary;
    otrosIngresosLista: AdjustmentItem[];
    otrasDeduccionesLista: AdjustmentItem[];
    auxTransporteAplicado: number; // Amount of transport allowance applied
}

// Helper to add the watermark header and company logo/name
function addHeaderAndWatermark(doc: jsPDF, initialY: number = 10): number {
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    const watermarkText = "Desarrollado por Duber Parra, Dpana company © 2025 Calculadora de Turnos y Recargos";
    const leftMargin = 14;
    let currentYPos = initialY;

    // --- Company Logo and Name (if available) ---
    if (typeof window !== 'undefined') {
        const companyLogoDataUrl = localStorage.getItem('companyLogo');
        const companyName = localStorage.getItem('companyName');

        if (companyLogoDataUrl) {
            try {
                // Assuming logo is square, adjust dimensions as needed
                const logoSize = 15; // Adjust size as needed
                doc.addImage(companyLogoDataUrl, 'PNG', leftMargin, currentYPos, logoSize, logoSize);
                if (companyName) {
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'bold');
                    doc.text(companyName, leftMargin + logoSize + 3, currentYPos + logoSize / 2 + 3);
                }
                currentYPos += logoSize + 5; // Space after logo/name
            } catch (e) {
                console.error("Error adding company logo to PDF:", e);
                // Proceed without logo if it fails
            }
        } else if (companyName) {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text(companyName, leftMargin, currentYPos + 5);
            currentYPos += 10; // Space after name
        }
    }


    // --- Watermark ---
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150);
    doc.text(watermarkText, pageWidth / 2, currentYPos, { align: 'center' });
    doc.setTextColor(0);
    doc.setFont('helvetica', 'normal');
    return currentYPos + 8; // Return the Y position below the watermark
}

// Helper function to draw a single payroll report page
function drawPayrollPage(doc: jsPDF, data: PayrollPageData): number { // Use the new combined interface
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    let currentY = 10; // Start position for content
    const leftMargin = 14;
    const rightMargin = 14;

    // --- Header with Watermark, Logo, Name ---
    currentY = addHeaderAndWatermark(doc, 10);

    // --- Main Header ---
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Comprobante de Nómina Quincenal', pageWidth / 2, currentY, { align: 'center' });
    currentY += 10;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    // Use employee name if available, otherwise fallback to ID
    const employeeIdentifier = data.employeeName || data.employeeId;
    doc.text(`Colaborador: ${employeeIdentifier}`, leftMargin, currentY);
    currentY += 6;
    doc.text(`Período: ${format(data.periodStart, 'dd/MM/yyyy', { locale: es })} - ${format(data.periodEnd, 'dd/MM/yyyy', { locale: es })}`, leftMargin, currentY);
    currentY += 10;

    // --- Devengado Table (Base + Extras/Recargos) ---
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumen Horas y Recargos/Extras', leftMargin, currentY);
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
        didDrawPage: (hookData) => {
            currentY = hookData.cursor?.y ?? currentY;
             // Add watermark to subsequent pages
             if (hookData.pageNumber > 1) {
                addHeaderAndWatermark(doc, 10);
             }
        },
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

    currentY = doc.lastAutoTable.finalY + 5; // Use finalY from autotable

    // --- Otros Devengados Section ---
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Otros Devengados', leftMargin, currentY);
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
        didDrawPage: (hookData) => {
            currentY = hookData.cursor?.y ?? currentY;
             // Add watermark to subsequent pages
             if (hookData.pageNumber > 1) {
                 addHeaderAndWatermark(doc, 10);
             }
         },
        didParseCell: (hookData) => {
            // Style separator rows
             if (hookData.cell.raw === '-') {
                 hookData.cell.styles.fontStyle = 'normal'; // Ensure separator is not bold
                 hookData.cell.styles.minCellHeight = 1;
                 hookData.cell.styles.cellPadding = 0;
                 // Draw a line instead of text for separator
                 if (hookData.column.index === 0 && hookData.cell.width) { // Check width exists
                    const lineY = hookData.cell.y + hookData.cell.height / 2;
                    doc.setDrawColor(200, 200, 200); // Light gray line
                    doc.line(hookData.cell.x, lineY, hookData.cell.x + hookData.cell.width, lineY);
                 }
                 hookData.cell.text = ''; // Clear text
            }
        }
    });

    currentY = doc.lastAutoTable.finalY + 5; // Use finalY from autotable


    // --- Deducciones Legales ---
    const deduccionSaludQuincenal = ibcEstimado * 0.04;
    const deduccionPensionQuincenal = ibcEstimado * 0.04;
    const totalDeduccionesLegales = deduccionSaludQuincenal + deduccionPensionQuincenal;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Deducciones Legales (Estimadas)', leftMargin, currentY);
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
        didDrawPage: (hookData) => {
            currentY = hookData.cursor?.y ?? currentY;
             // Add watermark to subsequent pages
             if (hookData.pageNumber > 1) {
                 addHeaderAndWatermark(doc, 10);
             }
         },
    });

    currentY = doc.lastAutoTable.finalY + 5; // Use finalY from autotable

    // --- Subtotal Neto Parcial ---
    const subtotalNetoParcial = totalDevengadoBruto - totalDeduccionesLegales;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Subtotal (Dev. Bruto - Ded. Ley):', leftMargin, currentY);
    doc.text(formatCurrency(subtotalNetoParcial), pageWidth - rightMargin, currentY, { align: 'right' });
    currentY += 10;


    // --- Otras Deducciones (Manuales) ---
    const totalOtrasDeduccionesManuales = (data.otrasDeduccionesLista || []).reduce((sum, item) => sum + item.monto, 0);
     if ((data.otrasDeduccionesLista || []).length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Otras Deducciones / Descuentos', leftMargin, currentY);
        currentY += 6;
        autoTable(doc, {
            body: (data.otrasDeduccionesLista || []).map(item => [`(-) ${item.descripcion || 'Deducción'}`, formatCurrency(item.monto)]),
            startY: currentY,
            theme: 'plain',
            columnStyles: { 1: { halign: 'right', textColor: [200, 0, 0] } }, // Reddish color
            didDrawPage: (hookData) => {
                currentY = hookData.cursor?.y ?? currentY;
                 // Add watermark to subsequent pages
                 if (hookData.pageNumber > 1) {
                     addHeaderAndWatermark(doc, 10);
                 }
            },
        });
        currentY = doc.lastAutoTable.finalY; // Use finalY from autotable
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Total Otras Deducciones:', leftMargin, currentY + 5);
        doc.text(formatCurrency(totalOtrasDeduccionesManuales), pageWidth - rightMargin, currentY + 5, { align: 'right' });
        currentY += 10;
    }

    // --- Neto a Pagar Final ---
     const netoAPagar = subtotalNetoParcial - totalOtrasDeduccionesManuales;
     doc.setFontSize(14);
     doc.setFont('helvetica', 'bold');
     doc.text('Neto a Pagar Estimado Quincenal:', leftMargin, currentY);
     doc.text(formatCurrency(netoAPagar), pageWidth - rightMargin, currentY, { align: 'right', textColor: [76, 67, 223] }); // Use primary color #4C43DF
     currentY += 15;

    // --- Signature Area ---
    let signatureY = currentY;
    // Check if signature area fits on the current page, add new page if necessary
    if (signatureY > pageHeight - 35) {
        doc.addPage();
        addHeaderAndWatermark(doc, 10); // Add watermark to new page
        signatureY = 25; // Reset Y for new page, below watermark
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
        addHeaderAndWatermark(doc, 10); // Add watermark to new page
        currentY = pageHeight - 10; // Position at bottom of new page
     } else {
         currentY = pageHeight - 10; // Position at bottom of current page
     }
    doc.setFontSize(8);
    doc.setTextColor(150);
    const footerText = `Nota: Cálculo bruto estimado para ${data.summary.diasCalculados} días. IBC (*sin aux. transporte) y deducciones legales son aproximadas. Incluye ajustes manuales.`;
    doc.text(footerText, leftMargin, currentY);

    return currentY; // Return the Y position after drawing this page's content
}

// --- Single Payroll Export ---
export function exportPayrollToPDF(
    summary: QuincenalCalculationSummary,
    employeeId: string,
    employeeName: string | undefined, // Add employeeName parameter
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
        employeeName, // Pass the name
        periodStart,
        periodEnd,
        summary,
        otrosIngresosLista,
        otrasDeduccionesLista,
        auxTransporteAplicado
    };

    drawPayrollPage(doc, payrollData);

    // --- Save the PDF ---
    const filename = `Nomina_${employeeName || employeeId}_${format(periodStart, 'yyyyMMdd')}-${format(periodEnd, 'yyyyMMdd')}.pdf`;
    doc.save(filename);
}

// Helper function to calculate final net pay and total deductions for display/export
const calculateNetoYTotalDeducciones = (payroll: SavedPayrollData): { neto: number; totalDeducciones: number } => {
    const baseMasExtras = payroll.summary.pagoTotalConSalarioQuincena;
    const auxTransporteValorConfig = 100000; // Assuming this value, ideally get from config
    const auxTransporteAplicado = payroll.incluyeAuxTransporte ? auxTransporteValorConfig : 0;
    const totalOtrosIngresos = (payroll.otrosIngresosLista || []).reduce((sum, item) => sum + item.monto, 0);
    const totalOtrasDeduccionesManuales = (payroll.otrasDeduccionesLista || []).reduce((sum, item) => sum + item.monto, 0);

    // Calculate Total Devengado Bruto
    const totalDevengadoBruto = baseMasExtras + auxTransporteAplicado + totalOtrosIngresos;

    // Estimate legal deductions (IBC excludes transport allowance)
    const ibcEstimadoQuincenal = baseMasExtras + totalOtrosIngresos;
    const deduccionSaludQuincenal = ibcEstimadoQuincenal * 0.04;
    const deduccionPensionQuincenal = ibcEstimadoQuincenal * 0.04;
    const totalDeduccionesLegales = deduccionSaludQuincenal + deduccionPensionQuincenal;

    // Calculate total deductions (Legal + Manual)
    const totalDeducciones = totalDeduccionesLegales + totalOtrasDeduccionesManuales;

    // Calculate Subtotal Neto Parcial
    const subtotalNetoParcial = totalDevengadoBruto - totalDeduccionesLegales;

    // Calculate final net pay
    const neto = subtotalNetoParcial - totalOtrasDeduccionesManuales;

    return { neto, totalDeducciones };
};


// --- Bulk Payroll Export (List Format) ---
export function exportAllPayrollsToPDF(
    allPayrollData: SavedPayrollData[],
    employees: Employee[] // Pass the full employee list
): void {
    if (!allPayrollData || allPayrollData.length === 0) {
        console.warn("No payroll data provided for bulk export.");
        return;
    }

    const doc = new jsPDF();
    let currentY = 10; // Start position
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const leftMargin = 14;
    const rightMargin = 14;
    const signatureColumnWidth = 35; // Reduced signature column width
    const firmaHeight = 15; // Height reserved for signature line/space

    // --- Header with Watermark, Logo, Name ---
    currentY = addHeaderAndWatermark(doc, 10);

    // --- Main Header ---
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Lista de Pago de Nómina', pageWidth / 2, currentY, { align: 'center' });
    currentY += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    // Add Company Name if available
    if (typeof window !== 'undefined') {
        const companyName = localStorage.getItem('companyName');
        if (companyName) {
            doc.text(companyName, pageWidth / 2, currentY, { align: 'center' });
            currentY += 6;
        }
    }
    doc.text(`Fecha: ${format(new Date(), 'dd/MM/yyyy')}`, pageWidth / 2, currentY, { align: 'center' });
    currentY += 15;

    // --- Table Setup ---
    const head = [['Empleado', 'Periodo', 'T. Horas', 'Base', 'Recargos', 'Ded.', 'Total', 'Firma']]; // Added T. Horas, Ded.

    let totalBase = 0;
    let totalRecargos = 0;
    let totalDeduccionesGlobal = 0; // Total deductions
    let totalGeneral = 0; // Total net pay

    const employeeMap = new Map(employees.map(emp => [emp.id, emp.name])); // Create a map for quick name lookup

    const body = allPayrollData.map(payroll => {
        const { neto: netoFinal, totalDeducciones } = calculateNetoYTotalDeducciones(payroll); // Use helper
        // Get employee name from the map, fallback to ID if not found
        const employeeName = employeeMap.get(payroll.employeeId) || payroll.employeeId; // Use Name

        const periodoStr = `${format(payroll.periodStart, 'd')} - ${format(payroll.periodEnd, 'd MMM', { locale: es })}`; // Shortened period

        const base = payroll.summary.salarioBaseQuincenal;
        // Calculate 'Recargos' as extras + other income + transport
        const auxTransporteAplicado = payroll.incluyeAuxTransporte ? 100000 : 0;
        const totalOtrosIngresos = (payroll.otrosIngresosLista || []).reduce((s, i) => s + i.monto, 0);
        const recargos = payroll.summary.totalPagoRecargosExtrasQuincena + auxTransporteAplicado + totalOtrosIngresos; // Include transport and other income here

        const totalHoras = payroll.summary.totalDuracionTrabajadaHorasQuincena;
        const totalRow = netoFinal; // Use calculated Neto Final

        totalBase += base;
        totalRecargos += recargos;
        totalDeduccionesGlobal += totalDeducciones; // Accumulate total deductions
        totalGeneral += totalRow;

        return [
            employeeName, // Display Name
            periodoStr,
            formatHours(totalHoras), // Format total hours
            formatCurrency(base),
            formatCurrency(recargos),
            formatCurrency(totalDeducciones), // Display total deductions
            formatCurrency(totalRow),
            '', // Empty cell for signature space
        ];
    });

    autoTable(doc, {
        head: head,
        body: body,
        startY: currentY,
        theme: 'plain', // Use plain theme for minimal lines like the image
        styles: { fontSize: 8, cellPadding: 2 }, // Reduced font size
        headStyles: {
            fontStyle: 'bold',
            halign: 'left',
            fillColor: false, // No background fill for header
            textColor: [0, 0, 0], // Black text
            lineWidth: 0, // No header lines
        },
        columnStyles: {
            0: { cellWidth: 'auto', halign: 'left' }, // Empleado
            1: { cellWidth: 'auto', halign: 'left' }, // Periodo
            2: { halign: 'right' }, // T. Horas
            3: { halign: 'right' }, // Base
            4: { halign: 'right' }, // Recargos
            5: { halign: 'right' }, // Ded.
            6: { halign: 'right', fontStyle: 'bold' }, // Total
            7: { cellWidth: signatureColumnWidth, minCellHeight: firmaHeight }, // Firma
        },
        didDrawCell: (data) => {
            // Add a line in the signature cell for signing
            if (data.column.index === 7 && data.cell.section === 'body') { // Index 7 is Firma now
                const cell = data.cell;
                const signatureLineY = cell.y + cell.height - 4; // Position line near bottom
                const signatureLineXStart = cell.x + 2;
                const signatureLineXEnd = cell.x + cell.width - 2;
                doc.setDrawColor(200, 200, 200); // Light gray line
                doc.setLineWidth(0.5);
                doc.line(signatureLineXStart, signatureLineY, signatureLineXEnd, signatureLineY);
            }
        },
        didDrawPage: (hookData) => {
            currentY = hookData.cursor?.y ?? currentY;
            // Add page numbers and watermark to all pages (including subsequent ones)
            const pageNum = doc.internal.getNumberOfPages();
            addHeaderAndWatermark(doc, 10); // Add watermark near top
            doc.setFontSize(8);
            doc.setTextColor(150); // Keep footer text gray
            doc.text(`Página ${pageNum}`, pageWidth - rightMargin, pageHeight - 10, { align: 'right' });
            doc.setTextColor(0); // Reset text color
        },
        willDrawCell: (data) => {
             // Prevent drawing borders for plain theme
             if (data.cell.section === 'head' || data.cell.section === 'body') {
                 // No border drawing needed for plain theme
             }
         },
         // Add Totals Row using foot option
         foot: [
             [
                 { content: 'Totales:', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold', fontSize: 9 } }, // Span 3 columns
                 { content: formatCurrency(totalBase), styles: { halign: 'right', fontStyle: 'bold', fontSize: 9 } },
                 { content: formatCurrency(totalRecargos), styles: { halign: 'right', fontStyle: 'bold', fontSize: 9 } },
                 { content: formatCurrency(totalDeduccionesGlobal), styles: { halign: 'right', fontStyle: 'bold', fontSize: 9 } }, // Show total deductions
                 { content: formatCurrency(totalGeneral), styles: { halign: 'right', fontStyle: 'bold', fontSize: 9 } },
                 '' // Empty cell for signature column in footer
             ],
         ],
         footStyles: {
             fillColor: false, // No background for footer
             textColor: [0, 0, 0],
             lineWidth: { top: 0.5 }, // Only top border for totals row
             lineColor: [0, 0, 0],
         },
    });

    // --- Save the combined PDF ---
    const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
    const filename = `Lista_Pago_Nominas_${timestamp}.pdf`;
    doc.save(filename);
}


// Helper to parse HH:MM to minutes (same as in page.tsx, consider moving to utils)
const parseTimeToMinutes = (timeStr: string): number => {
    if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
};
