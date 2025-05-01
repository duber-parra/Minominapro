
'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { WorkdayForm } from '@/components/workday-form';
import { ResultsDisplay } from '@/components/results-display';
import type { CalculationResults, CalculationError, QuincenalCalculationSummary } from '@/types';
import { isCalculationError } from '@/types'; // Import the type guard
import { Toaster } from '@/components/ui/toaster';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Trash2, Edit, PlusCircle, Calculator } from 'lucide-react';
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


// Example fixed salary for demonstration
const SALARIO_BASE_QUINCENAL_FIJO = 711750;

export default function Home() {
  // State for individual day calculations
  const [calculatedDays, setCalculatedDays] = useState<CalculationResults[]>([]);
  const [editingDayId, setEditingDayId] = useState<string | null>(null);
  const [dayToDeleteId, setDayToDeleteId] = useState<string | null>(null);

  // State for loading and errors related to single day calculation/addition
  const [isLoadingDay, setIsLoadingDay] = useState<boolean>(false);
  const [errorDay, setErrorDay] = useState<string | null>(null);

  const { toast } = useToast();

  // Function to handle adding or updating a day's calculation
  const handleDayCalculationComplete = (data: CalculationResults | CalculationError) => {
    setIsLoadingDay(false);
    if (isCalculationError(data)) {
      setErrorDay(data.error);
      toast({
        // Use the user-requested title and description for errors
        title: 'Error en el Cálculo',
        description: data.error || 'Hubo un error en el servidor al calcular.', // Use specific error or fallback
        variant: 'destructive',
      });
    } else {
      setErrorDay(null);
      setCalculatedDays((prevDays) => {
        const existingIndex = prevDays.findIndex((day) => day.id === data.id);
        if (existingIndex > -1) {
          // Update existing day
          const updatedDays = [...prevDays];
          updatedDays[existingIndex] = data;
          return updatedDays;
        } else {
          // Add new day
          return [...prevDays, data];
        }
      });
      setEditingDayId(null); // Clear editing state after successful save/add
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

  // Function to initiate editing a day
  const handleEditDay = (id: string) => {
    setEditingDayId(id);
    // The WorkdayForm will now receive the data for this day via `initialData` prop
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
      Object.keys(summary.totalHorasDetalladas).forEach(key => {
        const category = key as keyof CalculationResults['horasDetalladas'];
        summary.totalHorasDetalladas[category] += currentDay.horasDetalladas[category];
        summary.totalPagoDetallado[category] += currentDay.pagoDetallado[category];
      });
      summary.totalPagoRecargosExtrasQuincena += currentDay.pagoTotalRecargosExtras;
      summary.totalDuracionTrabajadaHorasQuincena += currentDay.duracionTotalTrabajadaHoras;
      summary.pagoTotalConSalarioQuincena += currentDay.pagoTotalRecargosExtras; // Add only the extras/surcharges
      return summary;
    }, initialSummary);

  }, [calculatedDays]);

  // Find the data for the day being edited
  const editingDayData = useMemo(() => {
    if (!editingDayId) return undefined;
    return calculatedDays.find(day => day.id === editingDayId)?.inputData;
  }, [editingDayId, calculatedDays]);

  const handleAddNewDay = () => {
    setEditingDayId(null); // Ensure we are adding a new day, not editing
    // Optionally reset form fields if needed, though WorkdayForm might handle this
  };

  return (
    <main className="container mx-auto p-4 md:p-8 max-w-6xl">
      <h1 className="text-3xl font-bold text-center mb-8 text-primary">Calculadora de Nómina Quincenal</h1>

      {/* Section for Adding/Editing a Single Day */}
      <Card className="mb-8 shadow-lg">
        <CardHeader>
          <CardTitle className="text-primary flex items-center gap-2">
            {editingDayId ? <Edit className="h-5 w-5" /> : <PlusCircle className="h-5 w-5" />}
            {editingDayId ? 'Editar Día Trabajado' : 'Agregar Día Trabajado'}
          </CardTitle>
          <CardDescription>
            {editingDayId
              ? `Modifica los detalles para el día ${format(editingDayData?.startDate ?? new Date(), 'PPP', { locale: es })} y guarda los cambios.`
              : 'Ingresa los detalles de un día trabajado para incluirlo en el cálculo quincenal.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WorkdayForm
            key={editingDayId || 'new'} // Re-mount form when switching between add/edit or editing different days
            onCalculationStart={handleDayCalculationStart}
            onCalculationComplete={handleDayCalculationComplete}
            isLoading={isLoadingDay}
            initialData={editingDayData} // Pass initial data if editing
            existingId={editingDayId} // Pass the ID if editing
          />
          {errorDay && (
            <p className="text-sm font-medium text-destructive mt-4">{errorDay}</p>
          )}
        </CardContent>
      </Card>

      {/* Section to Display Calculated Days */}
      {calculatedDays.length > 0 && (
        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle className="text-primary">Días Calculados para la Quincena</CardTitle>
            <CardDescription>Lista de los días incluidos en el cálculo actual. Puedes editarlos o eliminarlos.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {calculatedDays
                .sort((a, b) => a.inputData.startDate.getTime() - b.inputData.startDate.getTime()) // Sort by date
                .map((day) => (
                <li key={day.id} className="flex items-center justify-between p-3 border rounded-md bg-secondary/30 hover:bg-secondary/50 transition-colors">
                  <div>
                    <p className="font-medium">{format(day.inputData.startDate, 'PPPP', { locale: es })}</p>
                    <p className="text-sm text-muted-foreground">
                      {day.inputData.startTime} - {day.inputData.endTime}
                      {day.inputData.endsNextDay ? ' (+1d)' : ''}
                      {` | ${day.duracionTotalTrabajadaHoras.toFixed(2)} hrs`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEditDay(day.id)} title="Editar día">
                      <Edit className="h-4 w-4" />
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                         <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDayToDeleteId(day.id)} title="Eliminar día">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                          <AlertDialogDescription>
                             Esta acción no se puede deshacer. Esto eliminará permanentemente el cálculo para el día{' '}
                             {format(day.inputData.startDate, 'PPP', { locale: es })} de la quincena.
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
                </li>
              ))}
            </ul>
             <Button variant="outline" onClick={handleAddNewDay} className="mt-4 w-full md:w-auto">
                 <PlusCircle className="mr-2 h-4 w-4" /> Agregar Otro Día
             </Button>
          </CardContent>
        </Card>
      )}

      {/* Section for Quincenal Summary */}
      {quincenalSummary && (
         <Card className="shadow-lg">
            <CardHeader>
               <CardTitle className="text-primary flex items-center gap-2"><Calculator className="h-5 w-5" /> Resumen Quincenal</CardTitle>
               <CardDescription>Resultados agregados para los {quincenalSummary.diasCalculados} días calculados.</CardDescription>
            </CardHeader>
            <CardContent>
               {/* Pass the summary data to ResultsDisplay */}
               {/* Need to adapt ResultsDisplay to accept QuincenalCalculationSummary or handle it here */}
               <ResultsDisplay results={quincenalSummary} error={null} isLoading={false} isSummary={true} />
            </CardContent>
            {/* Potentially add "Guardar Nómina" button here */}
         </Card>
      )}

      {/* Placeholder if no days are calculated yet */}
      {calculatedDays.length === 0 && !editingDayId && (
         <Card className="text-center p-8 border-dashed">
            <CardHeader>
                <CardTitle>Comienza a Calcular</CardTitle>
                <CardDescription>Agrega el primer día trabajado para iniciar el cálculo de la nómina quincenal.</CardDescription>
            </CardHeader>
         </Card>
      )}


      <Toaster />
    </main>
  );
}
