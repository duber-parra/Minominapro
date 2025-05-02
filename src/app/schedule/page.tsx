
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
import { Plus, Trash2, Edit, ChevronsLeft, ChevronsRight, CalendarIcon, Users, Building, Building2, MinusCircle, ChevronsUpDown, Settings, Save, CopyPlus, Library, Eraser, Download, Upload, FileX2, FileSpreadsheet, FileDown, PencilLine } from 'lucide-react'; // Added FileDown icon, PencilLine
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label'; // Import Label
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator'; // Import Separator
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'; // Import Popover
import { Calendar } from '@/components/ui/calendar'; // Import Calendar

import { LocationSelector } from '@/components/schedule/LocationSelector';
import { EmployeeList } from '@/components/schedule/EmployeeList';
import { ScheduleView } from '@/components/schedule/ScheduleView';
import { ShiftDetailModal } from '@/components/schedule/ShiftDetailModal';
import { WeekNavigator } from '@/components/schedule/WeekNavigator'; // Import WeekNavigator
import { useToast } from '@/hooks/use-toast'; // Import useToast
import { useIsMobile } from '@/hooks/use-mobile'; // Import useIsMobile
import { EmployeeSelectionModal } from '@/components/schedule/EmployeeSelectionModal'; // Import EmployeeSelectionModal

import type { Location, Department, Employee, ShiftAssignment, ScheduleData, ShiftTemplate } from '@/types/schedule'; // Added ShiftTemplate
import { v4 as uuidv4 } from 'uuid';
import { startOfWeek, endOfWeek, addDays, format, addWeeks, subWeeks, parseISO, getYear, isValid, differenceInMinutes, parse as parseDateFnsInternal } from 'date-fns'; // Added differenceInMinutes, parseDateFnsInternal
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { getColombianHolidays } from '@/services/colombian-holidays'; // Import holiday service
import { exportScheduleToPDF } from '@/lib/schedule-pdf-exporter'; // Import the new PDF exporter


// Helper to generate dates for the current week
const getWeekDates = (currentDate: Date): Date[] => {
  const start = startOfWeek(currentDate, { weekStartsOn: 1 }); // Start on Monday
  return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
};

// LocalStorage Keys
const SCHEDULE_DATA_KEY = 'schedulePlannerData';
const SCHEDULE_TEMPLATES_KEY = 'scheduleTemplates';

// Cache for holidays
let holidaysCache: { [year: number]: Set<string> } = {};

async function fetchAndCacheHolidays(year: number): Promise<Set<string>> {
    if (holidaysCache[year]) {
        return holidaysCache[year];
    }
    try {
        const holidays = await getColombianHolidays(year);
        if (!Array.isArray(holidays)) {
            console.error(`Error: getColombianHolidays(${year}) did not return an array.`);
            throw new Error(`Formato de respuesta inválido para festivos de ${year}.`);
        }
        // Ensure holidays have correct structure before formatting
        const holidaySet = new Set(holidays.map(h => {
            if (!h || typeof h.year !== 'number' || typeof h.month !== 'number' || typeof h.day !== 'number') {
                console.error(`Error: Invalid holiday object structure for year ${year}:`, h);
                return ''; // Skip invalid entry
            }
             try {
                 const dateToFormat = new Date(h.year, h.month - 1, h.day);
                 if (!isValid(dateToFormat) || getYear(dateToFormat) !== h.year) {
                     console.error(`Error: Invalid date components for holiday in year ${year}:`, h);
                     return ''; // Skip invalid date
                 }
                 return format(dateToFormat, 'yyyy-MM-dd');
             } catch (formatError) {
                 console.error(`Error formatting holiday date for year ${year}:`, h, formatError);
                 return ''; // Skip on formatting error
             }
        }).filter(dateStr => dateStr !== '')); // Filter out empty strings from errors

        holidaysCache[year] = holidaySet;
        return holidaySet;
    } catch (error) {
        console.error(`Error fetching or caching holidays for ${year}:`, error);
        return new Set(); // Return empty set on error
    }
}

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

// Helper function to parse HH:MM time into minutes from midnight
const parseTimeToMinutes = (timeStr: string): number => {
  if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) return 0; // Return 0 for invalid format
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// Helper function to calculate shift duration in hours
const calculateShiftDuration = (assignment: ShiftAssignment, shiftDate: Date): number => {
    try {
        const startDateStr = format(shiftDate, 'yyyy-MM-dd');
        const startTime = parseDateFnsInternal(`${startDateStr} ${assignment.startTime}`, 'yyyy-MM-dd HH:mm', new Date());

        // Determine end date/time, considering overnight shifts
        const startTimeMinutes = parseTimeToMinutes(assignment.startTime);
        const endTimeMinutes = parseTimeToMinutes(assignment.endTime);
        let endTime = parseDateFnsInternal(`${startDateStr} ${assignment.endTime}`, 'yyyy-MM-dd HH:mm', new Date());
        if (!isValid(endTime) || endTimeMinutes < startTimeMinutes) { // Handle invalid end time or overnight shift
             if (endTimeMinutes < startTimeMinutes) {
                endTime = addDays(parseDateFnsInternal(`${startDateStr} ${assignment.endTime}`, 'yyyy-MM-dd HH:mm', new Date()), 1);
             } else {
                 // If endTime is invalid but not overnight, return 0 or handle as error
                 console.warn('Invalid end time for duration calculation:', assignment);
                 return 0;
             }
        }


        if (!isValid(startTime) || !isValid(endTime)) {
            console.warn('Invalid start or end time for duration calculation:', assignment);
            return 0;
        }

        let totalShiftMinutes = differenceInMinutes(endTime, startTime);

        // Subtract break duration if applicable
        let breakMinutes = 0;
        if (assignment.includeBreak && assignment.breakStartTime && assignment.breakEndTime) {
            const breakStartMinutes = parseTimeToMinutes(assignment.breakStartTime);
            const breakEndMinutes = parseTimeToMinutes(assignment.breakEndTime);
            if (breakEndMinutes > breakStartMinutes) { // Ensure break end is after start
                 // Complex check: Does the break interval actually fall within the shift interval?
                 // For simplicity now, assume the entered break happens during the shift if includeBreak is true.
                 breakMinutes = breakEndMinutes - breakStartMinutes;
            }
        }

        const netMinutes = totalShiftMinutes - breakMinutes;
        return Math.max(0, netMinutes) / 60; // Return hours, ensure non-negative
    } catch (error) {
        console.error("Error calculating shift duration:", error, assignment);
        return 0;
    }
};


export default function SchedulePage() {
    const [locations, setLocations] = useState<Location[]>(initialLocations);
    const [departments, setDepartments] = useState<Department[]>(initialDepartments);
    const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
    const [currentDate, setCurrentDate] = useState(new Date()); // Track current date for week/day view navigation
    const [scheduleData, setScheduleData] = useState<{ [dateKey: string]: ScheduleData }>({}); // Store data per date key "yyyy-MM-dd"
    const [viewMode, setViewMode] = useState<'day' | 'week'>('week'); // Default to week view
    const [selectedLocationId, setSelectedLocationId] = useState<string>(initialLocations[0].id);
    const [isShiftModalOpen, setIsShiftModalOpen] = useState(false); // Shift details modal
    // State for selecting employee via '+' button
    const [isEmployeeSelectionModalOpen, setIsEmployeeSelectionModalOpen] = useState(false);
    const [shiftRequestContext, setShiftRequestContext] = useState<{ departmentId: string; date: Date } | null>(null);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null); // Employee selected for the shift being added/edited
    // State for tracking the shift being edited
    const [editingShift, setEditingShift] = useState<{ assignment: ShiftAssignment; date: Date; departmentId: string } | null>(null);
    // Target date: Used specifically for DAY VIEW and for MODALS (shift add/edit, template load)
    const [targetDate, setTargetDate] = useState<Date>(new Date());

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

    // State for holidays
    const [holidaySet, setHolidaySet] = useState<Set<string>>(new Set());
    const [isCheckingHoliday, setIsCheckingHoliday] = useState<boolean>(false);

    const isMobile = useIsMobile(); // Hook to detect mobile/tablet view
    const { toast } = useToast(); // Get toast function

    // Fetch holidays whenever the year of the current week changes
    useEffect(() => {
        const startYear = getYear(startOfWeek(currentDate, { weekStartsOn: 1 }));
        const endYear = getYear(endOfWeek(currentDate, { weekStartsOn: 1 }));
        const yearsToFetch = new Set([startYear, endYear]);

        setIsCheckingHoliday(true);
        Promise.all(Array.from(yearsToFetch).map(year => fetchAndCacheHolidays(year)))
            .then(results => {
                // Combine results from potentially multiple years
                const combinedSet = new Set<string>();
                results.forEach(set => set.forEach(date => combinedSet.add(date)));
                setHolidaySet(combinedSet);
            })
            .catch(error => {
                console.error("Error fetching holidays for week view:", error);
                setHolidaySet(new Set()); // Reset on error
            })
            .finally(() => {
                setIsCheckingHoliday(false);
            });
    }, [currentDate]); // Re-run when the navigated date changes

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
    // const currentDayKey = format(targetDate, 'yyyy-MM-dd'); // Date key for current schedule (Removed as it's used less directly now)

    // Helper to get schedule for a specific date, handling potential undefined
    const getScheduleForDate = (date: Date): ScheduleData => {
        const key = format(date, 'yyyy-MM-dd');
        return scheduleData[key] || { date: date, assignments: {} };
    }

    // Derived state for filtering employees and departments by location
    const filteredEmployees = useMemo(() => employees.filter(emp => emp.primaryLocationId === selectedLocationId), [employees, selectedLocationId]);
    const filteredDepartments = useMemo(() => departments.filter(dep => dep.locationId === selectedLocationId), [departments, selectedLocationId]);
    const filteredTemplates = useMemo(() => savedTemplates.filter(temp => temp.locationId === selectedLocationId), [savedTemplates, selectedLocationId]); // Filter templates by location

    // Derived state for available employees (considering view mode and date)
    const assignedEmployeeIdsForTargetDate = useMemo(() => {
        const ids = new Set<string>();
         // Determine the date to check based on context
        const dateToCheck = shiftRequestContext?.date || targetDate; // Use context date if available, else targetDate
        const dateKey = format(dateToCheck, 'yyyy-MM-dd');
        const daySchedule = scheduleData[dateKey];
        if (daySchedule) {
            Object.values(daySchedule.assignments).forEach(deptAssignments => {
                deptAssignments.forEach(assignment => ids.add(assignment.employee.id));
            });
        }
        return ids;
        // Re-calculate when schedule changes, or when the context/target date changes
    }, [scheduleData, targetDate, shiftRequestContext]);


    // Available employees calculation now considers view mode
    const availableEmployees = useMemo(() => {
        if (viewMode === 'week') {
            // In week view, show all employees filtered by location, regardless of assignment on a specific day
            return filteredEmployees;
        } else {
            // In day view, filter out employees already assigned on the targetDate
            return filteredEmployees.filter(emp => !assignedEmployeeIdsForTargetDate.has(emp.id));
        }
    }, [filteredEmployees, assignedEmployeeIdsForTargetDate, viewMode]);


    useEffect(() => {
        // Ensure department locationId defaults to current selected location
        setDepartmentFormData(prev => ({ ...prev, locationId: selectedLocationId }));
        setEmployeeFormData(prev => ({ ...prev, primaryLocationId: selectedLocationId }));
    }, [selectedLocationId]);

    const handleLocationChange = (locationId: string) => {
        setSelectedLocationId(locationId);
    };

    // Handler to open Employee Selection Modal when '+' is clicked
    const handleOpenEmployeeSelectionModal = (departmentId: string, date: Date) => {
         setEditingShift(null); // Ensure we are not in edit mode
         setShiftRequestContext({ departmentId, date }); // Store the context
         setIsEmployeeSelectionModalOpen(true); // Open the selection modal
    };

    // Handler when an employee is selected from the EmployeeSelectionModal
    const handleEmployeeSelectedForShift = (employee: Employee) => {
        if (!shiftRequestContext) return;
        setSelectedEmployee(employee); // Set the selected employee
        setIsEmployeeSelectionModalOpen(false); // Close selection modal
        setIsShiftModalOpen(true); // Open the shift detail modal for ADDING
    };

    // Handler for Drag & Drop assignment
    const handleOpenShiftModalForDrop = (employee: Employee, departmentId: string, date: Date) => {
        setEditingShift(null); // Ensure not in edit mode
        setSelectedEmployee(employee);
        // Set context for consistency, even though we already have the employee
        setShiftRequestContext({ departmentId, date });
        setIsShiftModalOpen(true); // Open the shift detail modal for ADDING
    };

    // --- Handler for clicking an existing shift card ---
    const handleShiftClick = (assignment: ShiftAssignment, date: Date, departmentId: string) => {
        setEditingShift({ assignment, date, departmentId }); // Set the shift to be edited
        setSelectedEmployee(assignment.employee); // Employee is already known
        setShiftRequestContext({ departmentId, date }); // Set context
        setIsShiftModalOpen(true); // Open the shift detail modal for EDITING
    };


    const handleAddOrUpdateShift = (details: any) => {
        // Use editingShift context if available, otherwise use selectedEmployee and shiftRequestContext
        const context = editingShift || shiftRequestContext;
        const employeeForShift = editingShift?.assignment.employee || selectedEmployee;

        if (!employeeForShift || !context) return;

        const { departmentId, date } = context;
        const dateKey = format(date, 'yyyy-MM-dd');

        // Create or update the assignment
        const assignmentPayload: ShiftAssignment = {
            // If editing, use existing ID, otherwise generate new one
            id: editingShift?.assignment.id || uuidv4(),
            employee: employeeForShift,
            startTime: details.startTime,
            endTime: details.endTime,
            includeBreak: details.includeBreak || false,
            breakStartTime: details.includeBreak ? details.breakStartTime : undefined,
            breakEndTime: details.includeBreak ? details.breakEndTime : undefined,
        };

        setScheduleData(prevData => {
            const dayData = prevData[dateKey] || { date: date, assignments: {} };
            const departmentAssignments = dayData.assignments[departmentId] || [];

            let updatedAssignments;
            if (editingShift) {
                // Update existing assignment
                updatedAssignments = departmentAssignments.map(a =>
                    a.id === editingShift.assignment.id ? assignmentPayload : a
                );
            } else {
                // Add new assignment
                updatedAssignments = [...departmentAssignments, assignmentPayload];
            }

            return {
                ...prevData,
                [dateKey]: {
                    ...dayData,
                    assignments: {
                        ...dayData.assignments,
                        [departmentId]: updatedAssignments,
                    },
                },
            };
        });
        // Reset state after saving
        setIsShiftModalOpen(false);
        setSelectedEmployee(null);
        setShiftRequestContext(null);
        setEditingShift(null); // Clear editing state
         toast({
            title: editingShift ? 'Turno Actualizado' : 'Turno Agregado',
            description: `Turno para ${employeeForShift.name} el ${format(date, 'PPP', { locale: es })} ${editingShift ? 'actualizado.' : 'agregado.'}`,
        });
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
         toast({ title: 'Turno Eliminado', variant: 'destructive' });
    };


    const handleDragEnd = (event: DragEndEvent) => {
        const { over, active } = event;

        if (!over || !active || isMobile) return; // Ignore drag on mobile

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
        handleOpenShiftModalForDrop(employee, departmentId, dropDate);
    };

    // CRUD Handlers
    const handleOpenLocationModal = (location: Location | null) => {
        setEditingLocation(location);
        setLocationFormData({ name: location?.name || '' });
        setIsLocationModalOpen(true);
    };

    const handleSaveLocation = () => {
        const name = locationFormData.name.trim();
        if (!name) {
            toast({ title: 'Nombre Inválido', description: 'El nombre de la sede no puede estar vacío.', variant: 'destructive' });
            return;
        }
        if (editingLocation) {
            // Update existing location
            setLocations(locations.map(loc => loc.id === editingLocation.id ? { ...loc, name } : loc));
             toast({ title: 'Sede Actualizada', description: `Sede "${name}" actualizada.` });
        } else {
            // Add new location
            const newLocation = { id: uuidv4(), name };
            setLocations([...locations, newLocation]);
            toast({ title: 'Sede Agregada', description: `Sede "${name}" agregada.` });
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
         const name = departmentFormData.name.trim();
         const locationId = departmentFormData.locationId;
        if (!name || !locationId) {
            toast({ title: 'Datos Incompletos', description: 'El nombre y la sede del departamento son requeridos.', variant: 'destructive' });
            return;
        }
        if (editingDepartment) {
            setDepartments(departments.map(dep => dep.id === editingDepartment.id ? { ...dep, name, locationId } : dep));
             toast({ title: 'Departamento Actualizado', description: `Departamento "${name}" actualizado.` });
        } else {
            const newDepartment = { id: uuidv4(), name, locationId, icon: Building }; // Assign default icon
            setDepartments([...departments, newDepartment]);
            toast({ title: 'Departamento Agregado', description: `Departamento "${name}" agregado.` });
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
         const name = employeeFormData.name.trim();
         const primaryLocationId = employeeFormData.primaryLocationId;
         if (!name || !primaryLocationId) {
            toast({ title: 'Datos Incompletos', description: 'El nombre y la sede principal del colaborador son requeridos.', variant: 'destructive' });
            return;
         }
        if (editingEmployee) {
            setEmployees(employees.map(emp => emp.id === editingEmployee.id ? { ...emp, name, primaryLocationId } : emp));
             toast({ title: 'Colaborador Actualizado', description: `Colaborador "${name}" actualizado.` });
        } else {
            const newEmployee = { id: uuidv4(), name, primaryLocationId };
            setEmployees([...employees, newEmployee]);
             toast({ title: 'Colaborador Agregado', description: `Colaborador "${name}" agregado.` });
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
            let message = '';
            switch (itemToDelete.type) {
                case 'location':
                    setLocations(locations.filter(loc => loc.id !== itemToDelete.id));
                    setDepartments(departments.filter(dep => dep.locationId !== itemToDelete.id));
                    setEmployees(emps => emps.map(emp => emp.primaryLocationId === itemToDelete.id ? {...emp, primaryLocationId: '' } : emp));
                    // Remove templates associated with this location
                    const remainingTemplatesLocation = savedTemplates.filter(t => t.locationId !== itemToDelete.id);
                    setSavedTemplates(remainingTemplatesLocation);
                    if (typeof window !== 'undefined') {
                         localStorage.setItem(SCHEDULE_TEMPLATES_KEY, JSON.stringify(remainingTemplatesLocation));
                    }
                    if (selectedLocationId === itemToDelete.id) {
                        setSelectedLocationId(locations.length > 1 ? locations.find(loc => loc.id !== itemToDelete.id)!.id : '');
                    }
                    message = `Sede "${itemToDelete.name}" y sus datos asociados eliminados.`;
                    break;
                case 'department':
                    setDepartments(departments.filter(dep => dep.id !== itemToDelete.id));
                     const updatedSchedule = { ...scheduleData };
                     Object.keys(updatedSchedule).forEach(dateKey => {
                         delete updatedSchedule[dateKey].assignments[itemToDelete.id];
                     });
                     setScheduleData(updatedSchedule);
                      // Remove assignments from templates
                     const updatedTemplatesDept = savedTemplates.map(t => {
                         const newAssignments = { ...t.assignments };
                         delete newAssignments[itemToDelete.id];
                         return { ...t, assignments: newAssignments };
                     });
                     setSavedTemplates(updatedTemplatesDept);
                     if (typeof window !== 'undefined') {
                         localStorage.setItem(SCHEDULE_TEMPLATES_KEY, JSON.stringify(updatedTemplatesDept));
                     }
                    message = `Departamento "${itemToDelete.name}" eliminado.`;
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
                     // Remove assignments from templates
                      const updatedTemplatesEmp = savedTemplates.map(t => {
                         const newAssignments = { ...t.assignments };
                         Object.keys(newAssignments).forEach(deptId => {
                             newAssignments[deptId] = newAssignments[deptId].filter(a => (typeof a.employee === 'object' ? a.employee.id : a.employee) !== itemToDelete.id);
                         });
                         return { ...t, assignments: newAssignments };
                     });
                     setSavedTemplates(updatedTemplatesEmp);
                     if (typeof window !== 'undefined') {
                         localStorage.setItem(SCHEDULE_TEMPLATES_KEY, JSON.stringify(updatedTemplatesEmp));
                     }
                    message = `Colaborador "${itemToDelete.name}" eliminado.`;
                    break;
                 case 'template':
                     const updatedTemplates = savedTemplates.filter(t => t.id !== itemToDelete.id);
                     setSavedTemplates(updatedTemplates);
                     if (typeof window !== 'undefined') {
                         localStorage.setItem(SCHEDULE_TEMPLATES_KEY, JSON.stringify(updatedTemplates));
                     }
                     message = `Formación "${itemToDelete.name}" eliminada.`;
                    break;
            }
            toast({ title: 'Elemento Eliminado', description: message, variant: 'destructive' });
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
         toast({ title: 'Horario Limpiado', description: `Se eliminaron todos los turnos para el ${format(clearingDate, 'PPP', { locale: es })}.`, variant: 'destructive' });
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

    // --- Holiday Check Helper ---
    const isHoliday = useCallback((date: Date | null | undefined): boolean => {
        if (!date || !isValid(date)) return false;
        const dateStr = format(date, 'yyyy-MM-dd');
        return holidaySet.has(dateStr);
    }, [holidaySet]);


    // Wrapper component to conditionally provide DndContext
    const DndWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
        // Only enable DND on non-mobile devices
        if (isMobile) {
            return <>{children}</>; // Render children directly without DndContext on mobile
        } else {
            return (
                <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    {children}
                </DndContext>
            );
        }
    };

    // --- CSV Export Handler ---
    const handleExportCSV = () => {
        const dataToExport: any[] = [];
        const headers = [
            'ID_Empleado',
            'Nombre_Empleado',
            'Fecha',
            'Departamento',
            'Hora_Inicio',
            'Hora_Fin',
            'Incluye_Descanso',
            'Inicio_Descanso',
            'Fin_Descanso',
            'Horas_Trabajadas',
        ];
        dataToExport.push(headers);

        // Collect data for the current week
        weekDates.forEach(date => {
            const dateKey = format(date, 'yyyy-MM-dd');
            const daySchedule = scheduleData[dateKey];

            if (daySchedule) {
                Object.entries(daySchedule.assignments).forEach(([deptId, assignments]) => {
                    const department = departments.find(d => d.id === deptId);
                    assignments.forEach(assignment => {
                        const durationHours = calculateShiftDuration(assignment, date); // Calculate duration
                        dataToExport.push([
                            assignment.employee.id,
                            assignment.employee.name,
                            dateKey,
                            department?.name || deptId,
                            assignment.startTime,
                            assignment.endTime,
                            assignment.includeBreak ? 'Sí' : 'No',
                            assignment.includeBreak ? assignment.breakStartTime : '',
                            assignment.includeBreak ? assignment.breakEndTime : '',
                            durationHours.toFixed(2), // Format hours to 2 decimal places
                        ]);
                    });
                });
            }
        });

        if (dataToExport.length <= 1) {
            toast({ title: 'Sin Datos', description: 'No hay turnos asignados en la semana actual para exportar.', variant: 'default' });
            return;
        }

        // Format as CSV string
        const csvContent = "data:text/csv;charset=utf-8,"
            + dataToExport.map(e => e.join(",")).join("\n");

        // Trigger download
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        const weekStartFormatted = format(weekDates[0], 'yyyyMMdd');
        const weekEndFormatted = format(weekDates[6], 'yyyyMMdd');
        link.setAttribute("download", `Horario_${selectedLocationId}_${weekStartFormatted}-${weekEndFormatted}.csv`);
        document.body.appendChild(link); // Required for FF
        link.click();
        document.body.removeChild(link);

        toast({ title: 'Exportación CSV Exitosa', description: 'Se ha descargado el archivo de horas trabajadas.' });
    };

    // --- PDF Export Handler ---
    const handleExportPDF = () => {
        // Gather the necessary data for the current week
        const locationName = locations.find(l => l.id === selectedLocationId)?.name || selectedLocationId;
        const data = {
            locationName,
            weekDates,
            departments: filteredDepartments, // Use filtered departments
            employees: filteredEmployees, // Use filtered employees for rows
            scheduleData,
            getScheduleForDate,
            calculateShiftDuration, // Pass the calculation function
        };

        try {
            exportScheduleToPDF(data); // Call the PDF export function
            toast({ title: 'Exportación PDF Exitosa', description: 'Se ha descargado el horario semanal.' });
        } catch (error) {
            console.error("Error exporting schedule to PDF:", error);
            toast({ title: 'Error al Exportar PDF', description: 'No se pudo generar el archivo PDF.', variant: 'destructive' });
        }
    };


  return (
        <main className="container mx-auto p-4 md:p-8 max-w-full"> {/* Use max-w-full for wider layout */}
             <div className="flex justify-between items-center mb-6 gap-4 flex-wrap"> {/* Added flex-wrap */}
                 <h1 className="text-2xl font-bold text-foreground flex-shrink-0 mr-auto">Planificador de Horarios</h1>
                 {/* --- Day View Date Selector --- */}
                 {viewMode === 'day' && (
                    <div className="order-1 md:order-none">
                         <Popover>
                             <PopoverTrigger asChild>
                                 <Button
                                     variant={'outline'}
                                     className={cn(
                                         'w-[280px] justify-start text-left font-normal',
                                         !targetDate && 'text-muted-foreground',
                                         isHoliday(targetDate) && 'border-primary text-primary font-semibold' // Highlight if holiday
                                     )}
                                      disabled={isCheckingHoliday} // Disable while checking holiday
                                 >
                                     <CalendarIcon className="mr-2 h-4 w-4" />
                                     {targetDate ? format(targetDate, 'PPPP', { locale: es }) : <span>Selecciona fecha</span>}
                                     {isCheckingHoliday && <span className="ml-2 text-xs italic">(Verificando...)</span>}
                                     {isHoliday(targetDate) && !isCheckingHoliday && <span className="ml-2 text-xs font-semibold">(Festivo)</span>}
                                 </Button>
                             </PopoverTrigger>
                             <PopoverContent className="w-auto p-0">
                                 <Calendar
                                     mode="single"
                                     selected={targetDate}
                                     onSelect={(date) => { if (date) setTargetDate(date) }} // Update targetDate for day view
                                     initialFocus
                                     locale={es}
                                     modifiers={{ holiday: (date) => isHoliday(date) }}
                                     modifiersClassNames={{
                                         holiday: 'border-primary text-primary font-semibold', // Apply primary text color and border for holiday
                                     }}
                                 />
                             </PopoverContent>
                         </Popover>
                    </div>
                 )}
                 {/* --- Week View Navigator --- */}
                 {viewMode === 'week' && (
                     <div className="flex items-center gap-4 order-1 md:order-none"> {/* Center navigation */}
                         <WeekNavigator
                             currentDate={currentDate}
                             onPreviousWeek={handlePreviousWeek}
                             onNextWeek={handleNextWeek}
                         />
                     </div>
                 )}

                 <div className="flex items-center gap-2 flex-shrink-0 order-last"> {/* Ensure controls are on the right */}
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
                                                          {/* AlertDialogContent for Delete Confirmation is defined below */}
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
                                                          {/* AlertDialogContent for Delete Confirmation is defined below */}
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
                                                           {/* AlertDialogContent for Delete Confirmation is defined below */}
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
                                                        {/* Enable load button regardless of viewMode, but warn if not day view */}
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                                            onClick={() => {
                                                                if (viewMode !== 'day') {
                                                                     toast({title: 'Vista Inválida', description: 'Cambia a vista de "Día" para cargar una formación.', variant: 'destructive'});
                                                                } else {
                                                                    handleLoadTemplate(template.id);
                                                                }
                                                            }}
                                                            title="Cargar Formación (Solo en vista de Día)"
                                                        >
                                                            <Upload className="h-4 w-4" />
                                                        </Button>
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => confirmDeleteItem('template', template.id, template.name)} title="Eliminar Formación"><Trash2 className="h-4 w-4" /></Button>
                                                            </AlertDialogTrigger>
                                                            {/* AlertDialogContent for Delete Confirmation is defined below */}
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
                 {/* Export Hours to CSV Button */}
                <Button onClick={handleExportCSV} variant="outline">
                     <FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar Horas (CSV)
                 </Button>
                 {/* Export Schedule to PDF Button */}
                <Button onClick={handleExportPDF} variant="outline">
                     <FileDown className="mr-2 h-4 w-4" /> PDF {/* Changed text */}
                 </Button>
             </div>

              {/* Main content grid - Reverted to previous layout */}
             <DndWrapper> {/* Conditionally wrap with DndContext */}
                 <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"> {/* Reverted to 12 columns */}

                     {/* --- Available Employees (Takes 2/12 width) --- */}
                      <div className="lg:col-span-2 space-y-6">
                         {/* Available Employees Card */}
                          <EmployeeList employees={availableEmployees} />
                     </div>


                     {/* --- Schedule View (Takes remaining 10/12 width) --- */}
                     <div className="lg:col-span-10"> {/* Reverted Schedule to take 10 columns */}
                        <ScheduleView
                            departments={filteredDepartments}
                            scheduleData={scheduleData}
                            onRemoveShift={handleRemoveShift}
                            viewMode={viewMode}
                            weekDates={weekDates} // Pass week dates
                            currentDate={targetDate} // Pass target date for single day view
                            onAddShiftRequest={handleOpenEmployeeSelectionModal} // Pass the handler to open employee selection
                            onShiftClick={handleShiftClick} // Pass the handler for clicking a shift
                            getScheduleForDate={getScheduleForDate} // Pass helper function
                            onDuplicateDay={handleDuplicateDay} // Pass the duplicate handler
                            onClearDay={handleConfirmClearDay} // Pass the clear handler trigger
                            isHoliday={isHoliday} // Pass the holiday check function
                        />
                     </div>
                 </div>
             </DndWrapper>


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

             {/* Employee Selection Modal */}
             <EmployeeSelectionModal
                 isOpen={isEmployeeSelectionModalOpen}
                 onClose={() => setIsEmployeeSelectionModalOpen(false)}
                 employees={availableEmployees} // Pass only available employees for the specific date/dept context
                 onSelectEmployee={handleEmployeeSelectedForShift}
                 departmentName={departments.find(d => d.id === shiftRequestContext?.departmentId)?.name || ''}
                 date={shiftRequestContext?.date || new Date()} // Pass the date from context
             />

             {/* Shift Detail Modal */}
             <ShiftDetailModal
                 isOpen={isShiftModalOpen}
                 onClose={() => {
                     setIsShiftModalOpen(false);
                     setSelectedEmployee(null); // Clear selected employee when closing detail modal
                     setShiftRequestContext(null); // Clear context
                     setEditingShift(null); // Clear editing state
                 }}
                 onSave={handleAddOrUpdateShift}
                 employeeName={selectedEmployee?.name || ''}
                 departmentName={departments.find(d => d.id === shiftRequestContext?.departmentId)?.name || ''}
                 initialDetails={editingShift?.assignment} // Pass the assignment for initial values
                 isEditing={!!editingShift} // Pass flag indicating if it's an edit
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
