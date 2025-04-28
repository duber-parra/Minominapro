'use client';

import type { FC } from 'react';
import React, { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format, parse, addHours, isValid, isSameDay } from 'date-fns';

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

const formSchema = z.object({
  startDate: z.date({
    required_error: 'Start date is required.',
  }),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Invalid time format (HH:mm).',
  }),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Invalid time format (HH:mm).',
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
        const defaultEndDt = addHours(startDt, 10);
        setValue('endTime', format(defaultEndDt, 'HH:mm'));
        setValue('endsNextDay', !isSameDay(startDt, defaultEndDt));
      }
    }
  }, [startDate, startTime, setValue]);

  async function onSubmit(values: WorkdayFormValues) {
    onCalculationStart();
    try {
        const result = await calculateWorkday(values);
        onCalculationComplete(result);
    } catch (error) {
        console.error("Calculation error:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
        onCalculationComplete({ error: errorMessage });
         toast({
           title: 'Calculation Failed',
           description: errorMessage,
           variant: 'destructive',
         });
    }
  }


  return (
    <Card className="bg-card shadow-lg rounded-lg">
      <CardHeader>
        <CardTitle className="text-primary">Enter Work Period</CardTitle>
        <CardDescription>Provide the start and end times for calculation.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Start Date</FormLabel>
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
                            format(field.value, 'PPP')
                          ) : (
                            <span>Pick a date</span>
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
                    <FormLabel>Start Time</FormLabel>
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
                    <FormLabel>End Time</FormLabel>
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
                      Ends on the next day
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
                       Deduct standard break time (3 PM - 6 PM)
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Calculating...
                </>
              ) : (
                'Calculate Pay'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};


// Need Card components for the layout
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
