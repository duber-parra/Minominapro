// src/app/schedule/page.tsx
'use client'; // Ensure this directive is present

import React, { useState, useEffect, useCallback, useMemo, useRef, ChangeEvent } from 'react';
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
import { Plus, Trash2, Edit, ChevronsLeft, ChevronsRight, Calendar as CalendarModernIcon, Users, Building, Building2, MinusCircle, ChevronsUpDown, Settings, Save, CopyPlus, Library, Eraser, Download, Upload, FileX2, FileSpreadsheet, FileDown, PencilLine, Share2, Loader2, Check, FileUp, Copy, FileJson } from 'lucide-react'; // Added Copy icon, FileJson
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label'; // Import Label
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator'; // Import Separator
import { ScrollArea } from '@/components/ui/scroll-area'; // Import ScrollArea
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
} from "@/components/ui/alert-dialog"; // Import AlertDialog components
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose, DialogTrigger } from "@/components/ui/dialog"; // Import Dialog components
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";


import { LocationSelector } from '@/components/schedule/LocationSelector';
import { EmployeeList } from '@/components/schedule/EmployeeList';
import { ScheduleView } from '@/components/schedule/ScheduleView';
import { ShiftDetailModal } from '@/components/schedule/ShiftDetailModal';
import { WeekNavigator } from '@/components/schedule/WeekNavigator'; // Import WeekNavigator
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { EmployeeSelectionModal } from '@/components/schedule/EmployeeSelectionModal';

import type { Location, Department, Employee, ShiftAssignment, ScheduleData, ShiftTemplate, DailyAssignments, WeeklyAssignments } from '@/types/schedule';
import { startOfWeek, endOfWeek, addDays, format, addWeeks, subWeeks, parseISO, getYear, isValid, differenceInMinutes, parse as parseDateFnsInternal, isSameDay, isWithinInterval, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { getColombianHolidays } from '@/services/colombian-holidays';
import { exportScheduleToPDF } from '@/lib/schedule-pdf-exporter';
import { formatTo12Hour } from '@/lib/time-utils';
import { z } from 'zod';

// Helper to generate dates for the current week
const getWeekDates = (currentDate: Date): Date[] => {
  const start = startOfWeek(currentDate, { weekStartsOn: 1 }); // Start on Monday
  return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
};

// LocalStorage Keys
const SCHEDULE_DATA_KEY = 'schedulePlannerData';
const SCHEDULE_TEMPLATES_KEY = 'scheduleTemplates'; // Dedicated key for templates
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
  { id: '101', name: 'Carlos Pérez', locationIds: ['loc-1'] },
  { id: '102', name: 'Ana Rodriguez', locationIds: ['loc-1'] },
  { id: '201', name: 'Luis Gómez', locationIds: ['loc-2'] },
  { id: '202', name: 'Maria García', locationIds: ['loc-1', 'loc-2'] }, // Example multi-location employee
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
        // console.log(`[DEBUG loadFromLocalStorage] Raw data for key ${key}:`, savedData); // DEBUG Log

        // Handle notes specifically as a string
        if (key === SCHEDULE_NOTES_KEY) {
             // Directly return the string or default, no JSON parsing
             return savedData !== null ? (savedData as unknown as T) : defaultValue;
        }

        if (savedData) {
             const parsed = JSON.parse(savedData);
             // console.log(`[DEBUG loadFromLocalStorage] Parsed data for key ${key}:`, parsed); // DEBUG Log


             // Basic check for other array types
             if (key === LOCATIONS_KEY || key === EMPLOYEES_KEY || key === DEPARTMENTS_KEY) {
                 if (Array.isArray(parsed)) {
                      // Ensure employees have locationIds array
                       if (key === EMPLOYEES_KEY) {
                           return parsed.map((emp: any) => ({
                               ...emp,
                               locationIds: Array.isArray(emp.locationIds)
                                   ? emp.locationIds
                                   : (emp.primaryLocationId ? [emp.primaryLocationId] : []) // Convert old primaryLocationId
                           })) as T;
                       }
                      return parsed as T;
                 } else {
                     console.warn(`[loadFromLocalStorage] Expected array for key ${key}, but found:`, typeof parsed, ". Returning default.");
                     return defaultValue; // Return default if type mismatch
                 }
             } else if (key === SCHEDULE_DATA_KEY) {
                 // More complex types might need more checks, but for now assume it's okay if it parses
                 return parsed as T;
             } else {
                 // For unknown keys, just return the parsed data if it's not null/undefined
                 return parsed as T;
             }
        }
    } catch (error) {
        // More specific error handling for JSON parsing
         if (error instanceof SyntaxError) {
             console.error(`Error parsing JSON from localStorage for key ${key}:`, error.message, "Saved data:", localStorage.getItem(key)); // Log the problematic data
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
    // console.log(`[DEBUG loadFromLocalStorage] Returning default value for key ${key}.`); // DEBUG Log
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
                                     return { ...assign, employee: { id: assign.employee.id, name: `(ID: ${assign.employee.id})`, locationIds: [] } }; // Placeholder if employee not found
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

// --- NEW: Function to load Schedule Templates ---
const loadScheduleTemplates = (): ShiftTemplate[] => {
    if (typeof window === 'undefined') return [];
    try {
        const savedData = localStorage.getItem(SCHEDULE_TEMPLATES_KEY);
        if (!savedData || savedData === "null") {
            console.log("[Load Templates] No template data found in localStorage.");
            return [];
        }
        let parsedTemplates;
        try {
            parsedTemplates = JSON.parse(savedData);
        } catch (parseError) {
            console.error(`[Load Templates] Failed to parse JSON for key ${SCHEDULE_TEMPLATES_KEY}. Error:`, parseError, "Raw data:", savedData);
            return [];
        }

        if (Array.isArray(parsedTemplates)) {
             const validatedTemplates = parsedTemplates.map((template: any) => ({
                ...template,
                // Ensure createdAt exists, fallback to now if missing/invalid
                createdAt: template.createdAt && isValid(parseISO(template.createdAt)) ? template.createdAt : new Date().toISOString(),
                // Ensure assignments are correctly structured (basic check)
                assignments: typeof template.assignments === 'object' ? template.assignments : {}
             }));
            console.log("[Load Templates] Loaded and validated templates:", validatedTemplates);
            return validatedTemplates;
        } else {
            console.warn(`[Load Templates] Expected array for templates, found:`, typeof parsedTemplates, ". Returning empty array.");
            return [];
        }
    } catch (error) {
        console.error(`Error loading templates from localStorage:`, error);
        return [];
    }
};



// Define a Zod schema for basic CSV row validation
// Make Fecha optional for template mode
const csvRowSchema = z.object({
    ID_Empleado: z.string().min(1, "ID_Empleado es requerido"),
    Fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de Fecha debe ser AAAA-MM-DD").optional(), // Made optional
    Departamento: z.string().min(1, "Departamento es requerido"),
    Hora_Inicio: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Hora_Inicio formato inválido (HH:MM)"),
    Hora_Fin: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Hora_Fin formato inválido (HH:MM)"),
    Incluye_Descanso: z.string().optional(),
    Inicio_Descanso: z.string().optional(),
    Fin_Descanso: z.string().optional(),
}).refine(data => {
    const includesBreakRaw = data.Incluye_Descanso?.trim().toLowerCase();
    const includeBreakParsed = includesBreakRaw === 'sí' || includesBreakRaw === 'si' || includesBreakRaw === 'true' || includesBreakRaw === '1';
    if (includeBreakParsed) {
        const isBreakStartValid = data.Inicio_Descanso && /^([01]\d|2[0-3]):([0-5]\d)$/.test(data.Inicio_Descanso);
        const isBreakEndValid = data.Fin_Descanso && /^([01]\d|2[0-3]):([0-5]\d)$/.test(data.Fin_Descanso);
        if (!isBreakStartValid || !isBreakEndValid) return false; // Fail if break included but times invalid
        // Check if break end is after break start
        return data.Fin_Descanso > data.Inicio_Descanso;
    }
    return true;
}, {
    message: "Si Incluye_Descanso es Sí/True/1, Inicio_Descanso y Fin_Descanso son requeridos (HH:MM) y Fin debe ser mayor que Inicio.",
    path: ["Inicio_Descanso"],
});

type CsvRowData = z.infer<typeof csvRowSchema>;

// Define a Zod schema for the entire template file structure
const templateFileSchema = z.object({
    id: z.string(),
    name: z.string(),
    locationId: z.string(),
    type: z.enum(['daily', 'weekly']),
    assignments: z.record(z.any()), // Allow any structure for now, refine later if needed
    createdAt: z.string().datetime(), // Expect ISO date string
});


export default function SchedulePage() {
    // --- State Initialization ---
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'day' | 'week'>('week');
    const [locations, setLocations] = useState<Location[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [scheduleData, setScheduleData] = useState<{ [dateKey: string]: ScheduleData }>({});
    // Separate state for templates - NEW
    const [scheduleTemplates, setScheduleTemplates] = useState<ShiftTemplate[]>([]);
    const [notes, setNotes] = useState<string>("");
    const [selectedLocationId, setSelectedLocationId] = useState<string>('');

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
    // Initialize locationId in department form data based on initial selectedLocationId
    const [departmentFormData, setDepartmentFormData] = useState<{name: string, locationId: string, iconName?: string}>({ name: '', locationId: '', iconName: undefined });


    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
     // Initialize locationIds in employee form data based on initial selectedLocationId
    const [employeeFormData, setEmployeeFormData] = useState<{ id: string, name: string, locationIds: string[] }>({ id: '', name: '', locationIds: [] });


    const [itemToDelete, setItemToDelete] = useState<{ type: 'location' | 'department' | 'employee' | 'template'; id: string; name: string } | null>(null);

    // Modal for saving a NEW template
    const [isTemplateSaveModalOpen, setIsTemplateSaveModalOpen] = useState(false);
    const [templateName, setTemplateName] = useState('');
    // Separate state to control the visibility of the template loading section
    const [isTemplateLoadSectionOpen, setIsTemplateLoadSectionOpen] = useState(false); // New state


    const [clearingDate, setClearingDate] = useState<Date | null>(null);

    const [holidaySet, setHolidaySet] = useState<Set<string>>(new Set());
    const [isCheckingHoliday, setIsCheckingHoliday] = useState<boolean>(false);

    const fileInputRef = useRef<HTMLInputElement>(null); // Ref for CSV import
    const jsonInputRef = useRef<HTMLInputElement>(null); // Ref for JSON template import
    const [isImportingCSV, setIsImportingCSV] = useState<boolean>(false);
    const [isImportingJSON, setIsImportingJSON] = useState<boolean>(false);
    const [isClient, setIsClient] = useState(false);


    const isMobile = useIsMobile();
    const { toast } = useToast();

    // --- Load Data from localStorage on Mount (Client-side only) ---
    useEffect(() => {
        setIsClient(true); // Mark as client-side after mount
        // console.log("[DEBUG Load Effect] Starting to load data from localStorage..."); // DEBUG Log
        const loadedLocations = loadFromLocalStorage(LOCATIONS_KEY, initialLocations);
        const loadedDepts = loadDepartmentsFromLocalStorage(initialDepartments);
        const loadedEmps = loadFromLocalStorage(EMPLOYEES_KEY, initialEmployees);
        const loadedSched = loadScheduleDataFromLocalStorage(loadedEmps, {});
        // Load templates using the NEW separate function
        const loadedTemps = loadScheduleTemplates();
        const loadedNotesStr = loadFromLocalStorage(SCHEDULE_NOTES_KEY, defaultNotesText);

        setLocations(loadedLocations);
        setDepartments(loadedDepts);
        setEmployees(loadedEmps);
        setScheduleData(loadedSched);
        setScheduleTemplates(loadedTemps || []); // Set the loaded templates
        setNotes(loadedNotesStr);

        // Set initial selected location and update form defaults accordingly
        const initialSelectedLoc = loadedLocations.length > 0 ? loadedLocations[0].id : '';
        setSelectedLocationId(initialSelectedLoc);
        setDepartmentFormData(prev => ({ ...prev, locationId: initialSelectedLoc }));
        setEmployeeFormData(prev => ({ ...prev, locationIds: initialSelectedLoc ? [initialSelectedLoc] : [] }));

        // console.log("[DEBUG Load Effect] Finished loading data.", { locations: loadedLocations.length, departments: loadedDepts.length, employees: loadedEmps.length, templates: (loadedTemps || []).length }); // DEBUG Log

    }, []); // Empty dependency array ensures this runs only once on mount

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

     // --- Save Data to localStorage on Change ---
     useEffect(() => {
         if (isClient) {
             try { localStorage.setItem(LOCATIONS_KEY, JSON.stringify(locations)); }
             catch (e) { console.error("Error saving locations:", e); }
         }
     }, [locations, isClient]);

     useEffect(() => {
         if (isClient) {
             try {
                 const departmentsToSave = departments.map(({ icon, ...rest }) => ({
                    ...rest,
                    iconName: Object.keys(iconMap).find(key => iconMap[key] === icon)
                 }));
                 localStorage.setItem(DEPARTMENTS_KEY, JSON.stringify(departmentsToSave));
             }
             catch (e) { console.error("Error saving departments:", e); }
         }
     }, [departments, isClient]);

     useEffect(() => {
         if (isClient) {
             try { localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(employees)); }
             catch (e) { console.error("Error saving employees:", e); }
         }
     }, [employees, isClient]);

     useEffect(() => {
        if (isClient) {
            try {
                const dataToSave = JSON.parse(JSON.stringify(scheduleData));
                 Object.keys(dataToSave).forEach(key => {
                     if (dataToSave[key] && dataToSave[key].date instanceof Date) {
                         dataToSave[key].date = dataToSave[key].date.toISOString();
                     }
                     if (dataToSave[key] && dataToSave[key].assignments) {
                         Object.keys(dataToSave[key].assignments).forEach(deptId => {
                             dataToSave[key].assignments[deptId].forEach((assign: any) => {
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
    }, [scheduleData, isClient, toast]);

    useEffect(() => {
        if (isClient) {
            try {
                localStorage.setItem(SCHEDULE_NOTES_KEY, notes);
            } catch (error) {
                console.error("Error saving notes to localStorage:", error);
            }
        }
    }, [notes, isClient]);

     // UseEffect to save templates separately
     useEffect(() => {
         if (isClient) {
             try {
                 // Ensure scheduleTemplates is always an array
                 const templatesToSave = Array.isArray(scheduleTemplates) ? scheduleTemplates : [];
                 console.log("[Save Effect] Saving templates to localStorage:", templatesToSave); // Log before saving
                 localStorage.setItem(SCHEDULE_TEMPLATES_KEY, JSON.stringify(templatesToSave));
                 console.log("[Save Effect] Templates saved successfully."); // Log if saving succeeds
             } catch (error) {
                  console.error("Error saving templates to localStorage:", error);
                  toast({
                      title: 'Error al Guardar Templates',
                      description: 'No se pudieron guardar los templates localmente.',
                      variant: 'destructive',
                  });
             }
         }
     }, [scheduleTemplates, isClient, toast]); // Depend on scheduleTemplates state


    // ---- End LocalStorage Effects ---

    const weekDates = getWeekDates(currentDate);

    const getScheduleForDate = useCallback((date: Date): ScheduleData => {
        const key = format(date, 'yyyy-MM-dd');
        const dayData = scheduleData[key];
        const hydratedAssignments: { [departmentId: string]: ShiftAssignment[] } = {};

        if (dayData && dayData.assignments) {
             Object.keys(dayData.assignments).forEach(deptId => {
                 hydratedAssignments[deptId] = (dayData.assignments[deptId] || []).map(assign => {
                    const fullEmployee = employees.find(emp => emp.id === assign.employee?.id);
                    if (fullEmployee) {
                        return { ...assign, employee: fullEmployee };
                    } else {
                        console.warn(`Employee with ID ${assign.employee?.id || 'undefined'} not found for assignment ${assign.id}`);
                         return { ...assign, employee: { id: assign.employee?.id || 'unknown', name: `(ID: ${assign.employee?.id || '??'})`, locationIds: [] } };
                    }
                 }).filter(assign => assign !== null);
             });
        }
        return {
            date: date,
            assignments: hydratedAssignments
        };
    }, [scheduleData, employees]);


    const filteredEmployees = useMemo(() => employees.filter(emp =>
        Array.isArray(emp.locationIds) && emp.locationIds.includes(selectedLocationId)
    ), [employees, selectedLocationId]);

    const filteredDepartments = useMemo(() => departments.filter(dep => dep.locationId === selectedLocationId), [departments, selectedLocationId]);

    // Filter templates based on current location and view mode
    const filteredTemplates = useMemo(() => {
        // console.log("[DEBUG Filter Memo] All templates in state:", scheduleTemplates);
        // Ensure scheduleTemplates is always an array before filtering
        const templatesArray = Array.isArray(scheduleTemplates) ? scheduleTemplates : [];
        const filtered = templatesArray.filter(temp => {
             const locationMatch = temp.locationId === selectedLocationId;
             const typeMatch = temp.type === viewMode;
             // console.log(`[Filter Memo] Template ${temp.id} (${temp.name}): Loc Match=${locationMatch}, Type Match=${typeMatch}`);
             return locationMatch && typeMatch;
        });
        // console.log(`[DEBUG Filter Memo] Filtered templates for loc ${selectedLocationId}, view ${viewMode}:`, filtered); // DEBUG Log the result
        return filtered;
    }, [scheduleTemplates, selectedLocationId, viewMode]);


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
    }, [scheduleData, targetDate, viewMode, shiftRequestContext]);

    const availableEmployees = useMemo(() => {
        if (viewMode === 'week' && !isEmployeeSelectionModalOpen) {
            // In week view, when not selecting specifically for a day (modal closed),
            // show all employees for the location, as they might be assignable on other days.
            return filteredEmployees;
        }

        // In day view, OR when the selection modal is open (implies selecting for a specific day),
        // filter out employees already assigned on THAT SPECIFIC day.
        const dateForFiltering = viewMode === 'day' ? targetDate : (shiftRequestContext?.date || null);

        if (!dateForFiltering) {
            // Fallback if date context is missing (shouldn't ideally happen in these modes)
            return filteredEmployees;
        }

        const dateKey = format(dateForFiltering, 'yyyy-MM-dd');
        const assignedIdsOnDate = new Set<string>();
        const daySchedule = scheduleData[dateKey];
        if (daySchedule && daySchedule.assignments) {
            Object.values(daySchedule.assignments).flat().forEach(assignment => {
                assignedIdsOnDate.add(assignment.employee.id);
            });
        }

        return filteredEmployees.filter(emp => !assignedIdsOnDate.has(emp.id));

    }, [filteredEmployees, scheduleData, targetDate, viewMode, shiftRequestContext, isEmployeeSelectionModalOpen]);


    useEffect(() => {
        // If the department form data's locationId is not set or doesn't match the current selected location, update it.
        if (!departmentFormData.locationId || departmentFormData.locationId !== selectedLocationId) {
           setDepartmentFormData(prev => ({ ...prev, locationId: selectedLocationId }));
        }
    }, [selectedLocationId, departmentFormData.locationId]);

     // Ensure employee form locationIds is updated when selectedLocationId changes,
     // but only if the form is for a *new* employee. Keep existing selections when editing.
     useEffect(() => {
        if (!editingEmployee && selectedLocationId) { // Only update for new employees
            setEmployeeFormData(prev => ({
                ...prev,
                locationIds: [selectedLocationId] // Default to only the current location for new employees
            }));
        }
     }, [selectedLocationId, editingEmployee]); // Depend on editingEmployee state



    const handleLocationChange = (locationId: string) => {
        setSelectedLocationId(locationId);
         setDepartmentFormData(prev => ({ ...prev, locationId: locationId }));
         // Reset employee form location ONLY if adding new employee
          if (!editingEmployee) {
             setEmployeeFormData(prev => ({
                ...prev,
                locationIds: [locationId] // Default new employee to current location
            }));
          }
    };

    const handleOpenEmployeeSelectionModal = (departmentId: string, date: Date) => {
         setEditingShift(null);
         setShiftRequestContext({ departmentId, date });
         setTargetDate(date); // Ensure targetDate is set for filtering available employees
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
            employee: employeeForShift,
            startTime: details.startTime,
            endTime: details.endTime,
            includeBreak: details.includeBreak || false,
            breakStartTime: details.includeBreak ? details.breakStartTime : undefined,
            breakEndTime: details.includeBreak ? details.breakEndTime : undefined,
        };

        setScheduleData(prevData => {
            const currentDayData = getScheduleForDate(date);
            const departmentAssignments = currentDayData.assignments[departmentId] || [];

            let updatedAssignments;
            if (editingShift) {
                updatedAssignments = departmentAssignments.map(a =>
                    a.id === editingShift.assignment.id ? assignmentPayload : a
                );
            } else {
                 const isAlreadyAssignedOnDate = Object.values(currentDayData.assignments)
                                                .flat()
                                                .some(a => a.employee.id === employeeForShift.id);

                 if (isAlreadyAssignedOnDate) {
                     toast({
                         title: 'Asignación Duplicada',
                         description: `${employeeForShift.name} ya tiene un turno asignado para el ${format(date, 'PPP', { locale: es })}.`,
                         variant: 'destructive',
                     });
                     return prevData;
                 }
                updatedAssignments = [...departmentAssignments, assignmentPayload];
            }

             const updatedDayData: ScheduleData = {
                 ...currentDayData,
                 date: date,
                 assignments: {
                     ...currentDayData.assignments,
                     [departmentId]: updatedAssignments,
                 },
             };

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

            // Optional: Clean up empty department arrays
            if (newAssignments[departmentId]?.length === 0) {
                delete newAssignments[departmentId];
            }

             // Optional: Clean up day data if no assignments left
             const remainingAssignmentsCount = Object.values(newAssignments).reduce((sum, dept) => sum + dept.length, 0);
             if (remainingAssignmentsCount === 0) {
                 const updatedData = { ...prevData };
                 delete updatedData[dateKey];
                 return updatedData;
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

        if (isMobile || !over || !active) return; // Ignore drag on mobile

        const employeeId = active.id as string;
        const targetData = over.data.current as { type: string; id: string; date?: string };

        if (!targetData || targetData.type !== 'department' || !targetData.date) {
            console.warn("Invalid drop target data:", targetData);
            return;
        }

        const departmentId = targetData.id;
        const dropDate = parseISO(targetData.date);

        const employee = employees.find(emp => emp.id === employeeId);
        if (!employee) return;

        // Check if employee is already assigned on this specific date
        const dateKey = format(dropDate, 'yyyy-MM-dd');
        const daySchedule = scheduleData[dateKey];
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
                 return; // Prevent assigning again on the same day
             }
        }
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
             const newLocation = { id: `loc-${Date.now()}`, name };
            setLocations([...locations, newLocation]);
            toast({ title: 'Sede Agregada', description: `Sede "${name}" agregada.` });
            // If it's the first location or none was selected, select the new one
            if (locations.length === 0 || !selectedLocationId) {
                 setSelectedLocationId(newLocation.id);
            }
        }
        setIsLocationModalOpen(false);
        setEditingLocation(null);
    };

    const handleOpenDepartmentModal = (department: Department | null) => {
        setEditingDepartment(department);
        const iconName = department ? Object.keys(iconMap).find(key => iconMap[key] === department.icon) : undefined;
        setDepartmentFormData({
            name: department?.name || '',
            locationId: department?.locationId || selectedLocationId,
            iconName: iconName
        });
        setIsDepartmentModalOpen(true);
    };

    const handleSaveDepartment = () => {
         const name = departmentFormData.name.trim();
         const locationId = departmentFormData.locationId;
         const iconName = departmentFormData.iconName;
        if (!name || !locationId) {
            toast({ title: 'Datos Incompletos', description: 'El nombre y la sede del departamento son requeridos.', variant: 'destructive' });
            return;
        }
         const icon = iconName ? iconMap[iconName] : Building; // Default to Building icon if none selected

        if (editingDepartment) {
            setDepartments(departments.map(dep => dep.id === editingDepartment.id ? { ...dep, name, locationId, icon, iconName } : dep));
             toast({ title: 'Departamento Actualizado', description: `Departamento "${name}" actualizado.` });
        } else {
             const newDepartment = { id: `dep-${Date.now()}`, name, locationId, icon, iconName };
            setDepartments([...departments, newDepartment]);
            toast({ title: 'Departamento Agregado', description: `Departamento "${name}" agregado.` });
        }
        setIsDepartmentModalOpen(false);
        setEditingDepartment(null);
    };

    const handleOpenEmployeeModal = (employee: Employee | null) => {
        setEditingEmployee(employee);
        // Ensure locationIds is always initialized as an array
        const initialLocationIds = Array.isArray(employee?.locationIds) ? employee.locationIds : (selectedLocationId ? [selectedLocationId] : []);
        setEmployeeFormData({
            id: employee?.id || '',
            name: employee?.name || '',
            locationIds: initialLocationIds
        });
        setIsEmployeeModalOpen(true);
    };

    const handleToggleEmployeeLocation = (locationId: string) => {
        setEmployeeFormData(prev => {
            const currentIds = Array.isArray(prev.locationIds) ? prev.locationIds : [];
            let newLocationIds;
            if (currentIds.includes(locationId)) {
                // Prevent removing the last location ID
                newLocationIds = currentIds.length > 1 ? currentIds.filter(id => id !== locationId) : currentIds;
                 if (newLocationIds.length === 0 && currentIds.length > 0) {
                    toast({ title: "Validación", description: "El colaborador debe estar asignado al menos a una sede.", variant: "destructive" });
                    return prev; // Return previous state if trying to remove the last one
                }
            } else {
                newLocationIds = [...currentIds, locationId];
            }
            return { ...prev, locationIds: newLocationIds };
        });
    };


    const handleSaveEmployee = () => {
         const id = employeeFormData.id.trim();
         const name = employeeFormData.name.trim();
         // Ensure locationIds is an array and has at least one selection, default to selectedLocationId if somehow empty
         const locationIds = Array.isArray(employeeFormData.locationIds) && employeeFormData.locationIds.length > 0
                             ? employeeFormData.locationIds
                             : (selectedLocationId ? [selectedLocationId] : []);

          if (!id || !name) { // Removed locationIds check here, handled below
             toast({ title: 'Datos Incompletos', description: 'El ID y el nombre del colaborador son requeridos.', variant: 'destructive' });
             return;
          }
           if (locationIds.length === 0) {
               toast({ title: 'Sede Requerida', description: 'Debes asignar el colaborador al menos a una sede.', variant: 'destructive' });
               return;
           }

         // Check for duplicate ID only if adding a new employee
         if (!editingEmployee) {
             const isDuplicateId = employees.some(emp => emp.id === id);
             if (isDuplicateId) {
                 toast({ title: 'ID Duplicado', description: `El ID "${id}" ya está en uso por otro colaborador.`, variant: 'destructive' });
                 return;
             }
         }

         const updatedEmployeeData: Employee = { id, name, locationIds };

        if (editingEmployee) {
            // Update existing employee
            setEmployees(employees.map(emp => emp.id === editingEmployee.id ? updatedEmployeeData : emp));
             toast({ title: 'Colaborador Actualizado', description: `Colaborador "${name}" (ID: ${id}) actualizado.` });
             // Update employee details within existing schedule assignments
             setScheduleData(prevSchedule => {
                const updatedSchedule = { ...prevSchedule };
                Object.keys(updatedSchedule).forEach(dateKey => {
                    Object.keys(updatedSchedule[dateKey].assignments).forEach(deptId => {
                        updatedSchedule[dateKey].assignments[deptId] = updatedSchedule[dateKey].assignments[deptId].map(assignment => {
                            if (assignment.employee.id === id) {
                                // Update the employee object within the assignment
                                return { ...assignment, employee: updatedEmployeeData };
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
        setEditingEmployee(null); // Reset editing state
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
                        // If the deleted location was selected, select the first remaining one or clear selection
                        if (selectedLocationId === itemToDelete.id) {
                           setSelectedLocationId(remaining.length > 0 ? remaining[0].id : '');
                        }
                        return remaining;
                    });
                    // Find departments associated with the deleted location
                    const depsToDelete = departments.filter(dep => dep.locationId === itemToDelete.id).map(d => d.id);
                    // Remove associated departments
                    setDepartments(prevDeps => prevDeps.filter(dep => dep.locationId !== itemToDelete.id));
                    // Remove location association from employees, filter out employees with no locations left
                    setEmployees(prevEmps => prevEmps.map(emp => ({
                        ...emp,
                        locationIds: emp.locationIds.filter(locId => locId !== itemToDelete.id)
                    })).filter(emp => emp.locationIds.length > 0)); // Remove employees with no locations left

                    // Remove templates associated with the deleted location
                    setScheduleTemplates(prevTemplates => (Array.isArray(prevTemplates) ? prevTemplates : []).filter(t => t.locationId !== itemToDelete.id));
                    // Clean up schedule data: remove assignments in departments of the deleted location
                     setScheduleData(prevSchedule => {
                         const updatedSchedule = { ...prevSchedule };
                         Object.keys(updatedSchedule).forEach(dateKey => {
                             let dayHasOtherAssignments = false;
                             const currentAssignments = updatedSchedule[dateKey].assignments;
                             const newAssignments: { [deptId: string]: ShiftAssignment[] } = {};
                             Object.keys(currentAssignments).forEach(deptId => {
                                 if (!depsToDelete.includes(deptId)) { // Keep assignments from other departments
                                     newAssignments[deptId] = currentAssignments[deptId];
                                     if (currentAssignments[deptId].length > 0) {
                                         dayHasOtherAssignments = true;
                                     }
                                 }
                             });
                              // Update assignments or delete day entry if empty
                              if (Object.keys(newAssignments).length > 0) {
                                  updatedSchedule[dateKey].assignments = newAssignments;
                              } else {
                                   delete updatedSchedule[dateKey];
                              }
                         });
                         return updatedSchedule;
                     });

                    message = `Sede "${itemToDelete.name}" y sus datos asociados eliminados.`;
                    break;
                case 'department':
                    setDepartments(prevDeps => prevDeps.filter(dep => dep.id !== itemToDelete.id));
                    // Remove assignments for this department from schedule data
                     const updatedScheduleDept = { ...scheduleData };
                     Object.keys(updatedScheduleDept).forEach(dateKey => {
                          if (updatedScheduleDept[dateKey].assignments[itemToDelete.id]) {
                              delete updatedScheduleDept[dateKey].assignments[itemToDelete.id];
                              // If no assignments left for the day, remove the day entry
                              if (Object.keys(updatedScheduleDept[dateKey].assignments).length === 0) {
                                   delete updatedScheduleDept[dateKey];
                              }
                          }
                     });
                     setScheduleData(updatedScheduleDept);

                    // Remove assignments for this department from templates
                     const currentTemplatesDept = Array.isArray(scheduleTemplates) ? scheduleTemplates : [];
                     const updatedTemplatesDept = currentTemplatesDept.map(t => {
                         let newAssignments = JSON.parse(JSON.stringify(t.assignments));
                         let templateChanged = false;
                         if (t.type === 'daily') {
                              if ((newAssignments as DailyAssignments)[itemToDelete.id]) {
                                 delete (newAssignments as DailyAssignments)[itemToDelete.id];
                                 templateChanged = true;
                              }
                         } else if (t.type === 'weekly') {
                             Object.keys(newAssignments).forEach(dateKey => {
                                 if ((newAssignments as any)[dateKey]?.[itemToDelete.id]) {
                                     delete (newAssignments as WeeklyAssignments)[dateKey][itemToDelete.id];
                                     templateChanged = true;
                                      // If no departments left for the day in the template, remove the day
                                      if (Object.keys((newAssignments as WeeklyAssignments)[dateKey]).length === 0) {
                                         delete (newAssignments as WeeklyAssignments)[dateKey];
                                      }
                                 }
                             });
                         }
                          // If template becomes empty after removal, filter it out later
                          if (Object.keys(newAssignments).length === 0) {
                              return null; // Mark for removal
                          }
                         return templateChanged ? { ...t, assignments: newAssignments } : t;
                     }).filter(t => t !== null) as ShiftTemplate[]; // Filter out nulls
                     setScheduleTemplates(updatedTemplatesDept);
                    message = `Departamento "${itemToDelete.name}" eliminado.`;
                    break;
                case 'employee':
                    setEmployees(prevEmps => prevEmps.filter(emp => emp.id !== itemToDelete.id));
                    // Remove assignments for this employee from schedule data
                     const updatedScheduleEmp = { ...scheduleData };
                     Object.keys(updatedScheduleEmp).forEach(dateKey => {
                          let dayChanged = false;
                          Object.keys(updatedScheduleEmp[dateKey].assignments).forEach(deptId => {
                              const originalLength = updatedScheduleEmp[dateKey].assignments[deptId].length;
                              updatedScheduleEmp[dateKey].assignments[deptId] = updatedScheduleEmp[dateKey].assignments[deptId].filter(a => a.employee.id !== itemToDelete.id);
                              if (updatedScheduleEmp[dateKey].assignments[deptId].length < originalLength) {
                                  dayChanged = true;
                              }
                              // If department becomes empty, remove it
                              if (updatedScheduleEmp[dateKey].assignments[deptId].length === 0) {
                                  delete updatedScheduleEmp[dateKey].assignments[deptId];
                              }
                          });
                           // If day becomes empty, remove it
                           if (dayChanged && Object.keys(updatedScheduleEmp[dateKey].assignments).length === 0) {
                               delete updatedScheduleEmp[dateKey];
                           }
                     });
                     setScheduleData(updatedScheduleEmp);

                       // Remove assignments for this employee from templates
                       const currentTemplatesEmp = Array.isArray(scheduleTemplates) ? scheduleTemplates : [];
                       const updatedTemplatesEmp = currentTemplatesEmp.map(t => {
                           let newAssignments = JSON.parse(JSON.stringify(t.assignments));
                           let templateChanged = false;
                           if (t.type === 'daily') {
                               Object.keys(newAssignments).forEach(deptId => {
                                  const originalLength = (newAssignments[deptId] || []).length;
                                   newAssignments[deptId] = (newAssignments[deptId] || []).filter((a: any) => a.employee.id !== itemToDelete.id);
                                   if (newAssignments[deptId].length < originalLength) {
                                       templateChanged = true;
                                   }
                                   if (newAssignments[deptId].length === 0) {
                                       delete newAssignments[deptId];
                                   }
                               });
                           } else if (t.type === 'weekly') {
                               Object.keys(newAssignments).forEach(dateKey => {
                                   let dayInTemplateChanged = false;
                                   Object.keys(newAssignments[dateKey] || {}).forEach(deptId => {
                                      const originalLength = (newAssignments[dateKey][deptId] || []).length;
                                       newAssignments[dateKey][deptId] = (newAssignments[dateKey][deptId] || []).filter((a: any) => a.employee.id !== itemToDelete.id);
                                       if (newAssignments[dateKey][deptId].length < originalLength) {
                                           templateChanged = true;
                                           dayInTemplateChanged = true;
                                       }
                                       if (newAssignments[dateKey][deptId].length === 0) {
                                           delete newAssignments[dateKey][deptId];
                                       }
                                   });
                                    // If day becomes empty in template, remove it
                                    if (dayInTemplateChanged && Object.keys(newAssignments[dateKey]).length === 0) {
                                       delete newAssignments[dateKey];
                                    }
                               });
                           }
                           // If template becomes empty after removal, filter it out later
                            if (Object.keys(newAssignments).length === 0) {
                                return null; // Mark for removal
                            }
                           return templateChanged ? { ...t, assignments: newAssignments } : t;
                       }).filter(t => t !== null) as ShiftTemplate[]; // Filter out nulls
                      setScheduleTemplates(updatedTemplatesEmp);
                     message = `Colaborador "${itemToDelete.name}" eliminado.`;
                     break;
                  case 'template':
                      const currentTemplates = Array.isArray(scheduleTemplates) ? scheduleTemplates : [];
                      const updatedTemplates = currentTemplates.filter(t => t.id !== itemToDelete.id);
                      setScheduleTemplates(updatedTemplates);
                      message = `Template "${itemToDelete.name}" eliminado.`;
                     break;
             }
             toast({ title: 'Elemento Eliminado', description: message, variant: 'destructive' });
         } catch (error) {
              console.error(`Error deleting item type ${itemToDelete.type}:`, error);
              toast({ title: 'Error al Eliminar', description: 'No se pudo completar la eliminación.', variant: 'destructive' });
         } finally {
             setItemToDelete(null); // Close the dialog
         }
     };


     const handlePreviousWeek = () => {
        setCurrentDate(prevDate => subWeeks(prevDate, 1));
     };

     const handleNextWeek = () => {
        setCurrentDate(prevDate => addWeeks(prevDate, 1));
     };

    const handleSaveSchedule = () => {
        // Since data is saved via useEffect, this button might just provide user feedback
        toast({ title: 'Horario Guardado', description: 'Los cambios en el horario se guardan automáticamente.' });
        // Optionally trigger a manual save if needed, though useEffect should handle it
        // localStorage.setItem(SCHEDULE_DATA_KEY, JSON.stringify(scheduleData)); // Example manual save
    };


     const handleDuplicateDay = (sourceDate: Date) => {
         const sourceDayKey = format(sourceDate, 'yyyy-MM-dd');
         const nextDayDate = addDays(sourceDate, 1);
         const nextDayKey = format(nextDayDate, 'yyyy-MM-dd');
         const sourceSchedule = scheduleData[sourceDayKey];

         // Check if source day has any assignments
         if (!sourceSchedule || Object.keys(sourceSchedule.assignments).length === 0 || Object.values(sourceSchedule.assignments).every(dept => dept.length === 0)) {
             toast({ title: 'Nada que Duplicar', description: `No hay turnos asignados para el ${format(sourceDate, 'PPP', { locale: es })}.`, variant: 'default' });
             return;
         }

         // Create a deep copy of the assignments to avoid reference issues
         const duplicatedAssignments = JSON.parse(JSON.stringify(sourceSchedule.assignments));
         // Update assignment IDs and potentially re-fetch full employee objects if needed
         Object.keys(duplicatedAssignments).forEach(deptId => {
             duplicatedAssignments[deptId].forEach((assign: ShiftAssignment) => {
                 // Generate a new unique ID for the duplicated assignment
                 assign.id = `shift_${assign.employee.id}_${nextDayKey}_${assign.startTime.replace(':', '')}_${Math.random().toString(36).substring(2, 7)}`;
                  // Ensure the employee object is the full object, not just the ID reference if that was stored
                  const fullEmployee = employees.find(emp => emp.id === assign.employee.id);
                  if (fullEmployee) {
                      assign.employee = fullEmployee;
                  } else {
                       // Handle case where employee might not be found (e.g., if deleted between planning and duplicating)
                       console.warn(`Employee ${assign.employee.id} not found during duplication.`);
                       assign.employee = { id: assign.employee.id, name: `(ID: ${assign.employee.id})`, locationIds: [] }; // Placeholder
                  }
             });
         });

         // Update the schedule data state
         setScheduleData(prevData => ({
             ...prevData,
             [nextDayKey]: {
                 date: nextDayDate,
                 assignments: duplicatedAssignments,
             },
         }));

         // If in day view, switch to the next day
         if (viewMode === 'day') {
             setTargetDate(nextDayDate);
         }

         toast({ title: 'Horario Duplicado', description: `El horario del ${format(sourceDate, 'dd/MM')} se duplicó al ${format(nextDayDate, 'dd/MM')}.` });
     };

    const handleDuplicateWeek = () => {
        const nextWeekStartDate = addWeeks(startOfWeek(currentDate, { weekStartsOn: 1 }), 1);
        let updatedData = { ...scheduleData };
        let duplicatedCount = 0;

        weekDates.forEach(sourceDate => {
            const sourceDayKey = format(sourceDate, 'yyyy-MM-dd');
            const sourceDaySchedule = scheduleData[sourceDayKey];
            // Check if there are assignments to duplicate for the source day
            if (sourceDaySchedule && Object.keys(sourceDaySchedule.assignments).length > 0 && Object.values(sourceDaySchedule.assignments).some(dept => dept.length > 0)) {
                 // Calculate target date based on the day of the week
                 const dayOfWeek = getDay(sourceDate); // 0=Sun, 1=Mon,...
                 const targetDateIndex = (dayOfWeek === 0 ? 6 : dayOfWeek - 1); // Adjust index for Monday start (0=Mon, 6=Sun)
                 if (targetDateIndex < 0 || targetDateIndex >= 7) {
                     console.error("Invalid target date index calculated:", targetDateIndex, "for date:", sourceDate);
                     return; // Skip this day if index calculation fails
                 }
                const targetDate = addDays(nextWeekStartDate, targetDateIndex);
                const targetDayKey = format(targetDate, 'yyyy-MM-dd');

                // Deep copy assignments and update IDs/employee objects
                const duplicatedAssignments = JSON.parse(JSON.stringify(sourceDaySchedule.assignments));
                Object.keys(duplicatedAssignments).forEach(deptId => {
                     duplicatedAssignments[deptId].forEach((assign: ShiftAssignment) => {
                         assign.id = `shift_${assign.employee.id}_${targetDayKey}_${assign.startTime.replace(':', '')}_${Math.random().toString(36).substring(2, 7)}`;
                          const fullEmployee = employees.find(emp => emp.id === assign.employee.id); // Use assign here
                          assign.employee = fullEmployee || { id: assign.employee.id, name: `(ID: ${assign.employee.id})`, locationIds: [] }; // Handle missing employee
                     });
                });

                // Assign duplicated data to the target date
                updatedData[targetDayKey] = {
                    date: targetDate,
                    assignments: duplicatedAssignments,
                };
                duplicatedCount++;
            }
        });

        if (duplicatedCount > 0) {
            setScheduleData(updatedData); // Update the state with all duplicated days
            setCurrentDate(nextWeekStartDate); // Move view to the next week
            toast({ title: 'Semana Duplicada', description: `El horario de esta semana (${duplicatedCount} día(s)) se duplicó a la siguiente.` });
        } else {
            toast({ title: 'Nada que Duplicar', description: 'No hay turnos en la semana actual para duplicar.', variant: 'default' });
        }
    };


     const handleConfirmClearDay = (dateToClear: Date) => {
         setClearingDate(dateToClear); // Set the date to be cleared, triggers the AlertDialog
     };

     const handleClearDay = () => {
         if (!clearingDate) return;
         const dateKey = format(clearingDate, 'yyyy-MM-dd');

         setScheduleData(prevData => {
             const updatedData = { ...prevData };
             // Remove the assignments for the specific day, or remove the day entry entirely
             if (updatedData[dateKey]) {
                 // Option 1: Keep the day entry but clear assignments
                 // updatedData[dateKey].assignments = {};
                 // Option 2: Remove the day entry completely
                  delete updatedData[dateKey];
             }
             return updatedData;
         });
         setClearingDate(null); // Close the dialog
         toast({ title: 'Horario Limpiado', description: `Se eliminaron todos los turnos para el ${format(clearingDate, 'PPP', { locale: es })}.`, variant: 'destructive' });
     };


     const handleOpenTemplateSaveModal = () => { // Renamed from handleOpenTemplateModal
         let hasAssignments = false;
         if (viewMode === 'day') {
             const currentDayKey = format(targetDate, 'yyyy-MM-dd');
             const currentSchedule = scheduleData[currentDayKey];
             // Check if assignments exist and are not empty arrays
             hasAssignments = !!currentSchedule && Object.keys(currentSchedule.assignments).length > 0 && Object.values(currentSchedule.assignments).some(dept => dept.length > 0);
         } else { // Week view
             // Check if any day in the week has assignments
             hasAssignments = weekDates.some(date => {
                 const dayKey = format(date, 'yyyy-MM-dd');
                 const daySchedule = scheduleData[dayKey];
                 return !!daySchedule && Object.keys(daySchedule.assignments).length > 0 && Object.values(daySchedule.assignments).some(dept => dept.length > 0);
             });
         }

         if (!hasAssignments) {
             const contextDescription = viewMode === 'day' ? `el ${format(targetDate, 'PPP', { locale: es })}` : 'la semana actual';
             toast({ title: 'Template Vacío', description: `No hay turnos asignados en ${contextDescription} para guardar como template.`, variant: 'default' });
             return; // Don't open modal if no data
         }

         setTemplateName(''); // Clear previous name
         setIsTemplateSaveModalOpen(true); // Open the SAVE modal
     };

    const handleSaveTemplate = () => {
         if (!templateName.trim()) {
             toast({ title: 'Nombre Inválido', description: 'Por favor ingresa un nombre para el template.', variant: 'destructive' });
             return;
         }

         let templateAssignments: ShiftTemplate['assignments'];
         const templateType = viewMode === 'day' ? 'daily' : 'weekly';
         let hasDataToSave = false; // Flag to check if there's actual data

         if (templateType === 'daily') {
             const sourceDate = targetDate;
             const currentDayKey = format(sourceDate, 'yyyy-MM-dd');
             const currentAssignmentsRaw = scheduleData[currentDayKey]?.assignments || {};
             const cleanedAssignments: DailyAssignments = {};
             Object.keys(currentAssignmentsRaw).forEach(deptId => {
                  if (currentAssignmentsRaw[deptId]?.length > 0) {
                     // Map assignments, removing instance ID and storing only employee ID
                     cleanedAssignments[deptId] = currentAssignmentsRaw[deptId].map(({ id, employee, ...rest }) => ({
                          ...rest,
                          employee: { id: employee.id } // Only store employee ID reference
                     }));
                     hasDataToSave = true; // Mark that we have data
                  }
             });
             templateAssignments = cleanedAssignments;
         } else { // Weekly template
             templateAssignments = {};
             weekDates.forEach(date => {
                 const dateKey = format(date, 'yyyy-MM-dd');
                 const dailyAssignmentsRaw = scheduleData[dateKey]?.assignments || {};
                 const cleanedDailyAssignments: DailyAssignments = {};
                 let dayHasData = false;
                 Object.keys(dailyAssignmentsRaw).forEach(deptId => {
                      if (dailyAssignmentsRaw[deptId]?.length > 0) {
                         cleanedDailyAssignments[deptId] = dailyAssignmentsRaw[deptId].map(({ id, employee, ...rest }) => ({
                             ...rest,
                             employee: { id: employee.id } // Store only employee ID
                         }));
                         dayHasData = true;
                         hasDataToSave = true; // Mark that we have data
                      }
                 });
                 // Only add the day to the template if it has assignments
                 if (dayHasData) {
                      (templateAssignments as WeeklyAssignments)[dateKey] = cleanedDailyAssignments;
                 }
             });
         }

         // Prevent saving if no actual assignments were found
         if (!hasDataToSave) {
             toast({ title: 'Template Vacío', description: 'No se encontraron turnos válidos para guardar.', variant: 'default' });
             setIsTemplateSaveModalOpen(false);
             return;
         }

         // Create the new template object
         const newTemplate: ShiftTemplate = {
             id: `tpl-${Date.now()}`,
             name: templateName.trim(),
             locationId: selectedLocationId,
             type: templateType,
             assignments: templateAssignments,
             createdAt: new Date().toISOString(), // Add creation timestamp
         };

          // Update the state with the new template
          setScheduleTemplates(prev => {
              // Ensure 'prev' is an array, defaulting to empty if not
              const validPrev = Array.isArray(prev) ? prev : [];
              const updatedTemplates = [...validPrev, newTemplate];
               console.log("[DEBUG Save Template] Updating state with new templates:", updatedTemplates); // DEBUG Log
              return updatedTemplates; // Return the updated array
          });

         toast({ title: 'Template Guardado', description: `El template "${newTemplate.name}" (${templateType === 'daily' ? 'Diario' : 'Semanal'}) se ha guardado.` });
         setIsTemplateSaveModalOpen(false); // Close SAVE modal
         setTemplateName(''); // Reset name field
     };


    const handleLoadTemplate = (templateId: string) => {
        if (typeof window === 'undefined') return; // Client-side only

        const templatesArray = Array.isArray(scheduleTemplates) ? scheduleTemplates : [];
        // console.log(`[DEBUG Load Template] Attempting load. ID: ${templateId}. All templates in state:`, templatesArray); // DEBUG Log
        const templateToLoad = templatesArray.find(t => t.id === templateId);

        if (!templateToLoad) {
            console.error(`[DEBUG Load Template] Template with ID ${templateId} not found.`); // DEBUG Log
            toast({ title: 'Template no encontrado', variant: 'destructive' });
            return;
        }
        // console.log(`[DEBUG Load Template] Found template:`, templateToLoad); // DEBUG Log

        // --- Validations ---
        if (templateToLoad.locationId !== selectedLocationId) {
            toast({
                title: 'Sede Incorrecta',
                description: `El template "${templateToLoad.name}" pertenece a otra sede. Cambia de sede para cargarlo.`,
                variant: 'destructive',
            });
            return;
        }
        if (templateToLoad.type !== viewMode) {
            const requiredView = templateToLoad.type === 'daily' ? 'diaria' : 'semanal';
            toast({
                title: 'Vista Incorrecta',
                description: `El template "${templateToLoad.name}" es ${templateToLoad.type === 'daily' ? 'diario' : 'semanal'}. Cambia a la vista ${requiredView} para cargarlo.`,
                variant: 'destructive',
            });
            return;
        }

        // --- Confirmation Dialog ---
         // You might want to add a confirmation dialog here before overwriting the schedule
         // For now, proceeding directly with loading.

        // --- Loading Logic ---
        let updatedScheduleData = { ...scheduleData };
        let successMessage = '';
        let assignmentsLoadedCount = 0;

        try {
            if (templateToLoad.type === 'daily') {
                const loadTargetDate = targetDate; // Use the currently viewed date in day mode
                const dateKey = format(loadTargetDate, 'yyyy-MM-dd');
                const loadedAssignments: { [deptId: string]: ShiftAssignment[] } = {};

                // Iterate through departments in the template's assignments
                Object.keys(templateToLoad.assignments).forEach(deptId => {
                    const assignmentsForDept = (templateToLoad.assignments as DailyAssignments)[deptId];
                    if (Array.isArray(assignmentsForDept)) {
                        // Map template assignments to full ShiftAssignment objects
                        loadedAssignments[deptId] = assignmentsForDept
                            .map((assignTemplate: Omit<ShiftAssignment, 'id'> & { employee: { id: string } }) => {
                                const employee = employees.find(emp => emp.id === assignTemplate.employee.id);
                                if (employee) { // Check if employee exists
                                    // Generate a new unique ID for the loaded assignment
                                    const newAssignId = `shift_${employee.id}_${dateKey}_${assignTemplate.startTime.replace(':', '')}_${Math.random().toString(36).substring(2, 7)}`;
                                    assignmentsLoadedCount++;
                                    return {
                                        ...assignTemplate,
                                        id: newAssignId,
                                        employee: employee, // Use the full employee object
                                    };
                                }
                                console.warn(`[DEBUG LOAD Daily] Employee ID ${assignTemplate.employee.id} not found while loading template. Skipping assignment.`); // DEBUG Log
                                return null; // Skip if employee doesn't exist
                            })
                            .filter((a): a is ShiftAssignment => a !== null); // Filter out nulls
                    } else {
                        console.warn(`[DEBUG LOAD Daily] Assignments for dept ${deptId} in template ${templateId} is not an array.`); // DEBUG Log
                    }
                });

                 if (assignmentsLoadedCount === 0) {
                     console.warn(`[DEBUG LOAD Daily] No valid assignments found or matched in template ${templateId}.`); // DEBUG Log
                     toast({ title: 'Template Vacío o Sin Coincidencias', description: `No se encontraron turnos válidos para cargar del template "${templateToLoad.name}".`, variant: 'default' });
                     setIsTemplateLoadSectionOpen(false); // Close template loading section if open
                     return;
                 }
                 // Overwrite the schedule data for the target date
                updatedScheduleData[dateKey] = {
                     date: loadTargetDate,
                     assignments: loadedAssignments,
                };
                successMessage = `Se cargó el template "${templateToLoad.name}" para ${format(loadTargetDate, 'PPP', { locale: es })}.`;

            } else { // Weekly template
                // Clear the current week's data before applying the template
                 weekDates.forEach(date => {
                     const dateKey = format(date, 'yyyy-MM-dd');
                     updatedScheduleData[dateKey] = { date: date, assignments: {} }; // Reset assignments for each day
                 });

                 // Iterate through dates defined in the weekly template's assignments
                Object.keys(templateToLoad.assignments).forEach(sourceDateKey => {
                    const templateDate = parseDateFnsInternal(sourceDateKey, 'yyyy-MM-dd', new Date()); // Get Date object from template key
                    if (!isValid(templateDate)) {
                         console.warn(`[DEBUG LOAD Weekly] Invalid date key ${sourceDateKey} in template. Skipping.`); // DEBUG Log
                         return;
                    }

                    // Find the corresponding date in the currently viewed week based on the day of the week
                     const dayOfWeek = getDay(templateDate); // 0=Sun, 1=Mon,...
                     const targetDateIndex = (dayOfWeek === 0 ? 6 : dayOfWeek - 1); // Map to Monday-start index (0=Mon, 6=Sun)

                    if (targetDateIndex >= 0 && targetDateIndex < weekDates.length) {
                         const targetWeekDate = weekDates[targetDateIndex]; // The actual Date object for the target day in the current week
                         const targetDateKey = format(targetWeekDate, 'yyyy-MM-dd'); // The key for the scheduleData state

                        const dailyAssignmentsFromTemplate = (templateToLoad.assignments as WeeklyAssignments)[sourceDateKey] || {};
                        const loadedDailyAssignments: { [deptId: string]: ShiftAssignment[] } = {};

                        // Process assignments for each department within the day from the template
                        Object.keys(dailyAssignmentsFromTemplate).forEach(deptId => {
                             const assignmentsForDept = dailyAssignmentsFromTemplate[deptId];
                             if (Array.isArray(assignmentsForDept)) {
                                loadedDailyAssignments[deptId] = assignmentsForDept
                                    .map((assignTemplate: Omit<ShiftAssignment, 'id'> & { employee: { id: string } }) => {
                                        const employee = employees.find(emp => emp.id === assignTemplate.employee.id);
                                        if (employee) {
                                            const newAssignId = `shift_${employee.id}_${targetDateKey}_${assignTemplate.startTime.replace(':', '')}_${Math.random().toString(36).substring(2, 7)}`;
                                            assignmentsLoadedCount++;
                                            return {
                                                ...assignTemplate,
                                                id: newAssignId,
                                                employee: employee,
                                            };
                                        }
                                        console.warn(`[DEBUG LOAD Weekly] Employee ID ${assignTemplate.employee.id} not found for ${sourceDateKey}. Skipping.`); // DEBUG Log
                                        return null;
                                    })
                                    .filter((a): a is ShiftAssignment => a !== null);
                            } else {
                                 console.warn(`[DEBUG LOAD Weekly] Assignments for dept ${deptId} on ${sourceDateKey} is not array.`); // DEBUG Log
                             }
                        });

                         // If assignments were loaded for this day, update the scheduleData for the target date
                         if (Object.keys(loadedDailyAssignments).length > 0) {
                             // Merge with existing data for the target day (though we cleared it earlier)
                             updatedScheduleData[targetDateKey] = {
                                ...updatedScheduleData[targetDateKey], // Keep the correct Date object
                                assignments: loadedDailyAssignments // Apply the loaded assignments
                             };
                         }

                    } else {
                        console.warn(`[DEBUG LOAD Weekly] Could not map template date ${sourceDateKey} to current week. Index: ${targetDateIndex}`); // DEBUG Log
                    }
                });

                 if (assignmentsLoadedCount === 0) {
                     console.warn(`[DEBUG LOAD Weekly] No valid assignments found or matched in template ${templateId}.`); // DEBUG Log
                     toast({ title: 'Template Vacío o Sin Coincidencias', description: `No se encontraron turnos válidos para cargar del template "${templateToLoad.name}".`, variant: 'default' });
                     setIsTemplateLoadSectionOpen(false); // Close template loading section if open
                     return;
                 }

                successMessage = `Se cargó el template semanal "${templateToLoad.name}" en la semana actual.`;
            }


             setScheduleData(updatedScheduleData); // Update the main schedule state
             toast({ title: 'Template Cargado', description: successMessage });
             setIsTemplateLoadSectionOpen(false); // Close the template loading section
         } catch (error) {
             console.error("[DEBUG Load Template] Error loading template:", error); // DEBUG Log
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
        toast({ title: 'Notas Guardadas', description: 'Tus notas han sido guardadas localmente.' });
    };

    // --- CSV Import Handlers ---
     // Parse CSV content into structured data
     const parseScheduleCSV = (content: string): CsvRowData[] => {
         const rows = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n');
         console.log(`[CSV Parse] Found ${rows.length} rows (incl. header)`); // DEBUG Log
         if (rows.length < 2) return [];

         const rawFirstLineVariable = rows[0]; // Get the header line
         console.log('DEBUG: Raw Header Line Read:', rawFirstLineVariable); // DEBUG Log

         const delimiterVariable = ','; // Assuming comma for now
         console.log('DEBUG: Delimiter Used:', delimiterVariable); // DEBUG Log

         const extractedHeadersArrayVariable = rawFirstLineVariable.split(delimiterVariable).map(h => h.trim());
         console.log('DEBUG: Extracted Headers Array:', extractedHeadersArrayVariable); // DEBUG Log

         const data: CsvRowData[] = [];

         // Define the required headers for template mode (case-insensitive check)
         const requiredHeadersListVariable = ['ID_Empleado', 'Departamento', 'Hora_Inicio', 'Hora_Fin']; // Removed 'Fecha' as it's optional for template import
         console.log('DEBUG: Required Headers List (Code):', requiredHeadersListVariable); // DEBUG Log

         // Check if all required headers are present
         const missingHeaders = requiredHeadersListVariable.filter(reqHeader =>
             !extractedHeadersArrayVariable.some(h => h.toLowerCase() === reqHeader.toLowerCase())
         );
         console.log('DEBUG: Missing Headers Found:', missingHeaders); // DEBUG Log


         if (missingHeaders.length > 0) {
             console.error(`[CSV Parse] Missing required headers: ${missingHeaders.join(', ')}`);
             throw new Error(`Faltan encabezados CSV requeridos: ${missingHeaders.join(', ')}. Asegúrate de que el archivo incluya estas columnas.`);
         }

         // Find the actual header names used in the CSV for mapping
         const headerMapping: { [key in keyof CsvRowData]?: string } = {};
         const schemaKeys = Object.keys(csvRowSchema.shape) as (keyof CsvRowData)[];
         schemaKeys.forEach(key => {
            const foundHeader = extractedHeadersArrayVariable.find(h => h.toLowerCase() === key.toLowerCase());
            if (foundHeader) {
                headerMapping[key] = foundHeader;
                 console.log(`[CSV Parse] Mapped schema key "${key}" to CSV header "${foundHeader}"`); // DEBUG Log
            } else if (key !== 'Fecha') { // Don't warn if 'Fecha' is missing, as it's optional for template import
                console.warn(`[CSV Parse] Optional header not found for schema key: "${key}"`);
            }
         });
          // Ensure 'Fecha' mapping if present, even though we might ignore its value
          const fechaHeader = extractedHeadersArrayVariable.find(h => h.toLowerCase() === 'fecha');
          if (fechaHeader) {
              headerMapping['Fecha'] = fechaHeader;
              console.log(`[CSV Parse] Mapped schema key "Fecha" to CSV header "${fechaHeader}"`); // DEBUG Log
          } else {
               console.log('[CSV Parse] "Fecha" header not found, will use day of week logic.'); // DEBUG Log
          }


         console.log('[CSV Parse] Header Mapping:', headerMapping); // DEBUG Log

         for (let i = 1; i < rows.length; i++) {
             if (!rows[i].trim()) continue;

             const values = rows[i].split(delimiterVariable).map(v => v.trim());
             // Ensure the number of values matches the number of headers
             if (values.length !== extractedHeadersArrayVariable.length) {
                 console.warn(`[CSV Parse] Skipping row ${i + 1}: Column count mismatch. Expected ${extractedHeadersArrayVariable.length}, got ${values.length}.`);
                 continue;
             }

             const rowObject: Partial<CsvRowData> = {};

             // Map values using the *original* CSV headers and the mapping
             extractedHeadersArrayVariable.forEach((header, index) => {
                 // Find the *standard* schema key that corresponds to this *original* CSV header
                 const standardKey = (Object.keys(headerMapping) as (keyof CsvRowData)[]).find(
                     stdKey => headerMapping[stdKey]?.toLowerCase() === header.toLowerCase()
                 );
                 if (standardKey) {
                     rowObject[standardKey] = values[index] || ''; // Allow empty values, trim later if needed
                 }
             });

              // Provide a default 'Fecha' ONLY if the 'Fecha' header was NOT present in the CSV
              // We use a consistent date (like start of the year) to derive the day of week later.
              if (!headerMapping['Fecha']) {
                  const firstMondayOfYear = startOfWeek(new Date(new Date().getFullYear(), 0, 1), { weekStartsOn: 1 });
                  // We need a valid date string for Zod validation, even if we ignore it later
                  rowObject['Fecha'] = format(firstMondayOfYear, 'yyyy-MM-dd');
                  console.log(`[CSV Parse] Row ${i + 1}: Using default date ${rowObject['Fecha']} as 'Fecha' header was missing.`); // DEBUG Log
              } else if (headerMapping['Fecha'] && !rowObject['Fecha']) {
                   // If the Fecha header exists but the value is empty, treat it as an error or skip
                   console.warn(`[CSV Parse] Skipping row ${i + 1}: 'Fecha' header exists but value is empty.`);
                   continue;
              }

             console.log(`[CSV Parse] Processing row ${i + 1} data:`, rowObject); // DEBUG Log


             try {
                 // Validate the row against the schema (Fecha is optional now)
                 const validatedRow = csvRowSchema.parse(rowObject);
                 data.push(validatedRow);
                  console.log(`[CSV Parse] Row ${i + 1} passed validation.`); // DEBUG Log
             } catch (error) {
                 console.warn(`[CSV Parse] Skipping row ${i + 1} due to validation error:`, error instanceof z.ZodError ? error.errors : error);
             }
         }
         console.log(`[CSV Parse] Finished parsing. ${data.length} valid rows found.`); // DEBUG Log
         return data;
     };


     // Process the parsed CSV data (Template Import Logic)
    const processCSVAsTemplate = useCallback((parsedData: CsvRowData[]) => {
        console.log('[CSV Process] Starting processCSVAsTemplate with parsed data:', parsedData); // DEBUG Log
        if (parsedData.length === 0) {
            toast({ title: 'Sin Datos Válidos', description: 'No se encontraron filas válidas en el archivo CSV.', variant: 'destructive' });
            return;
        }

        let importedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;
        // Start with a clean slate for the current week, preserving the dates
        const newScheduleAssignmentsForWeek: { [dateKey: string]: ScheduleData } = {};
        weekDates.forEach(date => {
            newScheduleAssignmentsForWeek[format(date, 'yyyy-MM-dd')] = { date, assignments: {} };
        });

        parsedData.forEach((row, rowIndex) => {
             console.log(`[CSV Process] Processing row ${rowIndex + 1}:`, row); // DEBUG Log
            // --- Find Employee ---
            const employee = employees.find(emp => emp.id === row.ID_Empleado);
            if (!employee) {
                console.warn(`[CSV Process] Row ${rowIndex + 1}: Employee ID ${row.ID_Empleado} not found, skipping.`);
                skippedCount++;
                return;
            }
            // Ensure employee belongs to the current location
             if (!employee.locationIds.includes(selectedLocationId)) {
                console.warn(`[CSV Process] Row ${rowIndex + 1}: Employee ${employee.name} not part of location ${selectedLocationId}, skipping.`);
                skippedCount++;
                return;
             }

            // --- Find Department ---
            const department = filteredDepartments.find(dep => dep.name.toLowerCase() === row.Departamento.toLowerCase());
            if (!department) {
                console.warn(`[CSV Process] Row ${rowIndex + 1}: Department "${row.Departamento}" not found in location ${selectedLocationId}, skipping.`);
                errorCount++;
                return;
            }

            // --- Determine Target Date (based on Day of Week) ---
            // Use the Fecha from CSV (which might be the default if header was missing)
             // Or if Fecha is missing, use a default to derive day of week
             const csvDateStr = row.Fecha || format(startOfWeek(new Date(new Date().getFullYear(), 0, 1), { weekStartsOn: 1 }), 'yyyy-MM-dd');
             const csvDate = parseDateFnsInternal(csvDateStr, 'yyyy-MM-dd', new Date());

            if (!isValid(csvDate)) {
                console.warn(`[CSV Process] Row ${rowIndex + 1}: Invalid date parsed from CSV or default "${csvDateStr}", skipping.`);
                errorCount++;
                return;
            }
             let csvDayIndex = getDay(csvDate); // 0=Sun, 1=Mon,...
             csvDayIndex = (csvDayIndex === 0) ? 6 : csvDayIndex - 1; // Map Sunday(0) to index 6, Monday(1) to 0, etc.
             console.log(`[CSV Process] Row ${rowIndex + 1}: CSV Date=${csvDateStr}, Day Index (Mon=0):${csvDayIndex}`); // DEBUG Log

            // Ensure the index is within the bounds of the weekDates array
            if (csvDayIndex < 0 || csvDayIndex >= weekDates.length) {
                 console.warn(`[CSV Process] Row ${rowIndex + 1}: Day index (${csvDayIndex}) out of bounds for current week. Skipping.`);
                 errorCount++;
                 return;
            }

            const targetDateForShift = weekDates[csvDayIndex];
            if (!targetDateForShift) {
                console.error(`[CSV Process] Row ${rowIndex + 1}: Could not get target date for index ${csvDayIndex}. This shouldn't happen.`);
                errorCount++;
                return;
            }
            const targetDateKey = format(targetDateForShift, 'yyyy-MM-dd');
             console.log(`[CSV Process] Row ${rowIndex + 1}: Target Date Key=${targetDateKey}`); // DEBUG Log

            // Initialize department array if it doesn't exist for the target date
            if (!newScheduleAssignmentsForWeek[targetDateKey].assignments[department.id]) {
                newScheduleAssignmentsForWeek[targetDateKey].assignments[department.id] = [];
            }

            // --- Check for Duplicate Assignment on Target Day ---
            const existingAssignmentsForTargetDay = Object.values(newScheduleAssignmentsForWeek[targetDateKey].assignments).flat();
            if (existingAssignmentsForTargetDay.some(a => a.employee.id === employee.id)) {
                console.warn(`[CSV Process] Row ${rowIndex + 1}: Employee ${employee.name} already assigned on ${targetDateKey}, skipping duplicate.`);
                skippedCount++;
                return;
            }

            // --- Create New Assignment ---
            const includesBreakRaw = row.Incluye_Descanso?.trim().toLowerCase();
            const includeBreakParsed = includesBreakRaw === 'sí' || includesBreakRaw === 'si' || includesBreakRaw === 'true' || includesBreakRaw === '1';

            const newAssignment: ShiftAssignment = {
                id: `shift_${employee.id}_${targetDateKey}_${row.Hora_Inicio.replace(':', '')}_${Math.random().toString(36).substring(2, 7)}`,
                employee: employee,
                startTime: row.Hora_Inicio,
                endTime: row.Hora_Fin,
                includeBreak: includeBreakParsed,
                breakStartTime: includeBreakParsed ? row.Inicio_Descanso : undefined,
                breakEndTime: includeBreakParsed ? row.Fin_Descanso : undefined,
            };
             console.log(`[CSV Process] Row ${rowIndex + 1}: Created new assignment for ${employee.name} on ${targetDateKey}`, newAssignment); // DEBUG Log

            // Add the new assignment
            newScheduleAssignmentsForWeek[targetDateKey].assignments[department.id].push(newAssignment);
            importedCount++;
        });

        console.log('[CSV Process] Finished processing. Summary:', { importedCount, skippedCount, errorCount }); // DEBUG Log
        console.log('[CSV Process] New schedule data for week:', newScheduleAssignmentsForWeek); // DEBUG Log

        // --- Update State ---
        // Overwrite the schedule for the current week with the imported data
        setScheduleData(prevData => ({
            ...prevData,
            ...newScheduleAssignmentsForWeek
        }));

        // --- User Feedback ---
        let toastDescription = `${importedCount} turno(s) importado(s) y aplicados a la semana actual.`;
        if (skippedCount > 0) toastDescription += ` ${skippedCount} omitido(s) (duplicados o empleado no encontrado/válido).`;
        if (errorCount > 0) toastDescription += ` ${errorCount} error(es) de datos (departamento no encontrado o fecha inválida).`;
         if (importedCount === 0 && errorCount === 0 && skippedCount === 0 && parsedData.length > 0) {
            toastDescription = "El archivo CSV fue procesado, pero no se importaron turnos. Revisa si los IDs de empleado y nombres de departamento coinciden.";
         }

        toast({
            title: 'Importación CSV (modo Template) Completa',
            description: toastDescription,
            variant: errorCount > 0 ? 'destructive' : 'default',
            duration: 7000,
        });

    }, [employees, filteredDepartments, selectedLocationId, setScheduleData, toast, weekDates]);


     // Handle file selection from input
     const handleCSVFileChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
         const file = event.target.files?.[0];
         if (!file) return;
         console.log('[CSV Import] File selected:', file.name); // DEBUG Log

         setIsImportingCSV(true);
         try {
             const content = await file.text();
              console.log('[CSV Import] File content read, length:', content.length); // DEBUG Log
              if (!content.trim()) {
                  throw new Error('El archivo CSV está vacío.');
              }
             const parsedData = parseScheduleCSV(content);
             // Process the data using the template logic
             processCSVAsTemplate(parsedData);
         } catch (error) {
             console.error("[CSV Import] Error handling CSV file change:", error);
             const errorMessage = error instanceof Error ? error.message : 'No se pudo leer o procesar el archivo.';
             toast({
                 title: 'Error al Importar CSV',
                 description: errorMessage, // Display the improved error message
                 variant: 'destructive',
                 duration: 9000, // Slightly longer duration
             });
         } finally {
              console.log('[CSV Import] Finalizing file change handler.'); // DEBUG Log
             setIsImportingCSV(false);
             // Reset the file input so the same file can be selected again
             if (fileInputRef.current) {
                 fileInputRef.current.value = '';
             }
         }
     }, [parseScheduleCSV, processCSVAsTemplate, toast]); // Dependencies include the processing function

     // Trigger file input click
     const triggerCSVFileInput = () => {
         fileInputRef.current?.click();
     };


    // --- Template Export/Import JSON Handlers ---

    const handleExportTemplateJSON = (templateId: string) => {
         const templateToExport = scheduleTemplates.find(t => t.id === templateId);
         if (!templateToExport) {
             toast({ title: 'Template no encontrado', variant: 'destructive' });
             return;
         }
         try {
             const jsonString = JSON.stringify(templateToExport, null, 2); // Pretty print JSON
             const blob = new Blob([jsonString], { type: 'application/json' });
             const href = URL.createObjectURL(blob);
             const link = document.createElement('a');
             link.href = href;
             // Create a safe filename
             const locationNameSafe = locations.find(l => l.id === templateToExport.locationId)?.name.replace(/[^a-zA-Z0-9]/g, '_') || templateToExport.locationId;
             const templateNameSafe = templateToExport.name.replace(/[^a-zA-Z0-9]/g, '_');
             link.download = `template_${templateNameSafe}_${locationNameSafe}_${templateToExport.type}.json`;
             document.body.appendChild(link);
             link.click();
             document.body.removeChild(link);
             URL.revokeObjectURL(href);
             toast({ title: 'Template Exportado', description: `Template "${templateToExport.name}" exportado como JSON.` });
         } catch (error) {
             console.error("Error exporting template to JSON:", error);
             toast({ title: 'Error al Exportar Template', description: 'No se pudo generar el archivo JSON.', variant: 'destructive' });
         }
    };

    const handleImportTemplateJSON = async (event: ChangeEvent<HTMLInputElement>) => {
         const file = event.target.files?.[0];
         if (!file) return;
         console.log('[JSON Import] File selected:', file.name); // DEBUG Log

         setIsImportingJSON(true);
         try {
             const content = await file.text();
             console.log('[JSON Import] File content read, length:', content.length); // DEBUG Log
             if (!content.trim()) {
                 throw new Error('El archivo JSON está vacío.');
             }

             const parsedTemplate = JSON.parse(content);

             // --- Validate the imported template structure ---
             try {
                 templateFileSchema.parse(parsedTemplate); // Use Zod to validate
             } catch (validationError) {
                  console.error("Error validating JSON template:", validationError);
                  throw new Error(`El archivo JSON no tiene el formato de template esperado. Detalles: ${validationError instanceof z.ZodError ? validationError.errors.map(e => e.message).join(', ') : 'Formato inválido.'}`);
             }

             // Check if a template with the same ID already exists
             const existingIndex = scheduleTemplates.findIndex(t => t.id === parsedTemplate.id);

             let updatedTemplates;
             let toastTitle = '';
             let toastDescription = '';

             if (existingIndex > -1) {
                 // Template exists, ask user to confirm overwrite (or just overwrite for now)
                 // For simplicity, we'll overwrite here. Add confirmation dialog if needed.
                 updatedTemplates = [...scheduleTemplates];
                 updatedTemplates[existingIndex] = parsedTemplate;
                 toastTitle = 'Template Actualizado';
                 toastDescription = `El template "${parsedTemplate.name}" ha sido actualizado desde el archivo JSON.`;
                 console.log("[DEBUG JSON Import] Overwriting existing template:", parsedTemplate.id); // DEBUG Log
             } else {
                 // Template is new, add it
                 updatedTemplates = [...scheduleTemplates, parsedTemplate];
                 toastTitle = 'Template Importado';
                 toastDescription = `El template "${parsedTemplate.name}" ha sido importado y guardado.`;
                 console.log("[DEBUG JSON Import] Adding new template:", parsedTemplate.id); // DEBUG Log
             }

             setScheduleTemplates(updatedTemplates);
             toast({ title: toastTitle, description: toastDescription });

         } catch (error) {
             console.error("[JSON Import] Error handling JSON file change:", error);
             const errorMessage = error instanceof Error ? error.message : 'No se pudo leer o procesar el archivo JSON.';
             toast({
                 title: 'Error al Importar JSON',
                 description: errorMessage,
                 variant: 'destructive',
                 duration: 9000,
             });
         } finally {
             console.log('[JSON Import] Finalizing file change handler.'); // DEBUG Log
             setIsImportingJSON(false);
             // Reset the file input
             if (jsonInputRef.current) {
                 jsonInputRef.current.value = '';
             }
         }
     };

    // Trigger JSON file input click
    const triggerJSONInput = () => {
        jsonInputRef.current?.click();
    };

    // --- Export Current View as JSON Template ---
    const handleExportCurrentViewAsJSON = () => {
         let hasAssignments = false;
         let templateAssignments: ShiftTemplate['assignments'];
         const templateType = viewMode === 'day' ? 'daily' : 'weekly';
         const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
         const defaultTemplateName = `${templateType === 'daily' ? 'Diario' : 'Semanal'}_${locations.find(l => l.id === selectedLocationId)?.name || 'Sede'}_${timestamp}`;

         if (templateType === 'daily') {
             const sourceDate = targetDate;
             const currentDayKey = format(sourceDate, 'yyyy-MM-dd');
             const currentAssignmentsRaw = scheduleData[currentDayKey]?.assignments || {};
             const cleanedAssignments: DailyAssignments = {};
             Object.keys(currentAssignmentsRaw).forEach(deptId => {
                  if (currentAssignmentsRaw[deptId]?.length > 0) {
                     cleanedAssignments[deptId] = currentAssignmentsRaw[deptId].map(({ id, employee, ...rest }) => ({
                          ...rest,
                          employee: { id: employee.id }
                     }));
                     hasAssignments = true;
                  }
             });
             templateAssignments = cleanedAssignments;
         } else { // Weekly template
             templateAssignments = {};
             weekDates.forEach(date => {
                 const dateKey = format(date, 'yyyy-MM-dd');
                 const dailyAssignmentsRaw = scheduleData[dateKey]?.assignments || {};
                 const cleanedDailyAssignments: DailyAssignments = {};
                 let dayHasData = false;
                 Object.keys(dailyAssignmentsRaw).forEach(deptId => {
                      if (dailyAssignmentsRaw[deptId]?.length > 0) {
                         cleanedDailyAssignments[deptId] = dailyAssignmentsRaw[deptId].map(({ id, employee, ...rest }) => ({
                             ...rest,
                             employee: { id: employee.id }
                         }));
                         dayHasData = true;
                         hasAssignments = true;
                      }
                 });
                 if (dayHasData) {
                      (templateAssignments as WeeklyAssignments)[dateKey] = cleanedDailyAssignments;
                 }
             });
         }

         if (!hasAssignments) {
             const contextDescription = viewMode === 'day' ? `el ${format(targetDate, 'PPP', { locale: es })}` : 'la semana actual';
             toast({ title: 'Horario Vacío', description: `No hay turnos asignados en ${contextDescription} para exportar.`, variant: 'default' });
             return;
         }

         const templateToExport: Omit<ShiftTemplate, 'id' | 'createdAt'> & { id?: string; createdAt?: string } = {
             name: defaultTemplateName, // Use a default name or prompt user later
             locationId: selectedLocationId,
             type: templateType,
             assignments: templateAssignments,
         };

         // Simulate the full template structure for export
         const fullTemplateToExport: ShiftTemplate = {
             id: `tpl-export-${Date.now()}`, // Temporary ID for export file
             createdAt: new Date().toISOString(),
             ...templateToExport,
         };

         try {
             const jsonString = JSON.stringify(fullTemplateToExport, null, 2);
             const blob = new Blob([jsonString], { type: 'application/json' });
             const href = URL.createObjectURL(blob);
             const link = document.createElement('a');
             link.href = href;
             const locationNameSafe = locations.find(l => l.id === selectedLocationId)?.name.replace(/[^a-zA-Z0-9]/g, '_') || selectedLocationId;
             link.download = `Horario_${locationNameSafe}_${templateType}_${timestamp}.json`;
             document.body.appendChild(link);
             link.click();
             document.body.removeChild(link);
             URL.revokeObjectURL(href);
             toast({ title: 'Horario Exportado (JSON)', description: `El horario actual se exportó como ${link.download}.` });
         } catch (error) {
             console.error("Error exporting current view to JSON:", error);
             toast({ title: 'Error al Exportar Horario', description: 'No se pudo generar el archivo JSON del horario actual.', variant: 'destructive' });
         }
     };



    const DndWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
        // Disable DndContext completely on mobile
        if (isMobile || !isClient) {
            return <>{children}</>;
        }
        // Render DndContext only on desktop and client-side
        return (
            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                {children}
            </DndContext>
        );
    };

    const handleExportCSV = () => {
        const dataToExport: any[] = [];
        // Updated headers to match import expectations and use 24hr format for export
        const headers = [
            'ID_Empleado',
            'Nombre_Empleado', // Keep for info, but not needed for re-import
            'Fecha', // Keep YYYY-MM-DD format
            'Departamento',
            'Hora_Inicio', // Export as HH:mm
            'Hora_Fin',    // Export as HH:mm
            'Incluye_Descanso', // 'Sí' or 'No'
            'Inicio_Descanso', // Export as HH:mm or empty
            'Fin_Descanso',    // Export as HH:mm or empty
            'Horas_Trabajadas', // Keep for info
        ];
        dataToExport.push(headers);

        weekDates.forEach(date => {
            const dateKey = format(date, 'yyyy-MM-dd');
            const daySchedule = scheduleData[dateKey];

            if (daySchedule) {
                Object.entries(daySchedule.assignments).forEach(([deptId, assignments]) => {
                    const department = departments.find(d => d.id === deptId);
                    assignments.forEach(assignment => {
                         const employee = employees.find(emp => emp.id === assignment.employee.id);
                         if (!employee) return; // Skip if employee details not found (should not happen ideally)

                        const durationHours = calculateShiftDuration(assignment, date);
                        dataToExport.push([
                            employee.id,
                            employee.name,
                            dateKey,
                            department?.name || deptId, // Use department name if found
                            assignment.startTime, // Export HH:mm
                            assignment.endTime,   // Export HH:mm
                            assignment.includeBreak ? 'Sí' : 'No',
                            assignment.includeBreak ? assignment.breakStartTime : '', // Export HH:mm or empty
                            assignment.includeBreak ? assignment.breakEndTime : '',     // Export HH:mm or empty
                            durationHours.toFixed(2), // Format hours
                        ]);
                    });
                });
            }
        });


        if (dataToExport.length <= 1) { // Only headers means no data
            toast({ title: 'Sin Datos', description: 'No hay turnos asignados en la semana actual para exportar.', variant: 'default' });
            return;
        }

        // Create CSV content
        const csvContent = "data:text/csv;charset=utf-8,"
             + dataToExport.map(row =>
                   // Cambia esta línea para NO añadir comillas alrededor:
                   row.map((field: string | number | undefined) => String(field ?? '')).join(",") // <-- Modificada: Sin comillas añadidas
             ).join("\n");



        // Trigger download
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        // Create a safe filename
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
        // Prepare data specifically for the PDF export function
        const dataForPDF = {
            locationName,
            weekDates,
            departments: filteredDepartments, // Use filtered departments for the current location
            employees: employees, // Pass the full list (the PDF function might filter or group)
            scheduleData,
            getScheduleForDate: (date: Date) => getScheduleForDate(date),
            calculateShiftDuration, // Pass the calculation function
        };

        try {
            exportScheduleToPDF(dataForPDF); // Call the export function
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
            const daySchedule = getScheduleForDate(targetDate);
            let dayHasAssignments = false;

            filteredDepartments.forEach(dept => {
                const assignments = daySchedule.assignments[dept.id] || [];
                if (assignments.length > 0) {
                    dayHasAssignments = true;
                    textToCopy += `*${dept.name}*\n`;
                    assignments.forEach(a => {
                         const employeeName = a.employee?.name || `(ID: ${a.employee?.id || '??'})`;
                        // Format times using helper
                        textToCopy += `- ${employeeName}: ${formatTo12Hour(a.startTime)} - ${formatTo12Hour(a.endTime)}`;
                        if (a.includeBreak && a.breakStartTime && a.breakEndTime) {
                             textToCopy += ` (D: ${formatTo12Hour(a.breakStartTime)}-${formatTo12Hour(a.breakEndTime)})`;
                        }
                        textToCopy += "\n";
                    });
                    textToCopy += "\n"; // Add space between departments
                }
            });
             if (!dayHasAssignments) {
                 textToCopy += "_No hay turnos asignados para este día._\n";
             }

        } else { // Week View
            const weekStartFormatted = format(weekDates[0], 'dd MMM', { locale: es });
            const weekEndFormatted = format(weekDates[6], 'dd MMM yyyy', { locale: es });
            textToCopy = `*Horario ${locationName} - Semana ${weekStartFormatted} al ${weekEndFormatted}*\n\n`;
            let weekHasAssignments = false;

            weekDates.forEach(date => {
                const dateStr = format(date, 'EEEE dd', { locale: es });
                const daySchedule = getScheduleForDate(date);
                let dayHasAssignments = false;
                let dayText = `*${dateStr.charAt(0).toUpperCase() + dateStr.slice(1)}:*\n`; // Capitalize day name

                filteredDepartments.forEach(dept => {
                     const assignments = daySchedule.assignments[dept.id] || [];
                     if (assignments.length > 0) {
                         dayHasAssignments = true;
                         weekHasAssignments = true;
                         dayText += `_${dept.name}_\n`; // Italicize department name
                         assignments.forEach(a => {
                              const employeeName = a.employee?.name || `(ID: ${a.employee?.id || '??'})`;
                              // Format times using helper
                             dayText += `- ${employeeName}: ${formatTo12Hour(a.startTime)} - ${formatTo12Hour(a.endTime)}`;
                            if (a.includeBreak && a.breakStartTime && a.breakEndTime) {
                                // Format break times
                                dayText += ` (D: ${formatTo12Hour(a.breakStartTime)}-${formatTo12Hour(a.breakEndTime)})`;
                            }
                             dayText += "\n";
                         });
                     }
                });

                // Only add the day's text if it has assignments
                if (dayHasAssignments) {
                    textToCopy += dayText + "\n"; // Add space between days
                }
            });
             if (!weekHasAssignments) {
                 textToCopy += "_No hay turnos asignados para esta semana._\n";
             }
        }

        // Prevent copying if no meaningful content generated
        if (!textToCopy || textToCopy.trim() === `*Horario ${locationName} - Semana ${format(weekDates[0], 'dd MMM', { locale: es })} al ${format(weekDates[6], 'dd MMM yyyy', { locale: es })}*` || textToCopy.includes("_No hay turnos asignados")) {
            toast({ title: 'Sin Horario', description: 'No hay turnos asignados para compartir.', variant: 'default' });
            return;
        }


        // Attempt to copy to clipboard
        try {
            await navigator.clipboard.writeText(textToCopy);
            toast({ title: 'Horario Copiado', description: 'El horario ha sido copiado al portapapeles. Puedes pegarlo en WhatsApp.' });
        } catch (err) {
            console.error('Error al copiar al portapapeles:', err);
            toast({ title: 'Error al Copiar', description: 'No se pudo copiar el horario.', variant: 'destructive' });
        }
     };

     // Function to copy Employee ID
     const handleCopyEmployeeId = async (employeeId: string) => {
         try {
             await navigator.clipboard.writeText(employeeId);
             toast({ title: 'ID Copiado', description: `ID ${employeeId} copiado al portapapeles.` });
         } catch (err) {
             console.error('Error al copiar ID:', err);
             toast({ title: 'Error al Copiar', description: 'No se pudo copiar el ID.', variant: 'destructive' });
         }
     };

    // Ensure this return statement is inside the component function
    return (
        <main className="container mx-auto p-4 md:p-8 max-w-full">
             {/* Title */}
             <div className="text-center mb-6 md:mb-8">
                 <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary via-foreground/80 to-primary">
                    Planificador de Horarios
                 </h1>
                 <p className="text-sm sm:text-base text-muted-foreground mt-1 md:mt-2">Gestiona turnos, sedes y colaboradores</p>
             </div>

              {/* Hidden file input for CSV */}
              <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleCSVFileChange}
                  accept=".csv"
                  className="hidden"
              />
              {/* Hidden file input for JSON template */}
               <input
                  type="file"
                  ref={jsonInputRef}
                  onChange={handleImportTemplateJSON}
                  accept=".json"
                  className="hidden"
               />

             {/* Controls Section - Top Bar */}
             {/* Card removed to hide the background/border */}
             <div className="mb-6 md:mb-8 p-0 bg-transparent"> {/* Changed padding to 0, removed background */}
                  <div className="flex flex-col md:flex-row items-center justify-center gap-4 flex-wrap">

                       {/* Sede Selector */}
                       <div className="flex items-center gap-2">
                           <Building className="h-5 w-5 text-primary" />
                           <LocationSelector
                               locations={locations}
                               selectedLocationId={selectedLocationId}
                               onLocationChange={handleLocationChange}
                           />
                       </div>
                         {/* Configuration Button - Moved next to location */}
                       <div className="flex items-center gap-2">
                          <Dialog open={isConfigModalOpen} onOpenChange={setIsConfigModalOpen}>
                              <DialogTrigger asChild>
                                  <Button variant="ghost" size="icon" title="Configuración"> {/* Changed to ghost */}
                                      <Settings className="h-5 w-5"/>
                                  </Button>
                              </DialogTrigger>
                              {/* Configuration Modal Content */}
                              <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                                  <DialogHeader>
                                      <DialogTitle>Configuración General</DialogTitle>
                                      <DialogDescription>Gestiona sedes, departamentos y colaboradores.</DialogDescription>
                                  </DialogHeader>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
                                      {/* Locations Column */}
                                      <div className="space-y-4 border-r pr-4 md:border-r-0 md:pb-0">
                                          <div className="flex justify-between items-center mb-2">
                                              <h4 className="font-semibold text-foreground flex items-center gap-1"><Building className="h-4 w-4 text-muted-foreground"/>Sedes ({locations.length})</h4>
                                              <Button variant="outline" size="sm" onClick={() => handleOpenLocationModal(null)} title="Agregar Sede">
                                                  <Plus className="h-4 w-4" />
                                              </Button>
                                          </div>
                                          <ScrollArea className="h-[40vh]">
                                              <ul className="space-y-2 text-sm pr-2">
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
                                                                              Eliminar Sede "{itemToDelete?.name}"? Se eliminarán sus departamentos, los colaboradores asociados se desvincularán (si no tienen más sedes), y se borrarán templates y turnos relacionados. Esta acción no se puede deshacer.
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
                                          </ScrollArea>
                                      </div>
                                      {/* Departments Column */}
                                      <div className="space-y-4 border-r pr-4 md:border-r-0 md:pb-0">
                                          <div className="flex justify-between items-center mb-2">
                                              <h4 className="font-semibold text-foreground flex items-center gap-1"><Building2 className="h-4 w-4 text-muted-foreground"/>Departamentos ({departments.length})</h4>
                                              <Button variant="outline" size="sm" onClick={() => handleOpenDepartmentModal(null)} title="Agregar Departamento">
                                                  <Plus className="h-4 w-4" />
                                              </Button>
                                          </div>
                                           <ScrollArea className="h-[40vh]">
                                              <ul className="space-y-2 text-sm pr-2">
                                                  {departments.map((dep) => (
                                                      <li key={dep.id} className="flex items-center justify-between group py-1 border-b">
                                                          <span className="truncate text-muted-foreground flex items-center gap-1">
                                                               {dep.icon && <dep.icon className="h-3 w-3 mr-1 flex-shrink-0" />}
                                                               {dep.name} <span className="text-xs italic ml-1">({locations.find(l => l.id === dep.locationId)?.name || 'Sede?'})</span>
                                                          </span>
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
                                          </ScrollArea>
                                      </div>
                                      {/* Employees Column */}
                                      <div className="space-y-4">
                                          <div className="flex justify-between items-center mb-2">
                                              <h4 className="font-semibold text-foreground flex items-center gap-1"><Users className="h-4 w-4 text-muted-foreground"/>Colaboradores ({employees.length})</h4>
                                              <Button variant="outline" size="sm" onClick={() => handleOpenEmployeeModal(null)} title="Agregar Colaborador">
                                                  <Plus className="h-4 w-4" />
                                              </Button>
                                          </div>
                                          <ScrollArea className="h-[40vh]">
                                              <ul className="space-y-2 text-sm pr-2">
                                                  {employees.map((emp) => (
                                                      <li key={emp.id} className="flex items-center justify-between group py-1 border-b">
                                                          <span className="truncate text-muted-foreground">{emp.name} <span className="text-xs italic">(ID: {emp.id})</span></span>
                                                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
                                                               {/* Copy ID Button */}
                                                             <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => handleCopyEmployeeId(emp.id)} title="Copiar ID"><Copy className="h-4 w-4" /></Button>
                                                              {/* Edit Button */}
                                                              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => handleOpenEmployeeModal(emp)} title="Editar Colaborador"><Edit className="h-4 w-4" /></Button>
                                                              {/* Delete Button */}
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
                                          </ScrollArea>
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

                      {/* --- Day View Date Selector OR Week View Navigator --- */}
                      <div className="flex items-center justify-center gap-2">
                          {viewMode === 'day' ? (
                              <Popover>
                                  <PopoverTrigger asChild>
                                      <Button
                                          variant={'outline'}
                                          className={cn(
                                              'w-[200px] sm:w-[280px] justify-start text-left font-normal',
                                              !targetDate && 'text-muted-foreground',
                                              // Conditional border for holiday, primary color border
                                              isHoliday(targetDate) && 'border-primary font-semibold text-primary border-2'
                                          )}
                                          disabled={isCheckingHoliday}
                                      >
                                          {isCheckingHoliday ? (
                                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                          ) : (
                                              <CalendarModernIcon className="mr-2 h-4 w-4 text-primary" /> // Icon color
                                          )}
                                          {targetDate ? format(targetDate, 'PPP', { locale: es }) : <span>Selecciona fecha</span>}
                                          {isHoliday(targetDate) && !isCheckingHoliday && <span className="ml-auto text-xs font-semibold text-primary">(Festivo)</span>}
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
                                               holiday: 'text-primary font-medium border border-primary', // Style holiday
                                          }}
                                      />
                                  </PopoverContent>
                              </Popover>
                          ) : (
                              <WeekNavigator
                                  currentDate={currentDate}
                                  onPreviousWeek={handlePreviousWeek}
                                  onNextWeek={handleNextWeek}
                              />
                          )}
                      </div>

                      {/* View Mode Toggle */}
                      <div className="flex items-center justify-center gap-2">
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


                 </div>
             </div>


               {/* Main content grid */}
               <DndWrapper>
                   <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start mb-6">

                        {/* Employee List - Render only on desktop */}
                        {!isMobile && (
                             <div className="lg:col-span-2 space-y-4">
                                 <EmployeeList employees={availableEmployees} />
                             </div>
                        )}


                       <div className={cn(
                           "lg:col-span-10", // Takes 10 columns on large screens
                           isMobile && "lg:col-span-12", // Takes full width on mobile
                           "overflow-x-auto" // Always allow horizontal scroll if needed
                        )}>
                           <ScheduleView
                              departments={filteredDepartments}
                              scheduleData={scheduleData}
                              onRemoveShift={handleRemoveShift}
                              viewMode={viewMode}
                              weekDates={weekDates}
                              currentDate={targetDate} // Use targetDate for day view consistency
                              onAddShiftRequest={handleOpenEmployeeSelectionModal}
                              onShiftClick={handleShiftClick}
                              getScheduleForDate={getScheduleForDate}
                              onDuplicateDay={handleDuplicateDay}
                              onClearDay={handleConfirmClearDay}
                              isHoliday={isHoliday}
                              isMobile={isMobile}
                          />
                       </div>
                   </div>
               </DndWrapper>

                {/* --- Bottom Actions Row --- */}
                <div className="flex flex-wrap justify-end gap-2 mt-6">
                   <Button onClick={handleShareSchedule} variant="outline" className="hover:bg-primary hover:text-primary-foreground">
                       <Share2 className="mr-2 h-4 w-4" /> Compartir (Texto)
                   </Button>
                   <Button onClick={handleExportPDF} variant="outline" className="hover:bg-red-600 hover:text-white"> {/* Red Hover */}
                       <FileDown className="mr-2 h-4 w-4" /> PDF
                   </Button>
                   <Button onClick={handleExportCSV} variant="outline" className="hover:bg-green-600 hover:text-white"> {/* Green Hover */}
                       <FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar Horas (CSV)
                   </Button>
                   {viewMode === 'week' && (
                       <Button
                           variant="outline"
                           onClick={handleDuplicateWeek}
                           title="Duplicar semana completa a la siguiente"
                           className="hover:bg-primary hover:text-primary-foreground"
                       >
                           <CopyPlus className="mr-2 h-4 w-4" /> Duplicar Semana
                       </Button>
                   )}
                    {/* Template Buttons */}
                    <Button variant="outline" onClick={handleOpenTemplateSaveModal} title={`Guardar horario actual como template ${viewMode === 'day' ? 'diario' : 'semanal'}`}>
                       <Download className="mr-2 h-4 w-4" /> Guardar Template
                    </Button>
                     {/* Button to Show/Hide Template Loading Section */}
                     <Button variant="outline" onClick={() => setIsTemplateLoadSectionOpen(prev => !prev)} title="Cargar o gestionar templates">
                         <Upload className="mr-2 h-4 w-4" /> {isTemplateLoadSectionOpen ? 'Ocultar Templates' : 'Cargar Template'}
                     </Button>
                    {/* Export Current View as JSON Button */}
                    <Button variant="outline" onClick={handleExportCurrentViewAsJSON} title={`Exportar horario actual (${viewMode === 'day' ? 'Día' : 'Semana'}) como archivo JSON`}>
                        <FileJson className="mr-2 h-4 w-4" /> Exportar Horario (JSON)
                    </Button>
                     {/* CSV Import Button */}
                     <Button
                         variant="outline"
                         onClick={triggerCSVFileInput}
                         disabled={isImportingCSV}
                         title="Importar Horario desde CSV (como Template)"
                     >
                         {isImportingCSV ? (
                             <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                         ) : (
                             <FileUp className="mr-2 h-4 w-4" />
                         )}
                         Importar CSV
                     </Button>

                   <Button onClick={handleSaveSchedule} variant="default" className="hover:bg-primary/90"> {/* Changed to default variant */}
                       <Save className="mr-2 h-4 w-4" /> Guardar Horario
                   </Button>

               </div>

               {/* --- Section to Display and Load Saved Templates (Conditional) --- */}
              {isTemplateLoadSectionOpen && (
                   <Card className="mt-8 shadow-lg bg-card">
                       <CardHeader>
                            <CardTitle className="text-lg text-foreground">Templates Guardados</CardTitle>
                            <CardDescription>
                                Carga un template para la vista actual ({viewMode === 'day' ? 'Diario' : 'Semanal'}) y la sede seleccionada. Se sobrescribirá el horario actual.
                                También puedes exportar o importar templates en formato JSON.
                            </CardDescription>
                       </CardHeader>
                       <CardContent>
                           {filteredTemplates.length > 0 ? (
                               <ScrollArea className="h-[200px] pr-4">
                                   <ul className="space-y-2">
                                       {filteredTemplates.map(template => (
                                           <li key={template.id} className="flex justify-between items-center group border p-2 rounded-md hover:bg-accent">
                                               <span className="text-sm text-foreground truncate pr-2">{template.name}</span>
                                               <div className="flex items-center gap-1 flex-shrink-0">
                                                   <Button
                                                       variant="default"
                                                       size="sm"
                                                       className="h-7 px-2"
                                                       onClick={() => handleLoadTemplate(template.id)}
                                                       title="Cargar este template"
                                                   >
                                                       <Upload className="h-4 w-4" />
                                                   </Button>
                                                    {/* Export Template JSON Button (Moved here too) */}
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className="h-7 w-7"
                                                        onClick={() => handleExportTemplateJSON(template.id)}
                                                        title="Exportar Template a JSON"
                                                    >
                                                        <Download className="h-4 w-4" />
                                                    </Button>
                                                   <AlertDialog>
                                                       <AlertDialogTrigger asChild>
                                                           <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive opacity-50 group-hover:opacity-100" title="Eliminar template">
                                                               <Trash2 className="h-4 w-4" />
                                                           </Button>
                                                       </AlertDialogTrigger>
                                                       <AlertDialogContent>
                                                           <AlertDialogHeader>
                                                               <AlertDialogTitle>¿Eliminar Template?</AlertDialogTitle>
                                                               <AlertDialogDescription>
                                                                   Eliminar el template "{template.name}"? Esta acción no se puede deshacer.
                                                               </AlertDialogDescription>
                                                           </AlertDialogHeader>
                                                           <AlertDialogFooter>
                                                               <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancelar</AlertDialogCancel>
                                                               {/* Correctly trigger delete */}
                                                               <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => confirmDeleteItem('template', template.id, template.name)}>Eliminar</AlertDialogAction>
                                                           </AlertDialogFooter>
                                                       </AlertDialogContent>
                                                   </AlertDialog>
                                               </div>
                                           </li>
                                       ))}
                                   </ul>
                               </ScrollArea>
                           ) : (
                               <p className="text-center text-muted-foreground italic py-4">No hay templates guardados para esta vista/sede.</p>
                           )}
                       </CardContent>
                        <CardFooter className="flex justify-between items-center border-t pt-4">
                             {/* Import JSON Template Button */}
                             <Button variant="outline" onClick={triggerJSONInput} disabled={isImportingJSON} title="Importar Template desde Archivo JSON">
                                 {isImportingJSON ? (
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                 ) : (
                                      <Upload className="mr-2 h-4 w-4" />
                                 )}
                                 Importar Template (JSON)
                             </Button>
                            <Button variant="secondary" onClick={() => setIsTemplateLoadSectionOpen(false)}>Cerrar</Button>
                       </CardFooter>
                   </Card>
              )}


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
                               <Label htmlFor="employee-locations">Sedes Asignadas</Label>
                                {/* Use Dropdown Menu for multi-select */}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" className="w-full justify-start">
                                            {employeeFormData.locationIds.length > 0
                                                ? employeeFormData.locationIds
                                                      .map(id => locations.find(l => l.id === id)?.name)
                                                      .filter(Boolean) // Remove undefined if location not found
                                                      .join(', ')
                                                : 'Selecciona sedes'}
                                            <ChevronsUpDown className="ml-auto h-4 w-4 opacity-50"/>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-full">
                                        <DropdownMenuLabel>Selecciona Sedes</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        {locations.map(loc => (
                                            <DropdownMenuCheckboxItem
                                                key={loc.id}
                                                checked={employeeFormData.locationIds.includes(loc.id)}
                                                onCheckedChange={() => handleToggleEmployeeLocation(loc.id)}
                                                // Prevent closing the menu on item selection
                                                onSelect={(e) => e.preventDefault()}
                                            >
                                                {loc.name}
                                            </DropdownMenuCheckboxItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                {employeeFormData.locationIds.length === 0 && <p className="text-xs text-destructive mt-1">Debes seleccionar al menos una sede.</p>}
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
                              {itemToDelete?.type === 'location' && `Eliminar Sede "${itemToDelete?.name}"? Se eliminarán sus departamentos, los colaboradores asociados se desvincularán (si no tienen más sedes), y se borrarán templates y turnos relacionados. Esta acción no se puede deshacer.`}
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
             <Dialog open={isTemplateSaveModalOpen} onOpenChange={setIsTemplateSaveModalOpen}>
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


        </main>
    );
}
