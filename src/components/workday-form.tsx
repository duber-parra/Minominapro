
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
  FormDescription,
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
import { formatTo12Hour } from '@/lib/time-utils'; // Import the time formatting helper

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
const timeErrorMessage = 'Formato de hora inválido (HH:mm).';

// Export the schema
export const formSchema = z.object({
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
    defaultValues: initialData ? {
      ...initialData,
      startDate: initialData.startDate instanceof Date ? initialData.startDate : new Date(initialData.startDate), // Ensure Date object
      breakStartTime: initialData.breakStartTime ?? '',
      breakEndTime: initialData.breakEndTime ?? '',
    } : {
      startDate: new Date(),
      startTime: '12:00', 
      endTime: '22:00',  
      endsNextDay: false, 
      includeBreak: false,
      breakStartTime: '15:00', 
      breakEndTime: '18:00',   
    },
  });

   const [isHoliday, setIsHoliday] = useState<boolean>(false);
   const [isCheckingHoliday, setIsCheckingHoliday] = useState<boolean>(false);

   useEffect(() => {
       const resetValues = initialData ? {
           ...initialData,
           startDate: initialData.startDate instanceof Date ? initialData.startDate : new Date(initialData.startDate),
           breakStartTime: initialData.breakStartTime ?? '',
           breakEndTime: initialData.breakEndTime ?? '',
       } : {
           startDate: new Date(),
           startTime: '12:00', 
           endTime: '22:00',   
           endsNextDay: false, 
           includeBreak: false,
           breakStartTime: '15:00', 
           breakEndTime: '18:00',   
       };

       if (timeRegex.test(resetValues.startTime) && timeRegex.test(resetValues.endTime)) {
           const [startH] = resetValues.startTime.split(':').map(Number);
           const [endH] = resetValues.endTime.split(':').map(Number);
           resetValues.endsNextDay = endH < startH;
       }

       form.reset(resetValues);

   }, [initialData, form]);


  const { control, setValue, trigger, watch, getValues } = form;
  const startDate = watch('startDate');
  const includeBreak = watch('includeBreak');

   useEffect(() => {
       if (startDate && isValid(startDate)) {
           const year = getYear(startDate);
           const dateStr = format(startDate, 'yyyy-MM-dd');
           setIsCheckingHoliday(true); 

           fetchAndCacheHolidays(year)
               .then(holidaySet => {
                   setIsHoliday(holidaySet.has(dateStr));
               })
               .catch(error => {
                   console.error("Error checking holiday status:", error);
                   setIsHoliday(false); 
               })
               .finally(() => {
                   setIsCheckingHoliday(false); 
               });
       } else {
           setIsHoliday(false); 
       }
   }, [startDate]);

   const prevIncludeBreak = useRef(includeBreak);

   useEffect(() => {
       if (includeBreak) {
           if (!prevIncludeBreak.current) {
               setValue('breakStartTime', '15:00', { shouldValidate: true });
               setValue('breakEndTime', '18:00', { shouldValidate: true });
           } else {
               trigger(["breakStartTime", "breakEndTime"]);
           }
       }
       prevIncludeBreak.current = includeBreak;
   }, [includeBreak, trigger, setValue, watch('breakStartTime'), watch('breakEndTime')]);


  async function onSubmit(values: WorkdayFormValues) {
     if (!existingId && isDateCalculated && isDateCalculated(values.startDate)) {
         toast({
             title: 'Fecha Ya Calculada',
             description: `Ya existe un cálculo para el ${format(values.startDate, 'PPP', { locale: es })}. Si deseas modificarlo, usa la opción de editar en la lista de turnos.`,
             variant: 'destructive',
             duration: 7000,
         });
         const nextDay = addDays(values.startDate, 1);
         setValue('startDate', nextDay, { shouldValidate: true, shouldDirty: true });
         return; 
     }

    onCalculationStart();
    const calculationId = existingId || `day_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    try {
        const result = await calculateSingleWorkday(values, calculationId);
        onCalculationComplete(result); 

        if (!existingId && !('error' in result)) {
             const nextDay = addDays(values.startDate, 1);
             setValue('startDate', nextDay, { shouldValidate: true, shouldDirty: true });
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
                             isHoliday && 'border-primary border-2', 
                             !isHoliday && startDate && isSunday(startDate) && 'border-primary border-2' 
                          )}
                          disabled={isCheckingHoliday} 
                        >
                          {isCheckingHoliday ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : field.value ? (
                            format(field.value instanceof Date ? field.value : new Date(field.value), 'PPP', { locale: es }) 
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
                        selected={field.value instanceof Date ? field.value : new Date(field.value)} 
                        onSelect={(date) => {
                           if (date) {
                              field.onChange(date)
                           }
                        }} 
                        disabled={(date) =>
                          date < new Date('1900-01-01')
                        }
                        initialFocus
                        locale={es}
                         modifiers={{ holiday: (date) => holidaysCache[getYear(date)]?.has(format(date, 'yyyy-MM-dd')) ?? false, sunday: isSunday }}
                         modifiersClassNames={{
                             holiday: 'text-primary font-semibold border border-primary', 
                             sunday: 'text-primary'
                         }}
                      />
                    </PopoverContent>
                  </Popover>
                  {isHoliday && !isCheckingHoliday && (
                      <p className="text-xs text-primary font-semibold mt-1 pl-1"> • Día festivo</p> 
                  )}
                   {!isHoliday && startDate && isSunday(startDate) && !isCheckingHoliday && (
                      <p className="text-xs text-primary font-semibold mt-1 pl-1"> • Domingo</p> 
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
                        <Input
                            type="time"
                            value={field.value || ''}
                            onChange={(e) => field.onChange(e.target.value)}
                            className="text-base"
                        />
                    </FormControl>
                    {field.value && timeRegex.test(field.value) && (
                        <FormDescription>
                            Equivale a: {formatTo12Hour(field.value)}
                        </FormDescription>
                    )}
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
                        <Input
                            type="time"
                            value={field.value || ''}
                            onChange={(e) => field.onChange(e.target.value)}
                            className="text-base"
                        />
                    </FormControl>
                     {field.value && timeRegex.test(field.value) && (
                        <FormDescription>
                            Equivale a: {formatTo12Hour(field.value)}
                        </FormDescription>
                    )}
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
                            <Input
                                type="time"
                                value={field.value || ''}
                                onChange={(e) => field.onChange(e.target.value === '' ? undefined : e.target.value)}
                                className="text-base"
                            />
                         </FormControl>
                         {field.value && timeRegex.test(field.value) && (
                            <FormDescription>
                                Equivale a: {formatTo12Hour(field.value)}
                            </FormDescription>
                         )}
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
                             <Input
                                type="time"
                                value={field.value || ''}
                                onChange={(e) => field.onChange(e.target.value === '' ? undefined : e.target.value)}
                                className="text-base"
                            />
                         </FormControl>
                          {field.value && timeRegex.test(field.value) && (
                            <FormDescription>
                                Equivale a: {formatTo12Hour(field.value)}
                            </FormDescription>
                         )}
                         <FormMessage />
                       </FormItem>
                     )}
                   />
                 </div>
               </CardContent>
             </Card>
           )}


            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isLoading || isCheckingHoliday}> 
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

