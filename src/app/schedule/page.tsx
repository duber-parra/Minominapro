
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
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Edit, ChevronsLeft, ChevronsRight, Calendar as CalendarModernIcon, Users, Building, Building2, MinusCircle, ChevronsUpDown, Settings, Save, CopyPlus, Library, Eraser, Download, Upload, FileX2, FileSpreadsheet, FileDown, PencilLine, Share2, Loader2 } from 'lucide-react'; // Added Loader2
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';

import { LocationSelector } from '@/components/schedule/LocationSelector';
import { EmployeeList } from '@/components/schedule/EmployeeList';
import { ScheduleView } from '@/components/schedule/ScheduleView';
import { ShiftDetailModal } from '@/components/schedule/ShiftDetailModal';
import { WeekNavigator } from '@/components/schedule/WeekNavigator';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { EmployeeSelectionModal } from '@/components/schedule/EmployeeSelectionModal';

import type { Location, Department, Employee, ShiftAssignment, ScheduleData, ShiftTemplate, DailyAssignments, WeeklyAssignments } from '@/types/schedule';
import { startOfWeek, endOfWeek, addDays, format, addWeeks, subWeeks, parseISO, getYear, isValid, differenceInMinutes, parse as parseDateFnsInternal, isSameDay } from 'date-fns'; // Added isSameDay
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { getColombianHolidays } from '@/services/colombian-holidays';
import { exportScheduleToPDF } from '@/lib/schedule-pdf-exporter';
import { formatTo12Hour } from '@/lib/time-utils';

// Helper to generate dates for the current week
const getWeekDates = (currentDate: Date): Date[] => {
  const start = startOfWeek(currentDate, { weekStartsOn: 1 }); // Start on Monday
  return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
};

// LocalStorage Keys
const SCHEDULE_DATA_KEY = 'schedulePlannerData';
const SCHEDULE_TEMPLATES_KEY = 'scheduleTemplates';
const SCHEDULE_NOTES_KEY = 'schedulePlannerNotes';
const LOCATIONS_KEY = 'schedulePlannerLocations';
const DEPARTMENTS_KEY = 'schedulePlannerDepartments';
const EMPLOYEES_KEY = 'schedulePlannerEmployees';

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
        const holidaySet = new Set(holidays.map(h => {
            if (!h || typeof h.year !== 'number' || typeof h.month !== 'number' || typeof h.day !== 'number') {
                console.error(`Error: Invalid holiday object structure for year ${year}:`, h);
                return '';
            }
             try {
                 const dateToFormat = new Date(h.year, h.month - 1, h.day);
                 if (!isValid(dateToFormat) || getYear(dateToFormat) !== h.year) {
                     console.error(`Error: Invalid date components for holiday in year ${year}:`, h);
                     return '';
                 }
                 return format(dateToFormat, 'yyyy-MM-dd');
             } catch (formatError) {
                 console.error(`Error formatting holiday date for year ${year}:`, h, formatError);
                 return '';
             }
        }).filter(dateStr => dateStr !== ''));

        holidaysCache[year] = holidaySet;
        return holidaySet;
    } catch (error) {
        console.error(`Error fetching or caching holidays for ${year}:`, error);
        return new Set();
    }
}

const initialLocations: Location[] = [
  { id: 'loc-1', name: 'Sede Principal' },
  { id: 'loc-2', name: 'Sede Norte' },
];

// Define initial departments with icon components
const iconMap: { [key: string]: React.ElementType } = {
    Building: Building,
    Users: Users,
    Edit: Edit,
    Building2: Building2, // Add other icons used
};
const initialDepartments: Department[] = [
  { id: 'dep-1', name: 'Cocina', locationId: 'loc-1', icon: Building },
  { id: 'dep-2', name: 'Salón', locationId: 'loc-1', icon: Users },
  { id: 'dep-3', name: 'Caja & Barra', locationId: 'loc-2', icon: Edit },
].map(dep => ({ ...dep, iconName: Object.keys(iconMap).find(key => iconMap[key] === dep.icon) })); // Add iconName initially


const initialEmployees: Employee[] = [
  { id: '101', name: 'Carlos Pérez', primaryLocationId: 'loc-1' },
  { id: '102', name: 'Ana Rodriguez', primaryLocationId: 'loc-1' },
  { id: '201', name: 'Luis Gómez', primaryLocationId: 'loc-2' },
];

const defaultNotesText = `Lun a Jue: Parrillazo y Gauchos 12am. - Gaucho 11pm. | Vie a Sab: Parrillazo y Gauchos 1am. - Gaucho 12am. | Dom: Todos 11 pm`;

const parseTimeToMinutes = (timeStr: string): number => {
  if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

const calculateShiftDuration = (assignment: ShiftAssignment, shiftDate: Date): number => {
    try {
        const startDateStr = format(shiftDate, 'yyyy-MM-dd');
        const startTime = parseDateFnsInternal(`${startDateStr} ${assignment.startTime}`, 'yyyy-MM-dd HH:mm', new Date());

        const startTimeMinutes = parseTimeToMinutes(assignment.startTime);
        const endTimeMinutes = parseTimeToMinutes(assignment.endTime);
        let endTime = parseDateFnsInternal(`${startDateStr} ${assignment.endTime}`, 'yyyy-MM-dd HH:mm', new Date());
        if (!isValid(endTime) || endTimeMinutes < startTimeMinutes) {
             if (endTimeMinutes < startTimeMinutes) {
                endTime = addDays(parseDateFnsInternal(`${startDateStr} ${assignment.endTime}`, 'yyyy-MM-dd HH:mm', new Date()), 1);
             } else {
                 console.warn('Invalid end time for duration calculation:', assignment);
                 return 0;
             }
        }

        if (!isValid(startTime) || !isValid(endTime)) {
            console.warn('Invalid start or end time for duration calculation:', assignment);
            return 0;
        }

        let totalShiftMinutes = differenceInMinutes(endTime, startTime);

        let breakMinutes = 0;
        if (assignment.includeBreak && assignment.breakStartTime && assignment.breakEndTime) {
            const breakStartMinutes = parseTimeToMinutes(assignment.breakStartTime);
            const breakEndMinutes = parseTimeToMinutes(assignment.breakEndTime);
            if (breakEndMinutes > breakStartMinutes) {
                 breakMinutes = breakEndMinutes - breakStartMinutes;
            }
        }

        const netMinutes = totalShiftMinutes - breakMinutes;
        return Math.max(0, netMinutes) / 60;
    } catch (error) {
        console.error("Error calculating shift duration:", error, assignment);
        return 0;
    }
};

// Helper function to load data from localStorage safely
const loadFromLocalStorage = <T,>(key: string, defaultValue: T): T => {
    if (typeof window === 'undefined') {
        return defaultValue; // Return default during SSR
    }
    try {
        const savedData = localStorage.getItem(key);

        // Handle notes specifically as a string
        if (key === SCHEDULE_NOTES_KEY) {
             // Directly return the string or default, no JSON parsing
             return savedData !== null ? (savedData as unknown as T) : defaultValue;
        }

        if (savedData) {
             const parsed = JSON.parse(savedData);
             // Basic check to see if parsed data looks like the expected type (array for lists)
             if (key === LOCATIONS_KEY || key === EMPLOYEES_KEY || key === DEPARTMENTS_KEY || key === SCHEDULE_TEMPLATES_KEY) {
                 if (Array.isArray(parsed)) {
                      console.log(`[loadFromLocalStorage] Loaded ${parsed.length} items for key: ${key}`); // Add logging
                      return parsed as T;
                 } else {
                     console.warn(`[loadFromLocalStorage] Expected array for key ${key}, but found:`, typeof parsed, ". Returning default.");
                     return defaultValue; // Return default if type mismatch
                 }
             } else if (key === SCHEDULE_DATA_KEY) {
                 // More complex types might need more checks, but for now assume it's okay if it parses
                  console.log(`[loadFromLocalStorage] Loaded schedule data for key: ${key}`); // Add logging
                 return parsed as T;
             } else {
                 // For unknown keys, just return the parsed data if it's not null/undefined
                 return parsed as T;
             }
        } else {
            console.log(`[loadFromLocalStorage] No data found for key: ${key}, returning default.`); // Add logging for missing data
        }
    } catch (error) {
        // More specific error handling for JSON parsing
         if (error instanceof SyntaxError) {
             console.error(`Error parsing JSON from localStorage for key ${key}:`, error.message);
             // Attempt to remove the invalid item to prevent future errors
             try {
                 localStorage.removeItem(key);
                 console.warn(`Removed invalid item from localStorage for key: ${key}`);
             } catch (removeError) {
                 console.error(`Error removing invalid item from localStorage for key ${key}:`, removeError);
             }
         } else {
             console.error(`Error loading ${key} from localStorage:`, error);
         }
    }
    return defaultValue; // Return default if nothing saved or error occurred
};


// Helper specifically for loading departments and restoring icons
const loadDepartmentsFromLocalStorage = (defaultValue: Department[]): Department[] => {
    const savedDepartments = loadFromLocalStorage<{id: string, name: string, locationId: string, iconName?: string}[]>(DEPARTMENTS_KEY, []);
    if (savedDepartments.length > 0) {
         return savedDepartments.map(dep => ({
            ...dep,
            icon: dep.iconName ? iconMap[dep.iconName] : Building, // Use map or default
         }));
    }
     // If nothing loaded, map initial data to include iconName
     return defaultValue.map(dep => ({
         ...dep,
         iconName: Object.keys(iconMap).find(key => iconMap[key] === dep.icon)
     }));
};

// Helper for loading schedule data and parsing dates/employees
const loadScheduleDataFromLocalStorage = (employees: Employee[], defaultValue: { [dateKey: string]: ScheduleData }): { [dateKey: string]: ScheduleData } => {
    const savedSchedule = loadFromLocalStorage<{ [dateKey: string]: any }>(SCHEDULE_DATA_KEY, defaultValue);
     try {
         const hydratedSchedule: { [dateKey: string]: ScheduleData } = {};
         Object.keys(savedSchedule).forEach(key => {
             const dayData = savedSchedule[key];
             if (!dayData || !dayData.date) return; // Skip invalid entries

             const date = typeof dayData.date === 'string' ? parseISO(dayData.date) : dayData.date;
             if (!isValid(date)) return; // Skip if date is invalid

             const hydratedAssignments: { [departmentId: string]: ShiftAssignment[] } = {};
             if (dayData.assignments) {
                 Object.keys(dayData.assignments).forEach(deptId => {
                     const assignments = dayData.assignments[deptId];
                     if (Array.isArray(assignments)) {
                         hydratedAssignments[deptId] = assignments.map((assign: any) => {
                             // Ensure employee object is fully populated
                             if (assign.employee && typeof assign.employee === 'object') {
                                 const fullEmployee = employees.find(emp => emp.id === assign.employee.id);
                                 if (fullEmployee) {
                                     return { ...assign, employee: fullEmployee };
                                 } else {
                                     console.warn(`Employee ID ${assign.employee.id} not found while loading schedule for assignment ${assign.id}`);
                                     return { ...assign, employee: { id: assign.employee.id, name: `(ID: ${assign.employee.id})`, primaryLocationId: '' } }; // Placeholder if employee not found
                                 }
                             }
                             return assign; // Should not happen if saved correctly
                         });
                     }
                 });
             }
             hydratedSchedule[key] = { date, assignments: hydratedAssignments };
         });
         return hydratedSchedule;
     } catch (error) {
         console.error("Error parsing schedule data from localStorage:", error);
         return defaultValue;
     }
};


export default function SchedulePage() {
    // --- State Initialization using localStorage loaders ---
    const [locations, setLocations] = useState<Location[]>(() => loadFromLocalStorage(LOCATIONS_KEY, initialLocations));
    const [departments, setDepartments] = useState<Department[]>(() => loadDepartmentsFromLocalStorage(initialDepartments));
    const [employees, setEmployees] = useState<Employee[]>(() => loadFromLocalStorage(EMPLOYEES_KEY, initialEmployees));
    const [scheduleData, setScheduleData] = useState<{ [dateKey: string]: ScheduleData }>(() => loadScheduleDataFromLocalStorage(employees, {})); // Pass initial employees to loader
    const [savedTemplates, setSavedTemplates] = useState<ShiftTemplate[]>(() => loadFromLocalStorage(SCHEDULE_TEMPLATES_KEY, []));
    const [notes, setNotes] = useState<string>(() => loadFromLocalStorage(SCHEDULE_NOTES_KEY, defaultNotesText));

    // Other state variables remain the same
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'day' | 'week'>('week');
    const [selectedLocationId, setSelectedLocationId] = useState<string>(() => {
        // Try to load initially selected location based on loaded locations
        const loadedLocations = loadFromLocalStorage<Location[]>(LOCATIONS_KEY, initialLocations);
        return loadedLocations.length > 0 ? loadedLocations[0].id : '';
    });
    const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
    const [isEmployeeSelectionModalOpen, setIsEmployeeSelectionModalOpen] = useState(false);
    const [shiftRequestContext, setShiftRequestContext] = useState<{ departmentId: string; date: Date } | null>(null);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [editingShift, setEditingShift] = useState<{ assignment: ShiftAssignment; date: Date; departmentId: string } | null>(null);
    const [targetDate, setTargetDate] = useState<Date>(new Date());

    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [isDepartmentModalOpen, setIsDepartmentModalOpen] = useState(false);
    const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);

    const [editingLocation, setEditingLocation] = useState<Location | null>(null);
    const [locationFormData, setLocationFormData] = useState({ name: '' });

    const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
    const [departmentFormData, setDepartmentFormData] = useState<{name: string, locationId: string, iconName?: string}>({ name: '', locationId: selectedLocationId, iconName: undefined }); // Add iconName

    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [employeeFormData, setEmployeeFormData] = useState({ id: '', name: '', primaryLocationId: selectedLocationId });

    const [itemToDelete, setItemToDelete] = useState<{ type: 'location' | 'department' | 'employee' | 'template'; id: string; name: string } | null>(null);

    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [templateName, setTemplateName] = useState('');

    const [clearingDate, setClearingDate] = useState<Date | null>(null);

    const [holidaySet, setHolidaySet] = useState<Set<string>>(new Set());
    const [isCheckingHoliday, setIsCheckingHoliday] = useState<boolean>(false);


    const isMobile = useIsMobile();
    const { toast } = useToast();

    useEffect(() => {
        const startYear = getYear(startOfWeek(currentDate, { weekStartsOn: 1 }));
        const endYear = getYear(endOfWeek(currentDate, { weekStartsOn: 1 }));
        const yearsToFetch = new Set([startYear, endYear]);

        setIsCheckingHoliday(true);
        Promise.all(Array.from(yearsToFetch).map(year => fetchAndCacheHolidays(year)))
            .then(results => {
                const combinedSet = new Set<string>();
                results.forEach(set => set.forEach(date => combinedSet.add(date)));
                setHolidaySet(combinedSet);
            })
            .catch(error => {
                console.error("Error fetching holidays for week view:", error);
                setHolidaySet(new Set());
            })
            .finally(() => {
                setIsCheckingHoliday(false);
            });
    }, [currentDate]);

    // --- Load Data from localStorage on Mount ---
     // Reload schedule data if employees change (e.g., after adding/editing an employee)
    useEffect(() => {
        setScheduleData(loadScheduleDataFromLocalStorage(employees, {}));
    }, [employees]);

     // --- Save Data to localStorage on Change ---
     useEffect(() => {
         if (typeof window !== 'undefined') {
             try { localStorage.setItem(LOCATIONS_KEY, JSON.stringify(locations)); }
             catch (e) { console.error("Error saving locations:", e); }
         }
     }, [locations]);

     useEffect(() => {
         if (typeof window !== 'undefined') {
             try {
                 // Store icon name instead of component
                 const departmentsToSave = departments.map(({ icon, ...rest }) => ({
                    ...rest,
                    iconName: Object.keys(iconMap).find(key => iconMap[key] === icon) // Find the name
                 }));
                 localStorage.setItem(DEPARTMENTS_KEY, JSON.stringify(departmentsToSave));
             }
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
                const dataToSave = JSON.parse(JSON.stringify(scheduleData));
                 Object.keys(dataToSave).forEach(key => {
                     if (dataToSave[key] && dataToSave[key].date instanceof Date) {
                         dataToSave[key].date = dataToSave[key].date.toISOString();
                     }
                     if (dataToSave[key] && dataToSave[key].assignments) {
                         Object.keys(dataToSave[key].assignments).forEach(deptId => {
                             dataToSave[key].assignments[deptId].forEach((assign: any) => {
                                 // Only store the employee ID, not the whole object
                                 if (assign.employee && typeof assign.employee === 'object') {
                                     assign.employee = { id: assign.employee.id };
                                 }
                             });
                         });
                     }
                 });
                localStorage.setItem(SCHEDULE_DATA_KEY, JSON.stringify(dataToSave));
            } catch (error) {
                console.error("Error saving schedule data to localStorage:", error);
                 toast({
                     title: "Error al Guardar Horario",
                     description: "No se pudo guardar el horario en el almacenamiento local.",
                     variant: "destructive",
                 });
            }
        }
    }, [scheduleData, toast]); // Added toast dependency

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
                 console.log("Saving templates to localStorage:", savedTemplates); // Log before saving
                 localStorage.setItem(SCHEDULE_TEMPLATES_KEY, JSON.stringify(savedTemplates));
                 console.log("Templates saved successfully."); // Log if saving succeeds
            } catch (error) {
                 console.error("Error saving templates to localStorage:", error);
                 toast({
                     title: 'Error al Guardar Templates',
                     description: 'No se pudieron guardar los templates localmente.',
                     variant: 'destructive',
                 });
            }
        }
    }, [savedTemplates, toast]); // Add toast as a dependency

    // ---- End LocalStorage Effects ---

    const weekDates = getWeekDates(currentDate);

    const getScheduleForDate = useCallback((date: Date): ScheduleData => {
        const key = format(date, 'yyyy-MM-dd');
        // Retrieve potentially partially loaded data from state
        const dayData = scheduleData[key];
        const hydratedAssignments: { [departmentId: string]: ShiftAssignment[] } = {};

        // Re-hydrate employee objects
        if (dayData && dayData.assignments) {
             Object.keys(dayData.assignments).forEach(deptId => {
                 hydratedAssignments[deptId] = (dayData.assignments[deptId] || []).map(assign => { // Ensure array exists
                    // Find the full employee object from the current employees state
                    const fullEmployee = employees.find(emp => emp.id === assign.employee?.id); // Added null check for assign.employee
                    if (fullEmployee) {
                        return { ...assign, employee: fullEmployee }; // Return assignment with full employee object
                    } else {
                        // Handle case where employee might be missing (e.g., deleted)
                        console.warn(`Employee with ID ${assign.employee?.id || 'undefined'} not found for assignment ${assign.id}`);
                        // Return a placeholder or handle as needed
                         return { ...assign, employee: { id: assign.employee?.id || 'unknown', name: `(ID: ${assign.employee?.id || '??'})`, primaryLocationId: '' } };
                    }
                 }).filter(assign => assign !== null); // Filter out nulls if you returned null above
             });
        }

        // Return schedule data with fully hydrated employee objects
        return {
            date: date,
            assignments: hydratedAssignments
        }; // Return default structure if no data
    }, [scheduleData, employees]); // Added employees dependency


    const filteredEmployees = useMemo(() => employees.filter(emp => emp.primaryLocationId === selectedLocationId), [employees, selectedLocationId]);
    const filteredDepartments = useMemo(() => departments.filter(dep => dep.locationId === selectedLocationId), [departments, selectedLocationId]);

    // Filter templates based on selected location and current view mode
    const filteredTemplates = useMemo(() => {
        console.log("All saved templates:", savedTemplates); // Log all templates
        // Ensure savedTemplates is always an array before filtering
        const templatesArray = Array.isArray(savedTemplates) ? savedTemplates : [];
        const filtered = templatesArray.filter(temp =>
             temp.locationId === selectedLocationId && temp.type === viewMode // Match current viewMode ('day' or 'week')
        );
        console.log(`Filtered templates for location ${selectedLocationId} and view ${viewMode}:`, filtered); // Log filtered templates
        return filtered;
    }, [savedTemplates, selectedLocationId, viewMode]);


     // Recalculate assignedEmployeeIdsForTargetDate when relevant states change
    const assignedEmployeeIdsForTargetDate = useMemo(() => {
        const ids = new Set<string>();
        const dateToUse = viewMode === 'day' ? targetDate : (shiftRequestContext?.date || null);

        if (dateToUse) {
            const dateKey = format(dateToUse, 'yyyy-MM-dd');
            const daySchedule = scheduleData[dateKey];
            if (daySchedule && daySchedule.assignments) {
                Object.values(daySchedule.assignments).flat().forEach(assignment => {
                    ids.add(assignment.employee.id);
                });
            }
        }
        return ids;
    }, [scheduleData, targetDate, viewMode, shiftRequestContext]); // Added viewMode and shiftRequestContext

    // Update availableEmployees based on assignedEmployeeIdsForTargetDate
    const availableEmployees = useMemo(() => {
        // In week view, always show all filtered employees
        if (viewMode === 'week' && !isEmployeeSelectionModalOpen) { // Only filter if modal isn't open
            return filteredEmployees;
        }
        // Filter out employees already assigned on the targetDate (relevant for both day and when adding in week view via modal)
        const dateForFiltering = viewMode === 'day' ? targetDate : (shiftRequestContext?.date || null);
        if (!dateForFiltering) return filteredEmployees; // If no date context, show all

        const dateKey = format(dateForFiltering, 'yyyy-MM-dd');
        const assignedIdsOnDate = new Set<string>();
        const daySchedule = scheduleData[dateKey];
        if (daySchedule && daySchedule.assignments) {
            Object.values(daySchedule.assignments).flat().forEach(assignment => {
                assignedIdsOnDate.add(assignment.employee.id);
            });
        }
        return filteredEmployees.filter(emp => !assignedIdsOnDate.has(emp.id));

    }, [filteredEmployees, scheduleData, targetDate, viewMode, shiftRequestContext, isEmployeeSelectionModalOpen]); // Dependencies adjusted


    // Ensure form data defaults are updated when selectedLocationId changes
    useEffect(() => {
        if (!departmentFormData.locationId || departmentFormData.locationId !== selectedLocationId) {
           setDepartmentFormData(prev => ({ ...prev, locationId: selectedLocationId }));
        }
        if (!employeeFormData.primaryLocationId || employeeFormData.primaryLocationId !== selectedLocationId) {
            setEmployeeFormData(prev => ({ ...prev, primaryLocationId: selectedLocationId }));
        }
    }, [selectedLocationId, departmentFormData.locationId, employeeFormData.primaryLocationId]);


    const handleLocationChange = (locationId: string) => {
        setSelectedLocationId(locationId);
         // Also update form defaults when location changes interactively
         setDepartmentFormData(prev => ({ ...prev, locationId: locationId }));
         setEmployeeFormData(prev => ({ ...prev, primaryLocationId: locationId }));
    };

    const handleOpenEmployeeSelectionModal = (departmentId: string, date: Date) => {
         setEditingShift(null);
         setShiftRequestContext({ departmentId, date });
         setTargetDate(date); // Set target date for filtering available employees
         setIsEmployeeSelectionModalOpen(true);
    };

    const handleEmployeeSelectedForShift = (employee: Employee) => {
        if (!shiftRequestContext) return;
        setSelectedEmployee(employee);
        setIsEmployeeSelectionModalOpen(false);
        setIsShiftModalOpen(true);
    };

    const handleOpenShiftModalForDrop = (employee: Employee, departmentId: string, date: Date) => {
        setEditingShift(null);
        setSelectedEmployee(employee);
        setShiftRequestContext({ departmentId, date });
        setIsShiftModalOpen(true);
    };

    const handleShiftClick = (assignment: ShiftAssignment, date: Date, departmentId: string) => {
        setEditingShift({ assignment, date, departmentId });
        setSelectedEmployee(assignment.employee);
        setShiftRequestContext({ departmentId, date });
        setIsShiftModalOpen(true);
    };

    const handleAddOrUpdateShift = (details: any) => {
        const context = editingShift || shiftRequestContext;
        const employeeForShift = editingShift?.assignment.employee || selectedEmployee;

        if (!employeeForShift || !context) return;

        const { departmentId, date } = context;
        const dateKey = format(date, 'yyyy-MM-dd');

        const newAssignmentId = `shift_${employeeForShift.id}_${dateKey}_${details.startTime.replace(':', '')}`;

        const assignmentPayload: ShiftAssignment = {
            id: editingShift?.assignment.id || newAssignmentId,
            employee: employeeForShift, // Keep the full employee object here
            startTime: details.startTime,
            endTime: details.endTime,
            includeBreak: details.includeBreak || false,
            breakStartTime: details.includeBreak ? details.breakStartTime : undefined,
            breakEndTime: details.includeBreak ? details.breakEndTime : undefined,
        };

        setScheduleData(prevData => {
            // Get current day's data, ensuring employee objects are hydrated if needed
            const currentDayData = getScheduleForDate(date);
            const departmentAssignments = currentDayData.assignments[departmentId] || [];

            let updatedAssignments;
            if (editingShift) {
                 // Update existing assignment
                updatedAssignments = departmentAssignments.map(a =>
                    a.id === editingShift.assignment.id ? assignmentPayload : a
                );
            } else {
                 // Check if employee is already assigned on this *specific date*
                 const isAlreadyAssignedOnDate = Object.values(currentDayData.assignments)
                                                .flat()
                                                .some(a => a.employee.id === employeeForShift.id);

                 if (isAlreadyAssignedOnDate) {
                     toast({
                         title: 'Asignación Duplicada',
                         description: `${employeeForShift.name} ya tiene un turno asignado para el ${format(date, 'PPP', { locale: es })}.`,
                         variant: 'destructive',
                     });
                     return prevData; // Prevent adding duplicate assignment on the same day
                 }
                // Add new assignment
                updatedAssignments = [...departmentAssignments, assignmentPayload];
            }

             // Create the updated structure for the day
             const updatedDayData: ScheduleData = {
                 ...currentDayData, // Preserve other departments' assignments for the day
                 date: date, // Ensure date is set
                 assignments: {
                     ...currentDayData.assignments,
                     [departmentId]: updatedAssignments,
                 },
             };

            // Return the updated overall schedule data
            return {
                ...prevData,
                [dateKey]: updatedDayData,
            };
        });
        setIsShiftModalOpen(false);
        setSelectedEmployee(null);
        setShiftRequestContext(null);
        setEditingShift(null);
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

            const newAssignments = { ...dayData.assignments, [departmentId]: departmentAssignments };

             // Clean up empty department arrays if necessary
            if (newAssignments[departmentId]?.length === 0) {
                delete newAssignments[departmentId];
            }
             // If the entire day has no assignments left, you might want to remove the dateKey entry
             // const dayIsEmpty = Object.values(newAssignments).every(arr => arr.length === 0);
             // if (dayIsEmpty) {
             //     const updatedData = { ...prevData };
             //     delete updatedData[dateKey];
             //     return updatedData;
             // }

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

        if (!over || !active || isMobile) return; // Disable drag on mobile

        const employeeId = active.id as string;
        const targetData = over.data.current as { type: string; id: string; date?: string };

        if (!targetData || targetData.type !== 'department' || !targetData.date) {
            console.warn("Invalid drop target data:", targetData);
            return;
        }

        const departmentId = targetData.id;
        const dropDate = parseISO(targetData.date); // Date is already passed as ISO string

        const employee = employees.find(emp => emp.id === employeeId);
        if (!employee) return;

        // Check if the employee is already assigned *on this specific date*
        const dateKey = format(dropDate, 'yyyy-MM-dd');
        const daySchedule = scheduleData[dateKey]; // Use scheduleData state directly
        if (daySchedule && daySchedule.assignments) {
             const isAlreadyAssignedOnDate = Object.values(daySchedule.assignments)
                                            .flat()
                                            .some(assignment => assignment.employee.id === employeeId);
             if (isAlreadyAssignedOnDate) {
                 toast({
                     title: 'Asignación Duplicada',
                     description: `${employee.name} ya tiene un turno asignado para el ${format(dropDate, 'PPP', { locale: es })}.`,
                     variant: 'destructive',
                 });
                 return; // Prevent opening modal if already assigned
             }
        }

        // If not assigned on this date, open the shift modal
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
            setLocations(locations.map(loc => loc.id === editingLocation.id ? { ...loc, name } : loc));
             toast({ title: 'Sede Actualizada', description: `Sede "${name}" actualizada.` });
        } else {
             const newLocation = { id: `loc-${Date.now()}`, name }; // Use timestamp for simple unique ID
            setLocations([...locations, newLocation]);
            toast({ title: 'Sede Agregada', description: `Sede "${name}" agregada.` });
            // Set as selected only if it's the first one or none is selected
            if (locations.length === 0 || !selectedLocationId) {
                 setSelectedLocationId(newLocation.id);
            }
        }
        setIsLocationModalOpen(false);
        setEditingLocation(null);
    };

    const handleOpenDepartmentModal = (department: Department | null) => {
        setEditingDepartment(department);
        // Find icon name if editing
        const iconName = department ? Object.keys(iconMap).find(key => iconMap[key] === department.icon) : undefined;
        setDepartmentFormData({
            name: department?.name || '',
            locationId: department?.locationId || selectedLocationId,
            iconName: iconName // Set icon name
        });
        setIsDepartmentModalOpen(true);
    };

    const handleSaveDepartment = () => {
         const name = departmentFormData.name.trim();
         const locationId = departmentFormData.locationId;
         const iconName = departmentFormData.iconName; // Get icon name from form data
        if (!name || !locationId) {
            toast({ title: 'Datos Incompletos', description: 'El nombre y la sede del departamento son requeridos.', variant: 'destructive' });
            return;
        }
         const icon = iconName ? iconMap[iconName] : Building; // Get icon component from map or default

        if (editingDepartment) {
            setDepartments(departments.map(dep => dep.id === editingDepartment.id ? { ...dep, name, locationId, icon, iconName } : dep)); // Save iconName too
             toast({ title: 'Departamento Actualizado', description: `Departamento "${name}" actualizado.` });
        } else {
             const newDepartment = { id: `dep-${Date.now()}`, name, locationId, icon, iconName }; // Use timestamp for ID, save iconName
            setDepartments([...departments, newDepartment]);
            toast({ title: 'Departamento Agregado', description: `Departamento "${name}" agregado.` });
        }
        setIsDepartmentModalOpen(false);
        setEditingDepartment(null);
    };

    const handleOpenEmployeeModal = (employee: Employee | null) => {
        setEditingEmployee(employee);
        setEmployeeFormData({ id: employee?.id || '', name: employee?.name || '', primaryLocationId: employee?.primaryLocationId || selectedLocationId });
        setIsEmployeeModalOpen(true);
    };

    const handleSaveEmployee = () => {
         const id = employeeFormData.id.trim();
         const name = employeeFormData.name.trim();
         const primaryLocationId = employeeFormData.primaryLocationId;
          if (!id || !name || !primaryLocationId) {
             toast({ title: 'Datos Incompletos', description: 'El ID, nombre y la sede principal del colaborador son requeridos.', variant: 'destructive' });
             return;
          }

         const isDuplicateId = employees.some(emp => emp.id === id && emp.id !== editingEmployee?.id);
         if (isDuplicateId) {
             toast({ title: 'ID Duplicado', description: `El ID "${id}" ya está en uso por otro colaborador.`, variant: 'destructive' });
             return;
         }

         const updatedEmployeeData = { id, name, primaryLocationId };

        if (editingEmployee) {
             // Update existing employee
            setEmployees(employees.map(emp => emp.id === editingEmployee.id ? updatedEmployeeData : emp));
             toast({ title: 'Colaborador Actualizado', description: `Colaborador "${name}" (ID: ${id}) actualizado.` });
             // Also update employee details within existing scheduleData assignments
             setScheduleData(prevSchedule => {
                const updatedSchedule = { ...prevSchedule };
                Object.keys(updatedSchedule).forEach(dateKey => {
                    Object.keys(updatedSchedule[dateKey].assignments).forEach(deptId => {
                        updatedSchedule[dateKey].assignments[deptId] = updatedSchedule[dateKey].assignments[deptId].map(assignment => {
                            if (assignment.employee.id === id) {
                                return { ...assignment, employee: updatedEmployeeData }; // Update employee details
                            }
                            return assignment;
                        });
                    });
                });
                return updatedSchedule;
             });
        } else {
             // Add new employee
            const newEmployee = updatedEmployeeData;
            setEmployees(prev => [...prev, newEmployee]);
             toast({ title: 'Colaborador Agregado', description: `Colaborador "${name}" (ID: ${id}) agregado.` });
        }
        setIsEmployeeModalOpen(false);
        setEditingEmployee(null);
    };


     const confirmDeleteItem = (type: 'location' | 'department' | 'employee' | 'template', id: string, name: string) => {
        setItemToDelete({ type, id, name });
     };

    const handleDeleteItem = () => {
        if (!itemToDelete) return;

        try {
            let message = '';
            switch (itemToDelete.type) {
                case 'location':
                    setLocations(prevLocs => {
                        const remaining = prevLocs.filter(loc => loc.id !== itemToDelete.id);
                        // Update selected location if the deleted one was selected
                        if (selectedLocationId === itemToDelete.id) {
                           setSelectedLocationId(remaining.length > 0 ? remaining[0].id : '');
                        }
                        return remaining;
                    });
                    // Cascade delete: remove departments, employees (reset location), templates, and schedule data associated with the location
                    const depsToDelete = departments.filter(dep => dep.locationId === itemToDelete.id).map(d => d.id);
                    setDepartments(prevDeps => prevDeps.filter(dep => dep.locationId !== itemToDelete.id));
                    setEmployees(prevEmps => prevEmps.map(emp => emp.primaryLocationId === itemToDelete.id ? {...emp, primaryLocationId: '' } : emp)); // Reset primary location or remove? Reset seems safer.
                    setSavedTemplates(prevTemplates => (Array.isArray(prevTemplates) ? prevTemplates : []).filter(t => t.locationId !== itemToDelete.id)); // Ensure array before filtering
                    // Remove schedule entries that only contain assignments from the deleted departments
                     setScheduleData(prevSchedule => {
                         const updatedSchedule = { ...prevSchedule };
                         Object.keys(updatedSchedule).forEach(dateKey => {
                             let dayHasOtherAssignments = false;
                             const currentAssignments = updatedSchedule[dateKey].assignments;
                             const newAssignments: { [deptId: string]: ShiftAssignment[] } = {};
                             Object.keys(currentAssignments).forEach(deptId => {
                                 if (!depsToDelete.includes(deptId)) {
                                     newAssignments[deptId] = currentAssignments[deptId];
                                     if (currentAssignments[deptId].length > 0) {
                                         dayHasOtherAssignments = true;
                                     }
                                 }
                             });
                              // If the day only had assignments for the deleted location's departments, remove the day entry
                              // Or just update assignments to be empty for those deps? Let's update.
                              updatedSchedule[dateKey].assignments = newAssignments;
                               // If after removing departments, the day has NO assignments left, remove the day entirely
                               if (Object.keys(updatedSchedule[dateKey].assignments).length === 0) {
                                   delete updatedSchedule[dateKey];
                               }
                         });
                         return updatedSchedule;
                     });

                    message = `Sede "${itemToDelete.name}" y sus datos asociados eliminados.`;
                    break;
                case 'department':
                    setDepartments(prevDeps => prevDeps.filter(dep => dep.id !== itemToDelete.id));
                     // Remove assignments for this department from scheduleData and templates
                     const updatedScheduleDept = { ...scheduleData };
                     Object.keys(updatedScheduleDept).forEach(dateKey => {
                          if (updatedScheduleDept[dateKey].assignments[itemToDelete.id]) {
                              delete updatedScheduleDept[dateKey].assignments[itemToDelete.id];
                               // If day becomes empty, remove it
                              if (Object.keys(updatedScheduleDept[dateKey].assignments).length === 0) {
                                   delete updatedScheduleDept[dateKey];
                              }
                          }
                     });
                     setScheduleData(updatedScheduleDept);

                      // Ensure savedTemplates is an array before mapping
                     const currentTemplatesDept = Array.isArray(savedTemplates) ? savedTemplates : [];
                     const updatedTemplatesDept = currentTemplatesDept.map(t => {
                         let newAssignments = JSON.parse(JSON.stringify(t.assignments));
                         if (t.type === 'daily') {
                             delete (newAssignments as DailyAssignments)[itemToDelete.id];
                         } else if (t.type === 'weekly') {
                             Object.keys(newAssignments).forEach(dateKey => {
                                 if ((newAssignments as any)[dateKey]?.[itemToDelete.id]) {
                                     delete (newAssignments as WeeklyAssignments)[dateKey][itemToDelete.id];
                                     // If day in template becomes empty, remove it
                                      if (Object.keys((newAssignments as WeeklyAssignments)[dateKey]).length === 0) {
                                         delete (newAssignments as WeeklyAssignments)[dateKey];
                                      }
                                 }
                             });
                         }
                         // If template becomes empty, maybe filter it out later? For now, keep it.
                          if (Object.keys(newAssignments).length === 0) {
                              return null; // Mark for filtering
                          }
                         return { ...t, assignments: newAssignments };
                     }).filter(t => t !== null) as ShiftTemplate[]; // Filter out nulls
                     setSavedTemplates(updatedTemplatesDept);
                    message = `Departamento "${itemToDelete.name}" eliminado.`;
                    break;
                case 'employee':
                    setEmployees(prevEmps => prevEmps.filter(emp => emp.id !== itemToDelete.id));
                     // Remove assignments for this employee from scheduleData and templates
                     const updatedScheduleEmp = { ...scheduleData };
                     Object.keys(updatedScheduleEmp).forEach(dateKey => {
                          Object.keys(updatedScheduleEmp[dateKey].assignments).forEach(deptId => {
                              updatedScheduleEmp[dateKey].assignments[deptId] = updatedScheduleEmp[dateKey].assignments[deptId].filter(a => a.employee.id !== itemToDelete.id);
                               // If department becomes empty, remove it
                              if (updatedScheduleEmp[dateKey].assignments[deptId].length === 0) {
                                  delete updatedScheduleEmp[dateKey].assignments[deptId];
                              }
                          });
                           // If day becomes empty, remove it
                          if (Object.keys(updatedScheduleEmp[dateKey].assignments).length === 0) {
                               delete updatedScheduleEmp[dateKey];
                          }
                     });
                     setScheduleData(updatedScheduleEmp);

                       // Ensure savedTemplates is an array before mapping
                       const currentTemplatesEmp = Array.isArray(savedTemplates) ? savedTemplates : [];
                       const updatedTemplatesEmp = currentTemplatesEmp.map(t => {
                           let newAssignments = JSON.parse(JSON.stringify(t.assignments)); // Deep clone
                           let templateChanged = false;
                           if (t.type === 'daily') {
                               Object.keys(newAssignments).forEach(deptId => {
                                  const originalLength = (newAssignments[deptId] || []).length;
                                   newAssignments[deptId] = (newAssignments[deptId] || []).filter((a: any) => a.employee.id !== itemToDelete.id);
                                   if (newAssignments[deptId].length === 0) {
                                       delete newAssignments[deptId];
                                       templateChanged = true;
                                   } else if (newAssignments[deptId].length < originalLength) {
                                       templateChanged = true;
                                   }
                               });
                           } else if (t.type === 'weekly') {
                               Object.keys(newAssignments).forEach(dateKey => {
                                   Object.keys(newAssignments[dateKey] || {}).forEach(deptId => {
                                      const originalLength = (newAssignments[dateKey][deptId] || []).length;
                                       newAssignments[dateKey][deptId] = (newAssignments[dateKey][deptId] || []).filter((a: any) => a.employee.id !== itemToDelete.id);
                                       if (newAssignments[dateKey][deptId].length === 0) {
                                           delete newAssignments[dateKey][deptId];
                                           templateChanged = true;
                                       } else if (newAssignments[dateKey][deptId].length < originalLength) {
                                           templateChanged = true;
                                       }
                                   });
                                   // If day in template becomes empty, remove it
                                    if (Object.keys(newAssignments[dateKey]).length === 0) {
                                       delete newAssignments[dateKey];
                                        templateChanged = true;
                                    }
                               });
                           }
                           // If template becomes empty, mark for filtering
                            if (Object.keys(newAssignments).length === 0) {
                                return null;
                            }
                           return templateChanged ? { ...t, assignments: newAssignments } : t;
                       }).filter(t => t !== null) as ShiftTemplate[];
                      setSavedTemplates(updatedTemplatesEmp);
                     message = `Colaborador "${itemToDelete.name}" eliminado.`;
                     break;
                  case 'template':
                      // Ensure savedTemplates is an array before filtering
                      const currentTemplates = Array.isArray(savedTemplates) ? savedTemplates : [];
                      const updatedTemplates = currentTemplates.filter(t => t.id !== itemToDelete.id);
                      setSavedTemplates(updatedTemplates);
                      message = `Template "${itemToDelete.name}" eliminado.`;
                     break;
             }
             toast({ title: 'Elemento Eliminado', description: message, variant: 'destructive' });
         } catch (error) {
              console.error(`Error deleting item type ${itemToDelete.type}:`, error);
              toast({ title: 'Error al Eliminar', description: 'No se pudo completar la eliminación.', variant: 'destructive' });
         } finally {
             setItemToDelete(null);
         }
     };


     const handlePreviousWeek = () => {
        setCurrentDate(prevDate => subWeeks(prevDate, 1));
     };

     const handleNextWeek = () => {
        setCurrentDate(prevDate => addWeeks(prevDate, 1));
     };

    const handleSaveSchedule = () => {
         // Saving happens automatically via useEffect listening to scheduleData
        toast({ title: 'Horario Guardado', description: 'Los cambios en el horario se guardan automáticamente.' });
    };


     const handleDuplicateDay = (sourceDate: Date) => {
         const sourceDayKey = format(sourceDate, 'yyyy-MM-dd');
         const nextDayDate = addDays(sourceDate, 1);
         const nextDayKey = format(nextDayDate, 'yyyy-MM-dd');
         const sourceSchedule = scheduleData[sourceDayKey];

         if (!sourceSchedule || Object.keys(sourceSchedule.assignments).length === 0 || Object.values(sourceSchedule.assignments).every(dept => dept.length === 0)) {
             toast({ title: 'Nada que Duplicar', description: `No hay turnos asignados para el ${format(sourceDate, 'PPP', { locale: es })}.`, variant: 'default' }); // Changed variant
             return;
         }

         // Deep clone assignments and generate new IDs
         const duplicatedAssignments = JSON.parse(JSON.stringify(sourceSchedule.assignments));
         Object.keys(duplicatedAssignments).forEach(deptId => {
             duplicatedAssignments[deptId].forEach((assign: ShiftAssignment) => {
                 // Generate new unique ID for the duplicated shift
                 assign.id = `shift_${assign.employee.id}_${nextDayKey}_${assign.startTime.replace(':', '')}_${Math.random().toString(36).substring(2, 7)}`;
                 // Ensure employee object is present (though cloning should preserve it)
                  const fullEmployee = employees.find(emp => emp.id === assign.employee.id);
                  if (fullEmployee) {
                      assign.employee = fullEmployee;
                  } else {
                       console.warn(`Employee ${assign.employee.id} not found during duplication.`);
                       // Assign a placeholder to avoid errors, though this indicates data inconsistency
                       assign.employee = { id: assign.employee.id, name: `(ID: ${assign.employee.id})`, primaryLocationId: '' };
                  }
             });
         });

         setScheduleData(prevData => ({
             ...prevData,
             [nextDayKey]: {
                 date: nextDayDate,
                 assignments: duplicatedAssignments,
             },
         }));

         if (viewMode === 'day') {
             setTargetDate(nextDayDate);
             // setCurrentDate(nextDayDate); // If you want the main calendar to advance too
         }

         toast({ title: 'Horario Duplicado', description: `El horario del ${format(sourceDate, 'dd/MM')} se duplicó al ${format(nextDayDate, 'dd/MM')}.` });
     };


     const handleConfirmClearDay = (dateToClear: Date) => {
         setClearingDate(dateToClear);
     };

     const handleClearDay = () => {
         if (!clearingDate) return;
         const dateKey = format(clearingDate, 'yyyy-MM-dd');

         setScheduleData(prevData => {
             const updatedData = { ...prevData };
             // Remove the assignments for the day, but keep the date entry? Or remove the entry?
             // Let's just clear the assignments.
             if (updatedData[dateKey]) {
                 updatedData[dateKey].assignments = {}; // Clear assignments
             }
             // If you want to remove the date entry entirely: delete updatedData[dateKey];
             return updatedData;
         });
         setClearingDate(null);
         toast({ title: 'Horario Limpiado', description: `Se eliminaron todos los turnos para el ${format(clearingDate, 'PPP', { locale: es })}.`, variant: 'destructive' });
     };


     const handleOpenTemplateModal = () => {
         let hasAssignments = false;
         if (viewMode === 'day') {
             const currentDayKey = format(targetDate, 'yyyy-MM-dd');
             const currentSchedule = scheduleData[currentDayKey];
             hasAssignments = !!currentSchedule && Object.keys(currentSchedule.assignments).length > 0 && Object.values(currentSchedule.assignments).some(dept => dept.length > 0);
         } else { // Week view
             hasAssignments = weekDates.some(date => {
                 const dayKey = format(date, 'yyyy-MM-dd');
                 const daySchedule = scheduleData[dayKey];
                 return !!daySchedule && Object.keys(daySchedule.assignments).length > 0 && Object.values(daySchedule.assignments).some(dept => dept.length > 0);
             });
         }

         if (!hasAssignments) {
             const contextDescription = viewMode === 'day' ? `el ${format(targetDate, 'PPP', { locale: es })}` : 'la semana actual';
             toast({ title: 'Template Vacío', description: `No hay turnos asignados en ${contextDescription} para guardar como template.`, variant: 'default' }); // Changed variant
             return;
         }

         setTemplateName('');
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
             const cleanedAssignments: DailyAssignments = {}; // Use DailyAssignments type
             let dayHasData = false;
             Object.keys(currentAssignmentsRaw).forEach(deptId => {
                  if (currentAssignmentsRaw[deptId]?.length > 0) {
                     cleanedAssignments[deptId] = currentAssignmentsRaw[deptId].map(({ id, employee, ...rest }) => ({
                          ...rest,
                          employee: { id: employee.id } // Only store employee ID
                     }));
                     dayHasData = true;
                  }
             });
             templateAssignments = cleanedAssignments;

             if (!dayHasData) {
                  toast({ title: 'Template Vacío', description: 'No hay turnos para guardar.', variant: 'default' }); // Changed variant
                  setIsTemplateModalOpen(false);
                  return;
             }
         } else { // Weekly template
             templateAssignments = {}; // Initialize as WeeklyAssignments type implicitly
             let weekHasAssignments = false;
             weekDates.forEach(date => {
                 const dateKey = format(date, 'yyyy-MM-dd');
                 const dailyAssignmentsRaw = scheduleData[dateKey]?.assignments || {};
                 const cleanedDailyAssignments: DailyAssignments = {}; // Use DailyAssignments type
                 let dayHasData = false;
                 Object.keys(dailyAssignmentsRaw).forEach(deptId => {
                      if (dailyAssignmentsRaw[deptId]?.length > 0) {
                         cleanedDailyAssignments[deptId] = dailyAssignmentsRaw[deptId].map(({ id, employee, ...rest }) => ({
                             ...rest,
                             employee: { id: employee.id } // Only store employee ID
                         }));
                         dayHasData = true;
                         weekHasAssignments = true;
                      }
                 });
                 if (dayHasData) {
                      (templateAssignments as WeeklyAssignments)[dateKey] = cleanedDailyAssignments; // Add day's assignments
                 }
             });

             if (!weekHasAssignments) {
                 toast({ title: 'Template Vacío', description: 'No hay turnos en la semana para guardar.', variant: 'default' }); // Changed variant
                 setIsTemplateModalOpen(false);
                 return;
             }
         }

         const newTemplate: ShiftTemplate = {
             id: `tpl-${Date.now()}`, // Use timestamp for simple unique ID
             name: templateName.trim(),
             locationId: selectedLocationId,
             type: templateType,
             assignments: templateAssignments,
             createdAt: new Date().toISOString(),
         };

         // Ensure savedTemplates is an array before spreading
         setSavedTemplates(prev => [...(Array.isArray(prev) ? prev : []), newTemplate]);
         toast({ title: 'Template Guardado', description: `El template "${newTemplate.name}" (${templateType === 'daily' ? 'Diario' : 'Semanal'}) se ha guardado.` });
         setIsTemplateModalOpen(false);
         setTemplateName('');
     };


    const handleLoadTemplate = (templateId: string) => {
        if (typeof window === 'undefined') {
            return;
        }
        // Ensure savedTemplates is an array before finding
        const templatesArray = Array.isArray(savedTemplates) ? savedTemplates : [];
        const templateToLoad = templatesArray.find((t: any) => t.id === templateId);
        console.log("Attempting to load template:", templateToLoad); // Log template to load

        if (!templateToLoad) {
            toast({ title: 'Template no encontrado', variant: 'destructive' });
            return;
        }
        if (templateToLoad.locationId !== selectedLocationId) {
            toast({
                title: 'Sede Incorrecta',
                description: `El template "${templateToLoad.name}" pertenece a otra sede. Cambia de sede para cargarlo.`,
                variant: 'destructive',
            });
            return;
        }
        // Check if template type matches current view mode
        if (templateToLoad.type !== viewMode) {
            const requiredView = templateToLoad.type === 'daily' ? 'diaria' : 'semanal';
            toast({
                title: 'Vista Incorrecta',
                description: `El template "${templateToLoad.name}" es ${templateToLoad.type === 'daily' ? 'diario' : 'semanal'}. Cambia a la vista ${requiredView} para cargarlo.`,
                variant: 'destructive',
            });
            return;
        }

        let updatedScheduleData = { ...scheduleData };
        let successMessage = '';

        try {
            console.log(`Loading ${templateToLoad.type} template...`); // Log type
            if (templateToLoad.type === 'daily') {
                const loadTargetDate = targetDate;
                const dateKey = format(loadTargetDate, 'yyyy-MM-dd');
                const loadedAssignments: { [deptId: string]: ShiftAssignment[] } = {};

                console.log("Daily template assignments:", templateToLoad.assignments); // Log daily assignments

                Object.keys(templateToLoad.assignments).forEach(deptId => {
                    // Ensure assignments[deptId] is an array before mapping
                    const assignmentsForDept = (templateToLoad.assignments as DailyAssignments)[deptId];
                    if (Array.isArray(assignmentsForDept)) {
                        loadedAssignments[deptId] = assignmentsForDept
                            .map((assignTemplate: Omit<ShiftAssignment, 'id'> & { employee: { id: string } }) => {
                                const employee = employees.find(emp => emp.id === assignTemplate.employee.id);
                                if (employee) {
                                    const newAssignId = `shift_${employee.id}_${dateKey}_${assignTemplate.startTime.replace(':', '')}_${Math.random().toString(36).substring(2, 7)}`;
                                    return {
                                        ...assignTemplate,
                                        id: newAssignId,
                                        employee: employee,
                                    };
                                }
                                console.warn(`Employee ID ${assignTemplate.employee.id} not found while loading daily template. Skipping assignment.`);
                                return null;
                            })
                            .filter((a): a is ShiftAssignment => a !== null);
                    } else {
                        console.warn(`Assignments for department ${deptId} in daily template ${templateId} is not an array.`);
                    }
                });

                // Overwrite the assignments for the target date
                updatedScheduleData[dateKey] = {
                     date: loadTargetDate,
                     assignments: loadedAssignments,
                };
                console.log(`Updated schedule data for ${dateKey}:`, updatedScheduleData[dateKey]); // Log updated data

                successMessage = `Se cargó el template "${templateToLoad.name}" para ${format(loadTargetDate, 'PPP', { locale: es })}.`;

            } else { // Weekly template
                console.log("Weekly template assignments:", templateToLoad.assignments); // Log weekly assignments
                // Clear the assignments for the current week before loading the template
                weekDates.forEach(date => {
                    const dateKey = format(date, 'yyyy-MM-dd');
                    // Initialize or reset the day's data ensuring date is kept
                    updatedScheduleData[dateKey] = { ...updatedScheduleData[dateKey], date: date, assignments: {} };
                });

                // Load assignments from the template
                Object.keys(templateToLoad.assignments).forEach(sourceDateKey => {
                    const templateDate = parseISO(sourceDateKey);
                    console.log(`Processing date from template: ${sourceDateKey}, Parsed: ${templateDate}`); // Log date processing
                    // Find the corresponding date object in the current weekDates array based on day matching
                    const targetWeekDate = weekDates.find(weekDate => format(weekDate, 'yyyy-MM-dd') === sourceDateKey); // Direct date match

                    if (isValid(templateDate) && targetWeekDate) {
                         console.log(`Date ${sourceDateKey} is valid and within the current week.`); // Log valid date
                         const targetDateKey = format(targetWeekDate, 'yyyy-MM-dd'); // Use the actual key for the target week
                        const dailyAssignmentsFromTemplate = (templateToLoad.assignments as WeeklyAssignments)[sourceDateKey] || {};
                        const loadedDailyAssignments: { [deptId: string]: ShiftAssignment[] } = {};

                        Object.keys(dailyAssignmentsFromTemplate).forEach(deptId => {
                            // Ensure assignmentsForDept is an array before mapping
                             const assignmentsForDept = dailyAssignmentsFromTemplate[deptId];
                             if (Array.isArray(assignmentsForDept)) {
                                loadedDailyAssignments[deptId] = assignmentsForDept
                                    .map((assignTemplate: Omit<ShiftAssignment, 'id'> & { employee: { id: string } }) => {
                                        const employee = employees.find(emp => emp.id === assignTemplate.employee.id);
                                        if (employee) {
                                            // Use the targetDateKey for generating the ID
                                            const newAssignId = `shift_${employee.id}_${targetDateKey}_${assignTemplate.startTime.replace(':', '')}_${Math.random().toString(36).substring(2, 7)}`;
                                            return {
                                                ...assignTemplate,
                                                id: newAssignId,
                                                employee: employee,
                                            };
                                        }
                                        console.warn(`Employee ID ${assignTemplate.employee.id} not found while loading weekly template for ${sourceDateKey}. Skipping assignment.`);
                                        return null;
                                    })
                                    .filter((a): a is ShiftAssignment => a !== null);
                            } else {
                                 console.warn(`Assignments for department ${deptId} in weekly template ${templateId} for date ${sourceDateKey} is not an array.`);
                             }
                        });

                        // Use the targetDateKey to update the scheduleData
                        updatedScheduleData[targetDateKey] = {
                           ...updatedScheduleData[targetDateKey], // Keep existing date object
                           assignments: loadedDailyAssignments
                        };
                        console.log(`Updated schedule data for ${targetDateKey}:`, updatedScheduleData[targetDateKey]); // Log update for the specific day

                    } else {
                        console.warn(`Date key ${sourceDateKey} from template is invalid or not in current week. Skipping.`);
                    }
                });
                successMessage = `Se cargó el template semanal "${templateToLoad.name}" en la semana actual.`;
            }


             setScheduleData(updatedScheduleData);
             toast({ title: 'Template Cargado', description: successMessage });
             setIsConfigModalOpen(false); // Close config modal after loading
         } catch (error) {
             console.error("Error loading template:", error);
             toast({ title: 'Error al Cargar Template', description: 'No se pudo cargar el template seleccionado.', variant: 'destructive' });
         }
     };



    const isHoliday = useCallback((date: Date | null | undefined): boolean => {
        if (!date || !isValid(date)) return false;
        const dateStr = format(date, 'yyyy-MM-dd');
        return holidaySet.has(dateStr);
    }, [holidaySet]);

    const handleNotesChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setNotes(event.target.value);
    };

    const handleSaveNotes = () => {
        // Saving happens via useEffect
        toast({ title: 'Notas Guardadas', description: 'Tus notas han sido guardadas localmente.' });
    };

    const DndWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
        // Disable DndContext entirely if on mobile
        if (isMobile) {
            return <>{children}</>;
        }
        return (
            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                {children}
            </DndContext>
        );
    };

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

        weekDates.forEach(date => {
            const dateKey = format(date, 'yyyy-MM-dd');
            const daySchedule = scheduleData[dateKey]; // Use scheduleData state

            if (daySchedule) {
                Object.entries(daySchedule.assignments).forEach(([deptId, assignments]) => {
                    const department = departments.find(d => d.id === deptId);
                    assignments.forEach(assignment => {
                         // Find the full employee object to get the name
                         const employee = employees.find(emp => emp.id === assignment.employee.id);
                         if (!employee) return; // Skip if employee not found (shouldn't happen ideally)

                        const durationHours = calculateShiftDuration(assignment, date);
                        dataToExport.push([
                            employee.id,
                            employee.name,
                            dateKey,
                            department?.name || deptId,
                            formatTo12Hour(assignment.startTime),
                            formatTo12Hour(assignment.endTime),
                            assignment.includeBreak ? 'Sí' : 'No',
                            assignment.includeBreak && assignment.breakStartTime ? formatTo12Hour(assignment.breakStartTime) : '',
                            assignment.includeBreak && assignment.breakEndTime ? formatTo12Hour(assignment.breakEndTime) : '',
                            durationHours.toFixed(2),
                        ]);
                    });
                });
            }
        });


        if (dataToExport.length <= 1) {
            toast({ title: 'Sin Datos', description: 'No hay turnos asignados en la semana actual para exportar.', variant: 'default' });
            return;
        }

        const csvContent = "data:text/csv;charset=utf-8,"
             // Escape commas within fields if necessary (e.g., in names or departments)
            + dataToExport.map(row =>
                 row.map((field: string | number | undefined) =>
                    `"${String(field ?? '').replace(/"/g, '""')}"` // Quote fields and escape double quotes
                 ).join(",")
             ).join("\n");


        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        const locationNameSafe = locations.find(l => l.id === selectedLocationId)?.name.replace(/[^a-zA-Z0-9]/g, '_') || selectedLocationId;
        const weekStartFormatted = format(weekDates[0], 'yyyyMMdd');
        const weekEndFormatted = format(weekDates[6], 'yyyyMMdd');
        link.setAttribute("download", `Horario_${locationNameSafe}_${weekStartFormatted}-${weekEndFormatted}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({ title: 'Exportación CSV Exitosa', description: 'Se ha descargado el archivo de horas trabajadas.' });
    };

    const handleExportPDF = () => {
        const locationName = locations.find(l => l.id === selectedLocationId)?.name || selectedLocationId;
        // Ensure getScheduleForDate uses the latest state by passing it implicitly or explicitly
        const dataForPDF = {
            locationName,
            weekDates,
            departments: filteredDepartments,
            employees: employees, // Pass the full employee list for potential lookups inside exporter
            scheduleData,
            getScheduleForDate: (date: Date) => getScheduleForDate(date), // Pass the callback using current state
            calculateShiftDuration,
        };

        try {
            exportScheduleToPDF(dataForPDF);
            toast({ title: 'Exportación PDF Exitosa', description: 'Se ha descargado el horario semanal.' });
        } catch (error) {
            console.error("Error exporting schedule to PDF:", error);
            toast({ title: 'Error al Exportar PDF', description: 'No se pudo generar el archivo PDF.', variant: 'destructive' });
        }
    };


     const handleShareSchedule = async () => {
        let textToCopy = "";
        const locationName = locations.find(l => l.id === selectedLocationId)?.name || selectedLocationId;

        if (viewMode === 'day') {
            const dateStr = format(targetDate, 'EEEE dd \'de\' MMMM', { locale: es });
            textToCopy = `*Horario ${locationName} - ${dateStr}*\n\n`;
            const daySchedule = getScheduleForDate(targetDate); // Use the state-aware getter
            let dayHasAssignments = false; // Track if any assignments exist for the day

            filteredDepartments.forEach(dept => {
                const assignments = daySchedule.assignments[dept.id] || [];
                if (assignments.length > 0) {
                    dayHasAssignments = true; // Mark day as having assignments
                    textToCopy += `*${dept.name}*\n`;
                    assignments.forEach(a => {
                         // Ensure employee name is available
                         const employeeName = a.employee?.name || `(ID: ${a.employee?.id || '??'})`;
                        textToCopy += `- ${employeeName}: ${formatTo12Hour(a.startTime)} - ${formatTo12Hour(a.endTime)}`;
                        if (a.includeBreak && a.breakStartTime && a.breakEndTime) {
                             textToCopy += ` (D: ${formatTo12Hour(a.breakStartTime)}-${formatTo12Hour(a.breakEndTime)})`;
                        }
                        textToCopy += "\n";
                    });
                    textToCopy += "\n";
                }
            });
             // Handle case where day has no assignments
             if (!dayHasAssignments) {
                 textToCopy += "_No hay turnos asignados para este día._\n";
             }

        } else { // Week view
            const weekStartFormatted = format(weekDates[0], 'dd MMM', { locale: es });
            const weekEndFormatted = format(weekDates[6], 'dd MMM yyyy', { locale: es });
            textToCopy = `*Horario ${locationName} - Semana ${weekStartFormatted} al ${weekEndFormatted}*\n\n`;
            let weekHasAssignments = false; // Track if the whole week has assignments

            weekDates.forEach(date => {
                const dateStr = format(date, 'EEEE dd', { locale: es });
                const daySchedule = getScheduleForDate(date); // Use the state-aware getter
                let dayHasAssignments = false;
                let dayText = `*${dateStr.charAt(0).toUpperCase() + dateStr.slice(1)}:*\n`;

                filteredDepartments.forEach(dept => {
                     const assignments = daySchedule.assignments[dept.id] || [];
                     if (assignments.length > 0) {
                         dayHasAssignments = true;
                         weekHasAssignments = true; // Mark week as having assignments
                         dayText += `_${dept.name}_\n`;
                         assignments.forEach(a => {
                              // Ensure employee name is available
                              const employeeName = a.employee?.name || `(ID: ${a.employee?.id || '??'})`;
                             dayText += `- ${employeeName}: ${formatTo12Hour(a.startTime)} - ${formatTo12Hour(a.endTime)}`;
                            if (a.includeBreak && a.breakStartTime && a.breakEndTime) {
                                dayText += ` (D: ${formatTo12Hour(a.breakStartTime)}-${formatTo12Hour(a.breakEndTime)})`;
                            }
                             dayText += "\n";
                         });
                     }
                });

                 // Add day's text only if it had assignments
                if (dayHasAssignments) {
                    textToCopy += dayText + "\n";
                } else {
                    // Optionally indicate days with no shifts
                    // textToCopy += `*${dateStr.charAt(0).toUpperCase() + dateStr.slice(1)}:*\n_Sin turnos_\n\n`;
                }
            });
             // Handle case where the entire week has no assignments
             if (!weekHasAssignments) {
                 textToCopy += "_No hay turnos asignados para esta semana._\n";
             }
        }

         // Final check if any meaningful content was generated
        if (!textToCopy || textToCopy.trim() === `*Horario ${locationName} - Semana ${format(weekDates[0], 'dd MMM', { locale: es })} al ${format(weekDates[6], 'dd MMM yyyy', { locale: es })}*` || textToCopy.includes("_No hay turnos asignados")) {
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
        <main className="container mx-auto p-4 md:p-8 max-w-full">
             {/* Title - Removed specific styling, rely on global/Tailwind */}
             <div className="text-center mb-8">
                 <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                    Planificador de Horarios
                 </h1>
                 <p className="text-muted-foreground mt-2">Gestiona turnos, sedes y colaboradores</p>
             </div>


              {/* Controls Section - Removed Card wrapper */}
             <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 mb-8 p-4 bg-transparent"> {/* Made background transparent */}
                 {/* Location Selector */}
                 <div className="flex items-center gap-2">
                     <LocationSelector
                         locations={locations}
                         selectedLocationId={selectedLocationId}
                         onLocationChange={handleLocationChange}
                     />
                 </div>

                 {/* Configuration Button */}
                  <div className="flex items-center gap-2">
                      <Dialog open={isConfigModalOpen} onOpenChange={setIsConfigModalOpen}>
                          <DialogTrigger asChild>
                              <Button variant="outline" size="icon" title="Configuración">
                                  <Settings className="h-5 w-5"/> {/* Standard icon size */}
                                  <span className="sr-only">Configuración</span>
                              </Button>
                          </DialogTrigger>
                         <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
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
                                                         <AlertDialogContent>
                                                             <AlertDialogHeader>
                                                                 <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                                                 <AlertDialogDescription>
                                                                     Eliminar Sede "{itemToDelete?.name}"? Se eliminarán los departamentos, colaboradores (se desvincularán de la sede) y templates asociados. Los turnos existentes se mantendrán pero desvinculados de la sede eliminada. Esta acción no se puede deshacer.
                                                                 </AlertDialogDescription>
                                                             </AlertDialogHeader>
                                                             <AlertDialogFooter>
                                                                 <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancelar</AlertDialogCancel>
                                                                 <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDeleteItem}>Eliminar</AlertDialogAction>
                                                             </AlertDialogFooter>
                                                         </AlertDialogContent>
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
                                                         <AlertDialogContent>
                                                             <AlertDialogHeader>
                                                                 <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                                                 <AlertDialogDescription>
                                                                     Eliminar Departamento "{itemToDelete?.name}"? Se eliminarán los turnos asociados en los horarios y templates. Esta acción no se puede deshacer.
                                                                 </AlertDialogDescription>
                                                             </AlertDialogHeader>
                                                             <AlertDialogFooter>
                                                                 <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancelar</AlertDialogCancel>
                                                                 <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDeleteItem}>Eliminar</AlertDialogAction>
                                                             </AlertDialogFooter>
                                                         </AlertDialogContent>
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
                                                         <AlertDialogContent>
                                                             <AlertDialogHeader>
                                                                 <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                                                 <AlertDialogDescription>
                                                                     Eliminar Colaborador "{itemToDelete?.name}"? Se eliminarán sus turnos asociados en horarios y templates. Esta acción no se puede deshacer.
                                                                 </AlertDialogDescription>
                                                             </AlertDialogHeader>
                                                             <AlertDialogFooter>
                                                                 <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancelar</AlertDialogCancel>
                                                                 <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDeleteItem}>Eliminar</AlertDialogAction>
                                                             </AlertDialogFooter>
                                                         </AlertDialogContent>
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
                                         {/* Button to save current view as template */}
                                         <Button
                                             variant="outline"
                                             size="sm"
                                             onClick={handleOpenTemplateModal}
                                             title={`Guardar horario actual como template ${viewMode === 'day' ? 'diario' : 'semanal'}`}
                                         >
                                             <Download className="h-4 w-4" />
                                         </Button>
                                     </div>
                                     <ul className="space-y-2 text-sm">
                                         {filteredTemplates.length > 0 ? filteredTemplates.map((template) => (
                                             <li key={template.id} className="flex items-center justify-between group py-1 border-b">
                                                 <span className="truncate text-muted-foreground">{template.name}</span>
                                                 <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
                                                      {/* Load Template Button */}
                                                     <Button
                                                         variant="ghost"
                                                         size="icon"
                                                         className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                                         onClick={() => handleLoadTemplate(template.id)}
                                                         title={`Cargar Template (${template.type === 'daily' ? 'Diario' : 'Semanal'})`}
                                                         // Removed explicit disabled prop
                                                     >
                                                         <Upload className="h-4 w-4" />
                                                     </Button>
                                                     <AlertDialog>
                                                         <AlertDialogTrigger asChild>
                                                             <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => confirmDeleteItem('template', template.id, template.name)} title="Eliminar Template"><Trash2 className="h-4 w-4" /></Button>
                                                         </AlertDialogTrigger>
                                                         <AlertDialogContent>
                                                             <AlertDialogHeader>
                                                                 <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                                                 <AlertDialogDescription>
                                                                     Eliminar Template "{itemToDelete?.name}"? Esta acción no se puede deshacer.
                                                                 </AlertDialogDescription>
                                                             </AlertDialogHeader>
                                                             <AlertDialogFooter>
                                                                 <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancelar</AlertDialogCancel>
                                                                 <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDeleteItem}>Eliminar</AlertDialogAction>
                                                             </AlertDialogFooter>
                                                         </AlertDialogContent>
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
                     <div className="flex items-center gap-2">
                         <Popover>
                             <PopoverTrigger asChild>
                                 <Button
                                     variant={'outline'}
                                     className={cn(
                                         'w-[240px] sm:w-[280px] justify-start text-left font-normal', // Adjusted width for better fit
                                         !targetDate && 'text-muted-foreground',
                                         isHoliday(targetDate) && 'border-primary' // Highlight border only
                                     )}
                                     disabled={isCheckingHoliday}
                                 >
                                     {isCheckingHoliday ? (
                                         <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                     ) : (
                                         <CalendarModernIcon className="mr-2 h-4 w-4 text-primary" />
                                     )}
                                     {targetDate ? format(targetDate, 'PPPP', { locale: es }) : <span>Selecciona fecha</span>}
                                     {isHoliday(targetDate) && !isCheckingHoliday && <span className="ml-2 text-xs font-semibold text-primary">(Festivo)</span>}
                                 </Button>
                             </PopoverTrigger>
                             <PopoverContent className="w-auto p-0">
                                 <Calendar
                                     mode="single"
                                     selected={targetDate}
                                     onSelect={(date) => { if (date) setTargetDate(date) }}
                                     initialFocus
                                     locale={es}
                                     modifiers={{ holiday: (date) => isHoliday(date) }}
                                     modifiersClassNames={{
                                          holiday: 'text-primary font-semibold border border-primary rounded-md',
                                     }}
                                 />
                             </PopoverContent>
                         </Popover>
                     </div>
                 )}

                 {/* --- Week View Navigator --- */}
                 {viewMode === 'week' && (
                     <div className="flex items-center gap-2">
                         <WeekNavigator
                             currentDate={currentDate}
                             onPreviousWeek={handlePreviousWeek}
                             onNextWeek={handleNextWeek}
                         />
                     </div>
                 )}

                 {/* View Mode Toggle */}
                 <div className="flex items-center gap-2">
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
             </div> {/* End Controls Section */}


              {/* Main content grid */}
             <DndWrapper>
                 <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mb-6">

                     {/* --- Available Employees --- */}
                      <div className="lg:col-span-2 space-y-6">
                          <EmployeeList employees={availableEmployees} />
                     </div>

                     {/* --- Schedule View --- */}
                     <div className="lg:col-span-10 overflow-x-auto">
                         <ScheduleView
                            departments={filteredDepartments}
                            scheduleData={scheduleData}
                            onRemoveShift={handleRemoveShift}
                            viewMode={viewMode}
                            weekDates={weekDates}
                            currentDate={targetDate} // Pass targetDate for day view consistency
                            onAddShiftRequest={handleOpenEmployeeSelectionModal}
                            onShiftClick={handleShiftClick}
                            getScheduleForDate={getScheduleForDate}
                            onDuplicateDay={handleDuplicateDay}
                            onClearDay={handleConfirmClearDay}
                            isHoliday={isHoliday}
                        />
                     </div>
                 </div>
             </DndWrapper>

              {/* --- Actions Row (Moved Below Schedule) --- */}
             <div className="flex flex-wrap justify-end gap-2 mt-6">
                 {/* Share Button */}
                 <Button onClick={handleShareSchedule} variant="outline" className="hover:bg-primary hover:text-primary-foreground">
                     <Share2 className="mr-2 h-4 w-4" /> Compartir (Texto)
                 </Button>
                  {/* PDF Export */}
                 <Button onClick={handleExportPDF} variant="outline" className="hover:bg-destructive hover:text-destructive-foreground">
                     <FileDown className="mr-2 h-4 w-4" /> PDF
                 </Button>
                  {/* CSV Export */}
                 <Button onClick={handleExportCSV} variant="outline" className="hover:bg-green-500 hover:text-white">
                     <FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar Horas (CSV)
                 </Button>
                 {/* Save as Template Button */}
                 <Button
                    variant="outline"
                    onClick={handleOpenTemplateModal}
                    title={`Guardar horario actual como template ${viewMode === 'day' ? 'diario' : 'semanal'}`}
                 >
                    <Download className="mr-2 h-4 w-4" /> Guardar Template
                 </Button>
                 {/* Save Schedule Button */}
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
                          <Input id="location-name" value={locationFormData.name} onChange={(e) => setLocationFormData({ name: e.target.value })} placeholder="Nombre de la Sede" />
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
                             <Input id="department-name" value={departmentFormData.name} onChange={(e) => setDepartmentFormData(prev => ({ ...prev, name: e.target.value }))} placeholder="Nombre del Departamento"/>
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
                          {/* Icon Selector */}
                          <div>
                              <Label htmlFor="department-icon">Icono (Opcional)</Label>
                              <Select value={departmentFormData.iconName} onValueChange={(value) => setDepartmentFormData(prev => ({ ...prev, iconName: value }))}>
                                  <SelectTrigger id="department-icon">
                                      <SelectValue placeholder="Selecciona icono" />
                                  </SelectTrigger>
                                  <SelectContent>
                                      {Object.keys(iconMap).map(iconKey => {
                                          const IconComponent = iconMap[iconKey];
                                          return (
                                              <SelectItem key={iconKey} value={iconKey}>
                                                  <span className="flex items-center gap-2">
                                                      <IconComponent className="h-4 w-4" /> {iconKey}
                                                  </span>
                                              </SelectItem>
                                          );
                                      })}
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
                             <Input id="employee-name" value={employeeFormData.name} onChange={(e) => setEmployeeFormData(prev => ({ ...prev, name: e.target.value }))} placeholder="Nombre Completo" />
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
                 employees={availableEmployees}
                 onSelectEmployee={handleEmployeeSelectedForShift}
                 departmentName={departments.find(d => d.id === shiftRequestContext?.departmentId)?.name || ''}
                 date={shiftRequestContext?.date || new Date()}
             />

             {/* Shift Detail Modal */}
             <ShiftDetailModal
                 isOpen={isShiftModalOpen}
                 onClose={() => {
                     setIsShiftModalOpen(false);
                     setSelectedEmployee(null);
                     setShiftRequestContext(null);
                     setEditingShift(null);
                 }}
                 onSave={handleAddOrUpdateShift}
                 employeeName={selectedEmployee?.name || ''}
                 departmentName={departments.find(d => d.id === shiftRequestContext?.departmentId)?.name || ''}
                 initialDetails={editingShift?.assignment}
                 isEditing={!!editingShift}
             />

             {/* Universal Delete Confirmation */}
              <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
                  <AlertDialogContent>
                      <AlertDialogHeader>
                          <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                          <AlertDialogDescription>
                              {itemToDelete?.type === 'location' && `Eliminar Sede "${itemToDelete?.name}"? Se eliminarán sus departamentos, empleados asociados se desvincularán, y se borrarán templates y turnos relacionados. Esta acción no se puede deshacer.`}
                              {itemToDelete?.type === 'department' && `Eliminar Departamento "${itemToDelete?.name}"? Se eliminarán los turnos asociados en horarios y templates. Esta acción no se puede deshacer.`}
                              {itemToDelete?.type === 'employee' && `Eliminar Colaborador "${itemToDelete?.name}"? Se eliminarán sus turnos asociados en horarios y templates. Esta acción no se puede deshacer.`}
                              {itemToDelete?.type === 'template' && `Eliminar Template "${itemToDelete?.name}"? Esta acción no se puede deshacer.`}
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

            {/* Template Saving Modal */}
             <Dialog open={isTemplateModalOpen} onOpenChange={setIsTemplateModalOpen}>
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
