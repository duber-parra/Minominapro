
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
import { Plus, Trash2, Edit, ChevronsLeft, ChevronsRight, Calendar as CalendarModernIcon, Users, Building, Building2, MinusCircle, ChevronsUpDown, Settings, Save, CopyPlus, Eraser, Download, FileX2, FileDown, PencilLine, Share2, Loader2, Check, Copy, Upload, FolderUp, FileJson, List, UploadCloud, FileText, NotebookPen, CalendarX, FolderSync, BarChartHorizontal, Library, X, Notebook, User, ImportIcon, ListCollapse, PlusCircle } from 'lucide-react'; // Added Library, X, Notebook, User, ImportIcon, ListCollapse, PlusCircle
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
} from "@/components/ui/alert-dialog";
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
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"; // Import Tabs components
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"


import { LocationSelector } from '@/components/schedule/LocationSelector';
import { EmployeeList } from '@/components/schedule/EmployeeList';
import { ScheduleView } from '@/components/schedule/ScheduleView';
import { ShiftDetailModal } from '@/components/schedule/ShiftDetailModal';
import { WeekNavigator } from '@/components/schedule/WeekNavigator';
import { ScheduleNotesModal } from '@/components/schedule/ScheduleNotesModal';
import { ScheduleTemplateList } from '@/components/schedule/ScheduleTemplateList'; // Import ScheduleTemplateList

import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { EmployeeSelectionModal } from '@/components/schedule/EmployeeSelectionModal';
import type { Location, Department, Employee, ShiftAssignment, ScheduleData, DailyAssignments, WeeklyAssignments, ScheduleTemplate, ScheduleNote } from '@/types/schedule'; // Added ScheduleTemplate and ScheduleNote
import { startOfWeek, endOfWeek, addDays, format, addWeeks, subWeeks, parseISO, getYear, isValid, differenceInMinutes, parse as parseDateFnsInternal, isSameDay, isWithinInterval, getDay } from 'date-fns'; // Added endOfWeek
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
                                   const parsedDate = parseISO(tpl.createdAt);
                                   return isValid(parsedDate) ? { ...tpl, createdAt: parsedDate } : { ...tpl, createdAt: new Date() }; // Check if valid
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
                if(key !== SCHEDULE_NOTES_KEY && key !== SCHEDULE_DATA_KEY && key !== SCHEDULE_TEMPLATES_KEY) { // Added TEMPLATES_KEY exception
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
             // Notes are plain string, handle JSON parse error gracefully
             try {
                 // Attempt to parse, might fail if it's plain text
                 JSON.parse(savedData);
                 // If parsing succeeds, it was likely JSON, return parsed
                 return JSON.parse(savedData);
             } catch (e) {
                 // If parsing fails, assume it's plain text
                 return (savedData ?? defaultValue) as T;
             }
        } else {
            // For unknown keys, just return the parsed data if it's not null/undefined
            return parsed as T;
        }
    } catch (error) {
        // Handle JSON parsing errors or other potential issues
         if (error instanceof SyntaxError && key === SCHEDULE_NOTES_KEY) { // Allow plain text for notes
             return (localStorage.getItem(key) ?? defaultValue) as T;
         } else if (error instanceof SyntaxError) {
             console.error(`Error parsing JSON from localStorage for key ${key}:`, error.message, "Saved data:", localStorage.getItem(key));
              // Remove corrupted data for keys other than SCHEDULE_NOTES_KEY and SCHEDULE_TEMPLATES_KEY
             if (key !== SCHEDULE_NOTES_KEY && key !== SCHEDULE_TEMPLATES_KEY) {
                 try {
                     localStorage.removeItem(key);
                     console.warn(`Removed invalid item from localStorage for key: ${key}`);
                 } catch (removeError) {
                     console.error(`Error removing invalid item from localStorage for key ${key}:`, removeError);
                 }
             }
         } else { // Log other errors normally
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


// Function to load templates from localStorage
const loadScheduleTemplates = (): ScheduleTemplate[] => {
    if (typeof window === 'undefined') return []; // Solo en cliente

    const loadedTemplates: ScheduleTemplate[] = [];
    const templateKeyPrefix = "scheduleTemplate_"; // Prefijo real de las claves de template

    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);

            if (key && key.startsWith(templateKeyPrefix)) {
                const storedData = localStorage.getItem(key);
                if (storedData) {
                    try {
                        const parsedTemplate = JSON.parse(storedData) as ScheduleTemplate;
                        if (parsedTemplate && typeof parsedTemplate === 'object' && parsedTemplate.id && parsedTemplate.name) {
                             if (parsedTemplate.createdAt && typeof parsedTemplate.createdAt === 'string') {
                                try {
                                    const parsedDate = parseISO(parsedTemplate.createdAt);
                                    parsedTemplate.createdAt = isValid(parsedDate) ? parsedDate : new Date(); // Check if valid
                                } catch (dateError) {
                                    console.warn(`Error parsing createdAt date for template ${parsedTemplate.id}:`, dateError);
                                    parsedTemplate.createdAt = new Date(); // Fallback
                                }
                             }
                             loadedTemplates.push(parsedTemplate);
                        } else {
                             console.warn(`Dato inválido encontrado para la clave de template: ${key}`);
                        }
                    } catch (parseError) {
                        console.error(`Error parseando JSON para la clave de template ${key}:`, parseError);
                        // localStorage.removeItem(key); // Option to remove corrupted key
                    }
                }
            }
        }
    } catch (error) {
        console.error("Error cargando templates de localStorage:", error);
    }

    // Sort templates, newest first
    loadedTemplates.sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
        const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
        return dateB - dateA;
    });

    console.log(`[loadScheduleTemplates] Cargados ${loadedTemplates.length} templates.`);
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
    const [isTemplateListModalOpen, setIsTemplateListModalOpen] = useState(false); // State for template list modal

    // New state for the Summary Sheet
    const [isSummarySheetOpen, setIsSummarySheetOpen] = useState(false);
    const [employeeHoursSummary, setEmployeeHoursSummary] = useState<EmployeeHoursSummary[]>([]);


    const [notes, setNotes] = useState<string>(''); // Initialize notes string state
    const [selectedLocationId, setSelectedLocationId] = useState<string>('');

    const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
    const [isEmployeeSelectionModalOpen, setIsEmployeeSelectionModalOpen] = useState(false);
    const [shiftRequestContext, setShiftRequestContext] = useState<{ departmentId: string; date: Date } | null>(null);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [editingShift, setEditingShift] = useState<{ assignment: ShiftAssignment; date: Date; departmentId: string } | null>(null);
    const [targetDate, setTargetDate] = useState<Date>(new Date());

    // --- Config Modal State ---
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
    const [configFormType, setConfigFormType] = useState<'location' | 'department' | 'employee' | 'template' | null>(null); // For the new config modal structure
    const [selectedConfigItem, setSelectedConfigItem] = useState<any | null>(null); // State for the item selected in the new config modal list
    const [activeConfigTab, setActiveConfigTab] = useState<string>("sedes"); // State for the active tab in the new config modal

    const [locationFormData, setLocationFormData] = useState({ name: '' });

    const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
    const [departmentFormData, setDepartmentFormData] = useState<{ name: string, locationId: string, iconName?: string }>({ name: '', locationId: '', iconName: undefined });

    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [employeeFormData, setEmployeeFormData] = useState<{ id: string, name: string, locationIds: string[], departmentIds: string[] }>({ id: '', name: '', locationIds: [], departmentIds: [] });

    const [itemToDelete, setItemToDelete] = useState<{ type: 'location' | 'department' | 'employee' | 'template'; id: string; name: string } | null>(null); // Added 'template' type

    const [clearingDate, setClearingDate] = useState<Date | null>(null);
    const [clearingWeek, setClearingWeek] = useState<boolean>(false); // State for clearing week confirmation

    const [holidaySet, setHolidaySet] = useState<Set<string>>(new Set());
    const [isCheckingHoliday, setIsCheckingHoliday] = useState<boolean>(false);

    const [isClient, setIsClient] = useState(false);

    // --- Search States ---
    const [locationSearch, setLocationSearch] = useState('');
    const [departmentSearch, setDepartmentSearch] = useState('');
    const [employeeSearch, setEmployeeSearch] = useState('');
    const [templateSearch, setTemplateSearch] = useState('');

    // Loading state for page transitions
    const [isLoadingPage, setIsLoadingPage] = useState(false); // Added state


    const isMobile = useIsMobile();
    const { toast } = useToast();


    // --- Load Data from localStorage on Mount (Client-side only) ---
    useEffect(() => {
        setIsClient(true); // Mark as client-side after mount
        setIsLoadingPage(true); // Start loading indicator
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
        setScheduleNotes(loadedEvents);
        setSavedTemplates(loadedTpls); // Set the loaded templates state

        // Set initial selected location and update form defaults accordingly
        const initialSelectedLoc = loadedLocations.length > 0 ? loadedLocations[0].id : '';
        setSelectedLocationId(initialSelectedLoc);
        setDepartmentFormData(prev => ({ ...prev, locationId: initialSelectedLoc }));
        setEmployeeFormData(prev => ({ ...prev, locationIds: initialSelectedLoc ? [initialSelectedLoc] : [], departmentIds: [] })); // Initialize departmentIds

        setIsLoadingPage(false); // Stop loading indicator
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
                 console.log("[Save Effect] Saving templates to localStorage:", savedTemplates); // Log before saving
                 localStorage.setItem(SCHEDULE_TEMPLATES_KEY, JSON.stringify(savedTemplates));
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
    }, [savedTemplates, isClient, toast]);



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


     // Filter departments by selected location
     const filteredDepartments = useMemo(() => {
         return departments.filter(dept => dept.locationId === selectedLocationId);
     }, [departments, selectedLocationId]);


    const filteredEmployees = useMemo(() => employees.filter(emp =>
        Array.isArray(emp.locationIds) && emp.locationIds.includes(selectedLocationId)
    ), [employees, selectedLocationId]);

    // Filter templates based on selected location and current view mode
    const filteredTemplates = useMemo(() => {
        console.log("[Filter Memo] All templates in state:", savedTemplates);
        // Ensure savedTemplates is always an array before filtering
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


    // Memoized list of available employees, considering current view and assigned employees
    const availableEmployees = useMemo(() => {
        // Determine the date or dates for filtering based on viewMode and context
        const datesForFiltering = viewMode === 'day' ? [targetDate] : (weekDates || []);

        // Get IDs of employees already assigned on the target date(s)
        const assignedIdsOnDates = new Set<string>();
        datesForFiltering.forEach(date => {
            if (!date || !isValid(date)) return;
            const dateKey = format(date, 'yyyy-MM-dd');
            const daySchedule = scheduleData[dateKey];
            if (daySchedule && daySchedule.assignments) {
                Object.values(daySchedule.assignments).flat().forEach(assignment => {
                    assignedIdsOnDates.add(assignment.employee.id);
                });
            }
        });

        // Start with all employees for the location
        let potentiallyAvailable = filteredEmployees;

        // Determine the department to filter by (only for EmployeeSelectionModal)
        const deptForFiltering = shiftRequestContext?.departmentId;

        // Filter employees based on whether they are already assigned on the target date(s)
        // In WEEK VIEW, an employee should still be available if assigned on SOME days but not ALL
        // In DAY VIEW (or EmployeeSelectionModal), filter if assigned on THAT specific day
        if (viewMode === 'day' || isEmployeeSelectionModalOpen) { // Stricter filter for day view and modal
            const targetDayKey = format(shiftRequestContext?.date || targetDate, 'yyyy-MM-dd');
            const assignedOnTargetDay = new Set<string>();
            const daySchedule = scheduleData[targetDayKey];
            if (daySchedule && daySchedule.assignments) {
                 Object.values(daySchedule.assignments).flat().forEach(assignment => {
                     assignedOnTargetDay.add(assignment.employee.id);
                 });
            }
            potentiallyAvailable = potentiallyAvailable.filter(emp => !assignedOnTargetDay.has(emp.id));
        }
        // No date-based filtering needed for the general list in Week view drag-and-drop


        // Filter by department if the EmployeeSelectionModal is open and a department context exists
        if (isEmployeeSelectionModalOpen && deptForFiltering) {
            potentiallyAvailable = potentiallyAvailable.filter(emp =>
                emp.departmentIds?.includes(deptForFiltering)
            );
        }

        // Always sort alphabetically
        potentiallyAvailable.sort((a, b) => a.name.localeCompare(b.name));

        return potentiallyAvailable;

    }, [
        filteredEmployees,
        scheduleData,
        targetDate,
        weekDates,
        viewMode,
        shiftRequestContext,
        isEmployeeSelectionModalOpen, // Add dependency
        departments // Added departments dependency for filtering
    ]);


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

         // Check if employee is already assigned on this date in ANY department
        const dateKey = format(shiftRequestContext.date, 'yyyy-MM-dd');
        const daySchedule = scheduleData[dateKey];
        const isAlreadyAssignedOnDate = daySchedule && Object.values(daySchedule.assignments)
                                                .flat()
                                                .some(a => a.employee.id === employee.id);

        if (isAlreadyAssignedOnDate) {
            toast({
                title: 'Asignación Duplicada',
                description: `${employee.name} ya tiene un turno asignado para el ${format(shiftRequestContext.date, 'PPP', { locale: es })}.`,
                variant: 'destructive',
            });
            setIsEmployeeSelectionModalOpen(false); // Close the selection modal
            return; // Stop the process
        }

         // Check for department mismatch
         const employeeDepartments = employee.departmentIds || [];
         const targetDepartment = departments.find(d => d.id === shiftRequestContext.departmentId);
         if (targetDepartment && employeeDepartments.length > 0 && !employeeDepartments.includes(shiftRequestContext.departmentId)) {
             setDepartmentMismatchWarning({
                 employee,
                 targetDepartment: targetDepartment,
                 date: shiftRequestContext.date
             });
             setIsEmployeeSelectionModalOpen(false); // Close the selection modal for now
             return; // Stop and show warning
         }


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
                 // Check if already assigned on this specific DATE in ANY department (redundant check if done in handleEmployeeSelectedForShift, but safe)
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


     // --- CRUD Handlers for Config Modal ---
     // Function to open the specific form within the modal
     const openConfigForm = (type: 'location' | 'department' | 'employee' | 'template', item: Location | Department | Employee | ScheduleTemplate | null = null) => {
        setConfigFormType(type); // Keep track of the form type
        setSelectedConfigItem(item); // Set the item being edited/viewed

        // Populate form data based on the item type and whether it's new or existing
        switch (type) {
            case 'location':
                setLocationFormData({ name: (item as Location)?.name || '' });
                break;
            case 'department':
                 const dept = item as Department | null;
                 const iconName = dept ? Object.keys(iconMap).find(key => iconMap[key] === dept.icon) : undefined;
                setDepartmentFormData({
                    name: dept?.name || '',
                    locationId: dept?.locationId || selectedLocationId || (locations.length > 0 ? locations[0].id : ''), // Default to current or first location
                    iconName: iconName
                });
                 // Clear form if adding new
                 if (!item) {
                    setDepartmentFormData({ name: '', locationId: selectedLocationId || (locations.length > 0 ? locations[0].id : ''), iconName: undefined });
                 }
                break;
            case 'employee':
                const emp = item as Employee | null;
                 const initialLocationIds = Array.isArray(emp?.locationIds) ? emp.locationIds : (selectedLocationId ? [selectedLocationId] : []);
                 const initialDepartmentIds = Array.isArray(emp?.departmentIds) ? emp.departmentIds : [];
                setEmployeeFormData({
                    id: emp?.id || '',
                    name: emp?.name || '',
                    locationIds: initialLocationIds.length > 0 ? initialLocationIds : (locations.length > 0 ? [locations[0].id] : []), // Ensure at least one location if possible
                    departmentIds: initialDepartmentIds
                });
                 // Clear form if adding new
                if (!item) {
                    setEmployeeFormData({ id: '', name: '', locationIds: selectedLocationId ? [selectedLocationId] : [], departmentIds: [] });
                 }
                break;
            case 'template':
                 console.log("Template selected:", item);
                 // If adding a template (via + button), maybe show a different form/modal?
                 // For now, selecting a template just shows its details implicitly.
                break;
        }
    };

    const handleSaveLocation = () => {
        const name = locationFormData.name.trim();
        if (!name) {
            toast({ title: 'Nombre Inválido', description: 'El nombre de la sede no puede estar vacío.', variant: 'destructive' });
            return;
        }
        // Use selectedConfigItem for editing check
        const currentEditingLocation = selectedConfigItem as Location | null;
        if (currentEditingLocation && configFormType === 'location') {
            setLocations(locations.map(loc => loc.id === currentEditingLocation.id ? { ...loc, name } : loc));
             toast({ title: 'Sede Actualizada', description: `Sede "${name}" actualizada.` });
        } else {
             const newLocation = { id: `loc-${Date.now()}`, name };
            setLocations([...locations, newLocation]);
            toast({ title: 'Sede Agregada', description: `Sede "${name}" agregada.` });
            if (locations.length === 0 || !selectedLocationId) {
                 setSelectedLocationId(newLocation.id);
                 // Update default location for NEW departments/employees when the first location is added
                 setDepartmentFormData(prev => ({ ...prev, locationId: newLocation.id }));
                 setEmployeeFormData(prev => ({ ...prev, locationIds: [newLocation.id] }));
            }
        }
        setConfigFormType(null); // Close form view after save
        setSelectedConfigItem(null);
        setLocationSearch(''); // Clear search
    };

    const handleSaveDepartment = () => {
         const name = departmentFormData.name.trim();
         const locationId = departmentFormData.locationId;
         const iconName = departmentFormData.iconName;
         if (!name) {
             toast({ title: 'Nombre Inválido', description: 'El nombre del departamento no puede estar vacío.', variant: 'destructive' });
             return;
         }
         if (!locationId) {
             toast({ title: 'Sede Requerida', description: 'Debes seleccionar una sede para el departamento.', variant: 'destructive' });
             return;
         }
         const icon = iconName ? iconMap[iconName] : Building;

         const currentEditingDepartment = selectedConfigItem as Department | null;
        if (currentEditingDepartment && configFormType === 'department') {
            setDepartments(departments.map(dep => dep.id === currentEditingDepartment.id ? { ...dep, name, locationId, icon, iconName } : dep));
             toast({ title: 'Departamento Actualizado', description: `Departamento "${name}" actualizado.` });
        } else {
             const newDepartment = { id: `dep-${Date.now()}`, name, locationId, icon, iconName };
            setDepartments([...departments, newDepartment]);
            toast({ title: 'Departamento Agregado', description: `Departamento "${name}" agregado.` });
        }
        setConfigFormType(null); // Close form view
        setSelectedConfigItem(null);
        setDepartmentSearch(''); // Clear search
    };

    const handleSaveEmployee = () => {
         const id = employeeFormData.id.trim();
         const name = employeeFormData.name.trim();
         const locationIds = Array.isArray(employeeFormData.locationIds) && employeeFormData.locationIds.length > 0
                             ? employeeFormData.locationIds
                             : (selectedLocationId ? [selectedLocationId] : []);
         const departmentIds = Array.isArray(employeeFormData.departmentIds) ? employeeFormData.departmentIds : [];

          if (!id) {
             toast({ title: 'ID Requerido', description: 'El ID del colaborador es requerido (Ej: Cédula).', variant: 'destructive' });
             return;
          }
          if (!name) {
             toast({ title: 'Nombre Requerido', description: 'El nombre del colaborador es requerido.', variant: 'destructive' });
             return;
          }
           if (locationIds.length === 0) {
               toast({ title: 'Sede Requerida', description: 'Debes asignar el colaborador al menos a una sede.', variant: 'destructive' });
               return;
           }

          const currentEditingEmployee = selectedConfigItem as Employee | null;
         // Only check for duplicate ID if adding a NEW employee
         if (!currentEditingEmployee || configFormType !== 'employee') {
             const isDuplicateId = employees.some(emp => emp.id === id);
             if (isDuplicateId) {
                 toast({ title: 'ID Duplicado', description: `El ID "${id}" ya está en uso por otro colaborador.`, variant: 'destructive' });
                 return;
             }
         }

         const updatedEmployeeData: Employee = { id, name, locationIds, departmentIds };

        if (currentEditingEmployee && configFormType === 'employee') {
            setEmployees(employees.map(emp => emp.id === currentEditingEmployee.id ? updatedEmployeeData : emp));
             toast({ title: 'Colaborador Actualizado', description: `Colaborador "${name}" (ID: ${id}) actualizado.` });
             // Update employee details in existing schedule assignments
             setScheduleData(prevSchedule => {
                const updatedSchedule = { ...prevSchedule };
                Object.keys(updatedSchedule).forEach(dateKey => {
                    Object.keys(updatedSchedule[dateKey].assignments).forEach(deptId => {
                        updatedSchedule[dateKey].assignments[deptId] = updatedSchedule[dateKey].assignments[deptId].map(assignment => {
                            if (assignment.employee.id === id) {
                                return { ...assignment, employee: updatedEmployeeData };
                            }
                            return assignment;
                        });
                    });
                });
                return updatedSchedule;
             });
        } else {
            const newEmployee = updatedEmployeeData;
            setEmployees(prev => [...prev, newEmployee].sort((a, b) => a.name.localeCompare(b.name))); // Keep sorted
             toast({ title: 'Colaborador Agregado', description: `Colaborador "${name}" (ID: ${id}) agregado.` });
        }
        setConfigFormType(null); // Close form view
        setSelectedConfigItem(null);
        setEmployeeSearch(''); // Clear search
    };

    const handleToggleEmployeeLocation = (locationId: string) => {
        setEmployeeFormData(prev => {
            const currentIds = Array.isArray(prev.locationIds) ? prev.locationIds : [];
            let newLocationIds;
            if (currentIds.includes(locationId)) {
                newLocationIds = currentIds.filter(id => id !== locationId);
                 if (newLocationIds.length === 0) {
                    toast({ title: "Validación", description: "El colaborador debe estar asignado al menos a una sede.", variant: "destructive" });
                    return prev; // Prevent removal if it's the last one
                }
            } else {
                newLocationIds = [...currentIds, locationId];
            }
             const validDepartmentIds = (prev.departmentIds || []).filter(deptId => {
                 const dept = departments.find(d => d.id === deptId);
                 return dept && newLocationIds.includes(dept.locationId);
             });
            return { ...prev, locationIds: newLocationIds, departmentIds: validDepartmentIds };
        });
    };

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

     const availableDepartmentsForEmployee = useMemo(() => {
        if (!employeeFormData.locationIds || employeeFormData.locationIds.length === 0) {
            return [];
        }
        return departments.filter(dept => employeeFormData.locationIds.includes(dept.locationId));
     }, [departments, employeeFormData.locationIds]);


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
                        if (selectedLocationId === itemToDelete.id) {
                           setSelectedLocationId(remaining.length > 0 ? remaining[0].id : '');
                        }
                        return remaining;
                    });
                    const depsToDeleteLoc = departments.filter(dep => dep.locationId === itemToDelete.id).map(d => d.id);
                    setDepartments(prevDeps => prevDeps.filter(dep => dep.locationId !== itemToDelete.id));
                    setEmployees(prevEmps => prevEmps.map(emp => ({
                        ...emp,
                        locationIds: (emp.locationIds || []).filter(locId => locId !== itemToDelete.id),
                        departmentIds: (emp.departmentIds || []).filter(deptId => !depsToDeleteLoc.includes(deptId))
                    })).filter(emp => emp.locationIds.length > 0));
                     setSavedTemplates(prevTemplates => prevTemplates.filter(tpl => tpl.locationId !== itemToDelete.id));
                     setScheduleData(prevSchedule => {
                         const updatedSchedule = { ...prevSchedule };
                         Object.keys(updatedSchedule).forEach(dateKey => {
                             let dayHasOtherAssignments = false;
                             const currentAssignments = updatedSchedule[dateKey].assignments;
                             const newAssignments: { [deptId: string]: ShiftAssignment[] } = {};
                             Object.keys(currentAssignments).forEach(deptId => {
                                 if (!depsToDeleteLoc.includes(deptId)) {
                                     newAssignments[deptId] = currentAssignments[deptId];
                                     if (currentAssignments[deptId].length > 0) {
                                         dayHasOtherAssignments = true;
                                     }
                                 }
                             });
                              if (Object.keys(newAssignments).length > 0) {
                                  updatedSchedule[dateKey].assignments = newAssignments;
                              } else {
                                   delete updatedSchedule[dateKey];
                              }
                         });
                         return updatedSchedule;
                     });
                    message = `Sede "${itemToDelete.name}" y sus datos asociados eliminados.`;
                    setLocationSearch(''); // Clear search
                    break;
                case 'department':
                    setDepartments(prevDeps => prevDeps.filter(dep => dep.id !== itemToDelete.id));
                     const updatedScheduleDept = { ...scheduleData };
                     Object.keys(updatedScheduleDept).forEach(dateKey => {
                          if (updatedScheduleDept[dateKey].assignments[itemToDelete.id]) {
                              delete updatedScheduleDept[dateKey].assignments[itemToDelete.id];
                              if (Object.keys(updatedScheduleDept[dateKey].assignments).length === 0) {
                                   delete updatedScheduleDept[dateKey];
                              }
                          }
                     });
                     setScheduleData(updatedScheduleDept);
                     setSavedTemplates(prevTemplates => prevTemplates.map(tpl => {
                         const newAssignments = { ...(tpl.assignments as DailyAssignments | WeeklyAssignments) };
                         if (tpl.type === 'day') {
                             const dailyAssignments = newAssignments as DailyAssignments;
                             if (dailyAssignments[itemToDelete.id]) {
                                 delete dailyAssignments[itemToDelete.id];
                             }
                         } else if (tpl.type === 'week') {
                             const weeklyAssignments = newAssignments as WeeklyAssignments;
                             Object.keys(weeklyAssignments).forEach(dateKey => {
                                 if (weeklyAssignments[dateKey]?.[itemToDelete.id]) {
                                     delete weeklyAssignments[dateKey][itemToDelete.id];
                                 }
                             });
                         }
                         return { ...tpl, assignments: newAssignments };
                     }));
                     setEmployees(prevEmps => prevEmps.map(emp => ({
                        ...emp,
                        departmentIds: (emp.departmentIds || []).filter(deptId => deptId !== itemToDelete.id)
                     })));
                     message = `Departamento "${itemToDelete.name}" eliminado.`;
                    setDepartmentSearch(''); // Clear search
                    break;
                case 'employee':
                    setEmployees(prevEmps => prevEmps.filter(emp => emp.id !== itemToDelete.id));
                     const updatedScheduleEmp = { ...scheduleData };
                     Object.keys(updatedScheduleEmp).forEach(dateKey => {
                          let dayChanged = false;
                          Object.keys(updatedScheduleEmp[dateKey].assignments).forEach(deptId => {
                              const originalLength = updatedScheduleEmp[dateKey].assignments[deptId].length;
                              updatedScheduleEmp[dateKey].assignments[deptId] = updatedScheduleEmp[dateKey].assignments[deptId].filter(a => a.employee.id !== itemToDelete.id);
                              if (updatedScheduleEmp[dateKey].assignments[deptId].length < originalLength) {
                                  dayChanged = true;
                              }
                              if (updatedScheduleEmp[dateKey].assignments[deptId].length === 0) {
                                  delete updatedScheduleEmp[dateKey].assignments[deptId];
                              }
                          });
                           if (dayChanged && Object.keys(updatedScheduleEmp[dateKey].assignments).length === 0) {
                               delete updatedScheduleEmp[dateKey];
                           }
                     });
                     setScheduleData(updatedScheduleEmp);
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
                                 Object.keys(weeklyAssignments[dateKey] || {}).forEach(deptId => {
                                     weeklyAssignments[dateKey][deptId] = weeklyAssignments[dateKey][deptId].filter(a => a.employee.id !== itemToDelete.id);
                                 });
                             });
                         }
                         return { ...tpl, assignments: newAssignments };
                     }));
                     message = `Colaborador "${itemToDelete.name}" eliminado.`;
                    setEmployeeSearch(''); // Clear search
                    break;
                 case 'template': // Handle template deletion
                     handleDeleteTemplate(itemToDelete.id);
                     message = `Template "${itemToDelete.name}" eliminado.`;
                     setTemplateSearch(''); // Clear search
                     break;
             }
             toast({ title: 'Elemento Eliminado', description: message, variant: 'destructive' });
         } catch (error) {
              console.error(`Error deleting item type ${itemToDelete.type}:`, error);
              toast({ title: 'Error al Eliminar', description: 'No se pudo completar la eliminación.', variant: 'destructive' });
         } finally {
             setItemToDelete(null); // Close the dialog
             // If the deleted item was the one being edited, clear the form
             if (selectedConfigItem && selectedConfigItem.id === itemToDelete?.id) {
                 setConfigFormType(null);
                 setSelectedConfigItem(null);
             }
         }
     };


     const handlePreviousWeek = () => {
        setCurrentDate(prevDate => subWeeks(prevDate, 1));
     };

     const handleNextWeek = () => {
        setCurrentDate(prevDate => addWeeks(prevDate, 1));
     };

    const handleSaveSchedule = () => {
        toast({ title: 'Horario Guardado', description: 'Los cambios en el horario se guardan automáticamente.' });
    };


     const handleDuplicateDay = (sourceDate: Date) => {
         const sourceDayKey = format(sourceDate, 'yyyy-MM-dd');
         const nextDayDate = addDays(sourceDate, 1);
         const nextDayKey = format(nextDayDate, 'yyyy-MM-dd');
         const sourceSchedule = scheduleData[sourceDayKey];

         if (!sourceSchedule || Object.keys(sourceSchedule.assignments).length === 0 || Object.values(sourceSchedule.assignments).every(dept => dept.length === 0)) {
             toast({ title: 'Nada que Duplicar', description: `No hay turnos asignados para el ${format(sourceDate, 'PPP', { locale: es })}.`, variant: 'default' });
             return;
         }

         const duplicatedAssignments = JSON.parse(JSON.stringify(sourceSchedule.assignments));
         Object.keys(duplicatedAssignments).forEach(deptId => {
             duplicatedAssignments[deptId].forEach((assign: ShiftAssignment) => {
                 assign.id = `shift_${assign.employee.id}_${nextDayKey}_${assign.startTime.replace(':', '')}_${Math.random().toString(36).substring(2, 7)}`;
                  const fullEmployee = employees.find(emp => emp.id === assign.employee.id);
                  if (fullEmployee) {
                      assign.employee = fullEmployee;
                  } else {
                       console.warn(`Employee ${assign.employee.id} not found during duplication.`);
                       assign.employee = { id: assign.employee.id, name: `(ID: ${assign.employee.id})`, locationIds: [], departmentIds: [] };
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
                id: `scheduleTemplate_${Date.now()}`, // Use consistent prefix
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
                 const updatedTemplates = [...prevTemplates, newTemplate]
                     .sort((a, b) => (b.createdAt instanceof Date ? b.createdAt.getTime() : 0) - (a.createdAt instanceof Date ? a.createdAt.getTime() : 0)); // Sort newest first
                console.log("[Save Effect] Updating saved templates state with:", updatedTemplates); // Log before setting state
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
                     const departmentExists = departments.some(d => d.id === deptId);
                     if (!departmentExists) {
                         console.warn(`Department ${deptId} from template not found, skipping assignments.`);
                         return;
                     }
                     // Ensure the department exists in the target location
                     const departmentInLocation = filteredDepartments.some(d => d.id === deptId);
                      if (!departmentInLocation) {
                          console.warn(`Department ${deptId} from template does not belong to the current location (${selectedLocationId}), skipping assignments.`);
                         return;
                      }

                    hydrated[deptId] = (templateAssignments[deptId] || []).map(templateAssign => {
                        const fullEmployee = employees.find(emp => emp.id === templateAssign.employee.id);
                        if (!fullEmployee) {
                            console.warn(`Employee ${templateAssign.employee.id} from template not found, skipping assignment.`);
                            return null; // Skip assignment if employee doesn't exist
                        }
                        // Check if employee is already assigned on this date
                        const existingDaySchedule = updatedSchedule[dateKey];
                        const isAlreadyAssigned = Object.values(existingDaySchedule?.assignments || {}).flat().some(a => a.employee.id === fullEmployee.id);

                         if (isAlreadyAssigned) {
                             console.warn(`Employee ${fullEmployee.name} is already assigned on ${dateKey}, skipping duplicate assignment from template.`);
                             return null;
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
                weekDates.forEach((date, index) => { // Use index for potential day mapping if needed
                    // Find the corresponding template data for this day of the week
                    // Assuming template keys are 'yyyy-MM-dd' from the week it was saved
                    const templateDateKeys = Object.keys(weeklyTemplateAssignments);
                    // Find the template key corresponding to the same day of the week (Monday=0, Sunday=6)
                    const sourceDateKey = templateDateKeys.find(key => {
                       try {
                           const sourceDate = parseISO(key);
                           return isValid(sourceDate) && getDay(sourceDate) === getDay(date);
                       } catch {
                           return false;
                       }
                    });

                    const dateKey = format(date, 'yyyy-MM-dd');
                    // Clear existing data for the target day first
                    delete updatedSchedule[dateKey];


                    if (sourceDateKey && weeklyTemplateAssignments[sourceDateKey]) {
                        const dailyAssignmentsFromTemplate = weeklyTemplateAssignments[sourceDateKey];
                        // Hydrate assignments specifically for this date from the template
                        const hydratedAssignmentsForDay = hydrateAndCreateAssignments(dailyAssignmentsFromTemplate, date);

                        // Only update if there are actually assignments after hydration/validation
                        if (Object.keys(hydratedAssignmentsForDay).length > 0 && Object.values(hydratedAssignmentsForDay).some(dept => dept.length > 0)) {
                            updatedSchedule[dateKey] = {
                                date: date,
                                assignments: hydratedAssignmentsForDay,
                            };
                            console.log(`[Load Template] Applied WEEK template assignments from ${sourceDateKey} to ${dateKey}:`, hydratedAssignmentsForDay);
                        } else {
                             console.log(`[Load Template] Template had no valid assignments for ${dateKey} after validation/hydration.`);
                         }
                     } else {
                         console.log(`[Load Template] Template had no corresponding data for ${dateKey} (target day index ${index}).`);
                     }
                 });
            }

            return updatedSchedule;
        });

        toast({ title: "Template Aplicado", description: `Se aplicaron las asignaciones del template "${templateToLoad.name}".` });
        // Optionally close the config modal after loading
        // setIsConfigModalOpen(false);
        setIsTemplateListModalOpen(false); // Close the template list modal

    }, [savedTemplates, viewMode, targetDate, weekDates, setScheduleData, toast, employees, departments, filteredDepartments, selectedLocationId]); // Added dependencies


     const handleDeleteTemplate = (templateId: string) => {
         setSavedTemplates(prevTemplates => prevTemplates.filter(t => t.id !== templateId));
         toast({ title: 'Template Eliminado', variant: 'destructive' });
         setTemplateToDeleteId(null); // Close the confirmation dialog
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


    // --- Filtered Data for Config Lists ---
    const filteredLocationsData = useMemo(() =>
        locations.filter(loc => loc.name.toLowerCase().includes(locationSearch.toLowerCase())),
        [locations, locationSearch]
    );
    const filteredDepartmentsData = useMemo(() =>
        departments.filter(dept => dept.name.toLowerCase().includes(departmentSearch.toLowerCase())),
        [departments, departmentSearch]
    );
    const filteredEmployeesData = useMemo(() =>
        employees.filter(emp => emp.name.toLowerCase().includes(employeeSearch.toLowerCase()) || emp.id.toLowerCase().includes(employeeSearch.toLowerCase())),
        [employees, employeeSearch]
    );
    const filteredTemplatesData = useMemo(() =>
        savedTemplates.filter(tpl => tpl.name.toLowerCase().includes(templateSearch.toLowerCase())),
        [savedTemplates, templateSearch]
    );


    // --- New Config Modal Rendering Logic ---
    const renderConfigListContent = (items: any[], type: 'location' | 'department' | 'employee' | 'template') => (
        <ScrollArea className="h-[calc(100%-4rem)] border rounded-md p-2"> {/* Adjust height dynamically */}
            {items.map(item => (
                <div
                    key={item.id}
                    onClick={() => openConfigForm(type, item)}
                    className={cn(
                        `p-2 mb-1 rounded cursor-pointer hover:bg-accent flex items-center justify-between group`,
                        selectedConfigItem?.id === item.id ? 'bg-accent font-semibold' : ''
                    )}
                >
                    <span className="truncate flex items-center gap-1 flex-grow min-w-0 mr-2"> {/* Allow shrinking */}
                        {type === 'department' && item.icon && React.createElement(item.icon, { className: 'h-3 w-3 mr-1 flex-shrink-0' })}
                        {item.name}
                        {type === 'department' && <span className="text-xs italic ml-1">({locations.find(l => l.id === item.locationId)?.name || 'Sede?'})</span>}
                        {type === 'employee' && <span className="text-xs italic ml-1">(ID: {item.id})</span>}
                        {type === 'template' && <span className="text-xs italic ml-1">({item.type}, {item.createdAt ? format(new Date(item.createdAt), 'dd/MM/yy') : '?'})</span>}
                    </span>
                     {/* Action buttons (Edit, Delete) - Ensure they don't wrap */}
                     <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-0.5 flex-shrink-0"> {/* Prevent shrinking */}
                        {type !== 'template' && ( // Templates might not have an edit form
                             <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); openConfigForm(type, item); }} title={`Editar ${type}`}>
                                 <Edit className="h-4 w-4" />
                             </Button>
                        )}
                         {type === 'employee' && (
                             <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); handleCopyEmployeeId(item.id); }} title="Copiar ID">
                                 <Copy className="h-4 w-4" />
                             </Button>
                         )}
                          {/* Load template button */}
                          {type === 'template' && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                onClick={(e) => { e.stopPropagation(); handleLoadTemplate(item.id); }}
                                title="Cargar Template"
                            >
                                <Upload className="h-4 w-4" />
                            </Button>
                         )}
                         {/* Delete Button */}
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                                 <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={(e) => e.stopPropagation()} title={`Eliminar ${type}`}>
                                     <Trash2 className="h-4 w-4" />
                                 </Button>
                            </AlertDialogTrigger>
                           <AlertDialogContent>
                               <AlertDialogHeader> <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle> <AlertDialogDescription> Eliminar {type} "{item.name}"? Esta acción no se puede deshacer. </AlertDialogDescription> </AlertDialogHeader>
                               <AlertDialogFooter>
                                   <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancelar</AlertDialogCancel>
                                   <AlertDialogAction onClick={(e) => { e.stopPropagation(); confirmDeleteItem(type, item.id, item.name); }} className="bg-destructive hover:bg-destructive/90"> Eliminar </AlertDialogAction>
                               </AlertDialogFooter>
                           </AlertDialogContent>
                         </AlertDialog>
                     </div>
                </div>
            ))}
            {items.length === 0 && <div className="text-center text-muted-foreground p-4">No hay elementos.</div>}
        </ScrollArea>
    );

    const renderConfigDetailForm = () => {
        if (!configFormType) {
            return <div className="p-4 text-center text-muted-foreground">Selecciona un elemento de la lista para ver/editar detalles o presiona '+' para crear uno nuevo.</div>;
        }

        switch (configFormType) {
            case 'location':
                return (
                    <Card className="h-full flex flex-col">
                        <CardHeader>
                            <CardTitle>{selectedConfigItem ? 'Editar' : 'Agregar'} Sede</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-grow space-y-3">
                            <Label htmlFor="location-name">Nombre</Label>
                            <Input id="location-name" value={locationFormData.name} onChange={(e) => setLocationFormData({ name: e.target.value })} placeholder="Nombre de la Sede" />
                        </CardContent>
                         <CardFooter className="flex justify-end gap-2 border-t pt-4">
                            <Button variant="ghost" onClick={() => { setConfigFormType(null); setSelectedConfigItem(null); }}>Cancelar</Button>
                            <Button onClick={handleSaveLocation}>Guardar Sede</Button>
                        </CardFooter>
                    </Card>
                );
            case 'department':
                return (
                    <Card className="h-full flex flex-col">
                        <CardHeader>
                            <CardTitle>{selectedConfigItem ? 'Editar' : 'Agregar'} Departamento</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-grow space-y-3 overflow-y-auto max-h-[calc(100%_-_150px)]"> {/* Added scroll */}
                            <div>
                                <Label htmlFor="department-name">Nombre</Label>
                                <Input id="department-name" value={departmentFormData.name} onChange={(e) => setDepartmentFormData(prev => ({ ...prev, name: e.target.value }))} placeholder="Nombre del Departamento" />
                            </div>
                            <div>
                                <Label htmlFor="department-location">Sede</Label>
                                <Select value={departmentFormData.locationId} onValueChange={(value) => setDepartmentFormData(prev => ({ ...prev, locationId: value }))}>
                                    <SelectTrigger id="department-location"><SelectValue placeholder="Selecciona una sede" /></SelectTrigger>
                                    <SelectContent> {locations.map(loc => <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>)} </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="department-icon">Icono (Opcional)</Label>
                                <Select value={departmentFormData.iconName} onValueChange={(value) => setDepartmentFormData(prev => ({ ...prev, iconName: value === 'ninguno' ? undefined : value }))}>
                                    <SelectTrigger id="department-icon"><SelectValue placeholder="Selecciona icono" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ninguno">Ninguno</SelectItem>
                                        {Object.keys(iconMap).map(iconName => <SelectItem key={iconName} value={iconName}><span className='flex items-center gap-2'>{React.createElement(iconMap[iconName], { className: 'h-4 w-4' })} {iconName}</span></SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                         <CardFooter className="flex justify-end gap-2 border-t pt-4">
                            <Button variant="ghost" onClick={() => { setConfigFormType(null); setSelectedConfigItem(null); }}>Cancelar</Button>
                            <Button onClick={handleSaveDepartment}>Guardar Departamento</Button>
                        </CardFooter>
                    </Card>
                );
            case 'employee':
                return (
                     <Card className="h-full flex flex-col">
                        <CardHeader>
                            <CardTitle>{selectedConfigItem ? 'Editar' : 'Agregar'} Colaborador</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-grow space-y-3 overflow-y-auto max-h-[calc(100%_-_150px)]"> {/* Make content scrollable */}
                            <div>
                                <Label htmlFor="employee-id">ID Colaborador</Label>
                                <Input id="employee-id" value={employeeFormData.id} onChange={(e) => setEmployeeFormData(prev => ({ ...prev, id: e.target.value }))} placeholder="ID (Ej: Cédula)" disabled={!!selectedConfigItem} />
                            </div>
                            <div>
                                <Label htmlFor="employee-name">Nombre Completo</Label>
                                <Input id="employee-name" value={employeeFormData.name} onChange={(e) => setEmployeeFormData(prev => ({ ...prev, name: e.target.value }))} placeholder="Nombre y Apellido" />
                            </div>
                            {/* Location Multi-Select */}
                            <div>
                                <Label>Sedes</Label>
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
                            </div>
                            {/* Department Multi-Select */}
                            <div>
                                <Label>Departamentos (Opcional)</Label>
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
                            </div>
                        </CardContent>
                         <CardFooter className="flex justify-end gap-2 border-t pt-4">
                            <Button variant="ghost" onClick={() => { setConfigFormType(null); setSelectedConfigItem(null); }}>Cancelar</Button>
                            <Button onClick={handleSaveEmployee}>Guardar Colaborador</Button>
                        </CardFooter>
                    </Card>
                );
            case 'template':
                // Templates are handled directly in the list view (load/delete)
                return <div className="p-4 text-center text-muted-foreground">Selecciona un template de la lista para cargarlo o eliminarlo.</div>;
        }
    };


    return (
        <main className="container mx-auto p-4 md:p-8 max-w-full">
            {/* Loading Indicator Overlay */}
            {isLoadingPage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                    <Loader2 className="h-16 w-16 animate-spin text-primary" />
                </div>
            )}

             {/* Decorative Images */}
              {/* Left image */}
              <div className="absolute top-[-20px] left-8 -z-10 opacity-70 dark:opacity-30 pointer-events-none" aria-hidden="true">
                <Image
                    src="https://i.postimg.cc/NFs0pvpq/Recurso-4.png" // Left image source
                    alt="Ilustración de taza de café"
                    width={120} // Increased width
                    height={120} // Increased height proportionally
                    className="object-contain transform -rotate-12" // Adjusted vertical position
                    data-ai-hint="coffee cup illustration"
                />
            </div>
            {/* Right image */}
            <div className="absolute top-[-90px] right-[-20px] -z-10 opacity-70 dark:opacity-30 pointer-events-none" aria-hidden="true">
                 <Image
                    src="https://i.postimg.cc/J0xsLzGz/Recurso-3.png" // Right image source
                    alt="Ilustración de elementos de oficina"
                    width={150}
                    height={150}
                    className="object-contain transform rotate-12"
                    data-ai-hint="office elements illustration"
                 />
             </div>


             {/* Title */}
              <div className="text-center mb-6 md:mb-8">
                 <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary via-foreground/80 to-primary">
                    Planificador de Horarios
                 </h1>
                 <p className="text-sm sm:text-base text-muted-foreground mt-1 md:mt-2">Gestiona turnos, sedes y colaboradores</p>
             </div>


             {/* Controls Section - Top Bar */}
              <div className="bg-transparent border-none shadow-none p-0 mb-6 md:mb-8">
                      <div className="flex flex-col md:flex-row items-center justify-center gap-4 flex-wrap p-0">
                         {/* Location Selector & Config Button */}
                         <div className="flex items-center gap-2 flex-shrink-0">
                             <Building className="h-5 w-5 text-primary flex-shrink-0" />
                             <LocationSelector
                                 locations={locations}
                                 selectedLocationId={selectedLocationId}
                                 onLocationChange={handleLocationChange}
                             />
                              <Dialog open={isConfigModalOpen} onOpenChange={setIsConfigModalOpen}>
                                   <DialogTrigger asChild>
                                       <Button variant="ghost" size="icon" title="Configuración">
                                           <Settings className="h-5 w-5"/>
                                       </Button>
                                   </DialogTrigger>
                                    <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0"> {/* Adjusted padding */}
                                      <DialogHeader className="p-4 border-b"> {/* Added padding */}
                                          <DialogTitle>Configuración General</DialogTitle>
                                          <DialogDescription>Gestiona sedes, departamentos, colaboradores y templates.</DialogDescription>
                                      </DialogHeader>
                                        <div className="flex-grow overflow-hidden p-4"> {/* Added padding */}
                                            <Tabs defaultValue="sedes" className="w-full h-full flex flex-col" value={activeConfigTab} onValueChange={ tabValue => { setActiveConfigTab(tabValue); setConfigFormType(null); setSelectedConfigItem(null); } }>
                                              <TabsList className="grid w-full grid-cols-4 mb-4">
                                                <TabsTrigger value="sedes">Sedes</TabsTrigger>
                                                <TabsTrigger value="departamentos">Departamentos</TabsTrigger>
                                                <TabsTrigger value="colaboradores">Colaboradores</TabsTrigger>
                                                <TabsTrigger value="templates">Templates</TabsTrigger>
                                              </TabsList>

                                               <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-grow overflow-hidden"> {/* Layout Lista + Detalle */}
                                                    {/* Columna Izquierda: Barra de Acciones y Lista */}
                                                    <div className="md:col-span-1 flex flex-col gap-4 h-full overflow-hidden">
                                                        {/* Barra de Acciones (Con Input de Búsqueda) */}
                                                        <div className="flex items-center gap-2 flex-shrink-0">
                                                             <Input
                                                                 placeholder={`Buscar en ${activeConfigTab}...`}
                                                                 className="flex-grow"
                                                                 value={
                                                                     activeConfigTab === 'sedes' ? locationSearch :
                                                                     activeConfigTab === 'departamentos' ? departmentSearch :
                                                                     activeConfigTab === 'colaboradores' ? employeeSearch :
                                                                     templateSearch
                                                                 }
                                                                 onChange={(e) => {
                                                                     const value = e.target.value;
                                                                     if (activeConfigTab === 'sedes') setLocationSearch(value);
                                                                     else if (activeConfigTab === 'departamentos') setDepartmentSearch(value);
                                                                     else if (activeConfigTab === 'colaboradores') setEmployeeSearch(value);
                                                                     else if (activeConfigTab === 'templates') setTemplateSearch(value);
                                                                 }}
                                                             />
                                                            {activeConfigTab !== 'templates' && ( // No Add button for templates here
                                                                <Button
                                                                    variant="outline"
                                                                    size="icon"
                                                                    onClick={() => openConfigForm(activeConfigTab as 'location' | 'department' | 'employee', null)} // Correctly cast type and ensure null is passed for new items
                                                                    title={`Agregar ${activeConfigTab}`}
                                                                >
                                                                    <PlusCircle className="h-4 w-4" />
                                                                </Button>
                                                             )}
                                                        </div>

                                                         {/* Contenido de la Lista según la Pestaña Activa */}
                                                        <div className="flex-grow overflow-hidden"> {/* Make list area scrollable */}
                                                            <TabsContent value="sedes" className="mt-0 h-full"> {renderConfigListContent(filteredLocationsData, 'location')} </TabsContent>
                                                            <TabsContent value="departamentos" className="mt-0 h-full"> {renderConfigListContent(filteredDepartmentsData, 'department')} </TabsContent>
                                                            <TabsContent value="colaboradores" className="mt-0 h-full"> {renderConfigListContent(filteredEmployeesData, 'employee')} </TabsContent>
                                                            <TabsContent value="templates" className="mt-0 h-full"> {renderConfigListContent(filteredTemplatesData, 'template')} </TabsContent>
                                                        </div>
                                                    </div>

                                                     {/* Columna Derecha: Formulario de Detalle/Edición */}
                                                    <div className="md:col-span-2 h-full overflow-hidden"> {/* Ensure form area uses available height */}
                                                        {renderConfigDetailForm()}
                                                    </div>
                                                </div>
                                            </Tabs>
                                       </div>
                                       {/* Removed DialogFooter to provide more space */}
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
                                                 isHoliday(targetDate) && 'border-primary font-semibold border-2' // Keep primary border for holiday
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
                    {/* Template List Button */}
                    <Button onClick={() => setIsTemplateListModalOpen(true)} variant="outline" className="hover:bg-primary hover:text-primary-foreground">
                        <List className="mr-2 h-4 w-4" /> Templates
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
                                 Esta acción eliminará todos los turnos y notas de la semana del{' '}
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
                        {isSavingTemplate ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                        Guardar Template
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
                 onDeleteNote={(id) => setNoteToDeleteId(id)} // Trigger delete confirmation
                 initialDate={notesModalForDate || undefined} // Pass specific date if set
                 // Pass context for filtering
                 viewMode={viewMode}
                 currentDate={currentDate}
                 weekDates={weekDates}
             />
             {/* Note Delete Confirmation Dialog */}
              <AlertDialog open={!!noteToDeleteId} onOpenChange={(open) => !open && setNoteToDeleteId(null)}>
                  <AlertDialogContent>
                      <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar esta anotación?</AlertDialogTitle>
                          <AlertDialogDescription>
                              "{scheduleNotes.find(note => note.id === noteToDeleteId)?.note || ''}"
                              <br />
                              Esta acción no se puede deshacer.
                          </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => setNoteToDeleteId(null)}>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                              onClick={() => noteToDeleteId && deleteScheduleNote(noteToDeleteId)} // Call direct delete function
                              className="bg-destructive hover:bg-destructive/90">
                              Eliminar Anotación
                          </AlertDialogAction>
                      </AlertDialogFooter>
                  </AlertDialogContent>
              </AlertDialog>

             {/* Template List Modal */}
             <Dialog open={isTemplateListModalOpen} onOpenChange={setIsTemplateListModalOpen}>
                <DialogContent className="max-w-lg">
                     <DialogHeader>
                         <DialogTitle>Templates Guardados</DialogTitle>
                         <DialogDescription>
                             Selecciona un template para cargarlo o eliminarlo. Se muestran los templates correspondientes a la sede y vista actual ({viewMode}).
                         </DialogDescription>
                     </DialogHeader>
                     <ScheduleTemplateList
                         templates={filteredTemplates} // Use the memoized filtered list
                         onLoadTemplate={handleLoadTemplate}
                         onDeleteTemplate={(id) => setTemplateToDeleteId(id)} // Trigger delete confirmation
                     />
                     <DialogFooter>
                         <Button variant="secondary" onClick={() => setIsTemplateListModalOpen(false)}>Cerrar</Button>
                     </DialogFooter>
                </DialogContent>
             </Dialog>
              {/* Template Delete Confirmation Dialog */}
              <AlertDialog open={!!templateToDeleteId} onOpenChange={(open) => !open && setTemplateToDeleteId(null)}>
                  <AlertDialogContent>
                      <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar este Template?</AlertDialogTitle>
                          <AlertDialogDescription>
                              "{savedTemplates.find(t => t.id === templateToDeleteId)?.name || ''}"
                              <br />
                              Esta acción no se puede deshacer.
                          </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => setTemplateToDeleteId(null)}>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                              onClick={() => templateToDeleteId && handleDeleteTemplate(templateToDeleteId)}
                              className="bg-destructive hover:bg-destructive/90">
                              Eliminar Template
                          </AlertDialogAction>
                      </AlertDialogFooter>
                  </AlertDialogContent>
              </AlertDialog>

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
                              {itemToDelete?.type === 'department' && `Eliminar Departamento "${itemToDelete?.name}"? Se eliminarán los turnos asociados en horarios y templates. Esta acción no se puede deshacer.`}
                              {itemToDelete?.type === 'employee' && `Eliminar Colaborador "${itemToDelete?.name}"? Se eliminarán sus turnos asociados en horarios y templates. Esta acción no se puede deshacer.`}
                              {itemToDelete?.type === 'template' && `Eliminar Template "${itemToDelete?.name}"? Esta acción no se puede deshacer.`} {/* Added template message */}
                          </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancelar</AlertDialogCancel>
                           {/* Pass item details to handleDeleteItem when action is confirmed */}
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
                            Esta acción eliminará todos los turnos y notas de la semana del{' '}
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
