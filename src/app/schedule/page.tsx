
'use client'; // Ensure this directive is present

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Edit, ChevronsLeft, ChevronsRight, CalendarIcon, Users, Building, Building2, MinusCircle, ChevronsUpDown, Settings } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose, DialogTrigger } from "@/components/ui/dialog";

import { LocationSelector } from '@/components/schedule/LocationSelector';
import { EmployeeList } from '@/components/schedule/EmployeeList';
import { ScheduleView } from '@/components/schedule/ScheduleView';
import { ShiftDetailModal } from '@/components/schedule/ShiftDetailModal';
import { WeekNavigator } from '@/components/schedule/WeekNavigator';

import type { Location, Department, Employee, ShiftAssignment, ScheduleData } from '@/types/schedule';
import { v4 as uuidv4 } from 'uuid';
import { startOfWeek, addDays, format, addWeeks, subWeeks } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// Helper to generate dates for the current week
const getWeekDates = (currentDate: Date): Date[] => {
  const start = startOfWeek(currentDate, { weekStartsOn: 1 }); // Start on Monday
  return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
};


const initialLocations: Location[] = [
  { id: 'loc-1', name: 'Sede Principal' },
  { id: 'loc-2', name: 'Sede Norte' },
  { id: 'loc-3', name: 'Sede Occidente' },
];

const initialDepartments: Department[] = [
  { id: 'dep-1', name: 'Cocina', locationId: 'loc-1', icon: Building },
  { id: 'dep-2', name: 'Salón', locationId: 'loc-1', icon: Users },
  { id: 'dep-3', name: 'Caja & Barra', locationId: 'loc-2', icon: Edit },
  { id: 'dep-4', name: 'Bodega', locationId: 'loc-2', icon: Building2 },
  { id: 'dep-5', name: 'Cocina', locationId: 'loc-3', icon: Building },
  { id: 'dep-6', name: 'Salón', locationId: 'loc-3', icon: Users },
];

const initialEmployees: Employee[] = [
  { id: 'emp-1', name: 'Carlos Pérez', primaryLocationId: 'loc-1' },
  { id: 'emp-2', name: 'Ana Rodriguez', primaryLocationId: 'loc-1' },
  { id: 'emp-3', name: 'Luis Gómez', primaryLocationId: 'loc-2' },
  { id: 'emp-4', name: 'Sofía Vargas', primaryLocationId: 'loc-2' },
  { id: 'emp-5', name: 'Diego Torres', primaryLocationId: 'loc-3' },
  { id: 'emp-6', name: 'Isabel Castro', primaryLocationId: 'loc-3' },
];

export default function SchedulePage() {
    const [locations, setLocations] = useState<Location[]>(initialLocations);
    const [departments, setDepartments] = useState<Department[]>(initialDepartments);
    const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
    const [currentDate, setCurrentDate] = useState(new Date()); // Track current date for week view
    const [scheduleData, setScheduleData] = useState<{ [dateKey: string]: ScheduleData }>({}); // Store data per date key "yyyy-MM-dd"
    const [viewMode, setViewMode] = useState<'day' | 'week'>('week'); // Default to week view
    const [selectedLocationId, setSelectedLocationId] = useState<string>(initialLocations[0].id);
    const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null);
    const [editingShiftDetails, setEditingShiftDetails] = useState<{ assignmentId: string; details: any } | null>(null); // For edit workflow
    const [targetDate, setTargetDate] = useState<Date>(new Date()); // Track the date for shift assignment

    // State for managing Location, Department, and Employee CRUD modals
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [isDepartmentModalOpen, setIsDepartmentModalOpen] = useState(false);
    const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);

    const [editingLocation, setEditingLocation] = useState<Location | null>(null);
    const [locationFormData, setLocationFormData] = useState({ name: '' });

    const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
    const [departmentFormData, setDepartmentFormData] = useState({ name: '', locationId: selectedLocationId });

    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [employeeFormData, setEmployeeFormData] = useState({ name: '', primaryLocationId: selectedLocationId });

    const [itemToDelete, setItemToDelete] = useState<{ type: 'location' | 'department' | 'employee'; id: string; name: string } | null>(null);


    const weekDates = getWeekDates(currentDate);
    const currentDayKey = format(targetDate, 'yyyy-MM-dd'); // Date key for current schedule

    // Helper to get schedule for a specific date, handling potential undefined
    const getScheduleForDate = (date: Date): ScheduleData => {
        const key = format(date, 'yyyy-MM-dd');
        return scheduleData[key] || { date: date, assignments: {} };
    }

    // Derived state for available employees
    const assignedEmployeeIds = useMemo(() => {
        const ids = new Set<string>();
        const datesToConsider = viewMode === 'week' ? weekDates : [targetDate];

        datesToConsider.forEach(date => {
            const dateKey = format(date, 'yyyy-MM-dd');
            const daySchedule = scheduleData[dateKey];
            if (daySchedule) {
                Object.values(daySchedule.assignments).forEach(deptAssignments => {
                    deptAssignments.forEach(assignment => ids.add(assignment.employee.id));
                });
            }
        });
        return ids;
    }, [scheduleData, targetDate, viewMode, weekDates]);

    const filteredEmployees = useMemo(() => employees.filter(emp => emp.primaryLocationId === selectedLocationId), [employees, selectedLocationId]);
    const filteredDepartments = useMemo(() => departments.filter(dep => dep.locationId === selectedLocationId), [departments, selectedLocationId]);
    // Update availableEmployees logic to exclude employees assigned *anywhere* on the current date/week
     const availableEmployees = useMemo(() => {
        const currentAssignedIds = new Set<string>();
        const datesToCheck = viewMode === 'week' ? weekDates : [targetDate];

        datesToCheck.forEach(date => {
            const dateKey = format(date, 'yyyy-MM-dd');
            const daySchedule = scheduleData[dateKey];
            if (daySchedule) {
                Object.values(daySchedule.assignments).forEach(deptAssignments => {
                    deptAssignments.forEach(assignment => currentAssignedIds.add(assignment.employee.id));
                });
            }
        });

        // Filter employees based on selected location AND if they are NOT in the currentAssignedIds set
        return filteredEmployees.filter(emp => !currentAssignedIds.has(emp.id));
     }, [filteredEmployees, scheduleData, targetDate, viewMode, weekDates]);


    useEffect(() => {
        // Ensure department locationId defaults to current selected location
        setDepartmentFormData(prev => ({ ...prev, locationId: selectedLocationId }));
        setEmployeeFormData(prev => ({ ...prev, primaryLocationId: selectedLocationId }));
    }, [selectedLocationId]);

    const handleLocationChange = (locationId: string) => {
        setSelectedLocationId(locationId);
    };


    const handleOpenShiftModal = (employee: Employee, departmentId: string, date: Date) => {
        setSelectedEmployee(employee);
        setSelectedDepartmentId(departmentId);
        setTargetDate(date); // Set the date for which the shift is being added/edited
        setIsShiftModalOpen(true);
    };

    const handleAddShift = (details: any) => {
        if (!selectedEmployee || !selectedDepartmentId) return;

        const dateKey = format(targetDate, 'yyyy-MM-dd');

        const newAssignment: ShiftAssignment = {
            id: uuidv4(),
            employee: selectedEmployee,
            startTime: details.startTime,
            endTime: details.endTime,
            includeBreak: details.includeBreak || false,
            breakStartTime: details.includeBreak ? details.breakStartTime : undefined,
            breakEndTime: details.includeBreak ? details.breakEndTime : undefined,
        };

        setScheduleData(prevData => {
            const dayData = prevData[dateKey] || { date: targetDate, assignments: {} };
            const departmentAssignments = dayData.assignments[selectedDepartmentId!] || [];
            return {
                ...prevData,
                [dateKey]: {
                    ...dayData,
                    assignments: {
                        ...dayData.assignments,
                        [selectedDepartmentId!]: [...departmentAssignments, newAssignment],
                    },
                },
            };
        });
        setIsShiftModalOpen(false);
        setSelectedEmployee(null); // Clear selection after assigning
        setSelectedDepartmentId(null);
    };

    const handleRemoveShift = (dateKey: string, departmentId: string, assignmentId: string) => {
        setScheduleData(prevData => {
            const dayData = prevData[dateKey];
            if (!dayData) return prevData;

            const departmentAssignments = (dayData.assignments[departmentId] || []).filter(a => a.id !== assignmentId);

            // Create a new assignments object to avoid direct mutation
            const newAssignments = { ...dayData.assignments, [departmentId]: departmentAssignments };

            // If the department assignment list is now empty, consider removing the department key
            if (newAssignments[departmentId].length === 0) {
                delete newAssignments[departmentId];
            }

            return {
                ...prevData,
                [dateKey]: {
                    ...dayData,
                    assignments: newAssignments,
                },
            };
        });
    };


    const handleDragEnd = (event: DragEndEvent) => {
        const { over, active } = event;

        if (!over || !active) return;

        const employeeId = active.id as string;
        const targetData = over.data.current as { type: string; id: string; date?: string }; // Expecting { type: 'department', id: 'dept-id', date: 'yyyy-MM-dd' }

        if (!targetData || targetData.type !== 'department' || !targetData.date) {
            console.warn("Invalid drop target data:", targetData);
            return;
        }

        const departmentId = targetData.id;
        const dropDate = new Date(targetData.date + 'T00:00:00'); // Ensure date object from string

        const employee = employees.find(emp => emp.id === employeeId);
        if (!employee) return;

        // Check if employee is already assigned to this department on this date
        const dateKey = format(dropDate, 'yyyy-MM-dd');
        const assignmentsForDept = scheduleData[dateKey]?.assignments[departmentId] || [];
        if (assignmentsForDept.some(a => a.employee.id === employeeId)) {
             // Optionally show a toast or message
             console.log(`${employee.name} is already assigned to this department on this date.`);
             return;
        }


        handleOpenShiftModal(employee, departmentId, dropDate);
    };

    // CRUD Handlers
    const handleOpenLocationModal = (location: Location | null) => {
        setEditingLocation(location);
        setLocationFormData({ name: location?.name || '' });
        setIsLocationModalOpen(true);
    };

    const handleSaveLocation = () => {
        if (editingLocation) {
            // Update existing location
            setLocations(locations.map(loc => loc.id === editingLocation.id ? { ...loc, ...locationFormData } : loc));
        } else {
            // Add new location
            const newLocation = { id: uuidv4(), ...locationFormData };
            setLocations([...locations, newLocation]);
        }
        setIsLocationModalOpen(false);
        setEditingLocation(null); // Clear editing state
    };

    const handleOpenDepartmentModal = (department: Department | null) => {
        setEditingDepartment(department);
        setDepartmentFormData({ name: department?.name || '', locationId: department?.locationId || selectedLocationId });
        setIsDepartmentModalOpen(true);
    };

    const handleSaveDepartment = () => {
        if (editingDepartment) {
            setDepartments(departments.map(dep => dep.id === editingDepartment.id ? { ...dep, ...departmentFormData } : dep));
        } else {
            const newDepartment = { id: uuidv4(), ...departmentFormData, icon: Plus }; // Assign default icon
            setDepartments([...departments, newDepartment]);
        }
        setIsDepartmentModalOpen(false);
        setEditingDepartment(null); // Clear editing state
    };

    const handleOpenEmployeeModal = (employee: Employee | null) => {
        setEditingEmployee(employee);
        setEmployeeFormData({ name: employee?.name || '', primaryLocationId: employee?.primaryLocationId || selectedLocationId });
        setIsEmployeeModalOpen(true);
    };

    const handleSaveEmployee = () => {
        if (editingEmployee) {
            setEmployees(employees.map(emp => emp.id === editingEmployee.id ? { ...emp, ...employeeFormData } : emp));
        } else {
            const newEmployee = { id: uuidv4(), ...employeeFormData };
            setEmployees([...employees, newEmployee]);
        }
        setIsEmployeeModalOpen(false);
        setEditingEmployee(null); // Clear editing state
    };

     // Confirm before deleting
     const confirmDeleteItem = (type: 'location' | 'department' | 'employee', id: string, name: string) => {
        setItemToDelete({ type, id, name });
        // The AlertDialog will open via its trigger
     };


    const handleDeleteItem = () => {
        if (!itemToDelete) return;

        switch (itemToDelete.type) {
            case 'location':
                setLocations(locations.filter(loc => loc.id !== itemToDelete.id));
                // Also remove associated departments and potentially reassign employees? Needs careful consideration.
                setDepartments(departments.filter(dep => dep.locationId !== itemToDelete.id));
                // Remove location from employees or set to a default?
                setEmployees(emps => emps.map(emp => emp.primaryLocationId === itemToDelete.id ? {...emp, primaryLocationId: '' } : emp)); // Example: clear location ID
                 // If the deleted location was the selected one, select the first remaining or none
                if (selectedLocationId === itemToDelete.id) {
                    setSelectedLocationId(locations.length > 1 ? locations.find(loc => loc.id !== itemToDelete.id)!.id : '');
                }
                break;
            case 'department':
                setDepartments(departments.filter(dep => dep.id !== itemToDelete.id));
                // Also remove associated assignments?
                 const updatedSchedule = { ...scheduleData };
                 Object.keys(updatedSchedule).forEach(dateKey => {
                     delete updatedSchedule[dateKey].assignments[itemToDelete.id];
                 });
                 setScheduleData(updatedSchedule);
                break;
            case 'employee':
                setEmployees(employees.filter(emp => emp.id !== itemToDelete.id));
                 // Also remove associated assignments?
                 const updatedScheduleEmp = { ...scheduleData };
                 Object.keys(updatedScheduleEmp).forEach(dateKey => {
                      Object.keys(updatedScheduleEmp[dateKey].assignments).forEach(deptId => {
                          updatedScheduleEmp[dateKey].assignments[deptId] = updatedScheduleEmp[dateKey].assignments[deptId].filter(a => a.employee.id !== itemToDelete.id);
                      });
                 });
                 setScheduleData(updatedScheduleEmp);
                break;
        }
        setItemToDelete(null); // Close dialog
    };

     // Handlers for Week Navigation
     const handlePreviousWeek = () => {
        setCurrentDate(prevDate => subWeeks(prevDate, 1));
     };

     const handleNextWeek = () => {
        setCurrentDate(prevDate => addWeeks(prevDate, 1));
     };

  return (
        <main className="container mx-auto p-4 md:p-8 max-w-full"> {/* Use max-w-full for wider layout */}
             <div className="flex justify-between items-center mb-6 gap-4 flex-wrap"> {/* Added flex-wrap */}
                 <h1 className="text-2xl font-bold text-foreground flex-shrink-0 mr-auto">Planificador de Horarios</h1>
                 <div className="flex items-center gap-4 order-1 md:order-none"> {/* Center navigation */}
                     <WeekNavigator
                         currentDate={currentDate}
                         onPreviousWeek={handlePreviousWeek}
                         onNextWeek={handleNextWeek}
                     />
                 </div>
                 <div className="flex items-center gap-2 flex-shrink-0 order-2 md:order-last">
                     {/* Configuration Button */}
                     <Dialog open={isConfigModalOpen} onOpenChange={setIsConfigModalOpen}>
                         <DialogTrigger asChild>
                             <Button variant="outline">
                                <Settings className="mr-2 h-4 w-4"/> Configuración
                             </Button>
                         </DialogTrigger>
                         <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto"> {/* Wider modal, scrollable */}
                              <DialogHeader>
                                  <DialogTitle>Configuración General</DialogTitle>
                                  <DialogDescription>Gestiona sedes, departamentos y colaboradores.</DialogDescription>
                              </DialogHeader>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
                                  {/* Locations Column */}
                                  <div className="space-y-4 border-r pr-4 md:border-r-0 md:pb-0">
                                      <div className="flex justify-between items-center">
                                         <h4 className="font-semibold text-foreground flex items-center gap-1"><Building className="h-4 w-4 text-muted-foreground"/>Sedes ({locations.length})</h4>
                                         <Button variant="outline" size="sm" onClick={() => handleOpenLocationModal(null)} title="Agregar Sede">
                                             <Plus className="h-4 w-4" />
                                         </Button>
                                      </div>
                                      <ul className="space-y-2 text-sm">
                                          {locations.map((loc) => (
                                              <li key={loc.id} className="flex items-center justify-between group py-1 border-b">
                                                  <span className={`truncate ${loc.id === selectedLocationId ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>{loc.name}</span>
                                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
                                                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => handleOpenLocationModal(loc)} title="Editar Sede"><Edit className="h-4 w-4" /></Button>
                                                      <AlertDialog>
                                                          <AlertDialogTrigger asChild>
                                                              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => confirmDeleteItem('location', loc.id, loc.name)} title="Eliminar Sede"><Trash2 className="h-4 w-4" /></Button>
                                                          </AlertDialogTrigger>
                                                          {/* Delete Confirmation defined later */}
                                                      </AlertDialog>
                                                  </div>
                                              </li>
                                          ))}
                                      </ul>
                                  </div>
                                  {/* Departments Column */}
                                  <div className="space-y-4 border-r pr-4 md:border-r-0 md:pb-0">
                                       <div className="flex justify-between items-center">
                                          <h4 className="font-semibold text-foreground flex items-center gap-1"><Building2 className="h-4 w-4 text-muted-foreground"/>Departamentos ({departments.length})</h4>
                                          <Button variant="outline" size="sm" onClick={() => handleOpenDepartmentModal(null)} title="Agregar Departamento">
                                              <Plus className="h-4 w-4" />
                                          </Button>
                                       </div>
                                      <ul className="space-y-2 text-sm">
                                          {departments.map((dep) => (
                                              <li key={dep.id} className="flex items-center justify-between group py-1 border-b">
                                                  <span className="truncate text-muted-foreground">{dep.name} <span className="text-xs italic">({locations.find(l => l.id === dep.locationId)?.name || 'Sede inválida'})</span></span>
                                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
                                                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => handleOpenDepartmentModal(dep)} title="Editar Departamento"><Edit className="h-4 w-4" /></Button>
                                                       <AlertDialog>
                                                          <AlertDialogTrigger asChild>
                                                               <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => confirmDeleteItem('department', dep.id, dep.name)} title="Eliminar Departamento"><Trash2 className="h-4 w-4" /></Button>
                                                          </AlertDialogTrigger>
                                                           {/* Delete Confirmation defined later */}
                                                       </AlertDialog>
                                                  </div>
                                              </li>
                                          ))}
                                      </ul>
                                  </div>
                                   {/* Employees Column */}
                                  <div className="space-y-4">
                                      <div className="flex justify-between items-center">
                                          <h4 className="font-semibold text-foreground flex items-center gap-1"><Users className="h-4 w-4 text-muted-foreground"/>Colaboradores ({employees.length})</h4>
                                          <Button variant="outline" size="sm" onClick={() => handleOpenEmployeeModal(null)} title="Agregar Colaborador">
                                              <Plus className="h-4 w-4" />
                                          </Button>
                                      </div>
                                       <ul className="space-y-2 text-sm">
                                           {employees.map((emp) => (
                                               <li key={emp.id} className="flex items-center justify-between group py-1 border-b">
                                                   <span className="truncate text-muted-foreground">{emp.name} <span className="text-xs italic">({locations.find(l => l.id === emp.primaryLocationId)?.name || 'Sede inválida'})</span></span>
                                                   <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
                                                       <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => handleOpenEmployeeModal(emp)} title="Editar Colaborador"><Edit className="h-4 w-4" /></Button>
                                                        <AlertDialog>
                                                           <AlertDialogTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => confirmDeleteItem('employee', emp.id, emp.name)} title="Eliminar Colaborador"><Trash2 className="h-4 w-4" /></Button>
                                                           </AlertDialogTrigger>
                                                            {/* Delete Confirmation defined later */}
                                                        </AlertDialog>
                                                   </div>
                                               </li>
                                           ))}
                                       </ul>
                                  </div>
                              </div>
                              <DialogFooter>
                                  <DialogClose asChild>
                                      <Button variant="secondary">Cerrar</Button>
                                  </DialogClose>
                              </DialogFooter>
                         </DialogContent>
                     </Dialog>

                     {/* Day/Week View Toggle */}
                     <Select value={viewMode} onValueChange={(value) => setViewMode(value as 'day' | 'week')}>
                         <SelectTrigger className="w-[120px]">
                             <SelectValue placeholder="Vista" />
                         </SelectTrigger>
                         <SelectContent>
                             <SelectItem value="day">Día</SelectItem>
                             <SelectItem value="week">Semana</SelectItem>
                         </SelectContent>
                     </Select>
                     {/* Location Selector */}
                     <div className="space-y-1">
                        {/* <Label htmlFor="location-select" className="text-xs font-medium text-muted-foreground">Sede</Label> */}
                         <LocationSelector
                            locations={locations}
                            selectedLocationId={selectedLocationId}
                            onLocationChange={handleLocationChange}
                         />
                     </div>
                 </div>
             </div>

              {/* Main content grid */}
             <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                 <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"> {/* Use 12 columns */}

                     {/* --- Available Employees (Takes 2/12 width) --- */}
                      <div className="lg:col-span-2 space-y-6">
                         {/* Available Employees Card */}
                          <EmployeeList employees={availableEmployees} />
                     </div>


                     {/* --- Schedule View (Takes remaining 10/12 width) --- */}
                     <div className="lg:col-span-10"> {/* Schedule takes 10 columns */}
                        <ScheduleView
                            departments={filteredDepartments}
                            scheduleData={scheduleData}
                            onRemoveShift={handleRemoveShift}
                            viewMode={viewMode}
                            weekDates={weekDates} // Pass week dates
                            currentDate={targetDate} // Pass target date for single day view or start of week
                            onAssign={handleOpenShiftModal} // Pass handler for shift assignment via '+' button
                            getScheduleForDate={getScheduleForDate} // Pass helper function
                        />
                     </div>
                 </div>
             </DndContext>


             {/* --- Modals --- */}

             {/* Location Modal */}
             <Dialog open={isLocationModalOpen} onOpenChange={setIsLocationModalOpen}>
                  <DialogContent>
                      <DialogHeader>
                          <DialogTitle>{editingLocation ? 'Editar Sede' : 'Agregar Sede'}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                          <Label htmlFor="location-name">Nombre</Label>
                          <Input id="location-name" value={locationFormData.name} onChange={(e) => setLocationFormData({ name: e.target.value })} />
                      </div>
                      <DialogFooter>
                         <DialogClose asChild>
                           <Button variant="outline">Cancelar</Button>
                         </DialogClose>
                          <Button onClick={handleSaveLocation}>Guardar</Button>
                      </DialogFooter>
                  </DialogContent>
             </Dialog>

             {/* Department Modal */}
            <Dialog open={isDepartmentModalOpen} onOpenChange={setIsDepartmentModalOpen}>
                 <DialogContent>
                     <DialogHeader>
                         <DialogTitle>{editingDepartment ? 'Editar Departamento' : 'Agregar Departamento'}</DialogTitle>
                     </DialogHeader>
                     <div className="space-y-4 py-4">
                          <div>
                             <Label htmlFor="department-name">Nombre</Label>
                             <Input id="department-name" value={departmentFormData.name} onChange={(e) => setDepartmentFormData(prev => ({ ...prev, name: e.target.value }))} />
                          </div>
                         <div>
                              <Label htmlFor="department-location">Sede</Label>
                              <Select value={departmentFormData.locationId} onValueChange={(value) => setDepartmentFormData(prev => ({ ...prev, locationId: value }))}>
                                  <SelectTrigger id="department-location">
                                      <SelectValue placeholder="Selecciona sede" />
                                  </SelectTrigger>
                                  <SelectContent>
                                      {locations.map(loc => (
                                          <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                                      ))}
                                  </SelectContent>
                              </Select>
                         </div>
                     </div>
                     <DialogFooter>
                          <DialogClose asChild>
                            <Button variant="outline">Cancelar</Button>
                          </DialogClose>
                         <Button onClick={handleSaveDepartment}>Guardar</Button>
                     </DialogFooter>
                 </DialogContent>
            </Dialog>


             {/* Employee Modal */}
            <Dialog open={isEmployeeModalOpen} onOpenChange={setIsEmployeeModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingEmployee ? 'Editar Colaborador' : 'Agregar Colaborador'}</DialogTitle>
                    </DialogHeader>
                     <div className="space-y-4 py-4">
                          <div>
                             <Label htmlFor="employee-name">Nombre</Label>
                             <Input id="employee-name" value={employeeFormData.name} onChange={(e) => setEmployeeFormData(prev => ({ ...prev, name: e.target.value }))} />
                          </div>
                         <div>
                              <Label htmlFor="employee-location">Sede Principal</Label>
                              <Select value={employeeFormData.primaryLocationId} onValueChange={(value) => setEmployeeFormData(prev => ({ ...prev, primaryLocationId: value }))}>
                                  <SelectTrigger id="employee-location">
                                      <SelectValue placeholder="Selecciona sede" />
                                  </SelectTrigger>
                                  <SelectContent>
                                      {locations.map(loc => (
                                          <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                                      ))}
                                  </SelectContent>
                              </Select>
                         </div>
                     </div>
                    <DialogFooter>
                         <DialogClose asChild>
                            <Button variant="outline">Cancelar</Button>
                          </DialogClose>
                        <Button onClick={handleSaveEmployee}>Guardar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

             {/* Shift Detail Modal */}
             <ShiftDetailModal
                 isOpen={isShiftModalOpen}
                 onClose={() => setIsShiftModalOpen(false)}
                 onSave={handleAddShift}
                 employeeName={selectedEmployee?.name || ''}
                 departmentName={departments.find(d => d.id === selectedDepartmentId)?.name || ''}
                 initialDetails={editingShiftDetails?.details}
             />

             {/* Universal Delete Confirmation */}
            <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
                 <AlertDialogContent>
                     <AlertDialogHeader>
                         <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                         <AlertDialogDescription>
                             ¿Eliminar {itemToDelete?.type === 'location' ? 'Sede' : itemToDelete?.type === 'department' ? 'Departamento' : 'Colaborador'} "{itemToDelete?.name}"?
                             {itemToDelete?.type === 'location' && " Se eliminarán los departamentos y turnos asociados."}
                             {itemToDelete?.type === 'department' && " Se eliminarán los turnos asociados."}
                             {itemToDelete?.type === 'employee' && " Se eliminarán los turnos asociados."}
                             <br/>Esta acción no se puede deshacer.
                         </AlertDialogDescription>
                     </AlertDialogHeader>
                     <AlertDialogFooter>
                         <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancelar</AlertDialogCancel>
                         <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDeleteItem}>Eliminar</AlertDialogAction>
                     </AlertDialogFooter>
                 </AlertDialogContent>
            </AlertDialog>

        </main>
    );
}
