'use client';

import React, { useState, useCallback, useMemo, ChangeEvent, useEffect, useRef, DragEvent } from 'react';
import { WorkdayForm, formSchema } from '@/components/workday-form'; // Import formSchema
import { ResultsDisplay, labelMap as fullLabelMap, abbreviatedLabelMap, displayOrder, formatHours, formatCurrency } from '@/components/results-display'; // Import helpers and rename labelMap
import type { CalculationResults, CalculationError, QuincenalCalculationSummary, AdjustmentItem, SavedPayrollData } from '@/types'; // Added AdjustmentItem and SavedPayrollData
import type { ScheduleData, ShiftAssignment } from '@/types/schedule'; // Import schedule types
import { isCalculationError } from '@/types'; // Import the type guard
import { Toaster } from '@/components/ui/toaster';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input'; // Import Input for editing hours and employee ID
import { Label } from '@/components/ui/label'; // Import Label for editing hours and employee ID
import { Trash2, Edit, PlusCircle, Calculator, DollarSign, Clock, Calendar as CalendarIcon, Save, X, PencilLine, User, FolderSync, Eraser, FileDown, Library, FileSearch, MinusCircle, Bus, CopyPlus, Loader2, FileUp, FileSpreadsheet } from 'lucide-react'; // Added Bus icon, CopyPlus, Loader2, FileUp, FileSpreadsheet
import { format, parseISO, startOfMonth, endOfMonth, setDate, parse as parseDateFns, addDays, isSameDay, isWithinInterval, isValid as isValidDate } from 'date-fns'; // Renamed isValid to avoid conflict, added isValidDate alias
import { es } from 'date-fns/locale';
import { calculateSingleWorkday } from '@/actions/calculate-workday';
import { useToast } from '@/hooks/use-toast';
import type { WorkdayFormValues } from '@/components/workday-form';
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
import { z } from 'zod'; // Import zod for CSV validation

// Constants
const SALARIO_BASE_QUINCENAL_FIJO = 711750; // Example fixed salary
const AUXILIO_TRANSPORTE_VALOR = 100000; // User-defined value for transport allowance
const SCHEDULE_DATA_KEY = 'schedulePlannerData'; // LocalStorage key for schedule data

// --- LocalStorage Key Generation ---
const getStorageKey = (employeeId: string, periodStart: Date | undefined, periodEnd: Date | undefined): string | null => {
    if (!employeeId || !periodStart || !periodEnd) return null;
    // Ensure dates are valid before formatting
    if (isNaN(periodStart.getTime()) || isNaN(periodEnd.getTime())) return null;
    try {
        const startStr = format(periodStart, 'yyyy-MM-dd');
        const endStr = format(periodEnd, 'yyyy-MM-dd');
        // Sanitize employeeId to be safe for keys (basic example)
        const safeEmployeeId = employeeId.replace(/[^a-zA-Z0-9_-]/g, '');
        return `payroll_${safeEmployeeId}_${startStr}_${endStr}`;
    } catch (e) {
        console.error("Error generando la clave de almacenamiento:", e);
        return null;
    }
};


// --- Helper to parse stored data (revives dates and includes transport flag) ---
const parseStoredData = (jsonData: string | null): { days: CalculationResults[], income: AdjustmentItem[], deductions: AdjustmentItem[], includeTransport: boolean } => {
    if (!jsonData) return { days: [], income: [], deductions: [], includeTransport: false };
    try {
        // Assuming stored data now includes adjustments and transport flag
        const storedObject = JSON.parse(jsonData) as {
             calculatedDays: CalculationResults[],
             otrosIngresosLista?: AdjustmentItem[],
             otrasDeduccionesLista?: AdjustmentItem[],
             incluyeAuxTransporte?: boolean // Load the flag
        };

        // Revive date objects in calculatedDays
        const revivedDays = (storedObject.calculatedDays || []).map(day => ({
            ...day,
            inputData: {
                ...day.inputData,
                startDate: day.inputData.startDate && typeof day.inputData.startDate === 'string'
                            ? parseISO(day.inputData.startDate)
                            : (day.inputData.startDate instanceof Date ? day.inputData.startDate : new Date()), // Fallback
            }
        }));

        // Ensure adjustment lists are arrays, even if missing in old data
        const incomeList = Array.isArray(storedObject.otrosIngresosLista) ? storedObject.otrosIngresosLista : [];
        const deductionList = Array.isArray(storedObject.otrasDeduccionesLista) ? storedObject.otrasDeduccionesLista : [];
        const includeTransport = typeof storedObject.incluyeAuxTransporte === 'boolean' ? storedObject.incluyeAuxTransporte : false; // Default to false if missing

        return { days: revivedDays, income: incomeList, deductions: deductionList, includeTransport };

    } catch (error) {
        console.error("Error parseando datos de localStorage:", error);
        return { days: [], income: [], deductions: [], includeTransport: false }; // Return default object on error
    }
};

// --- Regex to parse storage key ---
const storageKeyRegex = /^payroll_([a-zA-Z0-9_-]+)_(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})$/;

// --- Helper to load all saved payrolls ---
const loadAllSavedPayrolls = (): SavedPayrollData[] => {
    if (typeof window === 'undefined') return []; // Client-side only

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

                    // Validate parsed data
                    if (!employeeId || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                        console.warn(`Omitiendo clave de almacenamiento inválida: ${key}`);
                        continue;
                    }

                    const storedData = localStorage.getItem(key);
                     // Get adjustments and transport flag too
                    const { days: parsedDays, income: parsedIncome, deductions: parsedDeductions, includeTransport: parsedIncludeTransport } = parseStoredData(storedData);

                    if (parsedDays.length > 0 || parsedIncome.length > 0 || parsedDeductions.length > 0 || parsedIncludeTransport) { // Check if there's any data OR transport flag is true
                        // Calculate summary for the loaded days
                        const summary = calculateQuincenalSummary(parsedDays, SALARIO_BASE_QUINCENAL_FIJO);
                        // Summary can be null if parsedDays is empty, handle this case
                        // We still might want to save/load if only adjustments exist

                         const savedPayrollItem: SavedPayrollData = {
                            key: key,
                            employeeId: employeeId,
                            periodStart: startDate,
                            periodEnd: endDate,
                            // Handle case where summary might be null if only adjustments were saved
                            summary: summary || { // Provide a default empty summary if null
                                totalHorasDetalladas: { Ordinaria_Diurna_Base: 0, Recargo_Noct_Base: 0, Recargo_Dom_Diurno_Base: 0, Recargo_Dom_Noct_Base: 0, HED: 0, HEN: 0, HEDD_F: 0, HEND_F: 0 },
                                totalPagoDetallado: { Ordinaria_Diurna_Base: 0, Recargo_Noct_Base: 0, Recargo_Dom_Diurno_Base: 0, Recargo_Dom_Noct_Base: 0, HED: 0, HEN: 0, HEDD_F: 0, HEND_F: 0 },
                                totalPagoRecargosExtrasQuincena: 0,
                                salarioBaseQuincenal: SALARIO_BASE_QUINCENAL_FIJO,
                                pagoTotalConSalarioQuincena: SALARIO_BASE_QUINCENAL_FIJO,
                                totalDuracionTrabajadaHorasQuincena: 0,
                                diasCalculados: 0,
                            },
                            otrosIngresosLista: parsedIncome, // Store loaded income adjustments
                            otrasDeduccionesLista: parsedDeductions, // Store loaded deduction adjustments
                            incluyeAuxTransporte: parsedIncludeTransport, // Store transport flag
                            // Use period start date as a reasonable approximation for createdAt if actual day data is missing
                            createdAt: (parsedDays.length > 0 && parsedDays[0]?.inputData?.startDate)
                                       ? new Date(parsedDays[0].inputData.startDate)
                                       : startDate // Fallback to period start date
                         };

                        savedPayrolls.push(savedPayrollItem);

                    }
                }
            }
        }
    } catch (error) {
        console.error("Error cargando nóminas guardadas de localStorage:", error);
        // Optionally show a toast message here
    }
    // Sort by period start date descending, then employee ID
    return savedPayrolls.sort((a, b) => {
       const dateDiff = b.periodStart.getTime() - a.periodStart.getTime();
       if (dateDiff !== 0) return dateDiff;
       return a.employeeId.localeCompare(b.employeeId);
    });
};


// Helper function to parse CSV content
// Expected Headers: ID_Empleado, Fecha, Hora_Inicio, Hora_Fin, Incluye_Descanso, Inicio_Descanso, Fin_Descanso
const parseCSV = (content: string): Record<string, string>[] => {
    // Normalize line endings and split into rows
    const rows = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n');
    console.log(`[parseCSV] Found ${rows.length} rows (including header).`);

    if (rows.length < 2) {
        console.warn('[parseCSV] No data rows found.');
        return []; // Need header + at least one data row
    }

    // Trim headers and log them
    const headers = rows[0].split(',').map(h => h.trim());
    console.log('[parseCSV] Headers:', headers);
    const data = [];

    // Expected headers (case-insensitive check later)
    const expectedHeaders = ['ID_Empleado', 'Fecha', 'Hora_Inicio', 'Hora_Fin', 'Incluye_Descanso', 'Inicio_Descanso', 'Fin_Descanso'];
    // Basic validation: check if essential headers are present
    const requiredHeaders = ['ID_Empleado', 'Fecha', 'Hora_Inicio', 'Hora_Fin'];
    const missingHeaders = requiredHeaders.filter(expHeader => !headers.some(h => h.toLowerCase() === expHeader.toLowerCase()));
    if (missingHeaders.length > 0) {
        console.error(`[parseCSV] Missing required headers: ${missingHeaders.join(', ')}`);
        return []; // Abort if required headers are missing
    }


    for (let i = 1; i < rows.length; i++) {
         // Skip empty lines
         if (!rows[i].trim()) {
            console.warn(`[parseCSV] Skipping empty row ${i + 1}.`);
            continue;
         }

        const values = rows[i].split(',').map(v => v.trim());
        if (values.length === headers.length) {
            const rowObject: Record<string, string> = {};
            headers.forEach((header, index) => {
                // Find the standard header key (case-insensitive) to ensure consistency
                const standardHeader = expectedHeaders.find(exp => exp.toLowerCase() === header.toLowerCase());
                // Use the standard header name if found, otherwise use the original header
                const keyToUse = standardHeader || header;
                rowObject[keyToUse] = values[index];
            });
            data.push(rowObject);
        } else {
            console.warn(`[parseCSV] Skipping row ${i + 1}: Mismatched columns. Expected ${headers.length}, got ${values.length}. Row content: "${rows[i]}"`);
        }
    }
    console.log(`[parseCSV] Successfully parsed ${data.length} data rows.`);
    return data;
};


export default function Home() {
    // --- State ---
    const [employeeId, setEmployeeId] = useState<string>('');
    const [payPeriodStart, setPayPeriodStart] = useState<Date | undefined>(() => {
        const now = new Date();
        return now.getDate() <= 15 ? startOfMonth(now) : setDate(startOfMonth(now), 16);
    });
    const [payPeriodEnd, setPayPeriodEnd] = useState<Date | undefined>(() => {
         const now = new Date();
         if (now.getDate() <= 15) {
            return setDate(startOfMonth(now), 15);
         } else {
            return endOfMonth(now);
         }
    });
    const [calculatedDays, setCalculatedDays] = useState<CalculationResults[]>([]);
    const [editingDayId, setEditingDayId] = useState<string | null>(null); // For editing inputs (date/time)
    const [editingResultsId, setEditingResultsId] = useState<string | null>(null); // For editing calculated hours
    const [editedHours, setEditedHours] = useState<CalculationResults['horasDetalladas'] | null>(null); // Temp state for edited hours
    const [dayToDeleteId, setDayToDeleteId] = useState<string | null>(null);
    const [isLoadingDay, setIsLoadingDay] = useState<boolean>(false); // Loading state for individual day calculation/duplication
    const [isImporting, setIsImporting] = useState<boolean>(false); // Loading state for importing schedule or CSV
    const [errorDay, setErrorDay] = useState<string | null>(null);
    const [isDataLoaded, setIsDataLoaded] = useState<boolean>(false); // Track initial load for current employee/period
    const [savedPayrolls, setSavedPayrolls] = useState<SavedPayrollData[]>([]); // State for the list of all saved payrolls
    const [payrollToDeleteKey, setPayrollToDeleteKey] = useState<string | null>(null); // Key of the saved payroll to delete
    const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false); // State for drag-and-drop visual feedback

    // State for Adjustments
    const [otrosIngresos, setOtrosIngresos] = useState<AdjustmentItem[]>([]);
    const [otrasDeducciones, setOtrasDeducciones] = useState<AdjustmentItem[]>([]);
    const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
    const [isDeductionModalOpen, setIsDeductionModalOpen] = useState(false);
    // State for editing an adjustment (optional)
    // const [editingAdjustment, setEditingAdjustment] = useState<{ type: 'ingreso' | 'deduccion', item: AdjustmentItem } | null>(null);

    // State for Transportation Allowance
    const [incluyeAuxTransporte, setIncluyeAuxTransporte] = useState<boolean>(false);

    // Ref for the hidden file input
    const fileInputRef = useRef<HTMLInputElement>(null);


    const { toast } = useToast();

    // --- Effects for Loading and Saving ---

    // Load ALL saved payrolls on initial mount
    useEffect(() => {
        setSavedPayrolls(loadAllSavedPayrolls());
    }, []);

    // Load current employee/period data from localStorage when employee/period changes
    useEffect(() => {
        if (typeof window !== 'undefined') { // Ensure running on client
            const storageKey = getStorageKey(employeeId, payPeriodStart, payPeriodEnd);
            if (storageKey) {
                console.log(`Intentando cargar datos para la clave: ${storageKey}`);
                const storedData = localStorage.getItem(storageKey);
                // Load transport flag along with other data
                const { days: parsedDays, income: parsedIncome, deductions: parsedDeductions, includeTransport: parsedIncludeTransport } = parseStoredData(storedData);
                setCalculatedDays(parsedDays);
                setOtrosIngresos(parsedIncome); // Load income adjustments
                setOtrasDeducciones(parsedDeductions); // Load deduction adjustments
                setIncluyeAuxTransporte(parsedIncludeTransport); // Load transport allowance flag
                setIsDataLoaded(true); // Mark data as loaded (or attempted)
                 // Only toast if user explicitly selected employee/period
                 if (employeeId && payPeriodStart && payPeriodEnd && !isDataLoaded) { // Show load toast only on first load/manual change
                     toast({
                         title: storedData ? 'Datos Cargados' : 'Datos No Encontrados',
                         description: storedData ? `Se cargaron turnos, ajustes y estado de auxilio para ${employeeId}.` : `No se encontraron datos guardados para ${employeeId} en este período.`,
                         variant: 'default',
                     });
                 }
            } else {
                // Clear days, adjustments, and transport flag if key is invalid
                setCalculatedDays([]);
                setOtrosIngresos([]);
                setOtrasDeducciones([]);
                setIncluyeAuxTransporte(false); // Reset transport flag
                setIsDataLoaded(true); // Still considered 'loaded' (with empty data)
                 if (employeeId || payPeriodStart || payPeriodEnd) { // Only show 'not found' if some info was provided
                    // Optionally clear toast if selection becomes incomplete
                 }
            }
            // Reset editing states when period/employee changes
             setEditingDayId(null);
             setEditingResultsId(null);
             // Close adjustment modals if open
             setIsIncomeModalOpen(false);
             setIsDeductionModalOpen(false);
        }
    }, [employeeId, payPeriodStart, payPeriodEnd, toast, isDataLoaded]); // Removed toast from dependency array if it causes loops

    // Save current employee/period data to localStorage whenever calculatedDays, otrosIngresos, otrasDeducciones, or incluyeAuxTransporte changes (after initial load)
    useEffect(() => {
        if (typeof window !== 'undefined' && isDataLoaded) { // Ensure running on client and after initial load
            const storageKey = getStorageKey(employeeId, payPeriodStart, payPeriodEnd);
             // Save if there's data OR if the transport flag is true (even if other lists are empty)
            if (storageKey && (calculatedDays.length > 0 || otrosIngresos.length > 0 || otrasDeducciones.length > 0 || incluyeAuxTransporte)) {
                try {
                     console.log(`Intentando guardar datos (incluye transporte: ${incluyeAuxTransporte}) en la clave: ${storageKey}`);
                     const dataToSave = {
                         calculatedDays: calculatedDays,
                         otrosIngresosLista: otrosIngresos,
                         otrasDeduccionesLista: otrasDeducciones,
                         incluyeAuxTransporte: incluyeAuxTransporte, // Save the transport flag
                     };
                    localStorage.setItem(storageKey, JSON.stringify(dataToSave));
                     // After saving, refresh the list of saved payrolls
                     setSavedPayrolls(loadAllSavedPayrolls());
                } catch (error) {
                    console.error("Error guardando datos en localStorage:", error);
                    toast({
                        title: 'Error al Guardar',
                        description: 'No se pudieron guardar los cambios localmente.',
                        variant: 'destructive',
                    });
                }
            // Remove from storage only if ALL data is cleared AND transport flag is false
            } else if (storageKey && calculatedDays.length === 0 && otrosIngresos.length === 0 && otrasDeducciones.length === 0 && !incluyeAuxTransporte) {
                // Check if item exists before attempting removal
                if (localStorage.getItem(storageKey)) {
                    localStorage.removeItem(storageKey);
                    console.log(`Clave ${storageKey} eliminada porque no hay datos ni auxilio de transporte activo.`);
                    // Refresh saved list after deletion
                    setSavedPayrolls(loadAllSavedPayrolls());
                }
            }
        }
    }, [calculatedDays, otrosIngresos, otrasDeducciones, incluyeAuxTransporte, employeeId, payPeriodStart, payPeriodEnd, isDataLoaded, toast]); // Add incluyeAuxTransporte to dependencies


  // --- Event Handlers ---

    const handleLoadData = useCallback(() => {
        // This function essentially re-triggers the load useEffect by potentially changing dependencies,
        // or just provides user feedback. The actual loading happens in useEffect.
        if (!employeeId || !payPeriodStart || !payPeriodEnd) {
             toast({
                 title: 'Información Incompleta',
                 description: 'Por favor, ingresa el ID del colaborador y selecciona un período.',
                 variant: 'destructive',
             });
             return;
        }
        // Trigger useEffect reload by setting state again (even if same value)
        // Or simply rely on the existing useEffect which runs on change
        setIsDataLoaded(false); // Force reload state
        // The useEffect listening to employeeId, payPeriodStart, payPeriodEnd will run
         toast({
             title: 'Recargando Datos...',
             description: `Buscando turnos y ajustes para ${employeeId}.`,
         });
          // Force re-trigger loading effect by creating new Date objects
         setEmployeeId(e => e);
         setPayPeriodStart(d => d ? new Date(d.getTime()) : undefined);
         setPayPeriodEnd(d => d ? new Date(d.getTime()) : undefined);

    }, [employeeId, payPeriodStart, payPeriodEnd, toast]);


    // --- Function to check if a date is already calculated ---
    // Moved BEFORE handleImportSchedule
    const isDateCalculated = useCallback((dateToCheck: Date): boolean => {
        return calculatedDays.some(day => isSameDay(day.inputData.startDate, dateToCheck));
    }, [calculatedDays]);


    // --- Function to Import Shifts from Schedule ---
    const handleImportSchedule = useCallback(async () => {
        if (!employeeId || !payPeriodStart || !payPeriodEnd) {
            toast({
                title: 'Información Incompleta',
                description: 'Selecciona colaborador y período antes de importar.',
                variant: 'destructive',
            });
            return;
        }

        setIsImporting(true); // Set loading state

        try {
            if (typeof window !== 'undefined') {
                const savedScheduleRaw = localStorage.getItem(SCHEDULE_DATA_KEY);
                if (!savedScheduleRaw) {
                    throw new Error('No se encontraron datos de horario planificado.');
                }

                const scheduleDataMap = JSON.parse(savedScheduleRaw) as { [dateKey: string]: ScheduleData };

                let importedCount = 0;
                let skippedCount = 0;
                let errorCount = 0;
                const newCalculatedDays: CalculationResults[] = []; // Store results of newly imported days

                // Iterate through dates in the selected pay period
                let currentDate = new Date(payPeriodStart);
                while (currentDate <= payPeriodEnd) {
                    const dateKey = format(currentDate, 'yyyy-MM-dd');
                    const daySchedule = scheduleDataMap[dateKey];

                    // Check if this date is already calculated in the current state
                     if (isDateCalculated(currentDate)) { // Now isDateCalculated is defined
                         skippedCount++;
                         // Move to the next day
                         currentDate = addDays(currentDate, 1);
                         continue; // Skip already calculated dates
                     }


                    if (daySchedule) {
                        // Find the shift for the *current employee* on this date
                        let employeeShift: ShiftAssignment | undefined;
                        for (const deptId in daySchedule.assignments) {
                            const assignment = daySchedule.assignments[deptId].find(a => a.employee.id === employeeId);
                            if (assignment) {
                                employeeShift = assignment;
                                break; // Found the shift for this employee
                            }
                        }

                        if (employeeShift) {
                            // Convert ShiftAssignment to WorkdayFormValues
                            const shiftValues: WorkdayFormValues = {
                                startDate: parseDateFns(dateKey, 'yyyy-MM-dd', new Date()),
                                startTime: employeeShift.startTime,
                                endTime: employeeShift.endTime,
                                // Calculate endsNextDay based on times
                                endsNextDay: parseInt(employeeShift.endTime.split(':')[0]) < parseInt(employeeShift.startTime.split(':')[0]),
                                includeBreak: employeeShift.includeBreak,
                                breakStartTime: employeeShift.breakStartTime,
                                breakEndTime: employeeShift.breakEndTime,
                            };

                            // Calculate this shift
                            const calculationId = `day_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
                            const result = await calculateSingleWorkday(shiftValues, calculationId);

                            if (isCalculationError(result)) {
                                console.error(`Error calculando turno importado para ${dateKey}:`, result.error);
                                errorCount++;
                                toast({
                                    title: `Error Importando Turno (${format(currentDate, 'dd/MM')})`,
                                    description: result.error,
                                    variant: 'destructive',
                                    duration: 5000
                                })
                            } else {
                                newCalculatedDays.push(result); // Add successful calculation
                                importedCount++;
                            }
                        }
                    }

                    // Move to the next day
                    currentDate = addDays(currentDate, 1);
                }

                 // Merge new calculations with existing ones (if any) and sort
                setCalculatedDays(prevDays =>
                    [...prevDays, ...newCalculatedDays].sort((a, b) => a.inputData.startDate.getTime() - b.inputData.startDate.getTime())
                );

                 // Show summary toast
                 let toastDescription = `${importedCount} turno(s) importado(s) y calculado(s).`;
                 if (skippedCount > 0) toastDescription += ` ${skippedCount} día(s) ya calculado(s) omitido(s).`;
                 if (errorCount > 0) toastDescription += ` ${errorCount} error(es) al calcular.`;

                 toast({
                     title: 'Importación de Horario Completa',
                     description: toastDescription,
                     variant: errorCount > 0 ? 'destructive' : 'default',
                     duration: 7000
                 });

            } else {
                throw new Error('Operación solo disponible en el navegador.');
            }
        } catch (error) {
            console.error("Error importando horario:", error);
            toast({
                title: 'Error al Importar',
                description: error instanceof Error ? error.message : 'No se pudo importar el horario planificado.',
                variant: 'destructive',
            });
        } finally {
            setIsImporting(false); // Turn off loading state
        }
    }, [employeeId, payPeriodStart, payPeriodEnd, toast, isDateCalculated, setCalculatedDays]); // Added dependencies


    // --- Function to process CSV File ---
    const processCSVFile = useCallback(async (file: File) => {
        console.log('[processCSVFile] Processing file:', file.name);
        if (!employeeId || !payPeriodStart || !payPeriodEnd) {
            console.warn('[processCSVFile] Missing employeeId or pay period.');
            toast({
                title: 'Información Incompleta',
                description: 'Selecciona colaborador y período antes de importar CSV.',
                variant: 'destructive',
            });
            return;
        }

        setIsImporting(true);

        try {
            const fileContent = await file.text();
            console.log('[processCSVFile] File content read, length:', fileContent.length);
            if (!fileContent.trim()) {
                 console.error('[processCSVFile] File content is empty.');
                 toast({
                     title: 'Archivo CSV Vacío',
                     description: 'El archivo seleccionado está vacío.',
                     variant: 'destructive',
                 });
                 setIsImporting(false);
                 return;
            }

            const parsedData = parseCSV(fileContent);
             console.log(`[processCSVFile] Parsed ${parsedData.length} rows from CSV.`);

            if (parsedData.length === 0) {
                console.error('[processCSVFile] No valid data rows parsed from CSV.');
                toast({
                    title: 'Archivo CSV Vacío o Inválido',
                    description: 'No se encontraron datos válidos en el archivo CSV. Revisa el formato y los encabezados (ID_Empleado, Fecha, Hora_Inicio, Hora_Fin, ...).',
                    variant: 'destructive',
                    duration: 7000,
                });
                setIsImporting(false);
                return;
            }

            let importedCount = 0;
            let skippedCount = 0;
            let errorCount = 0;
            const newCalculatedDays: CalculationResults[] = [];
            let relevantRowsFound = 0;

             console.log(`[processCSVFile] Processing ${parsedData.length} parsed rows for Employee ID: ${employeeId}`);

            for (const [index, row] of parsedData.entries()) {
                console.log(`[processCSVFile] Processing row ${index + 1}:`, row);

                if (!row || !row.ID_Empleado || !row.Fecha || !row.Hora_Inicio || !row.Hora_Fin) {
                    console.warn(`[processCSVFile] Skipping invalid CSV row ${index + 1}: Missing required fields.`, row);
                    errorCount++;
                    continue;
                }

                if (row.ID_Empleado !== employeeId) {
                    skippedCount++;
                    continue;
                }

                let shiftDate: Date;
                try {
                    shiftDate = parseDateFns(row.Fecha, 'yyyy-MM-dd', new Date());
                    if (!isValidDate(shiftDate)) {
                        throw new Error(`Invalid date format: ${row.Fecha}`);
                    }
                    console.log(`[processCSVFile] Row ${index + 1}: Parsed date: ${format(shiftDate, 'yyyy-MM-dd')}`);
                } catch (dateError) {
                    console.error(`[processCSVFile] Error parsing date from CSV for row ${index + 1}:`, row, dateError);
                    errorCount++;
                    toast({
                        title: `Error Fecha CSV Inválida (${row.Fecha || '??'})`,
                        description: 'El formato de la fecha en el CSV no es válido (AAAA-MM-DD).',
                        variant: 'destructive',
                        duration: 5000
                    });
                    continue;
                }

                if (!isWithinInterval(shiftDate, { start: payPeriodStart, end: payPeriodEnd })) {
                     console.log(`[processCSVFile] Skipping row ${index + 1}: Date ${format(shiftDate, 'yyyy-MM-dd')} is outside the selected period.`);
                    skippedCount++;
                    continue;
                }
                 if (isDateCalculated(shiftDate)) {
                    console.log(`[processCSVFile] Skipping row ${index + 1}: Date ${format(shiftDate, 'yyyy-MM-dd')} is already calculated.`);
                    skippedCount++;
                    continue;
                 }

                 relevantRowsFound++;

                const startTimeCleaned = row.Hora_Inicio.trim();
                const endTimeCleaned = row.Hora_Fin.trim();
                 const includesBreakRaw = row.Incluye_Descanso?.trim().toLowerCase();
                 const includeBreakParsed = includesBreakRaw === 'sí' || includesBreakRaw === 'si' || includesBreakRaw === 'true' || includesBreakRaw === '1';
                 const breakStartCleaned = row.Inicio_Descanso?.trim();
                 const breakEndCleaned = row.Fin_Descanso?.trim();

                const shiftValues: WorkdayFormValues = {
                    startDate: shiftDate,
                    startTime: startTimeCleaned,
                    endTime: endTimeCleaned,
                    endsNextDay: parseInt(endTimeCleaned.split(':')[0]) < parseInt(startTimeCleaned.split(':')[0]),
                    includeBreak: includeBreakParsed,
                    breakStartTime: includeBreakParsed ? breakStartCleaned : undefined,
                    breakEndTime: includeBreakParsed ? breakEndCleaned : undefined,
                };
                 console.log(`[processCSVFile] Row ${index + 1}: Prepared shiftValues:`, shiftValues);

                 try {
                    formSchema.parse(shiftValues);
                    console.log(`[processCSVFile] Row ${index + 1}: shiftValues passed Zod validation.`);
                 } catch (validationError) {
                     console.error(`[processCSVFile] Error validating CSV data for ${row.Fecha}:`, validationError);
                     errorCount++;
                     toast({
                         title: `Error Datos CSV Inválidos (${format(shiftDate, 'dd/MM')})`,
                         description: `Los datos del turno en el CSV no son válidos. ${validationError instanceof z.ZodError ? validationError.errors.map(e => e.message).join(', ') : ''}`,
                         variant: 'destructive',
                         duration: 7000
                     });
                     continue;
                 }

                const calculationId = `day_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
                 console.log(`[processCSVFile] Row ${index + 1}: Calling calculateSingleWorkday with ID ${calculationId}`);
                const result = await calculateSingleWorkday(shiftValues, calculationId);

                if (isCalculationError(result)) {
                    console.error(`[processCSVFile] Error calculating imported CSV shift for ${row.Fecha}:`, result.error);
                    errorCount++;
                    toast({
                        title: `Error Importando CSV (${format(shiftDate, 'dd/MM')})`,
                        description: result.error,
                        variant: 'destructive',
                        duration: 5000
                    });
                } else {
                     console.log(`[processCSVFile] Row ${index + 1}: Successfully calculated shift.`);
                    newCalculatedDays.push(result);
                    importedCount++;
                }
            }
             console.log(`[processCSVFile] Finished processing rows. Imported: ${importedCount}, Skipped: ${skippedCount}, Errors: ${errorCount}, Relevant Rows Found: ${relevantRowsFound}`);

            setCalculatedDays(prevDays =>
                [...prevDays, ...newCalculatedDays].sort((a, b) => a.inputData.startDate.getTime() - b.inputData.startDate.getTime())
             );

            let toastDescription = `${importedCount} turno(s) importado(s) de CSV y calculado(s) para ${employeeId}.`;
             if (skippedCount > 0) toastDescription += ` ${skippedCount} día(s) omitido(s) (otro colab., fuera de período o ya calculado).`;
             if (errorCount > 0) toastDescription += ` ${errorCount} error(es) al procesar CSV.`;
             if (relevantRowsFound === 0 && importedCount === 0 && errorCount === 0) {
                 toastDescription = `No se encontraron turnos en el CSV para ${employeeId} dentro del período seleccionado.`;
             }

            toast({
                title: 'Importación de CSV Completa',
                description: toastDescription,
                variant: errorCount > 0 ? 'destructive' : (importedCount === 0 && relevantRowsFound > 0 ? 'default' : (importedCount > 0 ? 'default' : 'destructive')),
                duration: 7000
            });

        } catch (error) {
            console.error("[processCSVFile] General error during CSV processing:", error);
            toast({
                title: 'Error al Procesar CSV',
                description: error instanceof Error ? error.message : 'No se pudo procesar el archivo CSV.',
                variant: 'destructive',
            });
        } finally {
             console.log('[processCSVFile] Import process finished.');
            setIsImporting(false);
             // Reset file input only if it exists
             if (fileInputRef.current) {
                 fileInputRef.current.value = '';
                 console.log('[processCSVFile] File input reset.');
             }
        }
    }, [employeeId, payPeriodStart, payPeriodEnd, toast, isDateCalculated, setCalculatedDays, formSchema]);


     // --- Function to Import from CSV (using hidden input) ---
     const handleImportCSV = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            processCSVFile(file);
        }
     }, [processCSVFile]);

    // Trigger file input click
    const triggerFileInput = () => {
         if (!employeeId || !payPeriodStart || !payPeriodEnd) {
             toast({
                 title: 'Información Incompleta',
                 description: 'Selecciona colaborador y período antes de importar CSV.',
                 variant: 'destructive',
             });
             return;
         }
         fileInputRef.current?.click();
    };

     // --- Drag and Drop Handlers ---
     const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDraggingOver(true); // Indicate visually that drop is possible
     }, []);

     const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDraggingOver(false);
     }, []);

     const handleDrop = useCallback(async (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDraggingOver(false);

        if (!employeeId || !payPeriodStart || !payPeriodEnd) {
            toast({
                title: 'Información Incompleta',
                description: 'Selecciona colaborador y período antes de importar CSV por arrastre.',
                variant: 'destructive',
            });
            return;
        }

        const files = event.dataTransfer.files;
        if (files && files.length > 0) {
            const file = files[0];
            if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
                processCSVFile(file); // Use the existing processing function
            } else {
                toast({
                    title: 'Archivo Inválido',
                    description: 'Por favor, arrastra un archivo CSV válido.',
                    variant: 'destructive',
                });
            }
        }
     }, [employeeId, payPeriodStart, payPeriodEnd, processCSVFile, toast]);



    const handleClearPeriodData = () => {
         const storageKey = getStorageKey(employeeId, payPeriodStart, payPeriodEnd);
         if (storageKey && typeof window !== 'undefined') {
            localStorage.removeItem(storageKey);
         }
         setCalculatedDays([]); // Clear state immediately
         setOtrosIngresos([]); // Clear adjustments
         setOtrasDeducciones([]);
         setIncluyeAuxTransporte(false); // Reset transport flag
         setEditingDayId(null);
         setEditingResultsId(null);
         setEditedHours(null);
         setSavedPayrolls(loadAllSavedPayrolls()); // Refresh saved list
         toast({
            title: 'Datos del Período Eliminados',
            description: `Se han borrado los turnos, ajustes y estado de auxilio de transporte guardados localmente para ${employeeId} en este período.`,
            variant: 'destructive',
         });
    };


    // Function to handle adding or updating a day's calculation (from WorkdayForm)
    const handleDayCalculationComplete = (data: CalculationResults | CalculationError) => {
        setIsLoadingDay(false);
        if (isCalculationError(data)) {
            // Updated error message handling to show more specific errors if available
            const errorMessage = data.error?.includes(":") // Check if it likely contains an ID prefix
                ? data.error // Show specific ID error
                : `Error inesperado: ${data.error || 'Detalle no disponible.'}`;
            setErrorDay(errorMessage);
            toast({
                title: 'Error en el Cálculo', // Updated title
                description: errorMessage, // Always show the error message received
                variant: 'destructive',
            });
        } else {
             // Validate if the calculated day's date falls within the selected pay period
             if (!payPeriodStart || !payPeriodEnd || data.inputData.startDate < payPeriodStart || data.inputData.startDate > payPeriodEnd) {
                setErrorDay(`La fecha del turno (${format(data.inputData.startDate, 'PPP', { locale: es })}) está fuera del período seleccionado.`);
                toast({
                    title: 'Fecha Fuera de Período',
                    description: `El turno del ${format(data.inputData.startDate, 'PPP', { locale: es })} no pertenece al período quincenal seleccionado (${format(payPeriodStart!, 'dd/MM')} - ${format(payPeriodEnd!, 'dd/MM/yyyy')}). No se agregó.`,
                    variant: 'destructive',
                    duration: 5000,
                });
                // Do not add or update if outside the period
                setEditingDayId(null); // Still clear editing state
                return; // Stop processing
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
                // Sort days after adding/updating
                return updatedDays.sort((a, b) => a.inputData.startDate.getTime() - b.inputData.startDate.getTime());
            });
            setEditingDayId(null); // Clear input editing state
            toast({
                title: `Turno ${editingDayId ? 'Actualizado' : 'Agregado'}`,
                description: `Turno para ${format(data.inputData.startDate, 'PPP', { locale: es })} ${editingDayId ? 'actualizado en la quincena.' : 'agregado a la quincena.'}`,
            });
        }
    };


  const handleDayCalculationStart = () => {
    setIsLoadingDay(true);
    setErrorDay(null);
  };

  // Function to initiate editing a day's inputs (date/time) via WorkdayForm
  const handleEditDay = (id: string) => {
    setEditingResultsId(null); // Cancel results editing if active
    setEditedHours(null);
    setEditingDayId(id);
  };

   // Function to initiate editing a day's calculated results
   const handleEditResults = (id: string) => {
     const dayToEdit = calculatedDays.find(day => day.id === id);
     if (dayToEdit) {
       setEditingDayId(null); // Cancel input editing if active
       setEditingResultsId(id);
       setEditedHours({ ...dayToEdit.horasDetalladas }); // Clone hours for editing
     }
   };

   // Function to handle changes in the edited hour input fields
   const handleHourChange = (e: ChangeEvent<HTMLInputElement>, key: keyof CalculationResults['horasDetalladas']) => {
     const value = e.target.value;
     // Allow empty string or valid numbers (including decimals)
     if (value === '' || /^\d*\.?\d*$/.test(value)) {
        setEditedHours(prev => {
            if (!prev) return null;
            // Use parseFloat for calculation, but keep as string for input potentially
            // Or convert directly to number
            const numericValue = value === '' ? 0 : parseFloat(value);
            return {
                ...prev,
                [key]: isNaN(numericValue) ? 0 : numericValue // Store as number, handle NaN
            };
        });
     }
   };


   // Function to save edited results
    const handleSaveResults = () => {
        if (!editingResultsId || !editedHours) return;

        setCalculatedDays(prevDays => {
            const index = prevDays.findIndex(day => day.id === editingResultsId);
            if (index === -1) return prevDays; // Should not happen

            const updatedDays = [...prevDays];
            const originalDay = updatedDays[index];

            // Recalculate payments based on edited hours
            let newPagoTotalRecargosExtras = 0;
            const newPagoDetallado: CalculationResults['pagoDetallado'] = { ...originalDay.pagoDetallado }; // Start with original structure

            let newTotalHorasTrabajadas = 0;

            for (const key in editedHours) {
                const category = key as keyof CalculationResults['horasDetalladas'];
                const hours = editedHours[category];
                newTotalHorasTrabajadas += hours; // Sum up edited hours

                if (category !== "Ordinaria_Diurna_Base") { // Base hours don't contribute to extra payment
                    const valorHora = VALORES[category] ?? 0;
                    const pagoCategoria = hours * valorHora;
                    newPagoDetallado[category] = pagoCategoria;
                    newPagoTotalRecargosExtras += pagoCategoria;
                } else {
                    // Ensure Ordinaria_Diurna_Base payment is 0 in the detail, even if hours exist
                    newPagoDetallado[category] = 0;
                }
            }


            // Update the day with the new calculated values based on edited hours
            updatedDays[index] = {
                ...originalDay,
                horasDetalladas: editedHours, // Use the edited hours
                pagoDetallado: newPagoDetallado,
                pagoTotalRecargosExtras: newPagoTotalRecargosExtras,
                pagoTotalConSalario: newPagoTotalRecargosExtras, // Only includes extras for the day
                duracionTotalTrabajadaHoras: newTotalHorasTrabajadas, // Update total hours based on edited values
            };

            return updatedDays.sort((a, b) => a.inputData.startDate.getTime() - b.inputData.startDate.getTime()); // Re-sort after update
        });

        toast({
            title: 'Detalles Actualizados',
            description: `Las horas para el turno han sido modificadas manualmente.`,
        });

        // Exit editing mode
        setEditingResultsId(null);
        setEditedHours(null);
    };


  // Function to cancel editing results
  const handleCancelResults = () => {
    setEditingResultsId(null);
    setEditedHours(null);
  };

  // Function to prepare for deletion
   const confirmDeleteDay = (id: string) => {
     setDayToDeleteId(id);
     // Open the confirmation dialog (AlertDialogTrigger should handle this)
   };

  // Function to actually delete the day after confirmation
   const handleDeleteDay = () => {
     if (!dayToDeleteId) return;
     setCalculatedDays((prevDays) => prevDays.filter((day) => day.id !== dayToDeleteId));
     toast({
       title: 'Día Eliminado',
       description: 'El cálculo del día ha sido eliminado de la quincena.',
       variant: 'destructive',
     });
     setDayToDeleteId(null); // Close the dialog
     // Ensure editing states are also cleared if the deleted day was being edited
     if (editingDayId === dayToDeleteId) setEditingDayId(null);
     if (editingResultsId === dayToDeleteId) {
        setEditingResultsId(null);
        setEditedHours(null);
     }
   };

   // --- Adjustment Handlers ---
   const handleAddIngreso = (data: Omit<AdjustmentItem, 'id'>) => {
        const newItem: AdjustmentItem = {
            ...data,
            id: `ingreso_${Date.now()}`, // Simple unique ID
        };
        setOtrosIngresos(prev => [...prev, newItem]);
        toast({ title: 'Ingreso Agregado', description: `${data.descripcion || 'Ingreso'}: ${formatCurrency(data.monto)}` });
   };

   const handleAddDeduccion = (data: Omit<AdjustmentItem, 'id'>) => {
         const newItem: AdjustmentItem = {
             ...data,
             id: `deduccion_${Date.now()}`, // Simple unique ID
         };
         setOtrasDeducciones(prev => [...prev, newItem]);
         toast({ title: 'Deducción Agregada', description: `${data.descripcion || 'Deducción'}: ${formatCurrency(data.monto)}`, variant: 'default' }); // Use default variant
   };

   const handleDeleteIngreso = (id: string) => {
        setOtrosIngresos(prev => prev.filter(item => item.id !== id));
        toast({ title: 'Ingreso Eliminado', variant: 'destructive' });
   };

   const handleDeleteDeduccion = (id: string) => {
        setOtrasDeducciones(prev => prev.filter(item => item.id !== id));
        toast({ title: 'Deducción Eliminada', variant: 'destructive' });
   };

    // --- Transportation Allowance Handler ---
    const handleToggleTransporte = () => {
        setIncluyeAuxTransporte(prev => !prev);
        toast({
            title: `Auxilio de Transporte ${!incluyeAuxTransporte ? 'Activado' : 'Desactivado'}`,
            description: !incluyeAuxTransporte
                         ? `Se sumará ${formatCurrency(AUXILIO_TRANSPORTE_VALOR)} al total devengado.`
                         : 'El auxilio de transporte no se incluirá en el cálculo.',
        });
    };


  // Memoized calculation for the quincenal summary using the utility function
  const quincenalSummary = useMemo(() => {
       // Only calculate if there are days to summarize, even if transport is on
        if (calculatedDays.length === 0 && !incluyeAuxTransporte && otrosIngresos.length === 0 && otrasDeducciones.length === 0) return null;
        // Calculate base summary from days, potentially null if no days
       const baseSummary = calculateQuincenalSummary(calculatedDays, SALARIO_BASE_QUINCENAL_FIJO);

        // Create a structure even if baseSummary is null, to handle adjustments/transport
       const finalSummary: QuincenalCalculationSummary = baseSummary || {
           totalHorasDetalladas: { Ordinaria_Diurna_Base: 0, Recargo_Noct_Base: 0, Recargo_Dom_Diurno_Base: 0, Recargo_Dom_Noct_Base: 0, HED: 0, HEN: 0, HEDD_F: 0, HEND_F: 0 },
           totalPagoDetallado: { Ordinaria_Diurna_Base: 0, Recargo_Noct_Base: 0, Recargo_Dom_Diurno_Base: 0, Recargo_Dom_Noct_Base: 0, HED: 0, HEN: 0, HEDD_F: 0, HEND_F: 0 },
           totalPagoRecargosExtrasQuincena: 0,
           salarioBaseQuincenal: SALARIO_BASE_QUINCENAL_FIJO,
           pagoTotalConSalarioQuincena: SALARIO_BASE_QUINCENAL_FIJO, // Start with base
           totalDuracionTrabajadaHorasQuincena: 0,
           diasCalculados: 0,
       };

       // Add extras if they exist (from baseSummary)
       if (baseSummary) {
          finalSummary.pagoTotalConSalarioQuincena = baseSummary.pagoTotalConSalarioQuincena; // Base + Extras
       }


       // Conditionally add transport allowance to the final displayed 'Devengado Bruto'
       // IMPORTANT: This happens *after* the initial summary calculation which might be used for IBC base.
       // We will adjust the displayed bruto, but IBC calculation in ResultsDisplay needs care.
       // Let's pass the separate auxTransporteAplicado value to ResultsDisplay.
       const auxTransporteAplicado = incluyeAuxTransporte ? AUXILIO_TRANSPORTE_VALOR : 0;

       // Add other income to the 'devengado bruto' concept
       const totalOtrosIngresos = otrosIngresos.reduce((sum, item) => sum + item.monto, 0);

       // Update the final 'total Devengado Bruto' shown in the summary - this is BEFORE deductions
       // finalSummary.pagoTotalConSalarioQuincena += auxTransporteAplicado + totalOtrosIngresos;
       // Let's keep pagoTotalConSalarioQuincena as Base + Extras for potential IBC use,
       // and calculate the displayed total devengado in ResultsDisplay

       return finalSummary; // Return the summary (potentially just base salary if no days)

  }, [calculatedDays, incluyeAuxTransporte, otrosIngresos]); // Update when transport or income changes


  // Find the data for the day being edited (for WorkdayForm)
  const editingDayData = useMemo(() => {
    if (!editingDayId) return undefined;
    return calculatedDays.find(day => day.id === editingDayId)?.inputData;
  }, [editingDayId, calculatedDays]);

  // Function to handle "Duplicar Turno Sig. Día"
  const handleDuplicateToNextDay = useCallback(async () => {
    const lastDay = calculatedDays.length > 0 ? calculatedDays[calculatedDays.length - 1] : null;
    if (!lastDay || !payPeriodStart || !payPeriodEnd) {
        toast({
            title: 'No se puede duplicar',
            description: calculatedDays.length === 0 ? 'Agrega al menos un turno primero.' : 'Selecciona un período válido.',
            variant: 'destructive',
        });
        return;
    }

    handleDayCalculationStart(); // Set loading state

    const nextDayDate = addDays(lastDay.inputData.startDate, 1);

    // Check if the next day is within the current pay period
    if (nextDayDate > payPeriodEnd) {
        setIsLoadingDay(false); // Stop loading
        toast({
            title: 'Fecha Fuera de Período',
            description: `El siguiente día (${format(nextDayDate, 'PPP', { locale: es })}) está fuera del período quincenal seleccionado. No se puede duplicar.`,
            variant: 'destructive',
            duration: 5000,
        });
        return;
    }

    // Create the input data for the next day
    const nextDayValues: WorkdayFormValues = {
        ...lastDay.inputData,
        startDate: nextDayDate,
        // Reset 'endsNextDay' based on the new date and original times (calculateSingleWorkday will handle it correctly)
        // The calculation logic itself will determine if the duplicated shift crosses midnight *relative to its new start date*
        // We don't need to explicitly set endsNextDay here, the existing logic handles it.
    };

    // Generate a unique ID for the new duplicated day
    const newDayId = `day_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    try {
        // Calculate the duplicated day
        const result = await calculateSingleWorkday(nextDayValues, newDayId);
        handleDayCalculationComplete(result); // Use the existing completion handler
        if (!isCalculationError(result)) {
             toast({
                title: 'Turno Duplicado',
                description: `Se duplicó el último turno para el ${format(nextDayDate, 'PPP', { locale: es })}.`,
             });
        }
    } catch (error) {
        console.error("Error duplicando el turno:", error);
        const errorMessage = error instanceof Error && error.message ? error.message : "Hubo un error al duplicar el turno.";
        handleDayCalculationComplete({ error: errorMessage }); // Use existing error handling
    } finally {
        // Ensure loading state is turned off even if handled in handleDayCalculationComplete
        setIsLoadingDay(false);
    }
}, [calculatedDays, payPeriodStart, payPeriodEnd, toast, handleDayCalculationStart, handleDayCalculationComplete]);


  // Determine if form or summary should be disabled
  const isFormDisabled = !employeeId || !payPeriodStart || !payPeriodEnd;
  // Determine if summary section should be visible
  const showSummary = quincenalSummary !== null || otrosIngresos.length > 0 || otrasDeducciones.length > 0 || incluyeAuxTransporte;


  // --- PDF Export Handler ---
  const handleExportPDF = () => {
      const currentSummary = quincenalSummary; // Capture current state
     if (!currentSummary || !employeeId || !payPeriodStart || !payPeriodEnd) {
         toast({
             title: 'Datos Incompletos para Exportar',
             description: 'Asegúrate de tener un colaborador, período, cálculo quincenal y ajustes completados.',
             variant: 'destructive',
         });
         return;
     }
     try {
          const auxTransporteAplicado = incluyeAuxTransporte ? AUXILIO_TRANSPORTE_VALOR : 0;
         // Pass adjustments and transport flag/value to the export function
        exportPayrollToPDF(
            currentSummary,
            employeeId,
            payPeriodStart,
            payPeriodEnd,
            otrosIngresos, // Pass income list
            otrasDeducciones, // Pass deduction list
            auxTransporteAplicado // Pass the applied transport allowance value
        );
        toast({
            title: 'PDF Exportado',
            description: `Comprobante de nómina para ${employeeId} generado.`,
        });
     } catch (error) {
        console.error("Error exportando PDF:", error);
         toast({
             title: 'Error al Exportar PDF',
             description: 'No se pudo generar el archivo PDF.',
             variant: 'destructive',
         });
     }
  };

  // --- Bulk PDF Export Handler ---
  const handleBulkExportPDF = () => {
    const allPayrollDataToExport: SavedPayrollData[] = loadAllSavedPayrolls();

    if (allPayrollDataToExport.length === 0) {
        toast({
            title: 'No Hay Datos para Exportar',
            description: 'No se encontraron nóminas calculadas guardadas en el almacenamiento local.',
            variant: 'default',
        });
        return;
    }

    try {
        // Pass the full SavedPayrollData array which now includes adjustments and transport flag
        exportAllPayrollsToPDF(allPayrollDataToExport);
        toast({
            title: 'Exportación Masiva Completa',
            description: `Se generó un PDF con ${allPayrollDataToExport.length} comprobantes de nómina.`,
        });
    } catch (error) {
        console.error("Error durante la exportación masiva de PDF:", error);
        toast({
            title: 'Error en Exportación Masiva',
            description: 'Ocurrió un error al intentar generar el PDF combinado.',
            variant: 'destructive',
        });
    }
  };

   // --- Bulk CSV Export Handler ---
    const handleBulkExportCSV = () => {
        const allPayrollDataToExport: SavedPayrollData[] = loadAllSavedPayrolls();

        if (allPayrollDataToExport.length === 0) {
            toast({
                title: 'No Hay Datos para Exportar a CSV',
                description: 'No se encontraron nóminas calculadas guardadas.',
                variant: 'default',
            });
            return;
        }

        try {
             const csvRows: string[][] = [];
             // Headers
             csvRows.push([
                'ID Colaborador',
                'Período Inicio',
                'Período Fin',
                'Salario Base',
                ...displayOrder.map(key => `Horas: ${abbreviatedLabelMap[key]}`), // Hour details
                'Total Horas',
                'Total Recargos/Extras',
                'Aux. Transporte',
                'Otros Ingresos',
                'Total Devengado Bruto',
                'Ded. Salud (4%)',
                'Ded. Pensión (4%)',
                'Otras Deducciones',
                'Neto a Pagar'
             ]);

             // Data Rows
             allPayrollDataToExport.forEach(payroll => {
                 const auxTransporteAplicado = payroll.incluyeAuxTransporte ? AUXILIO_TRANSPORTE_VALOR : 0;
                 const totalOtrosIngresos = (payroll.otrosIngresosLista || []).reduce((sum, item) => sum + item.monto, 0);
                 const totalOtrasDeducciones = (payroll.otrasDeduccionesLista || []).reduce((sum, item) => sum + item.monto, 0);
                 const baseMasExtras = payroll.summary.pagoTotalConSalarioQuincena;
                 const totalDevengadoBruto = baseMasExtras + auxTransporteAplicado + totalOtrosIngresos;
                 const ibcEstimadoQuincenal = baseMasExtras + totalOtrosIngresos;
                 const deduccionSaludQuincenal = ibcEstimadoQuincenal * 0.04;
                 const deduccionPensionQuincenal = ibcEstimadoQuincenal * 0.04;
                 const totalDeduccionesLegales = deduccionSaludQuincenal + deduccionPensionQuincenal;
                 const subtotalNetoParcial = totalDevengadoBruto - totalDeduccionesLegales;
                 const netoAPagar = subtotalNetoParcial - totalOtrasDeducciones;

                 const hourValues = displayOrder.map(key => formatHours(payroll.summary.totalHorasDetalladas[key]));

                 csvRows.push([
                    payroll.employeeId,
                    format(payroll.periodStart, 'yyyy-MM-dd'),
                    format(payroll.periodEnd, 'yyyy-MM-dd'),
                    payroll.summary.salarioBaseQuincenal.toFixed(0), // No decimals for currency
                    ...hourValues,
                    formatHours(payroll.summary.totalDuracionTrabajadaHorasQuincena),
                    payroll.summary.totalPagoRecargosExtrasQuincena.toFixed(0),
                    auxTransporteAplicado.toFixed(0),
                    totalOtrosIngresos.toFixed(0),
                    totalDevengadoBruto.toFixed(0),
                    deduccionSaludQuincenal.toFixed(0),
                    deduccionPensionQuincenal.toFixed(0),
                    totalOtrasDeducciones.toFixed(0),
                    netoAPagar.toFixed(0)
                 ]);
             });

            // Generate CSV content
            const csvContent = "data:text/csv;charset=utf-8,"
                + csvRows.map(row =>
                     row.map(field => `"${String(field ?? '').replace(/"/g, '""')}"`).join(",") // Quote fields
                 ).join("\n");

            // Trigger download
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
            link.setAttribute("download", `Reporte_Nominas_Completo_${timestamp}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

             toast({
                 title: 'Exportación CSV Completa',
                 description: `Se generó un CSV con ${allPayrollDataToExport.length} registros de nómina.`,
             });

        } catch (error) {
            console.error("Error durante la exportación masiva de CSV:", error);
            toast({
                title: 'Error en Exportación CSV',
                description: 'Ocurrió un error al intentar generar el archivo CSV.',
                variant: 'destructive',
            });
        }
    };

   // --- Export Single Payroll to CSV Handler ---
   const handleExportSingleCSV = (payrollKey: string) => {
       const payrollToExport = savedPayrolls.find(p => p.key === payrollKey);
       if (!payrollToExport) {
           toast({
               title: 'Nómina No Encontrada',
               description: 'No se pudo encontrar la nómina seleccionada para exportar a CSV.',
               variant: 'destructive',
           });
           return;
       }

       try {
            const csvRows: string[][] = [];
            // Headers
            csvRows.push([
               'ID Colaborador',
               'Período Inicio',
               'Período Fin',
               'Salario Base',
               ...displayOrder.map(key => `Horas: ${abbreviatedLabelMap[key]}`),
               'Total Horas',
               'Total Recargos/Extras',
               'Aux. Transporte',
               'Otros Ingresos',
               'Total Devengado Bruto',
               'Ded. Salud (4%)',
               'Ded. Pensión (4%)',
               'Otras Deducciones',
               'Neto a Pagar'
            ]);

            // Data Row
            const auxTransporteAplicado = payrollToExport.incluyeAuxTransporte ? AUXILIO_TRANSPORTE_VALOR : 0;
            const totalOtrosIngresos = (payrollToExport.otrosIngresosLista || []).reduce((sum, item) => sum + item.monto, 0);
            const totalOtrasDeducciones = (payrollToExport.otrasDeduccionesLista || []).reduce((sum, item) => sum + item.monto, 0);
            const baseMasExtras = payrollToExport.summary.pagoTotalConSalarioQuincena;
            const totalDevengadoBruto = baseMasExtras + auxTransporteAplicado + totalOtrosIngresos;
            const ibcEstimadoQuincenal = baseMasExtras + totalOtrosIngresos;
            const deduccionSaludQuincenal = ibcEstimadoQuincenal * 0.04;
            const deduccionPensionQuincenal = ibcEstimadoQuincenal * 0.04;
            const totalDeduccionesLegales = deduccionSaludQuincenal + deduccionPensionQuincenal;
            const subtotalNetoParcial = totalDevengadoBruto - totalDeduccionesLegales;
            const netoAPagar = subtotalNetoParcial - totalOtrasDeducciones;
            const hourValues = displayOrder.map(key => formatHours(payrollToExport.summary.totalHorasDetalladas[key]));

            csvRows.push([
               payrollToExport.employeeId,
               format(payrollToExport.periodStart, 'yyyy-MM-dd'),
               format(payrollToExport.periodEnd, 'yyyy-MM-dd'),
               payrollToExport.summary.salarioBaseQuincenal.toFixed(0),
               ...hourValues,
               formatHours(payrollToExport.summary.totalDuracionTrabajadaHorasQuincena),
               payrollToExport.summary.totalPagoRecargosExtrasQuincena.toFixed(0),
               auxTransporteAplicado.toFixed(0),
               totalOtrosIngresos.toFixed(0),
               totalDevengadoBruto.toFixed(0),
               deduccionSaludQuincenal.toFixed(0),
               deduccionPensionQuincenal.toFixed(0),
               totalOtrasDeducciones.toFixed(0),
               netoAPagar.toFixed(0)
            ]);

            // Generate CSV content
            const csvContent = "data:text/csv;charset=utf-8,"
               + csvRows.map(row =>
                    row.map(field => `"${String(field ?? '').replace(/"/g, '""')}"`).join(",")
                ).join("\n");

            // Trigger download
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            const filename = `Nomina_${payrollToExport.employeeId}_${format(payrollToExport.periodStart, 'yyyyMMdd')}-${format(payrollToExport.periodEnd, 'yyyyMMdd')}.csv`;
            link.setAttribute("download", filename);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast({
                title: 'Exportación CSV Exitosa',
                description: `Se generó el CSV para ${payrollToExport.employeeId}.`,
            });

       } catch (error) {
           console.error("Error exportando nómina individual a CSV:", error);
           toast({
               title: 'Error en Exportación CSV',
               description: 'Ocurrió un error al intentar generar el archivo CSV.',
               variant: 'destructive',
           });
       }
   };



   // --- Load Saved Payroll Handler ---
   const handleLoadSavedPayroll = (payrollKey: string) => {
     const payrollToLoad = savedPayrolls.find(p => p.key === payrollKey);
     if (!payrollToLoad || typeof window === 'undefined') return;

     // Set the employee ID and period from the loaded payroll
     setEmployeeId(payrollToLoad.employeeId);
     setPayPeriodStart(payrollToLoad.periodStart);
     setPayPeriodEnd(payrollToLoad.periodEnd);
     // Adjustment lists and transport flag will be loaded by the useEffect hook triggered by the above state changes

     // The useEffect for loading data will automatically trigger and load the days, adjustments, and transport flag
     setIsDataLoaded(false); // Ensure the effect runs

     toast({
        title: 'Nómina Cargada',
        description: `Se cargaron los datos de ${payrollToLoad.employeeId} para el período ${format(payrollToLoad.periodStart, 'dd/MM/yy')} - ${format(payrollToLoad.periodEnd, 'dd/MM/yy')}.`,
     });
   };

   // --- Delete Saved Payroll Handler ---
    const handleDeleteSavedPayroll = () => {
      if (!payrollToDeleteKey || typeof window === 'undefined') return;

      try {
         const payrollInfo = savedPayrolls.find(p => p.key === payrollToDeleteKey);
         localStorage.removeItem(payrollToDeleteKey);
         // Update state immediately to reflect deletion in UI
         setSavedPayrolls(prevPayrolls => prevPayrolls.filter(p => p.key !== payrollToDeleteKey));
         setPayrollToDeleteKey(null); // Close dialog
         toast({
             title: 'Nómina Guardada Eliminada',
             description: payrollInfo
                          ? `La nómina de ${payrollInfo.employeeId} (${format(payrollInfo.periodStart, 'dd/MM/yy')}) fue eliminada.`
                          : 'La nómina seleccionada fue eliminada.',
             variant: 'destructive',
         });
         // If the deleted payroll was the one currently loaded, clear the form/results
         const currentKey = getStorageKey(employeeId, payPeriodStart, payPeriodEnd);
         if (currentKey === payrollToDeleteKey) {
             setCalculatedDays([]);
             setOtrosIngresos([]); // Clear adjustments too
             setOtrasDeducciones([]);
             setIncluyeAuxTransporte(false); // Reset transport flag
             setEmployeeId(''); // Optionally clear selection
             setPayPeriodStart(undefined);
             setPayPeriodEnd(undefined);
         }

      } catch (error) {
          console.error("Error deleting saved payroll from localStorage:", error);
          toast({
              title: 'Error al Eliminar',
              description: 'No se pudo eliminar la nómina guardada.',
              variant: 'destructive',
          });
          setPayrollToDeleteKey(null); // Still close dialog
      }
    };





  return (
    <main
        className="container mx-auto p-4 md:p-8 max-w-7xl"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
    >
       <div className={cn(
            "absolute inset-0 z-10 bg-primary/10 border-2 border-dashed border-primary rounded-lg flex items-center justify-center text-primary font-semibold transition-opacity",
            isDraggingOver ? "opacity-100" : "opacity-0 pointer-events-none"
       )}>
         <FileUp className="mr-2 h-6 w-6" /> Suelta el archivo CSV aquí
       </div>

      <h1 className="text-3xl font-bold text-center mb-8 text-foreground">Calculadora de Nómina Quincenal</h1>

      {/* Section for Employee ID and Pay Period Selection */}
      <Card className="mb-8 shadow-lg bg-card">
          <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-foreground"> {/* Reduced size */}
                  <User className="h-5 w-5" /> Selección de Colaborador y Período
              </CardTitle>
              <CardDescription>
                  Ingresa el ID del colaborador y selecciona el período quincenal para cargar/guardar los turnos y calcular la nómina.
              </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              {/* Employee ID Input */}
              <div className="space-y-2">
                  <Label htmlFor="employeeId" className="text-foreground">ID Colaborador</Label>
                  <Input
                      id="employeeId"
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      placeholder="Ej: 12345678"
                  />
              </div>

              {/* Pay Period Start Date */}
              <div className="space-y-2">
                  <Label className="text-foreground">Inicio Período</Label>
                  <Popover>
                      <PopoverTrigger asChild>
                          <Button
                              variant={'outline'}
                              className={cn(
                                  'w-full justify-start text-left font-normal',
                                  !payPeriodStart && 'text-muted-foreground'
                              )}
                          >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {payPeriodStart ? format(payPeriodStart, 'PPP', { locale: es }) : <span>Selecciona fecha</span>}
                          </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                          <Calendar
                              mode="single"
                              selected={payPeriodStart}
                              onSelect={setPayPeriodStart}
                              initialFocus
                              locale={es}
                          />
                      </PopoverContent>
                  </Popover>
              </div>

              {/* Pay Period End Date */}
              <div className="space-y-2">
                  <Label className="text-foreground">Fin Período</Label>
                   <Popover>
                      <PopoverTrigger asChild>
                          <Button
                              variant={'outline'}
                              className={cn(
                                  'w-full justify-start text-left font-normal',
                                  !payPeriodEnd && 'text-muted-foreground'
                              )}
                          >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {payPeriodEnd ? format(payPeriodEnd, 'PPP', { locale: es }) : <span>Selecciona fecha</span>}
                          </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                          <Calendar
                              mode="single"
                              selected={payPeriodEnd}
                              onSelect={setPayPeriodEnd}
                              initialFocus
                              locale={es}
                              disabled={(date) => payPeriodStart ? date < payPeriodStart : false} // Disable dates before start date
                          />
                      </PopoverContent>
                  </Popover>
              </div>

                {/* Action Buttons for Load/Clear */}
                <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-4"> {/* Changed to 4 columns */}
                    {/* Hidden File Input */}
                   <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImportCSV}
                        accept=".csv"
                        className="hidden"
                    />
                   {/* Import CSV Button */}
                   <Button
                     onClick={triggerFileInput} // Call function to trigger click
                     className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" // Use theme color
                     disabled={isFormDisabled || isImporting}>
                        {isImporting ? (
                             <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                             <FileUp className="mr-2 h-4 w-4" />
                        )}
                        Importar CSV
                   </Button>

                   {/* Import Schedule Button */}
                   <Button
                        onClick={handleImportSchedule}
                        variant="outline"
                        className="w-full hover:bg-accent hover:text-accent-foreground"
                        disabled={isFormDisabled || isImporting}
                    >
                        {isImporting ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <FileUp className="mr-2 h-4 w-4" />
                        )}
                        Importar Horario Planificado
                   </Button>

                   <AlertDialog>
                        <AlertDialogTrigger asChild>
                             {/* Disable clear if form disabled OR if all data is already clear */}
                             <Button variant="outline" className="w-full hover:bg-destructive hover:text-destructive-foreground" disabled={isFormDisabled || (calculatedDays.length === 0 && otrosIngresos.length === 0 && otrasDeducciones.length === 0 && !incluyeAuxTransporte) }>
                                <Eraser className="mr-2 h-4 w-4" /> Limpiar Período Actual
                            </Button>
                        </AlertDialogTrigger>
                       <AlertDialogContent>
                         <AlertDialogHeader>
                           <AlertDialogTitle>¿Limpiar Datos del Período?</AlertDialogTitle>
                           <AlertDialogDescription>
                              Esta acción eliminará todos los turnos y ajustes (incluido el estado de aux. transporte) guardados localmente para <strong>{employeeId || 'el colaborador seleccionado'}</strong> en el período del{' '}
                              <strong>{payPeriodStart ? format(payPeriodStart, 'dd/MM/yy', {locale: es}) : '?'}</strong> al{' '}
                              <strong>{payPeriodEnd ? format(payPeriodEnd, 'dd/MM/yy', {locale: es}) : '?'}</strong>. Esta acción no se puede deshacer.
                           </AlertDialogDescription>
                         </AlertDialogHeader>
                         <AlertDialogFooter>
                           <AlertDialogCancel>Cancelar</AlertDialogCancel>
                           <AlertDialogAction onClick={handleClearPeriodData} className="bg-destructive hover:bg-destructive/90">
                              Limpiar Datos
                           </AlertDialogAction>
                         </AlertDialogFooter>
                       </AlertDialogContent>
                   </AlertDialog>
                   {/* Bulk Export CSV Button */}
                    <Button onClick={handleBulkExportCSV} variant="outline" className="w-full lg:col-span-1" disabled={savedPayrolls.length === 0}>
                       <FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar Todo (CSV)
                    </Button>

               </div>
          </CardContent>
      </Card>

      {/* Main content area with 7 columns on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-8 mb-8">

          {/* Column 1: Add/Edit Day Form - Takes 2 parts */}
          <div className="lg:col-span-2">
              {/* Section for Adding/Editing a Single Day's Inputs */}
              <Card className={`shadow-lg bg-card ${isFormDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg text-foreground"> {/* Reduced size to lg */}
                    {editingDayId ? <Edit className="h-4 w-4" /> : <PlusCircle className="h-4 w-4" />} {/* Reduced icon size */}
                    {editingDayId ? 'Editar Turno' : 'Agregar Turno'}
                     {employeeId && payPeriodStart && payPeriodEnd && ` para ${employeeId}`}
                     {/* Removed period dates from title */}
                  </CardTitle>
                  <CardDescription>
                    {isFormDisabled
                      ? 'Selecciona un colaborador y un período para habilitar esta sección.'
                      : editingDayId
                      ? `Modifica la fecha y horas para el turno.`
                      : 'Ingresa los detalles de un turno para incluirlo.'}
                     {/* Simplified descriptions */}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                   {isFormDisabled ? (
                        <div className="text-center text-muted-foreground italic py-4">
                            Selecciona colaborador y período arriba.
                        </div>
                   ) : (
                      <WorkdayForm
                        key={editingDayId || 'new'} // Re-mount form when switching between add/edit or editing different days
                        onCalculationStart={handleDayCalculationStart}
                        onCalculationComplete={handleDayCalculationComplete}
                        isLoading={isLoadingDay}
                        initialData={editingDayData} // Pass initial data if editing inputs
                        existingId={editingDayId} // Pass the ID if editing inputs
                        isDateCalculated={isDateCalculated} // Pass check function
                      />
                   )}
                  {errorDay && (
                    <p className="text-sm font-medium text-destructive mt-4">{errorDay}</p>
                  )}
                </CardContent>
              </Card>
          </div>

          {/* Column 2: Calculated Days List - Takes 3 parts */}
          <div className="lg:col-span-3 space-y-8">
              {/* Section to Display Calculated Days and Allow Editing Results */}
              {calculatedDays.length > 0 && (
                <Card className="shadow-lg bg-card">
                  <CardHeader>
                     <CardTitle className="flex items-center gap-2 text-lg text-foreground"> {/* Reduced size */}
                       <Clock className="h-4 w-4"/> Turnos Agregados ({calculatedDays.length}) {/* Reduced icon size */}
                         {employeeId && payPeriodStart && payPeriodEnd && ` para ${employeeId}`} {/* Removed period */}
                     </CardTitle>
                    <CardDescription>Lista de turnos incluidos. Puedes editar horas o eliminar.</CardDescription> {/* Simplified */}
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-4 max-h-[60vh] overflow-y-auto pr-2"> {/* Added max-height and scroll */}
                      {calculatedDays // Already sorted by the update/add handler
                        .map((day, index) => (
                        <li key={day.id} className={`p-4 border rounded-lg shadow-sm transition-colors ${editingResultsId === day.id ? 'bg-blue-50 dark:bg-blue-900/20 border-primary' : 'bg-card'}`}> {/* Use bg-card */}
                           <div className="flex items-start justify-between mb-3">
                             <div>
                               <p className="font-semibold text-lg mb-1 text-foreground">Turno {index + 1}</p>
                               <div className="flex items-center text-sm text-muted-foreground gap-2 mb-1">
                                   <CalendarIcon className="h-4 w-4" />
                                   {format(day.inputData.startDate, 'PPPP', { locale: es })}
                               </div>
                               <div className="flex items-center text-sm text-muted-foreground gap-2">
                                   <Clock className="h-4 w-4" />
                                    {/* Format times using helper */}
                                    {formatTo12Hour(day.inputData.startTime)} - {formatTo12Hour(day.inputData.endTime)}
                                    {day.inputData.endsNextDay ? ' (+1d)' : ''}
                               </div>
                             </div>
                             <div className="text-right flex-shrink-0 ml-4">
                                 <div className="text-sm text-muted-foreground mb-1">Recargos/Extras:</div>
                                 <div className="font-semibold text-primary text-lg flex items-center justify-end gap-1">
                                    {formatCurrency(day.pagoTotalRecargosExtras)}
                                 </div>
                                <div className="flex items-center justify-end gap-1 mt-2">
                                   {/* Button to edit INPUTS (date/time) */}
                                   <Button variant="ghost" size="icon" onClick={() => handleEditDay(day.id)} title="Editar Fecha/Horas" className={`h-8 w-8 ${editingDayId === day.id ? 'text-primary bg-primary/10' : ''}`} disabled={editingResultsId === day.id}>
                                     <Edit className="h-4 w-4" />
                                   </Button>
                                   {/* Button to edit RESULTS (hours) */}
                                   <Button variant="ghost" size="icon" onClick={() => handleEditResults(day.id)} title="Editar Horas Calculadas" className={`h-8 w-8 ${editingResultsId === day.id ? 'text-primary bg-primary/10' : ''}`} disabled={editingDayId === day.id}>
                                      <PencilLine className="h-4 w-4" />
                                   </Button>
                                   {/* Delete Button */}
                                   <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                         <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8" onClick={() => setDayToDeleteId(day.id)} title="Eliminar turno" disabled={editingDayId === day.id || editingResultsId === day.id}>
                                            <Trash2 className="h-4 w-4" />
                                         </Button>
                                      </AlertDialogTrigger>
                                     <AlertDialogContent>
                                       <AlertDialogHeader>
                                         <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                         <AlertDialogDescription>
                                            Esta acción no se puede deshacer. Esto eliminará permanentemente el cálculo para el turno iniciado el{' '}
                                            {calculatedDays.find(d => d.id === dayToDeleteId)?.inputData?.startDate ? format(calculatedDays.find(d => d.id === dayToDeleteId)!.inputData.startDate, 'PPP', { locale: es }) : 'seleccionado'} de la quincena.
                                         </AlertDialogDescription>
                                       </AlertDialogHeader>
                                       <AlertDialogFooter>
                                         <AlertDialogCancel onClick={() => setDayToDeleteId(null)}>Cancelar</AlertDialogCancel>
                                         <AlertDialogAction onClick={handleDeleteDay} className="bg-destructive hover:bg-destructive/90">
                                            Eliminar
                                         </AlertDialogAction>
                                       </AlertDialogFooter>
                                     </AlertDialogContent>
                                   </AlertDialog>
                                 </div>
                             </div>
                          </div>

                          {/* Detailed Hour Breakdown or Editing Inputs */}
                           <Separator className="my-3"/>
                           {editingResultsId === day.id && editedHours ? (
                               // EDITING MODE for Results
                               <div className="space-y-3">
                                   <p className="text-sm font-medium text-foreground">Editando horas calculadas:</p>
                                   <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3"> {/* Adjusted grid cols */}
                                       {displayOrder.map(key => (
                                           <div key={key} className="space-y-1">
                                               <Label htmlFor={`edit-hours-${day.id}-${key}`} className="text-xs text-muted-foreground">
                                                   {abbreviatedLabelMap[key] || key} {/* Use abbreviated label */}
                                               </Label>
                                               <Input
                                                   id={`edit-hours-${day.id}-${key}`}
                                                   type="number" // Use number input
                                                   step="0.01" // Allow decimals
                                                   min="0"
                                                   value={editedHours[key] ?? 0} // Use number value
                                                   onChange={(e) => handleHourChange(e, key)}
                                                   className="h-8 text-sm"
                                                   placeholder="0.00"
                                               />
                                           </div>
                                       ))}
                                   </div>
                                   <div className="flex justify-end gap-2 mt-3">
                                       <Button variant="ghost" size="sm" onClick={handleCancelResults}>
                                           <X className="mr-1 h-4 w-4" /> Cancelar
                                       </Button>
                                       <Button variant="default" size="sm" onClick={handleSaveResults}>
                                           <Save className="mr-1 h-4 w-4" /> Guardar Horas
                                       </Button>
                                   </div>
                               </div>
                           ) : (
                               // DISPLAY MODE for Results
                               <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm"> {/* Changed to 1 or 2 cols */}
                                   {displayOrder.map(key => {
                                       const hours = day.horasDetalladas[key];
                                       if (hours > 0) {
                                           return (
                                               <div key={key} className="flex justify-between items-center space-x-1">
                                                   {/* Use abbreviatedLabelMap here for consistency */}
                                                   <span className="text-muted-foreground truncate mr-1">{abbreviatedLabelMap[key] || key}:</span>
                                                   <span className="font-medium text-right text-foreground flex-shrink-0">{formatHours(hours)}h</span>
                                               </div>
                                           );
                                       }
                                       return null;
                                   })}
                                   <div className="flex justify-between items-center col-span-full mt-1 pt-1 border-t border-dashed">
                                       <span className="text-muted-foreground font-medium">Total Horas Trabajadas:</span>
                                       <span className="font-semibold text-right text-foreground">{formatHours(day.duracionTotalTrabajadaHoras)}h</span>
                                   </div>
                               </div>
                           )}
                        </li>
                      ))}
                    </ul>
                     {/* Replace "Agregar Otro Turno" with "Duplicar Turno Sig. Día" */}
                     <Button
                        variant="outline"
                        onClick={handleDuplicateToNextDay}
                        className="mt-6 w-full md:w-auto"
                        disabled={isFormDisabled || isLoadingDay || calculatedDays.length === 0} // Disable if form disabled, loading, or no days exist
                      >
                        {isLoadingDay ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <CopyPlus className="mr-2 h-4 w-4" />
                        )}
                        Duplicar Turno Sig. Día
                      </Button>
                  </CardContent>
                </Card>
              )}

              {/* Placeholder if no days are calculated yet */}
              {calculatedDays.length === 0 && !editingDayId && !isFormDisabled && (
                 <Card className="text-center p-8 border-dashed mt-8 bg-card">
                    <CardHeader>
                        <CardTitle className="text-lg text-foreground">Comienza a Calcular</CardTitle> {/* Reduced size */}
                        <CardDescription>Agrega el primer turno para {employeeId} para iniciar el cálculo.</CardDescription> {/* Simplified */}
                    </CardHeader>
                 </Card>
              )}
               {/* Placeholder if form is disabled */}
               {isFormDisabled && calculatedDays.length === 0 && ( // Only show if no days loaded AND form disabled
                 <Card className="text-center p-8 border-dashed mt-8 bg-muted/50">
                    <CardHeader>
                        <CardTitle className="text-lg text-foreground">Selección Pendiente</CardTitle> {/* Reduced size */}
                        <CardDescription>Ingresa ID de colaborador y período para empezar.</CardDescription> {/* Simplified */}
                    </CardHeader>
                 </Card>
              )}
          </div>

          {/* Column 3: Saved Payrolls List - Takes 2 parts */}
          <div className="lg:col-span-2">
               {/* Section to Display Saved Payrolls */}
               <SavedPayrollList
                   payrolls={savedPayrolls}
                   onLoad={handleLoadSavedPayroll}
                   onDelete={(key) => setPayrollToDeleteKey(key)} // Trigger confirmation dialog
                   onBulkExport={handleBulkExportPDF}
                   onBulkExportCSV={handleBulkExportCSV} // Pass CSV export handler
                   onExportSingleCSV={handleExportSingleCSV} // Pass single CSV export handler
               />


                {/* AlertDialog for Deleting Saved Payroll */}
                <AlertDialog open={!!payrollToDeleteKey} onOpenChange={(open) => !open && setPayrollToDeleteKey(null)}>
                   <AlertDialogContent>
                     <AlertDialogHeader>
                       <AlertDialogTitle>¿Eliminar Nómina Guardada?</AlertDialogTitle>
                       <AlertDialogDescription>
                          Esta acción eliminará permanentemente la nómina guardada para{' '}
                          <strong>{savedPayrolls.find(p => p.key === payrollToDeleteKey)?.employeeId}</strong> del período{' '}
                          <strong>
                            {savedPayrolls.find(p => p.key === payrollToDeleteKey)?.periodStart
                                ? format(savedPayrolls.find(p => p.key === payrollToDeleteKey)!.periodStart, 'dd/MM/yy', { locale: es })
                                : '?'}
                          </strong> al <strong>
                            {savedPayrolls.find(p => p.key === payrollToDeleteKey)?.periodEnd
                                ? format(savedPayrolls.find(p => p.key === payrollToDeleteKey)!.periodEnd, 'dd/MM/yy', { locale: es })
                                : '?'}
                          </strong>. No se puede deshacer.
                       </AlertDialogDescription>
                     </AlertDialogHeader>
                     <AlertDialogFooter>
                       <AlertDialogCancel onClick={() => setPayrollToDeleteKey(null)}>Cancelar</AlertDialogCancel>
                       <AlertDialogAction onClick={handleDeleteSavedPayroll} className="bg-destructive hover:bg-destructive/90">
                          Eliminar Nómina
                       </AlertDialogAction>
                     </AlertDialogFooter>
                   </AlertDialogContent>
               </AlertDialog>
          </div>

      </div> {/* End of 7-column grid */}

       {/* Section for Quincenal Summary - Moved outside grid, takes full width */}
       {showSummary && (
         <Card className="shadow-lg mt-8 bg-card"> {/* Full width */}
            <CardHeader className="flex flex-row items-center justify-between">
               <div>
                 <CardTitle className="flex items-center gap-2 text-lg text-foreground"><Calculator className="h-4 w-4" /> Resumen Quincenal</CardTitle> {/* Reduced size */}
                 <CardDescription>Resultados agregados para {employeeId} ({payPeriodStart ? format(payPeriodStart, 'dd/MM') : ''} - {payPeriodEnd ? format(payPeriodEnd, 'dd/MM') : ''}).</CardDescription> {/* Simplified */}
               </div>
                <Button onClick={handleExportPDF} variant="secondary" disabled={!quincenalSummary || !employeeId || !payPeriodStart || !payPeriodEnd}>
                    <FileDown className="mr-2 h-4 w-4" /> Exportar PDF
                </Button>
            </CardHeader>
            <CardContent>
               <ResultsDisplay
                   results={quincenalSummary} // Pass the potentially adjusted summary
                   error={null}
                   isLoading={false}
                   isSummary={true}
                   // Pass adjustment data and handlers
                   otrosIngresos={otrosIngresos}
                   otrasDeducciones={otrasDeducciones}
                   onAddIngreso={() => setIsIncomeModalOpen(true)}
                   onAddDeduccion={() => setIsDeductionModalOpen(true)}
                   onDeleteIngreso={handleDeleteIngreso}
                   onDeleteDeduccion={handleDeleteDeduccion}
                   // Pass transportation allowance state and handler
                   incluyeAuxTransporte={incluyeAuxTransporte}
                   onToggleTransporte={handleToggleTransporte}
                   auxTransporteValor={AUXILIO_TRANSPORTE_VALOR} // Pass the value
                />
            </CardContent>
         </Card>
       )}

      {/* Adjustment Modals */}
      <AdjustmentModal
          type="ingreso"
          isOpen={isIncomeModalOpen}
          onClose={() => setIsIncomeModalOpen(false)}
          onSave={handleAddIngreso}
          // Pass initialData if editing an income item
          // initialData={editingAdjustment?.type === 'ingreso' ? editingAdjustment.item : undefined}
      />
       <AdjustmentModal
          type="deduccion"
          isOpen={isDeductionModalOpen}
          onClose={() => setIsDeductionModalOpen(false)}
          onSave={handleAddDeduccion}
          // Pass initialData if editing a deduction item
          // initialData={editingAdjustment?.type === 'deduccion' ? editingAdjustment.item : undefined}
       />


      <Toaster />
    </main>
  );
}
