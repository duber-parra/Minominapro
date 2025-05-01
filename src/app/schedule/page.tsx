
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { arrayMove, SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, Plus, Save, Copy, Users, Building, Briefcase, Warehouse } from 'lucide-react'; // Added icons
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addDays } from 'date-fns';
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
import type { Location, Department, Employee, ShiftAssignment, ShiftDetails, ScheduleData } from '@/types/schedule';

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

export default function SchedulePage() {
  const { toast } = useToast();
  const [selectedLocationId, setSelectedLocationId] = useState<string | undefined>(MOCK_LOCATIONS[0]?.id);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily'); // State for view mode
  // const [weekDates, setWeekDates] = useState<Date[]>([]); // Dates for the selected week

  // State for schedule data { [departmentId]: ShiftAssignment[] }
  // const [schedule, setSchedule] = useState<ScheduleData>({});
  // State derived from selected location and date
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [scheduleData, setScheduleData] = useState<ScheduleData>(
       getInitialScheduleData(MOCK_DEPARTMENTS.filter(d => d.locationId === selectedLocationId), selectedDate)
   );


  // State for the shift detail modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingAssignment, setPendingAssignment] = useState<{ employee: Employee, departmentId: string } | null>(null);


  // --- Effects ---

  // Update departments and employees when location changes
  useEffect(() => {
    if (selectedLocationId) {
      const filteredDepartments = MOCK_DEPARTMENTS.filter(dep => dep.locationId === selectedLocationId);
      const filteredEmployees = MOCK_EMPLOYEES.filter(emp => emp.primaryLocationId === selectedLocationId);
      setDepartments(filteredDepartments);
      setEmployees(filteredEmployees);
       // Reset schedule data when location changes
      setScheduleData(getInitialScheduleData(filteredDepartments, selectedDate));

    } else {
      setDepartments([]);
      setEmployees([]);
      setScheduleData(getInitialScheduleData([], selectedDate));
    }
     // Reset modal state
     setIsModalOpen(false);
     setPendingAssignment(null);
  }, [selectedLocationId, selectedDate]); // Also update schedule when date changes


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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active && over && active.id !== over.id) {
       const employeeId = active.id as string;
       const departmentId = over.id as string; // Assuming department columns have IDs matching department IDs

        const employee = employees.find(emp => emp.id === employeeId);
        const department = departments.find(dep => dep.id === departmentId);

       if (employee && department) {
           // Prevent assigning to the same department multiple times on the same drag (simple check)
           if (!scheduleData.assignments[departmentId]?.some(a => a.employee.id === employeeId)) {
               console.log(`Assigning ${employee.name} to ${department.name}`);
                // Instead of directly adding, set state to open modal
                setPendingAssignment({ employee, departmentId });
                setIsModalOpen(true);
           } else {
               toast({
                   title: "Ya Asignado",
                   description: `${employee.name} ya tiene un turno asignado en ${department.name} para esta fecha.`,
                   variant: "default",
               });
           }
       }
    }
  };

    const handleSaveShiftDetails = (details: ShiftDetails) => {
        if (pendingAssignment) {
            const { employee, departmentId } = pendingAssignment;
            const newAssignment: ShiftAssignment = {
                id: `shift-${Date.now()}-${employee.id}`, // Simple unique ID
                employee,
                ...details, // Includes startTime, endTime, breakDurationMinutes
            };

             setScheduleData(prevData => {
                 const updatedAssignments = { ...prevData.assignments };
                 updatedAssignments[departmentId] = [...(updatedAssignments[departmentId] || []), newAssignment];
                 return { ...prevData, assignments: updatedAssignments };
             });

            toast({
                title: "Turno Asignado",
                description: `Turno de ${details.startTime} a ${details.endTime} para ${employee.name} en ${departments.find(d=>d.id === departmentId)?.name}.`,
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

   // --- Calculate data for the selected week ---
   const weekDates = eachDayOfInterval({
       start: startOfWeek(selectedDate, { locale: es, weekStartsOn: 1 }), // Assuming Monday start
       end: endOfWeek(selectedDate, { locale: es, weekStartsOn: 1 }),
   });

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
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    {/* Location Selector */}
                     <div className="space-y-2">
                        <label htmlFor="location-select" className="text-sm font-medium">Sede</label>
                         <LocationSelector
                            locations={MOCK_LOCATIONS}
                            selectedLocationId={selectedLocationId}
                            onLocationChange={handleLocationChange}
                        />
                     </div>


                    {/* Date Selector */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Fecha</label>
                        <Popover>
                        <PopoverTrigger asChild>
                            <Button
                            variant={'outline'}
                            className={cn(
                                'w-full justify-start text-left font-normal',
                                !selectedDate && 'text-muted-foreground'
                            )}
                            >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {selectedDate ? format(selectedDate, 'PPP', { locale: es }) : <span>Selecciona fecha</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={handleDateChange}
                            initialFocus
                            locale={es}
                            />
                        </PopoverContent>
                        </Popover>
                    </div>

                     {/* View Mode Selector (Optional - Placeholder) */}
                     {/* <div className="space-y-2">
                        <label htmlFor="view-mode-select" className="text-sm font-medium">Vista</label>
                         <Select value={viewMode} onValueChange={(value: 'daily' | 'weekly') => setViewMode(value)}>
                            <SelectTrigger id="view-mode-select">
                                <SelectValue placeholder="Seleccionar vista" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="daily">Diaria</SelectItem>
                                <SelectItem value="weekly">Semanal</SelectItem>
                            </SelectContent>
                        </Select>
                     </div> */}

                    {/* Action Buttons */}
                    <div className="md:col-span-3 flex flex-wrap gap-2 mt-4">
                        <Button onClick={handleSaveDay} variant="default" disabled={!selectedLocationId}>
                            <Save className="mr-2 h-4 w-4" /> Guardar Día
                        </Button>
                         <Button onClick={handleSaveTemplate} variant="outline" disabled={!selectedLocationId}>
                            Guardar Formación
                        </Button>
                        <Button onClick={handleDuplicateDay} variant="outline" disabled={!selectedLocationId}>
                            <Copy className="mr-2 h-4 w-4" /> Duplicar a Mañana
                        </Button>
                         {/* <Button variant="secondary">Asignar Descanso</Button> */}
                         {/* Add button to trigger Payroll Calculation */}
                         <Button variant="secondary" disabled={!selectedLocationId} onClick={() => alert('Funcionalidad "Calcular Nómina" pendiente.')}>
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
                     <EmployeeList employees={employees} />
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

    