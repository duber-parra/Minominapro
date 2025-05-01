
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

    // Helper function to calculate final net pay for display
    const calculateNetoAPagar = (payroll: SavedPayrollData): number => {
        const baseMasExtras = payroll.summary.pagoTotalConSalarioQuincena;
        const auxTransporteValorConfig = 100000; // Assuming this value, ideally get from config
        const auxTransporteAplicado = payroll.incluyeAuxTransporte ? auxTransporteValorConfig : 0;
        const totalOtrosIngresos = (payroll.otrosIngresosLista || []).reduce((sum, item) => sum + item.monto, 0);
        const totalOtrasDeducciones = (payroll.otrasDeduccionesLista || []).reduce((sum, item) => sum + item.monto, 0);

        // Calculate Total Devengado Bruto
        const totalDevengadoBruto = baseMasExtras + auxTransporteAplicado + totalOtrosIngresos;

        // Estimate legal deductions (IBC excludes transport allowance)
        const ibcEstimadoQuincenal = baseMasExtras + totalOtrosIngresos;
        const deduccionSaludQuincenal = ibcEstimadoQuincenal * 0.04;
        const deduccionPensionQuincenal = ibcEstimadoQuincenal * 0.04;
        const totalDeduccionesLegales = deduccionSaludQuincenal + deduccionPensionQuincenal;

        // Calculate Subtotal Neto Parcial
        const subtotalNetoParcial = totalDevengadoBruto - totalDeduccionesLegales;

        // Calculate final net pay
        return subtotalNetoParcial - totalOtrasDeducciones;
    };


  return (
    <Card className="shadow-lg bg-card">
      <CardHeader className="relative flex flex-row items-start justify-between pb-4"> {/* Use relative for positioning button */}
        <div className="flex-1 pr-16"> {/* Add padding to prevent overlap */}
            <CardTitle className="flex items-center gap-2 text-lg text-foreground"> {/* Reduced size */}
              <Users className="h-4 w-4" /> Nóminas Guardadas ({payrolls.length}) {/* Reduced icon size */}
            </CardTitle>
            <CardDescription>
              {payrolls.length > 0
                ? 'Carga o elimina nóminas guardadas.' // Simplified
                : 'No hay nóminas guardadas.'
              }
            </CardDescription>
        </div>
         {/* Export Button: Positioned absolute top-right */}
        <Button onClick={onBulkExport} variant="outline" size="sm" disabled={payrolls.length === 0} className="absolute top-4 right-4 px-2 py-1 h-auto"> {/* Adjust size and padding */}
          <FileDown className="mr-1 h-3 w-3" /> PDF {/* Changed text and icon size */}
        </Button>
      </CardHeader>
      <CardContent>
        {payrolls.length > 0 ? (
          <ul className="space-y-4 max-h-[70vh] lg:max-h-[calc(100vh-250px)] overflow-y-auto pr-2">
            {payrolls.map((payroll) => {
                 const netoFinal = calculateNetoAPagar(payroll); // Calculate final net pay
                 return (
                    <li key={payroll.key} className="relative p-4 border rounded-lg shadow-sm bg-secondary/30 flex flex-col justify-between gap-3">
                      <div className="flex-grow min-w-0 pr-16"> {/* Add right padding here too */}
                        <p className="font-semibold text-lg truncate text-foreground">{payroll.employeeId}</p>
                        <p className="text-sm text-muted-foreground">
                          Período: {format(payroll.periodStart, 'dd MMM', { locale: es })} - {format(payroll.periodEnd, 'dd MMM yyyy', { locale: es })}
                        </p>
                         <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                            <span className="text-muted-foreground">Dev. Bruto:</span><span className="font-medium text-foreground text-right">{formatCurrency(payroll.summary.pagoTotalConSalarioQuincena + (payroll.incluyeAuxTransporte ? 100000 : 0) + (payroll.otrosIngresosLista || []).reduce((s,i)=>s+i.monto, 0) )}</span>
                            <span className="text-muted-foreground">Neto Estimado:</span><span className="font-semibold text-accent text-right">{formatCurrency(netoFinal)}</span>
                         </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Guardado: {format(payroll.createdAt || new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}
                        </p>
                      </div>
                      <div className="absolute top-2 right-2 flex flex-row gap-1 flex-shrink-0"> {/* Changed to flex-row */}
                        <Button variant="ghost" size="icon" onClick={() => onLoad(payroll.key)} title="Cargar y Editar Nómina" className="h-8 w-8">
                          <FileSearch className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                           {/* Ensure AlertDialogTrigger is inside AlertDialog */}
                          <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => onDelete(payroll.key)} title="Eliminar Nómina Guardada" className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8">
                                  <Trash2 className="h-4 w-4" />
                              </Button>
                          </AlertDialogTrigger>
                           {/* Content is defined elsewhere in page.tsx */}
                        </AlertDialog>
                      </div>
                    </li>
                 )
              })}
          </ul>
        ) : (
          <p className="text-center text-muted-foreground italic py-4">No hay nóminas guardadas.</p>
        )}
      </CardContent>
    </Card>
  );
};
