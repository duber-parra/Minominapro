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


const formSchema = z.object({
  startDate: z.date({
    required_error: 'La fecha de inicio es requerida.',
  }),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Formato de hora inválido (HH:mm).',
  }),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Formato de hora inválido (HH:mm).',
  }),
  endsNextDay: z.boolean().default(false),
  includeBreak: z.boolean().default(false),
});

type WorkdayFormValues = z.infer<typeof formSchema>;

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
    },
  });

  const { watch, setValue } = form;
  const startDate = watch('startDate');
  const startTime = watch('startTime');

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
        // setValue('endTime', '');
        // setValue('endsNextDay', false); // Optionally reset this too
    }
  }, [startDate, startTime, setValue]);

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
        onCalculationComplete({ error: errorMessage });
         toast({
           title: 'Cálculo Fallido',
           description: errorMessage,
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
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 shadow-sm bg-secondary/50">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      id="endsNextDay"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel htmlFor="endsNextDay" className="cursor-pointer">
                      Termina al día siguiente
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="includeBreak"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 shadow-sm bg-secondary/50">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      id="includeBreak"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel htmlFor="includeBreak" className="cursor-pointer">
                       Deducir tiempo de descanso estándar (3 PM - 6 PM)
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />

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
