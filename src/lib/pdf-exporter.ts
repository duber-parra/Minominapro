
// src/lib/pdf-exporter.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parse, getDay } from 'date-fns'; // Removed unused startOfWeek, endOfWeek
import { es } from 'date-fns/locale';
import type { QuincenalCalculationSummary, AdjustmentItem, SavedPayrollData, Employee, ScheduleData, Department, ShiftAssignment } from '@/types'; // Combined type imports
import { labelMap, displayOrder, formatCurrency, formatHours } from '@/components/results-display'; // Import helpers
import { formatTo12Hour, parseTimeToMinutes } from './time-utils'; // Import helpers from time-utils
import { AUXILIO_TRANSPORTE_VALOR_QUINCENAL } from '@/config/payroll-values'; // Import constant

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
    payrollTitle?: string; // Optional: User-defined title for the payroll period
    periodStart: Date;
    periodEnd: Date;
    summary: QuincenalCalculationSummary;
    otrosIngresosLista: AdjustmentItem[];
    otrasDeduccionesLista: AdjustmentItem[];
    auxTransporteAplicado: number; // Amount of transport allowance applied
    incluyeDeduccionSalud: boolean;
    incluyeDeduccionPension: boolean;
}

// Helper to add the watermark header and company logo/name
function addHeaderAndWatermark(doc: jsPDF, initialY: number = 10, isLandscape: boolean = false): number {
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    const watermarkText = "Desarrollado por Duber Parra, Dpana company © 2025 Calculadora de Turnos y Recargos";
    const leftMargin = isLandscape ? 20 : 14; // Adjust margin for landscape
    let currentYPos = initialY;

    if (typeof window !== 'undefined') {
        const companyLogoDataUrl = localStorage.getItem('companyLogo');
        const companyName = localStorage.getItem('companyName');

        if (companyLogoDataUrl) {
            try {
                const logoSize = 15;
                doc.addImage(companyLogoDataUrl, 'PNG', leftMargin, currentYPos, logoSize, logoSize);
                if (companyName) {
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'bold');
                    doc.text(companyName, leftMargin + logoSize + 3, currentYPos + logoSize / 2 + 3);
                }
                currentYPos += logoSize + 5;
            } catch (e) {
                console.error("Error adding company logo to PDF:", e);
            }
        } else if (companyName) {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text(companyName, leftMargin, currentYPos + 5);
            currentYPos += 10;
        }
    }

    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150);
    doc.text(watermarkText, pageWidth / 2, currentYPos, { align: 'center' });
    doc.setTextColor(0);
    doc.setFont('helvetica', 'normal');
    return currentYPos + 8;
}

function drawPayrollPage(doc: jsPDF, data: PayrollPageData): number {
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    let currentY = 10;
    const leftMargin = 14;
    const rightMargin = 14;

    currentY = addHeaderAndWatermark(doc, 10);

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Comprobante de Nómina Quincenal', pageWidth / 2, currentY, { align: 'center' });
    currentY += 10;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const employeeIdentifier = data.employeeName || data.employeeId;
    doc.text(`Colaborador: ${employeeIdentifier}`, leftMargin, currentY);
    currentY += 6;

    if (data.payrollTitle && data.payrollTitle.trim() !== '') {
        doc.text(`Nómina: ${data.payrollTitle}`, leftMargin, currentY);
    } else {
        doc.text(`Período: ${format(data.periodStart, 'dd/MM/yyyy', { locale: es })} - ${format(data.periodEnd, 'dd/MM/yyyy', { locale: es })}`, leftMargin, currentY);
    }
    currentY += 10;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumen Horas y Recargos/Extras', leftMargin, currentY);
    currentY += 6;

    const headHours = [['Categoría', 'Horas', 'Pago (Recargo/Extra)']];
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
        head: headHours,
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
             if (hookData.pageNumber > 1) addHeaderAndWatermark(doc, 10);
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
    currentY = (doc as any).lastAutoTable.finalY + 5;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Otros Devengados', leftMargin, currentY);
    currentY += 6;

    const baseMasExtras = data.summary.pagoTotalConSalarioQuincena;
    const totalOtrosIngresosManuales = (data.otrosIngresosLista || []).reduce((sum, item) => sum + item.monto, 0);
    const totalDevengadoBruto = baseMasExtras + data.auxTransporteAplicado + totalOtrosIngresosManuales;
    const ibcEstimado = data.summary.salarioBaseQuincenal + data.summary.totalPagoRecargosExtrasQuincena + totalOtrosIngresosManuales;

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
             if (hookData.pageNumber > 1) addHeaderAndWatermark(doc, 10);
         },
        didParseCell: (hookData) => {
             if (hookData.cell.raw === '-') {
                 hookData.cell.styles.fontStyle = 'normal';
                 hookData.cell.styles.minCellHeight = 1;
                 hookData.cell.styles.cellPadding = 0;
                 if (hookData.column.index === 0 && (hookData.cell as any).width) {
                    const lineY = (hookData.cell as any).y + (hookData.cell as any).height / 2;
                    doc.setDrawColor(200, 200, 200);
                    doc.line((hookData.cell as any).x, lineY, (hookData.cell as any).x + (hookData.cell as any).width, lineY);
                 }
                 hookData.cell.text = '';
            }
        }
    });
    currentY = (doc as any).lastAutoTable.finalY + 5;

    const deduccionSaludQuincenal = data.incluyeDeduccionSalud ? ibcEstimado * 0.04 : 0;
    const deduccionPensionQuincenal = data.incluyeDeduccionPension ? ibcEstimado * 0.04 : 0;
    const totalDeduccionesLegales = deduccionSaludQuincenal + deduccionPensionQuincenal;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Deducciones Legales (Estimadas)', leftMargin, currentY);
    currentY += 6;

    const deduccionesLegalesBody = [];
    if (data.incluyeDeduccionSalud) {
        deduccionesLegalesBody.push([`Deducción Salud (4% s/IBC: ${formatCurrency(ibcEstimado)})`, formatCurrency(deduccionSaludQuincenal)]);
    }
    if (data.incluyeDeduccionPension) {
        deduccionesLegalesBody.push([`Deducción Pensión (4% s/IBC: ${formatCurrency(ibcEstimado)})`, formatCurrency(deduccionPensionQuincenal)]);
    }
    if (!data.incluyeDeduccionSalud && !data.incluyeDeduccionPension) {
      deduccionesLegalesBody.push([{ content: 'Deducciones legales desactivadas.', colSpan: 2, styles: { fontStyle: 'italic', textColor: [100,100,100] } }]);
    } else if (deduccionesLegalesBody.length > 0) { // Only add total if there are individual deductions shown
        deduccionesLegalesBody.push([{ content: 'Total Deducciones Legales:', styles: { fontStyle: 'bold' } }, { content: formatCurrency(totalDeduccionesLegales), styles: { fontStyle: 'bold' } }]);
    }


    autoTable(doc, {
        body: deduccionesLegalesBody,
        startY: currentY,
        theme: 'plain',
        columnStyles: { 1: { halign: 'right' } },
        didDrawPage: (hookData) => {
            currentY = hookData.cursor?.y ?? currentY;
             if (hookData.pageNumber > 1) addHeaderAndWatermark(doc, 10);
         },
    });
    currentY = (doc as any).lastAutoTable.finalY + 5;

    const subtotalNetoParcial = totalDevengadoBruto - totalDeduccionesLegales;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Subtotal (Dev. Bruto - Ded. Ley):', leftMargin, currentY);
    doc.text(formatCurrency(subtotalNetoParcial), pageWidth - rightMargin, currentY, { align: 'right' });
    currentY += 10;

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
                 if (hookData.pageNumber > 1) addHeaderAndWatermark(doc, 10);
            },
        });
        currentY = (doc as any).lastAutoTable.finalY;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Total Otras Deducciones:', leftMargin, currentY + 5);
        doc.text(formatCurrency(totalOtrasDeduccionesManuales), pageWidth - rightMargin, currentY + 5, { align: 'right' });
        currentY += 10;
    }

     const netoAPagar = subtotalNetoParcial - totalOtrasDeduccionesManuales;
     doc.setFontSize(14);
     doc.setFont('helvetica', 'bold');
     doc.text('Neto a Pagar Estimado Quincenal:', leftMargin, currentY);
     doc.text(formatCurrency(netoAPagar), pageWidth - rightMargin, currentY, { align: 'right', textColor: [76, 67, 223] });
     currentY += 15;

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

export function exportPayrollToPDF(
    summary: QuincenalCalculationSummary,
    employeeId: string,
    employeeName: string | undefined,
    periodStart: Date,
    periodEnd: Date,
    payrollTitle: string | undefined, // Added payrollTitle
    otrosIngresosLista: AdjustmentItem[],
    otrasDeduccionesLista: AdjustmentItem[],
    auxTransporteAplicado: number,
    incluyeDeduccionSalud: boolean,
    incluyeDeduccionPension: boolean
): void {
    const doc = new jsPDF();
    const payrollData: PayrollPageData = {
        employeeId,
        employeeName,
        payrollTitle, // Pass payrollTitle
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
    const filenamePrefix = payrollTitle && payrollTitle.trim() !== '' ? payrollTitle.replace(/[^a-zA-Z0-9_.-]/g, '_') : `Nomina_${employeeName || employeeId}`;
    const filenameSuffix = payrollTitle && payrollTitle.trim() !== '' ? '' : `_${format(periodStart, 'yyyyMMdd')}-${format(periodEnd, 'yyyyMMdd')}`;
    const filename = `${filenamePrefix}${filenameSuffix}.pdf`;
    doc.save(filename);
}

export function exportAllPayrollsToPDF(
    allPayrollData: SavedPayrollData[],
    employees: Employee[]
): void {
    if (!allPayrollData || allPayrollData.length === 0) {
        console.warn("No payroll data provided for bulk export.");
        return;
    }

    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    let currentY = 10;
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const leftMargin = 20;
    const rightMargin = 20;
    const firmaHeight = 18; // Adjusted height for signature cell

    currentY = addHeaderAndWatermark(doc, 10, true);

    doc.setFontSize(14); // Slightly smaller title
    doc.setFont('helvetica', 'bold');
    doc.text('Resumen de Pagos de Nómina', pageWidth / 2, currentY, { align: 'center' });
    currentY += 15;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
     if (typeof window !== 'undefined') {
        const companyName = localStorage.getItem('companyName');
        if (companyName) {
            doc.text(companyName, pageWidth / 2, currentY, { align: 'center' });
            currentY += 10;
        }
    }
    doc.text(`Fecha de Emisión: ${format(new Date(), 'dd/MM/yyyy')}`, pageWidth / 2, currentY, { align: 'center' });
    currentY += 20;

    const head = [
        [
            { content: 'Empleado', rowSpan: 2, styles: { valign: 'middle', halign: 'center', fontStyle: 'bold' } },
            { content: 'Nómina / Período', rowSpan: 2, styles: { valign: 'middle', halign: 'center', fontStyle: 'bold' } },
            { content: 'Sueldos y Tiempo', colSpan: 3, styles: { halign: 'center', fontStyle: 'bold' } },
            { content: 'Horas Extras y Recargos Ordinarios', colSpan: 6, styles: { halign: 'center', fontStyle: 'bold' } },
            { content: 'Horas Extras y Recargos Dom./Fest.', colSpan: 8, styles: { halign: 'center', fontStyle: 'bold' } },
            { content: 'Liquidación Final', colSpan: 2, styles: { halign: 'center', fontStyle: 'bold' } },
            { content: 'Firma', rowSpan: 2, styles: { valign: 'middle', halign: 'center', fontStyle: 'bold' } },
        ],
        [
            // Sueldos y Tiempo
            { content: 'Sal.Base', styles: { halign: 'center', fontStyle: 'bold', fontSize: 7 } },
            { content: 'Aux.Transp.', styles: { halign: 'center', fontStyle: 'bold', fontSize: 7 } },
            { content: 'Tot.Hrs.', styles: { halign: 'center', fontStyle: 'bold', fontSize: 7 } },
            // Extras y Recargos Ordinarios
            { content: 'H.RNO', styles: { halign: 'center', fontStyle: 'bold', fontSize: 7 } },
            { content: 'V.RNO', styles: { halign: 'center', fontStyle: 'bold', fontSize: 7 } },
            { content: 'H.HED', styles: { halign: 'center', fontStyle: 'bold', fontSize: 7 } },
            { content: 'V.HED', styles: { halign: 'center', fontStyle: 'bold', fontSize: 7 } },
            { content: 'H.HEN', styles: { halign: 'center', fontStyle: 'bold', fontSize: 7 } },
            { content: 'V.HEN', styles: { halign: 'center', fontStyle: 'bold', fontSize: 7 } },
            // Extras y Recargos Dom./Fest.
            { content: 'H.RDDF', styles: { halign: 'center', fontStyle: 'bold', fontSize: 7 } },
            { content: 'V.RDDF', styles: { halign: 'center', fontStyle: 'bold', fontSize: 7 } },
            { content: 'H.RNDF', styles: { halign: 'center', fontStyle: 'bold', fontSize: 7 } },
            { content: 'V.RNDF', styles: { halign: 'center', fontStyle: 'bold', fontSize: 7 } },
            { content: 'H.HEDDF', styles: { halign: 'center', fontStyle: 'bold', fontSize: 7 } },
            { content: 'V.HEDDF', styles: { halign: 'center', fontStyle: 'bold', fontSize: 7 } },
            { content: 'H.HENDF', styles: { halign: 'center', fontStyle: 'bold', fontSize: 7 } },
            { content: 'V.HENDF', styles: { halign: 'center', fontStyle: 'bold', fontSize: 7 } },
            // Liquidación Final
            { content: 'Ded. Ley', styles: { halign: 'center', fontStyle: 'bold', fontSize: 7 } },
            { content: 'Neto Pagar', styles: { halign: 'center', fontStyle: 'bold', fontSize: 7 } },
        ]
    ];

    let totalSalarioBase = 0, totalAuxTransporte = 0, totalHorasGlobal = 0;
    let totalHorasRNO = 0, totalValorRNO = 0, totalHorasHED = 0, totalValorHED = 0, totalHorasHEN = 0, totalValorHEN = 0;
    let totalHorasRDDF = 0, totalValorRDDF = 0, totalHorasRNDF = 0, totalValorRNDF = 0;
    let totalHorasHEDDF = 0, totalValorHEDDF = 0, totalHorasHENDF = 0, totalValorHENDF = 0;
    let totalDeduccionesLey = 0, totalNetoPagar = 0;

    const employeeMap = new Map(employees.map(emp => [emp.id, emp.name]));

    const body = allPayrollData.map(payroll => {
        const employeeName = employeeMap.get(payroll.employeeId) || payroll.employeeId;
        const periodoStr = payroll.payrollTitle && payroll.payrollTitle.trim() !== ''
            ? payroll.payrollTitle
            : `${format(payroll.periodStart, 'd')} - ${format(payroll.periodEnd, 'd MMM', { locale: es })}`;
        
        const s = payroll.summary.totalHorasDetalladas;
        const p = payroll.summary.totalPagoDetallado;

        const salarioBase = payroll.summary.salarioBaseQuincenal;
        const auxTransporte = payroll.incluyeAuxTransporte ? AUXILIO_TRANSPORTE_VALOR_QUINCENAL : 0;
        const totalHoras = payroll.summary.totalDuracionTrabajadaHorasQuincena;

        const totalOtrosIngresos = (payroll.otrosIngresosLista || []).reduce((sum, item) => sum + item.monto, 0);
        const totalOtrasDeduccionesManuales = (payroll.otrasDeduccionesLista || []).reduce((sum, item) => sum + item.monto, 0);
        
        const ibcEstimado = salarioBase + payroll.summary.totalPagoRecargosExtrasQuincena + totalOtrosIngresos;
        const deduccionSalud = payroll.incluyeDeduccionSalud ? ibcEstimado * 0.04 : 0;
        const deduccionPension = payroll.incluyeDeduccionPension ? ibcEstimado * 0.04 : 0;
        const dedLey = deduccionSalud + deduccionPension;

        const devengadoBruto = salarioBase + payroll.summary.totalPagoRecargosExtrasQuincena + auxTransporte + totalOtrosIngresos;
        const netoPagar = devengadoBruto - dedLey - totalOtrasDeduccionesManuales;

        totalSalarioBase += salarioBase;
        totalAuxTransporte += auxTransporte;
        totalHorasGlobal += totalHoras;
        totalHorasRNO += s.Recargo_Noct_Base; totalValorRNO += p.Recargo_Noct_Base;
        totalHorasHED += s.HED; totalValorHED += p.HED;
        totalHorasHEN += s.HEN; totalValorHEN += p.HEN;
        totalHorasRDDF += s.Recargo_Dom_Diurno_Base; totalValorRDDF += p.Recargo_Dom_Diurno_Base;
        totalHorasRNDF += s.Recargo_Dom_Noct_Base; totalValorRNDF += p.Recargo_Dom_Noct_Base;
        totalHorasHEDDF += s.HEDD_F; totalValorHEDDF += p.HEDD_F;
        totalHorasHENDF += s.HEND_F; totalValorHENDF += p.HEND_F;
        totalDeduccionesLey += dedLey;
        totalNetoPagar += netoPagar;

        return [
            employeeName, periodoStr,
            formatCurrency(salarioBase, false), formatCurrency(auxTransporte, false), formatHours(totalHoras),
            formatHours(s.Recargo_Noct_Base), formatCurrency(p.Recargo_Noct_Base, false),
            formatHours(s.HED), formatCurrency(p.HED, false),
            formatHours(s.HEN), formatCurrency(p.HEN, false),
            formatHours(s.Recargo_Dom_Diurno_Base), formatCurrency(p.Recargo_Dom_Diurno_Base, false),
            formatHours(s.Recargo_Dom_Noct_Base), formatCurrency(p.Recargo_Dom_Noct_Base, false),
            formatHours(s.HEDD_F), formatCurrency(p.HEDD_F, false),
            formatHours(s.HEND_F), formatCurrency(p.HEND_F, false),
            formatCurrency(dedLey, false), formatCurrency(netoPagar, false),
            '' // Signature
        ];
    });

    const footer = [
        [
            { content: 'TOTALES:', colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } },
            formatCurrency(totalSalarioBase, false), formatCurrency(totalAuxTransporte, false), formatHours(totalHorasGlobal),
            formatHours(totalHorasRNO), formatCurrency(totalValorRNO, false),
            formatHours(totalHorasHED), formatCurrency(totalValorHED, false),
            formatHours(totalHorasHEN), formatCurrency(totalValorHEN, false),
            formatHours(totalHorasRDDF), formatCurrency(totalValorRDDF, false),
            formatHours(totalHorasRNDF), formatCurrency(totalValorRNDF, false),
            formatHours(totalHorasHEDDF), formatCurrency(totalValorHEDDF, false),
            formatHours(totalHorasHENDF), formatCurrency(totalValorHENDF, false),
            formatCurrency(totalDeduccionesLey, false), formatCurrency(totalNetoPagar, false),
            ''
        ]
    ];

    autoTable(doc, {
        head: head,
        body: body,
        foot: footer,
        startY: currentY,
        theme: 'grid', // Use 'grid' for visible lines
        styles: { fontSize: 6, cellPadding: 1.5, lineColor: [200,200,200], lineWidth: 0.25 }, // Smaller font, tighter padding
        headStyles: {
            fillColor: [226, 232, 240], // Light gray header
            textColor: [30, 41, 59],    // Dark text
            fontStyle: 'bold',
            fontSize: 6, // Smallest font for sub-headers
            halign: 'center',
            valign: 'middle',
            cellPadding: 1,
        },
        footStyles: {
            fillColor: [240, 240, 240],
            textColor: [0,0,0],
            fontStyle: 'bold',
            fontSize: 6,
            halign: 'right',
            cellPadding: 1.5,
        },
        columnStyles: {
            0: { cellWidth: 60, halign: 'left', fontStyle: 'bold', fontSize: 7 }, // Empleado
            1: { cellWidth: 35, halign: 'left', fontSize: 6 }, // Periodo
            // Sueldos y Tiempo
            2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' },
            // Horas Extras y Recargos Ordinarios (H, V, H, V, H, V)
            5: { halign: 'right' }, 6: { halign: 'right' }, 7: { halign: 'right' },
            8: { halign: 'right' }, 9: { halign: 'right' }, 10: { halign: 'right' },
            // Horas Extras y Recargos Dom./Fest. (H, V, H, V, H, V, H, V)
            11: { halign: 'right' }, 12: { halign: 'right' }, 13: { halign: 'right' },
            14: { halign: 'right' }, 15: { halign: 'right' }, 16: { halign: 'right' },
            17: { halign: 'right' }, 18: { halign: 'right' },
            // Liquidación Final
            19: { halign: 'right' },
            20: { halign: 'right', fontStyle: 'bold', textColor: [76, 67, 223] }, // Neto Pagar
            21: { cellWidth: 35, minCellHeight: firmaHeight }, // Firma
        },
        didDrawPage: (hookData) => {
            currentY = hookData.cursor?.y ?? currentY;
            const pageNum = doc.internal.getNumberOfPages();
            addHeaderAndWatermark(doc, 10, true);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`Página ${pageNum}`, pageWidth - rightMargin, pageHeight - 10, { align: 'right' });
            doc.setTextColor(0);
        },
         didDrawCell: (data) => {
            if (data.column.index === 21 && data.cell.section === 'body') { // Signature column
                const cell = data.cell;
                if (cell.raw === '') { // Ensure it's an empty cell for signature
                    const signatureLineY = cell.y + cell.height - 5; // Adjust line position
                    const signatureLineXStart = cell.x + 2;
                    const signatureLineXEnd = cell.x + cell.width - 2;
                    doc.setDrawColor(220, 220, 220); // Lighter line for signature
                    doc.setLineWidth(0.5);
                    doc.line(signatureLineXStart, signatureLineY, signatureLineXEnd, signatureLineY);
                }
            }
        }
    });

    const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
    const filename = `Consolidado_Nominas_${timestamp}.pdf`;
    doc.save(filename);
}

// src/lib/schedule-pdf-exporter.ts
// This section is for schedule exports, not payroll. It uses its own addHeaderAndWatermark and specific logic.

export interface ScheduleExportData {
    locationName: string;
    weekDates: Date[];
    departments: Department[];
    employees: Employee[];
    scheduleData: { [dateKey: string]: ScheduleData };
    getScheduleForDate: (date: Date) => ScheduleData;
    calculateShiftDuration: (assignment: ShiftAssignment, shiftDate: Date) => number;
}

// This specific header function is for the SCHEDULE PDF.
// It is different from the one used for PAYROLL PDFs.
function addScheduleHeaderAndWatermark(doc: jsPDF, initialY: number = 10): number {
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    const watermarkText = "Desarrollado por Duber Parra, Dpana company © 2025 Calculadora de Turnos y Recargos";
    const leftMargin = 40;
    let currentYPos = initialY;

    if (typeof window !== 'undefined') {
        const companyLogoDataUrl = localStorage.getItem('companyLogo');
        const companyName = localStorage.getItem('companyName');

        if (companyLogoDataUrl) {
            try {
                const logoSize = 15;
                doc.addImage(companyLogoDataUrl, 'PNG', leftMargin, currentYPos, logoSize, logoSize);
                if (companyName) {
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'bold');
                    doc.text(companyName, leftMargin + logoSize + 3, currentYPos + logoSize / 2 + 3);
                }
                currentYPos += logoSize + 5;
            } catch (e) {
                console.error("Error adding company logo to PDF:", e);
            }
        } else if (companyName) {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text(companyName, leftMargin, currentYPos + 5);
            currentYPos += 10;
        }
    }

    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150);
    doc.text(watermarkText, pageWidth / 2, currentYPos, { align: 'center' });
    doc.setTextColor(0);
    doc.setFont('helvetica', 'normal');
    return currentYPos + 5;
}


export function exportScheduleToPDF(data: ScheduleExportData): void {
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'pt',
        format: 'a4'
    });

    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    let currentY = 10;
    const leftMargin = 40;
    const rightMargin = 40;

    currentY = addScheduleHeaderAndWatermark(doc, 10);

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Horario Semanal de Trabajo', pageWidth / 2, currentY, { align: 'center' });
    currentY += 20;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    const weekStartFormatted = format(data.weekDates[0], 'dd MMMM', { locale: es });
    const weekEndFormatted = format(data.weekDates[6], 'dd MMMM yyyy', { locale: es });
    doc.text(`Sede: ${data.locationName}`, leftMargin, currentY);
    doc.text(`Semana: ${weekStartFormatted} - ${weekEndFormatted}`, pageWidth - rightMargin, currentY, { align: 'right' });
    currentY += 30;

    const head: any[] = [
        [{ content: 'EMPLEADO / DÍA', styles: { halign: 'left', valign: 'middle' } }]
    ];
    data.weekDates.forEach(date => {
        head[0].push({
            content: `${format(date, 'EEE', { locale: es }).toUpperCase()}\n${format(date, 'dd MMM', { locale: es })}`,
            styles: { halign: 'center', valign: 'middle' }
        });
    });

    const body: any[] = [];
    data.employees.forEach(emp => {
        const employeeRow: any[] = [{ content: emp.name, styles: { valign: 'middle' } }];
        let hasShiftThisWeek = false;
        data.weekDates.forEach(date => {
            const daySchedule = data.getScheduleForDate(date);
            let assignmentFound = false;
            let cellContent = ' ';
            data.departments.forEach(dept => {
                const assignment = (daySchedule.assignments[dept.id] || []).find(a => a.employee.id === emp.id);
                if (assignment) {
                    assignmentFound = true;
                    hasShiftThisWeek = true;
                    cellContent = `${formatTo12Hour(assignment.startTime)} - ${formatTo12Hour(assignment.endTime)}`;
                    if (assignment.includeBreak && assignment.breakStartTime && assignment.breakEndTime) {
                        cellContent += `\nD: ${formatTo12Hour(assignment.breakStartTime)}-${formatTo12Hour(assignment.breakEndTime)}`;
                    }
                }
            });
            if (assignmentFound) {
                employeeRow.push({ content: cellContent, styles: { halign: 'center', valign: 'middle', fontSize: 8 } });
            } else {
                employeeRow.push({ content: ' ', styles: { halign: 'center', valign: 'middle', textColor: [150, 150, 150], fontSize: 8 } });
            }
        });
        if (hasShiftThisWeek) {
            body.push(employeeRow);
        }
    });

    autoTable(doc, {
        head: head,
        body: body,
        startY: currentY,
        theme: 'grid',
        headStyles: {
            fillColor: [76, 67, 223],
            textColor: [255, 255, 255],
            fontSize: 9,
            lineWidth: 0.5,
            lineColor: [200, 200, 200]
        },
        columnStyles: {
            0: { cellWidth: 100, fontStyle: 'bold' },
            ...Array.from({ length: data.weekDates.length }).reduce((styles, _, index) => {
                styles[index + 1] = { cellWidth: 'auto', halign: 'center', fontSize: 8 };
                return styles;
            }, {} as any)
        },
        styles: {
            cellPadding: 4,
            fontSize: 9,
            overflow: 'linebreak',
            lineWidth: 0.5,
            lineColor: [200, 200, 200]
        },
        didDrawPage: (hookData) => {
            currentY = hookData.cursor?.y ?? currentY;
            const pageNum = doc.internal.getNumberOfPages();
            addScheduleHeaderAndWatermark(doc, 10);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`Página ${pageNum}`, pageWidth - rightMargin, pageHeight - 10, { align: 'right' });
            doc.setTextColor(0);
        }
    });

    const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
    const filename = `Horario_Semanal_${data.locationName}_${timestamp}.pdf`;
    doc.save(filename);
}


export function exportConsolidatedScheduleToPDF(allLocationData: ScheduleExportData[]): void {
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'pt',
        format: 'a4'
    });

    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    let currentY = 10;
    const leftMargin = 40;
    const rightMargin = 40;

    currentY = addScheduleHeaderAndWatermark(doc, 10);

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Horario Semanal Consolidado', pageWidth / 2, currentY, { align: 'center' });
    currentY += 20;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    if (typeof window !== 'undefined') {
        const companyName = localStorage.getItem('companyName');
        if (companyName) {
            doc.text(companyName, pageWidth / 2, currentY, { align: 'center' });
            currentY += 15;
        }
    }
    const weekStartFormatted = format(allLocationData[0].weekDates[0], 'dd MMMM', { locale: es });
    const weekEndFormatted = format(allLocationData[0].weekDates[6], 'dd MMMM yyyy', { locale: es });
    doc.text(`Semana: ${weekStartFormatted} - ${weekEndFormatted}`, pageWidth / 2, currentY, { align: 'center' });
    currentY += 30;

    const head: any[] = [
        [{ content: 'EMPLEADO / SEDE / DÍA', styles: { halign: 'left', valign: 'middle' } }]
    ];
    allLocationData[0].weekDates.forEach(date => {
        head[0].push({
            content: `${format(date, 'EEE', { locale: es }).toUpperCase()}\n${format(date, 'dd MMM', { locale: es })}`,
            styles: { halign: 'center', valign: 'middle' }
        });
    });

    const body: any[] = [];
    let totalHoursGrandTotal = 0;

    const allEmployeesMap = new Map<string, Employee>();
    allLocationData.forEach(locData => {
        locData.employees.forEach(emp => {
            if (!allEmployeesMap.has(emp.id)) {
                allEmployeesMap.set(emp.id, emp);
            }
        });
    });
    const sortedEmployees = Array.from(allEmployeesMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    sortedEmployees.forEach(emp => {
        const employeeRow: any[] = [{ content: emp.name, styles: { valign: 'middle' } }];
        let totalHoursWeek = 0;
        let hasShiftThisWeek = false;
        allLocationData[0].weekDates.forEach(date => {
            let cellContent = ' ';
            let assignmentFound = false;
            for (const locData of allLocationData) {
                const daySchedule = locData.getScheduleForDate(date);
                for (const deptId in daySchedule.assignments) {
                    const assignment = daySchedule.assignments[deptId].find(a => a.employee.id === emp.id);
                    if (assignment) {
                        assignmentFound = true;
                        hasShiftThisWeek = true;
                        const duration = locData.calculateShiftDuration(assignment, date);
                        totalHoursWeek += duration;
                        cellContent = `${formatTo12Hour(assignment.startTime)} - ${formatTo12Hour(assignment.endTime)}`;
                        cellContent += `\n(${locData.locationName.substring(0, 3).toUpperCase()})`;
                        if (assignment.includeBreak && assignment.breakStartTime && assignment.breakEndTime) {
                            cellContent += `\nD:${formatTo12Hour(assignment.breakStartTime)}-${formatTo12Hour(assignment.breakEndTime)}`;
                        }
                        break;
                    }
                }
                if (assignmentFound) break;
            }
            if (assignmentFound) {
                employeeRow.push({ content: cellContent, styles: { halign: 'center', valign: 'middle', fontSize: 8 } });
            } else {
                const dayOfWeek = getDay(date);
                if (dayOfWeek === 6 || dayOfWeek === 0) {
                    employeeRow.push({ content: 'DESCANSO', styles: { halign: 'center', valign: 'middle', fontSize: 7, fontStyle: 'italic', textColor: [255, 0, 0] } });
                } else {
                    employeeRow.push({ content: ' ', styles: { halign: 'center', valign: 'middle' } });
                }
            }
        });
        if (hasShiftThisWeek) {
            employeeRow.push({ content: totalHoursWeek.toFixed(1), styles: { halign: 'right', valign: 'middle', fontStyle: 'bold', fontSize: 8 } });
            totalHoursGrandTotal += totalHoursWeek;
        } else {
            const descansoWeekend = allLocationData[0].weekDates.every(date => {
                const dayOfWeek = getDay(date);
                return dayOfWeek === 6 || dayOfWeek === 0;
            });
            if (descansoWeekend) {
                employeeRow.push({ content: 'DESC', styles: { halign: 'right', valign: 'middle', fontSize: 7, fontStyle: 'italic' } });
            } else {
                employeeRow.push({ content: '0.0', styles: { halign: 'right', valign: 'middle', fontSize: 8 } });
            }
        }
        body.push(employeeRow);
    });

    head[0].push({ content: 'HR TOTAL', styles: { halign: 'center', valign: 'middle' } });
    const grandTotalRow: any[] = [
        { content: 'TOTAL HORAS SEMANA:', colSpan: allLocationData[0].weekDates.length + 1, styles: { halign: 'right', fontStyle: 'bold', fontSize: 10 } },
        { content: totalHoursGrandTotal.toFixed(1), styles: { halign: 'right', fontStyle: 'bold', fontSize: 10 } }
    ];
    body.push(grandTotalRow);

    autoTable(doc, {
        head: head,
        body: body,
        startY: currentY,
        theme: 'grid',
        headStyles: {
            fillColor: [76, 67, 223],
            textColor: [255, 255, 255],
            fontSize: 9,
            lineWidth: 0.5,
            lineColor: [200, 200, 200]
        },
        columnStyles: {
            0: { cellWidth: 100, fontStyle: 'bold' },
            ...Array.from({ length: allLocationData[0].weekDates.length + 1 }).reduce((styles, _, index) => {
                if (index < allLocationData[0].weekDates.length) {
                    styles[index + 1] = { cellWidth: 'auto', halign: 'center', fontSize: 8 };
                } else {
                    styles[index + 1] = { cellWidth: 40, halign: 'right', fontStyle: 'bold', fontSize: 8 };
                }
                return styles;
            }, {} as any)
        },
        styles: {
            cellPadding: 3,
            fontSize: 8,
            overflow: 'linebreak',
            lineWidth: 0.5,
            lineColor: [200, 200, 200]
        },
        didDrawPage: (hookData) => {
            currentY = hookData.cursor?.y ?? currentY;
            const pageNum = doc.internal.getNumberOfPages();
            addScheduleHeaderAndWatermark(doc, 10);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`Página ${pageNum}`, pageWidth - rightMargin, pageHeight - 10, { align: 'right' });
            doc.setTextColor(0);
        }
    });

    const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
    const filename = `Horario_Consolidado_${timestamp}.pdf`;
    doc.save(filename);
}
