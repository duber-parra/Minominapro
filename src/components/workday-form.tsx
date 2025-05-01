
'use client';

import type { FC } from 'react';
import React, { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { calculateWorkday } from '@/actions/calculate-workday'; // Assuming server action exists
import type { CalculationResults, CalculationError } from '@/types'; // Assuming types are defined
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"; // Import Card components
import { Switch } from '@/components/ui/switch'; // Import Switch

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
      // If break is included, start and end times must be valid HH:mm format
      return timeRegex.test(data.breakStartTime ?? '') && timeRegex.test(data.breakEndTime ?? '');
    }
    return true; // Not required if includeBreak is false
  },
  {
    message: "Las horas de inicio y fin del descanso son requeridas y deben tener formato HH:mm si se incluye descanso.",
    // Apply error to both fields potentially, or pick one as anchor
    path: ["breakStartTime"],
  }
)
.refine(
    (data) => {
        // If break included and both times are valid format, check if end is after start
        if (data.includeBreak && timeRegex.test(data.breakStartTime ?? '') && timeRegex.test(data.breakEndTime ?? '')) {
             // Basic time comparison HH:mm > HH:mm
             return data.breakEndTime! > data.breakStartTime!;
        }
        return true; // Pass validation if break not included or times are invalid format (handled by previous refine/regex)
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
}

export const WorkdayForm: FC<WorkdayFormProps> = ({
  onCalculationStart,
  onCalculationComplete,
  isLoading,
}) => {
  const { toast } = useToast();
  const form = useForm<WorkdayFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      startDate: new Date(),
      startTime: '',
      endTime: '',
      endsNextDay: false,
      includeBreak: false,
      breakStartTime: '15:00', // Default break start
      breakEndTime: '18:00',   // Default break end
    },
  });

  const { watch, setValue, trigger } = form;
  const startDate = watch('startDate');
  const startTime = watch('startTime');
  const includeBreak = watch('includeBreak');

  // Effect to update default end time and next day checkbox
  useEffect(() => {
    if (startDate && startTime && /^\d{2}:\d{2}$/.test(startTime)) {
      const startDateTimeStr = `${format(startDate, 'yyyy-MM-dd')} ${startTime}`;
      const startDt = parse(startDateTimeStr, 'yyyy-MM-dd HH:mm', new Date());

      if (isValid(startDt)) {
        const defaultEndDt = addHours(startDt, 10); // Default 10 hours shift
        setValue('endTime', format(defaultEndDt, 'HH:mm'));
        setValue('endsNextDay', !isSameDay(startDt, defaultEndDt));
      }
    }
     // Reset end time if start time becomes invalid or empty
    else if (!startTime || !/^\d{2}:\d{2}$/.test(startTime)) {
        // setValue('endTime', ''); // Keep commented to avoid clearing user input unnecessarily
        // setValue('endsNextDay', false);
    }
  }, [startDate, startTime, setValue]);

   // Effect to trigger validation when includeBreak changes
   useEffect(() => {
     if (includeBreak) {
       trigger(["breakStartTime", "breakEndTime"]);
     }
   }, [includeBreak, trigger]);


  async function onSubmit(values: WorkdayFormValues) {
    onCalculationStart();
    try {
        const result = await calculateWorkday(values);
        onCalculationComplete(result);
        if ('error' in result) {
           toast({
               title: 'Error en el Cálculo',
               description: result.error,
               variant: 'destructive',
           });
        }
    } catch (error) {
        console.error("Calculation error:", error);
        const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
        onCalculationComplete({ error: "Hubo un error en el servidor al calcular." });
         toast({
           title: 'Cálculo Fallido',
           description: "Hubo un error en el servidor al calcular.",
           variant: 'destructive',
         });
    }
  }


  return (
    <Card className="bg-card shadow-lg rounded-lg">
      <CardHeader>
        <CardTitle className="text-primary">Ingresar Periodo Laboral</CardTitle>
        <CardDescription>Proporciona las horas de inicio y fin para el cálculo.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha de Inicio</FormLabel>
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
                            format(field.value, 'PPP', { locale: es }) // Use Spanish locale
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
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date < new Date('1900-01-01')
                        }
                        initialFocus
                        locale={es} // Use Spanish locale for calendar
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
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
                control={form.control}
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
              control={form.control}
              name="endsNextDay"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-secondary/50">
                   <div className="space-y-0.5">
                    <FormLabel>Termina al día siguiente</FormLabel>
                   </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      aria-readonly
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
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
                   <CardTitle className="text-base text-primary">Configurar Descanso</CardTitle>
                 </CardHeader>
               <CardContent className="space-y-4 pt-0 pb-4">
                 <div className="grid grid-cols-2 gap-4">
                   <FormField
                     control={form.control}
                     name="breakStartTime"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>Inicio del Descanso</FormLabel>
                         <FormControl>
                           <Input type="time" {...field} className="text-base" />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                   />
                   <FormField
                     control={form.control}
                     name="breakEndTime"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>Fin del Descanso</FormLabel>
                         <FormControl>
                           <Input type="time" {...field} className="text-base" />
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
                  Calculando...
                </>
              ) : (
                'Calcular Pago'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

