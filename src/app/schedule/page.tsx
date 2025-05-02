
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
import { Plus, Trash2, Edit, ChevronsLeft, ChevronsRight, CalendarIcon, Users, Building, Building2, MinusCircle, ChevronsUpDown, Settings, Save, CopyPlus, Library, Eraser, Download, Upload, FileX2 } from 'lucide-react'; // Added Save, CopyPlus, Library, Eraser, Download, Upload, FileX2
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
import { useToast } from '@/hooks/use-toast'; // Import useToast

import type { Location, Department, Employee, ShiftAssignment, ScheduleData, ShiftTemplate } from '@/types/schedule'; // Added ShiftTemplate
import { v4 as uuidv4 } from 'uuid';
import { startOfWeek, addDays, format, addWeeks, subWeeks, parseISO } from 'date-fns'; // Added parseISO
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// Helper to generate dates for the current week
const getWeekDates = (currentDate: Date): Date[] => {
  const start = startOfWeek(currentDate, { weekStartsOn: 1 }); // Start on Monday
  return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
};

// LocalStorage Keys
const SCHEDULE_DATA_KEY = 'schedulePlannerData';
const SCHEDULE_TEMPLATES_KEY = 'scheduleTemplates';


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

    const [itemToDelete, setItemToDelete] = useState<{ type: 'location' | 'department' | 'employee' | 'template'; id: string; name: string } | null>(null); // Added 'template' type

    // State for template saving dialog
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [templateName, setTemplateName] = useState('');
    const [savedTemplates, setSavedTemplates] = useState<ShiftTemplate[]>([]); // State for saved templates

    // State for clear day confirmation
    const [clearingDate, setClearingDate] = useState<Date | null>(null);


    const { toast } = useToast(); // Get toast function

    // Load schedule data and templates from localStorage on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedSchedule = localStorage.getItem(SCHEDULE_DATA_KEY);
            if (savedSchedule) {
                try {
                    const parsedData = JSON.parse(savedSchedule);
                    // Revive date objects
                    Object.keys(parsedData).forEach(key => {
                        if (parsedData[key] && typeof parsedData[key].date === 'string') {
                            parsedData[key].date = parseISO(parsedData[key].date);
                        }
                    });
                    setScheduleData(parsedData);
                } catch (error) {
                    console.error("Error parsing schedule data from localStorage:", error);
                }
            }

            // Load saved templates
            const savedTemplatesRaw = localStorage.getItem(SCHEDULE_TEMPLATES_KEY);
             if (savedTemplatesRaw) {
                 try {
                     const parsedTemplates = JSON.parse(savedTemplatesRaw);
                     // Basic validation: ensure it's an array
                     if (Array.isArray(parsedTemplates)) {
                         setSavedTemplates(parsedTemplates);
                     } else {
                         console.warn("Invalid template data found in localStorage, ignoring.");
                         localStorage.removeItem(SCHEDULE_TEMPLATES_KEY); // Clear invalid data
                     }
                 } catch (error) {
                     console.error("Error parsing templates from localStorage:", error);
                     localStorage.removeItem(SCHEDULE_TEMPLATES_KEY); // Clear invalid data
                 }
             }
        }
    }, []);


    const weekDates = getWeekDates(currentDate);
    const currentDayKey = format(targetDate, 'yyyy-MM-dd'); // Date key for current schedule

    // Helper to get schedule for a specific date, handling potential undefined
    const getScheduleForDate = (date: Date): ScheduleData => {
        const key = format(date, 'yyyy-MM-dd');
        return scheduleData[key] || { date: date, assignments: {} };
    }

    // Derived state for filtering employees and departments by location
    const filteredEmployees = useMemo(() => employees.filter(emp => emp.primaryLocationId === selectedLocationId), [employees, selectedLocationId]);
    const filteredDepartments = useMemo(() => departments.filter(dep => dep.locationId === selectedLocationId), [departments, selectedLocationId]);
    const filteredTemplates = useMemo(() => savedTemplates.filter(temp => temp.locationId === selectedLocationId), [savedTemplates, selectedLocationId]); // Filter templates by location

    // Derived state for available employees (considering view mode)
    const assignedEmployeeIds = useMemo(() => {
        const ids = new Set<string>();
        let dateKeysToCheck: string[] = [];

        if (viewMode === 'day') {
            dateKeysToCheck.push(format(targetDate, 'yyyy-MM-dd'));
        }
        // In week view, we don't filter based on assignment for the available list
        // Filtering happens on drop

        dateKeysToCheck.forEach(dateKey => {
            const daySchedule = scheduleData[dateKey];
            if (daySchedule) {
                Object.values(daySchedule.assignments).forEach(deptAssignments => {
                    deptAssignments.forEach(assignment => ids.add(assignment.employee.id));
                });
            }
        });
        return ids;
    }, [scheduleData, targetDate, viewMode]); // Removed weekDates dependency as week view doesn't filter


    const availableEmployees = useMemo(() => {
        // Only filter out assigned employees in 'day' view
        if (viewMode === 'day') {
            return filteredEmployees.filter(emp => !assignedEmployeeIds.has(emp.id));
        } else {
            // In 'week' view, the available list shows all employees for the location
            return filteredEmployees;
        }
    }, [filteredEmployees, assignedEmployeeIds, viewMode]);


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
        const dropDate = parseISO(targetData.date); // Parse date string back to Date object

        const employee = employees.find(emp => emp.id === employeeId);
        if (!employee) return;

        // --- Check if employee is already assigned ANYWHERE on this date ---
        const dateKey = format(dropDate, 'yyyy-MM-dd');
        const daySchedule = scheduleData[dateKey];
        if (daySchedule) {
             const isAlreadyAssigned = Object.values(daySchedule.assignments)
                                            .flat() // Combine assignments from all departments for the day
                                            .some(assignment => assignment.employee.id === employeeId);
             if (isAlreadyAssigned) {
                 toast({
                     title: 'Asignación Duplicada',
                     description: `${employee.name} ya tiene un turno asignado para el ${format(dropDate, 'PPP', { locale: es })}.`,
                     variant: 'destructive',
                 });
                 return; // Stop the assignment
             }
        }
        // --- End Check ---

        // If not already assigned on this date, proceed to open modal
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
     const confirmDeleteItem = (type: 'location' | 'department' | 'employee' | 'template', id: string, name: string) => {
        setItemToDelete({ type, id, name });
        // The AlertDialog will open via its trigger
     };


    const handleDeleteItem = () => {
        if (!itemToDelete) return;

        try {
            switch (itemToDelete.type) {
                case 'location':
                    setLocations(locations.filter(loc => loc.id !== itemToDelete.id));
                    setDepartments(departments.filter(dep => dep.locationId !== itemToDelete.id));
                    setEmployees(emps => emps.map(emp => emp.primaryLocationId === itemToDelete.id ? {...emp, primaryLocationId: '' } : emp));
                    if (selectedLocationId === itemToDelete.id) {
                        setSelectedLocationId(locations.length > 1 ? locations.find(loc => loc.id !== itemToDelete.id)!.id : '');
                    }
                    break;
                case 'department':
                    setDepartments(departments.filter(dep => dep.id !== itemToDelete.id));
                     const updatedSchedule = { ...scheduleData };
                     Object.keys(updatedSchedule).forEach(dateKey => {
                         delete updatedSchedule[dateKey].assignments[itemToDelete.id];
                     });
                     setScheduleData(updatedSchedule);
                    break;
                case 'employee':
                    setEmployees(employees.filter(emp => emp.id !== itemToDelete.id));
                     const updatedScheduleEmp = { ...scheduleData };
                     Object.keys(updatedScheduleEmp).forEach(dateKey => {
                          Object.keys(updatedScheduleEmp[dateKey].assignments).forEach(deptId => {
                              updatedScheduleEmp[dateKey].assignments[deptId] = updatedScheduleEmp[dateKey].assignments[deptId].filter(a => a.employee.id !== itemToDelete.id);
                          });
                     });
                     setScheduleData(updatedScheduleEmp);
                    break;
                 case 'template':
                     const updatedTemplates = savedTemplates.filter(t => t.id !== itemToDelete.id);
                     setSavedTemplates(updatedTemplates);
                     if (typeof window !== 'undefined') {
                         localStorage.setItem(SCHEDULE_TEMPLATES_KEY, JSON.stringify(updatedTemplates));
                     }
                     toast({ title: 'Formación Eliminada', description: `La formación "${itemToDelete.name}" ha sido eliminada.` });
                    break;
            }
        } catch (error) {
             console.error(`Error deleting item type ${itemToDelete.type}:`, error);
             toast({ title: 'Error al Eliminar', description: 'No se pudo completar la eliminación.', variant: 'destructive' });
        } finally {
            setItemToDelete(null); // Close dialog
        }
    };

     // Handlers for Week Navigation
     const handlePreviousWeek = () => {
        setCurrentDate(prevDate => subWeeks(prevDate, 1));
     };

     const handleNextWeek = () => {
        setCurrentDate(prevDate => addWeeks(prevDate, 1));
     };

    // --- Advanced Action Handlers ---
    const handleSaveSchedule = () => {
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem(SCHEDULE_DATA_KEY, JSON.stringify(scheduleData));
                toast({ title: 'Horario Guardado', description: 'El horario actual se ha guardado localmente.' });
            } catch (error) {
                console.error("Error saving schedule data to localStorage:", error);
                toast({ title: 'Error al Guardar', description: 'No se pudo guardar el horario.', variant: 'destructive' });
            }
        }
    };

     const handleDuplicateDay = (sourceDate: Date) => {
         const sourceDayKey = format(sourceDate, 'yyyy-MM-dd');
         const nextDayDate = addDays(sourceDate, 1);
         const nextDayKey = format(nextDayDate, 'yyyy-MM-dd');
         const sourceSchedule = scheduleData[sourceDayKey];

         if (!sourceSchedule || Object.keys(sourceSchedule.assignments).length === 0) {
             toast({ title: 'Nada que Duplicar', description: `No hay turnos asignados para el ${format(sourceDate, 'PPP', { locale: es })}.`, variant: 'destructive' });
             return;
         }

         // Deep copy assignments to avoid reference issues
         const duplicatedAssignments = JSON.parse(JSON.stringify(sourceSchedule.assignments));
         // Regenerate unique IDs for duplicated assignments
         Object.keys(duplicatedAssignments).forEach(deptId => {
             duplicatedAssignments[deptId].forEach((assign: ShiftAssignment) => {
                 assign.id = uuidv4();
             });
         });


         setScheduleData(prevData => ({
             ...prevData,
             [nextDayKey]: {
                 date: nextDayDate,
                 assignments: duplicatedAssignments,
             },
         }));

         // Optionally, navigate to the next day in day view
         if (viewMode === 'day') {
             setTargetDate(nextDayDate);
             setCurrentDate(nextDayDate); // Ensure week navigator updates if view changes
         }

         toast({ title: 'Horario Duplicado', description: `El horario del ${format(sourceDate, 'dd/MM')} se duplicó al ${format(nextDayDate, 'dd/MM')}.` });
     };

      // --- Clear Day Handler ---
     const handleConfirmClearDay = (dateToClear: Date) => {
         setClearingDate(dateToClear);
     };

     const handleClearDay = () => {
         if (!clearingDate) return;
         const dateKey = format(clearingDate, 'yyyy-MM-dd');

         setScheduleData(prevData => {
             const updatedData = { ...prevData };
             if (updatedData[dateKey]) {
                 updatedData[dateKey] = {
                     date: clearingDate,
                     assignments: {} // Clear assignments for this day
                 };
             }
             return updatedData;
         });
         setClearingDate(null); // Close dialog
         toast({ title: 'Horario Limpiado', description: `Se eliminaron todos los turnos para el ${format(clearingDate, 'PPP', { locale: es })}.` });
     };


     const handleOpenTemplateModal = () => {
        const currentDayKey = format(targetDate, 'yyyy-MM-dd');
        const currentSchedule = scheduleData[currentDayKey];

        if (!currentSchedule || Object.keys(currentSchedule.assignments).length === 0) {
            toast({ title: 'Formación Vacía', description: `No hay turnos asignados hoy para guardar como formación.`, variant: 'destructive' });
            return;
        }
        setTemplateName(''); // Reset template name
        setIsTemplateModalOpen(true);
     };

     const handleSaveTemplate = () => {
         if (!templateName.trim()) {
             toast({ title: 'Nombre Inválido', description: 'Por favor ingresa un nombre para la formación.', variant: 'destructive' });
             return;
         }
         const currentDayKey = format(targetDate, 'yyyy-MM-dd');
         const currentAssignments = scheduleData[currentDayKey]?.assignments || {};

         if (Object.keys(currentAssignments).length === 0) {
             toast({ title: 'Formación Vacía', description: 'No hay turnos para guardar.', variant: 'destructive' });
             setIsTemplateModalOpen(false);
             return;
         }

         const newTemplate: ShiftTemplate = { // Add type annotation
             id: uuidv4(),
             name: templateName.trim(),
             locationId: selectedLocationId, // Save with current location context
             assignments: currentAssignments, // Save the current day's assignments
             createdAt: new Date().toISOString(),
         };

         if (typeof window !== 'undefined') {
            try {
                const updatedTemplates = [...savedTemplates, newTemplate];
                setSavedTemplates(updatedTemplates); // Update state
                localStorage.setItem(SCHEDULE_TEMPLATES_KEY, JSON.stringify(updatedTemplates));
                toast({ title: 'Formación Guardada', description: `La formación "${newTemplate.name}" se ha guardado.` });
                setIsTemplateModalOpen(false);
                setTemplateName('');
            } catch (error) {
                 console.error("Error saving template to localStorage:", error);
                 toast({ title: 'Error al Guardar', description: 'No se pudo guardar la formación.', variant: 'destructive' });
            }
         }

     };

     // --- Load Template Handler ---
     const handleLoadTemplate = (templateId: string) => {
         if (typeof window !== 'undefined') {
             const templateToLoad = savedTemplates.find((t: any) => t.id === templateId);

             if (!templateToLoad) {
                 toast({ title: 'Formación no encontrada', variant: 'destructive' });
                 return;
             }
             // Check if template matches current location
             if (templateToLoad.locationId !== selectedLocationId) {
                 toast({
                     title: 'Sede Incorrecta',
                     description: `La formación "${templateToLoad.name}" pertenece a otra sede. Cambia de sede para cargarla.`,
                     variant: 'destructive',
                 });
                 return;
             }


             // Apply template to the current targetDate
             const dateKey = format(targetDate, 'yyyy-MM-dd');
             // Regenerate assignment IDs when loading a template
             const loadedAssignments = JSON.parse(JSON.stringify(templateToLoad.assignments));
             Object.keys(loadedAssignments).forEach(deptId => {
                 loadedAssignments[deptId].forEach((assign: ShiftAssignment) => {
                     assign.id = uuidv4();
                 });
             });

             setScheduleData(prev => ({
                 ...prev,
                 [dateKey]: {
                     date: targetDate,
                     assignments: loadedAssignments,
                 }
             }));
             toast({ title: 'Formación Cargada', description: `Se cargó la formación "${templateToLoad.name}" para hoy.` });
             setIsConfigModalOpen(false); // Close config modal after loading
         }
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
                         <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto"> {/* Even Wider modal, scrollable */}
                              <DialogHeader>
                                  <DialogTitle>Configuración General</DialogTitle>
                                  <DialogDescription>Gestiona sedes, departamentos, colaboradores y formaciones guardadas.</DialogDescription>
                              </DialogHeader>
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 py-4">
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
                                  <div className="space-y-4 border-r pr-4 md:border-r-0 md:pb-0">
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
                                  {/* Saved Templates (Formaciones) Column */}
                                  <div className="space-y-4">
                                      <div className="flex justify-between items-center">
                                          <h4 className="font-semibold text-foreground flex items-center gap-1"><Library className="h-4 w-4 text-muted-foreground"/>Formaciones Guardadas ({filteredTemplates.length})</h4>
                                          {/* Add Template button moved to Actions Row */}
                                      </div>
                                       <ul className="space-y-2 text-sm">
                                            {filteredTemplates.length > 0 ? filteredTemplates.map((template) => (
                                                <li key={template.id} className="flex items-center justify-between group py-1 border-b">
                                                    <span className="truncate text-muted-foreground">{template.name}</span>
                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
                                                        {/* Disable load button if not in day view */}
                                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => handleLoadTemplate(template.id)} title="Cargar Formación" disabled={viewMode !== 'day'}>
                                                            <Upload className="h-4 w-4" />
                                                        </Button>
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => confirmDeleteItem('template', template.id, template.name)} title="Eliminar Formación"><Trash2 className="h-4 w-4" /></Button>
                                                            </AlertDialogTrigger>
                                                             {/* Delete Confirmation defined later */}
                                                        </AlertDialog>
                                                    </div>
                                                </li>
                                            )) : (
                                                <p className="text-xs text-muted-foreground italic text-center pt-2">No hay formaciones guardadas para esta sede.</p>
                                            )}
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

            {/* --- Actions Row --- */}
            <div className="mb-6 flex flex-wrap justify-center gap-2">
                 <Button onClick={handleSaveSchedule} variant="outline">
                     <Save className="mr-2 h-4 w-4" /> Guardar Horario
                 </Button>
                 {/* Conditionally render Duplicate Day button based on viewMode */}
                 {viewMode === 'day' && (
                    <Button onClick={() => handleDuplicateDay(targetDate)} variant="outline">
                        <CopyPlus className="mr-2 h-4 w-4" /> Duplicar al Día Siguiente
                    </Button>
                 )}
                 <Dialog open={isTemplateModalOpen} onOpenChange={setIsTemplateModalOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" onClick={handleOpenTemplateModal} disabled={viewMode !== 'day'}>
                            <Download className="mr-2 h-4 w-4" /> Guardar como Formación {/* Changed icon */}
                        </Button>
                    </DialogTrigger>
                     <DialogContent>
                         <DialogHeader>
                             <DialogTitle>Guardar Formación</DialogTitle>
                             <DialogDescription>Ingresa un nombre para esta formación (basada en el horario de hoy para {locations.find(l => l.id === selectedLocationId)?.name}).</DialogDescription>
                         </DialogHeader>
                         <div className="py-4">
                             <Label htmlFor="template-name">Nombre Formación</Label>
                             <Input
                                id="template-name"
                                value={templateName}
                                onChange={(e) => setTemplateName(e.target.value)}
                                placeholder="Ej: Apertura Semana, Cierre FinDeSemana"
                             />
                         </div>
                         <DialogFooter>
                            <DialogClose asChild>
                              <Button variant="outline">Cancelar</Button>
                            </DialogClose>
                             <Button onClick={handleSaveTemplate}>Guardar Formación</Button>
                         </DialogFooter>
                     </DialogContent>
                 </Dialog>
                 {/* Load Template Button (Placeholder/Example) - Actual load happens from config modal */}
                  {/*
                 <Button variant="outline" disabled={viewMode !== 'day'}>
                     <Upload className="mr-2 h-4 w-4" /> Cargar Formación
                 </Button>
                  */}
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
                            onDuplicateDay={handleDuplicateDay} // Pass the duplicate handler
                            onClearDay={handleConfirmClearDay} // Pass the clear handler trigger
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
                             ¿Eliminar {itemToDelete?.type === 'location' ? 'Sede' : itemToDelete?.type === 'department' ? 'Departamento' : itemToDelete?.type === 'employee' ? 'Colaborador' : 'Formación'} "{itemToDelete?.name}"?
                             {itemToDelete?.type === 'location' && " Se eliminarán los departamentos, colaboradores y formaciones asociados."}
                             {itemToDelete?.type === 'department' && " Se eliminarán los turnos asociados en los horarios y formaciones."}
                             {itemToDelete?.type === 'employee' && " Se eliminarán los turnos asociados en los horarios y formaciones."}
                             {itemToDelete?.type === 'template' && " Se eliminará esta formación guardada."}
                             <br/>Esta acción no se puede deshacer.
                         </AlertDialogDescription>
                     </AlertDialogHeader>
                     <AlertDialogFooter>
                         <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancelar</AlertDialogCancel>
                         <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDeleteItem}>Eliminar</AlertDialogAction>
                     </AlertDialogFooter>
                 </AlertDialogContent>
            </AlertDialog>

            {/* Clear Day Confirmation */}
            <AlertDialog open={!!clearingDate} onOpenChange={(open) => !open && setClearingDate(null)}>
                 <AlertDialogContent>
                     <AlertDialogHeader>
                         <AlertDialogTitle>¿Limpiar Turnos del Día?</AlertDialogTitle>
                         <AlertDialogDescription>
                            Esta acción eliminará todos los turnos asignados para el{' '}
                            <strong>{clearingDate ? format(clearingDate, 'PPP', { locale: es }) : ''}</strong>. No se puede deshacer.
                         </AlertDialogDescription>
                     </AlertDialogHeader>
                     <AlertDialogFooter>
                         <AlertDialogCancel onClick={() => setClearingDate(null)}>Cancelar</AlertDialogCancel>
                         <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleClearDay}>Limpiar Día</AlertDialogAction>
                     </AlertDialogFooter>
                 </AlertDialogContent>
            </AlertDialog>


        </main>
    );
}
