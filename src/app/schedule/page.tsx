
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { arrayMove, SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Calendar as CalendarIcon, Plus, Save, Copy, Users, Building, Briefcase, Warehouse, ChevronLeft, ChevronRight, Edit, Trash2, Settings } from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addDays, addWeeks, subWeeks, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

// Placeholder components - replace with actual implementation later
import { LocationSelector } from '@/components/schedule/LocationSelector';
import { ScheduleView } from '@/components/schedule/ScheduleView';
import { EmployeeList } from '@/components/schedule/EmployeeList';
import { ShiftDetailModal } from '@/components/schedule/ShiftDetailModal';

// Placeholder Types - Define these properly in types/schedule.ts
import type { Location, Department, Employee, ShiftAssignment, ShiftDetails, ScheduleData, PayrollCalculationInput } from '@/types/schedule';

// --- Zod Schemas for Modals ---
const locationSchema = z.object({
  id: z.string().optional(), // Optional for creation, required for update
  name: z.string().min(1, { message: 'El nombre es requerido.' }),
});
type LocationFormValues = z.infer<typeof locationSchema>;

const departmentSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, { message: 'El nombre es requerido.' }),
  locationId: z.string({ required_error: 'Debe seleccionar una sede.' }),
});
type DepartmentFormValues = z.infer<typeof departmentSchema>;

const employeeSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, { message: 'El nombre es requerido.' }),
  primaryLocationId: z.string({ required_error: 'Debe seleccionar una sede principal.' }),
});
type EmployeeFormValues = z.infer<typeof employeeSchema>;

// --- Initial Mock Data (Now managed by state) ---
const INITIAL_LOCATIONS: Location[] = [
  { id: 'sede-1', name: 'Sede Principal Centro' },
  { id: 'sede-2', name: 'Sucursal Norte' },
];

const INITIAL_DEPARTMENTS: Department[] = [
  { id: 'dep-1', name: 'Cocina', locationId: 'sede-1', icon: Briefcase },
  { id: 'dep-2', name: 'Salón', locationId: 'sede-1', icon: Users },
  { id: 'dep-3', name: 'Caja & Barra', locationId: 'sede-1', icon: Users },
  { id: 'dep-4', name: 'Bodega', locationId: 'sede-1', icon: Warehouse },
  { id: 'dep-5', name: 'Cocina Norte', locationId: 'sede-2', icon: Briefcase },
  { id: 'dep-6', name: 'Salón Norte', locationId: 'sede-2', icon: Users },
];

const INITIAL_EMPLOYEES: Employee[] = [
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

  // --- State for Core Data (managed locally) ---
  const [locations, setLocations] = useState<Location[]>(INITIAL_LOCATIONS);
  const [departments, setDepartments] = useState<Department[]>(INITIAL_DEPARTMENTS);
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);

  // --- State for UI and Planning ---
  const [selectedLocationId, setSelectedLocationId] = useState<string | undefined>(locations[0]?.id);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily'); // State for view mode
  const [scheduleData, setScheduleData] = useState<ScheduleData>(
       getInitialScheduleData(departments.filter(d => d.locationId === selectedLocationId), selectedDate)
   );
  const [isModalOpen, setIsModalOpen] = useState(false); // For Shift Details
  const [pendingAssignment, setPendingAssignment] = useState<{ employee: Employee, departmentId: string } | null>(null);

  // --- State for Management Modals ---
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [isDepartmentModalOpen, setIsDepartmentModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // --- Derived State (Recalculates when core data or selections change) ---
  const filteredDepartments = useMemo(() => {
      return departments.filter(dep => dep.locationId === selectedLocationId);
  }, [departments, selectedLocationId]);

  const assignedEmployeeIds = useMemo(() => {
      const ids = new Set<string>();
      Object.values(scheduleData.assignments).flat().forEach(assignment => {
          ids.add(assignment.employee.id);
      });
      return ids;
  }, [scheduleData]);

  const availableEmployees = useMemo(() => {
      // Show employees belonging to the selected location AND not currently assigned on the schedule
      return employees.filter(emp => emp.primaryLocationId === selectedLocationId && !assignedEmployeeIds.has(emp.id));
  }, [employees, selectedLocationId, assignedEmployeeIds]);

  // --- Calculate data for the selected week ---
   const currentWeekStart = useMemo(() => startOfWeek(selectedDate, { locale: es, weekStartsOn }), [selectedDate]);
   const currentWeekEnd = useMemo(() => endOfWeek(selectedDate, { locale: es, weekStartsOn }), [selectedDate]);
   const weekDates = useMemo(() => eachDayOfInterval({
       start: currentWeekStart,
       end: currentWeekEnd,
   }), [currentWeekStart, currentWeekEnd]);


  // --- Effects ---

  // Reset schedule data when location or date changes
  useEffect(() => {
    if (selectedLocationId) {
      setScheduleData(getInitialScheduleData(filteredDepartments, selectedDate));
    } else {
      setScheduleData(getInitialScheduleData([], selectedDate));
    }
    // Reset modal state if location/date changes during assignment
    setIsModalOpen(false);
    setPendingAssignment(null);
  }, [selectedLocationId, selectedDate, filteredDepartments]); // Depend on derived state


  // --- Event Handlers ---

  const handleLocationChange = (locationId: string) => {
    setSelectedLocationId(locationId);
    // The useEffect hook will handle resetting schedule based on new date
  };

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
       // The useEffect hook will handle resetting schedule based on new date
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
       const targetId = over.id as string; // Could be department ID

       const employee = employees.find(emp => emp.id === employeeId);
       const department = departments.find(dep => dep.id === targetId); // Check if target is a department

       if (employee && department) {
           if (assignedEmployeeIds.has(employeeId)) {
                toast({
                    title: "Ya Asignado",
                    description: `${employee.name} ya tiene un turno asignado para este día (${format(selectedDate, 'PPP', { locale: es })}).`,
                    variant: "default",
                    duration: 4000,
                });
                return;
           }
           setPendingAssignment({ employee, departmentId: department.id });
           setIsModalOpen(true);
       }
    }
  };

    const handleSaveShiftDetails = (details: ShiftDetails) => {
        if (pendingAssignment) {
            const { employee, departmentId } = pendingAssignment;
            const newAssignment: ShiftAssignment = {
                id: `shift-${Date.now()}-${employee.id}`,
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
                description: `Turno de ${details.startTime} a ${details.endTime} para ${employee.name}.`,
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
      const targetEmployeeId = 'emp-1'; // Example
      const periodStartDate = startOfWeek(selectedDate, { locale: es, weekStartsOn: 1 });
      const periodEndDate = endOfWeek(selectedDate, { locale: es, weekStartsOn: 1 });
      const salarioBase = 711750;

      const employeeShiftsForPeriod: ShiftAssignment[] = [];
      Object.values(scheduleData.assignments).flat().forEach(assignment => {
          if (assignment.employee.id === targetEmployeeId) {
               if (scheduleData.date >= periodStartDate && scheduleData.date <= periodEndDate) {
                   employeeShiftsForPeriod.push(assignment);
               }
          }
      });

      const payrollInput: PayrollCalculationInput = {
          employeeId: targetEmployeeId,
          periodoInicio: format(periodStartDate, 'yyyy-MM-dd'),
          periodoFin: format(periodEndDate, 'yyyy-MM-dd'),
          salarioBasePeriodo: salarioBase,
          turnos: employeeShiftsForPeriod.map(turno => ({
              fecha: format(scheduleData.date, 'yyyy-MM-dd'),
              horaEntrada: turno.startTime,
              horaSalida: turno.endTime,
              duracionDescansoMinutos: turno.includeBreak
                  ? calculateBreakDuration(turno.breakStartTime, turno.breakEndTime)
                  : 0,
          })),
      };

       console.log("Enviando datos a la Calculadora de Nómina:", payrollInput);
       alert(`Simulación: Enviando datos para calcular nómina de ${targetEmployeeId}. Ver consola.`);
        toast({
            title: "Enviando a Calculadora",
            description: `Preparando datos de ${targetEmployeeId} para cálculo de nómina.`,
         });
  };


  // --- Management CRUD Handlers ---

  // Location Handlers
  const handleOpenLocationModal = (location: Location | null = null) => {
    setEditingLocation(location);
    setIsLocationModalOpen(true);
  };

  const handleSaveLocation = (values: LocationFormValues) => {
      // Simulate saving to backend/state
      if (editingLocation) {
          // Update
          setLocations(prev => prev.map(loc => loc.id === editingLocation.id ? { ...loc, name: values.name } : loc));
          toast({ title: "Sede Actualizada", description: `Sede "${values.name}" actualizada.` });
      } else {
          // Create
          const newLocation: Location = { id: `loc-${Date.now()}`, name: values.name };
          setLocations(prev => [...prev, newLocation]);
          toast({ title: "Sede Creada", description: `Sede "${values.name}" creada.` });
      }
      setIsLocationModalOpen(false);
      setEditingLocation(null);
  };

   const handleDeleteLocation = (locationId: string) => {
     if (!locationId) return;
     // Check if departments or employees are linked before deleting
     const isUsed = departments.some(d => d.locationId === locationId) || employees.some(e => e.primaryLocationId === locationId);
     if (isUsed) {
       toast({ title: "Error al Eliminar", description: "No se puede eliminar la sede porque tiene departamentos o colaboradores asignados.", variant: "destructive", duration: 5000 });
       return;
     }
     // Simulate deletion
     setLocations(prev => prev.filter(loc => loc.id !== locationId));
     // If the deleted location was selected, reset selection
     if (selectedLocationId === locationId) {
        setSelectedLocationId(locations.length > 1 ? locations.find(l => l.id !== locationId)?.id : undefined);
     }
     toast({ title: "Sede Eliminada", variant: "destructive" });
   };


  // Department Handlers
  const handleOpenDepartmentModal = (department: Department | null = null) => {
    setEditingDepartment(department);
    setIsDepartmentModalOpen(true);
  };

   const handleSaveDepartment = (values: DepartmentFormValues) => {
      // Simulate saving
      if (editingDepartment) {
          // Update
          setDepartments(prev => prev.map(dep => dep.id === editingDepartment.id ? { ...dep, name: values.name, locationId: values.locationId } : dep));
          toast({ title: "Departamento Actualizado" });
      } else {
          // Create
          const newDepartment: Department = { id: `dep-${Date.now()}`, name: values.name, locationId: values.locationId, icon: Briefcase }; // Default icon
          setDepartments(prev => [...prev, newDepartment]);
          toast({ title: "Departamento Creado" });
      }
      setIsDepartmentModalOpen(false);
      setEditingDepartment(null);
  };

  const handleDeleteDepartment = (departmentId: string) => {
    if (!departmentId) return;
     // Check if shifts are assigned before deleting
     const isUsed = Object.values(scheduleData.assignments[departmentId] || []).length > 0;
     if (isUsed) {
        toast({ title: "Error al Eliminar", description: "No se puede eliminar el departamento porque tiene turnos asignados.", variant: "destructive", duration: 5000 });
        return;
     }
    // Simulate deletion
    setDepartments(prev => prev.filter(dep => dep.id !== departmentId));
    toast({ title: "Departamento Eliminado", variant: "destructive" });
  };

  // Employee Handlers
  const handleOpenEmployeeModal = (employee: Employee | null = null) => {
    setEditingEmployee(employee);
    setIsEmployeeModalOpen(true);
  };

  const handleSaveEmployee = (values: EmployeeFormValues) => {
     // Simulate saving
     if (editingEmployee) {
         // Update
         setEmployees(prev => prev.map(emp => emp.id === editingEmployee.id ? { ...emp, name: values.name, primaryLocationId: values.primaryLocationId } : emp));
         toast({ title: "Colaborador Actualizado" });
     } else {
         // Create
         const newEmployee: Employee = { id: `emp-${Date.now()}`, name: values.name, primaryLocationId: values.primaryLocationId };
         setEmployees(prev => [...prev, newEmployee]);
         toast({ title: "Colaborador Creado" });
     }
     setIsEmployeeModalOpen(false);
     setEditingEmployee(null);
  };

  const handleDeleteEmployee = (employeeId: string) => {
     if (!employeeId) return;
      // Check if shifts are assigned before deleting
      const isUsed = Object.values(scheduleData.assignments).flat().some(a => a.employee.id === employeeId);
      if (isUsed) {
         toast({ title: "Error al Eliminar", description: "No se puede eliminar el colaborador porque tiene turnos asignados.", variant: "destructive", duration: 5000 });
         return;
      }
     // Simulate deletion
     setEmployees(prev => prev.filter(emp => emp.id !== employeeId));
     toast({ title: "Colaborador Eliminado", variant: "destructive" });
  };

    // --- Optimisation for Weekly View ---
    const isWeeklyView = viewMode === 'weekly';

    // --- Form Hooks for Modals ---
    const locationForm = useForm<LocationFormValues>({ resolver: zodResolver(locationSchema), defaultValues: { name: '' } });
    const departmentForm = useForm<DepartmentFormValues>({ resolver: zodResolver(departmentSchema), defaultValues: { name: '', locationId: '' } });
    const employeeForm = useForm<EmployeeFormValues>({ resolver: zodResolver(employeeSchema), defaultValues: { name: '', primaryLocationId: '' } });

    // Reset forms when modals open with editing data
    useEffect(() => { if (isLocationModalOpen) locationForm.reset(editingLocation ?? { name: '' }); }, [isLocationModalOpen, editingLocation, locationForm]);
    useEffect(() => { if (isDepartmentModalOpen) departmentForm.reset(editingDepartment ?? { name: '', locationId: '' }); }, [isDepartmentModalOpen, editingDepartment, departmentForm]);
    useEffect(() => { if (isEmployeeModalOpen) employeeForm.reset(editingEmployee ?? { name: '', primaryLocationId: '' }); }, [isEmployeeModalOpen, editingEmployee, employeeForm]);


  return (
     <DndContext onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
        <main className={`container mx-auto p-4 md:p-8 max-w-full ${isWeeklyView ? 'weekly-view-optimised' : ''}`}>
            <h1 className="text-3xl font-bold text-center mb-8 text-foreground">Planificador de Horarios</h1>

            {/* --- Top Controls --- */}
            <Card className="mb-8 shadow-lg bg-card">
                <CardHeader>
                 <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-xl text-foreground">
                            <Building className="h-5 w-5" /> Configuración de Planificación
                        </CardTitle>
                        <CardDescription>
                            Selecciona la Sede y la fecha/semana para planificar. Administra sedes, departamentos y colaboradores.
                        </CardDescription>
                    </div>
                     {/* Management Settings Trigger */}
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="icon" title="Administrar Datos">
                                <Settings className="h-5 w-5" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[600px]">
                            <DialogHeader>
                                <DialogTitle>Administrar Datos Base</DialogTitle>
                                <DialogDescription>Gestiona sedes, departamentos y colaboradores.</DialogDescription>
                            </DialogHeader>
                            <div className="py-4 space-y-6">
                                {/* Location Management */}
                                <div className="border p-4 rounded-md">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="font-semibold">Sedes ({locations.length})</h4>
                                        <Button size="sm" onClick={() => handleOpenLocationModal()}> <Plus className="mr-1 h-4 w-4" /> Nueva Sede</Button>
                                    </div>
                                    <ul className="space-y-1 max-h-40 overflow-y-auto">
                                        {locations.map(loc => (
                                            <li key={loc.id} className="flex justify-between items-center text-sm p-1 hover:bg-muted/50 rounded">
                                                <span>{loc.name}</span>
                                                <div className="space-x-1">
                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleOpenLocationModal(loc)}><Edit className="h-4 w-4" /></Button>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDeleteLocation(loc.id)}><Trash2 className="h-4 w-4" /></Button>
                                                </div>
                                            </li>
                                        ))}
                                        {locations.length === 0 && <p className="text-xs text-muted-foreground italic text-center">No hay sedes.</p>}
                                    </ul>
                                </div>
                                {/* Department Management */}
                                <div className="border p-4 rounded-md">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="font-semibold">Departamentos ({departments.length})</h4>
                                        <Button size="sm" onClick={() => handleOpenDepartmentModal()}> <Plus className="mr-1 h-4 w-4" /> Nuevo Depto.</Button>
                                    </div>
                                    <ul className="space-y-1 max-h-40 overflow-y-auto">
                                        {departments.map(dep => (
                                            <li key={dep.id} className="flex justify-between items-center text-sm p-1 hover:bg-muted/50 rounded">
                                                <span>{dep.name} ({locations.find(l=>l.id === dep.locationId)?.name || 'Sede Desconocida'})</span>
                                                <div className="space-x-1">
                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleOpenDepartmentModal(dep)}><Edit className="h-4 w-4" /></Button>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDeleteDepartment(dep.id)}><Trash2 className="h-4 w-4" /></Button>
                                                </div>
                                            </li>
                                        ))}
                                         {departments.length === 0 && <p className="text-xs text-muted-foreground italic text-center">No hay departamentos.</p>}
                                    </ul>
                                </div>
                                {/* Employee Management */}
                                <div className="border p-4 rounded-md">
                                     <div className="flex justify-between items-center mb-2">
                                        <h4 className="font-semibold">Colaboradores ({employees.length})</h4>
                                        <Button size="sm" onClick={() => handleOpenEmployeeModal()}> <Plus className="mr-1 h-4 w-4" /> Nuevo Colab.</Button>
                                    </div>
                                    <ul className="space-y-1 max-h-40 overflow-y-auto">
                                        {employees.map(emp => (
                                            <li key={emp.id} className="flex justify-between items-center text-sm p-1 hover:bg-muted/50 rounded">
                                                <span>{emp.name} ({locations.find(l=>l.id === emp.primaryLocationId)?.name || 'Sede Desc.'})</span>
                                                <div className="space-x-1">
                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleOpenEmployeeModal(emp)}><Edit className="h-4 w-4" /></Button>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDeleteEmployee(emp.id)}><Trash2 className="h-4 w-4" /></Button>
                                                </div>
                                            </li>
                                        ))}
                                        {employees.length === 0 && <p className="text-xs text-muted-foreground italic text-center">No hay colaboradores.</p>}
                                    </ul>
                                </div>
                            </div>
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button variant="outline">Cerrar</Button>
                                </DialogClose>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
                </CardHeader>
                 <CardContent className="space-y-4">
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                         <div className="space-y-1">
                             <Label htmlFor="location-select" className="text-xs font-medium text-muted-foreground">Sede</Label>
                             <LocationSelector
                                 locations={locations}
                                 selectedLocationId={selectedLocationId}
                                 onLocationChange={handleLocationChange}
                             />
                         </div>

                         <div className="md:col-span-2 space-y-1">
                             <Label className="text-xs font-medium text-muted-foreground">Semana</Label>
                             <div className="flex items-center justify-between p-1.5 border rounded-md bg-muted/50">
                                <div className="flex items-center gap-2">
                                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium text-foreground text-sm">
                                        {format(currentWeekStart, 'dd MMM', { locale: es })} - {format(currentWeekEnd, 'dd MMM', { locale: es })}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button variant="outline" size="icon" onClick={goToPreviousWeek} className="h-7 w-7">
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                             <Button
                                                 variant={'outline'}
                                                 size="sm"
                                                 className={cn(
                                                     'h-7 px-2 w-[90px] justify-center text-xs',
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
                                                defaultMonth={selectedDate}
                                                locale={es}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <Button variant="outline" size="icon" onClick={goToNextWeek} className="h-7 w-7">
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                             </div>
                             <div className="flex justify-center gap-1 pt-1 flex-wrap">
                                {weekDates.map(day => (
                                    <Button
                                        key={day.toISOString()}
                                        variant={isSameDay(day, selectedDate) ? 'default' : 'outline'}
                                        size="sm"
                                         className={cn(
                                             'h-auto flex flex-col items-center px-1.5 py-0.5 leading-tight flex-1 min-w-[36px] text-[10px]',
                                             isSameDay(day, selectedDate)
                                                 ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                                                 : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                                         )}
                                        onClick={() => handleDateChange(day)}
                                    >
                                        <span className="uppercase">{format(day, 'EEE', { locale: es })}</span>
                                        <span className="font-semibold text-xs">{format(day, 'dd', { locale: es })}</span>
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
                        <Button size="sm" onClick={() => {}} variant="default" disabled={!selectedLocationId}>
                            <Save className="mr-1 h-3 w-3" /> Guardar Día
                        </Button>
                         <Button size="sm" onClick={() => {}} variant="outline" disabled={!selectedLocationId}>
                             <Plus className="mr-1 h-3 w-3" /> Guardar Formación
                         </Button>
                        <Button size="sm" onClick={() => {}} variant="outline" disabled={!selectedLocationId}>
                            <Copy className="mr-1 h-3 w-3" /> Duplicar Día
                        </Button>
                         <Button size="sm" variant="secondary" disabled={!selectedLocationId} onClick={handleCalculatePayroll}>
                             Calcular Nómina
                         </Button>
                    </div> */}
                </CardContent>
            </Card>

            {/* --- Main Scheduling Area --- */}
            <div className={`grid grid-cols-1 gap-6 ${isWeeklyView ? 'lg:grid-cols-1' : 'lg:grid-cols-4'}`}>
                 {!isWeeklyView && (
                 <div className="lg:col-span-1">
                     <EmployeeList employees={availableEmployees} />
                 </div>
                 )}

                 <div className={`${isWeeklyView ? 'lg:col-span-1' : 'lg:col-span-3'}`}>
                     {selectedLocationId ? (
                        <ScheduleView
                            departments={filteredDepartments}
                            scheduleData={scheduleData}
                            onRemoveShift={handleRemoveShift}
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

             {/* Location Modal */}
            <Dialog open={isLocationModalOpen} onOpenChange={setIsLocationModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingLocation ? 'Editar Sede' : 'Crear Nueva Sede'}</DialogTitle>
                    </DialogHeader>
                    <Form {...locationForm}>
                        <form onSubmit={locationForm.handleSubmit(handleSaveLocation)} className="space-y-4">
                            <FormField
                                control={locationForm.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nombre de la Sede</FormLabel>
                                        <FormControl><Input {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <DialogFooter>
                                <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
                                <Button type="submit">{editingLocation ? 'Guardar Cambios' : 'Crear Sede'}</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* Department Modal */}
            <Dialog open={isDepartmentModalOpen} onOpenChange={setIsDepartmentModalOpen}>
                 <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingDepartment ? 'Editar Departamento' : 'Crear Nuevo Departamento'}</DialogTitle>
                    </DialogHeader>
                    <Form {...departmentForm}>
                        <form onSubmit={departmentForm.handleSubmit(handleSaveDepartment)} className="space-y-4">
                            <FormField
                                control={departmentForm.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nombre del Departamento</FormLabel>
                                        <FormControl><Input {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={departmentForm.control}
                                name="locationId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Sede</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecciona una sede..." />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {locations.map(loc => (
                                                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <DialogFooter>
                                <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
                                <Button type="submit">{editingDepartment ? 'Guardar Cambios' : 'Crear Depto.'}</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                 </DialogContent>
            </Dialog>

             {/* Employee Modal */}
             <Dialog open={isEmployeeModalOpen} onOpenChange={setIsEmployeeModalOpen}>
                 <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingEmployee ? 'Editar Colaborador' : 'Crear Nuevo Colaborador'}</DialogTitle>
                    </DialogHeader>
                     <Form {...employeeForm}>
                        <form onSubmit={employeeForm.handleSubmit(handleSaveEmployee)} className="space-y-4">
                            <FormField
                                control={employeeForm.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nombre del Colaborador</FormLabel>
                                        <FormControl><Input {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={employeeForm.control}
                                name="primaryLocationId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Sede Principal</FormLabel>
                                         <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecciona una sede..." />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {locations.map(loc => (
                                                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <DialogFooter>
                                <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
                                <Button type="submit">{editingEmployee ? 'Guardar Cambios' : 'Crear Colab.'}</Button>
                            </DialogFooter>
                        </form>
                     </Form>
                 </DialogContent>
            </Dialog>

        </main>
     </DndContext>

  );
}
