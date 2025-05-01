import React, { useState, useEffect, useCallback } from 'react';
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
import { Plus, Trash2, Edit } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger as DialogPrimitive, DialogClose } from "@/components/ui/dialog";

import { LocationSelector } from '@/components/schedule/LocationSelector';
import { EmployeeList } from '@/components/schedule/EmployeeList';
import { ScheduleView } from '@/components/schedule/ScheduleView';
import { ShiftDetailModal } from '@/components/schedule/ShiftDetailModal';

import type { Location, Department, Employee, ShiftAssignment, ScheduleData } from '@/types/schedule'; // Assuming types exist
import { v4 as uuidv4 } from 'uuid';

const initialLocations: Location[] = [
  { id: 'loc-1', name: 'Sede Principal' },
  { id: 'loc-2', name: 'Sede Norte' },
  { id: 'loc-3', name: 'Sede Occidente' },
];

const initialDepartments: Department[] = [
  { id: 'dep-1', name: 'Cocina', locationId: 'loc-1', icon: Plus },
  { id: 'dep-2', name: 'Salón', locationId: 'loc-1', icon: Trash2 },
  { id: 'dep-3', name: 'Caja & Barra', locationId: 'loc-2', icon: Edit },
  { id: 'dep-4', name: 'Bodega', locationId: 'loc-2', icon: Plus },
  { id: 'dep-5', name: 'Cocina', locationId: 'loc-3', icon: Trash2 },
  { id: 'dep-6', name: 'Salón', locationId: 'loc-3', icon: Edit },
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
  const [scheduleData, setScheduleData] = useState<ScheduleData>({
    date: new Date(),
    assignments: {},
  });

  const [selectedLocationId, setSelectedLocationId] = useState<string>(initialLocations[0].id);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null);
  const [editingShiftDetails, setEditingShiftDetails] = useState<{ assignmentId: string; details: any } | null>(null); // For edit workflow

  // State for managing Location, Department, and Employee CRUD modals
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isDepartmentModalOpen, setIsDepartmentModalOpen] = useState(false);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null); // State for editing location
    const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null); // State for editing departments
    const [selectedEmployeeItem, setSelectedEmployeeItem] = useState<Employee | null>(null); // State for editing departments

  const handleLocationChange = (locationId: string) => {
    setSelectedLocationId(locationId);
  };

  const filteredEmployees = employees.filter(emp => emp.primaryLocationId === selectedLocationId);

  const filteredDepartments = departments.filter(dep => dep.locationId === selectedLocationId);

  const handleOpenShiftModal = (employee: Employee, departmentId: string) => {
    setSelectedEmployee(employee);
    setSelectedDepartmentId(departmentId);
    setIsShiftModalOpen(true);
  };

  const handleAddShift = (details: any) => {
    if (!selectedEmployee || !selectedDepartmentId) return;

    const newAssignment: ShiftAssignment = {
      id: uuidv4(),
      employee: selectedEmployee,
      startTime: details.startTime,
      endTime: details.endTime,
      includeBreak: details.includeBreak || false,
      breakStartTime: details.breakStartTime || undefined,
      breakEndTime: details.breakEndTime || undefined,
    };

    setScheduleData(prevData => {
      const departmentAssignments = prevData.assignments[selectedDepartmentId] || [];
      return {
        ...prevData,
        assignments: {
          ...prevData.assignments,
          [selectedDepartmentId]: [...departmentAssignments, newAssignment],
        },
      };
    });
    setIsShiftModalOpen(false);
  };

    const handleRemoveShift = (departmentId: string, assignmentId: string) => {
        setScheduleData(prevData => {
            const departmentAssignments = (prevData.assignments[departmentId] || []).filter(a => a.id !== assignmentId);
            return {
                ...prevData,
                assignments: {
                    ...prevData.assignments,
                    [departmentId]: departmentAssignments,
                },
            };
        });
    };

  const handleDragEnd = (event: DragEndEvent) => {
    const { over, draggable } = event;
    if (!over) return;

    const employeeId = draggable as string;
    const departmentId = over.id as string;

    const employee = employees.find(emp => emp.id === employeeId);
    if (!employee) return;

    handleOpenShiftModal(employee, departmentId);
  };

  const handleOpenLocationModal = (location: Location | null) => {
        setSelectedLocation(location); // Set location to be edited or null for new
        setIsLocationModalOpen(true);
    };

    const handleOpenDepartmentModal = (department: Department | null) => {
        setSelectedDepartment(department); // Set department to be edited or null for new
        setIsDepartmentModalOpen(true);
    };

    const handleOpenEmployeeModal = (employee: Employee | null) => {
        setSelectedEmployeeItem(employee); // Set employee to be edited or null for new
        setIsEmployeeModalOpen(true);
    };


  return (
    <main className="container mx-auto p-4 md:p-8 max-w-7xl">
      <h1 className="text-3xl font-bold text-center mb-8 text-foreground">Planificador de Horarios</h1>

      {/* Main content area with 7 columns on large screens */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">

                {/* Column 1: Configuration */}
                 <div className="lg:col-span-1">
                     <Card>
                         <CardHeader>
                             <CardTitle>Configuración</CardTitle>
                             <CardDescription>Administrar sedes, departamentos y colaboradores.</CardDescription>
                         </CardHeader>
                         <CardContent className="space-y-3">
                             <div className="space-y-1">
                                 <Label htmlFor="location-select" className="text-xs font-medium text-muted-foreground">Sede</Label>
                                 <LocationSelector
                                     locations={locations}
                                     selectedLocationId={selectedLocationId}
                                     onLocationChange={handleLocationChange}
                                 />
                             </div>
                             <div className="flex flex-col space-y-2">
                                 <h4 className="text-sm font-semibold">Sedes</h4>
                                 {locations.map((loc) => (
                                     <div key={loc.id} className="flex items-center justify-between">
                                         {loc.name}
                                         <div className="space-x-1">
                                             <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleOpenLocationModal(loc)}><Edit className="h-3 w-3" /></Button> {/* Reduced size */}
                                             <AlertDialog>
                                                 <AlertDialogTrigger asChild>
                                                     <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => {}}><Trash2 className="h-3 w-3" /></Button> {/* Reduced size */}
                                                 </AlertDialogTrigger>
                                                  {/* Delete Confirmation Dialog */}
                                                 <AlertDialogContent>
                                                     <AlertDialogHeader>
                                                         <AlertDialogTitle>¿Eliminar Sede?</AlertDialogTitle>
                                                         <AlertDialogDescription>¿Estás seguro de eliminar esta sede? Esta acción es irreversible.</AlertDialogDescription>
                                                     </AlertDialogHeader>
                                                     <AlertDialogFooter>
                                                         <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                         <AlertDialogAction className="bg-red-500 text-white">Eliminar</AlertDialogAction>
                                                     </AlertDialogFooter>
                                                 </AlertDialogContent>
                                             </AlertDialog>
                                         </div>
                                     </div>
                                 ))}
                                 <Button variant="outline" size="sm" onClick={() => handleOpenLocationModal(null)}>Agregar Sede</Button>
                             </div>
                             <div className="flex flex-col space-y-2">
                                 <h4 className="text-sm font-semibold">Departamentos</h4>
                                 {filteredDepartments.map((dep) => (
                                     <div key={dep.id} className="flex items-center justify-between">
                                         {dep.name}
                                         <div className="space-x-1">
                                             <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleOpenDepartmentModal(dep)}><Edit className="h-3 w-3" /></Button> {/* Reduced size */}
                                             <AlertDialog>
                                                 <AlertDialogTrigger asChild>
                                                     <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => {}}><Trash2 className="h-3 w-3" /></Button> {/* Reduced size */}
                                                 </AlertDialogTrigger>
                                                  {/* Delete Confirmation Dialog */}
                                                 <AlertDialogContent>
                                                     <AlertDialogHeader>
                                                         <AlertDialogTitle>¿Eliminar Departamento?</AlertDialogTitle>
                                                         <AlertDialogDescription>¿Estás seguro de eliminar este departamento? Esta acción es irreversible.</AlertDialogDescription>
                                                     </AlertDialogHeader>
                                                     <AlertDialogFooter>
                                                         <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                         <AlertDialogAction className="bg-red-500 text-white">Eliminar</AlertDialogAction>
                                                     </AlertDialogFooter>
                                                 </AlertDialogContent>
                                             </AlertDialog>
                                         </div>
                                     </div>
                                 ))}
                                 <Button variant="outline" size="sm" onClick={() => handleOpenDepartmentModal(null)}>Agregar Departamento</Button>
                             </div>
                             <div className="flex flex-col space-y-2">
                                 <h4 className="text-sm font-semibold">Colaboradores</h4>
                                 {filteredEmployees.map((employee) => (
                                     <div key={employee.id} className="flex items-center justify-between">
                                         {employee.name}
                                         <div className="space-x-1">
                                             <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleOpenEmployeeModal(employee)}><Edit className="h-3 w-3" /></Button> {/* Reduced size */}
                                             <AlertDialog>
                                                 <AlertDialogTrigger asChild>
                                                     <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => {}}><Trash2 className="h-3 w-3" /></Button> {/* Reduced size */}
                                                 </AlertDialogTrigger>
                                                  {/* Delete Confirmation Dialog */}
                                                 <AlertDialogContent>
                                                     <AlertDialogHeader>
                                                         <AlertDialogTitle>¿Eliminar Colaborador?</AlertDialogTitle>
                                                         <AlertDialogDescription>¿Estás seguro de eliminar este colaborador? Esta acción es irreversible.</AlertDialogDescription>
                                                     </AlertDialogHeader>
                                                     <AlertDialogFooter>
                                                         <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                         <AlertDialogAction className="bg-red-500 text-white">Eliminar</AlertDialogAction>
                                                     </AlertDialogFooter>
                                                 </AlertDialogContent>
                                             </AlertDialog>
                                         </div>
                                     </div>
                                 ))}
                                 <Button variant="outline" size="sm" onClick={() => handleOpenEmployeeModal(null)}>Agregar Colaborador</Button>
                             </div>
                         </CardContent>
                     </Card>
                 </div>

        {/* Column 2: Employee List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Colaboradores</CardTitle>
              <CardDescription>Arrastra colaboradores a los departamentos para asignar turnos.</CardDescription>
            </CardHeader>
            <CardContent>
              <EmployeeList employees={filteredEmployees} />
            </CardContent>
          </Card>
        </div>

        {/* Column 3: Schedule View */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Vista de Horario</CardTitle>
              <CardDescription>Arrastra colaboradores a los departamentos para asignar turnos.</CardDescription>
            </CardHeader>
            <CardContent>
              <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <ScheduleView
                  departments={filteredDepartments}
                  scheduleData={scheduleData}
                  onRemoveShift={handleRemoveShift}
                />
              </DndContext>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Shift Detail Modal */}
      <ShiftDetailModal
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
        onSave={handleAddShift}
        employee={selectedEmployee}
        departmentId={selectedDepartmentId}
        editingShiftDetails={editingShiftDetails}
      />

            {/* Location Modal */}
            <Dialog open={isLocationModalOpen} onOpenChange={setIsLocationModalOpen}>
                <DialogPrimitive.DialogTrigger asChild>
                   {/* Intentionally left blank */}
                </DialogPrimitive.DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{selectedLocation ? 'Editar Sede' : 'Agregar Sede'}</DialogTitle>
                        <DialogDescription>
                            {selectedLocation ? 'Editar los detalles de la sede.' : 'Agregar una nueva sede.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">
                                Nombre
                            </Label>
                            <Input id="name" value={selectedLocation?.name || ''} className="col-span-3" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit">Guardar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Department Modal */}
            <Dialog open={isDepartmentModalOpen} onOpenChange={setIsDepartmentModalOpen}>
                <DialogPrimitive.DialogTrigger asChild>
                  {/* Intentionally left blank */}
                </DialogPrimitive.DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{selectedDepartment ? 'Editar Departamento' : 'Agregar Departamento'}</DialogTitle>
                        <DialogDescription>
                            {selectedDepartment ? 'Editar los detalles del departamento.' : 'Agregar un nuevo departamento.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">
                                Nombre
                            </Label>
                            <Input id="name" value={selectedDepartment?.name || ''} className="col-span-3" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit">Guardar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Employee Modal */}
            <Dialog open={isEmployeeModalOpen} onOpenChange={setIsEmployeeModalOpen}>
                <DialogPrimitive.DialogTrigger asChild>
                    {/* Intentionally left blank */}
                </DialogPrimitive.DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{selectedEmployeeItem ? 'Editar Colaborador' : 'Agregar Colaborador'}</DialogTitle>
                        <DialogDescription>
                            {selectedEmployeeItem ? 'Editar los detalles del colaborador.' : 'Agregar un nuevo colaborador.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">
                                Nombre
                            </Label>
                            <Input id="name" value={selectedEmployeeItem?.name || ''} className="col-span-3" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit">Guardar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
    </main>
  );
}

    