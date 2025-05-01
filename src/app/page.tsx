
'use client';

import React, { useState, useCallback, useMemo, ChangeEvent } from 'react';
import { WorkdayForm } from '@/components/workday-form';
import { ResultsDisplay, labelMap, displayOrder, formatHours, formatCurrency } from '@/components/results-display'; // Import helpers
import type { CalculationResults, CalculationError, QuincenalCalculationSummary } from '@/types';
import { isCalculationError } from '@/types'; // Import the type guard
import { Toaster } from '@/components/ui/toaster';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input'; // Import Input for editing hours
import { Label } from '@/components/ui/label'; // Import Label for editing hours
import { Trash2, Edit, PlusCircle, Calculator, DollarSign, Clock, Calendar as CalendarIcon, Save, X, PencilLine } from 'lucide-react'; // Added Save, X, PencilLine
import { format } from 'date-fns';
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
import { VALORES } from '@/config/payroll-values'; // Import VALORES from new location

// Example fixed salary for demonstration
const SALARIO_BASE_QUINCENAL_FIJO = 711750;


export default function Home() {
  // State for individual day calculations
  const [calculatedDays, setCalculatedDays] = useState<CalculationResults[]>([]);
  const [editingDayId, setEditingDayId] = useState<string | null>(null); // For editing inputs (date/time)
  const [editingResultsId, setEditingResultsId] = useState<string | null>(null); // For editing calculated hours
  const [editedHours, setEditedHours] = useState<CalculationResults['horasDetalladas'] | null>(null); // Temp state for edited hours
  const [dayToDeleteId, setDayToDeleteId] = useState<string | null>(null);

  // State for loading and errors related to single day calculation/addition
  const [isLoadingDay, setIsLoadingDay] = useState<boolean>(false);
  const [errorDay, setErrorDay] = useState<string | null>(null);

  const { toast } = useToast();

  // Function to handle adding or updating a day's calculation (from WorkdayForm)
  const handleDayCalculationComplete = (data: CalculationResults | CalculationError) => {
    setIsLoadingDay(false);
    if (isCalculationError(data)) {
      const errorMessage = data.error || 'Hubo un error inesperado al procesar la solicitud.';
      setErrorDay(errorMessage);
      toast({
        title: 'Error en el Cálculo',
        description: errorMessage,
        variant: 'destructive',
      });
    } else {
      setErrorDay(null);
      setCalculatedDays((prevDays) => {
        const existingIndex = prevDays.findIndex((day) => day.id === data.id);
        if (existingIndex > -1) {
          const updatedDays = [...prevDays];
          updatedDays[existingIndex] = data;
          return updatedDays;
        } else {
          return [...prevDays, data];
        }
      });
      setEditingDayId(null); // Clear input editing state
      toast({
        title: `Día ${editingDayId ? 'Actualizado' : 'Agregado'}`,
        description: `Cálculo para ${format(data.inputData.startDate, 'PPP', { locale: es })} ${editingDayId ? 'actualizado' : 'agregado a la quincena.'}`,
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

            return updatedDays;
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


  // Memoized calculation for the quincenal summary
  const quincenalSummary = useMemo((): QuincenalCalculationSummary | null => {
    if (calculatedDays.length === 0) {
      return null;
    }

    const initialSummary: QuincenalCalculationSummary = {
      totalHorasDetalladas: {
        Ordinaria_Diurna_Base: 0, Recargo_Noct_Base: 0, Recargo_Dom_Diurno_Base: 0,
        Recargo_Dom_Noct_Base: 0, HED: 0, HEN: 0, HEDD_F: 0, HEND_F: 0,
      },
      totalPagoDetallado: {
        Ordinaria_Diurna_Base: 0, Recargo_Noct_Base: 0, Recargo_Dom_Diurno_Base: 0,
        Recargo_Dom_Noct_Base: 0, HED: 0, HEN: 0, HEDD_F: 0, HEND_F: 0,
      },
      totalPagoRecargosExtrasQuincena: 0,
      salarioBaseQuincenal: SALARIO_BASE_QUINCENAL_FIJO,
      pagoTotalConSalarioQuincena: SALARIO_BASE_QUINCENAL_FIJO, // Start with base salary
      totalDuracionTrabajadaHorasQuincena: 0,
      diasCalculados: calculatedDays.length,
    };

    return calculatedDays.reduce((summary, currentDay) => {
      // Use Object.keys on the summary's structure to ensure all categories are processed
      Object.keys(summary.totalHorasDetalladas).forEach(key => {
          const category = key as keyof CalculationResults['horasDetalladas'];
          // Accumulate hours and payments safely, defaulting to 0 if a category is somehow missing in currentDay (though unlikely with current types)
          summary.totalHorasDetalladas[category] += currentDay.horasDetalladas[category] ?? 0;
          summary.totalPagoDetallado[category] += currentDay.pagoDetallado[category] ?? 0;
      });
      summary.totalPagoRecargosExtrasQuincena += currentDay.pagoTotalRecargosExtras;
      summary.totalDuracionTrabajadaHorasQuincena += currentDay.duracionTotalTrabajadaHoras;
      summary.pagoTotalConSalarioQuincena += currentDay.pagoTotalRecargosExtras; // Add only the extras/surcharges
      return summary;
    }, initialSummary);


  }, [calculatedDays]);

  // Find the data for the day being edited (for WorkdayForm)
  const editingDayData = useMemo(() => {
    if (!editingDayId) return undefined;
    return calculatedDays.find(day => day.id === editingDayId)?.inputData;
  }, [editingDayId, calculatedDays]);

  const handleAddNewDay = () => {
    setEditingDayId(null); // Ensure we are adding a new day, not editing inputs
    setEditingResultsId(null); // Ensure we are not editing results
    setEditedHours(null);
    // WorkdayForm should reset due to key change or useEffect dependency on initialData
  };

  return (
    <main className="container mx-auto p-4 md:p-8 max-w-6xl">
      <h1 className="text-3xl font-bold text-center mb-8 text-primary">Calculadora de Nómina Quincenal</h1>

      {/* Section for Adding/Editing a Single Day's Inputs */}
      <Card className="mb-8 shadow-lg">
        <CardHeader>
          <CardTitle className="text-primary flex items-center gap-2">
            {editingDayId ? <Edit className="h-5 w-5" /> : <PlusCircle className="h-5 w-5" />}
            {editingDayId ? 'Editar Día Trabajado' : 'Agregar Día Trabajado'}
          </CardTitle>
          <CardDescription>
            {editingDayId
              ? `Modifica la fecha y horas para el turno iniciado el ${format(editingDayData?.startDate ?? new Date(), 'PPP', { locale: es })} y guarda los cambios.`
              : 'Ingresa los detalles de un turno para incluirlo en el cálculo quincenal.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WorkdayForm
            key={editingDayId || 'new'} // Re-mount form when switching between add/edit or editing different days
            onCalculationStart={handleDayCalculationStart}
            onCalculationComplete={handleDayCalculationComplete}
            isLoading={isLoadingDay}
            initialData={editingDayData} // Pass initial data if editing inputs
            existingId={editingDayId} // Pass the ID if editing inputs
          />
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
             </CardTitle>
            <CardDescription>Lista de los turnos incluidos en el cálculo actual. Puedes editar las horas calculadas o eliminar el turno.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {calculatedDays
                .sort((a, b) => a.inputData.startDate.getTime() - b.inputData.startDate.getTime())
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
                            <DollarSign className="h-4 w-4" /> {formatCurrency(day.pagoTotalRecargosExtras)}
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
             <Button variant="outline" onClick={handleAddNewDay} className="mt-6 w-full md:w-auto" disabled={!!editingDayId || !!editingResultsId}>
                 <PlusCircle className="mr-2 h-4 w-4" /> Agregar Otro Turno
             </Button>
          </CardContent>
        </Card>
      )}

      {/* Section for Quincenal Summary */}
      {quincenalSummary && (
         <Card className="shadow-lg mt-8">
            <CardHeader>
               <CardTitle className="text-primary flex items-center gap-2"><Calculator className="h-5 w-5" /> Resumen Quincenal</CardTitle>
               <CardDescription>Resultados agregados para los {quincenalSummary.diasCalculados} turnos calculados.</CardDescription>
            </CardHeader>
            <CardContent>
               <ResultsDisplay results={quincenalSummary} error={null} isLoading={false} isSummary={true} />
            </CardContent>
         </Card>
      )}

      {/* Placeholder if no days are calculated yet */}
      {calculatedDays.length === 0 && !editingDayId && (
         <Card className="text-center p-8 border-dashed mt-8">
            <CardHeader>
                <CardTitle>Comienza a Calcular</CardTitle>
                <CardDescription>Agrega el primer turno trabajado para iniciar el cálculo de la nómina quincenal.</CardDescription>
            </CardHeader>
         </Card>
      )}


      <Toaster />
    </main>
  );
}
