import React from 'react';
import type { Department, ScheduleData, ShiftAssignment } from '@/types/schedule'; // Assuming types exist, Added ShiftAssignment
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
  onAddShiftRequest: (departmentId: string, date: Date) => void; // New handler for '+' button click
  onShiftClick: (assignment: ShiftAssignment, date: Date, departmentId: string) => void; // Handler for clicking a shift card
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
    onAddShiftRequest, // Destructure new handler
    onShiftClick, // Destructure shift click handler
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
                        Horario para el {format(currentDate, 'PPPP', { locale: es })}
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
                                    onAddShiftRequest={onAddShiftRequest} // Pass new assign handler
                                    onShiftClick={onShiftClick} // Pass shift click handler
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
         // Restore original grid setup for week view
         const weekViewContent = weekDates.map((date, index) => {
            const daySchedule = getScheduleForDate(date);
            const dateKey = format(date, 'yyyy-MM-dd');
            const totalAssignmentsForDay = Object.values(daySchedule.assignments).reduce((sum, deptAssignments) => sum + deptAssignments.length, 0);
            const isLastDayOfWeek = index === weekDates.length - 1; // Check if it's the last day
            const isCurrentHoliday = isHoliday(date); // Check if this specific date is a holiday

            // Card represents a single day column in the week view
            return (
                <div key={dateKey} className={cn(
                    "flex flex-col",
                     // Removed explicit width styling
                )}>
                    <Card className={cn(
                        "shadow-sm bg-card border flex flex-col flex-grow", // Use flex-grow
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
                                    <div key={department.id} className="border rounded-md p-1.5 bg-muted/10 relative"> {/* Reduced padding, lighter bg, relative positioning */}
                                        <div className="flex justify-between items-center mb-1">
                                            <h4 className="text-[11px] font-semibold text-foreground flex items-center gap-1 whitespace-nowrap overflow-hidden text-ellipsis pr-5"> {/* Added padding-right for icon */}
                                                 {department.icon && <department.icon className="h-2.5 w-2.5 text-muted-foreground" />} {/* Smaller icon */}
                                                 <span className="overflow-hidden text-ellipsis">{department.name}</span> {/* Ellipsis for name */}
                                            </h4>
                                             {/* Add + Button for Mobile/Tablet - Moved to DepartmentColumn */}
                                        </div>
                                        <DepartmentColumn
                                            department={department}
                                            assignments={daySchedule.assignments[department.id] || []}
                                            onRemoveShift={(deptId, assignId) => onRemoveShift(dateKey, deptId, assignId)}
                                            isWeekView // Indicate week view for potentially different rendering
                                            date={date}
                                            onAddShiftRequest={onAddShiftRequest} // Pass new assign handler
                                            onShiftClick={onShiftClick} // Pass shift click handler
                                        />
                                    </div>
                                ))
                             ) : (
                                  <p className="text-center text-xs text-muted-foreground italic pt-2"> {/* Smaller padding */}
                                      No hay deptos.
                                  </p>
                             )}
                        </CardContent>
                    </Card>
                </div>
            );
         });

         // Restore the original grid layout instead of flex with scroll
         return (
             <div className="grid grid-cols-1 md:grid-cols-7 gap-2"> {/* Reverted to grid with 7 columns on medium screens and up */}
                 {weekViewContent}
             </div>
         );
    }
};