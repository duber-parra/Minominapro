
'use client';

import React, { useState, useCallback, useMemo, ChangeEvent, useEffect, useRef, DragEvent } from 'react';
import Image from 'next/image'; // Import next/image
import { WorkdayForm } from '@/components/workday-form'; // Removed formSchema import as it's now local
import { ResultsDisplay, labelMap as fullLabelMap, abbreviatedLabelMap, displayOrder, formatHours, formatCurrency } from '@/components/results-display'; // Import helpers and rename labelMap
import type { CalculationResults, CalculationError, QuincenalCalculationSummary, AdjustmentItem, SavedPayrollData, Employee } from '@/types'; // Added AdjustmentItem, SavedPayrollData, Employee
import type { ScheduleData, ShiftAssignment } from '@/types/schedule'; // Import schedule types
import { isCalculationError } from '@/types'; // Import the type guard
import { Toaster } from '@/components/ui/toaster';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input'; // Import Input for editing hours and employee ID
import { Label } from '@/components/ui/label'; // Import Label for editing hours and employee ID
import { Trash2, Edit, PlusCircle, Calculator, DollarSign, Clock, Calendar as CalendarIcon, Save, X, PencilLine, User, FolderSync, Eraser, FileDown, Library, FileSearch, MinusCircle, CopyPlus, Loader2, Copy, Upload, Coffee, FileUp, Download, FolderUp, FileJson, ShieldAlert, ShieldCheck } from 'lucide-react'; // Added Library, FileSearch, Upload, Coffee, Download, FolderUp, FileJson, ShieldAlert, ShieldCheck
import { format, parseISO, startOfMonth, endOfMonth, setDate, parse as parseDateFns, addDays, isSameDay as isSameDayFns, isWithinInterval, isValid as isValidDate } from 'date-fns'; // Renamed isValid to avoid conflict, added isValidDate alias and isSameDayFns
import { es } from 'date-fns/locale';
import { calculateSingleWorkday } from '@/actions/calculate-workday';
import { useToast } from '@/hooks/use-toast';
import type { WorkdayFormValues } from '@/components/workday-form'; // Import form values type
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { VALORES } from '@/config/payroll-values'; // Import VALORES from new location
import { exportPayrollToPDF, exportAllPayrollsToPDF } from '@/lib/pdf-exporter'; // Import PDF export functions
import { calculateQuincenalSummary } from '@/lib/payroll-utils'; // Import the summary calculation utility
import { SavedPayrollList } from '@/components/saved-payroll-list'; // Import the new component
import { AdjustmentModal } from '@/components/adjustment-modal'; // Import the new modal component
import { formatTo12Hour } from '@/lib/time-utils'; // Import the time formatting helper
import { useForm } from 'react-hook-form'; // Import useForm
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu"; // Import DropdownMenu components
import { z } from 'zod'; // Import zod for form schema


// Constants
const SALARIO_BASE_QUINCENAL_FIJO = 711750; // Example fixed salary
const AUXILIO_TRANSPORTE_VALOR = 100000; // User-defined value for transport allowance
const SCHEDULE_DATA_KEY = 'schedulePlannerData'; // LocalStorage key for schedule data

// Define keys for local storage
const EMPLOYEES_KEY = 'schedulePlannerEmployees'; // Key for employees in local storage

// Helper function to load employees from localStorage safely
const loadEmployeesFromLocalStorage = (defaultValue: Employee[]): Employee[] => {
    if (typeof window === 'undefined') {
        return defaultValue; // Return default during SSR
    }
    try {
        const savedData = localStorage.getItem(EMPLOYEES_KEY);
        if (!savedData) return defaultValue;
        const parsed = JSON.parse(savedData);
        if (Array.isArray(parsed)) {
            return parsed.map((emp: any) => ({
                ...emp,
                locationIds: Array.isArray(emp.locationIds) ? emp.locationIds : [],
                departmentIds: Array.isArray(emp.departmentIds) ? emp.departmentIds : [],
            })) as Employee[];
        }
        return defaultValue;
    } catch (error) {
        console.error(`Error loading employees from localStorage:`, error);
        return defaultValue;
    }
};


// LocalStorage Key Generation
const getStorageKey = (employeeId: string, periodStart: Date | undefined, periodEnd: Date | undefined): string | null => {
    if (!employeeId || !periodStart || !periodEnd) return null;
    if (isNaN(periodStart.getTime()) || isNaN(periodEnd.getTime())) return null;
    try {
        const startStr = format(periodStart, 'yyyy-MM-dd');
        const endStr = format(periodEnd, 'yyyy-MM-dd');
        const safeEmployeeId = employeeId.replace(/[^a-zA-Z0-9_-]/g, '');
        return `payroll_${safeEmployeeId}_${startStr}_${endStr}`;
    } catch (e) {
        console.error("Error generando la clave de almacenamiento:", e);
        return null;
    }
};

// --- Function to revive Date objects from JSON string representation ---
function reviveSavedPayrollDates(data: any[]): SavedPayrollData[] {
    return data.map(item => {
        const revivedItem: any = { 
            ...item,
            periodStart: typeof item.periodStart === 'string' ? parseISO(item.periodStart) : item.periodStart,
            periodEnd: typeof item.periodEnd === 'string' ? parseISO(item.periodEnd) : item.periodEnd,
            createdAt: item.createdAt && typeof item.createdAt === 'string' ? parseISO(item.createdAt) : item.createdAt,
        };

        if (Array.isArray(item.calculatedDays)) {
            revivedItem.calculatedDays = item.calculatedDays.map((day: any) => {
                const revivedStartDate = day.inputData?.startDate && typeof day.inputData.startDate === 'string'
                                        ? parseISO(day.inputData.startDate)
                                        : (day.inputData?.startDate instanceof Date ? day.inputData.startDate : undefined);
                return {
                    ...day,
                    inputData: {
                        ...day.inputData,
                        startDate: revivedStartDate,
                    }
                };
            }).filter((day: any) => day.inputData?.startDate && isValidDate(day.inputData.startDate));
        } else {
            revivedItem.calculatedDays = []; // Ensure calculatedDays is always an array
        }
        revivedItem.summary = item.summary || {}; 

        return revivedItem;
    }).filter(item => item.periodStart && isValidDate(item.periodStart) && item.periodEnd && isValidDate(item.periodEnd)) as SavedPayrollData[];
}


const parseStoredData = (jsonData: string | null): { days: CalculationResults[], income: AdjustmentItem[], deductions: AdjustmentItem[], includeTransport: boolean, includeDeducciones: boolean } => {
    if (!jsonData) return { days: [], income: [], deductions: [], includeTransport: false, includeDeducciones: true };
    try {
        const storedObject = JSON.parse(jsonData) as {
             calculatedDays: any[], 
             otrosIngresosLista?: AdjustmentItem[],
             otrasDeduccionesLista?: AdjustmentItem[],
             incluyeAuxTransporte?: boolean,
             incluyeDeduccionesLegales?: boolean
        };

        const revivedDays = (storedObject.calculatedDays || []).map(day => ({
            ...day,
            inputData: {
                ...day.inputData,
                startDate: day.inputData.startDate && typeof day.inputData.startDate === 'string'
                            ? parseISO(day.inputData.startDate)
                            : (day.inputData.startDate instanceof Date ? day.inputData.startDate : new Date()),
            }
        })).filter(day => day.inputData.startDate && isValidDate(day.inputData.startDate)) as CalculationResults[];

        const incomeList = Array.isArray(storedObject.otrosIngresosLista) ? storedObject.otrosIngresosLista : [];
        const deductionList = Array.isArray(storedObject.otrasDeduccionesLista) ? storedObject.otrasDeduccionesLista : [];
        const includeTransport = typeof storedObject.incluyeAuxTransporte === 'boolean' ? storedObject.incluyeAuxTransporte : false;
        const includeDeducciones = typeof storedObject.incluyeDeduccionesLegales === 'boolean' ? storedObject.incluyeDeduccionesLegales : true; 

        return { days: revivedDays, income: incomeList, deductions: deductionList, includeTransport, includeDeducciones };

    } catch (error) {
        console.error("Error parseando datos de localStorage:", error);
        return { days: [], income: [], deductions: [], includeTransport: false, includeDeducciones: true };
    }
};

const storageKeyRegex = /^payroll_([a-zA-Z0-9_-]+)_(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})$/;

const loadAllSavedPayrolls = (employees: Employee[]): SavedPayrollData[] => { 
    if (typeof window === 'undefined') return [];

    const employeeMap = new Map(employees.map(emp => [emp.id, emp.name])); 

    const savedPayrolls: SavedPayrollData[] = [];
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('payroll_')) {
                const match = key.match(storageKeyRegex);
                if (match) {
                    const employeeId = match[1];
                    const startStr = match[2];
                    const endStr = match[3];
                    const startDate = parseDateFns(startStr, 'yyyy-MM-dd', new Date());
                    const endDate = parseDateFns(endStr, 'yyyy-MM-dd', new Date());

                    if (!employeeId || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                        console.warn(`Omitiendo clave de almacenamiento inválida: ${key}`);
                        continue;
                    }

                    const storedData = localStorage.getItem(key);
                    const { days: parsedDays, income: parsedIncome, deductions: parsedDeductions, includeTransport: parsedIncludeTransport, includeDeducciones: parsedIncludeDeducciones } = parseStoredData(storedData);

                    let createdAtDate: Date | undefined = startDate;
                    if (parsedDays.length > 0 && parsedDays[0].inputData.startDate instanceof Date && isValidDate(parsedDays[0].inputData.startDate)) {
                         createdAtDate = parsedDays[0].inputData.startDate;
                    }

                    if (parsedDays.length > 0 || parsedIncome.length > 0 || parsedDeductions.length > 0 || parsedIncludeTransport || !parsedIncludeDeducciones) {
                        const summary = calculateQuincenalSummary(parsedDays, SALARIO_BASE_QUINCENAL_FIJO);
                         const savedPayrollItem: SavedPayrollData = {
                            key: key,
                            employeeId: employeeId,
                            employeeName: employeeMap.get(employeeId),
                            periodStart: startDate,
                            periodEnd: endDate,
                            summary: summary || {
                                totalHorasDetalladas: { Ordinaria_Diurna_Base: 0, Recargo_Noct_Base: 0, Recargo_Dom_Diurno_Base: 0, Recargo_Dom_Noct_Base: 0, HED: 0, HEN: 0, HEDD_F: 0, HEND_F: 0 },
                                totalPagoDetallado: { Ordinaria_Diurna_Base: 0, Recargo_Noct_Base: 0, Recargo_Dom_Diurno_Base: 0, Recargo_Dom_Noct_Base: 0, HED: 0, HEN: 0, HEDD_F: 0, HEND_F: 0 },
                                totalPagoRecargosExtrasQuincena: 0,
                                salarioBaseQuincenal: SALARIO_BASE_QUINCENAL_FIJO,
                                pagoTotalConSalarioQuincena: SALARIO_BASE_QUINCENAL_FIJO,
                                totalDuracionTrabajadaHorasQuincena: 0,
                                diasCalculados: 0,
                            },
                            calculatedDays: parsedDays, 
                            otrosIngresosLista: parsedIncome,
                            otrasDeduccionesLista: parsedDeductions,
                            incluyeAuxTransporte: parsedIncludeTransport,
                            incluyeDeduccionesLegales: parsedIncludeDeducciones,
                            createdAt: createdAtDate
                         };
                        savedPayrolls.push(savedPayrollItem);
                    }
                }
            }
        }
    } catch (error) {
        console.error("Error cargando nóminas guardadas de localStorage:", error);
    }
    return savedPayrolls.sort((a, b) => {
       const dateDiff = (b.createdAt?.getTime() || b.periodStart.getTime()) - (a.createdAt?.getTime() || a.periodStart.getTime());
       if (dateDiff !== 0) return dateDiff;
       return a.employeeId.localeCompare(b.employeeId);
    });
};

export default function Home() {
    const [employeeId, setEmployeeId] = useState<string>('');
    const [employees, setEmployees] = useState<Employee[]>([]); 
    const [payPeriodStart, setPayPeriodStart] = useState<Date | undefined>(() => {
        const now = new Date();
        return now.getDate() <= 15 ? startOfMonth(now) : setDate(startOfMonth(now), 16);
    });
    const [payPeriodEnd, setPayPeriodEnd] = useState<Date | undefined>(() => {
         const now = new Date();
         return now.getDate() <= 15 ? setDate(startOfMonth(now), 15) : endOfMonth(now);
    });
    const [calculatedDays, setCalculatedDays] = useState<CalculationResults[]>([]);
    const [editingDayId, setEditingDayId] = useState<string | null>(null);
    const [editingResultsId, setEditingResultsId] = useState<string | null>(null);
    const [editedHours, setEditedHours] = useState<CalculationResults['horasDetalladas'] | null>(null);
    const [dayToDeleteId, setDayToDeleteId] = useState<string | null>(null);
    const [isLoadingDay, setIsLoadingDay] = useState<boolean>(false);
    const [isImporting, setIsImporting] = useState<boolean>(false);
    const [errorDay, setErrorDay] = useState<string | null>(null);
    const [isDataLoaded, setIsDataLoaded] = useState<boolean>(false);
    const [savedPayrolls, setSavedPayrolls] = useState<SavedPayrollData[]>([]);
    const [payrollToDeleteKey, setPayrollToDeleteKey] = useState<string | null>(null);

    const [otrosIngresos, setOtrosIngresos] = useState<AdjustmentItem[]>([]);
    const [otrasDeducciones, setOtrasDeducciones] = useState<AdjustmentItem[]>([]);
    const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
    const [isDeductionModalOpen, setIsDeductionModalOpen] = useState(false);

    const [incluyeAuxTransporte, setIncluyeAuxTransporte] = useState<boolean>(false);
    const [incluyeDeduccionesLegales, setIncluyeDeduccionesLegales] = useState<boolean>(true); 

    const fileInputRef = useRef<HTMLInputElement>(null); 
    const importJsonInputRef = useRef<HTMLInputElement>(null); 

    const { toast } = useToast();
    const { setValue } = useForm<WorkdayFormValues>(); 

    
    useEffect(() => {
        const loadedEmployees = loadEmployeesFromLocalStorage([]);
        setEmployees(loadedEmployees);
        setSavedPayrolls(loadAllSavedPayrolls(loadedEmployees)); 
    }, []); 

    
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const storageKey = getStorageKey(employeeId, payPeriodStart, payPeriodEnd);
            if (storageKey) {
                console.log(`Intentando cargar datos para la clave: ${storageKey}`);
                const storedData = localStorage.getItem(storageKey);
                const { days: parsedDays, income: parsedIncome, deductions: parsedDeductions, includeTransport: parsedIncludeTransport, includeDeducciones: parsedIncludeDeducciones } = parseStoredData(storedData);
                setCalculatedDays(parsedDays);
                setOtrosIngresos(parsedIncome);
                setOtrasDeducciones(parsedDeductions);
                setIncluyeAuxTransporte(parsedIncludeTransport);
                setIncluyeDeduccionesLegales(parsedIncludeDeducciones); 
                setIsDataLoaded(true);
                 if (employeeId && payPeriodStart && payPeriodEnd && !isDataLoaded) {
                     toast({
                         title: storedData ? 'Datos Cargados' : 'Datos No Encontrados',
                         description: storedData ? `Se cargaron turnos y ajustes para ${employeeId}.` : `No se encontraron datos guardados para ${employeeId} en este período.`,
                         variant: 'default',
                     });
                 }
            } else {
                setCalculatedDays([]);
                setOtrosIngresos([]);
                setOtrasDeducciones([]);
                setIncluyeAuxTransporte(false);
                setIncluyeDeduccionesLegales(true); 
                setIsDataLoaded(true);
            }
             setEditingDayId(null);
             setEditingResultsId(null);
             setIsIncomeModalOpen(false);
             setIsDeductionModalOpen(false);
        }
    
    }, [employeeId, payPeriodStart, payPeriodEnd]); 

    
    useEffect(() => {
        if (typeof window !== 'undefined' && isDataLoaded) {
            const storageKey = getStorageKey(employeeId, payPeriodStart, payPeriodEnd);
            if (storageKey && (calculatedDays.length > 0 || otrosIngresos.length > 0 || otrasDeducciones.length > 0 || incluyeAuxTransporte || !incluyeDeduccionesLegales)) {
                try {
                     console.log(`Intentando guardar datos (incluye transporte: ${incluyeAuxTransporte}, incluye deducciones: ${incluyeDeduccionesLegales}) en la clave: ${storageKey}`);
                     const dataToSave = {
                         calculatedDays: calculatedDays.map(day => ({ 
                             ...day,
                             inputData: {
                                 ...day.inputData,
                                 startDate: day.inputData.startDate instanceof Date ? day.inputData.startDate.toISOString() : day.inputData.startDate,
                             },
                         })),
                         otrosIngresosLista: otrosIngresos,
                         otrasDeduccionesLista: otrasDeducciones,
                         incluyeAuxTransporte: incluyeAuxTransporte,
                         incluyeDeduccionesLegales: incluyeDeduccionesLegales,
                     };
                    localStorage.setItem(storageKey, JSON.stringify(dataToSave));
                    const loadedEmployees = loadEmployeesFromLocalStorage([]);
                    setSavedPayrolls(loadAllSavedPayrolls(loadedEmployees));
                } catch (error) {
                    console.error("Error guardando datos en localStorage:", error);
                    toast({
                        title: 'Error al Guardar',
                        description: 'No se pudieron guardar los cambios localmente.',
                        variant: 'destructive',
                    });
                }
            } else if (storageKey && calculatedDays.length === 0 && otrosIngresos.length === 0 && otrasDeducciones.length === 0 && !incluyeAuxTransporte && incluyeDeduccionesLegales) {
                if (localStorage.getItem(storageKey)) {
                    localStorage.removeItem(storageKey);
                    console.log(`Clave ${storageKey} eliminada porque no hay datos, auxilio transporte está inactivo y deducciones están activas (default).`);
                     const loadedEmployees = loadEmployeesFromLocalStorage([]);
                     setSavedPayrolls(loadAllSavedPayrolls(loadedEmployees));
                }
            }
        }
    }, [calculatedDays, otrosIngresos, otrasDeducciones, incluyeAuxTransporte, incluyeDeduccionesLegales, employeeId, payPeriodStart, payPeriodEnd, isDataLoaded, toast]);


    
    const isDateCalculated = useCallback((dateToCheck: Date): boolean => {
        if (!dateToCheck || !isValidDate(dateToCheck)) return false;
        return calculatedDays.some(day =>
             day.inputData.startDate instanceof Date && isValidDate(day.inputData.startDate) &&
             isSameDayFns(day.inputData.startDate, dateToCheck) 
        );
    }, [calculatedDays]);


    
    const handleImportSchedule = useCallback(async () => {
        if (!employeeId || !payPeriodStart || !payPeriodEnd) {
            toast({ title: 'Información Incompleta', description: 'Selecciona colaborador y período antes de importar.', variant: 'destructive' });
            return;
        }
        setIsImporting(true);
        try {
            if (typeof window !== 'undefined') {
                const savedScheduleRaw = localStorage.getItem(SCHEDULE_DATA_KEY);
                if (!savedScheduleRaw) throw new Error('No se encontraron datos de horario planificado.');

                const scheduleDataMap = JSON.parse(savedScheduleRaw) as { [dateKey: string]: ScheduleData };
                let importedCount = 0;
                let skippedCount = 0;
                let errorCount = 0;
                const newCalculatedDays: CalculationResults[] = [];

                let currentDate = new Date(payPeriodStart);
                while (currentDate <= payPeriodEnd) {
                    const dateKey = format(currentDate, 'yyyy-MM-dd');
                    const daySchedule = scheduleDataMap[dateKey];

                    if (isDateCalculated(currentDate)) {
                         skippedCount++;
                         currentDate = addDays(currentDate, 1);
                         continue;
                     }

                    if (daySchedule) {
                        let employeeShift: ShiftAssignment | undefined;
                        for (const deptId in daySchedule.assignments) {
                            const assignment = daySchedule.assignments[deptId].find(a => a.employee.id === employeeId);
                            if (assignment) { employeeShift = assignment; break; }
                        }

                        if (employeeShift) {
                            const shiftValues: WorkdayFormValues = {
                                startDate: parseDateFns(dateKey, 'yyyy-MM-dd', new Date()),
                                startTime: employeeShift.startTime,
                                endTime: employeeShift.endTime,
                                endsNextDay: parseInt(employeeShift.endTime.split(':')[0]) < parseInt(employeeShift.startTime.split(':')[0]),
                                includeBreak: employeeShift.includeBreak,
                                breakStartTime: employeeShift.breakStartTime,
                                breakEndTime: employeeShift.breakEndTime,
                            };
                            const calculationId = `day_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
                            const result = await calculateSingleWorkday(shiftValues, calculationId);

                            if (isCalculationError(result)) {
                                console.error(`Error calculando turno importado para ${dateKey}:`, result.error);
                                errorCount++;
                                toast({
                                    title: `Error Importando Turno (${format(currentDate, 'dd/MM')})`,
                                    description: result.error.includes(":") ? result.error.split(':').slice(1).join(':').trim() : result.error, 
                                    variant: 'destructive',
                                    duration: 5000
                                });
                            } else {
                                newCalculatedDays.push(result);
                                importedCount++;
                            }
                        }
                    }
                    currentDate = addDays(currentDate, 1);
                }

                setCalculatedDays(prevDays => [...prevDays, ...newCalculatedDays].sort((a, b) => a.inputData.startDate.getTime() - b.inputData.startDate.getTime()));

                 let toastDescription = `${importedCount} turno(s) importado(s) y calculado(s).`;
                 if (skippedCount > 0) toastDescription += ` ${skippedCount} día(s) ya calculado(s) omitido(s).`;
                 if (errorCount > 0) toastDescription += ` ${errorCount} error(es) al calcular.`;
                 toast({ title: 'Importación de Horario Completa', description: toastDescription, variant: errorCount > 0 ? 'destructive' : 'default', duration: 7000 });
            } else {
                throw new Error('Operación solo disponible en el navegador.');
            }
        } catch (error) {
            console.error("Error importando horario:", error);
             const message = error instanceof Error ? error.message : 'No se pudo importar el horario planificado.';
            toast({ title: 'Error al Importar', description: message, variant: 'destructive' });
        } finally {
            setIsImporting(false);
        }
    }, [employeeId, payPeriodStart, payPeriodEnd, toast, isDateCalculated, setCalculatedDays]);


     const handleClearPeriodData = () => {
         const storageKey = getStorageKey(employeeId, payPeriodStart, payPeriodEnd);
         if (storageKey && typeof window !== 'undefined') {
            localStorage.removeItem(storageKey);
         }
         setCalculatedDays([]);
         setOtrosIngresos([]);
         setOtrasDeducciones([]);
         setIncluyeAuxTransporte(false);
         setIncluyeDeduccionesLegales(true); 
         setEditingDayId(null);
         setEditingResultsId(null);
         setEditedHours(null);
         const loadedEmployees = loadEmployeesFromLocalStorage([]); 
         setSavedPayrolls(loadAllSavedPayrolls(loadedEmployees));
         toast({
            title: 'Datos del Período Eliminados',
            description: `Se han borrado los turnos, ajustes, aux. transporte y config. de deducciones para ${employeeId} en este período.`,
            variant: 'destructive',
         });
    };

    const handleDayCalculationComplete = (data: CalculationResults | CalculationError) => {
        setIsLoadingDay(false);
        if (isCalculationError(data)) {
            const errorMessage = data.error || 'Error desconocido en el cálculo.';
            const displayMessage = errorMessage.includes(":")
                ? errorMessage.split(':').slice(1).join(':').trim() 
                : errorMessage;
            setErrorDay(displayMessage); 
             toast({
                 title: 'Error en el Cálculo',
                 description: displayMessage, 
                 variant: 'destructive',
                 duration: 7000 
             });
        } else {
             if (!payPeriodStart || !payPeriodEnd || !isValidDate(data.inputData.startDate) || data.inputData.startDate < payPeriodStart || data.inputData.startDate > payPeriodEnd) {
                setErrorDay(`La fecha del turno (${format(data.inputData.startDate, 'PPP', { locale: es })}) está fuera del período seleccionado.`);
                toast({
                    title: 'Fecha Fuera de Período',
                    description: `El turno del ${format(data.inputData.startDate, 'PPP', { locale: es })} no pertenece al período quincenal (${format(payPeriodStart!, 'dd/MM')} - ${format(payPeriodEnd!, 'dd/MM/yyyy')}). No se agregó.`,
                    variant: 'destructive',
                    duration: 5000,
                });
                setEditingDayId(null);
                return;
            }

            setErrorDay(null);
            setCalculatedDays((prevDays) => {
                const existingIndex = prevDays.findIndex((day) => day.id === data.id);
                let updatedDays;
                if (existingIndex > -1) {
                    updatedDays = [...prevDays];
                    updatedDays[existingIndex] = data;
                } else {
                    updatedDays = [...prevDays, data];
                }
                return updatedDays.sort((a, b) => a.inputData.startDate.getTime() - b.inputData.startDate.getTime());
            });
            const isEditing = !!editingDayId; 
            setEditingDayId(null);

             
             if (!isEditing) {
                const nextDay = addDays(data.inputData.startDate, 1);
                setValue('startDate', nextDay, { shouldValidate: true, shouldDirty: true });
                 toast({
                     title: 'Día Agregado, Fecha Avanzada',
                     description: `Se agregó el turno y la fecha se movió al ${format(nextDay, 'PPP', { locale: es })}.`,
                     variant: 'default'
                 });
             } else {
                 
                 toast({
                     title: 'Turno Actualizado',
                     description: `Turno para ${format(data.inputData.startDate, 'PPP', { locale: es })} actualizado.`,
                 });
             }
        }
    };


  const handleDayCalculationStart = () => {
    setIsLoadingDay(true);
    setErrorDay(null);
  };

  const handleEditDay = (id: string) => {
    setEditingResultsId(null);
    setEditedHours(null);
    setEditingDayId(id);
  };

   const handleEditResults = (id: string) => {
     const dayToEdit = calculatedDays.find(day => day.id === id);
     if (dayToEdit) {
       setEditingDayId(null);
       setEditingResultsId(id);
       setEditedHours({ ...dayToEdit.horasDetalladas });
     }
   };

   const handleHourChange = (e: ChangeEvent<HTMLInputElement>, key: keyof CalculationResults['horasDetalladas']) => {
     const value = e.target.value;
     if (value === '' || /^\d*\.?\d*$/.test(value)) {
        setEditedHours(prev => {
            if (!prev) return null;
            const numericValue = value === '' ? 0 : parseFloat(value);
            return { ...prev, [key]: isNaN(numericValue) ? 0 : numericValue };
        });
     }
   };

    const handleSaveResults = () => {
        if (!editingResultsId || !editedHours) return;
        setCalculatedDays(prevDays => {
            const index = prevDays.findIndex(day => day.id === editingResultsId);
            if (index === -1) return prevDays;
            const updatedDays = [...prevDays];
            const originalDay = updatedDays[index];
            let newPagoTotalRecargosExtras = 0;
            const newPagoDetallado: CalculationResults['pagoDetallado'] = { ...originalDay.pagoDetallado };
            let newTotalHorasTrabajadas = 0;
            for (const key in editedHours) {
                const category = key as keyof CalculationResults['horasDetalladas'];
                const hours = editedHours[category];
                newTotalHorasTrabajadas += hours;
                if (category !== "Ordinaria_Diurna_Base") {
                    const valorHora = VALORES[category] ?? 0;
                    const pagoCategoria = hours * valorHora;
                    newPagoDetallado[category] = pagoCategoria;
                    newPagoTotalRecargosExtras += pagoCategoria;
                } else {
                    newPagoDetallado[category] = 0;
                }
            }
            updatedDays[index] = {
                ...originalDay,
                horasDetalladas: editedHours,
                pagoDetallado: newPagoDetallado,
                pagoTotalRecargosExtras: newPagoTotalRecargosExtras,
                pagoTotalConSalario: newPagoTotalRecargosExtras,
                duracionTotalTrabajadaHoras: newTotalHorasTrabajadas,
            };
            return updatedDays.sort((a, b) => a.inputData.startDate.getTime() - b.inputData.startDate.getTime());
        });
        toast({ title: 'Detalles Actualizados', description: `Las horas para el turno han sido modificadas manualmente.` });
        setEditingResultsId(null);
        setEditedHours(null);
    };

  const handleCancelResults = () => {
    setEditingResultsId(null);
    setEditedHours(null);
  };

   const confirmDeleteDay = (id: string) => {
     setDayToDeleteId(id);
   };

   const handleDeleteDay = () => {
     if (!dayToDeleteId) return;
     setCalculatedDays((prevDays) => prevDays.filter((day) => day.id !== dayToDeleteId));
     toast({ title: 'Día Eliminado', description: 'El cálculo del día ha sido eliminado de la quincena.', variant: 'destructive' });
     setDayToDeleteId(null);
     if (editingDayId === dayToDeleteId) setEditingDayId(null);
     if (editingResultsId === dayToDeleteId) { setEditingResultsId(null); setEditedHours(null); }
   };

   const handleAddIngreso = (data: Omit<AdjustmentItem, 'id'>) => {
        const newItem: AdjustmentItem = { ...data, id: `ingreso_${Date.now()}` };
        setOtrosIngresos(prev => [...prev, newItem]);
        toast({ title: 'Ingreso Agregado', description: `${data.descripcion || 'Ingreso'}: ${formatCurrency(data.monto)}` });
   };

   const handleAddDeduccion = (data: Omit<AdjustmentItem, 'id'>) => {
         const newItem: AdjustmentItem = { ...data, id: `deduccion_${Date.now()}` };
         setOtrasDeducciones(prev => [...prev, newItem]);
         toast({ title: 'Deducción Agregada', description: `${data.descripcion || 'Deducción'}: ${formatCurrency(data.monto)}`, variant: 'default' });
   };

   const handleDeleteIngreso = (id: string) => {
        setOtrosIngresos(prev => prev.filter(item => item.id !== id));
        toast({ title: 'Ingreso Eliminado', variant: 'destructive' });
   };

   const handleDeleteDeduccion = (id: string) => {
        setOtrasDeducciones(prev => prev.filter(item => item.id !== id));
        toast({ title: 'Deducción Eliminada', variant: 'destructive' });
   };

    const handleToggleTransporte = () => {
        setIncluyeAuxTransporte(prev => !prev);
        toast({
            title: `Auxilio de Transporte ${!incluyeAuxTransporte ? 'Activado' : 'Desactivado'}`,
            description: !incluyeAuxTransporte
                         ? `Se sumará ${formatCurrency(AUXILIO_TRANSPORTE_VALOR)} al total devengado.`
                         : 'El auxilio de transporte no se incluirá en el cálculo.',
        });
    };

    const handleToggleDeduccionesLegales = () => {
        setIncluyeDeduccionesLegales(prev => !prev);
        toast({
            title: `Deducciones Legales ${!incluyeDeduccionesLegales ? 'Activadas' : 'Desactivadas'}`,
            description: !incluyeDeduccionesLegales
                         ? 'Se calcularán y aplicarán las deducciones de salud (4%) y pensión (4%).'
                         : 'No se calcularán las deducciones legales de salud y pensión.',
        });
    };

  const quincenalSummary = useMemo(() => {
        if (calculatedDays.length === 0 && !incluyeAuxTransporte && otrosIngresos.length === 0 && otrasDeducciones.length === 0 && incluyeDeduccionesLegales) return null;
       const baseSummary = calculateQuincenalSummary(calculatedDays, SALARIO_BASE_QUINCENAL_FIJO);
       const finalSummary: QuincenalCalculationSummary = baseSummary || {
           totalHorasDetalladas: { Ordinaria_Diurna_Base: 0, Recargo_Noct_Base: 0, Recargo_Dom_Diurno_Base: 0, Recargo_Dom_Noct_Base: 0, HED: 0, HEN: 0, HEDD_F: 0, HEND_F: 0 },
           totalPagoDetallado: { Ordinaria_Diurna_Base: 0, Recargo_Noct_Base: 0, Recargo_Dom_Diurno_Base: 0, Recargo_Dom_Noct_Base: 0, HED: 0, HEN: 0, HEDD_F: 0, HEND_F: 0 },
           totalPagoRecargosExtrasQuincena: 0,
           salarioBaseQuincenal: SALARIO_BASE_QUINCENAL_FIJO,
           pagoTotalConSalarioQuincena: SALARIO_BASE_QUINCENAL_FIJO,
           totalDuracionTrabajadaHorasQuincena: 0,
           diasCalculados: 0,
       };
       if (baseSummary) { finalSummary.pagoTotalConSalarioQuincena = baseSummary.pagoTotalConSalarioQuincena; }
       return finalSummary;
  }, [calculatedDays, incluyeAuxTransporte, otrosIngresos, otrasDeducciones, incluyeDeduccionesLegales]); 

  const editingDayData = useMemo(() => {
    if (!editingDayId) return undefined;
    return calculatedDays.find(day => day.id === editingDayId)?.inputData;
  }, [editingDayId, calculatedDays]);

  const handleDuplicateToNextDay = useCallback(async () => {
    const lastDay = calculatedDays.length > 0 ? calculatedDays[calculatedDays.length - 1] : null;
    if (!lastDay || !payPeriodStart || !payPeriodEnd) {
        toast({ title: 'No se puede duplicar', description: calculatedDays.length === 0 ? 'Agrega al menos un turno primero.' : 'Selecciona un período válido.', variant: 'destructive' });
        return;
    }
    handleDayCalculationStart();
    const nextDayDate = addDays(lastDay.inputData.startDate, 1);
    if (nextDayDate > payPeriodEnd) {
        setIsLoadingDay(false);
        toast({ title: 'Fecha Fuera de Período', description: `El siguiente día (${format(nextDayDate, 'PPP', { locale: es })}) está fuera del período quincenal. No se puede duplicar.`, variant: 'destructive', duration: 5000 });
        return;
    }
     if (isDateCalculated(nextDayDate)) {
        setIsLoadingDay(false);
        toast({ title: 'Fecha Ya Calculada', description: `Ya existe un cálculo para el ${format(nextDayDate, 'PPP', { locale: es })}. No se puede duplicar.`, variant: 'destructive', duration: 5000 });
        
        setValue('startDate', addDays(nextDayDate, 1), { shouldValidate: true, shouldDirty: true });
        return;
     }
    const nextDayValues: WorkdayFormValues = { ...lastDay.inputData, startDate: nextDayDate };
    const newDayId = `day_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    try {
        const result = await calculateSingleWorkday(nextDayValues, newDayId);
        handleDayCalculationComplete(result);
    } catch (error) {
        console.error("Error duplicando el turno:", error);
        const errorMessage = error instanceof Error ? error.message : "Hubo un error al duplicar.";
        handleDayCalculationComplete({ error: `Error duplicando: ${errorMessage}` });
    } finally {
        setIsLoadingDay(false);
    }
}, [calculatedDays, payPeriodStart, payPeriodEnd, toast, handleDayCalculationStart, handleDayCalculationComplete, isDateCalculated, setValue]);


  const isFormDisabled = !employeeId || !payPeriodStart || !payPeriodEnd;
  const showSummary = quincenalSummary !== null || otrosIngresos.length > 0 || otrasDeducciones.length > 0 || incluyeAuxTransporte || !incluyeDeduccionesLegales;

  const handleExportPDF = () => {
      const currentSummary = quincenalSummary;
     if (!currentSummary || !employeeId || !payPeriodStart || !payPeriodEnd) {
         toast({ title: 'Datos Incompletos para Exportar', description: 'Asegúrate de tener colaborador, período, cálculo y ajustes completados.', variant: 'destructive' });
         return;
     }
     try {
          const auxTransporteAplicado = incluyeAuxTransporte ? AUXILIO_TRANSPORTE_VALOR : 0;
          const currentEmployee = employees.find(emp => emp.id === employeeId);
        exportPayrollToPDF(currentSummary, employeeId, currentEmployee?.name, payPeriodStart, payPeriodEnd, otrosIngresos, otrasDeducciones, auxTransporteAplicado, incluyeDeduccionesLegales);
        toast({ title: 'PDF Exportado', description: `Comprobante de nómina para ${currentEmployee?.name || employeeId} generado.` });
     } catch (error) {
        console.error("Error exportando PDF:", error);
         toast({ title: 'Error al Exportar PDF', description: 'No se pudo generar el archivo PDF.', variant: 'destructive' });
     }
  };

  const handleBulkExportPDF = () => {
    const allPayrollDataToExport: SavedPayrollData[] = loadAllSavedPayrolls(employees);
    if (allPayrollDataToExport.length === 0) {
        toast({ title: 'No Hay Datos para Exportar', description: 'No se encontraron nóminas guardadas.', variant: 'default' });
        return;
    }
    try {
        exportAllPayrollsToPDF(allPayrollDataToExport, employees);
        toast({ title: 'Exportación Masiva Completa', description: `Se generó un PDF con ${allPayrollDataToExport.length} comprobantes.` });
    } catch (error) {
        console.error("Error durante la exportación masiva de PDF:", error);
        toast({ title: 'Error en Exportación Masiva', description: 'Ocurrió un error al generar el PDF combinado.', variant: 'destructive' });
    }
  };

   const handleLoadSavedPayroll = (payrollKey: string) => {
     const payrollToLoad = savedPayrolls.find(p => p.key === payrollKey);
     if (!payrollToLoad || typeof window === 'undefined') return;
     setEmployeeId(payrollToLoad.employeeId);
     setPayPeriodStart(payrollToLoad.periodStart);
     setPayPeriodEnd(payrollToLoad.periodEnd);
     setIncluyeDeduccionesLegales(payrollToLoad.incluyeDeduccionesLegales);
     setIsDataLoaded(false);
     toast({ title: 'Nómina Cargada', description: `Se cargaron los datos de ${payrollToLoad.employeeName || payrollToLoad.employeeId} para ${format(payrollToLoad.periodStart, 'dd/MM/yy')} - ${format(payrollToLoad.periodEnd, 'dd/MM/yy')}.` });
   };

    const handleDeleteSavedPayroll = () => {
      if (!payrollToDeleteKey || typeof window === 'undefined') return;
      try {
         const payrollInfo = savedPayrolls.find(p => p.key === payrollToDeleteKey);
         localStorage.removeItem(payrollToDeleteKey);
         const updatedSavedPayrolls = savedPayrolls.filter(p => p.key !== payrollToDeleteKey);
         setSavedPayrolls(updatedSavedPayrolls);
         setPayrollToDeleteKey(null);
         toast({ title: 'Nómina Guardada Eliminada', description: payrollInfo ? `La nómina de ${payrollInfo.employeeName || payrollInfo.employeeId} (${format(payrollInfo.periodStart, 'dd/MM/yy')}) fue eliminada.` : 'Nómina eliminada.', variant: 'destructive' });
         const currentKey = getStorageKey(employeeId, payPeriodStart, payPeriodEnd);
         if (currentKey === payrollToDeleteKey) {
             setCalculatedDays([]); setOtrosIngresos([]); setOtrasDeducciones([]); setIncluyeAuxTransporte(false); setIncluyeDeduccionesLegales(true);
         }
      } catch (error) {
          console.error("Error deleting saved payroll:", error);
          toast({ title: 'Error al Eliminar', description: 'No se pudo eliminar la nómina guardada.', variant: 'destructive' });
          setPayrollToDeleteKey(null);
      }
    };

     
     const handleExportSavedPayrolls = () => {
        try {
            const allPayrolls = loadAllSavedPayrolls(employees);
            if (allPayrolls.length === 0) {
                toast({ title: "Nada que Exportar", description: "No hay nóminas guardadas para exportar.", variant: "default" });
                return;
            }
            const dataToExport = allPayrolls.map(payroll => ({
                ...payroll,
                periodStart: payroll.periodStart instanceof Date ? payroll.periodStart.toISOString() : payroll.periodStart,
                periodEnd: payroll.periodEnd instanceof Date ? payroll.periodEnd.toISOString() : payroll.periodEnd,
                createdAt: payroll.createdAt instanceof Date ? payroll.createdAt.toISOString() : payroll.createdAt,
                calculatedDays: (payroll.calculatedDays || []).map(day => ({
                    ...day,
                    inputData: {
                        ...day.inputData,
                        startDate: day.inputData.startDate instanceof Date ? day.inputData.startDate.toISOString() : day.inputData.startDate,
                    }
                })),
                 summary: { 
                     ...payroll.summary,
                 }
            }));

            const jsonString = JSON.stringify(dataToExport, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `nominas_guardadas_${format(new Date(), 'yyyyMMdd_HHmmss')}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast({ title: "Exportación Exitosa", description: `Se exportaron ${allPayrolls.length} nóminas guardadas.` });
        } catch (error) {
            console.error("Error exportando nóminas guardadas:", error);
            toast({ title: "Error al Exportar", description: "No se pudieron exportar las nóminas guardadas.", variant: "destructive" });
        }
    };

    const handleImportSavedPayrolls = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            if (importJsonInputRef.current) importJsonInputRef.current.value = ''; // Clear if no file selected
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const jsonString = e.target?.result as string;
                if (!jsonString) {
                    toast({ title: "Error de Archivo", description: "No se pudo leer el contenido del archivo.", variant: "destructive" });
                    return;
                }

                let importedDataRaw;
                try {
                    importedDataRaw = JSON.parse(jsonString);
                } catch (parseError) {
                    console.error("Error parseando JSON:", parseError);
                    toast({ title: "Error de Formato JSON", description: "El archivo no es un JSON válido. Por favor, verifica la estructura.", variant: "destructive" });
                    return;
                }

                if (!Array.isArray(importedDataRaw)) {
                    toast({ title: "Error de Formato", description: "El archivo JSON debe contener un array (lista) de nóminas en su raíz.", variant: "destructive" });
                    return;
                }

                const importedPayrolls = reviveSavedPayrollDates(importedDataRaw);

                if (importedPayrolls.length === 0 && importedDataRaw.length > 0) {
                    toast({ title: "Error de Contenido", description: "El archivo JSON es un array, pero no se pudieron procesar nóminas válidas a partir de su contenido. Verifica la estructura de cada objeto de nómina.", variant: "destructive" });
                    return;
                }
                
                if (importedPayrolls.length === 0 && importedDataRaw.length === 0) {
                    toast({ title: "Archivo Vacío", description: "El archivo JSON está vacío o no contiene nóminas para importar.", variant: "default" });
                    return;
                }

                let addedCount = 0;
                let updatedCount = 0;

                const currentPayrollKeysInStorage = new Set<string>();
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith('payroll_')) {
                        currentPayrollKeysInStorage.add(key);
                    }
                }

                importedPayrolls.forEach(payroll => {
                    const storageKey = getStorageKey(payroll.employeeId, payroll.periodStart, payroll.periodEnd);
                    if (!storageKey) {
                        console.warn("Omitiendo nómina importada con datos inválidos para generar clave:", payroll);
                        return; 
                    }
                    payroll.key = storageKey; 

                    const dataToSaveInLocalStorage = {
                        employeeId: payroll.employeeId,
                        employeeName: payroll.employeeName,
                        periodStart: payroll.periodStart instanceof Date ? payroll.periodStart.toISOString() : payroll.periodStart,
                        periodEnd: payroll.periodEnd instanceof Date ? payroll.periodEnd.toISOString() : payroll.periodEnd,
                        createdAt: payroll.createdAt instanceof Date ? payroll.createdAt.toISOString() : payroll.createdAt,
                        otrosIngresosLista: payroll.otrosIngresosLista || [],
                        otrasDeduccionesLista: payroll.otrasDeduccionesLista || [],
                        incluyeAuxTransporte: typeof payroll.incluyeAuxTransporte === 'boolean' ? payroll.incluyeAuxTransporte : false,
                        incluyeDeduccionesLegales: typeof payroll.incluyeDeduccionesLegales === 'boolean' ? payroll.incluyeDeduccionesLegales : true,
                        calculatedDays: (payroll.calculatedDays || []).map((day: CalculationResults) => ({
                            ...day,
                            inputData: {
                                ...day.inputData,
                                startDate: day.inputData.startDate instanceof Date ? day.inputData.startDate.toISOString() : day.inputData.startDate,
                            }
                        })),
                    };

                    try {
                        localStorage.setItem(storageKey, JSON.stringify(dataToSaveInLocalStorage));
                        if (currentPayrollKeysInStorage.has(storageKey)) {
                            updatedCount++;
                        } else {
                            addedCount++;
                        }
                    } catch (storageError) {
                         console.error(`Error guardando nómina importada ${storageKey} en localStorage:`, storageError);
                    }
                });

                 const loadedEmployees = loadEmployeesFromLocalStorage([]);
                 setSavedPayrolls(loadAllSavedPayrolls(loadedEmployees)); 

                toast({
                     title: "Importación Completada",
                     description: `${addedCount} nóminas nuevas importadas. ${updatedCount} nóminas existentes actualizadas.`,
                     variant: "default"
                 });

            } catch (error) { 
                console.error("Error inesperado durante la importación de nóminas:", error);
                const message = error instanceof Error ? error.message : "Ocurrió un error inesperado al importar el archivo.";
                toast({ title: "Error Crítico de Importación", description: message, variant: "destructive" });
            } finally {
                if (importJsonInputRef.current) {
                    importJsonInputRef.current.value = '';
                }
            }
        };
        reader.readAsText(file);
    };


  return (
    <main
        className="container mx-auto p-4 md:p-8 max-w-7xl relative" 
    >

        
        <div className="absolute top-[-30px] left-8 -z-10 opacity-70 dark:opacity-30 pointer-events-none sm:opacity-70 md:opacity-70 lg:opacity-70 xl:opacity-70 2xl:opacity-70" aria-hidden="true"> 
           <Image
               src="https://i.postimg.cc/NFs0pvpq/Recurso-4.png" 
               alt="Ilustración de taza de café"
               width={120} 
               height={120} 
               className="object-contain transform -rotate-12" 
               data-ai-hint="coffee cup illustration"
           />
        </div>
        <div className="absolute top-[-90px] right-[-20px] -z-10 opacity-70 dark:opacity-30 pointer-events-none sm:opacity-70 md:opacity-70 lg:opacity-70 xl:opacity-70 2xl:opacity-70" aria-hidden="true"> 
            <Image
               src="https://i.postimg.cc/J0xsLzGz/Recurso-3.png" 
               alt="Ilustración de elementos de oficina" 
               width={150} 
               height={150} 
               className="object-contain transform rotate-12" 
               data-ai-hint="office elements illustration" 
            />
        </div>


      <div className="text-center mb-8">
         <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary via-foreground/80 to-primary">
            Calculadora de Nómina Quincenal
         </h1>
      </div>

      <Card className="mb-8 shadow-lg bg-card">
          <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-foreground"> <User className="h-5 w-5" /> Selección de Colaborador y Período </CardTitle>
              <CardDescription> Ingresa el ID del colaborador y selecciona el período para cargar/guardar o importar turnos. </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="space-y-2">
                  <Label htmlFor="employeeId" className="text-foreground">ID Colaborador</Label>
                  <Input id="employeeId" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} placeholder="Ej: 12345678" />
              </div>
              <div className="space-y-2">
                  <Label className="text-foreground">Inicio Período</Label>
                  <Popover>
                      <PopoverTrigger asChild>
                          <Button variant={'outline'} className={cn('w-full justify-start text-left font-normal', !payPeriodStart && 'text-muted-foreground')}>
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {payPeriodStart ? format(payPeriodStart, 'PPP', { locale: es }) : <span>Selecciona fecha</span>}
                          </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0"> <Calendar mode="single" selected={payPeriodStart} onSelect={setPayPeriodStart} initialFocus locale={es} /> </PopoverContent>
                  </Popover>
              </div>
              <div className="space-y-2">
                  <Label className="text-foreground">Fin Período</Label>
                   <Popover>
                      <PopoverTrigger asChild>
                          <Button variant={'outline'} className={cn('w-full justify-start text-left font-normal', !payPeriodEnd && 'text-muted-foreground')}>
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {payPeriodEnd ? format(payPeriodEnd, 'PPP', { locale: es }) : <span>Selecciona fecha</span>}
                          </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0"> <Calendar mode="single" selected={payPeriodEnd} onSelect={setPayPeriodEnd} initialFocus locale={es} disabled={(date) => payPeriodStart ? date < payPeriodStart : false} /> </PopoverContent>
                  </Popover>
              </div>

                <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-4"> 
                   
                   <Button onClick={handleImportSchedule} variant="outline" className="w-full hover:bg-primary hover:text-primary-foreground" disabled={isFormDisabled || isImporting}>
                        {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FolderSync className="mr-2 h-4 w-4" />}
                        Importar Horario Planificado
                   </Button>
                   
                   <AlertDialog>
                        <AlertDialogTrigger asChild>
                             <Button variant="outline" className="w-full hover:bg-destructive hover:text-destructive-foreground" disabled={isFormDisabled || (calculatedDays.length === 0 && otrosIngresos.length === 0 && otrasDeducciones.length === 0 && !incluyeAuxTransporte && incluyeDeduccionesLegales) }>
                                <Eraser className="mr-2 h-4 w-4" /> Limpiar Período Actual
                            </Button>
                        </AlertDialogTrigger>
                       <AlertDialogContent>
                         <AlertDialogHeader> <AlertDialogTitle>¿Limpiar Datos del Período?</AlertDialogTitle> <AlertDialogDescription> Esta acción eliminará turnos, ajustes, aux. transporte y config. deducciones para <strong>{employeeId || 'colaborador'}</strong> en período <strong>{payPeriodStart ? format(payPeriodStart, 'dd/MM/yy') : '?'}</strong> - <strong>{payPeriodEnd ? format(payPeriodEnd, 'dd/MM/yy') : '?'}</strong>. No se puede deshacer. </AlertDialogDescription> </AlertDialogHeader>
                         <AlertDialogFooter> <AlertDialogCancel>Cancelar</AlertDialogCancel> <AlertDialogAction onClick={handleClearPeriodData} className="bg-destructive hover:bg-destructive/90"> Limpiar Datos </AlertDialogAction> </AlertDialogFooter>
                       </AlertDialogContent>
                   </AlertDialog>
                    
                    <Button
                         onClick={handleExportSavedPayrolls}
                         variant="outline"
                         className="w-full hover:bg-green-600 hover:text-white" 
                         disabled={savedPayrolls.length === 0}
                         title="Exportar todas las nóminas guardadas (JSON)"
                    >
                         <Download className="mr-2 h-4 w-4" /> Exportar Nóminas
                    </Button>
                    
                     <input
                       type="file"
                       accept=".json"
                       ref={importJsonInputRef}
                       onChange={handleImportSavedPayrolls}
                       className="hidden"
                       id="import-payrolls-input"
                    />
                    <Button
                        variant="outline"
                        className="w-full hover:bg-blue-600 hover:text-white" 
                        onClick={() => importJsonInputRef.current?.click()}
                        title="Importar nóminas guardadas desde archivo JSON"
                    >
                        <FolderUp className="mr-2 h-4 w-4" /> Importar Nóminas
                    </Button>
               </div>
          </CardContent>
      </Card>

      
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-8 mb-8">

         
         <div className="lg:col-span-2">
            <Card className={`shadow-lg bg-card ${isFormDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
               <CardHeader>
                 <CardTitle className="flex items-center gap-2 text-lg text-foreground"> {editingDayId ? <Edit className="h-4 w-4" /> : <PlusCircle className="h-4 w-4" />} {editingDayId ? 'Editar Turno' : 'Agregar Turno'} </CardTitle>
                 <CardDescription> {isFormDisabled ? 'Selecciona colaborador y período.' : editingDayId ? `Modifica fecha/horas.` : 'Ingresa detalles del turno.'} </CardDescription>
               </CardHeader>
               <CardContent>
                  {isFormDisabled ? ( <div className="text-center text-muted-foreground italic py-4"> Selección pendiente. </div> ) : (
                     <WorkdayForm
                       key={editingDayId || 'new'}
                       onCalculationStart={handleDayCalculationStart}
                       onCalculationComplete={handleDayCalculationComplete}
                       isLoading={isLoadingDay}
                       initialData={editingDayData}
                       existingId={editingDayId}
                       isDateCalculated={isDateCalculated}
                     /> )}
                 {errorDay && ( <p className="text-sm font-medium text-destructive mt-4">{errorDay}</p> )}
               </CardContent>
            </Card>
         </div>

         
         <div className="lg:col-span-3 space-y-8">
            {calculatedDays.length > 0 && (
               <Card className="shadow-lg bg-card">
                 <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg text-foreground"> <Clock className="h-4 w-4"/> Turnos Agregados ({calculatedDays.length}) </CardTitle>
                   <CardDescription>Lista de turnos. Edita horas o elimina.</CardDescription>
                 </CardHeader>
                 <CardContent>
                   <ul className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                     {calculatedDays.map((day, index) => (
                       <li key={day.id} className={`p-4 border rounded-lg shadow-sm transition-colors ${editingResultsId === day.id ? 'bg-primary/10 border-primary' : 'bg-card'}`}>
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="font-semibold text-lg mb-1 text-foreground">Turno {index + 1}</p>
                              <div className="flex items-center text-sm text-muted-foreground gap-2 mb-1"> <CalendarIcon className="h-4 w-4" /> {format(day.inputData.startDate, 'PPPP', { locale: es })} </div>
                              <div className="flex items-center text-sm text-muted-foreground gap-2"> <Clock className="h-4 w-4" /> {formatTo12Hour(day.inputData.startTime)} - {formatTo12Hour(day.inputData.endTime)} {day.inputData.endsNextDay ? ' (+1d)' : ''} </div>
                               {day.inputData.includeBreak && day.inputData.breakStartTime && day.inputData.breakEndTime && (
                                   <div className="flex items-center text-sm text-muted-foreground/80 gap-2 mt-1">
                                       <Coffee className="h-4 w-4 text-blue-500" /> 
                                       Descanso: {formatTo12Hour(day.inputData.breakStartTime)} - {formatTo12Hour(day.inputData.breakEndTime)}
                                   </div>
                               )}
                            </div>
                            <div className="text-right flex-shrink-0 ml-4">
                                <div className="text-sm text-muted-foreground mb-1">Recargos/Extras:</div>
                                <div className="font-semibold text-primary text-lg flex items-center justify-end gap-1"> {formatCurrency(day.pagoTotalRecargosExtras)} </div>
                               <div className="flex items-center justify-end gap-1 mt-2">
                                  <Button variant="ghost" size="icon" onClick={() => handleEditDay(day.id)} title="Editar Fecha/Horas" className={`h-8 w-8 ${editingDayId === day.id ? 'text-primary bg-primary/10' : ''}`} disabled={editingResultsId === day.id}> <Edit className="h-4 w-4" /> </Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleEditResults(day.id)} title="Editar Horas Calculadas" className={`h-8 w-8 ${editingResultsId === day.id ? 'text-primary bg-primary/10' : ''}`} disabled={editingDayId === day.id}> <PencilLine className="h-4 w-4" /> </Button>
                                  <AlertDialog>
                                     <AlertDialogTrigger asChild>
                                       <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8" onClick={() => confirmDeleteDay(day.id)} title="Eliminar turno" disabled={editingDayId === day.id || editingResultsId === day.id}> <Trash2 className="h-4 w-4" /> </Button>
                                     </AlertDialogTrigger>
                                    <AlertDialogContent> <AlertDialogHeader> <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle> <AlertDialogDescription> Eliminar cálculo para turno iniciado el {calculatedDays.find(d => d.id === dayToDeleteId)?.inputData?.startDate ? format(calculatedDays.find(d => d.id === dayToDeleteId)!.inputData.startDate, 'PPP', { locale: es }) : 'seleccionado'}? No se puede deshacer. </AlertDialogDescription> </AlertDialogHeader> <AlertDialogFooter> <AlertDialogCancel onClick={() => setDayToDeleteId(null)}>Cancelar</AlertDialogCancel> <AlertDialogAction onClick={handleDeleteDay} className="bg-destructive hover:bg-destructive/90"> Eliminar </AlertDialogAction> </AlertDialogFooter> </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                            </div>
                         </div>
                          <Separator className="my-3"/>
                          {editingResultsId === day.id && editedHours ? (
                              <div className="space-y-3">
                                  <p className="text-sm font-medium text-foreground">Editando horas calculadas:</p>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
                                      {displayOrder.map(key => (
                                          <div key={key} className="space-y-1">
                                              <Label htmlFor={`edit-hours-${day.id}-${key}`} className="text-xs text-muted-foreground"> {abbreviatedLabelMap[key] || key} </Label>
                                              <Input id={`edit-hours-${day.id}-${key}`} type="number" step="0.01" min="0" value={editedHours[key] ?? 0} onChange={(e) => handleHourChange(e, key)} className="h-8 text-sm" placeholder="0.00" />
                                          </div>
                                      ))}
                                  </div>
                                  <div className="flex justify-end gap-2 mt-3">
                                      <Button variant="ghost" size="sm" onClick={handleCancelResults}> <X className="mr-1 h-4 w-4" /> Cancelar </Button>
                                      <Button variant="default" size="sm" onClick={handleSaveResults}> <Save className="mr-1 h-4 w-4" /> Guardar Horas </Button>
                                  </div>
                              </div>
                          ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                  {displayOrder.map(key => {
                                      const hours = day.horasDetalladas[key];
                                      if (hours > 0) { return ( <div key={key} className="flex justify-between items-center space-x-1"> <span className="text-muted-foreground truncate mr-1">{abbreviatedLabelMap[key] || key}:</span> <span className="font-medium text-right text-foreground flex-shrink-0">{formatHours(hours)}h</span> </div> ); }
                                      return null;
                                  })}
                                  <div className="flex justify-between items-center col-span-full mt-1 pt-1 border-t border-dashed"> <span className="text-muted-foreground font-medium">Total Horas Trabajadas:</span> <span className="font-semibold text-right text-foreground">{formatHours(day.duracionTotalTrabajadaHoras)}h</span> </div>
                              </div>
                          )}
                       </li>
                     ))}
                   </ul>
                    <Button variant="outline" onClick={handleDuplicateToNextDay} className="mt-6 w-full md:w-auto hover:bg-primary hover:text-primary-foreground" disabled={isFormDisabled || isLoadingDay || calculatedDays.length === 0}>
                       {isLoadingDay ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CopyPlus className="mr-2 h-4 w-4" />} Duplicar Turno Sig. Día
                     </Button>
                 </CardContent>
               </Card>
             )}
             {calculatedDays.length === 0 && !editingDayId && !isFormDisabled && (
                <Card className="text-center p-8 border-dashed mt-8 bg-card"> <CardHeader> <CardTitle className="text-lg text-foreground">Comienza a Calcular</CardTitle> <CardDescription>Agrega el primer turno para {employeeId} o importa.</CardDescription> </CardHeader> </Card>
             )}
              {isFormDisabled && calculatedDays.length === 0 && (
                <Card className="text-center p-8 border-dashed mt-8 bg-muted/50"> <CardHeader> <CardTitle className="text-lg text-foreground">Selección Pendiente</CardTitle> <CardDescription>Ingresa ID y período para empezar.</CardDescription> </CardHeader> </Card>
             )}
         </div>

         
         <div className="lg:col-span-2">
              <SavedPayrollList
                  payrolls={savedPayrolls}
                  onLoad={handleLoadSavedPayroll}
                  onDelete={(key) => setPayrollToDeleteKey(key)}
                  onBulkExport={() => handleBulkExportPDF()} 
                   onExportJson={handleExportSavedPayrolls} 
                   onImportJsonClick={() => importJsonInputRef.current?.click()} 
              />
               <AlertDialog open={!!payrollToDeleteKey} onOpenChange={(open) => !open && setPayrollToDeleteKey(null)}>
                  <AlertDialogContent> <AlertDialogHeader> <AlertDialogTitle>¿Eliminar Nómina Guardada?</AlertDialogTitle> <AlertDialogDescription> Eliminar nómina de <strong>{savedPayrolls.find(p => p.key === payrollToDeleteKey)?.employeeName || savedPayrolls.find(p => p.key === payrollToDeleteKey)?.employeeId}</strong> ({savedPayrolls.find(p => p.key === payrollToDeleteKey)?.periodStart ? format(savedPayrolls.find(p => p.key === payrollToDeleteKey)!.periodStart, 'dd/MM/yy') : '?'} - {savedPayrolls.find(p => p.key === payrollToDeleteKey)?.periodEnd ? format(savedPayrolls.find(p => p.key === payrollToDeleteKey)!.periodEnd, 'dd/MM/yy') : '?'})? No se puede deshacer. </AlertDialogDescription> </AlertDialogHeader> <AlertDialogFooter> <AlertDialogCancel onClick={() => setPayrollToDeleteKey(null)}>Cancelar</AlertDialogCancel> <AlertDialogAction onClick={handleDeleteSavedPayroll} className="bg-destructive hover:bg-destructive/90"> Eliminar Nómina </AlertDialogAction> </AlertDialogFooter> </AlertDialogContent>
              </AlertDialog>
         </div>

     </div>

      
      {showSummary && (
         <Card className="shadow-lg mt-8 bg-card lg:col-span-7"> 
            <CardHeader className="flex flex-row items-center justify-between">
               <div>
                 <CardTitle className="flex items-center gap-2 text-lg text-foreground"><Calculator className="h-4 w-4" /> Resumen Quincenal</CardTitle>
                 <CardDescription>Resultados para {employees.find(emp => emp.id === employeeId)?.name || employeeId} ({payPeriodStart ? format(payPeriodStart, 'dd/MM') : ''} - {payPeriodEnd ? format(payPeriodEnd, 'dd/MM') : ''}).</CardDescription>
               </div>
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="secondary"
                            size="sm"
                            disabled={!quincenalSummary || !employeeId || !payPeriodStart || !payPeriodEnd}
                        >
                             <FileDown className="mr-2 h-4 w-4" /> PDF <span className="ml-1 text-xs">(Actual)</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                       <DropdownMenuItem onClick={handleExportPDF} disabled={!quincenalSummary || !employeeId || !payPeriodStart || !payPeriodEnd}> Exportar Nómina Actual </DropdownMenuItem>
                       <DropdownMenuSeparator />
                       <DropdownMenuItem onClick={handleBulkExportPDF} disabled={savedPayrolls.length === 0} className="text-red-600 focus:text-red-700"> Exportar Lista Guardadas </DropdownMenuItem>
                    </DropdownMenuContent>
                 </DropdownMenu>

            </CardHeader>
            <CardContent>
               <ResultsDisplay
                   results={quincenalSummary}
                   error={null}
                   isLoading={false}
                   isSummary={true}
                   otrosIngresos={otrosIngresos}
                   otrasDeducciones={otrasDeducciones}
                   onAddIngreso={() => setIsIncomeModalOpen(true)}
                   onAddDeduccion={() => setIsDeductionModalOpen(true)}
                   onDeleteIngreso={handleDeleteIngreso}
                   onDeleteDeduccion={handleDeleteDeduccion}
                   incluyeAuxTransporte={incluyeAuxTransporte}
                   onToggleTransporte={handleToggleTransporte}
                   auxTransporteValor={AUXILIO_TRANSPORTE_VALOR}
                   incluyeDeduccionesLegales={incluyeDeduccionesLegales}
                   onToggleDeduccionesLegales={handleToggleDeduccionesLegales}
                />
            </CardContent>
         </Card>
       )}

      
      <AdjustmentModal type="ingreso" isOpen={isIncomeModalOpen} onClose={() => setIsIncomeModalOpen(false)} onSave={handleAddIngreso} />
       <AdjustmentModal type="deduccion" isOpen={isDeductionModalOpen} onClose={() => setIsDeductionModalOpen(false)} onSave={handleAddDeduccion} />

    </main>
  );
}
