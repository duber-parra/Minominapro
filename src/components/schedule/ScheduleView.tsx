import React from 'react';
import type { Department, ScheduleData } from '@/types/schedule'; // Assuming types exist
import { DepartmentColumn } from './DepartmentColumn'; // Assuming DepartmentColumn component exists
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'; // Added CardFooter
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '../ui/button';
import { Plus, Copy, Eraser } from 'lucide-react'; // Added Copy icon, Eraser
import type { Employee } from '@/types/schedule';
import { cn } from '@/lib/utils'; // Import cn

interface ScheduleViewProps {
  departments: Department[];
  scheduleData: { [dateKey: string]: ScheduleData }; // Now a map of dateKey to ScheduleData
  onRemoveShift: (dateKey: string, departmentId: string, assignmentId: string) => void;
  viewMode: 'day' | 'week';
  weekDates: Date[];
  currentDate: Date; // For day view
  onAssign: (employee: Employee, departmentId: string, date: Date) => void; // Handler for adding shift via button
  getScheduleForDate: (date: Date) => ScheduleData; // Function to get schedule for a specific date
  onDuplicateDay: (sourceDate: Date) => void; // Add prop for duplicating a day's schedule
  onClearDay: (dateToClear: Date) => void; // Add prop for clearing a day's schedule
  isHoliday: (date: Date | null | undefined) => boolean; // Function to check if a date is a holiday
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({
    departments,
    scheduleData,
    onRemoveShift,
    viewMode,
    weekDates,
    currentDate,
    onAssign,
    getScheduleForDate, // Receive helper function
    onDuplicateDay, // Receive duplicate handler
    onClearDay, // Receive clear handler
    isHoliday, // Receive holiday check function
}) => {

    if (viewMode === 'day') {
         // --- Day View ---
        const daySchedule = getScheduleForDate(currentDate);
        const dynamicGridClass = `grid-cols-1 sm:grid-cols-2 lg:grid-cols-${Math.min(departments.length, 4)} xl:grid-cols-${Math.min(departments.length, 5)}`; // Adjust as needed
        const isCurrentHoliday = isHoliday(currentDate);

        return (
            <Card className={cn(
                "shadow-md bg-card border",
                isCurrentHoliday ? "border-primary" : "border-border" // Highlight border if holiday
            )}>
                <CardHeader className="border-b">
                    <CardTitle className={cn(
                        "text-lg font-medium",
                        isCurrentHoliday ? "text-primary font-semibold" : "text-foreground" // Highlight text if holiday
                    )}>
                        Horario para el {format(currentDate, 'EEEE, d MMMM yyyy', { locale: es })}
                        {isCurrentHoliday && <span className="text-xs font-normal ml-2">(Festivo)</span>}
                    </CardTitle>
                    {/* Add description or other info if needed */}
                </CardHeader>
                <CardContent className="p-4">
                    {departments.length > 0 ? (
                        <div className={`grid ${dynamicGridClass} gap-4`}>
                            {departments.map((department) => (
                                <DepartmentColumn
                                    key={department.id}
                                    department={department}
                                    assignments={daySchedule.assignments[department.id] || []}
                                    onRemoveShift={(deptId, assignId) => onRemoveShift(format(currentDate, 'yyyy-MM-dd'), deptId, assignId)}
                                    date={currentDate} // Pass the date
                                    onAssign={onAssign} // Pass assign handler
                                />
                            ))}
                        </div>
                    ) : (
                         <p className="text-center text-muted-foreground italic py-4">
                             No hay departamentos definidos para esta sede. Agrega departamentos en la sección de configuración.
                         </p>
                    )}
                </CardContent>
            </Card>
        );
    } else {
        // --- Week View ---
         // Map the dates to Card components first
         const weekViewContent = weekDates.map((date, index) => {
            const daySchedule = getScheduleForDate(date);
            const dateKey = format(date, 'yyyy-MM-dd');
            const totalAssignmentsForDay = Object.values(daySchedule.assignments).reduce((sum, deptAssignments) => sum + deptAssignments.length, 0);
            const isLastDayOfWeek = index === weekDates.length - 1; // Check if it's the last day
            const isCurrentHoliday = isHoliday(date); // Check if this specific date is a holiday

            // Card represents a single day column in the week view
            return (
                <Card key={dateKey} className={cn(
                    "shadow-sm bg-card border flex flex-col min-w-[140px]", // Adjusted min-width
                    isCurrentHoliday ? "border-primary" : "border-border/50" // Highlight border with primary color
                )}>
                    <CardHeader className={cn(
                        "pb-2 pt-3 px-3 border-b relative",
                        isCurrentHoliday ? "border-primary" : "border-border/50" // Match border color
                    )}>
                        <CardTitle className={cn(
                            "text-sm font-medium text-center whitespace-nowrap", // Reduced size, nowrap
                            isCurrentHoliday ? "text-primary font-semibold" : "text-foreground" // Highlight title text with primary color
                        )}>
                            {format(date, 'EEE d', { locale: es })} {/* Short day name, date */}
                        </CardTitle>
                        <CardDescription className="text-[10px] text-muted-foreground text-center"> {/* Smaller description */}
                            {format(date, 'MMM', { locale: es })} ({totalAssignmentsForDay}) {/* Short month, count */}
                            {isCurrentHoliday && <span className="text-primary block text-[9px] font-medium">Festivo</span>} {/* Use primary color for Festivo text */}
                        </CardDescription>
                         {/* Action Buttons: Duplicate and Clear */}
                        <div className="absolute top-1 right-1 flex flex-col gap-0.5">
                            {/* Duplicate button for all days except the last one */}
                            {!isLastDayOfWeek && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground opacity-50 hover:opacity-100"
                                    onClick={() => onDuplicateDay(date)}
                                    title="Duplicar al día siguiente"
                                >
                                    <Copy className="h-3 w-3" />
                                </Button>
                            )}
                            {/* Clear Day Button */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 p-0 text-destructive hover:text-destructive opacity-50 hover:opacity-100"
                                onClick={() => onClearDay(date)} // Trigger clear confirmation
                                title="Limpiar turnos del día"
                                disabled={totalAssignmentsForDay === 0} // Disable if no assignments
                            >
                                <Eraser className="h-3 w-3" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-1.5 space-y-2 flex-grow overflow-y-auto"> {/* Reduced padding, smaller space */}
                        {departments.length > 0 ? (
                            departments.map((department) => (
                                <div key={department.id} className="border rounded-md p-1.5 bg-muted/10"> {/* Reduced padding, lighter bg */}
                                    <div className="flex justify-between items-center mb-1">
                                        <h4 className="text-[11px] font-semibold text-foreground flex items-center gap-1 whitespace-nowrap overflow-hidden text-ellipsis"> {/* Smaller title, ellipsis */}
                                             {department.icon && <department.icon className="h-2.5 w-2.5 text-muted-foreground" />} {/* Smaller icon */}
                                             <span className="overflow-hidden text-ellipsis">{department.name}</span> {/* Ellipsis for name */}
                                        </h4>
                                    </div>
                                    <DepartmentColumn
                                        department={department}
                                        assignments={daySchedule.assignments[department.id] || []}
                                        onRemoveShift={(deptId, assignId) => onRemoveShift(dateKey, deptId, assignId)}
                                        isWeekView // Indicate week view for potentially different rendering
                                        date={date}
                                        onAssign={onAssign}
                                    />
                                </div>
                            ))
                         ) : (
                              <p className="text-center text-xs text-muted-foreground italic pt-2"> {/* Smaller padding */}
                                  No hay deptos.
                              </p>
                         )}
                    </CardContent>
                    {/* Optional Footer can be added here if needed */}
                    {/* <CardFooter className="p-1.5 border-t">
                        <Button variant="outline" size="xs" className="w-full">Acción</Button>
                    </CardFooter> */}
                </Card>
            );
         });

         // Use CSS Grid for the container to manage column widths
         return (
            <div className="grid grid-cols-7 gap-2 w-full"> {/* Grid with 7 columns and smaller gap */}
                {weekViewContent}
            </div>
        );
    }
};
