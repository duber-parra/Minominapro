
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
  CardFooter, // Import CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Edit, ChevronsLeft, ChevronsRight, Calendar as CalendarModernIcon, Users, Building, Building2, MinusCircle, ChevronsUpDown, Settings, Save, CopyPlus, Library, Eraser, Download, Upload, FileX2, FileSpreadsheet, FileDown, PencilLine, Share2 } from 'lucide-react'; // Added FileDown icon, PencilLine, CalendarModernIcon, Share2
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
import { Textarea } from '@/components/ui/textarea'; // Import Textarea

import { LocationSelector } from '@/components/schedule/LocationSelector';
import { EmployeeList } from '@/components/schedule/EmployeeList';
import { ScheduleView } from '@/components/schedule/ScheduleView';
import { ShiftDetailModal } from '@/components/schedule/ShiftDetailModal';
import { WeekNavigator } from '@/components/schedule/WeekNavigator'; // Import WeekNavigator
import { useToast } from '@/hooks/use-toast'; // Import useToast
import { useIsMobile } from '@/hooks/use-mobile'; // Import useIsMobile
import { EmployeeSelectionModal } from '@/components/schedule/EmployeeSelectionModal'; // Import EmployeeSelectionModal

import type { Location, Department, Employee, ShiftAssignment, ScheduleData, ShiftTemplate, DailyAssignments, WeeklyAssignments } from '@/types/schedule'; // Added ShiftTemplate, DailyAssignments, WeeklyAssignments
// Removed v4 import as we'll let the user define the ID
// import { v4 as uuidv4 } from 'uuid';
import { startOfWeek, endOfWeek, addDays, format, addWeeks, subWeeks, parseISO, getYear, isValid, differenceInMinutes, parse as parseDateFnsInternal } from 'date-fns'; // Added differenceInMinutes, parseDateFnsInternal, endOfWeek
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { getColombianHolidays } from '@/services/colombian-holidays'; // Import holiday service
import { exportScheduleToPDF } from '@/lib/schedule-pdf-exporter'; // Import the new PDF exporter
import { formatTo12Hour } from '@/lib/time-utils'; // Import the time formatting helper


// Helper to generate dates for the current week
const getWeekDates = (currentDate: Date): Date[] => {
  const start = startOfWeek(currentDate, { weekStartsOn: 1 }); // Start on Monday
  return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
};

// LocalStorage Keys
const SCHEDULE_DATA_KEY = 'schedulePlannerData';
const SCHEDULE_TEMPLATES_KEY = 'scheduleTemplates';
const SCHEDULE_NOTES_KEY = 'schedulePlannerNotes'; // Key for notes
const LOCATIONS_KEY = 'schedulePlannerLocations'; // Key for locations
const DEPARTMENTS_KEY = 'schedulePlannerDepartments'; // Key for departments
const EMPLOYEES_KEY = 'schedulePlannerEmployees'; // Key for employees

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

// Example employees with user-defined IDs
const initialEmployees: Employee[] = [
  { id: '101', name: 'Carlos Pérez', primaryLocationId: 'loc-1' },
  { id: '102', name: 'Ana Rodriguez', primaryLocationId: 'loc-1' },
  { id: '201', name: 'Luis Gómez', primaryLocationId: 'loc-2' },
  { id: '202', name: 'Sofía Vargas', primaryLocationId: 'loc-2' },
  { id: '301', name: 'Diego Torres', primaryLocationId: 'loc-3' },
  { id: '302', name: 'Isabel Castro', primaryLocationId: 'loc-3' },
];

// Default notes text
const defaultNotesText = `Lun a Jue: Parrillazo y Gauchos 12am. - Gaucho 11pm. | Vie a Sab: Parrillazo y Gauchos 1am. - Gaucho 12am. | Dom: Todos 11 pm`;


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
    const [selectedLocationId, setSelectedLocationId] = useState<string>(''); // Initialize empty, load from storage
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
    // Ensure locationId defaults correctly later
    const [departmentFormData, setDepartmentFormData] = useState({ name: '', locationId: '' });

    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    // Add 'id' field to employee form data and default locationId
    const [employeeFormData, setEmployeeFormData] = useState({ id: '', name: '', primaryLocationId: '' });

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

    // State for editable notes
    const [notes, setNotes] = useState<string>(defaultNotesText);

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

    // --- Load Data from localStorage on Mount ---
    useEffect(() => {
        if (typeof window !== 'undefined') {
            // Load Locations
            const savedLocations = localStorage.getItem(LOCATIONS_KEY);
            let loadedLocations: Location[] = initialLocations; // Default to initial if nothing saved
            if (savedLocations) {
                try {
                    const parsed = JSON.parse(savedLocations);
                    if (Array.isArray(parsed)) loadedLocations = parsed;
                } catch (e) { console.error("Error parsing locations:", e); }
            }
            setLocations(loadedLocations);

            // Load Departments
            const savedDepartments = localStorage.getItem(DEPARTMENTS_KEY);
            let loadedDepartments: Department[] = initialDepartments;
            if (savedDepartments) {
                try {
                    const parsed = JSON.parse(savedDepartments);
                    if (Array.isArray(parsed)) loadedDepartments = parsed;
                } catch (e) { console.error("Error parsing departments:", e); }
            }
            setDepartments(loadedDepartments);

            // Load Employees
            const savedEmployees = localStorage.getItem(EMPLOYEES_KEY);
            let loadedEmployees: Employee[] = initialEmployees;
            if (savedEmployees) {
                try {
                    const parsed = JSON.parse(savedEmployees);
                    if (Array.isArray(parsed)) loadedEmployees = parsed;
                } catch (e) { console.error("Error parsing employees:", e); }
            }
            setEmployees(loadedEmployees);

            // Set initial selected location (use first loaded location or default)
            if (loadedLocations.length > 0) {
                setSelectedLocationId(loadedLocations[0].id);
            }

            // Load Schedule Data
            const savedSchedule = localStorage.getItem(SCHEDULE_DATA_KEY);
            if (savedSchedule) {
                try {
                    const parsedData = JSON.parse(savedSchedule);
                    // Revive date objects
                    Object.keys(parsedData).forEach(key => {
                        if (parsedData[key] && typeof parsedData[key].date === 'string') {
                            parsedData[key].date = parseISO(parsedData[key].date);
                        }
                        // Revive employee objects within assignments
                        if (parsedData[key] && parsedData[key].assignments) {
                            Object.keys(parsedData[key].assignments).forEach(deptId => {
                                parsedData[key].assignments[deptId].forEach((assign: any) => {
                                    // Find the full employee object from the loaded employees list
                                    const employee = loadedEmployees.find(emp => emp.id === assign.employee?.id);
                                    if (employee) {
                                        assign.employee = employee; // Replace potentially partial data with full object
                                    }
                                });
                            });
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
                     if (Array.isArray(parsedTemplates) && parsedTemplates.every(t => t && typeof t.id === 'string' && typeof t.name === 'string' && typeof t.type === 'string')) {
                         setSavedTemplates(parsedTemplates);
                     } else {
                         console.warn("Invalid template data found in localStorage, ignoring.");
                         localStorage.removeItem(SCHEDULE_TEMPLATES_KEY);
                     }
                 } catch (error) {
                     console.error("Error parsing templates from localStorage:", error);
                     localStorage.removeItem(SCHEDULE_TEMPLATES_KEY);
                 }
             }

             // Load notes
            const savedNotes = localStorage.getItem(SCHEDULE_NOTES_KEY);
            if (savedNotes) {
                setNotes(savedNotes);
            } else {
                setNotes(defaultNotesText);
            }
        }
    }, []); // Empty dependency array ensures this runs only once on mount


     // --- Save Data to localStorage on Change ---
     useEffect(() => {
         if (typeof window !== 'undefined') {
             try { localStorage.setItem(LOCATIONS_KEY, JSON.stringify(locations)); }
             catch (e) { console.error("Error saving locations:", e); }
         }
     }, [locations]);

     useEffect(() => {
         if (typeof window !== 'undefined') {
             try { localStorage.setItem(DEPARTMENTS_KEY, JSON.stringify(departments)); }
             catch (e) { console.error("Error saving departments:", e); }
         }
     }, [departments]);

     useEffect(() => {
         if (typeof window !== 'undefined') {
             try { localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(employees)); }
             catch (e) { console.error("Error saving employees:", e); }
         }
     }, [employees]);

     useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                // Deep copy schedule data to avoid modifying state directly during serialization
                const dataToSave = JSON.parse(JSON.stringify(scheduleData));
                 // Stringify date objects and simplify employee data for storage
                 Object.keys(dataToSave).forEach(key => {
                     if (dataToSave[key] && dataToSave[key].date instanceof Date) {
                         dataToSave[key].date = dataToSave[key].date.toISOString();
                     }
                     // Simplify employee object in assignments to just ID
                     if (dataToSave[key] && dataToSave[key].assignments) {
                         Object.keys(dataToSave[key].assignments).forEach(deptId => {
                             dataToSave[key].assignments[deptId].forEach((assign: any) => {
                                 if (assign.employee && typeof assign.employee === 'object') {
                                     assign.employee = { id: assign.employee.id }; // Store only ID
                                 }
                             });
                         });
                     }
                 });
                localStorage.setItem(SCHEDULE_DATA_KEY, JSON.stringify(dataToSave));
            } catch (error) {
                console.error("Error saving schedule data to localStorage:", error);
                // Optionally show a toast message here
            }
        }
    }, [scheduleData]); // Save whenever scheduleData changes

    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem(SCHEDULE_NOTES_KEY, notes);
            } catch (error) {
                console.error("Error saving notes to localStorage:", error);
            }
        }
    }, [notes]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                 localStorage.setItem(SCHEDULE_TEMPLATES_KEY, JSON.stringify(savedTemplates));
            } catch (error) {
                 console.error("Error saving templates to localStorage:", error);
                 // Optionally show toast
            }
        }
    }, [savedTemplates]);

    // ---- End LocalStorage Effects ---



    const weekDates = getWeekDates(currentDate);
    // const currentDayKey = format(targetDate, 'yyyy-MM-dd'); // Date key for current schedule (Removed as it's used less directly now)

    // Helper to get schedule for a specific date, handling potential undefined
    const getScheduleForDate = (date: Date): ScheduleData => {
        const key = format(date, 'yyyy-MM-dd');
        // Ensure employee objects are fully populated when retrieving schedule data
        const dayData = scheduleData[key];
        if (dayData && dayData.assignments) {
             Object.keys(dayData.assignments).forEach(deptId => {
                 dayData.assignments[deptId].forEach(assign => {
                    // If employee is just an ID object, find the full object
                    if (assign.employee && typeof assign.employee === 'object' && !assign.employee.name) {
                        const fullEmployee = employees.find(emp => emp.id === assign.employee.id);
                        if (fullEmployee) {
                            assign.employee = fullEmployee;
                        } else {
                            console.warn(`Employee with ID ${assign.employee.id} not found for assignment ${assign.id}`);
                            // Keep partial data or handle as needed
                        }
                    }
                 });
             });
        }
        return dayData || { date: date, assignments: {} };
    }

    // Derived state for filtering employees and departments by location
    const filteredEmployees = useMemo(() => employees.filter(emp => emp.primaryLocationId === selectedLocationId), [employees, selectedLocationId]);
    const filteredDepartments = useMemo(() => departments.filter(dep => dep.locationId === selectedLocationId), [departments, selectedLocationId]);
    // Filter templates by location AND current view mode
    const filteredTemplates = useMemo(() =>
        savedTemplates.filter(temp =>
            temp.locationId === selectedLocationId && temp.type === (viewMode === 'day' ? 'daily' : 'weekly')
        ), [savedTemplates, selectedLocationId, viewMode]);


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
        // Ensure department locationId defaults to current selected location if it's empty
        if (!departmentFormData.locationId && selectedLocationId) {
           setDepartmentFormData(prev => ({ ...prev, locationId: selectedLocationId }));
        }
         // Ensure employee primaryLocationId defaults if empty
        if (!employeeFormData.primaryLocationId && selectedLocationId) {
            setEmployeeFormData(prev => ({ ...prev, primaryLocationId: selectedLocationId }));
        }
    }, [selectedLocationId, departmentFormData.locationId, employeeFormData.primaryLocationId]); // Added dependencies


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
         // Generate a new assignment ID using the employee ID and date/time to make it more deterministic if needed
        const newAssignmentId = `shift_${employeeForShift.id}_${dateKey}_${details.startTime.replace(':', '')}`;

        const assignmentPayload: ShiftAssignment = {
            // If editing, use existing ID, otherwise use the generated one
            id: editingShift?.assignment.id || newAssignmentId,
            employee: employeeForShift, // Store the full employee object in the state
            startTime: details.startTime,
            endTime: details.endTime,
            includeBreak: details.includeBreak || false,
            breakStartTime: details.includeBreak ? details.breakStartTime : undefined,
            breakEndTime: details.includeBreak ? details.breakEndTime : undefined,
        };

        setScheduleData(prevData => {
            const dayData = getScheduleForDate(date); // Use getter to ensure full employee objects
            const departmentAssignments = dayData.assignments[departmentId] || [];

            let updatedAssignments;
            if (editingShift) {
                // Update existing assignment
                updatedAssignments = departmentAssignments.map(a =>
                    a.id === editingShift.assignment.id ? assignmentPayload : a
                );
            } else {
                 // Check if employee is already assigned in ANY department on this date
                 const isAlreadyAssigned = Object.values(dayData.assignments)
                                                .flat()
                                                .some(a => a.employee.id === employeeForShift.id);

                 if (isAlreadyAssigned) {
                     toast({
                         title: 'Asignación Duplicada',
                         description: `${employeeForShift.name} ya tiene un turno asignado para el ${format(date, 'PPP', { locale: es })}.`,
                         variant: 'destructive',
                     });
                     return prevData; // Do not update schedule if duplicate
                 }
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
            // Generate a simple ID based on name for location
             const newLocation = { id: `loc-${name.toLowerCase().replace(/\s+/g, '-')}`, name };
            setLocations([...locations, newLocation]);
            toast({ title: 'Sede Agregada', description: `Sede "${name}" agregada.` });
            // If this is the first location added, select it automatically
            if (locations.length === 0) {
                 setSelectedLocationId(newLocation.id);
            }
        }
        setIsLocationModalOpen(false);
        setEditingLocation(null); // Clear editing state
    };

    const handleOpenDepartmentModal = (department: Department | null) => {
        setEditingDepartment(department);
        // Ensure locationId is set to the currently selected location if adding new
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
            // Generate simple ID for department
            const newDepartment = { id: `dep-${name.toLowerCase().replace(/\s+/g, '-')}-${locationId}`, name, locationId, icon: Building }; // Assign default icon
            setDepartments([...departments, newDepartment]);
            toast({ title: 'Departamento Agregado', description: `Departamento "${name}" agregado.` });
        }
        setIsDepartmentModalOpen(false);
        setEditingDepartment(null); // Clear editing state
    };

    const handleOpenEmployeeModal = (employee: Employee | null) => {
        setEditingEmployee(employee);
        // Set form data including the ID and default location
        setEmployeeFormData({ id: employee?.id || '', name: employee?.name || '', primaryLocationId: employee?.primaryLocationId || selectedLocationId });
        setIsEmployeeModalOpen(true);
    };

    const handleSaveEmployee = () => {
         const id = employeeFormData.id.trim(); // Get ID from form
         const name = employeeFormData.name.trim();
         const primaryLocationId = employeeFormData.primaryLocationId;
          if (!id || !name || !primaryLocationId) {
             toast({ title: 'Datos Incompletos', description: 'El ID, nombre y la sede principal del colaborador son requeridos.', variant: 'destructive' });
             return;
          }

          // Check for duplicate ID before adding/updating
         const isDuplicateId = employees.some(emp => emp.id === id && emp.id !== editingEmployee?.id);
         if (isDuplicateId) {
             toast({ title: 'ID Duplicado', description: `El ID "${id}" ya está en uso por otro colaborador.`, variant: 'destructive' });
             return;
         }

        if (editingEmployee) {
            // Update existing employee (ID should not be editable in update mode ideally, but handle if it is)
            setEmployees(employees.map(emp => emp.id === editingEmployee.id ? { ...emp, id, name, primaryLocationId } : emp));
             toast({ title: 'Colaborador Actualizado', description: `Colaborador "${name}" (ID: ${id}) actualizado.` });
        } else {
            // Add new employee using the provided ID
            const newEmployee = { id, name, primaryLocationId };
            setEmployees([...employees, newEmployee]);
             toast({ title: 'Colaborador Agregado', description: `Colaborador "${name}" (ID: ${id}) agregado.` });
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
                    setLocations(prevLocs => prevLocs.filter(loc => loc.id !== itemToDelete.id));
                    setDepartments(prevDeps => prevDeps.filter(dep => dep.locationId !== itemToDelete.id));
                    setEmployees(prevEmps => prevEmps.map(emp => emp.primaryLocationId === itemToDelete.id ? {...emp, primaryLocationId: '' } : emp)); // Unassign primary location
                    // Remove templates associated with this location
                    const remainingTemplatesLocation = savedTemplates.filter(t => t.locationId !== itemToDelete.id);
                    setSavedTemplates(remainingTemplatesLocation);
                    // No need to save to localStorage here, the useEffects will handle it

                    if (selectedLocationId === itemToDelete.id) {
                        // Select the first available location, or empty if none left
                        const firstRemainingLocation = locations.find(loc => loc.id !== itemToDelete.id);
                        setSelectedLocationId(firstRemainingLocation ? firstRemainingLocation.id : '');
                    }
                    message = `Sede "${itemToDelete.name}" y sus datos asociados eliminados.`;
                    break;
                case 'department':
                    setDepartments(prevDeps => prevDeps.filter(dep => dep.id !== itemToDelete.id));
                     const updatedSchedule = { ...scheduleData };
                     Object.keys(updatedSchedule).forEach(dateKey => {
                         delete updatedSchedule[dateKey].assignments[itemToDelete.id];
                     });
                     setScheduleData(updatedSchedule);
                      // Remove assignments from templates
                     const updatedTemplatesDept = savedTemplates.map(t => {
                         const newAssignments = { ...t.assignments };
                         // Adjust deletion based on template type
                         if (t.type === 'daily') {
                             delete (newAssignments as { [deptId: string]: any })[itemToDelete.id];
                         } else if (t.type === 'weekly') {
                             Object.keys(newAssignments).forEach(dateKey => {
                                  if ((newAssignments as any)[dateKey]?.[itemToDelete.id]) {
                                     delete (newAssignments as { [dateKey: string]: { [deptId: string]: any } })[dateKey][itemToDelete.id];
                                  }
                             });
                         }
                         return { ...t, assignments: newAssignments };
                     });
                     setSavedTemplates(updatedTemplatesDept);
                     // No need to save to localStorage here
                    message = `Departamento "${itemToDelete.name}" eliminado.`;
                    break;
                case 'employee':
                    setEmployees(prevEmps => prevEmps.filter(emp => emp.id !== itemToDelete.id));
                     const updatedScheduleEmp = { ...scheduleData };
                     Object.keys(updatedScheduleEmp).forEach(dateKey => {
                          Object.keys(updatedScheduleEmp[dateKey].assignments).forEach(deptId => {
                              updatedScheduleEmp[dateKey].assignments[deptId] = updatedScheduleEmp[dateKey].assignments[deptId].filter(a => a.employee.id !== itemToDelete.id);
                          });
                     });
                     setScheduleData(updatedScheduleEmp);
                     // Remove assignments from templates
                      const updatedTemplatesEmp = savedTemplates.map(t => {
                          let newAssignments = JSON.parse(JSON.stringify(t.assignments)); // Deep copy
                          if (t.type === 'daily') {
                              Object.keys(newAssignments).forEach(deptId => {
                                  newAssignments[deptId] = (newAssignments[deptId] || []).filter((a: any) => (typeof a.employee === 'object' ? a.employee.id : a.employee) !== itemToDelete.id);
                              });
                          } else if (t.type === 'weekly') {
                              Object.keys(newAssignments).forEach(dateKey => {
                                  Object.keys(newAssignments[dateKey] || {}).forEach(deptId => {
                                      newAssignments[dateKey][deptId] = (newAssignments[dateKey][deptId] || []).filter((a: any) => (typeof a.employee === 'object' ? a.employee.id : a.employee) !== itemToDelete.id);
                                  });
                              });
                          }
                           // Clean up assignments by removing empty structures
                          Object.keys(newAssignments).forEach(key => {
                              if (t.type === 'weekly') { // For weekly, check nested structure
                                  Object.keys(newAssignments[key] || {}).forEach(deptId => {
                                      if (!newAssignments[key][deptId] || newAssignments[key][deptId].length === 0) {
                                          delete newAssignments[key][deptId];
                                      }
                                  });
                                  if (Object.keys(newAssignments[key]).length === 0) {
                                      delete newAssignments[key];
                                  }
                              } else { // For daily
                                  if (!newAssignments[key] || newAssignments[key].length === 0) {
                                      delete newAssignments[key];
                                  }
                              }
                          });
                          return { ...t, assignments: newAssignments };
                      });
                     setSavedTemplates(updatedTemplatesEmp);
                      // No need to save to localStorage here
                    message = `Colaborador "${itemToDelete.name}" eliminado.`;
                    break;
                 case 'template':
                     const updatedTemplates = savedTemplates.filter(t => t.id !== itemToDelete.id);
                     setSavedTemplates(updatedTemplates);
                      // No need to save to localStorage here
                     message = `Template "${itemToDelete.name}" eliminado.`;
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
        // Saving happens automatically via useEffect, this button is mostly for user confirmation
        toast({ title: 'Horario Guardado', description: 'El horario actual se ha guardado localmente.' });
    };

     const handleDuplicateDay = (sourceDate: Date) => {
         const sourceDayKey = format(sourceDate, 'yyyy-MM-dd');
         const nextDayDate = addDays(sourceDate, 1);
         const nextDayKey = format(nextDayDate, 'yyyy-MM-dd');
         const sourceSchedule = scheduleData[sourceDayKey];

         if (!sourceSchedule || Object.keys(sourceSchedule.assignments).length === 0 || Object.values(sourceSchedule.assignments).every(dept => dept.length === 0)) {
             toast({ title: 'Nada que Duplicar', description: `No hay turnos asignados para el ${format(sourceDate, 'PPP', { locale: es })}.`, variant: 'destructive' });
             return;
         }

         // Deep copy assignments to avoid reference issues
         const duplicatedAssignments = JSON.parse(JSON.stringify(sourceSchedule.assignments));
         // Regenerate unique IDs for duplicated assignments
         Object.keys(duplicatedAssignments).forEach(deptId => {
             duplicatedAssignments[deptId].forEach((assign: ShiftAssignment) => {
                // Regenerate assignment ID using the *new* date key
                 assign.id = `shift_${assign.employee.id}_${nextDayKey}_${assign.startTime.replace(':', '')}`;
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
         // Check if there are any assignments to save based on view mode
         let hasAssignments = false;
         if (viewMode === 'day') {
             const currentDayKey = format(targetDate, 'yyyy-MM-dd');
             const currentSchedule = scheduleData[currentDayKey];
             hasAssignments = !!currentSchedule && Object.keys(currentSchedule.assignments).length > 0 && Object.values(currentSchedule.assignments).some(dept => dept.length > 0);
         } else { // week view
             hasAssignments = weekDates.some(date => {
                 const dayKey = format(date, 'yyyy-MM-dd');
                 const daySchedule = scheduleData[dayKey];
                 return !!daySchedule && Object.keys(daySchedule.assignments).length > 0 && Object.values(daySchedule.assignments).some(dept => dept.length > 0);
             });
         }

         if (!hasAssignments) {
             const contextDescription = viewMode === 'day' ? `el ${format(targetDate, 'PPP', { locale: es })}` : 'la semana actual';
             toast({ title: 'Template Vacío', description: `No hay turnos asignados en ${contextDescription} para guardar como template.`, variant: 'destructive' });
             return;
         }

         setTemplateName(''); // Reset template name
         setIsTemplateModalOpen(true);
     };

     const handleSaveTemplate = () => {
         if (!templateName.trim()) {
             toast({ title: 'Nombre Inválido', description: 'Por favor ingresa un nombre para el template.', variant: 'destructive' });
             return;
         }

         let templateAssignments: ShiftTemplate['assignments'];
         const templateType = viewMode === 'day' ? 'daily' : 'weekly';

         if (templateType === 'daily') {
             const sourceDate = targetDate;
             const currentDayKey = format(sourceDate, 'yyyy-MM-dd');
             const currentAssignmentsRaw = scheduleData[currentDayKey]?.assignments || {};
             // Remove assignment instance IDs when saving daily template
             const cleanedAssignments: { [deptId: string]: Omit<ShiftAssignment, 'id'>[] } = {};
             Object.keys(currentAssignmentsRaw).forEach(deptId => {
                 cleanedAssignments[deptId] = currentAssignmentsRaw[deptId].map(({ id, employee, ...rest }) => ({ // Destructure employee too
                      ...rest,
                      employee: { id: employee.id } // Store only employee ID in template
                 }));
             });
             templateAssignments = cleanedAssignments;

             if (Object.keys(templateAssignments).length === 0 || Object.values(templateAssignments).every(dept => dept.length === 0)) {
                  toast({ title: 'Template Vacío', description: 'No hay turnos para guardar.', variant: 'destructive' });
                  setIsTemplateModalOpen(false);
                  return;
             }
         } else { // Weekly template
             templateAssignments = {};
             let weekHasAssignments = false;
             weekDates.forEach(date => {
                 const dateKey = format(date, 'yyyy-MM-dd');
                 const dailyAssignmentsRaw = scheduleData[dateKey]?.assignments || {};
                 const cleanedDailyAssignments: { [deptId: string]: Omit<ShiftAssignment, 'id'>[] } = {};
                 Object.keys(dailyAssignmentsRaw).forEach(deptId => {
                     if (dailyAssignmentsRaw[deptId].length > 0) {
                         cleanedDailyAssignments[deptId] = dailyAssignmentsRaw[deptId].map(({ id, employee, ...rest }) => ({ // Destructure employee
                             ...rest,
                             employee: { id: employee.id } // Store only employee ID
                         }));
                         weekHasAssignments = true; // Mark if any assignment found
                     }
                 });
                 // Only add day to template if it has assignments
                 if (Object.keys(cleanedDailyAssignments).length > 0) {
                      (templateAssignments as { [dateKey: string]: any })[dateKey] = cleanedDailyAssignments;
                 }
             });

             if (!weekHasAssignments) {
                 toast({ title: 'Template Vacío', description: 'No hay turnos en la semana para guardar.', variant: 'destructive' });
                 setIsTemplateModalOpen(false);
                 return;
             }
         }


         const newTemplate: ShiftTemplate = {
             id: `tpl-${templateName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`, // More robust ID
             name: templateName.trim(),
             locationId: selectedLocationId,
             type: templateType, // Save the type
             assignments: templateAssignments,
             createdAt: new Date().toISOString(),
         };

         // Save via state update, useEffect will handle localStorage
         setSavedTemplates(prev => [...prev, newTemplate]);
         toast({ title: 'Template Guardado', description: `El template "${newTemplate.name}" (${templateType === 'daily' ? 'Diario' : 'Semanal'}) se ha guardado.` });
         setIsTemplateModalOpen(false);
         setTemplateName('');

     };

     // --- Load Template Handler ---
     const handleLoadTemplate = (templateId: string) => {
         if (typeof window !== 'undefined') {
             const templateToLoad = savedTemplates.find((t: any) => t.id === templateId);

             if (!templateToLoad) {
                 toast({ title: 'Template no encontrado', variant: 'destructive' });
                 return;
             }
             // Check if template matches current location
             if (templateToLoad.locationId !== selectedLocationId) {
                 toast({
                     title: 'Sede Incorrecta',
                     description: `El template "${templateToLoad.name}" pertenece a otra sede. Cambia de sede para cargarlo.`,
                     variant: 'destructive',
                 });
                 return;
             }
              // Check if template type matches view mode
             if (templateToLoad.type !== (viewMode === 'day' ? 'daily' : 'weekly')) {
                 const requiredView = templateToLoad.type === 'daily' ? 'diaria' : 'semanal';
                 toast({
                     title: 'Vista Incorrecta',
                     description: `El template "${templateToLoad.name}" es ${requiredView}. Cambia a la vista ${requiredView} para cargarlo.`,
                     variant: 'destructive',
                 });
                 return;
             }

             let updatedScheduleData = { ...scheduleData };
             let successMessage = '';

             if (templateToLoad.type === 'daily') {
                 const loadTargetDate = targetDate;
                 const dateKey = format(loadTargetDate, 'yyyy-MM-dd');

                 // Regenerate assignment instance IDs and find employee objects
                 const loadedAssignments: { [deptId: string]: ShiftAssignment[] } = {};
                 Object.keys(templateToLoad.assignments).forEach(deptId => {
                     loadedAssignments[deptId] = (templateToLoad.assignments as DailyAssignments)[deptId]
                         .map((assignTemplate: Omit<ShiftAssignment, 'id'>) => {
                              // Ensure the employee object from the template has an ID
                              const employeeId = typeof assignTemplate.employee === 'string' ? assignTemplate.employee : assignTemplate.employee?.id;
                              if (!employeeId) {
                                console.warn(`Employee ID missing in daily template assignment. Skipping.`);
                                return null;
                              }
                             const employee = employees.find(emp => emp.id === employeeId);
                             if (employee) {
                                 // Generate a new assignment instance ID
                                const newAssignId = `shift_${employee.id}_${dateKey}_${assignTemplate.startTime.replace(':', '')}`;
                                 return {
                                     ...assignTemplate,
                                     id: newAssignId, // Use the newly generated ID
                                     employee: employee, // Assign full employee object
                                 };
                             }
                             console.warn(`Employee ID ${employeeId} not found while loading daily template. Skipping assignment.`);
                             return null; // Mark for removal
                         })
                         .filter((a): a is ShiftAssignment => a !== null); // Filter out nulls and assert type
                 });

                 updatedScheduleData[dateKey] = {
                     date: loadTargetDate,
                     assignments: loadedAssignments,
                 };
                 successMessage = `Se cargó el template "${templateToLoad.name}" para ${format(loadTargetDate, 'PPP', { locale: es })}.`;

             } else { // Weekly template
                 weekDates.forEach(date => {
                     const dateKey = format(date, 'yyyy-MM-dd');
                     const dailyAssignmentsFromTemplate = (templateToLoad.assignments as WeeklyAssignments)[dateKey] || {};

                     const loadedDailyAssignments: { [deptId: string]: ShiftAssignment[] } = {};
                     Object.keys(dailyAssignmentsFromTemplate).forEach(deptId => {
                         loadedDailyAssignments[deptId] = dailyAssignmentsFromTemplate[deptId]
                             .map((assignTemplate: Omit<ShiftAssignment, 'id'>) => {
                                  const employeeId = typeof assignTemplate.employee === 'string' ? assignTemplate.employee : assignTemplate.employee?.id;
                                   if (!employeeId) {
                                     console.warn(`Employee ID missing in weekly template assignment for ${dateKey}. Skipping.`);
                                     return null;
                                   }
                                 const employee = employees.find(emp => emp.id === employeeId);
                                 if (employee) {
                                     const newAssignId = `shift_${employee.id}_${dateKey}_${assignTemplate.startTime.replace(':', '')}`;
                                     return {
                                         ...assignTemplate,
                                         id: newAssignId,
                                         employee: employee,
                                     };
                                 }
                                 console.warn(`Employee ID ${employeeId} not found while loading weekly template for ${dateKey}. Skipping assignment.`);
                                 return null;
                             })
                             .filter((a): a is ShiftAssignment => a !== null);
                     });

                     updatedScheduleData[dateKey] = {
                         date: date,
                         assignments: loadedDailyAssignments,
                     };
                 });
                 successMessage = `Se cargó el template semanal "${templateToLoad.name}" en la semana actual.`;
             }

             setScheduleData(updatedScheduleData);
             toast({ title: 'Template Cargado', description: successMessage });
             setIsConfigModalOpen(false); // Close config modal after loading
         }
     };

    // --- Holiday Check Helper ---
    const isHoliday = useCallback((date: Date | null | undefined): boolean => {
        if (!date || !isValid(date)) return false;
        const dateStr = format(date, 'yyyy-MM-dd');
        return holidaySet.has(dateStr);
    }, [holidaySet]);

     // --- Notes Handler ---
    const handleNotesChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setNotes(event.target.value);
    };

    const handleSaveNotes = () => {
        // Saving happens automatically via useEffect
        toast({ title: 'Notas Guardadas', description: 'Tus notas han sido guardadas localmente.' });
    };


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
                            formatTo12Hour(assignment.startTime), // Use 12-hour format
                            formatTo12Hour(assignment.endTime), // Use 12-hour format
                            assignment.includeBreak ? 'Sí' : 'No',
                            assignment.includeBreak && assignment.breakStartTime ? formatTo12Hour(assignment.breakStartTime) : '', // Use 12-hour format
                            assignment.includeBreak && assignment.breakEndTime ? formatTo12Hour(assignment.breakEndTime) : '', // Use 12-hour format
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

    // --- Share Schedule Handler ---
     const handleShareSchedule = async () => {
        let textToCopy = "";
        const locationName = locations.find(l => l.id === selectedLocationId)?.name || selectedLocationId;

        if (viewMode === 'day') {
            const dateStr = format(targetDate, 'EEEE dd \'de\' MMMM', { locale: es });
            textToCopy = `*Horario ${locationName} - ${dateStr}*\n\n`;
            const daySchedule = getScheduleForDate(targetDate);
            filteredDepartments.forEach(dept => {
                const assignments = daySchedule.assignments[dept.id] || [];
                if (assignments.length > 0) {
                    textToCopy += `*${dept.name}*\n`;
                    assignments.forEach(a => {
                        textToCopy += `- ${a.employee.name}: ${formatTo12Hour(a.startTime)} - ${formatTo12Hour(a.endTime)}`;
                        if (a.includeBreak && a.breakStartTime && a.breakEndTime) {
                             textToCopy += ` (D: ${formatTo12Hour(a.breakStartTime)}-${formatTo12Hour(a.breakEndTime)})`;
                        }
                        textToCopy += "\n";
                    });
                    textToCopy += "\n";
                }
            });
        } else { // Week view
            const weekStartFormatted = format(weekDates[0], 'dd MMM', { locale: es });
            const weekEndFormatted = format(weekDates[6], 'dd MMM yyyy', { locale: es });
            textToCopy = `*Horario ${locationName} - Semana ${weekStartFormatted} al ${weekEndFormatted}*\n\n`;
            weekDates.forEach(date => {
                const dateStr = format(date, 'EEEE dd', { locale: es });
                const daySchedule = getScheduleForDate(date);
                let dayHasAssignments = false;
                let dayText = `*${dateStr.charAt(0).toUpperCase() + dateStr.slice(1)}:*\n`; // Capitalize day name

                filteredDepartments.forEach(dept => {
                     const assignments = daySchedule.assignments[dept.id] || [];
                     if (assignments.length > 0) {
                         dayHasAssignments = true;
                         dayText += `_${dept.name}_\n`;
                         assignments.forEach(a => {
                             dayText += `- ${a.employee.name}: ${formatTo12Hour(a.startTime)} - ${formatTo12Hour(a.endTime)}`;
                            if (a.includeBreak && a.breakStartTime && a.breakEndTime) {
                                dayText += ` (D: ${formatTo12Hour(a.breakStartTime)}-${formatTo12Hour(a.breakEndTime)})`;
                            }
                             dayText += "\n";
                         });
                     }
                });

                if (dayHasAssignments) {
                    textToCopy += dayText + "\n";
                }
            });
        }

        if (textToCopy.trim().split('\n').length <= 2) { // Only header lines
            toast({ title: 'Sin Horario', description: 'No hay turnos asignados para compartir.', variant: 'default' });
            return;
        }

        try {
            await navigator.clipboard.writeText(textToCopy);
            toast({ title: 'Horario Copiado', description: 'El horario ha sido copiado al portapapeles. Puedes pegarlo en WhatsApp.' });
        } catch (err) {
            console.error('Error al copiar al portapapeles:', err);
            toast({ title: 'Error al Copiar', description: 'No se pudo copiar el horario.', variant: 'destructive' });
        }
     };


  return (
        <main className="container mx-auto p-4 md:p-8 max-w-full"> {/* Use max-w-full for wider layout */}
             {/* Modern Title */}
             <div className="text-center mb-8">
                 <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                    Planificador de Horarios
                 </h1>
                 <p className="text-muted-foreground mt-2">Gestiona turnos, sedes y colaboradores</p>
             </div>

            {/* Controls Card - Hidden background */}
            <Card className="mb-8 shadow-none border-none bg-transparent">
                 <CardHeader className="pb-4 pt-0 px-0 bg-transparent text-center"> {/* Centered text */}
                    {/* Description moved here */}
                     <CardDescription className="max-w-xl mx-auto">
                        Seleccione una fecha o una semana a programar, duplica, guarda templates y descarga tu horario.
                     </CardDescription>
                 </CardHeader>
                 <CardContent className="flex flex-wrap items-center justify-center gap-4 md:gap-6 p-0 bg-transparent">
                        {/* Location Selector */}
                        <div className="flex flex-col items-center space-y-1">
                             <LocationSelector
                                locations={locations}
                                selectedLocationId={selectedLocationId}
                                onLocationChange={handleLocationChange}
                             />
                         </div>

                        {/* Configuration Button */}
                        <div className="flex flex-col items-center space-y-1">
                             <Dialog open={isConfigModalOpen} onOpenChange={setIsConfigModalOpen}>
                                 <DialogTrigger asChild>
                                     <Button variant="outline" size="icon"> {/* Icon button */}
                                        <Settings className="h-4 w-4"/>
                                         <span className="sr-only">Configuración</span>
                                     </Button>
                                 </DialogTrigger>
                                 <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto"> {/* Wide modal, scrollable */}
                                     <DialogHeader>
                                         <DialogTitle>Configuración General</DialogTitle>
                                         <DialogDescription>Gestiona sedes, departamentos, colaboradores y templates guardados.</DialogDescription>
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
                                                          <span className="truncate text-muted-foreground">{emp.name} <span className="text-xs italic">(ID: {emp.id})</span></span>
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
                                         {/* Saved Templates Column */}
                                         <div className="space-y-4">
                                             <div className="flex justify-between items-center">
                                                  <h4 className="font-semibold text-foreground flex items-center gap-1">
                                                      <Library className="h-4 w-4 text-muted-foreground"/>
                                                      Templates ({filteredTemplates.length} {viewMode === 'day' ? 'Diarios' : 'Semanales'})
                                                  </h4>
                                                 {/* Add Template button moved to Actions Row */}
                                             </div>
                                              <ul className="space-y-2 text-sm">
                                                   {filteredTemplates.length > 0 ? filteredTemplates.map((template) => (
                                                       <li key={template.id} className="flex items-center justify-between group py-1 border-b">
                                                           <span className="truncate text-muted-foreground">{template.name}</span>
                                                           <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
                                                               <Button
                                                                   variant="ghost"
                                                                   size="icon"
                                                                   className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                                                   onClick={() => handleLoadTemplate(template.id)}
                                                                   title={`Cargar Template (${template.type === 'daily' ? 'Diario' : 'Semanal'})`}
                                                               >
                                                                   <Upload className="h-4 w-4" />
                                                               </Button>
                                                               <AlertDialog>
                                                                   <AlertDialogTrigger asChild>
                                                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => confirmDeleteItem('template', template.id, template.name)} title="Eliminar Template"><Trash2 className="h-4 w-4" /></Button>
                                                                   </AlertDialogTrigger>
                                                                   {/* AlertDialogContent for Delete Confirmation is defined below */}
                                                               </AlertDialog>
                                                           </div>
                                                       </li>
                                                   )) : (
                                                       <p className="text-xs text-muted-foreground italic text-center pt-2">
                                                           No hay templates {viewMode === 'day' ? 'diarios' : 'semanales'} guardados para esta sede.
                                                       </p>
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
                         </div>

                        {/* --- Day View Date Selector --- */}
                         {viewMode === 'day' && (
                             <div className="flex flex-col items-center space-y-1">
                                 <Popover>
                                     <PopoverTrigger asChild>
                                         <Button
                                             variant={'outline'}
                                             className={cn(
                                                 'w-[280px] justify-start text-left font-normal',
                                                 !targetDate && 'text-muted-foreground',
                                                 isHoliday(targetDate) && 'border-primary text-primary font-semibold' // Use primary color for holiday highlight
                                             )}
                                              disabled={isCheckingHoliday} // Disable while checking holiday
                                         >
                                             <CalendarModernIcon className="mr-2 h-4 w-4 text-primary" /> {/* Modern Calendar Icon */}
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
                                                  holiday: 'text-primary font-semibold border border-primary', // Use primary border/text for holiday
                                             }}
                                         />
                                     </PopoverContent>
                                 </Popover>
                            </div>
                         )}

                        {/* --- Week View Navigator --- */}
                        {viewMode === 'week' && (
                             <div className="flex flex-col items-center space-y-1">
                                <WeekNavigator
                                    currentDate={currentDate}
                                    onPreviousWeek={handlePreviousWeek}
                                    onNextWeek={handleNextWeek}
                                />
                            </div>
                        )}

                        {/* View Mode Toggle */}
                         <div className="flex flex-col items-center space-y-1">
                            <Select value={viewMode} onValueChange={(value) => setViewMode(value as 'day' | 'week')}>
                                <SelectTrigger className="w-[120px]">
                                    <SelectValue placeholder="Vista" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="day">Día</SelectItem>
                                    <SelectItem value="week">Semana</SelectItem>
                                </SelectContent>
                            </Select>
                         </div>

                 </CardContent>
            </Card>


              {/* Main content grid */}
             <DndWrapper> {/* Conditionally wrap with DndContext */}
                 {/* Adjusted grid layout: 2 columns for employees, 10 for schedule on large screens */}
                 <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mb-6"> {/* Add margin-bottom */}

                     {/* --- Available Employees (Takes 2/12 width on lg) --- */}
                      <div className="lg:col-span-2 space-y-6">
                          <EmployeeList employees={availableEmployees} />
                     </div>


                     {/* --- Schedule View (Takes remaining 10/12 width on lg) --- */}
                     <div className="lg:col-span-10 overflow-x-auto"> {/* Add horizontal scroll on main view area */}
                        <ScheduleView
                            departments={filteredDepartments}
                            scheduleData={scheduleData}
                            onRemoveShift={handleRemoveShift}
                            viewMode={viewMode}
                            weekDates={weekDates} // Pass week dates
                            currentDate={targetDate} // Pass target date for single day view
                            onAddShiftRequest={handleOpenEmployeeSelectionModal} // Pass the handler to open employee selection
                            onShiftClick={handleShiftClick} // Pass the handler for clicking a shift card
                            getScheduleForDate={getScheduleForDate} // Pass helper function
                            onDuplicateDay={handleDuplicateDay} // Pass the duplicate handler
                            onClearDay={handleConfirmClearDay} // Pass the clear handler trigger
                            isHoliday={isHoliday} // Pass the holiday check function
                        />
                     </div>
                 </div>
             </DndWrapper>

             {/* --- Actions Row - Moved below the main grid, aligned to the right --- */}
            <div className="flex flex-wrap justify-end gap-2 mt-6">
                 {/* Share Button */}
                 <Button onClick={handleShareSchedule} variant="outline" className="hover:bg-blue-500 hover:text-white">
                     <Share2 className="mr-2 h-4 w-4" /> Compartir (Texto)
                 </Button>
                 {/* PDF Export */}
                 <Button onClick={handleExportPDF} variant="outline" className="hover:bg-red-500 hover:text-white">
                     <FileDown className="mr-2 h-4 w-4" /> PDF
                 </Button>
                 {/* CSV Export */}
                 <Button onClick={handleExportCSV} variant="outline" className="hover:bg-green-500 hover:text-white">
                     <FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar Horas (CSV)
                 </Button>
                 {/* Duplicate Day (Only in Day View) */}
                 {viewMode === 'day' && (
                    <Button onClick={() => handleDuplicateDay(targetDate)} variant="outline" className="hover:bg-primary hover:text-primary-foreground">
                        <CopyPlus className="mr-2 h-4 w-4" /> Duplicar al Día Siguiente
                    </Button>
                 )}
                 {/* Save as Template */}
                 <Dialog open={isTemplateModalOpen} onOpenChange={setIsTemplateModalOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="hover:bg-primary hover:text-primary-foreground">
                            <Download className="mr-2 h-4 w-4" /> Guardar como Template
                        </Button>
                    </DialogTrigger>
                     <DialogContent>
                         <DialogHeader>
                             <DialogTitle>Guardar Template {viewMode === 'day' ? 'Diario' : 'Semanal'}</DialogTitle>
                             <DialogDescription>Ingresa un nombre para este template (basado en el horario {viewMode === 'day' ? `del ${format(targetDate, 'PPP', {locale: es})}` : 'de la semana actual'} para {locations.find(l => l.id === selectedLocationId)?.name}).</DialogDescription>
                         </DialogHeader>
                         <div className="py-4">
                             <Label htmlFor="template-name">Nombre Template</Label>
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
                             <Button onClick={handleSaveTemplate}>Guardar Template</Button>
                         </DialogFooter>
                     </DialogContent>
                 </Dialog>
                  {/* Save Schedule */}
                 <Button onClick={handleSaveSchedule} variant="outline" className="hover:bg-primary hover:text-primary-foreground">
                     <Save className="mr-2 h-4 w-4" /> Guardar Horario
                 </Button>
             </div>


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
                           {/* Employee ID Input - Conditionally disable if editing */}
                           <div>
                               <Label htmlFor="employee-id">ID Colaborador</Label>
                               <Input
                                   id="employee-id"
                                   value={employeeFormData.id}
                                   onChange={(e) => setEmployeeFormData(prev => ({ ...prev, id: e.target.value }))}
                                   placeholder="Ej: 101, CEDULA123"
                                   disabled={!!editingEmployee} // Disable ID field when editing
                               />
                               {!!editingEmployee && <p className="text-xs text-muted-foreground mt-1">El ID no se puede cambiar al editar.</p>}
                           </div>
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
                             ¿Eliminar {itemToDelete?.type === 'location' ? 'Sede' : itemToDelete?.type === 'department' ? 'Departamento' : itemToDelete?.type === 'employee' ? 'Colaborador' : 'Template'} "{itemToDelete?.name}"?
                             {itemToDelete?.type === 'location' && " Se eliminarán los departamentos, colaboradores y templates asociados."}
                             {itemToDelete?.type === 'department' && " Se eliminarán los turnos asociados en los horarios y templates."}
                             {itemToDelete?.type === 'employee' && " Se eliminarán los turnos asociados en los horarios y templates."}
                             {itemToDelete?.type === 'template' && " Se eliminará este template guardado."}
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

            {/* Editable Notes Section */}
            <Card className="mt-8 shadow-lg bg-card">
                <CardHeader>
                    <CardTitle className="text-lg text-foreground">Notas Adicionales</CardTitle>
                    <CardDescription>
                        Agrega notas importantes sobre horarios, eventos especiales o cualquier información relevante para la semana.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Textarea
                        value={notes}
                        onChange={handleNotesChange}
                        placeholder="Ej: Cierre anticipado el jueves por fumigación..."
                        rows={4}
                        className="w-full"
                    />
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleSaveNotes}>Guardar Notas</Button>
                </CardFooter>
            </Card>


        </main>
    );
}


    