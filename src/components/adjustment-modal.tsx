// src/components/adjustment-modal.tsx
'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea'; // Use Textarea for description
import type { AdjustmentItem } from '@/types';
import { Save, X } from 'lucide-react';
import { cn } from '@/lib/utils'; // Import cn for conditional classes

// Schema for the modal form
const adjustmentSchema = z.object({
  monto: z.coerce // Coerce input to number
    .number({ invalid_type_error: 'El monto debe ser un número.' })
    .positive({ message: 'El monto debe ser mayor que cero.' }),
  descripcion: z.string().optional(), // Description is optional
});

type AdjustmentFormValues = z.infer<typeof adjustmentSchema>;

interface AdjustmentModalProps {
  type: 'ingreso' | 'deduccion';
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<AdjustmentItem, 'id'>) => void;
  initialData?: Omit<AdjustmentItem, 'id'>; // For editing
}

export const AdjustmentModal: React.FC<AdjustmentModalProps> = ({
  type,
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const form = useForm<AdjustmentFormValues>({
    resolver: zodResolver(adjustmentSchema),
    // Initial default values - these will be overridden by useEffect
    defaultValues: {
      monto: undefined,
      descripcion: '',
    },
  });

  // Reset form when initialData changes or modal opens/closes
   React.useEffect(() => {
        if (isOpen) {
            let resetValues: Partial<AdjustmentFormValues>;
            if (initialData) {
                // Editing existing item
                resetValues = {
                    monto: initialData.monto,
                    descripcion: initialData.descripcion || '',
                };
            } else {
                // Adding NEW item (income or deduction) - no defaults
                resetValues = {
                    monto: undefined, // Use undefined to clear number input properly
                    descripcion: '',
                };
            }
            form.reset(resetValues);
            form.clearErrors(); // Clear previous errors
        }
    }, [isOpen, initialData, form, type]); // Added `type` dependency


  const onSubmit = (values: AdjustmentFormValues) => {
    onSave({
      monto: values.monto,
      descripcion: values.descripcion || '', // Ensure empty string if undefined
    });
    onClose(); // Close modal after saving
  };

  const title = type === 'ingreso' ? 'Agregar Otro Ingreso / Ajuste a Favor' : 'Agregar Otra Deducción / Descuento';
  const description = type === 'ingreso' ? 'Ingresa el monto y una descripción opcional para el ingreso adicional.' : 'Ingresa el monto y una descripción opcional para la deducción adicional.';
  const amountLabel = type === 'ingreso' ? 'Monto a Sumar' : 'Monto a Descontar';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <FormField
              control={form.control}
              name="monto"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{amountLabel}</FormLabel>
                  <FormControl>
                     {/* Use type="number", step="any" for decimals */}
                     {/* Apply destructive ring color only on focus for deduction */}
                    <Input
                      type="number"
                      step="any"
                      min="0.01" // Ensure positive
                      placeholder="0.00"
                      className={cn(
                        // Apply focus ring color, not border by default
                        type === 'deduccion' && 'focus-visible:ring-destructive'
                      )}
                      {...field}
                      // Handle undefined case for initial render if default is undefined
                      value={field.value === undefined ? '' : field.value}
                      onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="descripcion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ej: Bonificación, Préstamo..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <DialogFooter className="mt-4">
                 <DialogClose asChild>
                     {/* Cancel button: outline variant, red on hover */}
                    <Button type="button" variant="outline" className="hover:bg-red-600 hover:text-white">
                      <X className="mr-2 h-4 w-4" /> Cancelar
                    </Button>
                  </DialogClose>
                 {/* Save button: default variant, green on hover */}
                <Button
                    type="submit"
                    variant="default" // Use default variant
                    className="hover:bg-green-600 hover:text-white" // Green only on hover
                 >
                  <Save className="mr-2 h-4 w-4" /> Guardar {type === 'ingreso' ? 'Ingreso' : 'Deducción'}
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
