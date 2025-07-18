// src/components/payroll-config-modal.tsx

'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Settings, RotateCcw, Save, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { usePayrollConfig, PayrollValues } from '@/hooks/use-payroll-config';
import { PayrollConfigIndicator } from '@/components/payroll-config-indicator';

// Validation schema
const configSchema = z.object({
  Recargo_Noct_Base: z.number().min(0, 'Debe ser un valor positivo'),
  HED: z.number().min(0, 'Debe ser un valor positivo'),
  HEN: z.number().min(0, 'Debe ser un valor positivo'),
  Recargo_Dom_Diurno_Base: z.number().min(0, 'Debe ser un valor positivo'),
  Recargo_Dom_Noct_Base: z.number().min(0, 'Debe ser un valor positivo'),
  Recargo_Fest_Diurno_Base: z.number().min(0, 'Debe ser un valor positivo'),
  Recargo_Fest_Noct_Base: z.number().min(0, 'Debe ser un valor positivo'),
  HED_Dom: z.number().min(0, 'Debe ser un valor positivo'),
  HEN_Dom: z.number().min(0, 'Debe ser un valor positivo'),
  HED_Fest: z.number().min(0, 'Debe ser un valor positivo'),
  HEN_Fest: z.number().min(0, 'Debe ser un valor positivo'),
  Ordinaria_Diurna_Base: z.number().min(0, 'Debe ser un valor positivo'),
  auxilioTransporte: z.number().min(0, 'Debe ser un valor positivo'),
});

type ConfigFormValues = z.infer<typeof configSchema>;

// Labels for display
const FIELD_LABELS: Record<keyof PayrollValues, string> = {
  Recargo_Noct_Base: 'Recargo Nocturno Base',
  HED: 'Hora Extra Diurna',
  HEN: 'Hora Extra Nocturna',
  Recargo_Dom_Diurno_Base: 'Recargo Dominical Diurno Base',
  Recargo_Dom_Noct_Base: 'Recargo Dominical Nocturno Base',
  Recargo_Fest_Diurno_Base: 'Recargo Festivo Diurno Base',
  Recargo_Fest_Noct_Base: 'Recargo Festivo Nocturno Base',
  HED_Dom: 'Hora Extra Dominical Diurna',
  HEN_Dom: 'Hora Extra Dominical Nocturna',
  HED_Fest: 'Hora Extra Festiva Diurna',
  HEN_Fest: 'Hora Extra Festiva Nocturna',
  Ordinaria_Diurna_Base: 'Ordinaria Diurna Base',
};

// Descriptions for each field
const FIELD_DESCRIPTIONS: Record<keyof PayrollValues, string> = {
  Recargo_Noct_Base: 'Recargo nocturno dentro de las 7.66h base, laboral',
  HED: 'Hora extra diurna después de 7.66h, laboral, hasta las 9 PM',
  HEN: 'Hora extra nocturna después de 7.66h, laboral',
  Recargo_Dom_Diurno_Base: 'Recargo dominical diurno dentro de 7.66h',
  Recargo_Dom_Noct_Base: 'Recargo dominical nocturno dentro de 7.66h',
  Recargo_Fest_Diurno_Base: 'Recargo festivo diurno dentro de 7.66h',
  Recargo_Fest_Noct_Base: 'Recargo festivo nocturno dentro de 7.66h',
  HED_Dom: 'Hora extra dominical diurna después de 7.66h',
  HEN_Dom: 'Hora extra dominical nocturna después de 7.66h',
  HED_Fest: 'Hora extra festiva diurna después de 7.66h',
  HEN_Fest: 'Hora extra festiva nocturna después de 7.66h',
  Ordinaria_Diurna_Base: 'Horas base diurnas laborales (sin recargo adicional)',
};

export const PayrollConfigModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { config, isLoading, updateValores, updateAuxilioTransporte, resetToDefaults, saveConfig } = usePayrollConfig();
  const { toast } = useToast();

  const form = useForm<ConfigFormValues>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      ...config.valores,
      auxilioTransporte: config.auxilioTransporte,
    },
  });

  // Update form when config changes
  useEffect(() => {
    if (!isLoading) {
      form.reset({
        ...config.valores,
        auxilioTransporte: config.auxilioTransporte,
      });
    }
  }, [config, isLoading, form]);

  const onSubmit = async (values: ConfigFormValues) => {
    try {
      const { auxilioTransporte, ...valores } = values;
      
      // Save the complete configuration
      await saveConfig({
        valores: valores as PayrollValues,
        auxilioTransporte,
      });

      toast({
        title: 'Configuración actualizada',
        description: 'Los valores de nómina han sido actualizados exitosamente.',
        variant: 'default',
      });

      setIsOpen(false);
    } catch (error) {
      toast({
        title: 'Error al guardar',
        description: 'No se pudo actualizar la configuración. Inténtalo de nuevo.',
        variant: 'destructive',
      });
    }
  };

  const handleReset = async () => {
    try {
      await resetToDefaults();
      toast({
        title: 'Configuración restablecida',
        description: 'Los valores han sido restablecidos a los valores por defecto.',
        variant: 'default',
      });
    } catch (error) {
      toast({
        title: 'Error al restablecer',
        description: 'No se pudo restablecer la configuración.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <Settings className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" title="Configurar valores de nómina">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline ml-2">Configurar</span>
          </Button>
          <PayrollConfigIndicator />
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuración de Valores de Nómina
          </DialogTitle>
          <DialogDescription>
            Modifica los valores por hora utilizados en los cálculos de nómina. Los valores están en pesos colombianos.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Horas Ordinarias y Recargos Base */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Horas Base (Dentro de 7.66h)</CardTitle>
                <CardDescription>
                  Valores aplicados dentro de la jornada laboral normal
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="Ordinaria_Diurna_Base"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{FIELD_LABELS.Ordinaria_Diurna_Base}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        {FIELD_DESCRIPTIONS.Ordinaria_Diurna_Base}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="Recargo_Noct_Base"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{FIELD_LABELS.Recargo_Noct_Base}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        {FIELD_DESCRIPTIONS.Recargo_Noct_Base}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="Recargo_Dom_Diurno_Base"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{FIELD_LABELS.Recargo_Dom_Diurno_Base}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        {FIELD_DESCRIPTIONS.Recargo_Dom_Diurno_Base}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="Recargo_Dom_Noct_Base"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{FIELD_LABELS.Recargo_Dom_Noct_Base}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        {FIELD_DESCRIPTIONS.Recargo_Dom_Noct_Base}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="Recargo_Fest_Diurno_Base"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{FIELD_LABELS.Recargo_Fest_Diurno_Base}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        {FIELD_DESCRIPTIONS.Recargo_Fest_Diurno_Base}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="Recargo_Fest_Noct_Base"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{FIELD_LABELS.Recargo_Fest_Noct_Base}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        {FIELD_DESCRIPTIONS.Recargo_Fest_Noct_Base}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Horas Extras */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Horas Extras (Después de 7.66h)</CardTitle>
                <CardDescription>
                  Valores aplicados después de cumplir la jornada laboral normal
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="HED"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{FIELD_LABELS.HED}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        {FIELD_DESCRIPTIONS.HED}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="HEN"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{FIELD_LABELS.HEN}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        {FIELD_DESCRIPTIONS.HEN}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="HED_Dom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{FIELD_LABELS.HED_Dom}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        {FIELD_DESCRIPTIONS.HED_Dom}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="HEN_Dom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{FIELD_LABELS.HEN_Dom}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        {FIELD_DESCRIPTIONS.HEN_Dom}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="HED_Fest"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{FIELD_LABELS.HED_Fest}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        {FIELD_DESCRIPTIONS.HED_Fest}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="HEN_Fest"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{FIELD_LABELS.HEN_Fest}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        {FIELD_DESCRIPTIONS.HEN_Fest}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Auxilio de Transporte */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Auxilio de Transporte</CardTitle>
                <CardDescription>
                  Valor quincenal del auxilio de transporte
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="auxilioTransporte"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Auxilio de Transporte Quincenal</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="1"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        Valor quincenal del auxilio de transporte en pesos colombianos
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Separator />

            {/* Action buttons */}
            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Restablecer por defecto
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button type="submit">
                  <Save className="h-4 w-4 mr-2" />
                  Guardar cambios
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
