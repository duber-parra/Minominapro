
'use client';

import React, { useState, useCallback, useMemo, ChangeEvent, useEffect } from 'react';
import { WorkdayForm } from '@/components/workday-form';
import { ResultsDisplay, labelMap, displayOrder, formatHours, formatCurrency } from '@/components/results-display'; // Import helpers
import type { CalculationResults, CalculationError, QuincenalCalculationSummary, AdjustmentItem, SavedPayrollData } from '@/types'; // Added AdjustmentItem and SavedPayrollData
import { isCalculationError } from '@/types'; // Import the type guard
import { Toaster } from '@/components/ui/toaster';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input'; // Import Input for editing hours and employee ID
import { Label } from '@/components/ui/label'; // Import Label for editing hours and employee ID
import { Trash2, Edit, PlusCircle, Calculator, DollarSign, Clock, Calendar as CalendarIcon, Save, X, PencilLine, User, FolderSync, Eraser, FileDown, Library, FileSearch, MinusCircle, Bus, CopyPlus, Loader2 } from 'lucide-react'; // Added Bus icon, CopyPlus, Loader2
import { format, parseISO, startOfMonth, endOfMonth, setDate, parse as parseDateFns, addDays } from 'date-fns'; // Added addDays
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

// Constants
const SALARIO_BASE_QUINCENAL_FIJO = 711750; // Example fixed salary
const AUXILIO_TRANSPORTE_VALOR = 100000; // User-defined value for transport allowance

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

                    if (parsedDays.length > 0 || parsedIncome.length > 0 || parsedDeductions.length > 0) { // Check if there's any data
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
                            createdAt: parsedDays[0]?.inputData?.startDate ? new Date(parsedDays[0].inputData.startDate) : new Date()
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
    const [errorDay, setErrorDay] = useState<string | null>(null);
    const [isDataLoaded, setIsDataLoaded] = useState<boolean>(false); // Track initial load for current employee/period
    const [savedPayrolls, setSavedPayrolls] = useState<SavedPayrollData[]>([]); // State for the list of all saved payrolls
    const [payrollToDeleteKey, setPayrollToDeleteKey] = useState<string | null>(null); // Key of the saved payroll to delete

    // State for Adjustments
    const [otrosIngresos, setOtrosIngresos] = useState<AdjustmentItem[]>([]);
    const [otrasDeducciones, setOtrasDeducciones] = useState<AdjustmentItem[]>([]);
    const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
    const [isDeductionModalOpen, setIsDeductionModalOpen] = useState(false);
    // State for editing an adjustment (optional)
    // const [editingAdjustment, setEditingAdjustment] = useState<{ type: 'ingreso' | 'deduccion', item: AdjustmentItem } | null>(null);

    // State for Transportation Allowance
    const [incluyeAuxTransporte, setIncluyeAuxTransporte] = useState<boolean>(false);


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
                 if (employeeId && payPeriodStart && payPeriodEnd) {
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
    }, [employeeId, payPeriodStart, payPeriodEnd, toast]); // Add toast to dependency array

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
                localStorage.removeItem(storageKey);
                console.log(`Clave ${storageKey} eliminada porque no hay datos ni auxilio de transporte activo.`);
                // Refresh saved list after deletion
                setSavedPayrolls(loadAllSavedPayrolls());
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
                // Check for the specific generic server error message
                description: errorMessage === "Hubo un error en el servidor al calcular."
                             ? "Hubo un error en el servidor al calcular." // Use the new generic message
                             : errorMessage, // Otherwise show the specific error
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
  const showSummary = quincenalSummary !== null;


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
        setSavedPayrolls(loadAllSavedPayrolls()); // Refresh the list
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
    <main className="container mx-auto p-4 md:p-8 max-w-7xl"> {/* Increased max-width */}
      <h1 className="text-3xl font-bold text-center mb-8 text-foreground">Calculadora de Nómina Quincenal</h1>

      {/* Section for Employee ID and Pay Period Selection */}
      <Card className="mb-8 shadow-lg bg-card">
          <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl text-foreground">
                  <User className="h-5 w-5" /> Selección de Colaborador y Período
              </CardTitle>
              <CardDescription>
                  Ingresa el ID del colaborador y selecciona el período quincenal para cargar/guardar los turnos y calcular la nómina.
              </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              {/* Employee ID Input */}
              <div className="space-y-2">
                  <Label htmlFor="employeeId">ID Colaborador</Label>
                  <Input
                      id="employeeId"
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      placeholder="Ej: 12345678"
                  />
              </div>

              {/* Pay Period Start Date */}
              <div className="space-y-2">
                  <Label>Inicio Período</Label>
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
                  <Label>Fin Período</Label>
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
                <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-4">
                   <Button onClick={handleLoadData} className="w-full" disabled={!employeeId || !payPeriodStart || !payPeriodEnd}>
                       <FolderSync className="mr-2 h-4 w-4" /> Cargar/Actualizar Turnos
                   </Button>
                   <AlertDialog>
                        <AlertDialogTrigger asChild>
                             {/* Disable clear if form disabled OR if all data is already clear */}
                             <Button variant="destructive" className="w-full" disabled={isFormDisabled || (calculatedDays.length === 0 && otrosIngresos.length === 0 && otrasDeducciones.length === 0 && !incluyeAuxTransporte) }>
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
                   {/* Bulk Export Button */}
                    <Button onClick={handleBulkExportPDF} variant="outline" className="w-full lg:col-span-1" disabled={savedPayrolls.length === 0}>
                        <Library className="mr-2 h-4 w-4" /> Exportar Todo (PDF)
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
                  <CardTitle className="flex items-center gap-2 text-xl text-foreground">
                    {editingDayId ? <Edit className="h-5 w-5" /> : <PlusCircle className="h-5 w-5" />}
                    {editingDayId ? 'Editar Turno' : 'Agregar Turno'}
                     {employeeId && payPeriodStart && payPeriodEnd && ` para ${employeeId} (${format(payPeriodStart, 'dd/MM')} - ${format(payPeriodEnd, 'dd/MM')})`}
                  </CardTitle>
                  <CardDescription>
                    {isFormDisabled
                      ? 'Selecciona un colaborador y un período para habilitar esta sección.'
                      : editingDayId
                      ? `Modifica la fecha y horas para el turno iniciado el ${format(editingDayData?.startDate ?? new Date(), 'PPP', { locale: es })} y guarda los cambios.`
                      : 'Ingresa los detalles de un turno para incluirlo en el cálculo quincenal.'}
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
                     <CardTitle className="flex items-center gap-2 text-xl text-foreground">
                       <Clock className="h-5 w-5"/> Turnos Agregados ({calculatedDays.length})
                         {employeeId && payPeriodStart && payPeriodEnd && ` para ${employeeId} (${format(payPeriodStart, 'dd/MM')} - ${format(payPeriodEnd, 'dd/MM')})`}
                     </CardTitle>
                    <CardDescription>Lista de los turnos incluidos en el cálculo actual. Puedes editar las horas calculadas o eliminar el turno.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-4 max-h-[60vh] overflow-y-auto pr-2"> {/* Added max-height and scroll */}
                      {calculatedDays // Already sorted by the update/add handler
                        .map((day, index) => (
                        <li key={day.id} className={`p-4 border rounded-lg shadow-sm transition-colors ${editingResultsId === day.id ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300' : 'bg-secondary/30'}`}>
                           <div className="flex items-start justify-between mb-3">
                             <div>
                               <p className="font-semibold text-lg mb-1 text-foreground">Turno {index + 1}</p>
                               <div className="flex items-center text-sm text-muted-foreground gap-2 mb-1">
                                   <CalendarIcon className="h-4 w-4" />
                                   {format(day.inputData.startDate, 'PPPP', { locale: es })}
                               </div>
                               <div className="flex items-center text-sm text-muted-foreground gap-2">
                                   <Clock className="h-4 w-4" />
                                   {day.inputData.startTime} - {day.inputData.endTime}
                                   {day.inputData.endsNextDay ? ' (+1d)' : ''}
                               </div>
                             </div>
                             <div className="text-right flex-shrink-0 ml-4">
                                 <div className="text-sm text-muted-foreground mb-1">Recargos/Extras:</div>
                                 <div className="font-semibold text-accent text-lg flex items-center justify-end gap-1">
                                    {formatCurrency(day.pagoTotalRecargosExtras)}
                                 </div>
                                <div className="flex items-center justify-end gap-1 mt-2">
                                   {/* Button to edit INPUTS (date/time) */}
                                   <Button variant="ghost" size="icon" onClick={() => handleEditDay(day.id)} title="Editar Fecha/Horas" className={`h-8 w-8 ${editingDayId === day.id ? 'text-accent bg-accent/10' : ''}`} disabled={editingResultsId === day.id}>
                                     <Edit className="h-4 w-4" />
                                   </Button>
                                   {/* Button to edit RESULTS (hours) */}
                                   <Button variant="ghost" size="icon" onClick={() => handleEditResults(day.id)} title="Editar Horas Calculadas" className={`h-8 w-8 ${editingResultsId === day.id ? 'text-accent bg-accent/10' : ''}`} disabled={editingDayId === day.id}>
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
                                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
                                       {displayOrder.map(key => (
                                           <div key={key} className="space-y-1">
                                               <Label htmlFor={`edit-hours-${day.id}-${key}`} className="text-xs text-muted-foreground">
                                                   {labelMap[key]?.replace(/ \(.+\)/, '') || key}
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
                               <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 text-sm">
                                   {displayOrder.map(key => {
                                       const hours = day.horasDetalladas[key];
                                       if (hours > 0) {
                                           return (
                                               <div key={key} className="flex justify-between items-center">
                                                   <span className="text-muted-foreground truncate mr-2">{labelMap[key]?.replace(/ \(.+\)/, '') || key}:</span>
                                                   <span className="font-medium text-right text-foreground">{formatHours(hours)}h</span>
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
                        <CardTitle className="text-xl text-foreground">Comienza a Calcular</CardTitle>
                        <CardDescription>Agrega el primer turno trabajado para {employeeId} en este período para iniciar el cálculo de la nómina quincenal.</CardDescription>
                    </CardHeader>
                 </Card>
              )}
               {/* Placeholder if form is disabled */}
               {isFormDisabled && calculatedDays.length === 0 && ( // Only show if no days loaded AND form disabled
                 <Card className="text-center p-8 border-dashed mt-8 bg-muted/50">
                    <CardHeader>
                        <CardTitle className="text-xl text-foreground">Selección Pendiente</CardTitle>
                        <CardDescription>Por favor, ingresa un ID de colaborador y selecciona un período quincenal para empezar a calcular la nómina.</CardDescription>
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
                 <CardTitle className="flex items-center gap-2 text-xl text-foreground"><Calculator className="h-5 w-5" /> Resumen Quincenal</CardTitle>
                 <CardDescription>Resultados agregados para los {quincenalSummary?.diasCalculados ?? 0} turnos calculados de {employeeId} ({payPeriodStart ? format(payPeriodStart, 'dd/MM') : ''} - {payPeriodEnd ? format(payPeriodEnd, 'dd/MM') : ''}).</CardDescription>
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
