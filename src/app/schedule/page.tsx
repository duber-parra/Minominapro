// src/app/schedule/page.tsx
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
import { Plus, Trash2, Edit, ChevronsLeft, ChevronsRight, Calendar as CalendarModernIcon, Users, Building, Building2, MinusCircle, ChevronsUpDown, Settings, Save, CopyPlus, Eraser, Download, FileX2, FileDown, PencilLine, Share2, Loader2, Check, Copy, Upload, FolderUp, FileJson, List, UploadCloud, FileText, NotebookPen, CalendarX, FolderSync, BarChartHorizontal, Library, X, Notebook, User, ImportIcon, ListCollapse, PlusCircle, ChefHat, Utensils, Wine, Archive } from 'lucide-react'; // Added NotebookPen, CalendarX, FolderSync, BarChartHorizontal, ChefHat, Utensils, Wine, Archive, Download, Upload, FileJson
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
} from "@/components/ui/dropdown-menu"; // Import DropdownMenu components
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
import { WeekNavigator } from '@/components/schedule/WeekNavigator'; // Import WeekNavigator
import { ScheduleNotesModal } from '@/components/schedule/ScheduleNotesModal'; // Import Notes modal
import { SummaryDashboard } from '@/components/schedule/SummaryDashboard'; // Import the dashboard
import { ConfigTabs } from '@/components/schedule/ConfigTabs'; // Import ConfigTabs
import { ScheduleTemplateList } from '@/components/schedule/ScheduleTemplateList'; // Re-added ScheduleTemplateList import

import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { EmployeeSelectionModal } from '@/components/schedule/EmployeeSelectionModal';
import type { Location, Department, Employee, ShiftAssignment, ScheduleData, DailyAssignments, WeeklyAssignments, ScheduleTemplate, ScheduleNote, ShiftDetails } from '@/types/schedule'; // Added ScheduleTemplate and ScheduleNote, ShiftDetails
import { startOfWeek, endOfWeek, addDays, format, addWeeks, subWeeks, parseISO, getYear, isValid, differenceInMinutes, parse as parseDateFns, isSameDay, isWithinInterval, getDay } from 'date-fns'; // Added endOfWeek, parseDateFns
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { getColombianHolidays } from '@/services/colombian-holidays';
import { exportScheduleToPDF, exportConsolidatedScheduleToPDF, ScheduleExportData } from '@/lib/schedule-pdf-exporter'; // Import BOTH PDF export functions
import { formatTo12Hour } from '@/lib/time-utils';
// Removed direct import of parse from date-fns as it conflicts


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
const SCHEDULE_TEMPLATES_KEY = 'schedulePlannerTemplates'; // Key for templates

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
    Building2: Building2,
    ChefHat: ChefHat,   // Nuevo: Icono de Chef
    Utensils: Utensils, // Nuevo: Icono de Utensilios (para Salón/Meseros)
    Wine: Wine,         // Nuevo: Icono de Copa (para Barra)
    Archive: Archive,   // Nuevo: Icono de Caja (para Bodega)
};
const initialDepartments: Department[] = [
  { id: 'dep-1', name: 'Cocina', locationId: 'loc-1', icon: ChefHat }, // Usa ChefHat
  { id: 'dep-2', name: 'Salón', locationId: 'loc-1', icon: Utensils }, // Usa Utensils
  { id: 'dep-3', name: 'Caja & Barra', locationId: 'loc-2', icon: Wine }, // Usa Wine
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
        const startTime = parseDateFns(`${startDateStr} ${assignment.startTime}`, 'yyyy-MM-dd HH:mm', new Date());

        const startTimeMinutes = parseTimeToMinutes(assignment.startTime);
        const endTimeMinutes = parseTimeToMinutes(assignment.endTime);
        let endTime = parseDateFns(`${startDateStr} ${assignment.endTime}`, 'yyyy-MM-dd HH:mm', new Date());
        if (!isValid(endTime) || endTimeMinutes < startTimeMinutes) {
             if (endTimeMinutes < startTimeMinutes) {
                endTime = addDays(parseDateFns(`${startDateStr} ${assignment.endTime}`, 'yyyy-MM-dd HH:mm', new Date()), 1);
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
                   // Handle Templates: Revive dates if needed
                   if (key === SCHEDULE_TEMPLATES_KEY) {
                       console.log("[loadFromLocalStorage] Processing templates:", parsed);
                       try {
                           return parsed.map((tpl: any) => {
                               console.log("[loadFromLocalStorage] Raw template:", tpl);
                               if (!tpl || typeof tpl !== 'object' || !tpl.id || !tpl.name) {
                                   console.warn("[loadFromLocalStorage] Skipping invalid template object:", tpl);
                                   return null; // Skip invalid templates
                               }
                               // Ensure assignments is an object (can be empty)
                               const assignments = (tpl.assignments && typeof tpl.assignments === 'object' && !Array.isArray(tpl.assignments)) ? tpl.assignments : {};
                               const revived = {
                                   ...tpl,
                                   assignments: assignments, // Use validated/defaulted assignments
                                   createdAt: tpl.createdAt && typeof tpl.createdAt === 'string' ? parseISO(tpl.createdAt) : (tpl.createdAt instanceof Date ? tpl.createdAt : undefined),
                               };
                                if (revived.createdAt && !isValid(revived.createdAt)) {
                                    console.warn(`[loadFromLocalStorage] Invalid createdAt date for template ${tpl.id}: ${tpl.createdAt}. Setting to undefined.`);
                                    revived.createdAt = undefined; // Set to undefined if parsing failed
                                }
                               console.log("[loadFromLocalStorage] Revived template:", revived);
                               return revived;
                           }).filter(tpl => tpl !== null) as T; // Filter out null (invalid) templates
                       } catch (templateError) {
                           console.error("[loadFromLocalStorage] Error processing templates array:", templateError, "Raw data:", parsed);
                           return defaultValue; // Return default if processing fails
                       }
                   }
                 return parsed as T;
            } else {
                console.warn(`[loadFromLocalStorage] Expected array for key ${key}, but found:`, typeof parsed, ". Returning default.");
                // If data exists but is not an array, remove it (except for notes and schedule data)
                if(key !== SCHEDULE_NOTES_KEY && key !== SCHEDULE_DATA_KEY && key !== SCHEDULE_TEMPLATES_KEY ) {
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
             // Schedule notes are stored as a string, no parsing needed
             return (savedData ?? defaultValue) as T;
        } else {
            // For unknown keys, just return the parsed data if it's not null/undefined
            return parsed as T;
        }
    } catch (error) {
        // Handle JSON parsing errors or other potential issues
         if (error instanceof SyntaxError) {
             console.error(`Error parsing JSON from localStorage for key ${key}:`, error.message, "Saved data:", localStorage.getItem(key));
              // Remove corrupted data for keys other than SCHEDULE_NOTES_KEY and SCHEDULE_TEMPLATES_KEY
             if (key !== SCHEDULE_NOTES_KEY && key !== SCHEDULE_TEMPLATES_KEY ) {
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


// --- Helper function to load Schedule Templates ---
// Ensure this function correctly parses templates including the 'assignments' structure
const loadScheduleTemplates = (): ScheduleTemplate[] => {
    if (typeof window === 'undefined') return []; // Only on client

    const loadedTemplates = loadFromLocalStorage<ScheduleTemplate[]>(SCHEDULE_TEMPLATES_KEY, []);
    console.log(`[loadScheduleTemplates] Loaded ${loadedTemplates.length} templates from main key.`);

    // Log the structure of loaded templates for debugging
    loadedTemplates.forEach((tpl, index) => {
        console.log(`[loadScheduleTemplates] Template ${index}:`, tpl);
        // Ensure assignments is an object, not potentially undefined or other type
        if (tpl.assignments === null || typeof tpl.assignments !== 'object' || Array.isArray(tpl.assignments)) {
            console.warn(`[loadScheduleTemplates] Template ${tpl.id} has invalid assignments structure. Resetting.`);
            tpl.assignments = {}; // Reset to empty object if invalid
        }
    });

    // Sort alphabetically by name
    return loadedTemplates.sort((a, b) => a.name.localeCompare(b.name));
};



// New interface for the summary data
interface EmployeeHoursSummary {
  id: string;
  name: string;
  totalHours: number;
}


export default function SchedulePage() {
    // --- State Initialization ---
    const [currentDate, setCurrentDate] = useState<Date | null>(null); // Initialize as null
    const [viewMode, setViewMode] = useState<'day' | 'week'>('week');
    const [locations, setLocations] = useState<Location[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [scheduleData, setScheduleData] = useState<{ [dateKey: string]: ScheduleData }>({});
    const [scheduleNotes, setScheduleNotes] = useState<ScheduleNote[]>([]); // State for calendar notes/events
    const [isNotesModalOpen, setIsNotesModalOpen] = useState(false); // State for the notes modal
    const [scheduleTemplates, setScheduleTemplates] = useState<ScheduleTemplate[]>([]); // State for templates
    const [isSavingTemplate, setIsSavingTemplate] = useState<boolean>(false); // State for template saving modal
    const [templateToDeleteId, setTemplateToDeleteId] = useState<string | null>(null); // State for confirming template deletion
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


    const [notes, setNotes] = useState<string>(defaultNotesText); // Initialize notes string state
    const [selectedLocationId, setSelectedLocationId] = useState<string>('');

    const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
    const [isEmployeeSelectionModalOpen, setIsEmployeeSelectionModalOpen] = useState(false);
    const [shiftRequestContext, setShiftRequestContext] = useState<{ departmentId: string; date: Date } | null>(null);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [editingShift, setEditingShift] = useState<{ assignment: ShiftAssignment; date: Date; departmentId: string } | null>(null);
    const [targetDate, setTargetDate] = useState<Date>(new Date()); // Used for day view and template application context

    // --- Config Modal State ---
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
    const [configFormType, setConfigFormType] = useState<'location' | 'department' | 'employee' | 'template' | null>(null); // Re-added 'template'
    const [selectedConfigItem, setSelectedConfigItem] = useState<any | null>(null); // State for the item selected in the new config modal list
    const [activeConfigTab, setActiveConfigTab] = useState<string>("sedes"); // State for the active tab in the new config modal

    const [locationFormData, setLocationFormData] = useState({ name: '' });

    const [departmentFormData, setDepartmentFormData] = useState<{ name: string, locationId: string, iconName?: string }>({ name: '', locationId: '', iconName: undefined });

    const [employeeFormData, setEmployeeFormData] = useState<{ id: string, name: string, locationIds: string[], departmentIds: string[] }>({ id: '', name: '', locationIds: [], departmentIds: [] });

    const [itemToDelete, setItemToDelete] = useState<{ type: 'location' | 'department' | 'employee' | 'template'; id: string; name: string } | null>(null); // Re-added 'template' type

    const [clearingDate, setClearingDate] = useState<Date | null>(null);
    const [clearingWeek, setClearingWeek] = useState<boolean>(false); // State for clearing week confirmation

    const [holidaySet, setHolidaySet] = useState<Set<string>>(new Set());
    const [isCheckingHoliday, setIsCheckingHoliday] = useState<boolean>(false);

    const [isClient, setIsClient] = useState(false);

    // --- Search States ---
    const [locationSearch, setLocationSearch] = useState('');
    const [departmentSearch, setDepartmentSearch] = useState('');
    const [employeeSearch, setEmployeeSearch] = useState('');
    const [templateSearch, setTemplateSearch] = useState(''); // State for template search

    // Loading state for page transitions
    const [isLoadingPage, setIsLoadingPage] = useState(false); // Added state

    const fileInputRef = useRef<HTMLInputElement>(null); // Ref for file input
    const scheduleJsonInputRef = useRef<HTMLInputElement>(null); // Ref for schedule JSON import


    const isMobile = useIsMobile();
    const { toast } = useToast();


    // --- Load Data from localStorage on Mount (Client-side only) ---
    useEffect(() => {
        setIsClient(true); // Mark as client-side after mount
        setIsLoadingPage(true); // Start loading indicator
        setCurrentDate(new Date()); // Initialize currentDate on mount

        const loadedLocations = loadFromLocalStorage(LOCATIONS_KEY, initialLocations);
        const loadedDepts = loadDepartmentsFromLocalStorage(initialDepartments);
        const loadedEmps = loadFromLocalStorage(EMPLOYEES_KEY, initialEmployees);
        const loadedSched = loadScheduleDataFromLocalStorage(loadedEmps, {});
        const loadedNotesStr = loadFromLocalStorage(SCHEDULE_NOTES_KEY, defaultNotesText, false); // Load general notes as string
        const loadedEvents = loadFromLocalStorage<ScheduleNote[]>(SCHEDULE_EVENTS_KEY, []); // Load calendar notes/events
        const loadedTpls = loadScheduleTemplates(); // Load templates using the new function

        setLocations(loadedLocations);
        setDepartments(loadedDepts);
        setEmployees(loadedEmps);
        setScheduleData(loadedSched);
        setNotes(loadedNotesStr);
        setScheduleNotes(loadedEvents);
        setScheduleTemplates(loadedTpls); // Set templates state

        // Set initial selected location and update form defaults accordingly
        const initialSelectedLoc = loadedLocations.length > 0 ? loadedLocations[0].id : '';
        setSelectedLocationId(initialSelectedLoc);
        setDepartmentFormData(prev => ({ ...prev, locationId: initialSelectedLoc }));
        setEmployeeFormData(prev => ({ ...prev, id: '', name: '', locationIds: initialSelectedLoc ? [initialSelectedLoc] : [], departmentIds: [] })); // Reset name/id too

        setIsLoadingPage(false); // Stop loading indicator
    }, []); // Empty dependency array ensures this runs only once on mount

    useEffect(() => {
        if (!currentDate || !isClient) return; // Don't fetch if currentDate is null or not client
        const datesInView = viewMode === 'day' ? [currentDate] : getWeekDates(currentDate); // Get relevant dates
        if (datesInView.length === 0 || !isValid(datesInView[0])) return; // Ensure we have valid dates

        const startYear = getYear(datesInView[0]);
        const endYear = getYear(datesInView[datesInView.length - 1]);
        const yearsToFetch = new Set([startYear, endYear]);

        setIsCheckingHoliday(true);
        Promise.all(Array.from(yearsToFetch).map(year => fetchAndCacheHolidays(year)))
            .then(results => {
                const combinedSet = new Set<string>();
                results.forEach(set => set.forEach(date => combinedSet.add(date)));
                setHolidaySet(combinedSet);
            })
            .catch(error => {
                console.error("Error fetching holidays for view:", error);
                setHolidaySet(new Set());
            })
            .finally(() => {
                setIsCheckingHoliday(false);
            });
    }, [currentDate, viewMode, isClient]); // Re-fetch when view or dates change


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
                localStorage.setItem(SCHEDULE_EVENTS_KEY, JSON.stringify(scheduleNotes));
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

      // --- Effect to save Schedule Templates ---
      useEffect(() => {
          if (isClient) {
              try {
                   // Ensure dates are stringified correctly and assignments is valid
                   const templatesToSave = scheduleTemplates.map(tpl => ({
                      ...tpl,
                      // Ensure assignments is always an object before stringifying
                      assignments: (tpl.assignments && typeof tpl.assignments === 'object' && !Array.isArray(tpl.assignments)) ? tpl.assignments : {},
                      createdAt: tpl.createdAt instanceof Date ? tpl.createdAt.toISOString() : tpl.createdAt,
                   }));
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
      }, [scheduleTemplates, isClient, toast]); // Added isClient and toast


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
     const weekDates = useMemo(() => currentDate ? getWeekDates(currentDate) : [], [currentDate]);

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

     // Filter templates by selected location and current view mode
     const filteredTemplates = useMemo(() => {
        console.log("[Filter Memo] All templates in state:", scheduleTemplates); // Log all templates
        // Ensure scheduleTemplates is always an array before filtering
        const templatesArray = Array.isArray(scheduleTemplates) ? scheduleTemplates : [];
        const filtered = templatesArray.filter(temp => {
             // Check if temp.type matches viewMode ('day' or 'week')
            const typeMatch = temp.type === viewMode;
             // Check if temp.locationId matches selectedLocationId
             const locationMatch = temp.locationId === selectedLocationId;
             // Log details for debugging
             console.log(`[Filter Memo] Template ${temp.id} (${temp.name}): Type Match=${typeMatch} (template type: ${temp.type}, view mode: ${viewMode}), Loc Match=${locationMatch} (template loc: ${temp.locationId}, selected loc: ${selectedLocationId})`);
            return typeMatch && locationMatch;
        });
        console.log(`[Filter Memo] Filtered templates for loc ${selectedLocationId}, view ${viewMode}:`, filtered); // Log filtered templates
        return filtered;
    }, [scheduleTemplates, selectedLocationId, viewMode]);



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
             // Use shiftRequestContext.date if available (from + button), otherwise targetDate (from general day view)
             const dateToFilterBy = shiftRequestContext?.date || targetDate;
             if (dateToFilterBy && isValid(dateToFilterBy)) { // Check if date is valid
                const targetDayKey = format(dateToFilterBy, 'yyyy-MM-dd');
                const assignedOnTargetDay = new Set<string>();
                const daySchedule = scheduleData[targetDayKey];
                if (daySchedule && daySchedule.assignments) {
                     Object.values(daySchedule.assignments).flat().forEach(assignment => {
                         assignedOnTargetDay.add(assignment.employee.id);
                     });
                }
                potentiallyAvailable = potentiallyAvailable.filter(emp => !assignedOnTargetDay.has(emp.id));
             } else {
                 console.warn("Available employees filter: No valid date found for filtering.");
             }
        } else { // Week view drag-drop list should show all employees for the location
             // Show all employees for the location in the week view list
             potentiallyAvailable = filteredEmployees;
        }


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
        if (!employee || !targetDepartment || !isValid(dropDate)) {
             console.error("Error finding employee, department, or date for drop.");
             return;
        }


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
     const openConfigForm = (type: 'location' | 'department' | 'employee' | 'template', item: Location | Department | Employee | ScheduleTemplate | null = null) => { // Added 'template'
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
                 const deptLocationId = dept?.locationId || selectedLocationId || (locations.length > 0 ? locations[0].id : '');
                setDepartmentFormData({
                    name: dept?.name || '',
                    locationId: deptLocationId,
                    iconName: iconName
                });
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
                break;
            case 'template':
                 console.warn("Template viewing/editing form.");
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
                    if (updatedSchedule[dateKey] && updatedSchedule[dateKey].assignments) { // Check if assignments exist
                        Object.keys(updatedSchedule[dateKey].assignments).forEach(deptId => {
                            updatedSchedule[dateKey].assignments[deptId] = updatedSchedule[dateKey].assignments[deptId].map(assignment => {
                                if (assignment.employee.id === id) {
                                    return { ...assignment, employee: updatedEmployeeData };
                                }
                                return assignment;
                            });
                        });
                    }
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


     const confirmDeleteItem = (type: 'location' | 'department' | 'employee' | 'template', id: string, name: string) => { // Added 'template'
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
                      // Also remove templates associated with the deleted location
                      setScheduleTemplates(prevTpls => prevTpls.filter(tpl => tpl.locationId !== itemToDelete.id));
                     setScheduleData(prevSchedule => {
                         const updatedSchedule = { ...prevSchedule };
                         Object.keys(updatedSchedule).forEach(dateKey => {
                             if (updatedSchedule[dateKey]?.assignments) { // Check if day exists
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
                                        delete updatedSchedule[dateKey]; // Delete day if no assignments left
                                }
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
                          if (updatedScheduleDept[dateKey]?.assignments?.[itemToDelete.id]) { // Check if day and dept exist
                              delete updatedScheduleDept[dateKey].assignments[itemToDelete.id];
                              if (Object.keys(updatedScheduleDept[dateKey].assignments).length === 0) {
                                   delete updatedScheduleDept[dateKey];
                              }
                          }
                     });
                     setScheduleData(updatedScheduleDept);
                      // Also remove department references from templates
                      setScheduleTemplates(prevTpls => prevTpls.map(tpl => {
                         if (tpl.assignments) {
                             if (tpl.type === 'day' && (tpl.assignments as DailyAssignments)[itemToDelete.id]) {
                                 delete (tpl.assignments as DailyAssignments)[itemToDelete.id];
                             } else if (tpl.type === 'week') {
                                 Object.keys(tpl.assignments).forEach(dateKey => {
                                     const weeklyAssignments = tpl.assignments as WeeklyAssignments;
                                     if (weeklyAssignments[dateKey] && weeklyAssignments[dateKey][itemToDelete.id]) {
                                         delete weeklyAssignments[dateKey][itemToDelete.id];
                                     }
                                 });
                             }
                         }
                         return tpl;
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
                          if (updatedScheduleEmp[dateKey]?.assignments) { // Check if day exists
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
                          }
                     });
                     setScheduleData(updatedScheduleEmp);
                      // Also remove employee references from templates
                      setScheduleTemplates(prevTpls => prevTpls.map(tpl => {
                         if (tpl.assignments) {
                             const removeEmployee = (assignments: DailyAssignments | WeeklyAssignments) => {
                                 Object.keys(assignments).forEach(key => { // key is deptId for day, dateKey for week
                                     if (tpl.type === 'day') {
                                         const dailyAssignments = assignments as DailyAssignments;
                                         if (dailyAssignments[key]) {
                                            dailyAssignments[key] = dailyAssignments[key].filter(a => a.employee.id !== itemToDelete.id);
                                         }
                                     } else { // week
                                         const weeklyAssignments = assignments as WeeklyAssignments;
                                         if (weeklyAssignments[key]) {
                                            Object.keys(weeklyAssignments[key]).forEach(deptId => {
                                                 if (weeklyAssignments[key][deptId]) {
                                                    weeklyAssignments[key][deptId] = weeklyAssignments[key][deptId].filter(a => a.employee.id !== itemToDelete.id);
                                                 }
                                             });
                                         }
                                     }
                                 });
                             };
                             removeEmployee(tpl.assignments);
                         }
                         return tpl;
                      }));
                     message = `Colaborador "${itemToDelete.name}" eliminado.`;
                    setEmployeeSearch(''); // Clear search
                    break;
                  case 'template':
                     setScheduleTemplates(prevTpls => prevTpls.filter(tpl => tpl.id !== itemToDelete.id));
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
         if (currentDate) setCurrentDate(prevDate => subWeeks(prevDate!, 1));
     };

     const handleNextWeek = () => {
         if (currentDate) setCurrentDate(prevDate => addWeeks(prevDate!, 1));
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
          if (!currentDate || !weekDates || weekDates.length === 0) return; // Guard clause
         const nextWeekStartDate = addWeeks(startOfWeek(currentDate, { weekStartsOn: 1 }), 1);
         let updatedData = { ...scheduleData };
         let duplicatedCount = 0;

         weekDates.forEach(sourceDate => {
             const sourceDayKey = format(sourceDate, 'yyyy-MM-dd');
             const sourceDaySchedule = scheduleData[sourceDayKey];
             if (sourceDaySchedule && Object.keys(sourceDaySchedule.assignments).length > 0 && Object.values(sourceDaySchedule.assignments).some(dept => dept.length > 0)) {
                 const dayOfWeek = getDay(sourceDate);
                 // Adjust index: Sunday (0) becomes 6, Monday (1) becomes 0, ..., Saturday (6) becomes 5
                 const targetDateIndex = (dayOfWeek + 6) % 7; // Correct index mapping for Mon-Sun week

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
         if (!currentDate || !weekDates || weekDates.length === 0) return; // Guard clause
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
             });
             return updatedData;
         });
          // Clear notes for the week being cleared
         setScheduleNotes(prevNotes => {
             const weekStartKey = format(weekStartDate, 'yyyy-MM-dd');
             const weekEndKey = format(weekEndDate, 'yyyy-MM-dd');
             return prevNotes.filter(note => note.date < weekStartKey || note.date > weekEndKey);
         });

         setClearingWeek(false); // Close the confirmation dialog
         toast({
             title: 'Semana Limpiada',
             description: `Se eliminaron todos los turnos y notas de la semana del ${weekStartDateFormatted} al ${weekEndDateFormatted}.`,
             variant: 'destructive'
         });
     };


     // --- Template Handling ---
     const handleOpenSaveTemplate = () => {
         setIsSavingTemplate(true); // Opens a simple modal/dialog to get the template name
     };

     const handleSaveTemplate = (templateName: string) => {
         if (!templateName.trim()) {
             toast({ title: "Nombre Requerido", description: "Por favor ingresa un nombre para el template.", variant: "destructive" });
             return;
         }

         let assignmentsToSave: DailyAssignments | WeeklyAssignments;
         if (viewMode === 'day') {
             if (!targetDate || !isValid(targetDate)) {
                 toast({ title: "Error", description: "Fecha inválida para guardar template diario.", variant: "destructive" });
                 setIsSavingTemplate(false);
                 return;
             }
             const dayKey = format(targetDate, 'yyyy-MM-dd');
             const daySchedule = scheduleData[dayKey];
             const dailyAssignments: DailyAssignments = {};
             if (daySchedule && daySchedule.assignments) {
                 Object.keys(daySchedule.assignments).forEach(deptId => {
                     if (daySchedule.assignments[deptId].length > 0) { // Only save if department has assignments
                         dailyAssignments[deptId] = daySchedule.assignments[deptId].map(a => ({
                             employee: { id: a.employee.id }, // Store only employee ID
                             startTime: a.startTime,
                             endTime: a.endTime,
                             includeBreak: a.includeBreak,
                             breakStartTime: a.breakStartTime,
                             breakEndTime: a.breakEndTime,
                         }));
                     }
                 });
             }
             assignmentsToSave = dailyAssignments;
         } else { // week view
              if (!weekDates || weekDates.length === 0) {
                   toast({ title: "Error", description: "No hay fechas de semana válidas para guardar el template.", variant: "destructive" });
                   setIsSavingTemplate(false);
                   return;
              }
             const weeklyAssignments: WeeklyAssignments = {};
             weekDates.forEach(date => {
                 const dateKey = format(date, 'yyyy-MM-dd');
                 const daySchedule = scheduleData[dateKey];
                 if (daySchedule && daySchedule.assignments) {
                     const dailyAssignmentsForWeek: DailyAssignments = {};
                     Object.keys(daySchedule.assignments).forEach(deptId => {
                         if (daySchedule.assignments[deptId].length > 0) {
                              dailyAssignmentsForWeek[deptId] = daySchedule.assignments[deptId].map(a => ({
                                 employee: { id: a.employee.id },
                                 startTime: a.startTime,
                                 endTime: a.endTime,
                                 includeBreak: a.includeBreak,
                                 breakStartTime: a.breakStartTime,
                                 breakEndTime: a.breakEndTime,
                             }));
                         }
                     });
                      if (Object.keys(dailyAssignmentsForWeek).length > 0) {
                          weeklyAssignments[dateKey] = dailyAssignmentsForWeek;
                      }
                 }
             });
             assignmentsToSave = weeklyAssignments;
         }

          // Check if there are any assignments to save
         if (Object.keys(assignmentsToSave).length === 0) {
             toast({ title: "Template Vacío", description: "No hay turnos para guardar en este template.", variant: "default" });
             setIsSavingTemplate(false);
             return;
         }


         const newTemplate: ScheduleTemplate = {
             id: `tpl-${Date.now()}`,
             name: templateName.trim(),
             type: viewMode,
             locationId: selectedLocationId,
             assignments: assignmentsToSave,
             createdAt: new Date(),
         };

         setScheduleTemplates(prev => [...prev, newTemplate].sort((a, b) => a.name.localeCompare(b.name)));
         toast({ title: "Template Guardado", description: `Template "${newTemplate.name}" guardado.` });
         setIsSavingTemplate(false);
     };

    const handleLoadTemplate = useCallback((templateId: string) => {
        console.log("[handleLoadTemplate] Attempting to load template ID:", templateId);
        const templateToLoad = scheduleTemplates.find(t => t.id === templateId);

        if (!templateToLoad) {
            console.error("[handleLoadTemplate] Template not found in state:", templateId);
            toast({ title: "Error", description: "Template no encontrado.", variant: "destructive" });
            return;
        }

         // Ensure the template type matches the current view mode
        if (templateToLoad.type !== viewMode) {
             toast({
                 title: "Tipo Incorrecto",
                 description: `El template "${templateToLoad.name}" es ${templateToLoad.type === 'day' ? 'diario' : 'semanal'}. Cambia a la vista ${templateToLoad.type === 'day' ? 'diaria' : 'semanal'} para cargarlo.`,
                 variant: "destructive"
             });
             return;
        }
         console.log(`[handleLoadTemplate] Loading ${templateToLoad.type} template:`, templateToLoad);

        setScheduleData(prevSchedule => {
             const updatedSchedule = { ...prevSchedule };
              // Validate template.assignments structure
             if (!templateToLoad.assignments || typeof templateToLoad.assignments !== 'object' || Array.isArray(templateToLoad.assignments)) {
                console.error("[handleLoadTemplate] Invalid assignments structure in template:", templateToLoad.assignments);
                toast({ title: "Error", description: "El formato de asignaciones del template es inválido.", variant: "destructive" });
                return prevSchedule; // Return previous state without changes
             }


             if (templateToLoad.type === 'day') {
                  if (!targetDate || !isValid(targetDate)) {
                     console.error("[handleLoadTemplate] Cannot apply daily template, targetDate is invalid.");
                     toast({ title: "Error", description: "Fecha objetivo inválida para cargar template diario.", variant: "destructive" });
                     return prevSchedule;
                  }
                 const dateKey = format(targetDate, 'yyyy-MM-dd');
                 const newDayAssignments: { [deptId: string]: ShiftAssignment[] } = {};
                 const dailyTemplateAssignments = templateToLoad.assignments as DailyAssignments;

                 // Ensure updatedSchedule[dateKey] exists before clearing
                 if (!updatedSchedule[dateKey]) {
                     updatedSchedule[dateKey] = { date: targetDate, assignments: {} };
                 } else {
                     updatedSchedule[dateKey].assignments = {}; // Clear existing assignments
                 }

                 Object.keys(dailyTemplateAssignments).forEach(deptId => {
                     const deptAssignments = dailyTemplateAssignments[deptId];
                      // Validate department exists for the location
                      if (!departments.some(d => d.id === deptId && d.locationId === selectedLocationId)) {
                         console.warn(`[handleLoadTemplate] Departamento ID ${deptId} del template no corresponde a la sede actual.`);
                         return; // Skip this department if it doesn't belong to the location
                      }
                     newDayAssignments[deptId] = deptAssignments.map((tplAssign, index) => {
                         const fullEmployee = employees.find(emp => emp.id === tplAssign.employee.id);
                         if (!fullEmployee) {
                              console.warn(`[handleLoadTemplate] Empleado ID ${tplAssign.employee.id} del template no encontrado.`);
                              return null; // Skip this assignment
                         }
                         return {
                             ...tplAssign,
                             id: `shift_${fullEmployee.id}_${dateKey}_${deptId}_${index}_${Date.now()}`,
                             employee: fullEmployee,
                         };
                     }).filter((a): a is ShiftAssignment => a !== null); // Filter out nulls and assert type
                 });

                 updatedSchedule[dateKey].assignments = newDayAssignments;
                 console.log(`[handleLoadTemplate] Applied DAY template ${templateToLoad.name} to ${dateKey}`);

             } else { // Weekly template
                 const templateAssignments = templateToLoad.assignments as WeeklyAssignments;
                 if (!currentDate || !weekDates || weekDates.length !== 7) { // Ensure currentDate and weekDates are valid
                      console.error("[handleLoadTemplate] Cannot apply weekly template, currentDate or weekDates are invalid.");
                      toast({ title: "Error", description: "No se pudo aplicar el template semanal (fechas inválidas).", variant: "destructive" });
                      return prevSchedule; // Return previous state if date is invalid
                 }
                 const targetWeekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
                 const templateDates = Object.keys(templateAssignments).sort(); // Get dates defined in the template

                 // Clear assignments for the entire target week first
                 weekDates.forEach(targetWeekDate => {
                     const targetDateKey = format(targetWeekDate, 'yyyy-MM-dd');
                     if (updatedSchedule[targetDateKey]) {
                         updatedSchedule[targetDateKey].assignments = {};
                     } else {
                         updatedSchedule[targetDateKey] = { date: targetWeekDate, assignments: {} };
                     }
                 });

                 // Apply template assignments day by day based on order (Mon->Sun)
                 weekDates.forEach((targetWeekDate, weekDayIndex) => {
                      // Ensure the template has data for this day index
                     if (weekDayIndex < templateDates.length) {
                         const templateDateKey = templateDates[weekDayIndex]; // Match based on position in the week
                         const templateDailyAssignments = templateAssignments[templateDateKey];
                         const targetDateKey = format(targetWeekDate, 'yyyy-MM-dd');
                         const newWeekDayAssignments: { [deptId: string]: ShiftAssignment[] } = {};

                         if (templateDailyAssignments) {
                             Object.keys(templateDailyAssignments).forEach(deptId => {
                                 const deptAssignments = templateDailyAssignments[deptId];
                                 // Validate department exists for the location
                                 if (!departments.some(d => d.id === deptId && d.locationId === selectedLocationId)) {
                                     console.warn(`[handleLoadTemplate] Departamento ID ${deptId} del template no corresponde a la sede actual.`);
                                     return; // Skip this department for this day
                                 }
                                 newWeekDayAssignments[deptId] = deptAssignments.map((tplAssign, assignIndex) => {
                                     const fullEmployee = employees.find(emp => emp.id === tplAssign.employee.id);
                                     if (!fullEmployee) {
                                         console.warn(`[handleLoadTemplate] Empleado ID ${tplAssign.employee.id} del template no encontrado.`);
                                         return null; // Skip
                                     }
                                     return {
                                         ...tplAssign,
                                         id: `shift_${fullEmployee.id}_${targetDateKey}_${deptId}_${assignIndex}_${Date.now()}`,
                                         employee: fullEmployee,
                                     };
                                 }).filter((a): a is ShiftAssignment => a !== null); // Filter out nulls
                             });

                             updatedSchedule[targetDateKey].assignments = newWeekDayAssignments;
                         } else {
                             console.warn(`[handleLoadTemplate] No template assignments found for template key ${templateDateKey} at index ${weekDayIndex}`);
                         }
                     } else {
                          console.warn(`[handleLoadTemplate] Template has fewer days (${templateDates.length}) than the target week (${weekDates.length}). Skipping day index ${weekDayIndex}.`);
                     }
                 });
                 console.log(`[handleLoadTemplate] Applied WEEK template ${templateToLoad.name} to week starting ${format(targetWeekStart, 'yyyy-MM-dd')}`);
             }

             console.log("[handleLoadTemplate] Applied template, updated schedule data:", updatedSchedule);
             return updatedSchedule;
         });

        toast({ title: "Template Aplicado", description: `Horario del template "${templateToLoad.name}" aplicado.` });
        // Optionally close modal if open
        setIsTemplateListModalOpen(false);
        setConfigFormType(null); // Close detail view in config modal
        setSelectedConfigItem(null);
     }, [scheduleTemplates, viewMode, targetDate, setScheduleData, toast, employees, currentDate, weekDates, departments, selectedLocationId]); // Added dependencies



    const handleDeleteTemplate = (templateId: string) => {
        const template = scheduleTemplates.find(t => t.id === templateId);
        if (template) {
            confirmDeleteItem('template', template.id, template.name);
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

    // Function to save notes to localStorage
     const handleSaveNotes = () => {
        if (isClient) {
            try {
                localStorage.setItem(SCHEDULE_NOTES_KEY, notes);
                toast({ title: 'Notas Guardadas', description: 'Tus notas generales han sido guardadas localmente.' });
            } catch (error) {
                console.error("Error saving general notes:", error);
                toast({ title: 'Error', description: 'No se pudieron guardar las notas.', variant: 'destructive' });
            }
        }
     };

    // --- Handlers for Export/Import Configuration ---
    const handleExportConfig = () => {
        try {
            const configData = {
                locations,
                departments: departments.map(({ icon, ...rest }) => ({ // Remove icon component before saving
                    ...rest,
                    iconName: Object.keys(iconMap).find(key => iconMap[key] === icon)
                })),
                employees,
                 scheduleNotes, // Include calendar notes/events
                 notes, // Include general notes
            };
            const jsonString = JSON.stringify(configData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `configuracion_horarios_${format(new Date(), 'yyyyMMdd_HHmmss')}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast({ title: "Configuración Exportada", description: "Los datos de configuración, notas y eventos han sido exportados." });
        } catch (error) {
             console.error("Error exporting configuration:", error);
             toast({ title: "Error al Exportar", description: "No se pudo exportar la configuración.", variant: "destructive" });
        }
    };

    const handleImportConfig = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const jsonString = e.target?.result as string;
                const configData = JSON.parse(jsonString);

                // Basic validation (add more checks as needed)
                if (!configData || typeof configData !== 'object') {
                     throw new Error("El archivo JSON no tiene un formato válido.");
                }
                // Validate required arrays exist
                if (!Array.isArray(configData.locations) || !Array.isArray(configData.departments) || !Array.isArray(configData.employees)) {
                    throw new Error("El archivo JSON no tiene la estructura esperada (locations, departments, employees).");
                }

                // Restore icons for departments
                const loadedDepartments = configData.departments.map((dep: any) => ({
                    ...dep,
                    icon: dep.iconName ? iconMap[dep.iconName] : Building,
                }));


                 // Load notes and events if present
                 const loadedEvents = Array.isArray(configData.scheduleNotes) ? configData.scheduleNotes : [];
                 const loadedNotesStr = typeof configData.notes === 'string' ? configData.notes : defaultNotesText;

                // Update state with imported data
                setLocations(configData.locations);
                setDepartments(loadedDepartments);
                setEmployees(configData.employees);
                // Templates are now handled separately (not in config export/import)
                setScheduleNotes(loadedEvents); // Load calendar notes/events
                setNotes(loadedNotesStr); // Load general notes

                 // Also update form defaults based on potentially new first location
                 const firstLocId = configData.locations.length > 0 ? configData.locations[0].id : '';
                 setSelectedLocationId(firstLocId);
                 setDepartmentFormData(prev => ({ ...prev, locationId: firstLocId }));
                 setEmployeeFormData(prev => ({ ...prev, locationIds: firstLocId ? [firstLocId] : [] }));

                toast({ title: "Configuración Importada", description: "Se cargaron los datos desde el archivo." });
                setIsConfigModalOpen(false); // Close config modal after import
                setActiveConfigTab('sedes'); // Reset tab

            } catch (error) {
                console.error("Error importing configuration:", error);
                const message = error instanceof Error ? error.message : "No se pudo importar el archivo JSON.";
                toast({ title: "Error al Importar", description: message, variant: "destructive" });
            } finally {
                // Reset file input
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            }
        };
        reader.readAsText(file);
    };

     // --- Handlers for Schedule JSON Export/Import ---
     const handleExportScheduleJson = () => {
        if (!currentDate || !weekDates || weekDates.length === 0) {
            toast({ title: "Error", description: "Fechas de semana inválidas para exportar.", variant: "destructive" });
            return;
        }
        try {
             // Collect schedule data for the current week for ALL locations
             const dataToExport: { [dateKey: string]: ScheduleData } = {};
             weekDates.forEach(date => {
                const dateKey = format(date, 'yyyy-MM-dd');
                if (scheduleData[dateKey]) {
                    // Prepare data for export: Dates to ISO strings, Employee to ID only
                    const dayData = JSON.parse(JSON.stringify(scheduleData[dateKey])); // Deep clone
                    if (dayData.date instanceof Date) {
                         dayData.date = dayData.date.toISOString();
                     }
                    if (dayData.assignments) {
                         Object.keys(dayData.assignments).forEach(deptId => {
                             (dayData.assignments[deptId] || []).forEach((assign: any) => {
                                 if (assign.employee && typeof assign.employee === 'object') {
                                     assign.employee = { id: assign.employee.id }; // Only keep ID
                                 }
                             });
                         });
                     }
                    dataToExport[dateKey] = dayData;
                }
            });

            if (Object.keys(dataToExport).length === 0) {
                toast({ title: "Nada que Exportar", description: "No hay horario planificado en esta semana para exportar.", variant: "default" });
                return;
            }

            const jsonString = JSON.stringify(dataToExport, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const weekStartStr = format(weekDates[0], 'yyyy-MM-dd');
            a.download = `horario_semana_${weekStartStr}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast({ title: "Exportación Exitosa", description: "Se exportó el horario de la semana actual." });
        } catch (error) {
            console.error("Error exportando horario JSON:", error);
            toast({ title: "Error al Exportar", description: "No se pudo exportar el horario.", variant: "destructive" });
        }
    };

    const handleImportScheduleJson = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const jsonString = e.target?.result as string;
                const importedScheduleData = JSON.parse(jsonString);

                if (!importedScheduleData || typeof importedScheduleData !== 'object') {
                    throw new Error("El archivo JSON no contiene datos de horario válidos.");
                }

                let updatedCount = 0;
                const updatedSchedule = { ...scheduleData }; // Start with current schedule

                Object.keys(importedScheduleData).forEach(dateKey => {
                     const dayData = importedScheduleData[dateKey];
                     if (!dayData || !dayData.date || !dayData.assignments) {
                         console.warn(`Omitiendo datos inválidos para la fecha ${dateKey}`);
                         return;
                     }

                     const dateObj = parseISO(dayData.date); // Dates were stringified
                     if (!isValid(dateObj)) {
                          console.warn(`Fecha inválida ${dayData.date} en datos importados.`);
                          return;
                     }

                     // Hydrate employee data
                     const hydratedAssignments: { [deptId: string]: ShiftAssignment[] } = {};
                     Object.keys(dayData.assignments).forEach(deptId => {
                         const assignments = dayData.assignments[deptId];
                         if (Array.isArray(assignments)) {
                             hydratedAssignments[deptId] = assignments.map((assign: any) => {
                                 const fullEmployee = employees.find(emp => emp.id === assign.employee?.id);
                                 if (!fullEmployee) {
                                      console.warn(`Empleado ID ${assign.employee?.id} no encontrado al importar horario.`);
                                      // Skip assignment if employee doesn't exist? Or use placeholder? Let's skip for now.
                                      return null;
                                 }
                                 return { ...assign, employee: fullEmployee };
                             }).filter(Boolean) as ShiftAssignment[]; // Filter out nulls
                         }
                     });

                     // Overwrite the data for this specific date in the main schedule state
                     updatedSchedule[dateKey] = { date: dateObj, assignments: hydratedAssignments };
                     updatedCount++;
                });

                if (updatedCount > 0) {
                    setScheduleData(updatedSchedule); // Update the main schedule state
                    toast({ title: "Importación Exitosa", description: `Se cargaron/actualizaron los horarios para ${updatedCount} día(s).` });
                } else {
                    toast({ title: "Importación Vacía", description: "No se encontraron datos de horario válidos para importar.", variant: "default" });
                }

            } catch (error) {
                console.error("Error importando horario JSON:", error);
                const message = error instanceof Error ? error.message : "No se pudo importar el archivo JSON.";
                toast({ title: "Error al Importar", description: message, variant: "destructive" });
            } finally {
                // Reset file input
                if (scheduleJsonInputRef.current) {
                    scheduleJsonInputRef.current.value = '';
                }
            }
        };
        reader.readAsText(file);
    };

     const DndWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
         // Render DndContext only on client-side
         if (!isClient) {
             return <>{children}</>; // Render children directly on server
         }
         // Render DndContext only on desktop and client-side
         return (
             <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                 {children}
             </DndContext>
         );
     };


    const handleExportPDF = () => {
         if (!currentDate || !weekDates || weekDates.length === 0) {
            toast({ title: 'Error', description: 'Fechas de semana no disponibles para exportar.', variant: 'destructive' });
            return;
         }
        const locationName = locations.find(l => l.id === selectedLocationId)?.name || selectedLocationId;
        // Prepare data specifically for the PDF export function
        const dataForPDF: ScheduleExportData = {
            locationName,
            weekDates,
            departments: filteredDepartments, // Use filtered departments for the current location
            employees: employees.filter(emp => Array.isArray(emp.locationIds) && emp.locationIds.includes(selectedLocationId)), // Ensure locationIds exists and filter
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

    // --- New Handler for Consolidated PDF ---
    const handleExportConsolidatedPDF = () => {
        if (!isClient || !currentDate || !weekDates || weekDates.length === 0) return; // Ensure client-side execution and valid dates

        const allLocationData: ScheduleExportData[] = locations.map(location => {
            const locDepartments = departments.filter(dept => dept.locationId === location.id);
            const locEmployees = employees.filter(emp => Array.isArray(emp.locationIds) && emp.locationIds.includes(location.id)); // Ensure locationIds exists
            // Filter scheduleData relevant to this location and week
            const locScheduleData: { [dateKey: string]: ScheduleData } = {};
             weekDates.forEach(date => {
                 const dateKey = format(date, 'yyyy-MM-dd');
                 if (scheduleData[dateKey]) {
                     const dayData: ScheduleData = { date: scheduleData[dateKey].date, assignments: {} };
                     locDepartments.forEach(dept => {
                         if (scheduleData[dateKey].assignments[dept.id]) {
                             dayData.assignments[dept.id] = scheduleData[dateKey].assignments[dept.id];
                         }
                     });
                      if (Object.keys(dayData.assignments).length > 0) {
                          locScheduleData[dateKey] = dayData;
                      }
                 }
             });

             return {
                locationName: location.name,
                weekDates,
                departments: locDepartments,
                employees: locEmployees,
                scheduleData: locScheduleData,
                getScheduleForDate: (date: Date) => { // Provide a specific getScheduleForDate for this location's data
                    const key = format(date, 'yyyy-MM-dd');
                    return locScheduleData[key] || { date, assignments: {} };
                },
                calculateShiftDuration,
            };
        }).filter(data => data.employees.length > 0); // Only include locations with employees

        if (allLocationData.length === 0) {
            toast({ title: 'Sin Datos', description: 'No hay datos de horario para ninguna sede en esta semana.', variant: 'default' });
            return;
        }

        try {
            exportConsolidatedScheduleToPDF(allLocationData); // Call the new export function
            toast({ title: 'PDF Consolidado Generado', description: 'Se ha descargado el horario consolidado.' });
        } catch (error) {
            console.error("Error exporting consolidated schedule to PDF:", error);
            toast({ title: 'Error al Exportar PDF Consolidado', description: 'No se pudo generar el archivo PDF.', variant: 'destructive' });
        }
    };


     const handleShareSchedule = async () => {
        let textToCopy = "";
        const locationName = locations.find(l => l.id === selectedLocationId)?.name || selectedLocationId;

        if (viewMode === 'day') {
            if (!targetDate) return; // Ensure targetDate is valid
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
             if (!weekDates || weekDates.length === 0) {
                  toast({ title: 'Error', description: 'Fechas de semana no disponibles.', variant: 'destructive' });
                  return;
             }
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
        if (!textToCopy || textToCopy.trim() === `*Horario ${locationName} - Semana ${format(weekDates?.[0] ?? new Date(), 'dd MMM', { locale: es })} al ${format(weekDates?.[6] ?? new Date(), 'dd MMM yyyy', { locale: es })}*` || textToCopy.includes("_No hay turnos asignados")) {
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
        if (!isClient || !currentDate) return; // Don't run on server or if currentDate is null

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
        (Array.isArray(scheduleTemplates) ? scheduleTemplates : []).filter(tpl => tpl.name.toLowerCase().includes(templateSearch.toLowerCase())),
        [scheduleTemplates, templateSearch]
     );



    // Render null or a loader during initial server render and hydration phase
     if (!isClient || !currentDate) {
         return (
             <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                 <Loader2 className="h-16 w-16 animate-spin text-primary" />
             </div>
         );
     }


    return (
        <main className="container mx-auto p-4 md:p-8 max-w-full relative">
            {/* Loading Indicator Overlay */}
            {isLoadingPage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                    <Loader2 className="h-16 w-16 animate-spin text-primary" />
                </div>
            )}

             {/* Decorative Image */}
              <div className="absolute top-[-60px] left-8 -z-10 opacity-70 dark:opacity-30 pointer-events-none sm:opacity-70 md:opacity-70 lg:opacity-70 xl:opacity-70 2xl:opacity-70" aria-hidden="true"> {/* Adjust vertical position */}
                <Image
                    src="https://i.postimg.cc/PJVW7XZG/teclado.png" // Left image source
                    alt="Ilustración teclado"
                    width={255 * 1.7} // Scaled width
                    height={255 * 1.7} // Scaled height
                    className="object-contain transform -rotate-12"
                    data-ai-hint="keyboard illustration"
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
              <div className="bg-transparent border-none p-0 mb-6 md:mb-8">
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
                                       <DialogHeader className="p-4 border-b flex-shrink-0 flex flex-row items-center justify-between space-x-4"> {/* Added space-x */}
                                         <div> {/* Left side */}
                                           <DialogTitle>Configuración General</DialogTitle>
                                           <DialogDescription>Gestiona sedes, departamentos, colaboradores y templates.</DialogDescription>
                                         </div>
                                          <div className="flex items-center gap-2 pr-8"> {/* Right side buttons - Adjusted position, added padding-right */}
                                              {/* Config Import Button */}
                                              <input
                                                  type="file"
                                                  accept=".json"
                                                  ref={fileInputRef}
                                                  onChange={handleImportConfig}
                                                  className="hidden"
                                                  id="import-config-input"
                                              />
                                              <Button
                                                  variant="outline"
                                                  size="sm"
                                                  onClick={() => fileInputRef.current?.click()}
                                                  title="Importar configuración (JSON)"
                                              >
                                                  <UploadCloud className="mr-2 h-4 w-4" /> Importar Conf.
                                              </Button>
                                             {/* Config Export Button */}
                                              <Button
                                                  variant="outline"
                                                  size="sm"
                                                  onClick={handleExportConfig}
                                                  title="Exportar configuración (JSON)"
                                              >
                                                  <Download className="mr-2 h-4 w-4" /> Exportar Conf.
                                              </Button>
                                         </div>
                                        </DialogHeader>
                                        <div className="flex-grow overflow-hidden p-4"> {/* Main content area */}
                                             <ConfigTabs
                                                 locations={locations}
                                                 departments={departments}
                                                 employees={employees}
                                                 templates={scheduleTemplates}
                                                 selectedLocationId={selectedLocationId}
                                                 iconMap={iconMap}
                                                 openConfigForm={openConfigForm}
                                                 selectedConfigItem={selectedConfigItem}
                                                 confirmDeleteItem={confirmDeleteItem}
                                                 handleCopyEmployeeId={handleCopyEmployeeId}
                                                 handleLoadTemplate={handleLoadTemplate}
                                                 configFormType={configFormType}
                                                 locationFormData={locationFormData}
                                                 setLocationFormData={setLocationFormData}
                                                 departmentFormData={departmentFormData}
                                                 setDepartmentFormData={setDepartmentFormData}
                                                 employeeFormData={employeeFormData}
                                                 setEmployeeFormData={setEmployeeFormData}
                                                 handleSaveLocation={handleSaveLocation}
                                                 handleSaveDepartment={handleSaveDepartment}
                                                 handleSaveEmployee={handleSaveEmployee}
                                                 setConfigFormType={setConfigFormType}
                                                 setSelectedConfigItem={setSelectedConfigItem}
                                                 handleToggleEmployeeLocation={handleToggleEmployeeLocation}
                                                 handleToggleEmployeeDepartment={handleToggleEmployeeDepartment}
                                                 availableDepartmentsForEmployee={availableDepartmentsForEmployee}
                                                 activeTab={activeConfigTab}
                                                 setActiveTab={setActiveTab}
                                                 locationSearch={locationSearch}
                                                 setLocationSearch={setLocationSearch}
                                                 departmentSearch={departmentSearch}
                                                 setDepartmentSearch={setDepartmentSearch}
                                                 employeeSearch={employeeSearch}
                                                 setEmployeeSearch={setEmployeeSearch}
                                                 templateSearch={templateSearch}
                                                 setTemplateSearch={setTemplateSearch}
                                                 filteredLocationsData={filteredLocationsData}
                                                 filteredDepartmentsData={filteredDepartmentsData}
                                                 filteredEmployeesData={filteredEmployeesData}
                                                 filteredTemplatesData={filteredTemplatesData}
                                             />
                                       </div>
                                         {/* Dialog Footer Removed */}
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
                             <SummaryDashboard
                                isOpen={isSummarySheetOpen}
                                onOpenChange={setIsSummarySheetOpen}
                                viewMode={viewMode}
                                targetDate={targetDate}
                                weekDates={weekDates}
                                summaryData={employeeHoursSummary}
                              />
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
                              onAddShiftRequest={handleOpenEmployeeSelectionModal} // Pass updated handler
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

                    <Button onClick={handleShareSchedule} variant="outline" className="hover:bg-primary hover:text-primary-foreground">
                        <Share2 className="mr-2 h-4 w-4" /> Compartir (Texto)
                    </Button>
                     {/* PDF Export Dropdown */}
                     <DropdownMenu>
                         <DropdownMenuTrigger asChild>
                             <Button variant="outline" className="hover:bg-red-600 hover:text-white">
                                 <FileDown className="mr-2 h-4 w-4" /> PDF
                             </Button>
                         </DropdownMenuTrigger>
                         <DropdownMenuContent>
                             <DropdownMenuLabel>Exportar Horario PDF</DropdownMenuLabel>
                             <DropdownMenuSeparator />
                             <DropdownMenuItem onClick={handleExportPDF}>
                                 <User className="mr-2 h-4 w-4" /> Solo Sede Actual ({locations.find(l => l.id === selectedLocationId)?.name || 'N/A'})
                             </DropdownMenuItem>
                             <DropdownMenuItem onClick={handleExportConsolidatedPDF}>
                                 <Building2 className="mr-2 h-4 w-4" /> Consolidado Todas las Sedes
                             </DropdownMenuItem>
                         </DropdownMenuContent>
                     </DropdownMenu>

                     {/* JSON Export/Import Dropdown */}
                      <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                              <Button variant="outline" className="hover:bg-green-600 hover:text-white">
                                  <FileJson className="mr-2 h-4 w-4" /> JSON
                              </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                              <DropdownMenuLabel>Horario (JSON)</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={handleExportScheduleJson} disabled={!currentDate || weekDates.length === 0}>
                                  <Download className="mr-2 h-4 w-4" /> Exportar Semana Actual
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => scheduleJsonInputRef.current?.click()}>
                                  <Upload className="mr-2 h-4 w-4" /> Importar Horario
                              </DropdownMenuItem>
                          </DropdownMenuContent>
                      </DropdownMenu>
                      <input
                          type="file"
                          accept=".json"
                          ref={scheduleJsonInputRef}
                          onChange={handleImportScheduleJson}
                          className="hidden"
                          id="import-schedule-json-input"
                      />

                    {viewMode === 'week' && (
                        <Button
                            variant="outline"
                            onClick={handleDuplicateWeek}
                            title="Duplicar semana completa a la siguiente"
                            className="hover:bg-primary hover:text-primary-foreground"
                            disabled={!currentDate || weekDates.length === 0} // Disable if no date
                        >
                            <CopyPlus className="mr-2 h-4 w-4" /> Duplicar Semana
                        </Button>
                    )}
                    {/* Clear Week Button */}
                     {viewMode === 'week' && (
                        <AlertDialog>
                           <AlertDialogTrigger asChild>
                             <Button variant="outline" size="sm" className="hover:bg-destructive hover:text-destructive-foreground" disabled={!currentDate || weekDates.length === 0}>
                                <CalendarX className="mr-2 h-4 w-4" /> Limpiar Semana
                             </Button>
                           </AlertDialogTrigger>
                           <AlertDialogContent>
                             <AlertDialogHeader>
                               <AlertDialogTitle>¿Limpiar Semana Completa?</AlertDialogTitle>
                               <AlertDialogDescription>
                                 Esta acción eliminará todos los turnos y notas de la semana del{' '}
                                 {currentDate && weekDates.length > 0 ? format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'dd/MM/yy', { locale: es }) : '?'} al{' '}
                                 {currentDate && weekDates.length > 0 ? format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'dd/MM/yy', { locale: es }) : '?'}
                                 . No se puede deshacer.
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
                      <Button onClick={handleOpenSaveTemplate} variant="outline" className="hover:bg-primary hover:text-primary-foreground">
                         <Save className="mr-2 h-4 w-4" /> Guardar Template
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
                     <Button onClick={handleSaveNotes}>Guardar Notas</Button> {/* Simplified save */}
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
                 onDeleteNote={(id) => setNoteToDeleteId(id)} // Trigger confirmation
                 initialDate={notesModalForDate || undefined} // Pass specific date if set
                 viewMode={viewMode}
                 currentDate={currentDate || new Date()} // Pass a valid date
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

              {/* Template Delete Confirmation Dialog */}
              <AlertDialog open={!!templateToDeleteId} onOpenChange={(open) => !open && setTemplateToDeleteId(null)}>
                  <AlertDialogContent>
                      <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar este Template?</AlertDialogTitle>
                          <AlertDialogDescription>
                              "{scheduleTemplates.find(tpl => tpl.id === templateToDeleteId)?.name || ''}"
                              <br/>
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

             {/* Save Template Dialog */}
              <Dialog open={isSavingTemplate} onOpenChange={setIsSavingTemplate}>
                  <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                          <DialogTitle>Guardar Template ({viewMode === 'day' ? 'Diario' : 'Semanal'})</DialogTitle>
                          <DialogDescription>Ingresa un nombre para el template actual.</DialogDescription>
                      </DialogHeader>
                       {/* Simple form to get the name */}
                       <form id="save-template-form" onSubmit={(e) => {
                           e.preventDefault();
                           const form = e.target as HTMLFormElement;
                           const input = form.elements.namedItem('templateName') as HTMLInputElement;
                           handleSaveTemplate(input.value);
                       }}>
                           <div className="grid gap-4 py-4">
                               <div className="grid grid-cols-4 items-center gap-4">
                                   <Label htmlFor="templateName" className="text-right">Nombre</Label>
                                   <Input id="templateName" name="templateName" required className="col-span-3" placeholder="Ej: Semana Base, Fin de Semana"/>
                               </div>
                           </div>
                       </form>
                      <DialogFooter>
                           <DialogClose asChild>
                              <Button type="button" variant="outline">Cancelar</Button>
                           </DialogClose>
                           <Button type="submit" form="save-template-form">Guardar Template</Button>
                       </DialogFooter>
                  </DialogContent>
              </Dialog>

             {/* Template List Modal */}
             <Dialog open={isTemplateListModalOpen} onOpenChange={setIsTemplateListModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Cargar Template ({viewMode === 'day' ? 'Diario' : 'Semanal'})</DialogTitle>
                        <DialogDescription>Selecciona un template para aplicar al horario actual ({viewMode === 'day' ? format(targetDate, 'PPP', { locale: es }) : 'semana actual'}).</DialogDescription>
                    </DialogHeader>
                     <ScheduleTemplateList
                        templates={filteredTemplates} // Show only relevant templates
                        onLoadTemplate={handleLoadTemplate}
                        onDeleteTemplate={(id) => {
                            setIsTemplateListModalOpen(false); // Close this modal first
                            setTemplateToDeleteId(id); // Then open delete confirmation
                        }}
                    />
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Cerrar</Button>
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
                            Esta acción eliminará todos los turnos y anotaciones para el{' '}
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
                            {currentDate && weekDates.length > 0 ? format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'dd/MM/yy', { locale: es }) : '?'} al{' '}
                            {currentDate && weekDates.length > 0 ? format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'dd/MM/yy', { locale: es }) : '?'}
                            . No se puede deshacer.
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
