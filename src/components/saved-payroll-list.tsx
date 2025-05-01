
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
  if (payrolls.length === 0) {
    return null; // Don't render anything if there are no saved payrolls
  }

  return (
    <Card className="mb-8 shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle className="text-primary flex items-center gap-2">
              <Users className="h-5 w-5" /> Nóminas Guardadas ({payrolls.length})
            </CardTitle>
            <CardDescription>
              Lista de nóminas quincenales guardadas localmente. Puedes cargarlas para editar o eliminarlas.
            </CardDescription>
        </div>
        <Button onClick={onBulkExport} variant="outline" disabled={payrolls.length === 0}>
          <FileDown className="mr-2 h-4 w-4" /> Exportar Todo
        </Button>
      </CardHeader>
      <CardContent>
        {payrolls.length > 0 ? (
          <ul className="space-y-4">
            {payrolls.map((payroll) => (
              <li key={payroll.key} className="p-4 border rounded-lg shadow-sm bg-secondary/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex-grow">
                  <p className="font-semibold text-lg text-primary">{payroll.employeeId}</p>
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
                <div className="flex gap-2 flex-shrink-0 mt-2 sm:mt-0">
                  <Button variant="outline" size="sm" onClick={() => onLoad(payroll.key)} title="Cargar y Editar Nómina">
                    <FileSearch className="mr-2 h-4 w-4" /> Cargar
                  </Button>
                  {/* Wrap the Trigger and Button within AlertDialog */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" onClick={() => onDelete(payroll.key)} title="Eliminar Nómina Guardada">
                            <Trash2 className="mr-2 h-4 w-4" /> Eliminar
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
