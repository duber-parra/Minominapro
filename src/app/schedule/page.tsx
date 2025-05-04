{// src/app/schedule/page.tsx
'use client'; // Ensure this directive is present

import React, { useState, useEffect, useCallback, useMemo, useRef, ChangeEvent, DragEvent } from 'react';
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import Image from 'next/image'; // Import next/image
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Edit, ChevronsLeft, ChevronsRight, Calendar as CalendarModernIcon, Users, Building, Building2, MinusCircle, ChevronsUpDown, Settings, Save, CopyPlus, Eraser, Download, FileX2, FileDown, PencilLine, Share2, Loader2, Check, Copy, Upload, FolderUp, FileJson, List, UploadCloud, FileText, NotebookPen, CalendarX, FolderSync, BarChartHorizontal, Library } from 'lucide-react'; // Added Library
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetClose,
} from "@/components/ui/sheet"; // Import Sheet components


import { LocationSelector } from '@/components/schedule/LocationSelector';
import { EmployeeList } from '@/components/schedule/EmployeeList';
import { ScheduleView } from '@/components/schedule/ScheduleView';
import { ShiftDetailModal } from '@/components/schedule/ShiftDetailModal';
import { WeekNavigator } from '@/components/schedule/WeekNavigator';
import { ScheduleTemplateList } from '@/components/schedule/ScheduleTemplateList'; // Import ScheduleTemplateList
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { EmployeeSelectionModal } from '@/components/schedule/EmployeeSelectionModal';
import { ScheduleNotesModal } from '@/components/schedule/ScheduleNotesModal';


import type { Location, Department, Employee, ShiftAssignment, ScheduleData, DailyAssignments, WeeklyAssignments, ScheduleTemplate, ScheduleNote } from '@/types/schedule';
import { startOfWeek, endOfWeek, addDays, format, addWeeks, subWeeks, parseISO, getYear, isValid, differenceInMinutes, parse as parseDateFnsInternal, isSameDay, isWithinInterval, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { getColombianHolidays } from '@/services/colombian-holidays';
import { exportScheduleToPDF } from '@/lib/schedule-pdf-exporter';
import { formatTo12Hour } from '@/lib/time-utils';
import { parse as parseDateFns } from 'date-fns';


// Helper to generate dates for the current week
const getWeekDates = (currentDate: Date): Date[] => {
  const start = startOfWeek(currentDate, { weekStartsOn: 1 }); // Start on Monday
  return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
};

// LocalStorage Keys
const SCHEDULE_DATA_KEY = 'schedulePlannerData';
const SCHEDULE_NOTES_KEY = 'schedulePlannerNotes'; // Key for general notes
const SCHEDULE_EVENTS_KEY = 'scheduleCalendarEvents'; // Key for specific date notes/events
const LOCATIONS_KEY = 'schedulePlannerLocations';
const DEPARTMENTS_KEY = 'schedulePlannerDepartments';
const EMPLOYEES_KEY = 'schedulePlannerEmployees';
const SCHEDULE_TEMPLATES_KEY = 'schedulePlannerTemplates'; // Key for schedule templates

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
  { id: '101', name: 'Carlos Pérez', locationIds: ['loc-1'], departmentIds: ['dep-1'] }, // Added departmentIds
  { id: '102', name: 'Ana Rodriguez', locationIds: ['loc-1'], departmentIds: ['dep-2'] }, // Added departmentIds
  { id: '201', name: 'Luis Gómez', locationIds: ['loc-2'], departmentIds: ['dep-3'] }, // Added departmentIds
  { id: '202', name: 'Maria García', locationIds: ['loc-1', 'loc-2'], departmentIds: ['dep-1', 'dep-3'] }, // Example multi-location/dept employee
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
const loadFromLocalStorage = <T,>(key: string, defaultValue: T, isJson: boolean = true): T => {
    if (typeof window === 'undefined') {
        return defaultValue; // Return default during SSR
    }
    try {
        const savedData = localStorage.getItem(key);
        if (!savedData) return defaultValue;

        if (!isJson) {
            return savedData as unknown as T; // Return raw string if not JSON
        }

        const parsed = JSON.parse(savedData);

        // Basic check for array types
        if ([LOCATIONS_KEY, EMPLOYEES_KEY, DEPARTMENTS_KEY, SCHEDULE_TEMPLATES_KEY, SCHEDULE_EVENTS_KEY].includes(key)) {
            if (Array.isArray(parsed)) {
                  // Ensure employees have locationIds array and optional departmentIds
                  if (key === EMPLOYEES_KEY) {
                      return parsed.map((emp: any) => ({
                          ...emp,
                          locationIds: Array.isArray(emp.locationIds)
                              ? emp.locationIds
                              : (emp.primaryLocationId ? [emp.primaryLocationId] : []), // Convert old primaryLocationId
                          departmentIds: Array.isArray(emp.departmentIds) ? emp.departmentIds : [] // Ensure departmentIds is an array or empty array
                      })) as T;
                  }
                  // For ScheduleNotes, dates are already strings 'yyyy-MM-dd'
                  if (key === SCHEDULE_EVENTS_KEY) {
                      return parsed.filter(note => // Basic validation
                          note && typeof note === 'object' && note.id && note.date && note.note
                      ) as T;
                  }
                  // For Templates
                  if (key === SCHEDULE_TEMPLATES_KEY) {
                      return parsed.map(tpl => {
                          // Revive template createdAt date if needed
                          if (tpl.createdAt && typeof tpl.createdAt === 'string') {
                               try {
                                   return { ...tpl, createdAt: parseISO(tpl.createdAt) };
                               } catch (dateError) {
                                   console.warn(`Error parsing createdAt date for template ${tpl.id}:`, dateError);
                                   return { ...tpl, createdAt: new Date() }; // Use current date as fallback
                               }
                          }
                          return tpl;
                      }) as T;
                  }
                 return parsed as T;
            } else {
                console.warn(`[loadFromLocalStorage] Expected array for key ${key}, but found:`, typeof parsed, ". Returning default.");
                // If data exists but is not an array, remove it (except for notes and schedule data)
                if(key !== SCHEDULE_NOTES_KEY && key !== SCHEDULE_DATA_KEY) {
                    try {
                        localStorage.removeItem(key);
                        console.warn(`Removed invalid non-array item from localStorage for key: ${key}`);
                    } catch (removeError) {
                        console.error(`Error removing invalid item from localStorage for key ${key}:`, removeError);
                    }
                }
                return defaultValue; // Return default if type mismatch
            }
        } else if (key === SCHEDULE_DATA_KEY) {
            // More complex types might need more checks, but for now assume it's okay if it parses
            return parsed as T;
        } else if (key === SCHEDULE_NOTES_KEY) {
            // Special handling for notes (string) - no JSON parsing
            return (savedData ?? defaultValue) as T;
        } else {
            // For unknown keys, just return the parsed data if it's not null/undefined
            return parsed as T;
        }
    } catch (error) {
        // Handle JSON parsing errors or other potential issues
         if (error instanceof SyntaxError && key !== SCHEDULE_NOTES_KEY) { // Ignore parse error for plain text notes
             console.error(`Error parsing JSON from localStorage for key ${key}:`, error.message, "Saved data:", localStorage.getItem(key));
             // Don't remove notes on parse error, but remove others
             if (key !== SCHEDULE_NOTES_KEY) {
                 try {
                     localStorage.removeItem(key);
                     console.warn(`Removed invalid item from localStorage for key: ${key}`);
                 } catch (removeError) {
                     console.error(`Error removing invalid item from localStorage for key ${key}:`, removeError);
                 }
             }
         } else if (!(error instanceof SyntaxError)) { // Log other errors normally
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
                                     return { ...assign, employee: { id: assign.employee.id, name: `(ID: ${assign.employee.id})`, locationIds: [], departmentIds: [] } }; // Placeholder if employee not found
                                 }
                             }
                             return assign; // Should not happen if saved correctly
                         }).filter(Boolean); // Filter out any null entries if employee wasn't found
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

// New function to load templates
const loadScheduleTemplates = (): ScheduleTemplate[] => {
    if (typeof window === 'undefined') return []; // Solo en cliente

    const loadedTemplates: ScheduleTemplate[] = [];
    const templateKey = SCHEDULE_TEMPLATES_KEY; // Clave única para todos los templates

    try {
        const storedData = localStorage.getItem(templateKey);
        if (storedData) {
             try {
                const parsedTemplates = JSON.parse(storedData) as ScheduleTemplate[];
                if (Array.isArray(parsedTemplates)) {
                    parsedTemplates.forEach(template => {
                        // Validación básica
                        if (template && typeof template === 'object' && template.id && template.name) {
                            // Revivir fecha si es necesario
                             if (template.createdAt && typeof template.createdAt === 'string') {
                                 try {
                                     template.createdAt = parseISO(template.createdAt);
                                 } catch (dateError) {
                                     console.warn(`Error parsing createdAt date for template ${template.id}:`, dateError);
                                     template.createdAt = new Date(); // Fallback
                                 }
                             }
                            loadedTemplates.push(template);
                        } else {
                            console.warn(`Invalid template data found in ${templateKey}:`, template);
                        }
                    });
                } else {
                     console.warn(`Invalid data structure found for templates in ${templateKey}. Expected array.`);
                     localStorage.removeItem(templateKey); // Clean up invalid data
                }
             } catch (parseError) {
                 console.error(`Error parsing JSON for templates from ${templateKey}:`, parseError);
                 localStorage.removeItem(templateKey); // Clean up invalid JSON
             }
        }
    } catch (error) {
        console.error("Error loading templates from localStorage:", error);
    }

    console.log(`[loadScheduleTemplates] Loaded ${loadedTemplates.length} templates.`);
    return loadedTemplates;
};


// New interface for the summary data
interface EmployeeHoursSummary {
  id: string;
  name: string;
  totalHours: number;
}


export default function SchedulePage() {
    // --- State Initialization ---
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'day' | 'week'>('week');
    const [locations, setLocations] = useState<Location[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [scheduleData, setScheduleData] = useState<{ [dateKey: string]: ScheduleData }>({});
    const [scheduleNotes, setScheduleNotes] = useState<ScheduleNote[]>([]); // State for calendar notes/events
    const [isNotesModalOpen, setIsNotesModalOpen] = useState(false); // State for the notes modal
    const [isTemplateListModalOpen, setIsTemplateListModalOpen] = useState(false); // State for template list modal
    const [savedTemplates, setSavedTemplates] = useState<ScheduleTemplate[]>([]); // State for templates
    const [isSavingTemplate, setIsSavingTemplate] = useState<boolean>(false); // Loading state for saving template
    const [templateToDeleteId, setTemplateToDeleteId] = useState<string | null>(null); // State for template delete confirmation
    const [noteToDeleteId, setNoteToDeleteId] = useState<string | null>(null); // State for confirming note deletion
    const [notesModalForDate, setNotesModalForDate] = useState<Date | null>(null); // State to open notes modal for a specific date
    const [departmentMismatchWarning, setDepartmentMismatchWarning] = useState<{
        employee: Employee;
        targetDepartment: Department;
        date: Date;
    } | null>(null); // State for department mismatch warning

    // New state for the Summary Sheet
    const [isSummarySheetOpen, setIsSummarySheetOpen] = useState(false);
    const [employeeHoursSummary, setEmployeeHoursSummary] = useState<EmployeeHoursSummary[]>([]);


    const [notes, setNotes] = useState<string>(defaultNotesText); // Initialize with default general notes
    const [selectedLocationId, setSelectedLocationId] = useState<string>('');

    const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
    const [isEmployeeSelectionModalOpen, setIsEmployeeSelectionModalOpen] = useState(false);
    const [shiftRequestContext, setShiftRequestContext] = useState<{ departmentId: string; date: Date } | null>(null);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [editingShift, setEditingShift] = useState<{ assignment: ShiftAssignment; date: Date; departmentId: string } | null>(null);
    const [targetDate, setTargetDate] = useState<Date>(new Date());

    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

    const [editingLocation, setEditingLocation] = useState<Location | null>(null);
    const [locationFormData, setLocationFormData] = useState({ name: '' });

    const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
    const [departmentFormData, setDepartmentFormData] = useState<{name: string, locationId: string, iconName?: string}>({ name: '', locationId: '', iconName: undefined });


    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [employeeFormData, setEmployeeFormData] = useState<{ id: string, name: string, locationIds: string[], departmentIds: string[] }>({ id: '', name: '', locationIds: [], departmentIds: [] });


    const [itemToDelete, setItemToDelete] = useState<{ type: 'location' | 'department' | 'employee'; id: string; name: string } | null>(null);

    const [clearingDate, setClearingDate] = useState<Date | null>(null);
    const [clearingWeek, setClearingWeek] = useState<boolean>(false); // State for clearing week confirmation

    const [holidaySet, setHolidaySet] = useState<Set<string>>(new Set());
    const [isCheckingHoliday, setIsCheckingHoliday] = useState<boolean>(false);

    const [isClient, setIsClient] = useState(false);

    const isMobile = useIsMobile();
    const { toast } = useToast();

    // --- Load Data from localStorage on Mount (Client-side only) ---
    useEffect(() => {
        setIsClient(true); // Mark as client-side after mount
        const loadedLocations = loadFromLocalStorage(LOCATIONS_KEY, initialLocations);
        const loadedDepts = loadDepartmentsFromLocalStorage(initialDepartments);
        const loadedEmps = loadFromLocalStorage(EMPLOYEES_KEY, initialEmployees);
        const loadedSched = loadScheduleDataFromLocalStorage(loadedEmps, {});
        const loadedNotesStr = loadFromLocalStorage(SCHEDULE_NOTES_KEY, defaultNotesText, false); // Load general notes as string
        const loadedEvents = loadFromLocalStorage<ScheduleNote[]>(SCHEDULE_EVENTS_KEY, []); // Load calendar notes/events
        const loadedTpls = loadScheduleTemplates(); // Load templates using new function

        setLocations(loadedLocations);
        setDepartments(loadedDepts);
        setEmployees(loadedEmps);
        setScheduleData(loadedSched);
        setNotes(loadedNotesStr);
        setScheduleNotes(loadedEvents); // Set loaded calendar notes
        setSavedTemplates(loadedTpls); // Set loaded templates

        // Set initial selected location and update form defaults accordingly
        const initialSelectedLoc = loadedLocations.length > 0 ? loadedLocations[0].id : '';
        setSelectedLocationId(initialSelectedLoc);
        setDepartmentFormData(prev => ({ ...prev, locationId: initialSelectedLoc }));
        setEmployeeFormData(prev => ({ ...prev, locationIds: initialSelectedLoc ? [initialSelectedLoc] : [], departmentIds: [] })); // Initialize departmentIds

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
             try {
                 localStorage.setItem(LOCATIONS_KEY, JSON.stringify(locations));
             } catch (e) { console.error("Error saving locations:", e); }
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
             } catch (e) { console.error("Error saving departments:", e); }
         }
     }, [departments, isClient]);

     useEffect(() => {
         if (isClient) {
             try {
                 localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(employees));
             } catch (e) { console.error("Error saving employees:", e); }
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
                             (dataToSave[key].assignments[deptId] || []).forEach((assign: any) => {
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

     // --- Effect to save ScheduleNotes to localStorage ---
     useEffect(() => {
        if (isClient) {
            try {
                console.log("[Save Effect] Saving schedule notes:", scheduleNotes);
                localStorage.setItem(SCHEDULE_EVENTS_KEY, JSON.stringify(scheduleNotes));
                console.log("[Save Effect] Schedule notes saved successfully.");
            } catch (error) {
                console.error("Error saving schedule notes to localStorage:", error);
                toast({
                    title: 'Error al Guardar Notas de Calendario',
                    description: 'No se pudieron guardar las notas específicas.',
                    variant: 'destructive',
                });
            }
        }
    }, [scheduleNotes, isClient, toast]);

      // Effect to save templates
     useEffect(() => {
        if (isClient) {
            try {
                 console.log("Saving templates to localStorage:", savedTemplates); // Log before saving
                 // Use the single key for all templates
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
    }, [savedTemplates, isClient, toast]); // Add toast as a dependency if you are using it in this useEffect



    // ---- End LocalStorage Effects ---

    // --- Functions to Manage Schedule Notes ---
    const addScheduleNote = useCallback((newNoteData: Omit<ScheduleNote, 'id'>) => {
        const newNote: ScheduleNote = {
            ...newNoteData,
            id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        };
        setScheduleNotes(prevNotes => [...prevNotes, newNote].sort((a, b) => a.date.localeCompare(b.date)));
        toast({ title: "Anotación Guardada", description: `Nota para ${format(parseDateFns(newNoteData.date, 'yyyy-MM-dd', new Date()), 'PPP', { locale: es })} agregada.` });
    }, [toast]);

    const deleteScheduleNote = useCallback((noteId: string) => {
        setScheduleNotes(prevNotes => prevNotes.filter(note => note.id !== noteId));
        toast({ title: "Anotación Eliminada", variant: 'destructive' });
        setNoteToDeleteId(null); // Close the confirmation dialog after deletion
    }, [toast]);

    // Function to get notes for a specific date
     const getNotesForDate = useCallback((date: Date): ScheduleNote[] => {
         if (!date || !isValid(date)) return [];
         const dateKey = format(date, 'yyyy-MM-dd');
         return scheduleNotes.filter(note => note.date === dateKey);
     }, [scheduleNotes]);

    // Function to open the notes modal specifically for a date, filtering the notes
    const handleOpenNotesModalForDate = (date: Date) => {
        setNotesModalForDate(date); // Set the date context
        setIsNotesModalOpen(true);
    };

     // Memoize weekDates to prevent unnecessary recalculations
     const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate]);

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
                         return { ...assign, employee: { id: assign.employee?.id || 'unknown', name: `(ID: ${assign.employee?.id || '??'})`, locationIds: [], departmentIds: [] } };
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

    // Filter templates based on selected location and current view mode
     const filteredTemplates = useMemo(() => {
         console.log("[Filter Memo] All templates in state:", savedTemplates);
         const templatesArray = Array.isArray(savedTemplates) ? savedTemplates : [];
         const filtered = templatesArray.filter(temp => {
             const locationMatch = temp.locationId === selectedLocationId;
             const typeMatch = temp.type === viewMode;
              console.log(`[Filter Memo] Template ${temp.id} (${temp.name}): Loc Match=${locationMatch}, Type Match=${typeMatch}`);
             return locationMatch && typeMatch;
         });
         console.log(`[Filter Memo] Filtered templates for loc ${selectedLocationId}, view ${viewMode}:`, filtered);
         return filtered;
     }, [savedTemplates, selectedLocationId, viewMode]);



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
         // Determine the date for filtering based on viewMode and context
         const dateForFiltering = viewMode === 'day' ? targetDate : (shiftRequestContext?.date || null);

         // Get IDs of employees already assigned on the target date
         const assignedIdsOnDate = new Set<string>();
         if (dateForFiltering) {
             const dateKey = format(dateForFiltering, 'yyyy-MM-dd');
             const daySchedule = scheduleData[dateKey];
             if (daySchedule && daySchedule.assignments) {
                 Object.values(daySchedule.assignments).flat().forEach(assignment => {
                     assignedIdsOnDate.add(assignment.employee.id);
                 });
             }
         }

         // Filter employees based on selected location
         let potentiallyAvailable = filteredEmployees; // Start with all employees for the location

         // If EmployeeSelectionModal is open (indicated by shiftRequestContext having a departmentId),
         // filter strictly by department association.
         const deptForFiltering = shiftRequestContext?.departmentId;
         if (deptForFiltering) {
             potentiallyAvailable = potentiallyAvailable.filter(emp =>
                 emp.departmentIds?.includes(deptForFiltering)
             );
             // Also filter out employees already assigned on the target date
             potentiallyAvailable = potentiallyAvailable.filter(emp => !assignedIdsOnDate.has(emp.id));

              // Optionally, sort employees within the department first, then others
              potentiallyAvailable.sort((a, b) => {
                  const aInDept = a.departmentIds?.includes(deptForFiltering) ? -1 : 1; // Employees in dept first
                  const bInDept = b.departmentIds?.includes(deptForFiltering) ? -1 : 1;
                  if (aInDept !== bInDept) return aInDept - bInDept;
                  return a.name.localeCompare(b.name); // Secondary sort by name
              });
         } else if (viewMode === 'week' && !isMobile) {
             // For desktop week view (drag-and-drop list), show all employees for the location regardless of assignment status or department filtering context.
             // STILL filter out those assigned on the SPECIFIC date being interacted with if relevant? No, list should show all generally available.
              return [...filteredEmployees].sort((a, b) => a.name.localeCompare(b.name)); // Show all for location
         } else { // Day view or Mobile '+' initial state
             // Filter out employees already assigned on the target date
              potentiallyAvailable = potentiallyAvailable.filter(emp => !assignedIdsOnDate.has(emp.id));
              // Default sort by name if no specific department context for filtering
              potentiallyAvailable.sort((a, b) => a.name.localeCompare(b.name));
         }


         return potentiallyAvailable;

    }, [filteredEmployees, scheduleData, targetDate, viewMode, shiftRequestContext, isMobile]); // Added isMobile dependency


    const handleLocationChange = (locationId: string) => {
        setSelectedLocationId(locationId);
        // Update default location for NEW departments/employees when location changes
        setDepartmentFormData(prev => ({ ...prev, name: '', iconName: undefined, locationId: locationId })); // Reset name/icon too
        setEmployeeFormData(prev => ({ ...prev, id: '', name: '', locationIds: [locationId], departmentIds: [] })); // Reset name/id too
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

    const handleAddOrUpdateShift = (details: ShiftDetails) => { // Updated to ShiftDetails
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
                 // Check if already assigned on this specific DATE in ANY department
                 const isAlreadyAssignedOnDate = Object.values(currentDayData.assignments)
                                                .flat()
                                                .some(a => a.employee.id === employeeForShift.id);

                 if (isAlreadyAssignedOnDate) {
                     toast({
                         title: 'Asignación Duplicada',
                         description: `${employeeForShift.name} ya tiene un turno asignado para el ${format(date, 'PPP', { locale: es })}.`,
                         variant: 'destructive',
                     });
                     return prevData; // Do not update state if duplicate
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

        if (isMobile || !isClient || !over || !active) return;

        const employeeId = active.id as string;
        const targetData = over.data.current as { type: string; id: string; date?: string };

        if (!targetData || targetData.type !== 'department' || !targetData.date) {
            console.warn("Invalid drop target data:", targetData);
            return;
        }

        const targetDepartmentId = targetData.id;
        const dropDate = parseISO(targetData.date);

        const employee = employees.find(emp => emp.id === employeeId);
        const targetDepartment = departments.find(dept => dept.id === targetDepartmentId);
        if (!employee || !targetDepartment) return;

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
                 return;
             }
        }

        // Check for department mismatch
        const employeeDepartments = employee.departmentIds || [];
        if (employeeDepartments.length > 0 && !employeeDepartments.includes(targetDepartmentId)) {
            setDepartmentMismatchWarning({
                 employee,
                 targetDepartment,
                 date: dropDate
             });
             return; // Show warning and stop assignment for now
        }

        // If no mismatch or warning confirmed, proceed with opening the modal
        handleOpenShiftModalForDrop(employee, targetDepartmentId, dropDate);
    };


    // CRUD Handlers
    const handleOpenLocationModal = (location: Location | null) => {
        setEditingLocation(location);
        setLocationFormData({ name: location?.name || '' });
        setIsConfigModalOpen(true); // Open the main config modal
        // Optionally, you could add state to highlight the "Locations" section within the modal
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
        setIsConfigModalOpen(false); // Close modal after save
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
        setIsConfigModalOpen(true); // Open the main config modal
        // Optionally, add state to highlight the "Departments" section
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
        setIsConfigModalOpen(false); // Close modal after save
        setEditingDepartment(null);
    };

    const handleOpenEmployeeModal = (employee: Employee | null) => {
        setEditingEmployee(employee);
        // Ensure locationIds is always initialized as an array
        const initialLocationIds = Array.isArray(employee?.locationIds) ? employee.locationIds : (selectedLocationId ? [selectedLocationId] : []);
        // Ensure departmentIds is always initialized as an array
        const initialDepartmentIds = Array.isArray(employee?.departmentIds) ? employee.departmentIds : [];
        setEmployeeFormData({
            id: employee?.id || '',
            name: employee?.name || '',
            locationIds: initialLocationIds,
            departmentIds: initialDepartmentIds // Initialize departmentIds
        });
        setIsConfigModalOpen(true); // Open the main config modal
         // Optionally, add state to highlight the "Employees" section
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
             // Filter out departments that don't belong to the new set of locations
             const validDepartmentIds = (prev.departmentIds || []).filter(deptId => {
                 const dept = departments.find(d => d.id === deptId);
                 return dept && newLocationIds.includes(dept.locationId);
             });
            return { ...prev, locationIds: newLocationIds, departmentIds: validDepartmentIds };
        });
    };

    // Handle toggling department selection for an employee
    const handleToggleEmployeeDepartment = (departmentId: string) => {
        setEmployeeFormData(prev => {
            const currentIds = Array.isArray(prev.departmentIds) ? prev.departmentIds : [];
            let newDepartmentIds;
            if (currentIds.includes(departmentId)) {
                newDepartmentIds = currentIds.filter(id => id !== departmentId);
            } else {
                newDepartmentIds = [...currentIds, departmentId];
            }
            return { ...prev, departmentIds: newDepartmentIds };
        });
    };


    const handleSaveEmployee = () => {
         const id = employeeFormData.id.trim();
         const name = employeeFormData.name.trim();
         // Ensure locationIds is an array and has at least one selection, default to selectedLocationId if somehow empty
         const locationIds = Array.isArray(employeeFormData.locationIds) && employeeFormData.locationIds.length > 0
                             ? employeeFormData.locationIds
                             : (selectedLocationId ? [selectedLocationId] : []);
         // Ensure departmentIds is an array (can be empty)
         const departmentIds = Array.isArray(employeeFormData.departmentIds) ? employeeFormData.departmentIds : [];

          if (!id || !name) {
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

         const updatedEmployeeData: Employee = { id, name, locationIds, departmentIds }; // Include departmentIds

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
        setIsConfigModalOpen(false); // Close modal after save
        setEditingEmployee(null); // Reset editing state
    };

     // Filter departments available for employee assignment based on selected locations
     const availableDepartmentsForEmployee = useMemo(() => {
        if (!employeeFormData.locationIds || employeeFormData.locationIds.length === 0) {
            return [];
        }
        return departments.filter(dept => employeeFormData.locationIds.includes(dept.locationId));
     }, [departments, employeeFormData.locationIds]);


     // Confirm delete for locations, departments, employees
     const confirmDeleteItem = (type: 'location' | 'department' | 'employee', id: string, name: string) => {
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
                    const depsToDeleteLoc = departments.filter(dep => dep.locationId === itemToDelete.id).map(d => d.id);
                    // Remove associated departments
                    setDepartments(prevDeps => prevDeps.filter(dep => dep.locationId !== itemToDelete.id));
                    // Remove location association from employees, filter out employees with no locations left
                    setEmployees(prevEmps => prevEmps.map(emp => ({
                        ...emp,
                        locationIds: (emp.locationIds || []).filter(locId => locId !== itemToDelete.id), // Ensure locationIds is treated as array
                        // Also remove departments associated with the deleted location from the employee
                        departmentIds: (emp.departmentIds || []).filter(deptId => !depsToDeleteLoc.includes(deptId))
                    })).filter(emp => emp.locationIds.length > 0)); // Remove employees with no locations left

                     // Clean up schedule templates associated with the location
                     setSavedTemplates(prevTemplates => prevTemplates.filter(tpl => tpl.locationId !== itemToDelete.id));


                    // Clean up schedule data: remove assignments in departments of the deleted location
                     setScheduleData(prevSchedule => {
                         const updatedSchedule = { ...prevSchedule };
                         Object.keys(updatedSchedule).forEach(dateKey => {
                             let dayHasOtherAssignments = false;
                             const currentAssignments = updatedSchedule[dateKey].assignments;
                             const newAssignments: { [deptId: string]: ShiftAssignment[] } = {};
                             Object.keys(currentAssignments).forEach(deptId => {
                                 if (!depsToDeleteLoc.includes(deptId)) { // Keep assignments from other departments
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

                     // Clean up schedule templates containing this department (might be complex if a template spans multiple depts)
                     // Simple approach: Remove department's assignments within each template
                     setSavedTemplates(prevTemplates => prevTemplates.map(tpl => {
                         const newAssignments = { ...(tpl.assignments as DailyAssignments | WeeklyAssignments) }; // Type assertion needed
                         if (tpl.type === 'day') {
                             const dailyAssignments = newAssignments as DailyAssignments;
                             if (dailyAssignments[itemToDelete.id]) {
                                 delete dailyAssignments[itemToDelete.id];
                             }
                         } else if (tpl.type === 'week') {
                             const weeklyAssignments = newAssignments as WeeklyAssignments;
                             Object.keys(weeklyAssignments).forEach(dateKey => {
                                 if (weeklyAssignments[dateKey]?.[itemToDelete.id]) { // Check if dateKey exists
                                     delete weeklyAssignments[dateKey][itemToDelete.id];
                                 }
                             });
                         }
                         return { ...tpl, assignments: newAssignments };
                     }));

                     // Remove department from employees' departmentIds
                     setEmployees(prevEmps => prevEmps.map(emp => ({
                        ...emp,
                        departmentIds: (emp.departmentIds || []).filter(deptId => deptId !== itemToDelete.id)
                     })));

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

                     // Clean up schedule templates by removing assignments for this employee
                     setSavedTemplates(prevTemplates => prevTemplates.map(tpl => {
                         const newAssignments = { ...(tpl.assignments as DailyAssignments | WeeklyAssignments) };
                         if (tpl.type === 'day') {
                             const dailyAssignments = newAssignments as DailyAssignments;
                             Object.keys(dailyAssignments).forEach(deptId => {
                                 dailyAssignments[deptId] = dailyAssignments[deptId].filter(a => a.employee.id !== itemToDelete.id);
                             });
                         } else if (tpl.type === 'week') {
                             const weeklyAssignments = newAssignments as WeeklyAssignments;
                             Object.keys(weeklyAssignments).forEach(dateKey => {
                                 Object.keys(weeklyAssignments[dateKey] || {}).forEach(deptId => { // Check if dateKey exists
                                     weeklyAssignments[dateKey][deptId] = weeklyAssignments[dateKey][deptId].filter(a => a.employee.id !== itemToDelete.id);
                                 });
                             });
                         }
                         return { ...tpl, assignments: newAssignments };
                     }));

                     message = `Colaborador "${itemToDelete.name}" eliminado.`;
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
                       assign.employee = { id: assign.employee.id, name: `(ID: ${assign.employee.id})`, locationIds: [], departmentIds: [] }; // Placeholder
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

     const handleDuplicateWeek = useCallback(() => {
         const nextWeekStartDate = addWeeks(startOfWeek(currentDate, { weekStartsOn: 1 }), 1);
         let updatedData = { ...scheduleData };
         let duplicatedCount = 0;

         weekDates.forEach(sourceDate => {
             const sourceDayKey = format(sourceDate, 'yyyy-MM-dd');
             const sourceDaySchedule = scheduleData[sourceDayKey];
             if (sourceDaySchedule && Object.keys(sourceDaySchedule.assignments).length > 0 && Object.values(sourceDaySchedule.assignments).some(dept => dept.length > 0)) {
                 const dayOfWeek = getDay(sourceDate);
                 const targetDateIndex = (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
                 if (targetDateIndex < 0 || targetDateIndex >= 7) {
                     console.error("Invalid target date index calculated:", targetDateIndex, "for date:", sourceDate);
                     return;
                 }
                 const targetDate = addDays(nextWeekStartDate, targetDateIndex);
                 const targetDayKey = format(targetDate, 'yyyy-MM-dd');
                 const duplicatedAssignments = JSON.parse(JSON.stringify(sourceDaySchedule.assignments));

                 Object.keys(duplicatedAssignments).forEach(deptId => {
                     duplicatedAssignments[deptId].forEach((assign: ShiftAssignment) => {
                         assign.id = `shift_${assign.employee.id}_${targetDayKey}_${assign.startTime.replace(':', '')}_${Math.random().toString(36).substring(2, 7)}`;
                         const fullEmployee = employees.find(emp => emp.id === assign.employee?.id);
                         assign.employee = fullEmployee || { id: assign.employee?.id || 'unknown', name: `(ID: ${assign.employee?.id || '??'})`, locationIds: [], departmentIds: [] };
                     });
                 });

                 updatedData[targetDayKey] = { date: targetDate, assignments: duplicatedAssignments };
                 duplicatedCount++;
             }
         });

         if (duplicatedCount > 0) {
             setScheduleData(updatedData);
             setCurrentDate(nextWeekStartDate);
             toast({ title: 'Semana Duplicada', description: `El horario de esta semana (${duplicatedCount} día(s)) se duplicó a la siguiente.` });
         } else {
             toast({ title: 'Nada que Duplicar', description: 'No hay turnos en la semana actual para duplicar.', variant: 'default' });
         }
     }, [currentDate, scheduleData, weekDates, employees, toast]);


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
                  delete updatedData[dateKey];
             }
             return updatedData;
         });
         // Also clear notes for the day being cleared
         setScheduleNotes(prevNotes => prevNotes.filter(note => note.date !== dateKey));

         setClearingDate(null); // Close the dialog
         toast({ title: 'Horario Limpiado', description: `Se eliminaron todos los turnos y notas para el ${format(clearingDate, 'PPP', { locale: es })}.`, variant: 'destructive' });
     };

     // --- Clear Week Handler ---
     const handleClearWeek = () => {
         const weekStartDate = startOfWeek(currentDate, { weekStartsOn: 1 });
         const weekEndDate = endOfWeek(currentDate, { weekStartsOn: 1 });
         const weekStartDateFormatted = format(weekStartDate, 'dd/MM/yy');
         const weekEndDateFormatted = format(weekEndDate, 'dd/MM/yy');

         setScheduleData(prevData => {
             const updatedData = { ...prevData };
             weekDates.forEach(date => {
                 const dateKey = format(date, 'yyyy-MM-dd');
                 if (updatedData[dateKey]) {
                     delete updatedData[dateKey];
                 }
                 // Also clear notes for each day in the week being cleared
                 setScheduleNotes(prevNotes => prevNotes.filter(note => note.date !== dateKey));
             });
             return updatedData;
         });
         setClearingWeek(false); // Close the confirmation dialog
         toast({
             title: 'Semana Limpiada',
             description: `Se eliminaron todos los turnos y notas de la semana del ${weekStartDateFormatted} al ${weekEndDateFormatted}.`,
             variant: 'destructive'
         });
     };


      // --- Template Handling ---
     const handleSaveTemplate = async () => {
        const templateName = prompt("Ingresa un nombre para el template:");
        if (!templateName) return;

        setIsSavingTemplate(true);
        try {
            const newTemplate: ScheduleTemplate = {
                id: `tpl-${Date.now()}`,
                name: templateName,
                locationId: selectedLocationId,
                type: viewMode,
                assignments: {}, // Initialize assignments
                createdAt: new Date(),
            };

            if (viewMode === 'day') {
                const dateKey = format(targetDate, 'yyyy-MM-dd');
                const dayData = scheduleData[dateKey];
                // Store only employee IDs in template assignments
                const templateAssignments: DailyAssignments = {};
                 if (dayData && dayData.assignments) {
                     Object.keys(dayData.assignments).forEach(deptId => {
                         templateAssignments[deptId] = dayData.assignments[deptId].map(({ id, employee, ...rest }) => ({
                             ...rest,
                             employee: { id: employee.id } // Store only employee ID
                         }));
                     });
                 }
                newTemplate.assignments = templateAssignments;
            } else { // week view
                const weeklyAssignments: WeeklyAssignments = {};
                weekDates.forEach(date => {
                    const dateKey = format(date, 'yyyy-MM-dd');
                    const dayData = scheduleData[dateKey];
                    const dailyTemplateAssignments: DailyAssignments = {};
                     if (dayData && dayData.assignments) {
                         Object.keys(dayData.assignments).forEach(deptId => {
                             dailyTemplateAssignments[deptId] = dayData.assignments[deptId].map(({ id, employee, ...rest }) => ({
                                 ...rest,
                                 employee: { id: employee.id } // Store only employee ID
                             }));
                         });
                     }
                     // Only include the date in the template if it has assignments
                     if (Object.keys(dailyTemplateAssignments).length > 0 && Object.values(dailyTemplateAssignments).some(dept => dept.length > 0)) {
                        weeklyAssignments[dateKey] = dailyTemplateAssignments;
                     }
                });
                newTemplate.assignments = weeklyAssignments;
            }

             // Check if the template actually contains any assignments
            const assignmentsCount = Object.values(newTemplate.assignments).reduce((acc, dayOrDept) => {
                 if (newTemplate.type === 'day') {
                     return acc + (dayOrDept as ShiftAssignment[]).length;
                 } else {
                     return acc + Object.values(dayOrDept as DailyAssignments).reduce((dayAcc, dept) => dayAcc + dept.length, 0);
                 }
             }, 0);

             if (assignmentsCount === 0) {
                 toast({ title: "Template Vacío", description: "No se guardó el template porque no tiene turnos asignados.", variant: "default" });
                 setIsSavingTemplate(false);
                 return;
             }


             // Add the new template to the state
             setSavedTemplates(prevTemplates => {
                const updatedTemplates = [...prevTemplates, newTemplate];
                 console.log("Updating saved templates state with:", updatedTemplates); // Log before setting state
                return updatedTemplates;
             });
            toast({ title: 'Template Guardado', description: `Template "${templateName}" guardado.` });
        } catch (error) {
            console.error("Error saving template:", error);
            toast({ title: 'Error al Guardar Template', description: 'No se pudo guardar el template.', variant: 'destructive' });
        } finally {
            setIsSavingTemplate(false);
        }
    };

    const handleLoadTemplate = useCallback((templateId: string) => {
        console.log("[Load Template] Attempting to load template with ID:", templateId);
        const templateToLoad = savedTemplates.find(t => t.id === templateId);

        if (!templateToLoad) {
            console.error("[Load Template] Template not found in state:", templateId);
            toast({ title: "Error", description: "No se encontró el template seleccionado.", variant: "destructive" });
            return;
        }
        console.log("[Load Template] Template found:", templateToLoad);

        // Validate template type matches current view mode
        if (templateToLoad.type !== viewMode) {
            toast({
                title: "Tipo de Template Incorrecto",
                description: `El template "${templateToLoad.name}" es ${templateToLoad.type === 'day' ? 'diario' : 'semanal'}. Cambia a la vista ${templateToLoad.type === 'day' ? 'diaria' : 'semanal'} para cargarlo.`,
                variant: "destructive",
                duration: 7000
            });
            return;
        }


        setScheduleData(prevScheduleData => {
            const updatedSchedule = { ...prevScheduleData };

            // Helper to hydrate assignments with full employee data
            const hydrateAndCreateAssignments = (
                templateAssignments: DailyAssignments,
                dateForAssignment: Date
            ): ScheduleData['assignments'] => {
                const hydrated: ScheduleData['assignments'] = {};
                const dateKey = format(dateForAssignment, 'yyyy-MM-dd');

                Object.keys(templateAssignments).forEach(deptId => {
                     // Check if department still exists
                     if (!departments.some(d => d.id === deptId)) {
                         console.warn(`Department ${deptId} from template not found, skipping assignments.`);
                         return;
                     }
                     // Ensure the department exists in the target location
                     if (!filteredDepartments.some(d => d.id === deptId)) {
                          console.warn(`Department ${deptId} from template does not belong to the current location (${selectedLocationId}), skipping assignments.`);
                         return;
                     }

                    hydrated[deptId] = (templateAssignments[deptId] || []).map(templateAssign => {
                        const fullEmployee = employees.find(emp => emp.id === templateAssign.employee.id);
                        if (!fullEmployee) {
                            console.warn(`Employee ${templateAssign.employee.id} from template not found, skipping assignment.`);
                            return null; // Skip assignment if employee doesn't exist
                        }
                        // Generate a new unique ID for the loaded assignment
                        const newId = `shift_${fullEmployee.id}_${dateKey}_${templateAssign.startTime.replace(':', '')}_${Math.random().toString(36).substring(2, 7)}`;
                        return { ...templateAssign, id: newId, employee: fullEmployee };
                    }).filter(assign => assign !== null) as ShiftAssignment[]; // Filter out skipped assignments
                });
                return hydrated;
            };

            if (templateToLoad.type === 'day') {
                const dateKey = format(targetDate, 'yyyy-MM-dd');
                const hydratedAssignments = hydrateAndCreateAssignments(templateToLoad.assignments as DailyAssignments, targetDate);
                // Overwrite assignments for the target date
                updatedSchedule[dateKey] = {
                    date: targetDate,
                    assignments: hydratedAssignments,
                };
                 console.log(`[Load Template] Applied DAY template assignments to ${dateKey}:`, hydratedAssignments);

            } else { // 'week'
                const weeklyTemplateAssignments = templateToLoad.assignments as WeeklyAssignments;

                 // Apply the template to the currently visible week dates
                weekDates.forEach((date) => {
                     const dateKey = format(date, 'yyyy-MM-dd');
                     const dailyAssignmentsFromTemplate = weeklyTemplateAssignments[dateKey];

                     if (dailyAssignmentsFromTemplate) {
                        // Hydrate assignments specifically for this date from the template
                        const hydratedAssignmentsForDay = hydrateAndCreateAssignments(dailyAssignmentsFromTemplate, date);

                        // Only update if there are actually assignments after hydration/validation
                        if (Object.keys(hydratedAssignmentsForDay).length > 0 && Object.values(hydratedAssignmentsForDay).some(dept => dept.length > 0)) {
                            updatedSchedule[dateKey] = {
                                date: date,
                                assignments: hydratedAssignmentsForDay,
                            };
                            console.log(`[Load Template] Applied WEEK template assignments to ${dateKey}:`, hydratedAssignmentsForDay);
                        } else if (updatedSchedule[dateKey]) {
                              // If template had an entry for the day, but validation removed all assignments, clear the schedule for that day
                              delete updatedSchedule[dateKey];
                              console.log(`[Load Template] Cleared assignments for ${dateKey} as template was empty or invalid after validation.`);
                          }
                     } else {
                        // If the template doesn't have data for this day, clear existing data for this day
                         if (updatedSchedule[dateKey]) {
                             delete updatedSchedule[dateKey];
                             console.log(`[Load Template] Cleared existing assignments for ${dateKey} as template had no data for this day.`);
                         }
                     }
                 });
            }

            return updatedSchedule;
        });

        toast({ title: "Template Aplicado", description: `Se aplicaron las asignaciones del template "${templateToLoad.name}".` });
        setIsTemplateListModalOpen(false); // Close modal after loading
    }, [savedTemplates, viewMode, targetDate, weekDates, scheduleData, setScheduleData, toast, employees, departments, filteredDepartments, selectedLocationId]); // Added dependencies


     const handleDeleteTemplate = (templateId: string) => {
         setSavedTemplates(prevTemplates => prevTemplates.filter(t => t.id !== templateId));
         toast({ title: 'Template Eliminado', variant: 'destructive' });
         setTemplateToDeleteId(null); // Close the confirmation dialog
     };

      // Function to trigger template deletion confirmation
      const confirmDeleteTemplate = (templateId: string) => {
          setTemplateToDeleteId(templateId);
      };


    // --- End Template Handling ---


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

     // Function to handle confirmation of department mismatch assignment
     const handleConfirmDepartmentMismatch = () => {
         if (departmentMismatchWarning) {
             const { employee, targetDepartment, date } = departmentMismatchWarning;
             handleOpenShiftModalForDrop(employee, targetDepartment.id, date);
             setDepartmentMismatchWarning(null); // Clear warning
         }
     };

    // --- Logic to Calculate Employee Hours Summary ---
    useEffect(() => {
        if (!isClient) return; // Don't run on server

        const calculateSummary = () => {
            const summaryMap = new Map<string, { id: string, name: string, totalHours: number }>();
            const datesInView = viewMode === 'day' ? [targetDate] : weekDates;

            datesInView.forEach(date => {
                if (!date || !isValid(date)) return; // Skip invalid dates

                const dateKey = format(date, 'yyyy-MM-dd');
                const daySchedule = scheduleData[dateKey];

                if (daySchedule && daySchedule.assignments) {
                    Object.values(daySchedule.assignments).flat().forEach(assignment => {
                        const employee = assignment.employee;
                        if (!employee || !employee.id) return; // Skip if employee info is missing

                        const duration = calculateShiftDuration(assignment, date);

                        if (summaryMap.has(employee.id)) {
                            summaryMap.get(employee.id)!.totalHours += duration;
                        } else {
                            summaryMap.set(employee.id, {
                                id: employee.id,
                                name: employee.name || `(ID: ${employee.id})`, // Use name or fallback
                                totalHours: duration,
                            });
                        }
                    });
                }
            });

            // Convert map to array and sort by total hours descending
            const summaryArray = Array.from(summaryMap.values()).sort((a, b) => b.totalHours - a.totalHours);
            setEmployeeHoursSummary(summaryArray);
        };

        calculateSummary();
        // Recalculate whenever scheduleData, viewMode, targetDate, or currentDate changes
    }, [scheduleData, viewMode, targetDate, currentDate, weekDates, isClient]); // Added isClient


    // Ensure this return statement is inside the component function
    return (
        <main className="container mx-auto p-4 md:p-8 max-w-full">
             {/* Decorative Images - Removed */}


             {/* Title */}
              <div className="text-center mb-6 md:mb-8">
                 <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary via-foreground/80 to-primary">
                    Planificador de Horarios
                 </h1>
                 <p className="text-sm sm:text-base text-muted-foreground mt-1 md:mt-2">Gestiona turnos, sedes y colaboradores</p>
             </div>


             {/* Controls Section - Top Bar - Hidden Card */}
              <div className="bg-transparent border-none shadow-none p-0 mb-6 md:mb-8">
                  <div className="flex flex-col md:flex-row items-center justify-center gap-4 flex-wrap p-0">
                     {/* Location Selector */}
                     <div className="flex items-center gap-2 flex-shrink-0">
                         <Building className="h-5 w-5 text-primary flex-shrink-0" />
                         <LocationSelector
                             locations={locations}
                             selectedLocationId={selectedLocationId}
                             onLocationChange={handleLocationChange}
                         />
                          {/* Settings Button Trigger */}
                           <Dialog open={isConfigModalOpen} onOpenChange={setIsConfigModalOpen}>
                               <DialogTrigger asChild>
                                   <Button variant="ghost" size="icon" title="Configuración">
                                       <Settings className="h-5 w-5"/>
                                   </Button>
                               </DialogTrigger>
                               <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                                  <DialogHeader>
                                      <DialogTitle>Configuración General</DialogTitle>
                                      <DialogDescription>Gestiona sedes, departamentos y colaboradores.</DialogDescription>
                                  </DialogHeader>
                                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4 flex-grow overflow-y-hidden"> {/* Changed to overflow-y-hidden */}
                                       {/* Locations Column */}
                                       <div className="flex flex-col space-y-4 border-r md:border-r-0 md:pr-4 h-full">
                                           <div className="flex justify-between items-center mb-2 flex-shrink-0">
                                               <h4 className="font-semibold text-foreground flex items-center gap-1"><Building className="h-4 w-4 text-muted-foreground"/>Sedes ({locations.length})</h4>
                                               <Button variant="outline" size="sm" onClick={() => handleOpenLocationModal(null)} title="Agregar Sede">
                                                   <Plus className="h-4 w-4" />
                                               </Button>
                                           </div>
                                           <ScrollArea className="h-[40vh]"> {/* Fixed height */}
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
                                                                                 Eliminar Sede "{itemToDelete?.name}"? Se eliminarán sus departamentos, los colaboradores asociados se desvincularán (si no tienen más sedes) y se borrarán turnos relacionados. Esta acción no se puede deshacer.
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
                                       <div className="flex flex-col space-y-4 border-r md:border-r-0 md:pr-4 h-full">
                                           <div className="flex justify-between items-center mb-2 flex-shrink-0">
                                               <h4 className="font-semibold text-foreground flex items-center gap-1"><Building2 className="h-4 w-4 text-muted-foreground"/>Departamentos ({departments.length})</h4>
                                               <Button variant="outline" size="sm" onClick={() => handleOpenDepartmentModal(null)} title="Agregar Departamento">
                                                   <Plus className="h-4 w-4" />
                                               </Button>
                                           </div>
                                           <ScrollArea className="h-[40vh]"> {/* Fixed height */}
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
                                                                                Eliminar Departamento "{itemToDelete?.name}"? Se eliminarán los turnos asociados en horarios. Esta acción no se puede deshacer.
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
                                       <div className="flex flex-col space-y-4 h-full">
                                           <div className="flex justify-between items-center mb-2 flex-shrink-0">
                                               <h4 className="font-semibold text-foreground flex items-center gap-1"><Users className="h-4 w-4 text-muted-foreground"/>Colaboradores ({employees.length})</h4>
                                               <Button variant="outline" size="sm" onClick={() => handleOpenEmployeeModal(null)} title="Agregar Colaborador">
                                                   <Plus className="h-4 w-4" />
                                               </Button>
                                           </div>
                                           <ScrollArea className="h-[40vh]"> {/* Fixed height */}
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
                                                                                Eliminar Colaborador "{itemToDelete?.name}"? Se eliminarán sus turnos asociados en horarios. Esta acción no se puede deshacer.
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
                                       {/* Location Form (inside footer for now) */}
                                       {editingLocation && (
                                          <div className="mt-4 p-4 border-t w-full">
                                               <h4 className="font-semibold mb-2 text-foreground">Editar Sede</h4>
                                               <Label htmlFor="location-name">Nombre</Label>
                                               <Input id="location-name" value={locationFormData.name} onChange={(e) => setLocationFormData({ name: e.target.value })} placeholder="Nombre de la Sede" className="mb-2" />
                                               <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" onClick={() => {setIsConfigModalOpen(false); setEditingLocation(null)}}>Cancelar</Button>
                                                    <Button onClick={handleSaveLocation}>Guardar Sede</Button>
                                               </div>
                                           </div>
                                       )}
                                       {/* Department Form */}
                                       {editingDepartment && (
                                           <div className="mt-4 p-4 border-t w-full">
                                               <h4 className="font-semibold mb-2 text-foreground">Editar Departamento</h4>
                                               <Label htmlFor="department-name">Nombre</Label>
                                               <Input id="department-name" value={departmentFormData.name} onChange={(e) => setDepartmentFormData(prev => ({ ...prev, name: e.target.value }))} placeholder="Nombre del Departamento" className="mb-2" />
                                               <Label htmlFor="department-location">Sede</Label>
                                                <Select value={departmentFormData.locationId} onValueChange={(value) => setDepartmentFormData(prev => ({ ...prev, locationId: value }))}>
                                                   <SelectTrigger id="department-location"><SelectValue /></SelectTrigger>
                                                   <SelectContent> {locations.map(loc => <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>)} </SelectContent>
                                               </Select>
                                                <Label htmlFor="department-icon" className="mt-2 block">Icono (Opcional)</Label>
                                                <Select value={departmentFormData.iconName} onValueChange={(value) => setDepartmentFormData(prev => ({ ...prev, iconName: value === 'ninguno' ? undefined : value }))}>
                                                     <SelectTrigger id="department-icon"><SelectValue placeholder="Selecciona icono" /></SelectTrigger>
                                                     <SelectContent>
                                                        <SelectItem value="ninguno">Ninguno</SelectItem>
                                                        {Object.keys(iconMap).map(iconName => <SelectItem key={iconName} value={iconName}><span className='flex items-center gap-2'>{React.createElement(iconMap[iconName], { className: 'h-4 w-4' })} {iconName}</span></SelectItem>)}
                                                     </SelectContent>
                                                </Select>
                                               <div className="flex justify-end gap-2 mt-4">
                                                    <Button variant="ghost" onClick={() => {setIsConfigModalOpen(false); setEditingDepartment(null)}}>Cancelar</Button>
                                                    <Button onClick={handleSaveDepartment}>Guardar Departamento</Button>
                                               </div>
                                           </div>
                                       )}
                                       {/* Employee Form */}
                                       {editingEmployee && (
                                          <div className="mt-4 p-4 border-t w-full">
                                               <h4 className="font-semibold mb-2 text-foreground">Editar Colaborador</h4>
                                               <Label htmlFor="employee-id">ID Colaborador</Label>
                                               <Input id="employee-id" value={employeeFormData.id} onChange={(e) => setEmployeeFormData(prev => ({ ...prev, id: e.target.value }))} placeholder="ID del Colaborador" className="mb-2" />
                                               <Label htmlFor="employee-name">Nombre</Label>
                                               <Input id="employee-name" value={employeeFormData.name} onChange={(e) => setEmployeeFormData(prev => ({ ...prev, name: e.target.value }))} placeholder="Nombre Completo" className="mb-2" />

                                               {/* Location Multi-Select */}
                                               <Label className="mt-2 block">Sedes</Label>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="outline" className="w-full justify-start">
                                                            {employeeFormData.locationIds.length > 0
                                                                ? employeeFormData.locationIds
                                                                      .map(id => locations.find(l => l.id === id)?.name)
                                                                      .filter(Boolean)
                                                                      .join(', ')
                                                                : "Seleccionar Sedes"}
                                                            <ChevronsUpDown className="ml-auto h-4 w-4 opacity-50"/>
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent className="w-56">
                                                         <DropdownMenuLabel>Sedes Disponibles</DropdownMenuLabel>
                                                         <DropdownMenuSeparator />
                                                         {locations.map((location) => (
                                                              <DropdownMenuCheckboxItem
                                                                  key={location.id}
                                                                  checked={employeeFormData.locationIds.includes(location.id)}
                                                                  onCheckedChange={() => handleToggleEmployeeLocation(location.id)}
                                                              >
                                                                  {location.name}
                                                              </DropdownMenuCheckboxItem>
                                                          ))}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>

                                                {/* Department Multi-Select */}
                                                <Label className="mt-2 block">Departamentos (Opcional)</Label>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                         <Button variant="outline" className="w-full justify-start" disabled={availableDepartmentsForEmployee.length === 0}>
                                                            {employeeFormData.departmentIds.length > 0
                                                                ? employeeFormData.departmentIds
                                                                    .map(id => departments.find(d => d.id === id)?.name)
                                                                    .filter(Boolean)
                                                                    .join(', ')
                                                                : (availableDepartmentsForEmployee.length === 0 ? "Primero selecciona sede" : "Seleccionar Deptos")}
                                                             <ChevronsUpDown className="ml-auto h-4 w-4 opacity-50"/>
                                                         </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent className="w-56">
                                                        <DropdownMenuLabel>Departamentos Disponibles</DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        {availableDepartmentsForEmployee.map((dept) => (
                                                            <DropdownMenuCheckboxItem
                                                                key={dept.id}
                                                                checked={employeeFormData.departmentIds.includes(dept.id)}
                                                                onCheckedChange={() => handleToggleEmployeeDepartment(dept.id)}
                                                            >
                                                                {dept.name} <span className="text-xs text-muted-foreground ml-1">({locations.find(l => l.id === dept.locationId)?.name})</span>
                                                            </DropdownMenuCheckboxItem>
                                                        ))}
                                                        {availableDepartmentsForEmployee.length === 0 && <DropdownMenuItem disabled>No hay departamentos para las sedes seleccionadas.</DropdownMenuItem>}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>

                                               <div className="flex justify-end gap-2 mt-4">
                                                   <Button variant="ghost" onClick={() => {setIsConfigModalOpen(false); setEditingEmployee(null)}}>Cancelar</Button>
                                                   <Button onClick={handleSaveEmployee}>Guardar Colaborador</Button>
                                               </div>
                                           </div>
                                       )}
                                        {/* Default Footer Button if not editing */}
                                        {!editingLocation && !editingDepartment && !editingEmployee && (
                                            <Button variant="secondary" onClick={() => setIsConfigModalOpen(false)}>Cerrar</Button>
                                        )}
                                   </DialogFooter>
                               </DialogContent>
                           </Dialog>
                     </div>


                    {/* Day/Week Navigation */}
                     <div className="flex items-center justify-center gap-2 flex-grow md:flex-grow-0"> {/* Added flex-grow */}
                        {viewMode === 'day' ? (
                             <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={'outline'}
                                        className={cn(
                                            'w-[200px] sm:w-[280px] justify-start text-left font-normal',
                                            !targetDate && 'text-muted-foreground',
                                            isHoliday(targetDate) && 'border-primary font-semibold text-primary border-2' // Highlight border if holiday
                                        )}
                                        disabled={isCheckingHoliday}
                                    >
                                        {isCheckingHoliday ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <CalendarModernIcon className="mr-2 h-4 w-4 text-primary" />
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
                                             holiday: 'text-primary font-medium border border-primary',
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
                     <div className="flex items-center justify-center gap-2 flex-shrink-0"> {/* Added flex-shrink-0 */}
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

                     {/* Summary Sheet Trigger */}
                     <div className="flex items-center justify-center flex-shrink-0">
                         <Sheet open={isSummarySheetOpen} onOpenChange={setIsSummarySheetOpen}>
                             <SheetTrigger asChild>
                                 <Button variant="outline" title="Resumen de Horas Programadas">
                                     <BarChartHorizontal className="h-5 w-5" />
                                 </Button>
                             </SheetTrigger>
                             <SheetContent side="right" className="w-full sm:max-w-sm">
                                 <SheetHeader>
                                     <SheetTitle>Resumen de Horas</SheetTitle>
                                     <SheetDescription>
                                        Total de horas programadas para el período visible: <br/>
                                        {viewMode === 'day'
                                            ? format(targetDate, 'PPP', { locale: es })
                                            : `Semana del ${format(weekDates[0], 'dd MMM', { locale: es })} al ${format(weekDates[6], 'dd MMM yyyy', { locale: es })}`}
                                     </SheetDescription>
                                 </SheetHeader>
                                 <ScrollArea className="h-[calc(100vh-150px)] mt-4">
                                     {employeeHoursSummary.length > 0 ? (
                                         <ul className="space-y-2 pr-4">
                                             {employeeHoursSummary.map(summary => (
                                                 <li key={summary.id} className="flex justify-between items-center border-b pb-1">
                                                     <span className="font-medium text-sm">{summary.name}</span>
                                                     <span className="text-sm text-primary font-semibold">{summary.totalHours.toFixed(2)} h</span>
                                                 </li>
                                             ))}
                                         </ul>
                                     ) : (
                                         <p className="text-center text-muted-foreground italic mt-10">No hay horas programadas para este período.</p>
                                     )}
                                 </ScrollArea>
                                 <SheetClose asChild className="mt-4">
                                     <Button type="button" variant="secondary" className="w-full">Cerrar</Button>
                                 </SheetClose>
                             </SheetContent>
                         </Sheet>
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
                              getNotesForDate={getNotesForDate}
                              onOpenNotesModal={handleOpenNotesModalForDate} // Pass the new handler
                              employees={employees} // Pass employees to render tooltip content correctly
                              setNoteToDeleteId={setNoteToDeleteId} // Pass the setter function
                          />
                       </div>
                   </div>
               </DndWrapper>

                 {/* --- Bottom Actions Row --- */}
                  <div className="flex flex-wrap justify-end gap-2 mt-6">
                     {/* Notes Button */}
                     <Button onClick={() => { setNotesModalForDate(null); setIsNotesModalOpen(true); }} variant="outline" className="hover:bg-primary hover:text-primary-foreground">
                         <NotebookPen className="mr-2 h-4 w-4" /> Anotaciones
                     </Button>
                     {/* Template Button */}
                     <Button onClick={() => setIsTemplateListModalOpen(true)} variant="outline" className="hover:bg-primary hover:text-primary-foreground">
                          <Library className="mr-2 h-4 w-4" /> Templates
                     </Button>

                    <Button onClick={handleShareSchedule} variant="outline" className="hover:bg-primary hover:text-primary-foreground">
                        <Share2 className="mr-2 h-4 w-4" /> Compartir (Texto)
                    </Button>
                    <Button onClick={handleExportPDF} variant="outline" className="hover:bg-red-600 hover:text-white">
                        <FileDown className="mr-2 h-4 w-4" /> PDF
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
                    {/* Clear Week Button */}
                     {viewMode === 'week' && (
                        <AlertDialog>
                           <AlertDialogTrigger asChild>
                             <Button variant="outline" size="sm" className="hover:bg-destructive hover:text-destructive-foreground">
                                <CalendarX className="mr-2 h-4 w-4" /> Limpiar Semana
                             </Button>
                           </AlertDialogTrigger>
                           <AlertDialogContent>
                             <AlertDialogHeader>
                               <AlertDialogTitle>¿Limpiar Semana Completa?</AlertDialogTitle>
                               <AlertDialogDescription>
                                 Esta acción eliminará todos los turnos de la semana del{' '}
                                 {format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'dd/MM/yy', { locale: es })} al{' '}
                                 {format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'dd/MM/yy', { locale: es })}. No se puede deshacer.
                               </AlertDialogDescription>
                             </AlertDialogHeader>
                             <AlertDialogFooter>
                               <AlertDialogCancel>Cancelar</AlertDialogCancel>
                               <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleClearWeek}>Limpiar Semana</AlertDialogAction>
                             </AlertDialogFooter>
                           </AlertDialogContent>
                        </AlertDialog>
                     )}
                    {/* Save Template Button */}
                    <Button onClick={handleSaveTemplate} variant="outline" disabled={isSavingTemplate} className="hover:bg-primary hover:text-primary-foreground">
                        {isSavingTemplate ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Guardar Template
                    </Button>

                    {/* Save Schedule Button */}
                    <Button onClick={handleSaveSchedule} variant="default" className="hover:bg-primary/90">
                        <Save className="mr-2 h-4 w-4" /> Guardar Horario
                    </Button>
                </div>



            {/* Editable Notes Section */}
             <Card className="mt-8 bg-transparent border-none shadow-none p-0"> {/* Removed card styling */}
                 <CardHeader className="px-0 pt-0 pb-2">
                     <CardTitle className="text-lg font-semibold text-foreground mb-2">Notas Generales</CardTitle>
                     <CardDescription className="text-sm text-muted-foreground">
                        Agrega notas importantes sobre horarios, eventos especiales o cualquier información relevante para la semana.
                     </CardDescription>
                 </CardHeader>
                 <CardContent className="px-0 pb-0">
                    <Textarea
                        value={notes}
                        onChange={handleNotesChange}
                        placeholder="Ej: Cierre anticipado el jueves por fumigación..."
                        rows={4}
                        className="w-full bg-card border border-border rounded-md shadow-sm" // Added card-like styling to textarea
                    />
                 </CardContent>
                 <CardFooter className="flex justify-end mt-4 px-0 pb-0">
                     <Button onClick={handleSaveNotes}>Guardar Notas</Button>
                 </CardFooter>
             </Card>

             {/* --- Modals --- */}

             {/* Schedule Notes Modal (for adding and general viewing) */}
             <ScheduleNotesModal
                 isOpen={isNotesModalOpen} // Controlled by isNotesModalOpen state
                 onClose={() => { setIsNotesModalOpen(false); setNotesModalForDate(null); }} // Clear date context on close
                 notes={scheduleNotes}
                 employees={employees} // Pass employees for the dropdown
                 onAddNote={addScheduleNote}
                 onDeleteNote={setNoteToDeleteId} // Pass the function to set the ID for confirmation
                 initialDate={notesModalForDate || undefined} // Pass specific date if set
                 // Pass context for filtering
                 viewMode={viewMode}
                 currentDate={currentDate}
                 weekDates={weekDates}
             />

            {/* Template List Modal */}
            <Dialog open={isTemplateListModalOpen} onOpenChange={setIsTemplateListModalOpen}>
                 <DialogContent className="sm:max-w-md">
                     <DialogHeader>
                         <DialogTitle className="flex items-center gap-2"><Library className="h-5 w-5" /> Templates Guardados</DialogTitle>
                         <DialogDescription>Carga o elimina templates para la vista actual ({viewMode}).</DialogDescription>
                     </DialogHeader>
                     <ScheduleTemplateList
                         templates={filteredTemplates}
                         onLoadTemplate={handleLoadTemplate}
                         onDeleteTemplate={confirmDeleteTemplate} // Use confirm delete function
                     />
                     <DialogFooter>
                         <DialogClose asChild>
                             <Button variant="secondary">Cerrar</Button>
                         </DialogClose>
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
                              {itemToDelete?.type === 'location' && `Eliminar Sede "${itemToDelete?.name}"? Se eliminarán sus departamentos, los colaboradores asociados se desvincularán (si no tienen más sedes) y se borrarán turnos relacionados. Esta acción no se puede deshacer.`}
                              {itemToDelete?.type === 'department' && `Eliminar Departamento "${itemToDelete?.name}"? Se eliminarán los turnos asociados en horarios. Esta acción no se puede deshacer.`}
                              {itemToDelete?.type === 'employee' && `Eliminar Colaborador "${itemToDelete?.name}"? Se eliminarán sus turnos asociados en horarios. Esta acción no se puede deshacer.`}
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

            {/* Clear Week Confirmation */}
             <AlertDialog open={clearingWeek} onOpenChange={setClearingWeek}>
                 <AlertDialogContent>
                     <AlertDialogHeader>
                         <AlertDialogTitle>¿Limpiar Semana Completa?</AlertDialogTitle>
                         <AlertDialogDescription>
                            Esta acción eliminará todos los turnos de la semana del{' '}
                            {format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'dd/MM/yy', { locale: es })} al{' '}
                            {format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'dd/MM/yy', { locale: es })}. No se puede deshacer.
                         </AlertDialogDescription>
                     </AlertDialogHeader>
                     <AlertDialogFooter>
                         <AlertDialogCancel onClick={() => setClearingWeek(false)}>Cancelar</AlertDialogCancel>
                         <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleClearWeek}>Limpiar Semana</AlertDialogAction>
                     </AlertDialogFooter>
                 </AlertDialogContent>
             </AlertDialog>

             {/* Template Delete Confirmation */}
             <AlertDialog open={!!templateToDeleteId} onOpenChange={(open) => !open && setTemplateToDeleteId(null)}>
                 <AlertDialogContent>
                     <AlertDialogHeader>
                         <AlertDialogTitle>¿Eliminar Template?</AlertDialogTitle>
                         <AlertDialogDescription>
                             ¿Estás seguro de que quieres eliminar el template "{savedTemplates.find(t => t.id === templateToDeleteId)?.name || 'seleccionado'}"? No se puede deshacer.
                         </AlertDialogDescription>
                     </AlertDialogHeader>
                     <AlertDialogFooter>
                         <AlertDialogCancel onClick={() => setTemplateToDeleteId(null)}>Cancelar</AlertDialogCancel>
                         <AlertDialogAction
                             className="bg-destructive hover:bg-destructive/90"
                             onClick={() => templateToDeleteId && handleDeleteTemplate(templateToDeleteId)}
                         >
                             Eliminar Template
                         </AlertDialogAction>
                     </AlertDialogFooter>
                 </AlertDialogContent>
             </AlertDialog>


             {/* Note Delete Confirmation Dialog */}
             <AlertDialog open={!!noteToDeleteId} onOpenChange={(open) => !open && setNoteToDeleteId(null)}>
                 <AlertDialogContent>
                     <AlertDialogHeader>
                         <AlertDialogTitle>¿Eliminar Anotación?</AlertDialogTitle>
                         <AlertDialogDescription>
                             ¿Estás seguro de que quieres eliminar esta anotación? No se puede deshacer.
                         </AlertDialogDescription>
                     </AlertDialogHeader>
                     <AlertDialogFooter>
                         <AlertDialogCancel onClick={() => setNoteToDeleteId(null)}>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                             className="bg-destructive hover:bg-destructive/90"
                             onClick={() => noteToDeleteId && deleteScheduleNote(noteToDeleteId)}
                          >
                             Eliminar Anotación
                         </AlertDialogAction>
                     </AlertDialogFooter>
                 </AlertDialogContent>
             </AlertDialog>

            {/* Department Mismatch Warning Dialog */}
             <AlertDialog open={!!departmentMismatchWarning} onOpenChange={() => setDepartmentMismatchWarning(null)}>
                  <AlertDialogContent>
                      <AlertDialogHeader>
                          <AlertDialogTitle>Advertencia de Departamento</AlertDialogTitle>
                          <AlertDialogDescription>
                              El colaborador <strong>{departmentMismatchWarning?.employee.name}</strong> no está asignado principalmente al departamento <strong>{departmentMismatchWarning?.targetDepartment.name}</strong>.
                              <br /><br />
                              ¿Deseas asignarlo de todas formas?
                          </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => setDepartmentMismatchWarning(null)}>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={handleConfirmDepartmentMismatch}>Asignar Igualmente</AlertDialogAction>
                      </AlertDialogFooter>
                  </AlertDialogContent>
              </AlertDialog>


        </main>
    );
}
