
// src/components/saved-payroll-list.tsx
'use client';

import type { FC } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileSearch, FileDown, Trash2, Users } from 'lucide-react';
import type { SavedPayrollData } from '@/types'; // Ensure this type is correctly defined
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from './results-display'; // Assuming formatCurrency is exported
import { AlertDialog, AlertDialogTrigger } from '@/components/ui/alert-dialog'; // Import for delete confirmation

interface SavedPayrollListProps {
  payrolls: SavedPayrollData[];
  onLoad: (key: string) => void;
  onDelete: (key: string) => void; // Changed to accept key for deletion confirmation
  onBulkExport: () => void;
}

export const SavedPayrollList: FC<SavedPayrollListProps> = ({ payrolls, onLoad, onDelete, onBulkExport }) => {
//   Removed the early return to always show the card header
//   if (payrolls.length === 0) {
//     return null; // Don't render anything if there are no saved payrolls
//   }

  return (
    <Card className="shadow-lg bg-card"> {/* Removed mb-8 */}
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle className="flex items-center gap-2 text-xl text-foreground">
              <Users className="h-5 w-5" /> Nóminas Guardadas ({payrolls.length})
            </CardTitle>
            <CardDescription>
              {payrolls.length > 0
                ? 'Lista de nóminas quincenales guardadas localmente. Puedes cargarlas para editar o eliminarlas.'
                : 'No hay nóminas guardadas en este momento.'
              }
            </CardDescription>
        </div>
        <Button onClick={onBulkExport} variant="outline" disabled={payrolls.length === 0}>
          <FileDown className="mr-2 h-4 w-4" /> Exportar Todo
        </Button>
      </CardHeader>
      <CardContent>
        {payrolls.length > 0 ? (
          <ul className="space-y-4 max-h-[70vh] lg:max-h-[calc(100vh-250px)] overflow-y-auto pr-2"> {/* Added max-height and scroll */}
            {payrolls.map((payroll) => (
              <li key={payroll.key} className="relative p-4 border rounded-lg shadow-sm bg-secondary/30 flex flex-col justify-between gap-3"> {/* Use relative positioning for absolute icons */}
                <div className="flex-grow min-w-0 pr-16"> {/* Add padding-right to avoid overlap */}
                  <p className="font-semibold text-lg truncate text-foreground">{payroll.employeeId}</p> {/* Added truncate */}
                  <p className="text-sm text-muted-foreground">
                    Período: {format(payroll.periodStart, 'dd MMM', { locale: es })} - {format(payroll.periodEnd, 'dd MMM yyyy', { locale: es })}
                  </p>
                   {/* Displaying key summary figures */}
                   <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      <span>Devengado:</span><span className="font-medium text-right">{formatCurrency(payroll.summary.totalPagoRecargosExtrasQuincena)}</span> {/* Show only extras/surcharges */}
                      {/* Simplified Deductions display - Placeholder */}
                      {/* <span>Deduc. Ley:</span><span className="font-medium text-destructive text-right">-{formatCurrency(payroll.summary.totalPagoDetallado.Ordinaria_Diurna_Base)}</span>  */}
                      <span>Neto Estimado:</span><span className="font-semibold text-accent text-right">{formatCurrency(payroll.summary.pagoTotalConSalarioQuincena)}</span>
                   </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Guardado: {format(payroll.createdAt || new Date(), 'dd/MM/yyyy HH:mm', { locale: es })} {/* Display creation/save time */}
                  </p>
                </div>
                {/* Button container: Positioned absolutely top-right */}
                <div className="absolute top-2 right-2 flex flex-row gap-1 flex-shrink-0"> {/* Changed to row layout and absolute positioning */}
                  <Button variant="ghost" size="icon" onClick={() => onLoad(payroll.key)} title="Cargar y Editar Nómina" className="h-8 w-8"> {/* Changed to icon size */}
                    <FileSearch className="h-4 w-4" />
                  </Button>
                  {/* Wrap the Trigger and Button within AlertDialog */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => onDelete(payroll.key)} title="Eliminar Nómina Guardada" className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"> {/* Changed to icon size */}
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </AlertDialogTrigger>
                    {/* The AlertDialogContent is managed in the parent component (page.tsx)
                        This structure assumes onDelete prop triggers the dialog visibility in the parent */}
                  </AlertDialog>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-center text-muted-foreground italic py-4">No hay nóminas guardadas.</p>
        )}
      </CardContent>
    </Card>
  );
};
