
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Edit, Users, GripVertical, Clock, Calendar as CalendarIcon } from 'lucide-react';
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
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from '@/components/ui/calendar';
import { Label } from "@/components/ui/label"; // Import Label
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";

import { cn } from '@/lib/utils';
import type { Location, Department, Employee, ShiftAssignment, ScheduleData, ShiftDetails } from '@/types/schedule';
import { DepartmentColumn } from '@/components/schedule/DepartmentColumn';
import { EmployeeList } from '@/components/schedule/EmployeeList';
import { LocationSelector } from '@/components/schedule/LocationSelector';
import { ScheduleView } from '@/components/schedule/ScheduleView';
import { DraggableEmployee } from '@/components/schedule/DraggableEmployee';
import { ShiftCard } from '@/components/schedule/ShiftCard';
import { ShiftDetailModal } from '@/components/schedule/ShiftDetailModal';
import { format, addDays, startOfWeek, endOfWeek, isWithinInterval, parse, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

// Mock Data (Temporary)
const initialLocations: Location[] = [
    { id: 'loc-1', name: 'Sede Principal' },
    { id: 'loc-2', name: 'Sede Norte' },
];

const initialDepartments: Department[] = [
    { id: 'dep-1', name: 'Cocina', locationId: 'loc-1', icon: Clock },
    { id: 'dep-2', name: 'Salón', locationId: 'loc-1', icon: Users },
    { id: 'dep-3', name: 'Caja & Barra', locationId: 'loc-1' },
    { id: 'dep-4', name: 'Bodega', locationId: 'loc-2' },
];

const initialEmployees: Employee[] = [
    { id: 'emp-1', name: 'Carlos Pérez', primaryLocationId: 'loc-1' },
    { id: 'emp-2', name: 'Ana Gómez', primaryLocationId: 'loc-1' },
    { id: 'emp-3', name: 'Luis Torres', primaryLocationId: 'loc-1' },
    { id: 'emp-4', name: 'Sofía Ramirez', primaryLocationId: 'loc-2' },
    { id: 'emp-5', name: 'Diego Castro', primaryLocationId: 'loc-2' },
];


interface SchedulePageProps { }

const SchedulePage: React.FC<SchedulePageProps> = () => {

    const [locations, setLocations] = useState<Location[]>(initialLocations);
    const [departments, setDepartments] = useState<Department[]>(initialDepartments);
    const [employees, setEmployees] = useState<Employee[]>(initialEmployees);

    const [selectedLocationId, setSelectedLocationId] = useState<string>(initialLocations[0].id);
    const [weekStartDate, setWeekStartDate] = useState<Date>(() => {
        const today = new Date();
        return startOfWeek(today, { weekStartsOn: 1 }); // Start on Monday
    });

    const [scheduleData, setScheduleData] = useState<ScheduleData>({
        date: new Date(),
        assignments: {},
    });

    const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null);

    const [newLocationName, setNewLocationName] = useState<string>('');
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [editingLocation, setEditingLocation] = useState<Location | null>(null);

    const [newDepartmentName, setNewDepartmentName] = useState<string>('');
    const [isDepartmentModalOpen, setIsDepartmentModalOpen] = useState(false);
     const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);

    const { toast } = useToast();


    const calculateWeekRange = (date: Date) => {
        const start = startOfWeek(date, { weekStartsOn: 1 });
        const end = endOfWeek(date, { weekStartsOn: 1 });
        return `${format(start, 'dd MMM', { locale: es })} - ${format(end, 'dd MMM yyyy', { locale: es })}`;
    };

    const displayedWeekRange = useMemo(() => {
        return calculateWeekRange(weekStartDate);
    }, [weekStartDate]);

    const displayedLocations = useMemo(() => {
        return locations.map((loc) => (
            <li key={loc.id} className="flex items-center justify-between p-2 border rounded-md shadow-sm transition-colors hover:bg-secondary">
                <span className="truncate">{loc.name}</span>
                <div className="space-x-1">
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleOpenLocationModal(loc)}><Edit className="h-3 w-3" /></Button> {/* Reduced size */}
                     {/* AlertDialog */}
                     <AlertDialog>
                       <AlertDialogTrigger asChild>
                         <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive"><Trash2 className="h-3 w-3" /></Button>
                       </AlertDialogTrigger>
                       <AlertDialogContent>
                         <AlertDialogHeader>
                           <AlertDialogTitle>¿Eliminar Sede?</AlertDialogTitle>
                           <AlertDialogDescription>
                             ¿Estás seguro de que quieres eliminar esta sede? Esta acción no se puede deshacer.
                           </AlertDialogDescription>
                         </AlertDialogHeader>
                         <AlertDialogFooter>
                           <AlertDialogCancel>Cancelar</AlertDialogCancel>
                           <AlertDialogAction className="bg-destructive hover:bg-destructive/80">Eliminar</AlertDialogAction>
                         </AlertDialogFooter>
                       </AlertDialogContent>
                     </AlertDialog>
                </div>
            </li>
        ));
    }, [locations]);



    const handleLocationChange = (locationId: string) => {
        setSelectedLocationId(locationId);
    };

    const handleNextWeek = () => {
        setWeekStartDate(addDays(weekStartDate, 7));
    };

    const handlePrevWeek = () => {
        setWeekStartDate(addDays(weekStartDate, -7));
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over) return;

        const employee = employees.find(emp => emp.id === active.id);
        if (!employee) return;

        // Validation checks before assigning
        if (employee.primaryLocationId !== selectedLocationId) {
            toast({
                title: 'Ubicación Incorrecta',
                description: `Este colaborador no pertenece a esta sede.`,
                variant: 'destructive',
            });
            return;
        }

        setSelectedEmployee(employee);
        setSelectedDepartmentId(over.id.toString()); // Store the department ID
        setIsShiftModalOpen(true); // Open the modal to capture times
    };

    const handleSaveShiftDetails = (details: ShiftDetails) => {
        if (!selectedEmployee || !selectedDepartmentId) return;

        const newAssignment: ShiftAssignment = {
            id: `shift_${Date.now()}`,
            employee: selectedEmployee,
            ...details,
        };

        setScheduleData(prev => {
            const existingAssignments = prev.assignments[selectedDepartmentId] || [];
            return {
                ...prev,
                assignments: {
                    ...prev.assignments,
                    [selectedDepartmentId]: [...existingAssignments, newAssignment],
                },
            };
        });
        setIsShiftModalOpen(false); // Close the modal
        setSelectedEmployee(null); // Clear selection
        setSelectedDepartmentId(null);
        toast({
            title: 'Turno Asignado',
            description: `Turno asignado a ${selectedEmployee.name} en este departamento.`,
        });
    };

    const handleRemoveShift = (departmentId: string, assignmentId: string) => {
        setScheduleData(prev => {
            return {
                ...prev,
                assignments: {
                    ...prev.assignments,
                    [departmentId]: prev.assignments[departmentId]?.filter(a => a.id !== assignmentId) || [],
                },
            };
        });
        toast({
            title: 'Turno Eliminado',
            description: 'El turno ha sido eliminado del horario.',
        });
    };

    const handleOpenLocationModal = (loc: Location | null) => {
        setEditingLocation(loc);
        setNewLocationName(loc ? loc.name : '');
        setIsLocationModalOpen(true);
    };

    const handleCloseLocationModal = () => {
        setIsLocationModalOpen(false);
        setEditingLocation(null);
        setNewLocationName('');
    };

    const handleSaveLocation = () => {
        if (!newLocationName.trim()) return;

        if (editingLocation) {
            // Update existing location
            setLocations(locations.map(loc =>
                loc.id === editingLocation.id ? { ...loc, name: newLocationName } : loc
            ));
            toast({ title: 'Sede Actualizada', description: `Se actualizó el nombre de la sede a ${newLocationName}.` });
        } else {
            // Add new location
            const newLoc: Location = { id: `loc_${Date.now()}`, name: newLocationName.trim() };
            setLocations([...locations, newLoc]);
            toast({ title: 'Sede Agregada', description: `Se agregó la sede ${newLocationName}.` });
        }
        handleCloseLocationModal();
    };


    const handleOpenDepartmentModal = (dep: Department | null) => {
         setEditingDepartment(dep);
         setNewDepartmentName(dep ? dep.name : '');
         setIsDepartmentModalOpen(true);
    };

    const handleCloseDepartmentModal = () => {
         setIsDepartmentModalOpen(false);
         setEditingDepartment(null);
         setNewDepartmentName('');
    };

    const handleSaveDepartment = () => {
        if (!newDepartmentName.trim()) return;

        if (editingDepartment) {
            // Update existing department
            setDepartments(departments.map(dep =>
                dep.id === editingDepartment.id ? { ...dep, name: newDepartmentName } : dep
            ));
            toast({ title: 'Departamento Actualizado', description: `Se actualizó el departamento a ${newDepartmentName}.` });
        } else {
            // Add new department
            const newDep: Department = {
                id: `dep_${Date.now()}`,
                name: newDepartmentName.trim(),
                locationId: selectedLocationId
            };
            setDepartments([...departments, newDep]);
            toast({ title: 'Departamento Agregado', description: `Se agregó el departamento ${newDepartmentName}.` });
        }
        handleCloseDepartmentModal();
    };


    const filteredDepartments = useMemo(() => {
        return departments.filter(dep => dep.locationId === selectedLocationId);
    }, [departments, selectedLocationId]);

     const filteredEmployees = useMemo(() => {
        return employees.filter(emp => emp.primaryLocationId === selectedLocationId);
    }, [employees, selectedLocationId]);

    return (
        <main className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Planificación de Horarios</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">

                {/* Column 1: Configuration */}
                <div className="lg:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle>Configuración</CardTitle>
                            <CardDescription>Administrar sedes, departamentos y más.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1">
                                <Label htmlFor="location-select" className="text-xs font-medium text-muted-foreground">Sede</Label>
                                <LocationSelector
                                    locations={locations}
                                    selectedLocationId={selectedLocationId}
                                    onLocationChange={handleLocationChange}
                                />
                            </div>

                            <div className="space-y-2">
                                <h4 className="font-semibold text-sm">Sedes:</h4>
                                <ul className="space-y-1">
                                    {displayedLocations}
                                    <li>
                                        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => handleOpenLocationModal(null)}>
                                            <Plus className="h-4 w-4 mr-2" /> Agregar Sede
                                        </Button>
                                    </li>
                                </ul>
                            </div>

                            <div className="space-y-2">
                                <h4 className="font-semibold text-sm">Departamentos:</h4>
                                <ul className="space-y-1">
                                    {filteredDepartments.map(dep => (
                                        <li key={dep.id} className="flex items-center justify-between p-2 border rounded-md shadow-sm transition-colors hover:bg-secondary">
                                            <span className="truncate">{dep.name}</span>
                                            <div className="space-x-1">
                                                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleOpenDepartmentModal(dep)}><Edit className="h-3 w-3" /></Button> {/* Reduced size */}
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive"><Trash2 className="h-3 w-3" /></Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>¿Eliminar Departamento?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                ¿Estás seguro de que quieres eliminar este departamento? Esta acción no se puede deshacer.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                            <AlertDialogAction className="bg-destructive hover:bg-destructive/80">Eliminar</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </li>
                                    ))}
                                    <li>
                                        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => handleOpenDepartmentModal(null)}>
                                            <Plus className="h-4 w-4 mr-2" /> Agregar Departamento
                                        </Button>
                                    </li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Column 2: Weekly Schedule View */}
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Horario Semanal - {selectedLocationId}</CardTitle>
                            <div className="flex items-center space-x-2">
                                <Button size="sm" variant="outline" onClick={handlePrevWeek}><CalendarIcon className="h-4 w-4 mr-2" />Semana Anterior</Button>
                                <span>{displayedWeekRange}</span>
                                <Button size="sm" variant="outline" onClick={handleNextWeek}>Semana Siguiente<CalendarIcon className="h-4 w-4 ml-2" /></Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <DndContext id="DndDescribedBy-0" onDragEnd={handleDragEnd} >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[600px]"> {/* Added a fixed height for the main grid container */}
                                    <div className="md:col-span-1">
                                        <EmployeeList employees={filteredEmployees} />
                                    </div>
                                    <div className="md:col-span-1">
                                        <ScheduleView
                                            departments={filteredDepartments}
                                            scheduleData={scheduleData}
                                            onRemoveShift={handleRemoveShift}
                                        />
                                    </div>
                                </div>
                            </DndContext>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Modals */}
            <ShiftDetailModal
                isOpen={isShiftModalOpen}
                onClose={() => setIsShiftModalOpen(false)}
                onSave={handleSaveShiftDetails}
                employeeName={selectedEmployee?.name || 'Colaborador'}
                departmentName={departments.find(dep => dep.id === selectedDepartmentId)?.name || 'Departamento'}
            />

            <AlertDialog open={isLocationModalOpen} onOpenChange={setIsLocationModalOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{editingLocation ? 'Editar Sede' : 'Nueva Sede'}</AlertDialogTitle>
                        <AlertDialogDescription>
                            Ingresa el nombre de la sede.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="location-name" className="text-right">Nombre</Label>
                            <Input
                                id="location-name"
                                value={newLocationName}
                                onChange={(e) => setNewLocationName(e.target.value)}
                                className="col-span-3"
                            />
                        </div>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={handleCloseLocationModal}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleSaveLocation}>Guardar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={isDepartmentModalOpen} onOpenChange={setIsDepartmentModalOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{editingDepartment ? 'Editar Departamento' : 'Nuevo Departamento'}</AlertDialogTitle>
                        <AlertDialogDescription>
                            Ingresa el nombre del departamento.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="department-name" className="text-right">Nombre</Label>
                            <Input
                                id="department-name"
                                value={newDepartmentName}
                                onChange={(e) => setNewDepartmentName(e.target.value)}
                                className="col-span-3"
                            />
                        </div>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={handleCloseDepartmentModal}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleSaveDepartment}>Guardar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>


        </main>
    );
};

export default SchedulePage;
