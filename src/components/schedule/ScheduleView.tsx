
import React from 'react';
import type { Department, ScheduleData } from '@/types/schedule'; // Assuming types exist
import { DepartmentColumn } from './DepartmentColumn'; // Assuming DepartmentColumn component exists
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '../ui/button';
import { Plus } from 'lucide-react';
import type { Employee } from '@/types/schedule';

interface ScheduleViewProps {
  departments: Department[];
  scheduleData: { [dateKey: string]: ScheduleData }; // Now a map of dateKey to ScheduleData
  onRemoveShift: (dateKey: string, departmentId: string, assignmentId: string) => void;
  viewMode: 'day' | 'week';
  weekDates: Date[];
  currentDate: Date; // For day view
  onAssign: (employee: Employee, departmentId: string, date: Date) => void; // Handler for adding shift via button
  getScheduleForDate: (date: Date) => ScheduleData; // Function to get schedule for a specific date
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({
    departments,
    scheduleData,
    onRemoveShift,
    viewMode,
    weekDates,
    currentDate,
    onAssign, // Receive assignment handler
    getScheduleForDate, // Receive helper function
}) => {

    if (viewMode === 'day') {
        // --- Day View ---
        const daySchedule = getScheduleForDate(currentDate);
        const dynamicGridClass = `grid-cols-1 sm:grid-cols-2 lg:grid-cols-${Math.min(departments.length, 4)} xl:grid-cols-${Math.min(departments.length, 5)}`; // Adjust as needed

        return (
            <Card className="shadow-md bg-card border border-border">
                <CardHeader className="border-b">
                    <CardTitle className="text-lg font-medium text-foreground">
                        Horario para el {format(currentDate, 'EEEE, d MMMM yyyy', { locale: es })}
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
        const weekViewContent = weekDates.map((date) => {
            const daySchedule = getScheduleForDate(date);
            const dateKey = format(date, 'yyyy-MM-dd');
            const totalAssignmentsForDay = Object.values(daySchedule.assignments).reduce((sum, deptAssignments) => sum + deptAssignments.length, 0);

            return (
                <Card key={dateKey} className="shadow-md bg-card border border-border min-w-[300px] sm:min-w-[350px] flex flex-col">
                    <CardHeader className="pb-3 pt-4 px-4 border-b">
                        <CardTitle className="text-base font-medium text-foreground text-center">
                            {format(date, 'EEE d', { locale: es })}
                        </CardTitle>
                        <CardDescription className="text-xs text-muted-foreground text-center">
                            {format(date, 'MMMM', { locale: es })} ({totalAssignmentsForDay} turnos)
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-3 space-y-3 flex-grow overflow-y-auto">
                        {departments.length > 0 ? (
                            departments.map((department) => (
                                <div key={department.id} className="border rounded-md p-2 bg-muted/20">
                                    <div className="flex justify-between items-center mb-1">
                                        <h4 className="text-xs font-semibold text-foreground flex items-center gap-1">
                                             {department.icon && <department.icon className="h-3 w-3 text-muted-foreground" />}
                                             {department.name}
                                        </h4>
                                         {/* Add shift button - potentially simplified view for week */}
                                         {/* <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onAssign( /* needs employee info*/ , department.id, date)}>
                                             <Plus className="h-3 w-3" />
                                         </Button> */}
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
                              <p className="text-center text-xs text-muted-foreground italic pt-4">
                                  No hay departamentos.
                              </p>
                         )}
                    </CardContent>
                </Card>
            );
        });

        // Then return the container div rendering the mapped content
        return (
            <div className="flex space-x-4 overflow-x-auto pb-4">
                {weekViewContent}
            </div>
        );
    }
};
