
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
    incluyeDeduccionSalud: boolean; // New flag
    incluyeDeduccionPension: boolean; // New flag
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

             if (key === 'Ordinaria_Diurna_Base' && horasCategoria <= 0) return null;
             if (key !== 'Ordinaria_Diurna_Base' && horasCategoria <= 0 && pagoCategoria <= 0) return null;


            const label = labelMap[key] || key;
            const formattedHours = formatHours(horasCategoria);
            const formattedPayment = key === 'Ordinaria_Diurna_Base' ? '-' : formatCurrency(pagoCategoria);

            return [label, formattedHours, formattedPayment];
        })
        .filter(row => row !== null) as (string | number)[][];

     bodyHours.push(
         ['-', '-', '-'],
         [
              { content: 'Total Horas Trabajadas en Quincena:', styles: { fontStyle: 'bold' } },
              { content: formatHours(data.summary.totalDuracionTrabajadaHorasQuincena), styles: { halign: 'right', fontStyle: 'bold' } },
              ''
         ],
         [
             { content: 'Total Recargos y Horas Extras Quincenales:', styles: { fontStyle: 'bold' } },
             '',
             { content: formatCurrency(data.summary.totalPagoRecargosExtrasQuincena), styles: { halign: 'right', fontStyle: 'bold', textColor: [76, 67, 223] } }
         ]
    );

    autoTable(doc, {
        head: head,
        body: bodyHours,
        startY: currentY,
        theme: 'grid',
        headStyles: { fillColor: [226, 232, 240], textColor: [30, 41, 59] },
        columnStyles: {
            0: { cellWidth: 'auto' },
            1: { halign: 'right' },
            2: { halign: 'right' },
        },
        didDrawPage: (hookData) => {
            currentY = hookData.cursor?.y ?? currentY;
             if (hookData.pageNumber > 1) {
                addHeaderAndWatermark(doc, 10);
             }
        },
        didParseCell: (hookData) => {
             if (hookData.cell.raw === '-') {
                 hookData.cell.styles.fillColor = [230, 230, 230];
                 hookData.cell.styles.minCellHeight = 1;
                 hookData.cell.styles.cellPadding = 0;
                 hookData.cell.text = '';
            }
         }
    });

    currentY = doc.lastAutoTable.finalY + 5;

    // --- Otros Devengados Section ---
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Otros Devengados', leftMargin, currentY);
    currentY += 6;

    const baseMasExtras = data.summary.pagoTotalConSalarioQuincena;
    const totalOtrosIngresosManuales = (data.otrosIngresosLista || []).reduce((sum, item) => sum + item.monto, 0);
    const totalDevengadoBruto = baseMasExtras + data.auxTransporteAplicado + totalOtrosIngresosManuales;
    const ibcEstimado = baseMasExtras + totalOtrosIngresosManuales;

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
         ['-', '-'],
         [{ content: 'Total Devengado Bruto Estimado:', styles: { fontStyle: 'bold' } }, { content: formatCurrency(totalDevengadoBruto), styles: { fontStyle: 'bold' } }]
    );


    autoTable(doc, {
        body: devengadoBody,
        startY: currentY,
        theme: 'plain',
        columnStyles: { 1: { halign: 'right' } },
        didDrawPage: (hookData) => {
            currentY = hookData.cursor?.y ?? currentY;
             if (hookData.pageNumber > 1) {
                 addHeaderAndWatermark(doc, 10);
             }
         },
        didParseCell: (hookData) => {
             if (hookData.cell.raw === '-') {
                 hookData.cell.styles.fontStyle = 'normal';
                 hookData.cell.styles.minCellHeight = 1;
                 hookData.cell.styles.cellPadding = 0;
                 if (hookData.column.index === 0 && hookData.cell.width) {
                    const lineY = hookData.cell.y + hookData.cell.height / 2;
                    doc.setDrawColor(200, 200, 200);
                    doc.line(hookData.cell.x, lineY, hookData.cell.x + hookData.cell.width, lineY);
                 }
                 hookData.cell.text = '';
            }
        }
    });

    currentY = doc.lastAutoTable.finalY + 5;


    // --- Deducciones Legales ---
    const deduccionSaludQuincenal = data.incluyeDeduccionSalud ? ibcEstimado * 0.04 : 0;
    const deduccionPensionQuincenal = data.incluyeDeduccionPension ? ibcEstimado * 0.04 : 0;
    const totalDeduccionesLegales = deduccionSaludQuincenal + deduccionPensionQuincenal;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Deducciones Legales (Estimadas)', leftMargin, currentY);
    currentY += 6;

    const deduccionesLegalesBody = [];
    if (data.incluyeDeduccionSalud) {
        deduccionesLegalesBody.push(
            [`Deducción Salud (4% s/IBC: ${formatCurrency(ibcEstimado)})`, formatCurrency(deduccionSaludQuincenal)]
        );
    }
    if (data.incluyeDeduccionPension) {
        deduccionesLegalesBody.push(
            [`Deducción Pensión (4% s/IBC: ${formatCurrency(ibcEstimado)})`, formatCurrency(deduccionPensionQuincenal)]
        );
    }
    if (deduccionesLegalesBody.length > 0) {
        deduccionesLegalesBody.push(
            [{ content: 'Total Deducciones Legales:', styles: { fontStyle: 'bold' } }, { content: formatCurrency(totalDeduccionesLegales), styles: { fontStyle: 'bold' } }]
        );
    } else {
         deduccionesLegalesBody.push(
             [{ content: 'Deducciones legales de salud y pensión desactivadas.', colSpan: 2, styles: { fontStyle: 'italic', textColor: [100, 100, 100] } }]
         );
    }


    autoTable(doc, {
        body: deduccionesLegalesBody,
        startY: currentY,
        theme: 'plain',
        columnStyles: { 1: { halign: 'right' } },
        didDrawPage: (hookData) => {
            currentY = hookData.cursor?.y ?? currentY;
             if (hookData.pageNumber > 1) {
                 addHeaderAndWatermark(doc, 10);
             }
         },
    });

    currentY = doc.lastAutoTable.finalY + 5;

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
            columnStyles: { 1: { halign: 'right', textColor: [200, 0, 0] } },
            didDrawPage: (hookData) => {
                currentY = hookData.cursor?.y ?? currentY;
                 if (hookData.pageNumber > 1) {
                     addHeaderAndWatermark(doc, 10);
                 }
            },
        });
        currentY = doc.lastAutoTable.finalY;
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
     doc.text(formatCurrency(netoAPagar), pageWidth - rightMargin, currentY, { align: 'right', textColor: [76, 67, 223] });
     currentY += 15;

    // --- Signature Area ---
    let signatureY = currentY;
    if (signatureY > pageHeight - 35) {
        doc.addPage();
        addHeaderAndWatermark(doc, 10);
        signatureY = 25;
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
    currentY = signatureY + 15;

    // --- Footer Note ---
     if (currentY > pageHeight - 10) {
        doc.addPage();
        addHeaderAndWatermark(doc, 10);
        currentY = pageHeight - 10;
     } else {
         currentY = pageHeight - 10;
     }
    doc.setFontSize(8);
    doc.setTextColor(150);
    const footerText = `Nota: Cálculo bruto estimado para ${data.summary.diasCalculados} días. IBC (*sin aux. transporte) y deducciones legales son aproximadas. Incluye ajustes manuales.`;
    doc.text(footerText, leftMargin, currentY);

    return currentY;
}

// --- Single Payroll Export ---
export function exportPayrollToPDF(
    summary: QuincenalCalculationSummary,
    employeeId: string,
    employeeName: string | undefined,
    periodStart: Date,
    periodEnd: Date,
    otrosIngresosLista: AdjustmentItem[],
    otrasDeduccionesLista: AdjustmentItem[],
    auxTransporteAplicado: number,
    incluyeDeduccionSalud: boolean, // New parameter
    incluyeDeduccionPension: boolean // New parameter
): void {
    const doc = new jsPDF();
    const payrollData: PayrollPageData = {
        employeeId,
        employeeName,
        periodStart,
        periodEnd,
        summary,
        otrosIngresosLista,
        otrasDeduccionesLista,
        auxTransporteAplicado,
        incluyeDeduccionSalud,
        incluyeDeduccionPension,
    };

    drawPayrollPage(doc, payrollData);

    const filename = `Nomina_${employeeName || employeeId}_${format(periodStart, 'yyyyMMdd')}-${format(periodEnd, 'yyyyMMdd')}.pdf`;
    doc.save(filename);
}

// Helper function to calculate final net pay and total deductions for display/export
const calculateNetoYTotalDeducciones = (payroll: SavedPayrollData): { neto: number; totalDeducciones: number } => {
    const baseMasExtras = payroll.summary.pagoTotalConSalarioQuincena;
    const auxTransporteValorConfig = 100000;
    const auxTransporteAplicado = payroll.incluyeAuxTransporte ? auxTransporteValorConfig : 0;
    const totalOtrosIngresos = (payroll.otrosIngresosLista || []).reduce((sum, item) => sum + item.monto, 0);
    const totalOtrasDeduccionesManuales = (payroll.otrasDeduccionesLista || []).reduce((sum, item) => sum + item.monto, 0);

    const totalDevengadoBruto = baseMasExtras + auxTransporteAplicado + totalOtrosIngresos;

    const ibcEstimadoQuincenal = baseMasExtras + totalOtrosIngresos;
    const deduccionSaludQuincenal = payroll.incluyeDeduccionSalud ? ibcEstimadoQuincenal * 0.04 : 0;
    const deduccionPensionQuincenal = payroll.incluyeDeduccionPension ? ibcEstimadoQuincenal * 0.04 : 0;
    const totalDeduccionesLegales = deduccionSaludQuincenal + deduccionPensionQuincenal;

    const totalDeducciones = totalDeduccionesLegales + totalOtrasDeduccionesManuales;

    const subtotalNetoParcial = totalDevengadoBruto - totalDeduccionesLegales;

    const neto = subtotalNetoParcial - totalOtrasDeduccionesManuales;

    return { neto, totalDeducciones };
};


// --- Bulk Payroll Export (List Format) ---
export function exportAllPayrollsToPDF(
    allPayrollData: SavedPayrollData[],
    employees: Employee[]
): void {
    if (!allPayrollData || allPayrollData.length === 0) {
        console.warn("No payroll data provided for bulk export.");
        return;
    }

    const doc = new jsPDF();
    let currentY = 10;
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const leftMargin = 14;
    const rightMargin = 14;
    const signatureColumnWidth = 35;
    const firmaHeight = 15;

    currentY = addHeaderAndWatermark(doc, 10);

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Lista de Pago de Nómina', pageWidth / 2, currentY, { align: 'center' });
    currentY += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    if (typeof window !== 'undefined') {
        const companyName = localStorage.getItem('companyName');
        if (companyName) {
            doc.text(companyName, pageWidth / 2, currentY, { align: 'center' });
            currentY += 6;
        }
    }
    doc.text(`Fecha: ${format(new Date(), 'dd/MM/yyyy')}`, pageWidth / 2, currentY, { align: 'center' });
    currentY += 15;

    const head = [['Empleado', 'Periodo', 'T. Horas', 'Base', 'Otros Dev.', 'Total Ded.', 'Neto Pagar', 'Firma']]; // Changed column names

    let totalBase = 0;
    let totalOtrosDevengados = 0; // Renamed from totalRecargos
    let totalDeduccionesGlobal = 0;
    let totalGeneralNeto = 0; // Renamed from totalGeneral

    const employeeMap = new Map(employees.map(emp => [emp.id, emp.name]));

    const body = allPayrollData.map(payroll => {
        const { neto: netoFinal, totalDeducciones } = calculateNetoYTotalDeducciones(payroll);
        const employeeName = employeeMap.get(payroll.employeeId) || payroll.employeeId;
        const periodoStr = `${format(payroll.periodStart, 'd')} - ${format(payroll.periodEnd, 'd MMM', { locale: es })}`;
        const base = payroll.summary.salarioBaseQuincenal;

        const auxTransporteAplicado = payroll.incluyeAuxTransporte ? 100000 : 0;
        const totalOtrosIngresosManuales = (payroll.otrosIngresosLista || []).reduce((s, i) => s + i.monto, 0);
        const otrosDevengados = payroll.summary.totalPagoRecargosExtrasQuincena + auxTransporteAplicado + totalOtrosIngresosManuales;

        const totalHoras = payroll.summary.totalDuracionTrabajadaHorasQuincena;

        totalBase += base;
        totalOtrosDevengados += otrosDevengados;
        totalDeduccionesGlobal += totalDeducciones;
        totalGeneralNeto += netoFinal;

        return [
            employeeName,
            periodoStr,
            formatHours(totalHoras),
            formatCurrency(base),
            formatCurrency(otrosDevengados),
            formatCurrency(totalDeducciones),
            formatCurrency(netoFinal), // Use netoFinal for this column
            '',
        ];
    });

    autoTable(doc, {
        head: head,
        body: body,
        startY: currentY,
        theme: 'plain',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: {
            fontStyle: 'bold',
            halign: 'left',
            fillColor: false,
            textColor: [0, 0, 0],
            lineWidth: 0,
        },
        columnStyles: {
            0: { cellWidth: 'auto', halign: 'left' },
            1: { cellWidth: 'auto', halign: 'left' },
            2: { halign: 'right' },
            3: { halign: 'right' },
            4: { halign: 'right' },
            5: { halign: 'right' },
            6: { halign: 'right', fontStyle: 'bold' },
            7: { cellWidth: signatureColumnWidth, minCellHeight: firmaHeight },
        },
        didDrawCell: (data) => {
            if (data.column.index === 7 && data.cell.section === 'body') {
                const cell = data.cell;
                const signatureLineY = cell.y + cell.height - 4;
                const signatureLineXStart = cell.x + 2;
                const signatureLineXEnd = cell.x + cell.width - 2;
                doc.setDrawColor(200, 200, 200);
                doc.setLineWidth(0.5);
                doc.line(signatureLineXStart, signatureLineY, signatureLineXEnd, signatureLineY);
            }
        },
        didDrawPage: (hookData) => {
            currentY = hookData.cursor?.y ?? currentY;
            const pageNum = doc.internal.getNumberOfPages();
            addHeaderAndWatermark(doc, 10);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`Página ${pageNum}`, pageWidth - rightMargin, pageHeight - 10, { align: 'right' });
            doc.setTextColor(0);
        },
        willDrawCell: (data) => {
             if (data.cell.section === 'head' || data.cell.section === 'body') {
             }
         },
         foot: [
             [
                 { content: 'Totales:', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold', fontSize: 9 } },
                 { content: formatCurrency(totalBase), styles: { halign: 'right', fontStyle: 'bold', fontSize: 9 } },
                 { content: formatCurrency(totalOtrosDevengados), styles: { halign: 'right', fontStyle: 'bold', fontSize: 9 } },
                 { content: formatCurrency(totalDeduccionesGlobal), styles: { halign: 'right', fontStyle: 'bold', fontSize: 9 } },
                 { content: formatCurrency(totalGeneralNeto), styles: { halign: 'right', fontStyle: 'bold', fontSize: 9 } }, // Use totalGeneralNeto
                 ''
             ],
         ],
         footStyles: {
             fillColor: false,
             textColor: [0, 0, 0],
             lineWidth: { top: 0.5 },
             lineColor: [0, 0, 0],
         },
    });

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
