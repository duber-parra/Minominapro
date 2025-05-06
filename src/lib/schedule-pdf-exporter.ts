// src/lib/schedule-pdf-exporter.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parse, startOfWeek, endOfWeek, getDay } from 'date-fns'; // Added startOfWeek, endOfWeek, getDay
import { es } from 'date-fns/locale';
import type { ScheduleData, Department, Employee, ShiftAssignment } from '@/types/schedule';
import { formatTo12Hour } from './time-utils'; // Import the helper

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

// Helper to add the watermark header and company logo/name
function addHeaderAndWatermark(doc: jsPDF, initialY: number = 10): number {
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    const watermarkText = "Desarrollado por Duber Parra, Dpana company © 2025 Calculadora de Turnos y Recargos";
    const leftMargin = 40; // Consistent with table margin
    let currentYPos = initialY;

    // --- Company Logo and Name (if available) ---
    if (typeof window !== 'undefined') {
        const companyLogoDataUrl = localStorage.getItem('companyLogo');
        const companyName = localStorage.getItem('companyName');

        if (companyLogoDataUrl) {
            try {
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
    return currentYPos + 5; // Return the Y position below the watermark
}


// --- Single Location PDF Export ---
export function exportScheduleToPDF(data: ScheduleExportData): void {
    const doc = new jsPDF({
        orientation: 'landscape', // Landscape for week view
        unit: 'pt', // Use points for better precision
        format: 'a4' // Standard A4 size
    });

    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    let currentY = 10;
    const leftMargin = 40;
    const rightMargin = 40;
    const tableWidth = pageWidth - leftMargin - rightMargin;

     // --- Header with Watermark, Logo, Name ---
     currentY = addHeaderAndWatermark(doc, 10);

    // --- Header ---
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

    // --- Table Setup ---
    const head: any[] = [
        [{ content: 'EMPLEADO / DÍA', styles: { halign: 'left', valign: 'middle' } }] // First header cell for employee names
    ];
    // Add days of the week to header
    data.weekDates.forEach(date => {
        head[0].push({
            content: `${format(date, 'EEE', { locale: es }).toUpperCase()}\n${format(date, 'dd MMM', { locale: es })}`,
            styles: { halign: 'center', valign: 'middle' }
        });
    });

    const body: any[] = [];

    // Iterate through employees associated with this location
    data.employees.forEach(emp => {
        const employeeRow: any[] = [{ content: emp.name, styles: { valign: 'middle' } }]; // First cell is employee name
        let hasShiftThisWeek = false;

        data.weekDates.forEach(date => {
            const daySchedule = data.getScheduleForDate(date);
            let assignmentFound = false;
            let cellContent = ' '; // Default to empty space

            // Check all departments for an assignment for this employee on this date
            data.departments.forEach(dept => {
                const assignment = (daySchedule.assignments[dept.id] || []).find(a => a.employee.id === emp.id);
                if (assignment) {
                    assignmentFound = true;
                    hasShiftThisWeek = true;
                    cellContent = `${formatTo12Hour(assignment.startTime)} - ${formatTo12Hour(assignment.endTime)}`;
                    if (assignment.includeBreak && assignment.breakStartTime && assignment.breakEndTime) {
                        cellContent += `\nD: ${formatTo12Hour(assignment.breakStartTime)}-${formatTo12Hour(assignment.breakEndTime)}`;
                    }
                     // Optionally add department info if needed, e.g., `\n(${dept.name})`
                }
            });

             if (assignmentFound) {
                  employeeRow.push({ content: cellContent, styles: { halign: 'center', valign: 'middle', fontSize: 8 } });
             } else {
                  employeeRow.push({ content: ' ', styles: { halign: 'center', valign: 'middle', textColor: [150, 150, 150], fontSize: 8 } }); // Empty space for no shift
             }
        });

         // Only add the employee row if they had at least one shift in the week for this location
         if (hasShiftThisWeek) {
            body.push(employeeRow);
         }
    });


    // --- Draw Table ---
    autoTable(doc, {
        head: head,
        body: body,
        startY: currentY,
        theme: 'grid',
        headStyles: {
            fillColor: [76, 67, 223], // Primary color #4C43DF
            textColor: [255, 255, 255], // White text
            fontSize: 9,
            lineWidth: 0.5,
            lineColor: [200, 200, 200]
        },
        columnStyles: {
            0: { cellWidth: 100, fontStyle: 'bold' }, // Employee name column wider and bold
             // Dynamically apply styles to day columns
             ...Array.from({ length: data.weekDates.length }).reduce((styles, _, index) => {
                styles[index + 1] = { cellWidth: 'auto', halign: 'center', fontSize: 8 }; // Smaller font size for shifts
                return styles;
            }, {} as any)
        },
        styles: {
            cellPadding: 4,
            fontSize: 9,
            overflow: 'linebreak', // Break long text
            lineWidth: 0.5,
            lineColor: [200, 200, 200]
        },
        didDrawPage: (hookData) => {
             currentY = hookData.cursor?.y ?? currentY;
             const pageNum = doc.internal.getNumberOfPages();
             addHeaderAndWatermark(doc, 10); // Add watermark near top
             doc.setFontSize(8);
             doc.setTextColor(150); // Keep footer text gray
             doc.text(`Página ${pageNum}`, pageWidth - rightMargin, pageHeight - 10, { align: 'right' });
             doc.setTextColor(0); // Reset text color
         }
    });

    // --- Save the PDF ---
    const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
    const filename = `Horario_Semanal_${data.locationName}_${timestamp}.pdf`;
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

    // --- Header with Watermark, Logo, Name ---
    currentY = addHeaderAndWatermark(doc, 10);

    // --- Main Header ---
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Horario Semanal Consolidado', pageWidth / 2, currentY, { align: 'center' });
    currentY += 20;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
     // Add Company Name if available
     if (typeof window !== 'undefined') {
        const companyName = localStorage.getItem('companyName');
        if (companyName) {
            doc.text(companyName, pageWidth / 2, currentY, { align: 'center' });
            currentY += 15; // Add space after company name
        }
    }
    const weekStartFormatted = format(allLocationData[0].weekDates[0], 'dd MMMM', { locale: es });
    const weekEndFormatted = format(allLocationData[0].weekDates[6], 'dd MMMM yyyy', { locale: es });
    doc.text(`Semana: ${weekStartFormatted} - ${weekEndFormatted}`, pageWidth / 2, currentY, { align: 'center' });
    currentY += 30;


    // --- Table Setup ---
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

    // Group all unique employees across all locations first
     const allEmployeesMap = new Map<string, Employee>();
     allLocationData.forEach(locData => {
         locData.employees.forEach(emp => {
             if (!allEmployeesMap.has(emp.id)) {
                 allEmployeesMap.set(emp.id, emp);
             }
         });
     });
     const sortedEmployees = Array.from(allEmployeesMap.values()).sort((a, b) => a.name.localeCompare(b.name));


    // Iterate through sorted unique employees
     sortedEmployees.forEach(emp => {
        const employeeRow: any[] = [{ content: emp.name, styles: { valign: 'middle' } }];
        let totalHoursWeek = 0;
        let hasShiftThisWeek = false;

        allLocationData[0].weekDates.forEach(date => {
            let cellContent = ' '; // Default to empty space
            let assignmentFound = false;

             // Check assignments for this employee on this date ACROSS ALL locations
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
                         // Add location name abbreviation or indicator
                         cellContent += `\n(${locData.locationName.substring(0, 3).toUpperCase()})`; // e.g., (PRI) or (NOR)
                         if (assignment.includeBreak && assignment.breakStartTime && assignment.breakEndTime) {
                              cellContent += `\nD:${formatTo12Hour(assignment.breakStartTime)}-${formatTo12Hour(assignment.breakEndTime)}`;
                         }
                         break; // Found assignment for this employee on this day, move to next day
                     }
                 }
                 if (assignmentFound) break; // Exit location loop if assignment found
             }

             if (assignmentFound) {
                 employeeRow.push({ content: cellContent, styles: { halign: 'center', valign: 'middle', fontSize: 8 } });
             } else {
                 // Check if it's a weekend (Saturday=6, Sunday=0) for "DESCANSO"
                 const dayOfWeek = getDay(date);
                  if (dayOfWeek === 6 || dayOfWeek === 0) {
                     employeeRow.push({ content: 'DESCANSO', styles: { halign: 'center', valign: 'middle', fontSize: 7, fontStyle: 'italic', textColor: [255, 0, 0]} }); // Smaller italic red
                  } else {
                     employeeRow.push({ content: ' ', styles: { halign: 'center', valign: 'middle' } }); // Empty space for no shift on weekdays
                  }
             }
         });

         // Add total hours for the week if the employee worked
         if (hasShiftThisWeek) {
             employeeRow.push({ content: totalHoursWeek.toFixed(1), styles: { halign: 'right', valign: 'middle', fontStyle: 'bold', fontSize: 8 } });
             totalHoursGrandTotal += totalHoursWeek; // Add to grand total
         } else {
            // Optionally add placeholder or leave empty if no shifts
             // Check if weekends are marked as descanso
             const descansoWeekend = allLocationData[0].weekDates.every(date => {
                const dayOfWeek = getDay(date);
                return dayOfWeek === 6 || dayOfWeek === 0; // If only weekends visible? unlikely
             });
             if(descansoWeekend) {
                employeeRow.push({ content: 'DESC', styles: { halign: 'right', valign: 'middle', fontSize: 7, fontStyle: 'italic' } });
             } else {
                employeeRow.push({ content: '0.0', styles: { halign: 'right', valign: 'middle', fontSize: 8 } }); // Show 0.0 if no shifts
             }
         }

         body.push(employeeRow);
     });

     // Add HR TOTAL column to header
     head[0].push({ content: 'HR TOTAL', styles: { halign: 'center', valign: 'middle' } });

     // Add Grand Total Row
      const grandTotalRow: any[] = [
         { content: 'TOTAL HORAS SEMANA:', colSpan: allLocationData[0].weekDates.length + 1, styles: { halign: 'right', fontStyle: 'bold', fontSize: 10 } },
         { content: totalHoursGrandTotal.toFixed(1), styles: { halign: 'right', fontStyle: 'bold', fontSize: 10 } }
      ];
      body.push(grandTotalRow);


    // --- Draw Table ---
    autoTable(doc, {
        head: head,
        body: body,
        startY: currentY,
        theme: 'grid',
        headStyles: {
            fillColor: [76, 67, 223], // Primary color
            textColor: [255, 255, 255],
            fontSize: 9,
            lineWidth: 0.5,
            lineColor: [200, 200, 200]
        },
        columnStyles: {
             0: { cellWidth: 100, fontStyle: 'bold' }, // Employee name column
              // Styles for day columns + HR TOTAL column
             ...Array.from({ length: allLocationData[0].weekDates.length + 1 }).reduce((styles, _, index) => {
                 if (index < allLocationData[0].weekDates.length) { // Day columns
                     styles[index + 1] = { cellWidth: 'auto', halign: 'center', fontSize: 8 };
                 } else { // HR TOTAL column
                     styles[index + 1] = { cellWidth: 40, halign: 'right', fontStyle: 'bold', fontSize: 8 };
                 }
                 return styles;
             }, {} as any)
        },
        styles: {
            cellPadding: 3, // Reduced padding
            fontSize: 8,
            overflow: 'linebreak',
            lineWidth: 0.5,
            lineColor: [200, 200, 200]
        },
        didDrawPage: (hookData) => {
            currentY = hookData.cursor?.y ?? currentY;
             const pageNum = doc.internal.getNumberOfPages();
             addHeaderAndWatermark(doc, 10); // Add watermark near top
             doc.setFontSize(8);
             doc.setTextColor(150);
             doc.text(`Página ${pageNum}`, pageWidth - rightMargin, pageHeight - 10, { align: 'right' });
             doc.setTextColor(0); // Reset text color
        }
    });

    // --- Save the PDF ---
    const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
    const filename = `Horario_Consolidado_${timestamp}.pdf`;
    doc.save(filename);
}

// Helper to parse HH:MM to minutes (consider moving to utils)
const parseTimeToMinutes = (timeStr: string): number => {
    if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
};
