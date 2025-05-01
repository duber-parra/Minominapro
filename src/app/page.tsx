

'use client';

import React, { useState, useCallback, useMemo, ChangeEvent, useEffect } from 'react';
import { WorkdayForm } from '@/components/workday-form';
import { ResultsDisplay, labelMap, displayOrder, formatHours, formatCurrency } from '@/components/results-display'; // Import helpers
import type { CalculationResults, CalculationError, QuincenalCalculationSummary } from '@/types';
import { isCalculationError } from '@/types'; // Import the type guard
import { Toaster } from '@/components/ui/toaster';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input'; // Import Input for editing hours and employee ID
import { Label } from '@/components/ui/label'; // Import Label for editing hours and employee ID
import { Trash2, Edit, PlusCircle, Calculator, DollarSign, Clock, Calendar as CalendarIcon, Save, X, PencilLine, User, FolderSync, Eraser, FileDown, Library } from 'lucide-react'; // Added Library for bulk export
import { format, parseISO, startOfMonth, endOfMonth, setDate, parse as parseDateFns } from 'date-fns';
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

// Example fixed salary for demonstration
const SALARIO_BASE_QUINCENAL_FIJO = 711750;

// --- LocalStorage Key Generation ---
const getStorageKey = (employeeId: string, periodStart: Date | undefined, periodEnd: Date | undefined): string | null => {
    if (!employeeId || !periodStart || !periodEnd) return null;
    const startStr = format(periodStart, 'yyyy-MM-dd');
    const endStr = format(periodEnd, 'yyyy-MM-dd');
    // Sanitize employeeId to be safe for keys (basic example)
    const safeEmployeeId = employeeId.replace(/[^a-zA-Z0-9_-]/g, '');
    return `payroll_${safeEmployeeId}_${startStr}_${endStr}`;
};

// --- Helper to parse stored data (revives dates) ---
const parseStoredData = (jsonData: string | null): CalculationResults[] => {
    if (!jsonData) return [];
    try {
        const data = JSON.parse(jsonData) as CalculationResults[];
        // Revive date objects
        return data.map(day => ({
            ...day,
            inputData: {
                ...day.inputData,
                startDate: day.inputData.startDate ? parseISO(day.inputData.startDate as unknown as string) : new Date(),
            }
        }));
    } catch (error) {
        console.error("Error parsing data from localStorage:", error);
        return []; // Return empty array on error
    }
};

// --- Regex to parse storage key ---
const storageKeyRegex = /^payroll_([a-zA-Z0-9_-]+)_(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})$/;


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
    const [isLoadingDay, setIsLoadingDay] = useState<boolean>(false);
    const [errorDay, setErrorDay] = useState<string | null>(null);
    const [isDataLoaded, setIsDataLoaded] = useState<boolean>(false); // Track initial load

    const { toast } = useToast();

    // --- Effects for Loading and Saving ---

    // Load data from localStorage when employee/period changes
    useEffect(() => {
        if (typeof window !== 'undefined') { // Ensure running on client
            const storageKey = getStorageKey(employeeId, payPeriodStart, payPeriodEnd);
            if (storageKey) {
                console.log(`Intentando cargar datos para la clave: ${storageKey}`);
                const storedData = localStorage.getItem(storageKey);
                const parsedData = parseStoredData(storedData);
                setCalculatedDays(parsedData);
                setIsDataLoaded(true); // Mark data as loaded (or attempted)
                 toast({
                     title: storedData ? 'Datos Cargados' : 'Datos No Encontrados',
                     description: storedData ? `Se cargaron ${parsedData.length} turnos para ${employeeId}.` : `No se encontraron turnos guardados para ${employeeId} en este período.`,
                     variant: storedData ? 'default' : 'default', // 'default' for info style
                 });
            } else {
                // Clear days if key is invalid (e.g., missing employee ID or dates)
                setCalculatedDays([]);
                setIsDataLoaded(true); // Still considered 'loaded' (with empty data)
            }
        }
    }, [employeeId, payPeriodStart, payPeriodEnd, toast]); // Add toast to dependency array

    // Save data to localStorage whenever calculatedDays changes (after initial load)
    useEffect(() => {
        if (typeof window !== 'undefined' && isDataLoaded) { // Ensure running on client and after initial load
            const storageKey = getStorageKey(employeeId, payPeriodStart, payPeriodEnd);
            if (storageKey && calculatedDays.length >= 0) { // Allow saving empty array to clear storage
                try {
                     console.log(`Intentando guardar ${calculatedDays.length} días en la clave: ${storageKey}`);
                    localStorage.setItem(storageKey, JSON.stringify(calculatedDays));
                } catch (error) {
                    console.error("Error guardando datos en localStorage:", error);
                    toast({
                        title: 'Error al Guardar',
                        description: 'No se pudieron guardar los cambios localmente.',
                        variant: 'destructive',
                    });
                }
            }
        }
    }, [calculatedDays, employeeId, payPeriodStart, payPeriodEnd, isDataLoaded, toast]); // Add dependencies


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
             description: `Buscando turnos para ${employeeId}.`,
         });
          // Force re-trigger loading effect
         setEmployeeId(e => e);
         setPayPeriodStart(d => d ? new Date(d) : undefined);
         setPayPeriodEnd(d => d ? new Date(d) : undefined);

    }, [employeeId, payPeriodStart, payPeriodEnd, toast]);

    const handleClearPeriodData = () => {
         const storageKey = getStorageKey(employeeId, payPeriodStart, payPeriodEnd);
         if (storageKey && typeof window !== 'undefined') {
            localStorage.removeItem(storageKey);
         }
         setCalculatedDays([]); // Clear state immediately
         setEditingDayId(null);
         setEditingResultsId(null);
         setEditedHours(null);
         toast({
            title: 'Datos del Período Eliminados',
            description: `Se han borrado los turnos guardados localmente para ${employeeId} en este período.`,
            variant: 'destructive',
         });
    };


    // Function to handle adding or updating a day's calculation (from WorkdayForm)
    const handleDayCalculationComplete = (data: CalculationResults | CalculationError) => {
        setIsLoadingDay(false);
        if (isCalculationError(data)) {
            // const errorMessage = data.error || 'Hubo un error inesperado al procesar la solicitud.';
            // Updated error message handling to show more specific errors if available
            const errorMessage = data.error?.startsWith("ID")
                ? data.error // Show specific ID error
                : `Error inesperado: ${data.error || 'Detalle no disponible.'}`;
            setErrorDay(errorMessage);
            toast({
                title: 'Error en el Cálculo',
                description: errorMessage,
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


  // Memoized calculation for the quincenal summary using the utility function
  const quincenalSummary = useMemo(() => {
      return calculateQuincenalSummary(calculatedDays, SALARIO_BASE_QUINCENAL_FIJO);
  }, [calculatedDays]);


  // Find the data for the day being edited (for WorkdayForm)
  const editingDayData = useMemo(() => {
    if (!editingDayId) return undefined;
    return calculatedDays.find(day => day.id === editingDayId)?.inputData;
  }, [editingDayId, calculatedDays]);

  const handleAddNewDay = () => {
     if (!employeeId || !payPeriodStart || !payPeriodEnd) {
         toast({
             title: 'Información Incompleta',
             description: 'Selecciona un colaborador y período antes de agregar un turno.',
             variant: 'destructive',
         });
         return;
     }
    setEditingDayId(null); // Ensure we are adding a new day, not editing inputs
    setEditingResultsId(null); // Ensure we are not editing results
    setEditedHours(null);
    // WorkdayForm should reset due to key change or useEffect dependency on initialData
  };

  // Determine if form or summary should be disabled
  const isFormDisabled = !employeeId || !payPeriodStart || !payPeriodEnd;

  // --- PDF Export Handler ---
  const handleExportPDF = () => {
     if (!quincenalSummary || !employeeId || !payPeriodStart || !payPeriodEnd) {
         toast({
             title: 'Datos Incompletos para Exportar',
             description: 'Asegúrate de tener un colaborador, período y cálculo quincenal completado.',
             variant: 'destructive',
         });
         return;
     }
     try {
        exportPayrollToPDF(quincenalSummary, employeeId, payPeriodStart, payPeriodEnd);
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
    if (typeof window === 'undefined') return; // Client-side only

    const allPayrollData = [];
    let errorsFound = false;

    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('payroll_')) {
                const match = key.match(storageKeyRegex);
                if (match) {
                    const empId = match[1];
                    const startStr = match[2];
                    const endStr = match[3];

                    // Basic validation of parsed dates
                    const startDate = parseDateFns(startStr, 'yyyy-MM-dd', new Date());
                    const endDate = parseDateFns(endStr, 'yyyy-MM-dd', new Date());

                    if (!empId || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                        console.warn(`Clave de almacenamiento inválida encontrada, omitiendo: ${key}`);
                        continue; // Skip invalid keys
                    }


                    const storedData = localStorage.getItem(key);
                    const parsedDays = parseStoredData(storedData);

                    if (parsedDays.length > 0) {
                        // Recalculate summary based on stored days
                        // You might want to fetch the employee's specific salary here if it varies
                        const summary = calculateQuincenalSummary(parsedDays, SALARIO_BASE_QUINCENAL_FIJO);

                        if (summary) {
                            allPayrollData.push({
                                employeeId: empId,
                                periodStart: startDate,
                                periodEnd: endDate,
                                summary: summary,
                            });
                        } else {
                             console.warn(`No se pudo generar el resumen para la clave: ${key}, datos:`, parsedDays);
                        }
                    }
                }
            }
        }

        if (allPayrollData.length > 0) {
            exportAllPayrollsToPDF(allPayrollData);
            toast({
                title: 'Exportación Masiva Completa',
                description: `Se generó un PDF con ${allPayrollData.length} comprobantes de nómina.`,
            });
        } else {
            toast({
                title: 'No Hay Datos para Exportar',
                description: 'No se encontraron nóminas calculadas guardadas en el almacenamiento local.',
                variant: 'default',
            });
        }

    } catch (error) {
        console.error("Error durante la exportación masiva de PDF:", error);
        toast({
            title: 'Error en Exportación Masiva',
            description: 'Ocurrió un error al intentar generar el PDF combinado.',
            variant: 'destructive',
        });
        errorsFound = true;
    }

     // Optional: Notify about skipped entries if any
     // if (skippedEntries > 0) {
     //     toast({ title: 'Aviso', description: `${skippedEntries} entradas fueron omitidas debido a datos inválidos.` });
     // }
  };



  return (
    <main className="container mx-auto p-4 md:p-8 max-w-6xl">
      <h1 className="text-3xl font-bold text-center mb-8 text-primary">Calculadora de Nómina Quincenal</h1>

      {/* Section for Employee ID and Pay Period Selection */}
      <Card className="mb-8 shadow-lg">
          <CardHeader>
              <CardTitle className="text-primary flex items-center gap-2">
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
                             <Button variant="destructive" className="w-full" disabled={isFormDisabled || calculatedDays.length === 0}>
                                <Eraser className="mr-2 h-4 w-4" /> Limpiar Período Actual
                            </Button>
                        </AlertDialogTrigger>
                       <AlertDialogContent>
                         <AlertDialogHeader>
                           <AlertDialogTitle>¿Limpiar Datos del Período?</AlertDialogTitle>
                           <AlertDialogDescription>
                              Esta acción eliminará todos los turnos guardados localmente para <strong>{employeeId || 'el colaborador seleccionado'}</strong> en el período del{' '}
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
                    <Button onClick={handleBulkExportPDF} variant="outline" className="w-full lg:col-span-1">
                        <Library className="mr-2 h-4 w-4" /> Exportar Todo (PDF)
                    </Button>

               </div>
          </CardContent>
      </Card>


      {/* Section for Adding/Editing a Single Day's Inputs */}
      <Card className={`mb-8 shadow-lg ${isFormDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
        <CardHeader>
          <CardTitle className="text-primary flex items-center gap-2">
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

      {/* Section to Display Calculated Days and Allow Editing Results */}
      {calculatedDays.length > 0 && (
        <Card className="mb-8 shadow-lg">
          <CardHeader>
             <CardTitle className="text-primary flex items-center gap-2">
               <Clock className="h-5 w-5"/> Turnos Agregados ({calculatedDays.length})
                 {employeeId && payPeriodStart && payPeriodEnd && ` para ${employeeId} (${format(payPeriodStart, 'dd/MM')} - ${format(payPeriodEnd, 'dd/MM')})`}
             </CardTitle>
            <CardDescription>Lista de los turnos incluidos en el cálculo actual. Puedes editar las horas calculadas o eliminar el turno.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {calculatedDays // Already sorted by the update/add handler
                .map((day, index) => (
                <li key={day.id} className={`p-4 border rounded-lg shadow-sm transition-colors ${editingResultsId === day.id ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300' : 'bg-secondary/30'}`}>
                   <div className="flex items-start justify-between mb-3">
                     <div>
                       <p className="font-semibold text-lg mb-1">Turno {index + 1}</p>
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
                            {/* Remove the explicit DollarSign icon here */}
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
                           <p className="text-sm font-medium text-primary">Editando horas calculadas:</p>
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
                                           <span className="font-medium text-right">{formatHours(hours)}h</span>
                                       </div>
                                   );
                               }
                               return null;
                           })}
                           <div className="flex justify-between items-center col-span-full mt-1 pt-1 border-t border-dashed">
                               <span className="text-muted-foreground font-medium">Total Horas Trabajadas:</span>
                               <span className="font-semibold text-right">{formatHours(day.duracionTotalTrabajadaHoras)}h</span>
                           </div>
                       </div>
                   )}
                </li>
              ))}
            </ul>
             <Button variant="outline" onClick={handleAddNewDay} className="mt-6 w-full md:w-auto" disabled={!!editingDayId || !!editingResultsId || isFormDisabled}>
                 <PlusCircle className="mr-2 h-4 w-4" /> Agregar Otro Turno
             </Button>
          </CardContent>
        </Card>
      )}

      {/* Section for Quincenal Summary */}
      {quincenalSummary && (
         <Card className="shadow-lg mt-8">
            <CardHeader className="flex flex-row items-center justify-between">
               <div>
                 <CardTitle className="text-primary flex items-center gap-2"><Calculator className="h-5 w-5" /> Resumen Quincenal</CardTitle>
                 <CardDescription>Resultados agregados para los {quincenalSummary.diasCalculados} turnos calculados de {employeeId} ({payPeriodStart ? format(payPeriodStart, 'dd/MM') : ''} - {payPeriodEnd ? format(payPeriodEnd, 'dd/MM') : ''}).</CardDescription>
               </div>
                <Button onClick={handleExportPDF} variant="secondary" disabled={!quincenalSummary || !employeeId || !payPeriodStart || !payPeriodEnd}>
                    <FileDown className="mr-2 h-4 w-4" /> Exportar PDF
                </Button>
            </CardHeader>
            <CardContent>
               <ResultsDisplay results={quincenalSummary} error={null} isLoading={false} isSummary={true} />
            </CardContent>
         </Card>
      )}

      {/* Placeholder if no days are calculated yet */}
      {calculatedDays.length === 0 && !editingDayId && !isFormDisabled && (
         <Card className="text-center p-8 border-dashed mt-8">
            <CardHeader>
                <CardTitle>Comienza a Calcular</CardTitle>
                <CardDescription>Agrega el primer turno trabajado para {employeeId} en este período para iniciar el cálculo de la nómina quincenal.</CardDescription>
            </CardHeader>
         </Card>
      )}
       {/* Placeholder if form is disabled */}
       {isFormDisabled && (
         <Card className="text-center p-8 border-dashed mt-8 bg-muted/50">
            <CardHeader>
                <CardTitle>Selección Pendiente</CardTitle>
                <CardDescription>Por favor, ingresa un ID de colaborador y selecciona un período quincenal para empezar a calcular la nómina.</CardDescription>
            </CardHeader>
         </Card>
      )}


      <Toaster />
    </main>
  );
}
