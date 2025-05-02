
'use client';

import type { FC } from 'react';
import React, { useState, useEffect, useRef } from 'react'; // Added useRef
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { format, parse, addHours, isValid, isSameDay, getYear, isSunday, addDays } from 'date-fns'; // Added addDays and isSameDay
import { es } from 'date-fns/locale'; // Import Spanish locale

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
// Removed Checkbox import as Switch is used
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CalendarIcon, Loader2, Save, Plus } from 'lucide-react';
import { calculateSingleWorkday } from '@/actions/calculate-workday'; // Updated action name
import type { CalculationResults, CalculationError } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from '@/components/ui/switch';
import { getColombianHolidays } from '@/services/colombian-holidays'; // Import holiday service

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
const timeErrorMessage = 'Formato de hora inválido (HH:mm).';

const formSchema = z.object({
  startDate: z.date({
    required_error: 'La fecha de inicio es requerida.',
  }),
  startTime: z.string().regex(timeRegex, { message: timeErrorMessage }),
  endTime: z.string().regex(timeRegex, { message: timeErrorMessage }),
  endsNextDay: z.boolean().default(false),
  includeBreak: z.boolean().default(false),
  breakStartTime: z.string().optional(),
  breakEndTime: z.string().optional(),
})
.refine(
  (data) => {
    if (data.includeBreak) {
      // Check if both times are provided and match the regex format
      const isBreakStartTimeValid = data.breakStartTime ? timeRegex.test(data.breakStartTime) : false;
      const isBreakEndTimeValid = data.breakEndTime ? timeRegex.test(data.breakEndTime) : false;
      return isBreakStartTimeValid && isBreakEndTimeValid;
    }
    return true; // No validation needed if break is not included
  },
  {
    // This message appears if either time is missing or format is wrong when includeBreak is true
    message: "Si incluye descanso, las horas de inicio y fin son requeridas (formato HH:mm).",
    // Apply this error check to both fields, but path targets one for display logic
    path: ["breakStartTime"],
  }
)
.refine(
    (data) => {
        // Only validate if break is included AND both times are provided and valid format
        if (data.includeBreak && data.breakStartTime && timeRegex.test(data.breakStartTime) && data.breakEndTime && timeRegex.test(data.breakEndTime)) {
             const [startH, startM] = data.breakStartTime.split(':').map(Number);
             const [endH, endM] = data.breakEndTime.split(':').map(Number);
             // Check if end time is strictly after start time
             return endH > startH || (endH === startH && endM > startM);
        }
        return true; // Pass validation if break not included or times are invalid/missing (handled by previous refine)
    },
    {
        message: "La hora de fin del descanso debe ser posterior a la hora de inicio.",
        path: ["breakEndTime"], // Show error associated with the end time field
    }
);


export type WorkdayFormValues = z.infer<typeof formSchema>;

interface WorkdayFormProps {
  onCalculationStart: () => void;
  onCalculationComplete: (results: CalculationResults | CalculationError) => void;
  isLoading: boolean;
  initialData?: WorkdayFormValues; // Optional data for editing
  existingId?: string | null; // Optional ID for editing
  isDateCalculated?: (date: Date) => boolean; // Function to check if date is already calculated
}

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
        const holidaySet = new Set(holidays.map(h => format(new Date(h.year, h.month - 1, h.day), 'yyyy-MM-dd')));
        holidaysCache[year] = holidaySet;
        return holidaySet;
    } catch (error) {
        console.error(`Error fetching or caching holidays for ${year}:`, error);
        return new Set(); // Return empty set on error
    }
}


export const WorkdayForm: FC<WorkdayFormProps> = ({
  onCalculationStart,
  onCalculationComplete,
  isLoading,
  initialData,
  existingId,
  isDateCalculated, // Receive the check function
}) => {
  const { toast } = useToast();
  const form = useForm<WorkdayFormValues>({
    resolver: zodResolver(formSchema),
    // Use initialData if provided (editing), otherwise use defaults (adding)
    defaultValues: initialData ? {
      ...initialData,
      startDate: initialData.startDate instanceof Date ? initialData.startDate : new Date(initialData.startDate), // Ensure Date object
      // Ensure optional break times are empty strings if null/undefined in initial data
      breakStartTime: initialData.breakStartTime ?? '',
      breakEndTime: initialData.breakEndTime ?? '',
    } : {
      startDate: new Date(),
      startTime: '12:00', // Default start time 12:00 PM
      endTime: '22:00',   // Default end time 10:00 PM
      endsNextDay: false, // Recalculated based on default times if needed
      includeBreak: false,
      breakStartTime: '15:00', // Default break start if enabled
      breakEndTime: '18:00',   // Default break end if enabled
    },
  });

   // --- State for Holiday Check ---
   const [isHoliday, setIsHoliday] = useState<boolean>(false);
   const [isCheckingHoliday, setIsCheckingHoliday] = useState<boolean>(false);

  // Reset form when initialData changes (i.e., when switching between add/edit or editing different days)
   useEffect(() => {
       const resetValues = initialData ? {
           ...initialData,
           startDate: initialData.startDate instanceof Date ? initialData.startDate : new Date(initialData.startDate),
           // Ensure optional break times are handled correctly on reset
           breakStartTime: initialData.breakStartTime ?? '',
           breakEndTime: initialData.breakEndTime ?? '',
       } : {
           startDate: new Date(),
           startTime: '12:00', // Reset to default start time
           endTime: '22:00',   // Reset to default end time
           endsNextDay: false, // Calculate based on defaults
           includeBreak: false,
           breakStartTime: '15:00', // Default break start if enabled
           breakEndTime: '18:00',   // Default break end if enabled
       };

       // Calculate endsNextDay based on reset values
       if (timeRegex.test(resetValues.startTime) && timeRegex.test(resetValues.endTime)) {
           const [startH] = resetValues.startTime.split(':').map(Number);
           const [endH] = resetValues.endTime.split(':').map(Number);
           resetValues.endsNextDay = endH < startH;
       }

       form.reset(resetValues);

   }, [initialData, form]); // form is stable, but reset is from it


  const { control, setValue, trigger, watch, getValues } = form;
  // Watch fields using the hook for effects
  const startDate = watch('startDate');
  const startTime = watch('startTime');
  const includeBreak = watch('includeBreak');

   // --- Effect to check if startDate is a holiday ---
   useEffect(() => {
       if (startDate && isValid(startDate)) {
           const year = getYear(startDate);
           const dateStr = format(startDate, 'yyyy-MM-dd');
           setIsCheckingHoliday(true); // Indicate loading

           fetchAndCacheHolidays(year)
               .then(holidaySet => {
                   setIsHoliday(holidaySet.has(dateStr));
               })
               .catch(error => {
                   console.error("Error checking holiday status:", error);
                   setIsHoliday(false); // Assume not holiday on error
               })
               .finally(() => {
                   setIsCheckingHoliday(false); // Finish loading
               });
       } else {
           setIsHoliday(false); // Not a holiday if date is invalid
       }
   }, [startDate]);


  // Effect to update endsNextDay when times change
  useEffect(() => {
      const currentEndTime = getValues('endTime');
      if (startTime && timeRegex.test(startTime) && currentEndTime && timeRegex.test(currentEndTime)) {
          const [startH] = startTime.split(':').map(Number);
          const [endH] = currentEndTime.split(':').map(Number);
          setValue('endsNextDay', endH < startH);
      }
  }, [startTime, watch('endTime'), setValue, getValues]); // Rerun when startTime or endTime changes


   // Ref to track the previous state of includeBreak
   const prevIncludeBreak = useRef(includeBreak);

   // Effect to trigger validation and set defaults for break times
   useEffect(() => {
       if (includeBreak) {
           // If the switch was just turned ON, set defaults
           if (!prevIncludeBreak.current) {
               setValue('breakStartTime', '15:00', { shouldValidate: true });
               setValue('breakEndTime', '18:00', { shouldValidate: true });
           } else {
               // If the switch was already on, just trigger validation when times change
               trigger(["breakStartTime", "breakEndTime"]);
           }
       }
       // Update the previous state ref *after* the logic runs
       prevIncludeBreak.current = includeBreak;
   }, [includeBreak, trigger, setValue, watch('breakStartTime'), watch('breakEndTime')]); // Trigger also when break times change


  async function onSubmit(values: WorkdayFormValues) {
     // Check if the date is already calculated, only if NOT editing
     if (!existingId && isDateCalculated && isDateCalculated(values.startDate)) {
         toast({
             title: 'Fecha Ya Calculada',
             description: `Ya existe un cálculo para el ${format(values.startDate, 'PPP', { locale: es })}. Si deseas modificarlo, usa la opción de editar en la lista de turnos.`,
             variant: 'destructive',
             duration: 7000,
         });
         // Automatically advance to the next day in the form
         const nextDay = addDays(values.startDate, 1);
         setValue('startDate', nextDay, { shouldValidate: true, shouldDirty: true });
         return; // Stop the submission process
     }

    onCalculationStart();
    // Generate a new ID if adding, use existing ID if editing
    const calculationId = existingId || `day_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    try {
        // Use the modified action that accepts values and ID
        const result = await calculateSingleWorkday(values, calculationId);
        onCalculationComplete(result); // Pass the full result back to the page

        // If adding was successful (no error), automatically set date to the next day
        if (!existingId && !('error' in result)) {
             const nextDay = addDays(values.startDate, 1);
             setValue('startDate', nextDay, { shouldValidate: true, shouldDirty: true });
             // Optionally reset times or keep them? Resetting might be safer.
             // setValue('startTime', '12:00');
             // setValue('endTime', '22:00');
             // setValue('endsNextDay', false);
             // setValue('includeBreak', false);
             // setValue('breakStartTime', '15:00');
             // setValue('breakEndTime', '18:00');
             toast({
                 title: 'Día Agregado, Fecha Avanzada',
                 description: `Se agregó el turno y la fecha se movió al ${format(nextDay, 'PPP', { locale: es })}.`,
                 variant: 'default'
             })
        }
    } catch (error) {
        console.error("Calculation error:", error);
        const genericServerError = "Hubo un error en el servidor al calcular.";
        const errorMessage = error instanceof Error && error.message ? error.message : genericServerError;
        onCalculationComplete({ error: errorMessage });
    }
  }


  return (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={control}
              name="startDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={'outline'}
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground',
                             // Conditional border for holiday and Sunday
                             isHoliday && 'border-primary border', // Use primary border for holiday
                             !isHoliday && startDate && isSunday(startDate) && 'border-primary border' // Keep primary border for Sunday
                          )}
                          disabled={isCheckingHoliday} // Disable while checking
                        >
                          {isCheckingHoliday ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : field.value ? (
                            format(field.value instanceof Date ? field.value : new Date(field.value), 'PPP', { locale: es }) // Ensure it's a Date object
                          ) : (
                            <span>Selecciona una fecha</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value instanceof Date ? field.value : new Date(field.value)} // Ensure Date object
                        onSelect={(date) => {
                           if (date) {
                              field.onChange(date)
                           }
                        }} // Handle null case
                        disabled={(date) =>
                          date < new Date('1900-01-01')
                        }
                        initialFocus
                        locale={es}
                         modifiers={{ holiday: (date) => holidaysCache[getYear(date)]?.has(format(date, 'yyyy-MM-dd')) ?? false, sunday: isSunday }}
                         modifiersClassNames={{
                             holiday: 'text-primary font-semibold border border-primary', // Style holiday with primary color
                             sunday: 'text-primary'
                         }}
                      />
                    </PopoverContent>
                  </Popover>
                  {/* Display holiday/Sunday indicator */}
                  {isHoliday && !isCheckingHoliday && (
                      <p className="text-xs text-primary font-semibold mt-1 pl-1"> • Día festivo</p> // Use primary color text
                  )}
                   {!isHoliday && startDate && isSunday(startDate) && !isCheckingHoliday && (
                      <p className="text-xs text-primary font-semibold mt-1 pl-1"> • Domingo</p> // Use primary text color
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora de Inicio</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} className="text-base"/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora de Fin</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} className="text-base"/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={control}
              name="endsNextDay"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-secondary/50">
                   <div className="space-y-0.5">
                    <FormLabel>¿Termina al día siguiente?</FormLabel>
                   </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      aria-readonly // Although interactive, indicates calculated nature
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="includeBreak"
              render={({ field }) => (
                 <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-secondary/50">
                   <div className="space-y-0.5">
                       <FormLabel>Incluir descanso</FormLabel>
                   </div>
                   <FormControl>
                       <Switch
                           checked={field.value}
                           onCheckedChange={field.onChange}
                       />
                   </FormControl>
                 </FormItem>
              )}
            />

           {/* Conditional rendering based on the watched value */}
           {includeBreak && (
             <Card className="bg-muted/30 border-dashed">
                <CardHeader className="pb-2 pt-4">
                   <CardTitle className="text-base">Configurar Descanso</CardTitle>
                 </CardHeader>
               <CardContent className="space-y-4 pt-0 pb-4">
                 <div className="grid grid-cols-2 gap-4">
                   <FormField
                     control={control}
                     name="breakStartTime"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>Inicio Descanso</FormLabel>
                         <FormControl>
                           {/* Ensure value is controlled and never null/undefined for input[type=time] */}
                           <Input type="time" {...field} value={field.value ?? ''} className="text-base" />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                   />
                   <FormField
                     control={control}
                     name="breakEndTime"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>Fin Descanso</FormLabel>
                         <FormControl>
                           {/* Ensure value is controlled and never null/undefined for input[type=time] */}
                           <Input type="time" {...field} value={field.value ?? ''} className="text-base" />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                   />
                 </div>
               </CardContent>
             </Card>
           )}


            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isLoading || isCheckingHoliday}> {/* Use theme color & Disable submit while checking holiday */}
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {existingId ? 'Guardando Cambios...' : 'Agregando Día...'}
                </>
              ) : isCheckingHoliday ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verificando Festivo...
                  </>
              ) : (
                 existingId ? <><Save className="mr-2 h-4 w-4" /> Guardar Cambios</> : <><Plus className="mr-2 h-4 w-4" /> Agregar Día a la Quincena</>
              )}
            </Button>
          </form>
        </Form>
  );
};
