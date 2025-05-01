
'use client';

import type { FC } from 'react';
import React, { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { format, parse, addHours, isValid, isSameDay } from 'date-fns';
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
      return timeRegex.test(data.breakStartTime ?? '') && timeRegex.test(data.breakEndTime ?? '');
    }
    return true;
  },
  {
    message: "Las horas de inicio y fin del descanso son requeridas y deben tener formato HH:mm si se incluye descanso.",
    path: ["breakStartTime"], // Anchor error to start time, user will see both fields
  }
)
.refine(
    (data) => {
        if (data.includeBreak && timeRegex.test(data.breakStartTime ?? '') && timeRegex.test(data.breakEndTime ?? '')) {
             const [startH, startM] = (data.breakStartTime || "00:00").split(':').map(Number);
             const [endH, endM] = (data.breakEndTime || "00:00").split(':').map(Number);
             return endH > startH || (endH === startH && endM > startM);
        }
        return true;
    },
    {
        message: "La hora de fin del descanso debe ser posterior a la hora de inicio.",
        path: ["breakEndTime"],
    }
);


export type WorkdayFormValues = z.infer<typeof formSchema>;

interface WorkdayFormProps {
  onCalculationStart: () => void;
  onCalculationComplete: (results: CalculationResults | CalculationError) => void;
  isLoading: boolean;
  initialData?: WorkdayFormValues; // Optional data for editing
  existingId?: string | null; // Optional ID for editing
}

export const WorkdayForm: FC<WorkdayFormProps> = ({
  onCalculationStart,
  onCalculationComplete,
  isLoading,
  initialData,
  existingId,
}) => {
  const { toast } = useToast();
  const form = useForm<WorkdayFormValues>({
    resolver: zodResolver(formSchema),
    // Use initialData if provided (editing), otherwise use defaults (adding)
    defaultValues: initialData || {
      startDate: new Date(),
      startTime: '',
      endTime: '',
      endsNextDay: false,
      includeBreak: false,
      breakStartTime: '15:00',
      breakEndTime: '18:00',
    },
  });

  // Reset form when initialData changes (i.e., when starting to edit a different day or adding new)
  useEffect(() => {
    if (initialData) {
      // Ensure date is a Date object when resetting
      form.reset({
        ...initialData,
        startDate: new Date(initialData.startDate), // Parse if it's a string/number from state
      });
    } else {
      // Reset to default values for adding a new day
      form.reset({
          startDate: new Date(),
          startTime: '',
          endTime: '',
          endsNextDay: false,
          includeBreak: false,
          breakStartTime: '15:00',
          breakEndTime: '18:00',
      });
    }
  }, [initialData, form.reset, form]); // Added form to dependency array as reset is from form instance


  const { control, setValue, trigger, watch } = form;
  // Watch fields using the hook for effects
  const startDate = watch('startDate');
  const startTime = watch('startTime');
  const includeBreak = watch('includeBreak');


  // Effect to update default end time and next day checkbox - ONLY IF NOT EDITING
  useEffect(() => {
      // Only run this effect if we are adding a new entry (no initialData or existingId)
      if (!initialData && !existingId) {
          if (startDate && startTime && /^\d{2}:\d{2}$/.test(startTime)) {
              const startDateTimeStr = `${format(startDate, 'yyyy-MM-dd')} ${startTime}`;
              const startDt = parse(startDateTimeStr, 'yyyy-MM-dd HH:mm', new Date());

              if (isValid(startDt)) {
                  const defaultEndDt = addHours(startDt, 10); // Default 10 hours shift
                  setValue('endTime', format(defaultEndDt, 'HH:mm'), { shouldValidate: true }); // Trigger validation
                  setValue('endsNextDay', !isSameDay(startDt, defaultEndDt));
              }
          }
          // No automatic reset of endTime when startTime is invalid to avoid frustrating user input
      }
  }, [startDate, startTime, setValue, initialData, existingId]); // Add initialData and existingId to dependencies

   // Effect to trigger validation for break times when includeBreak changes
   useEffect(() => {
       trigger(["breakStartTime", "breakEndTime"]);
   }, [includeBreak, trigger]);


  async function onSubmit(values: WorkdayFormValues) {
    onCalculationStart();
    // Generate a new ID if adding, use existing ID if editing
    const calculationId = existingId || `day_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    try {
        // Use the modified action that accepts values and ID
        const result = await calculateSingleWorkday(values, calculationId);
        onCalculationComplete(result); // Pass the full result back to the page
        // Toast notifications are now handled in the parent page component
    } catch (error) {
        console.error("Calculation error:", error);
        const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
        // Pass error back to parent
        onCalculationComplete({ error: `Error al calcular día ${calculationId}: ${errorMessage}` });
        // Toast handled in parent
    }
  }


  return (
    // Removed the outer Card component, assuming the parent page provides it
    // <Card className="bg-card shadow-lg rounded-lg">
    //   <CardHeader> ... </CardHeader>
    //   <CardContent> ... </CardContent>
    // </Card>
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
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
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
                        onSelect={(date) => field.onChange(date || new Date())} // Handle null case
                        disabled={(date) =>
                          date < new Date('1900-01-01')
                        }
                        initialFocus
                        locale={es}
                      />
                    </PopoverContent>
                  </Popover>
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
                   <CardTitle className="text-base text-primary">Configurar Descanso</CardTitle>
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
                           <Input type="time" {...field} value={field.value || ''} className="text-base" />
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
                           <Input type="time" {...field} value={field.value || ''} className="text-base" />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                   />
                 </div>
               </CardContent>
             </Card>
           )}


            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {existingId ? 'Guardando Cambios...' : 'Agregando Día...'}
                </>
              ) : (
                 existingId ? <><Save className="mr-2 h-4 w-4" /> Guardar Cambios</> : <><Plus className="mr-2 h-4 w-4" /> Agregar Día a la Quincena</>
              )}
            </Button>
          </form>
        </Form>
  );
};
