
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { arrayMove, SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, Plus, Save, Copy, Users, Building, Briefcase, Warehouse, ChevronLeft, ChevronRight } from 'lucide-react'; // Added Chevron icons
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addDays, addWeeks, subWeeks, isSameDay } from 'date-fns'; // Added addWeeks, subWeeks, isSameDay
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

// Placeholder components - replace with actual implementation later
import { LocationSelector } from '@/components/schedule/LocationSelector';
import { ScheduleView } from '@/components/schedule/ScheduleView';
import { EmployeeList } from '@/components/schedule/EmployeeList';
import { ShiftDetailModal } from '@/components/schedule/ShiftDetailModal'; // Placeholder

// Placeholder Types - Define these properly in types/schedule.ts
// Assuming these types exist in a dedicated types file
import type { Location, Department, Employee, ShiftAssignment, ShiftDetails, ScheduleData, PayrollCalculationInput } from '@/types/schedule'; // Added PayrollCalculationInput

// Mock Data (Replace with API calls or context later)
const MOCK_LOCATIONS: Location[] = [
  { id: 'sede-1', name: 'Sede Principal Centro' },
  { id: 'sede-2', name: 'Sucursal Norte' },
];

const MOCK_DEPARTMENTS: Department[] = [
  { id: 'dep-1', name: 'Cocina', locationId: 'sede-1', icon: Briefcase },
  { id: 'dep-2', name: 'Salón', locationId: 'sede-1', icon: Users },
  { id: 'dep-3', name: 'Caja & Barra', locationId: 'sede-1', icon: Users }, // Example generic icon
  { id: 'dep-4', name: 'Bodega', locationId: 'sede-1', icon: Warehouse }, // Specific icon
  { id: 'dep-5', name: 'Cocina Norte', locationId: 'sede-2', icon: Briefcase },
  { id: 'dep-6', name: 'Salón Norte', locationId: 'sede-2', icon: Users },
];

const MOCK_EMPLOYEES: Employee[] = [
  { id: 'emp-1', name: 'Ana García', primaryLocationId: 'sede-1' },
  { id: 'emp-2', name: 'Carlos Ruiz', primaryLocationId: 'sede-1' },
  { id: 'emp-3', name: 'Luisa Fernández', primaryLocationId: 'sede-1' },
  { id: 'emp-4', name: 'Jorge Martinez', primaryLocationId: 'sede-1' },
  { id: 'emp-5', name: 'Pedro Ramirez', primaryLocationId: 'sede-2' },
  { id: 'emp-6', name: 'Maria Lopez', primaryLocationId: 'sede-2' },
];

// Helper to get initial schedule data structure
const getInitialScheduleData = (departments: Department[], selectedDate: Date): ScheduleData => {
    const data: ScheduleData = { date: selectedDate, assignments: {} };
    departments.forEach(dep => {
        data.assignments[dep.id] = [];
    });
    return data;
};

// Helper to calculate break duration in minutes (basic implementation)
const calculateBreakDuration = (start?: string, end?: string): number => {
    if (!start || !end) return 0;
    try {
        const [startH, startM] = start.split(':').map(Number);
        const [endH, endM] = end.split(':').map(Number);
        const startDate = new Date(0, 0, 0, startH, startM);
        let endDate = new Date(0, 0, 0, endH, endM);
        // Basic handling if break crosses midnight (add a day to end date) - unlikely for breaks
        if (endDate < startDate) {
            endDate.setDate(endDate.getDate() + 1);
        }
        const diffMs = endDate.getTime() - startDate.getTime();
        return Math.round(diffMs / (1000 * 60));
    } catch (e) {
        console.error("Error calculating break duration:", e);
        return 0;
    }
};

const weekStartsOn = 1; // Start week on Monday

export default function SchedulePage() {
  const { toast } = useToast();
  const [selectedLocationId, setSelectedLocationId] = useState<string | undefined>(MOCK_LOCATIONS[0]?.id);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily'); // State for view mode

  // State derived from selected location and date
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]); // Holds ALL employees for the location
  const [scheduleData, setScheduleData] = useState<ScheduleData>(
       getInitialScheduleData(MOCK_DEPARTMENTS.filter(d => d.locationId === selectedLocationId), selectedDate)
   );


  // State for the shift detail modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingAssignment, setPendingAssignment] = useState<{ employee: Employee, departmentId: string } | null>(null);


  // --- Calculate data for the selected week ---
   const currentWeekStart = useMemo(() => startOfWeek(selectedDate, { locale: es, weekStartsOn }), [selectedDate]);
   const currentWeekEnd = useMemo(() => endOfWeek(selectedDate, { locale: es, weekStartsOn }), [selectedDate]);
   const weekDates = useMemo(() => eachDayOfInterval({
       start: currentWeekStart,
       end: currentWeekEnd,
   }), [currentWeekStart, currentWeekEnd]);


  // --- Effects ---

  // Update departments and employees when location changes
  useEffect(() => {
    if (selectedLocationId) {
      const filteredDepartments = MOCK_DEPARTMENTS.filter(dep => dep.locationId === selectedLocationId);
      // Load ALL employees for the location, filtering happens before rendering EmployeeList
      const allLocationEmployees = MOCK_EMPLOYEES.filter(emp => emp.primaryLocationId === selectedLocationId);
      setDepartments(filteredDepartments);
      setEmployees(allLocationEmployees);
       // Reset schedule data when location changes or date changes
      setScheduleData(getInitialScheduleData(filteredDepartments, selectedDate));

    } else {
      setDepartments([]);
      setEmployees([]);
      setScheduleData(getInitialScheduleData([], selectedDate));
    }
     // Reset modal state
     setIsModalOpen(false);
     setPendingAssignment(null);
  }, [selectedLocationId, selectedDate]); // Rerun when location or date changes


    // --- Derived State: IDs of assigned employees ---
    const assignedEmployeeIds = useMemo(() => {
        const ids = new Set<string>();
        Object.values(scheduleData.assignments).flat().forEach(assignment => {
            ids.add(assignment.employee.id);
        });
        return ids;
    }, [scheduleData]);

    // --- Filtered Employees for the List ---
    const availableEmployees = useMemo(() => {
        return employees.filter(emp => !assignedEmployeeIds.has(emp.id));
    }, [employees, assignedEmployeeIds]);


  // --- Event Handlers ---

  const handleLocationChange = (locationId: string) => {
    setSelectedLocationId(locationId);
    // The useEffect hook will handle filtering and resetting schedule
  };

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
       // The useEffect hook will handle filtering and resetting schedule based on new date
    }
  };

  // --- Week Navigation Handlers ---
  const goToPreviousWeek = () => {
      setSelectedDate(subWeeks(selectedDate, 1));
  };

  const goToNextWeek = () => {
      setSelectedDate(addWeeks(selectedDate, 1));
  };


  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active && over && active.id !== over.id) {
       const employeeId = active.id as string;
       const targetId = over.id as string; // Could be department ID or another employee ID if sorting within list

       const employee = employees.find(emp => emp.id === employeeId);
       const department = departments.find(dep => dep.id === targetId); // Check if target is a department

       if (employee && department) {
           // Check if the employee is ALREADY assigned anywhere in the schedule for the selected day
           if (assignedEmployeeIds.has(employeeId)) {
                toast({
                    title: "Ya Asignado",
                    description: `${employee.name} ya tiene un turno asignado para este día (${format(selectedDate, 'PPP', { locale: es })}). Elimina el turno existente primero si deseas reasignarlo.`,
                    variant: "default",
                    duration: 5000,
                });
                return; // Stop the assignment process
           }

           console.log(`Assigning ${employee.name} to ${department.name}`);
            // Instead of directly adding, set state to open modal
            setPendingAssignment({ employee, departmentId: department.id });
            setIsModalOpen(true);
       }
       // Add logic here if you want to handle reordering within the EmployeeList (targetId would be another employee)
       // else if (target is another employee in the list) { ... handle reorder ... }
    }
  };

    // Updated to use new ShiftDetails structure
    const handleSaveShiftDetails = (details: ShiftDetails) => {
        if (pendingAssignment) {
            const { employee, departmentId } = pendingAssignment;
            const newAssignment: ShiftAssignment = {
                id: `shift-${Date.now()}-${employee.id}`, // Simple unique ID
                employee,
                startTime: details.startTime,
                endTime: details.endTime,
                includeBreak: details.includeBreak,
                breakStartTime: details.includeBreak ? details.breakStartTime : undefined,
                breakEndTime: details.includeBreak ? details.breakEndTime : undefined,
            };

             setScheduleData(prevData => {
                 const updatedAssignments = { ...prevData.assignments };
                 updatedAssignments[departmentId] = [...(updatedAssignments[departmentId] || []), newAssignment];
                 return { ...prevData, assignments: updatedAssignments };
             });

            toast({
                title: "Turno Asignado",
                description: `Turno de ${details.startTime} a ${details.endTime} para ${employee.name} en ${departments.find(d=>d.id === departmentId)?.name} el ${format(selectedDate, 'PPP', {locale: es})}.`,
            });
        }
        setIsModalOpen(false);
        setPendingAssignment(null);
    };

    const handleCancelShiftDetails = () => {
        setIsModalOpen(false);
        setPendingAssignment(null);
    };

    const handleRemoveShift = (departmentId: string, assignmentId: string) => {
         setScheduleData(prevData => {
             const updatedAssignments = { ...prevData.assignments };
             updatedAssignments[departmentId] = (updatedAssignments[departmentId] || []).filter(a => a.id !== assignmentId);
             return { ...prevData, assignments: updatedAssignments };
         });
         toast({
            title: "Turno Eliminado",
            variant: "destructive",
         });
    };

  const handleCalculatePayroll = () => {
      // 1. Gather Data for a specific employee and period (replace with actual selection logic)
      const targetEmployeeId = 'emp-1'; // Example: Calculate for Ana García
      const periodStartDate = startOfWeek(selectedDate, { locale: es, weekStartsOn: 1 }); // Example: Current week start
      const periodEndDate = endOfWeek(selectedDate, { locale: es, weekStartsOn: 1 }); // Example: Current week end
      const salarioBase = 711750; // Example base salary

      // 2. Filter assignments for the target employee within the period
      // This is a simplified example assuming scheduleData holds only one day.
      // In a real app, you'd query saved data for the entire period.
      const employeeShiftsForPeriod: ShiftAssignment[] = [];
      Object.values(scheduleData.assignments).flat().forEach(assignment => {
          if (assignment.employee.id === targetEmployeeId) {
              // Here, you'd also check if scheduleData.date is within the periodStartDate/periodEndDate
              // For this example, we assume scheduleData.date is the date we care about
               if (scheduleData.date >= periodStartDate && scheduleData.date <= periodEndDate) {
                   employeeShiftsForPeriod.push(assignment);
               }
          }
      });

       // 3. Structure the data for the Payroll Calculator
      const payrollInput: PayrollCalculationInput = {
          employeeId: targetEmployeeId,
          periodoInicio: format(periodStartDate, 'yyyy-MM-dd'),
          periodoFin: format(periodEndDate, 'yyyy-MM-dd'),
          salarioBasePeriodo: salarioBase,
          turnos: employeeShiftsForPeriod.map(turno => ({
              fecha: format(scheduleData.date, 'yyyy-MM-dd'), // Use the date from scheduleData
              horaEntrada: turno.startTime,
              horaSalida: turno.endTime,
              // Calculate duration from break start/end times if available
              duracionDescansoMinutos: turno.includeBreak
                  ? calculateBreakDuration(turno.breakStartTime, turno.breakEndTime)
                  : 0,
          })),
      };

       // 4. Send data to the Payroll Calculator
       // This might involve navigating to the calculator page with state, using context,
       // or calling an API endpoint if the calculator is a separate service.
       console.log("Enviando datos a la Calculadora de Nómina:", payrollInput);
       alert(`Simulación: Enviando datos para calcular nómina de ${targetEmployeeId}. Ver consola.`);

        // TODO: Implement actual navigation or data passing mechanism
        // Example (if using router and state):
        // router.push({
        //   pathname: '/', // Assuming calculator is at the root
        //   query: { payrollData: JSON.stringify(payrollInput) },
        // });
         toast({
            title: "Enviando a Calculadora",
            description: `Preparando datos de ${targetEmployeeId} para cálculo de nómina.`,
         });
  };


  // --- Placeholder Actions ---
  const handleSaveDay = () => {
    // TODO: Implement saving scheduleData to backend/localStorage
    console.log("Guardando horario diario:", scheduleData);
    toast({ title: 'Horario Guardado (Simulación)' });
  };

  const handleSaveTemplate = () => {
    // TODO: Implement saving current schedule as a template
    const templateName = prompt("Ingresa un nombre para la plantilla (formación):");
    if (templateName) {
      console.log("Guardando como plantilla:", templateName, scheduleData);
      toast({ title: `Plantilla "${templateName}" Guardada (Simulación)` });
    }
  };

  const handleDuplicateDay = () => {
    // TODO: Implement duplicating schedule to the next day
    const nextDay = addDays(selectedDate, 1);
    console.log(`Duplicando horario al ${format(nextDay, 'PPP', { locale: es })}`, scheduleData);
    // Need logic to load/save schedule for the next day potentially overwriting
    toast({ title: 'Horario Duplicado (Simulación)', description: `Se duplicó al ${format(nextDay, 'PPP', { locale: es })}.` });
    // Maybe update selectedDate to nextDay?
    // handleDateChange(nextDay);
  };


    // --- Optimisation for Weekly View ---
    const isWeeklyView = viewMode === 'weekly';


  return (
     <DndContext onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
        <main className={`container mx-auto p-4 md:p-8 max-w-full ${isWeeklyView ? 'weekly-view-optimised' : ''}`}> {/* Use max-w-full */}
            <h1 className="text-3xl font-bold text-center mb-8 text-foreground">Planificador de Horarios</h1>

            {/* --- Top Controls --- */}
            <Card className="mb-8 shadow-lg bg-card">
                <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl text-foreground">
                    <Building className="h-5 w-5" /> Configuración de Planificación
                </CardTitle>
                <CardDescription>
                    Selecciona la Sede y la fecha/semana para planificar los turnos.
                </CardDescription>
                </CardHeader>
                 <CardContent className="space-y-6"> {/* Increased space-y */}
                     {/* Row 1: Location and Week Navigation */}
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start"> {/* Changed to items-start */}
                         {/* Location Selector */}
                         <div className="space-y-2">
                             <label htmlFor="location-select" className="text-sm font-medium text-foreground">Sede</label>
                             <LocationSelector
                                 locations={MOCK_LOCATIONS}
                                 selectedLocationId={selectedLocationId}
                                 onLocationChange={handleLocationChange}
                             />
                         </div>

                         {/* Week Display and Navigation */}
                         <div className="md:col-span-2 space-y-2"> {/* Added space-y-2 */}
                             <label className="text-sm font-medium text-foreground">Semana</label>
                             <div className="flex items-center justify-between p-2 border rounded-md bg-secondary/30"> {/* Changed background */}
                                <div className="flex items-center gap-2">
                                    <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                                    <span className="font-medium text-foreground">
                                        Semana del {format(currentWeekStart, 'dd MMM', { locale: es })}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button variant="outline" size="icon" onClick={goToPreviousWeek} className="h-8 w-8">
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                             <Button
                                                 variant={'outline'}
                                                 size="sm"
                                                 className={cn(
                                                     'h-8 px-3 w-[100px] justify-center', // Fixed width and centered text
                                                     !selectedDate && 'text-muted-foreground'
                                                 )}
                                             >
                                                 {selectedDate ? format(selectedDate, 'EEE dd', { locale: es }) : <span>Sel.</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <Calendar
                                                mode="single"
                                                selected={selectedDate}
                                                onSelect={handleDateChange}
                                                initialFocus
                                                defaultMonth={selectedDate} // Center calendar on selected month
                                                locale={es}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <Button variant="outline" size="icon" onClick={goToNextWeek} className="h-8 w-8">
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                             </div>
                             {/* Simple Day Picker within the week */}
                             <div className="flex justify-center gap-1 pt-1 flex-wrap"> {/* Reduced pt-2 to pt-1 */}
                                {weekDates.map(day => (
                                    <Button
                                        key={day.toISOString()}
                                        variant={isSameDay(day, selectedDate) ? 'default' : 'outline'}
                                        size="sm"
                                         className={cn(
                                             'h-auto flex flex-col items-center px-2 py-1 leading-tight flex-1 min-w-[40px]', // Adjusted for better wrapping
                                             isSameDay(day, selectedDate)
                                                 ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                                                 : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                                         )}
                                        onClick={() => handleDateChange(day)}
                                    >
                                        <span className="text-xs uppercase">{format(day, 'EEE', { locale: es })}</span>
                                        <span className="font-semibold">{format(day, 'dd', { locale: es })}</span>
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Row 2: Action Buttons */}
                    <div className="flex flex-wrap gap-2 pt-4 border-t border-border"> {/* Added border */}
                        <Button onClick={handleSaveDay} variant="default" disabled={!selectedLocationId}>
                            <Save className="mr-2 h-4 w-4" /> Guardar Día
                        </Button>
                         <Button onClick={handleSaveTemplate} variant="outline" disabled={!selectedLocationId}>
                            Guardar Formación
                        </Button>
                        <Button onClick={handleDuplicateDay} variant="outline" disabled={!selectedLocationId}>
                            <Copy className="mr-2 h-4 w-4" /> Duplicar a Mañana
                        </Button>
                         {/* Add button to trigger Payroll Calculation */}
                         <Button variant="secondary" disabled={!selectedLocationId} onClick={handleCalculatePayroll}>
                            Calcular Nómina con Horario
                         </Button>
                    </div>
                </CardContent>
            </Card>

            {/* --- Main Scheduling Area --- */}
             {/* Conditional rendering for side panels based on view mode */}
            <div className={`grid grid-cols-1 gap-8 ${isWeeklyView ? 'lg:grid-cols-1' : 'lg:grid-cols-4'}`}>
                 {!isWeeklyView && (
                 <div className="lg:col-span-1">
                     {/* Pass the filtered list of available employees */}
                     <EmployeeList employees={availableEmployees} />
                 </div>
                 )}

                 <div className={`${isWeeklyView ? 'lg:col-span-1' : 'lg:col-span-3'}`}>
                     {selectedLocationId ? (
                        <ScheduleView
                            departments={departments}
                            scheduleData={scheduleData}
                            onRemoveShift={handleRemoveShift} // Pass the handler
                        />
                     ) : (
                         <Card className="text-center p-8 border-dashed bg-muted/50">
                            <CardHeader>
                                <CardTitle className="text-xl text-foreground">Selecciona una Sede</CardTitle>
                                <CardDescription>Elige una sede para empezar a planificar los horarios.</CardDescription>
                            </CardHeader>
                         </Card>
                     )}
                </div>
                 {!isWeeklyView && (
                    // Placeholder for potential right-side panel (e.g., shift details, stats)
                    <div className="lg:col-span-1">
                         {/* Add components for the right panel if needed */}
                    </div>
                )}
             </div>


            {/* Shift Detail Modal */}
            {pendingAssignment && (
                <ShiftDetailModal
                    isOpen={isModalOpen}
                    onClose={handleCancelShiftDetails}
                    onSave={handleSaveShiftDetails}
                    employeeName={pendingAssignment.employee.name}
                    departmentName={departments.find(d => d.id === pendingAssignment.departmentId)?.name || 'Departamento desconocido'}
                />
            )}
        </main>
     </DndContext>

  );
}

    