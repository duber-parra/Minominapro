import React, { useState, useEffect } from 'react'; // Added useState, useEffect
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
  const [isClient, setIsClient] = useState(false); // State for client-side rendering check

  useEffect(() => {
    setIsClient(true); // Set to true after initial mount
  }, []);

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
                 <CardFooter className="flex justify-end gap-2 border-t pt-4">
                     {/* Duplicate Button */}
                     <Button
                         variant="outline"
                         size="sm"
                         onClick={() => onDuplicateDay(currentDate)}
                         title="Duplicar horario al día siguiente"
                         // Disable if it's the last day of the week maybe? Or handle in the function itself.
                     >
                         <Copy className="mr-2 h-4 w-4" /> Duplicar Día Sig.
                     </Button>
                      {/* Clear Day Button */}
                     <Button
                         variant="destructive"
                         size="sm"
                         onClick={() => onClearDay(currentDate)} // Trigger clear confirmation
                         title="Limpiar turnos del día"
                         disabled={Object.values(daySchedule.assignments).flat().length === 0} // Disable if no assignments
                     >
                         <Eraser className="mr-2 h-4 w-4" /> Limpiar Día
                     </Button>
                 </CardFooter>
            </Card>
        );
    } else {
         // --- Week View ---
         const weekViewContent = (
            <div className="grid grid-cols-7 gap-1 min-w-[1000px]"> {/* Reduced gap, ensure min-width */}
              {weekDates.map((date, index) => {
                  const daySchedule = getScheduleForDate(date);
                  const dateKey = format(date, 'yyyy-MM-dd');
                   // Calculate count only on client to avoid hydration mismatch
                   const totalAssignmentsForDay = isClient
                       ? Object.values(daySchedule.assignments).reduce((sum, deptAssignments) => sum + deptAssignments.length, 0)
                       : 0; // Show 0 during SSR and initial render
                  const isLastDayOfWeek = index === weekDates.length - 1;
                  const isCurrentHoliday = isHoliday(date);

                  // Card represents a single day column in the week view
                  return (
                      <div key={dateKey} className="flex flex-col h-full"> {/* Ensure day column takes height */}
                          <Card className={cn(
                              "shadow-sm bg-card border flex flex-col flex-grow", // Use flex-grow
                              isCurrentHoliday ? "border-primary border-2" : "border-border/50" // Thicker primary border for holiday
                          )}>
                              <CardHeader className={cn(
                                  "pb-2 pt-3 px-2 border-b relative", // Reduced padding
                                  isCurrentHoliday ? "border-primary" : "border-border/50" // Match border color
                              )}>
                                  <CardTitle className={cn(
                                      "text-xs font-semibold text-center whitespace-nowrap", // Adjusted size to xs, kept font-semibold
                                      isCurrentHoliday ? "text-primary" : "text-foreground" // Highlight title text with primary color
                                  )}>
                                      {format(date, 'EEE d', { locale: es })} {/* Short day name, date */}
                                  </CardTitle>
                                  <CardDescription className="text-[10px] text-muted-foreground text-center"> {/* Extra small text */}
                                      {format(date, 'MMM', { locale: es })} ({totalAssignmentsForDay})
                                      {isCurrentHoliday && <span className="text-primary block font-medium">Festivo</span>} {/* Use primary color for Festivo text */}
                                  </CardDescription>
                                  {/* Action Buttons: Duplicate and Clear */}
                                  <div className="absolute top-0.5 right-0.5 flex flex-col gap-0"> {/* Reduced gap, adjusted position */}
                                      {!isLastDayOfWeek && (
                                          <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-4 w-4 p-0 text-muted-foreground hover:text-foreground opacity-50 hover:opacity-100"
                                              onClick={() => onDuplicateDay(date)}
                                              title="Duplicar al día siguiente"
                                          >
                                              <Copy className="h-2.5 w-2.5" /> {/* Smaller icon */}
                                          </Button>
                                      )}
                                      <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-4 w-4 p-0 text-destructive hover:text-destructive opacity-50 hover:opacity-100"
                                          onClick={() => onClearDay(date)}
                                          title="Limpiar turnos del día"
                                          disabled={totalAssignmentsForDay === 0}
                                      >
                                          <Eraser className="h-2.5 w-2.5" /> {/* Smaller icon */}
                                      </Button>
                                  </div>
                              </CardHeader>
                              <CardContent className="p-1 space-y-1 flex-grow overflow-y-auto"> {/* Reduced padding, smaller space */}
                                  {departments.length > 0 ? (
                                      departments.map((department) => (
                                          <div key={department.id} className="border rounded-sm p-1 bg-muted/10 relative"> {/* Reduced padding/rounding, lighter bg */}
                                              <div className="flex justify-between items-center mb-0.5"> {/* Reduced margin */}
                                                  <h4 className="text-[10px] font-semibold text-foreground flex items-center gap-0.5 whitespace-nowrap overflow-hidden text-ellipsis pr-4"> {/* Extra small, reduced gap/padding */}
                                                       {department.icon && <department.icon className="h-2.5 w-2.5 text-muted-foreground" />} {/* Smaller icon */}
                                                       <span className="overflow-hidden text-ellipsis">{department.name}</span>
                                                  </h4>
                                              </div>
                                              <DepartmentColumn
                                                  department={department}
                                                  assignments={daySchedule.assignments[department.id] || []}
                                                  onRemoveShift={(deptId, assignId) => onRemoveShift(dateKey, deptId, assignId)}
                                                  isWeekView
                                                  date={date}
                                                  onAddShiftRequest={onAddShiftRequest}
                                                  onShiftClick={onShiftClick}
                                              />
                                          </div>
                                      ))
                                   ) : (
                                        <p className="text-center text-[10px] text-muted-foreground italic pt-1"> {/* Smaller text/padding */}
                                            No hay deptos.
                                        </p>
                                   )}
                              </CardContent>
                          </Card>
                      </div>
                  );
              })}
            </div>
          );

         // Return the scrollable container wrapping the week view content
         return weekViewContent;
    }
};

    