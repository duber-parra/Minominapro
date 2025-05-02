// src/lib/schedule-pdf-exporter.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ScheduleData, Department, Employee, ShiftAssignment } from '@/types/schedule';

// Extend jsPDF interface for autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface ScheduleExportData {
    locationName: string;
    weekDates: Date[];
    departments: Department[];
    employees: Employee[]; // List of all employees for the selected location
    scheduleData: { [dateKey: string]: ScheduleData };
    getScheduleForDate: (date: Date) => ScheduleData;
    calculateShiftDuration: (assignment: ShiftAssignment, shiftDate: Date) => number;
}

export function exportScheduleToPDF(data: ScheduleExportData): void {
    const doc = new jsPDF({
        orientation: 'landscape', // Landscape for week view
        unit: 'pt', // Use points for better precision
        format: 'a4' // Standard A4 size
    });

    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    let currentY = 40; // Start position for content (with margin)
    const leftMargin = 40;
    const rightMargin = 40;
    const tableWidth = pageWidth - leftMargin - rightMargin;

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

    // Group employees by department for the PDF structure
    const employeesByDept: { [deptId: string]: Employee[] } = {};
    data.employees.forEach(emp => {
        // Find which department the employee worked in *most* this week, or just use primary?
        // For simplicity, let's group by primary department for now.
        // A more complex logic might group by actual assignments.
        // We need to iterate through all assignments to build rows per employee.

        // Alternative: Iterate departments, then employees assigned to that dept
    });


    data.departments.forEach(dept => {
         // Add Department Row
         body.push([
             {
                 content: `${dept.name} (${data.employees.filter(e => {
                     // Check if employee has any shift in this dept this week
                     return data.weekDates.some(date => {
                         const daySchedule = data.getScheduleForDate(date);
                         return (daySchedule.assignments[dept.id] || []).some(a => a.employee.id === e.id);
                     });
                 }).length} empleados)`,
                 colSpan: data.weekDates.length + 1, // Span across all columns
                 styles: { fontStyle: 'bold', fillColor: [230, 230, 230], textColor: [0, 0, 0] } // Gray background
             }
         ]);

        // Find employees who have at least one shift in this department during the week
        const deptEmployees = data.employees.filter(emp =>
            data.weekDates.some(date => {
                const daySchedule = data.getScheduleForDate(date);
                return (daySchedule.assignments[dept.id] || []).some(a => a.employee.id === emp.id);
            })
        );


        // Add Employee Rows for this department
        deptEmployees.forEach(emp => {
             const employeeRow: any[] = [{ content: emp.name, styles: { valign: 'middle' } }]; // First cell is employee name

             data.weekDates.forEach(date => {
                const daySchedule = data.getScheduleForDate(date);
                const assignment = (daySchedule.assignments[dept.id] || []).find(a => a.employee.id === emp.id);

                if (assignment) {
                    let cellContent = `${assignment.startTime} - ${assignment.endTime}`;
                    if (assignment.includeBreak && assignment.breakStartTime && assignment.breakEndTime) {
                        // Calculate break duration in minutes
                        const breakStartMins = parseTimeToMinutes(assignment.breakStartTime);
                        const breakEndMins = parseTimeToMinutes(assignment.breakEndTime);
                        const breakDurationMins = breakEndMins > breakStartMins ? breakEndMins - breakStartMins : 0;
                        if(breakDurationMins > 0) {
                            cellContent += `\nDescanso: ${breakDurationMins}min`;
                        }
                    }
                     employeeRow.push({ content: cellContent, styles: { halign: 'center', valign: 'middle', fontSize: 8 } });
                } else {
                     employeeRow.push({ content: 'Sin turno', styles: { halign: 'center', valign: 'middle', textColor: [150, 150, 150], fontSize: 8 } }); // Gray text for "Sin turno"
                }
             });
             body.push(employeeRow);
        });
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
        didDrawPage: (hookData) => { currentY = hookData.cursor?.y ?? currentY; }
    });

    // --- Save the PDF ---
    const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
    const filename = `Horario_Semanal_${data.locationName}_${timestamp}.pdf`;
    doc.save(filename);
}

// Helper to parse HH:MM to minutes (same as in page.tsx, consider moving to utils)
const parseTimeToMinutes = (timeStr: string): number => {
    if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
};
```