// src/components/payroll-settings-form.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { getPayrollSettings, savePayrollSettings } from '@/services/payroll-settings-service';
import type { PayrollSettings } from '@/types/payroll-settings';
import { defaultPayrollSettings } from '@/types/payroll-settings';
import { Loader2, Save } from 'lucide-react';

const payrollSettingsSchema = z.object({
  salarioBaseQuincenal: z.coerce.number().positive({ message: "Debe ser un número positivo." }),
  umbralHorasDiarias: z.coerce.number().positive({ message: "Debe ser un número positivo." }),
  auxilioTransporte: z.coerce.number().min(0, { message: "Debe ser un número positivo o cero." }),
  recargoNoctBase: z.coerce.number().min(0),
  hed: z.coerce.number().min(0), // Hora Extra Diurna
  hen: z.coerce.number().min(0), // Hora Extra Nocturna
  recargoDomDiurnoBase: z.coerce.number().min(0),
  recargoDomNoctBase: z.coerce.number().min(0),
  heddF: z.coerce.number().min(0), // Hora Extra Dominical/Festiva Diurna
  hendF: z.coerce.number().min(0), // Hora Extra Dominical/Festiva Nocturna
  ordinariaDiurnaBase: z.coerce.number().min(0), // Typically 0 if base salary covers this
});

type PayrollSettingsFormValues = z.infer<typeof payrollSettingsSchema>;

export function PayrollSettingsForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<PayrollSettingsFormValues>({
    resolver: zodResolver(payrollSettingsSchema),
    defaultValues: defaultPayrollSettings, // Initialize with defaults
  });

  useEffect(() => {
    async function loadSettings() {
      console.log("[PayrollSettingsForm] useEffect: Loading settings...");
      setIsLoading(true);
      try {
        const settings = await getPayrollSettings();
        console.log("[PayrollSettingsForm] useEffect: Settings loaded from service:", settings);
        form.reset(settings);
      } catch (error) {
        console.error("[PayrollSettingsForm] useEffect: Error loading settings:", error);
        toast({
          title: "Error al Cargar Configuración",
          description: "No se pudo cargar la configuración. Usando valores por defecto.",
          variant: "destructive",
        });
        // Form already has default values, so no explicit reset to defaults needed here
      } finally {
        setIsLoading(false);
        console.log("[PayrollSettingsForm] useEffect: Loading finished.");
      }
    }
    loadSettings();
  }, [form, toast]);

  const onSubmit = async (values: PayrollSettingsFormValues) => {
    console.log("[PayrollSettingsForm] onSubmit: Form values submitted:", values);
    setIsSaving(true);
    try {
      await savePayrollSettings(values);
      toast({
        title: "Configuración Guardada",
        description: "Los valores de nómina han sido actualizados.",
      });
      // Optionally, re-fetch settings to confirm they are saved and update the form
      // This might be redundant if navigation or full reload happens
      // const updatedSettings = await getPayrollSettings();
      // form.reset(updatedSettings);
    } catch (error) {
      console.error("[PayrollSettingsForm] onSubmit: Error saving settings:", error);
      toast({
        title: "Error al Guardar",
        description: `No se pudo guardar la configuración: ${error instanceof Error ? error.message : "Error desconocido."}`,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Cargando configuración...</p>
      </div>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Configuración de Nómina</CardTitle>
        <CardDescription>
          Define los valores utilizados para el cálculo de nómina. Estos valores se guardarán y aplicarán globalmente.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="salarioBaseQuincenal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Salario Base Quincenal</FormLabel>
                    <FormControl><Input type="number" placeholder="Ej: 711750" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="umbralHorasDiarias"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Umbral Horas Diarias (Base)</FormLabel>
                    <FormControl><Input type="number" step="0.01" placeholder="Ej: 7.66" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="auxilioTransporte"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Auxilio de Transporte Quincenal</FormLabel>
                    <FormControl><Input type="number" placeholder="Ej: 100000" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="ordinariaDiurnaBase"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Hora Ordinaria Diurna Base (si aplica)</FormLabel>
                    <FormControl><Input type="number" step="0.01" placeholder="Ej: 0 o 5417" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <h3 className="text-md font-semibold mt-6 pt-4 border-t">Valores de Recargos y Horas Extras</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="recargoNoctBase"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recargo Nocturno (Base)</FormLabel>
                    <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="hed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora Extra Diurna (HED)</FormLabel>
                    <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="hen"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora Extra Nocturna (HEN)</FormLabel>
                    <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="recargoDomDiurnoBase"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recargo Dominical/Festivo Diurno (Base)</FormLabel>
                    <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="recargoDomNoctBase"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recargo Dominical/Festivo Nocturno (Base)</FormLabel>
                    <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="heddF"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora Extra Dominical/Festiva Diurna (HEDD/F)</FormLabel>
                    <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="hendF"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora Extra Dominical/Festiva Nocturna (HEND/F)</FormLabel>
                    <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" className="w-full mt-8" disabled={isSaving || isLoading}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Guardar Cambios
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

