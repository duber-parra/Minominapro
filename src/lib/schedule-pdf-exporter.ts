
// src/lib/schedule-pdf-exporter.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parse as parseDateFns, startOfWeek, endOfWeek, getDay, isValid as isValidDate } from 'date-fns'; // Added isValidDate
import { es } from 'date-fns/locale';
import type { ScheduleData, Department, Employee, ShiftAssignment } from '@/types/schedule';
import { formatTo12Hour, parseTimeToMinutes } from './time-utils'; // Import helpers

// Extend jsPDF interface for autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

// Interface for single location data
export interface ScheduleExportData {
    locationName: string;
    weekDates: Date[];
    departments: Department[];
    employees: Employee[]; // List of all employees for the selected location
    scheduleData: { [dateKey: string]: ScheduleData };
    getScheduleForDate: (date: Date) => ScheduleData;
    calculateShiftDuration: (assignment: ShiftAssignment, shiftDate: Date) => number;
}

// Helper to add the watermark header and company logo/name for schedule PDFs
function addScheduleHeaderAndWatermark(doc: jsPDF, initialY: number = 10): number {
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    const watermarkText = "Desarrollado por Duber Parra, Dpana company © 2025 Calculadora de Turnos y Recargos";
    const leftMargin = 40; // Consistent with table margin
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


// --- Single Location PDF Export ---
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
    const filename = `Horario_Semanal_${data.locationName.replace(/[^a-zA-Z0-9_.-]/g, '_')}_${timestamp}.pdf`;
    doc.save(filename);
}


// --- Consolidated PDF Export (All Locations) ---
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
        [{ content: 'EMPLEADO', styles: { halign: 'left', valign: 'middle' } }]
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
        const employeeRow: any[] = [{ content: emp.name, styles: { valign: 'middle', fontSize: 8 } }];
        let totalHoursWeek = 0;
        let hasShiftThisWeek = false;

        allLocationData[0].weekDates.forEach(date => {
            let cellContent = ' ';
            let assignmentFound = false;
            let assignedLocationName = '';
            let assignedDepartmentName = '';

            for (const locData of allLocationData) {
                const daySchedule = locData.getScheduleForDate(date);
                for (const deptId in daySchedule.assignments) {
                    const departmentObject = locData.departments.find(d => d.id === deptId);
                    const assignment = daySchedule.assignments[deptId].find(a => a.employee.id === emp.id);
                    if (assignment) {
                        assignmentFound = true;
                        hasShiftThisWeek = true;
                        const duration = locData.calculateShiftDuration(assignment, date);
                        totalHoursWeek += duration;

                        assignedLocationName = locData.locationName;
                        assignedDepartmentName = departmentObject ? departmentObject.name : 'N/A';

                        cellContent = `${formatTo12Hour(assignment.startTime)} - ${formatTo12Hour(assignment.endTime)}`;
                        if (assignment.includeBreak && assignment.breakStartTime && assignment.breakEndTime) {
                            cellContent += `\nD: ${formatTo12Hour(assignment.breakStartTime)}-${formatTo12Hour(assignment.breakEndTime)}`;
                        }
                        break;
                    }
                }
                if (assignmentFound) break;
            }

            if (assignmentFound) {
                let finalCellContent = cellContent;
                finalCellContent += `\nSede: ${assignedLocationName}`;
                finalCellContent += `\nDepto: ${assignedDepartmentName}`;
                employeeRow.push({ content: finalCellContent, styles: { halign: 'center', valign: 'middle', fontSize: 6 } }); // Adjusted font size
            } else {
                const dayOfWeek = getDay(date);
                employeeRow.push({
                    content: 'DESCANSO',
                    styles: {
                        halign: 'center',
                        valign: 'middle',
                        fontSize: 7, // Consistent font size for DESCANSO
                        fontStyle: (dayOfWeek === 6 || dayOfWeek === 0) ? 'italic' : 'normal',
                        textColor: (dayOfWeek === 6 || dayOfWeek === 0) ? [220, 53, 69] : [108, 117, 125] // Red for weekends, gray for weekdays
                    }
                });
            }
        });

        if (hasShiftThisWeek) {
            employeeRow.push({ content: totalHoursWeek.toFixed(1), styles: { halign: 'right', valign: 'middle', fontStyle: 'bold', fontSize: 8 } });
            totalHoursGrandTotal += totalHoursWeek;
        } else {
            employeeRow.push({ content: '0.0', styles: { halign: 'right', valign: 'middle', fontSize: 8 } });
        }
        body.push(employeeRow);
    });

    head[0].push({ content: 'HR TOTAL', styles: { halign: 'center', valign: 'middle' } });
    const grandTotalRow: any[] = [
        { content: 'TOTAL HORAS SEMANA:', colSpan: allLocationData[0].weekDates.length + 1, styles: { halign: 'right', fontStyle: 'bold', fontSize: 9 } }, // Adjusted font size
        { content: totalHoursGrandTotal.toFixed(1), styles: { halign: 'right', fontStyle: 'bold', fontSize: 9 } } // Adjusted font size
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
            fontSize: 8, // Adjusted head font size
            lineWidth: 0.5,
            lineColor: [200, 200, 200]
        },
        columnStyles: {
            0: { cellWidth: 90, fontStyle: 'bold', fontSize: 8 }, // Adjusted employee name column
            ...Array.from({ length: allLocationData[0].weekDates.length + 1 }).reduce((styles, _, index) => {
                if (index < allLocationData[0].weekDates.length) {
                    styles[index + 1] = { cellWidth: 'auto', halign: 'center', fontSize: 6 }; // Adjusted day column font size
                } else {
                    styles[index + 1] = { cellWidth: 35, halign: 'right', fontStyle: 'bold', fontSize: 8 }; // HR TOTAL column
                }
                return styles;
            }, {} as any)
        },
        styles: {
            cellPadding: 2.5, // Adjusted cell padding
            fontSize: 7, // Default cell font size
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
