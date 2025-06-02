// src/components/saved-payroll-list.tsx
'use client';

import type { FC } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileSearch, FileDown, Trash2, Users, Download, FolderUp, FileJson } from 'lucide-react';
import type { SavedPayrollData } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency, formatHours } from './results-display';
import { AlertDialog, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { AUXILIO_TRANSPORTE_VALOR_QUINCENAL } from '@/config/payroll-values'; // Import the centralized value

interface SavedPayrollListProps {
  payrolls: SavedPayrollData[];
  onLoad: (key: string) => void;
  onDelete: (key: string) => void;
  onBulkExport: () => void; // For PDF
  onExportJson: () => void; // Function to trigger JSON export
  onImportJsonClick: () => void; // Function to trigger the file input click for JSON import
}

export const SavedPayrollList: FC<SavedPayrollListProps> = ({
    payrolls,
    onLoad,
    onDelete,
    onBulkExport,
    onExportJson,
    onImportJsonClick,
}) => {

    // Helper function to calculate final net pay for display
    const calculateNetoAPagar = (payroll: SavedPayrollData): number => {
        const baseMasExtras = payroll.summary.pagoTotalConSalarioQuincena;
        // Use the imported constant for transport allowance value
        const auxTransporteAplicado = payroll.incluyeAuxTransporte ? AUXILIO_TRANSPORTE_VALOR_QUINCENAL : 0;
        const totalOtrosIngresos = (payroll.otrosIngresosLista || []).reduce((sum, item) => sum + item.monto, 0);
        const totalOtrasDeduccionesManuales = (payroll.otrasDeduccionesLista || []).reduce((sum, item) => sum + item.monto, 0);

        const totalDevengadoBruto = baseMasExtras + auxTransporteAplicado + totalOtrosIngresos;

        // IBC (Ingreso Base de Cotización) = Salario Base Quincenal + Total Recargos/Extras + Total Otros Ingresos Manuales
        // Auxilio de transporte NO hace parte del IBC.
        const ibcEstimadoQuincenal = payroll.summary.salarioBaseQuincenal + payroll.summary.totalPagoRecargosExtrasQuincena + totalOtrosIngresos;

        const deduccionSaludQuincenal = payroll.incluyeDeduccionSalud ? ibcEstimadoQuincenal * 0.04 : 0;
        const deduccionPensionQuincenal = payroll.incluyeDeduccionPension ? ibcEstimadoQuincenal * 0.04 : 0;
        const totalDeduccionesLegales = deduccionSaludQuincenal + deduccionPensionQuincenal;

        const subtotalNetoParcial = totalDevengadoBruto - totalDeduccionesLegales;
        return subtotalNetoParcial - totalOtrasDeduccionesManuales;
    };


  return (
    <Card className="shadow-lg bg-card">
      <CardHeader className="relative flex flex-col items-start justify-between pb-4">
         <div className="absolute top-4 right-4 flex items-center gap-1">
             <Button
                 variant="outline"
                 size="sm"
                 onClick={onImportJsonClick}
                 className="px-2 py-1 h-auto hover:bg-blue-600 hover:text-white"
                 title="Importar Nóminas (JSON)"
             >
                 <FolderUp className="mr-1 h-3 w-3" /> JSON
             </Button>
             <Button
                 variant="outline"
                 size="sm"
                 onClick={onExportJson}
                 disabled={payrolls.length === 0}
                 className="px-2 py-1 h-auto hover:bg-green-600 hover:text-white"
                 title="Exportar Nóminas (JSON)"
             >
                 <Download className="mr-1 h-3 w-3" /> JSON
             </Button>
              <Button
                 variant="outline"
                 size="sm"
                 onClick={onBulkExport}
                 disabled={payrolls.length === 0}
                 className="px-2 py-1 h-auto hover:bg-red-600 hover:text-white"
                 title="Exportar Lista Nóminas (PDF)"
              >
                 <FileDown className="mr-1 h-3 w-3" /> PDF
              </Button>
        </div>
        <div className="flex-1 pr-24 pt-12">
            <CardTitle className="flex items-center gap-2 text-lg text-foreground">
              <Users className="h-4 w-4" /> Nóminas Guardadas ({payrolls.length})
            </CardTitle>
            <CardDescription> Carga, elimina o exporta nóminas guardadas. </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {payrolls.length > 0 ? (
          <ul className="space-y-4 max-h-[70vh] lg:max-h-[calc(100vh-250px)] overflow-y-auto pr-2">
            {payrolls.map((payroll) => {
                 const netoFinal = calculateNetoAPagar(payroll);
                 const totalDevengadoBrutoDirecto = payroll.summary.pagoTotalConSalarioQuincena + (payroll.incluyeAuxTransporte ? AUXILIO_TRANSPORTE_VALOR_QUINCENAL : 0) + (payroll.otrosIngresosLista || []).reduce((s,i)=>s+i.monto, 0);
                 return (
                    <li key={payroll.key} className="relative p-4 border rounded-lg shadow-sm bg-secondary/30 flex flex-col justify-between gap-3">
                      <div className="flex-grow min-w-0 pr-16">
                        <p className="font-semibold text-lg truncate text-foreground">{payroll.employeeName || payroll.employeeId}</p>
                        <p className="text-sm text-muted-foreground"> Período: {format(payroll.periodStart, 'dd MMM', { locale: es })} - {format(payroll.periodEnd, 'dd MMM yyyy', { locale: es })} </p>
                         <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                            <span className="text-muted-foreground">Dev. Bruto:</span><span className="font-medium text-foreground text-right">{formatCurrency(totalDevengadoBrutoDirecto)}</span>
                            <span className="text-muted-foreground">Neto Estimado:</span><span className="font-semibold text-primary text-right">{formatCurrency(netoFinal)}</span>
                         </div>
                        <p className="text-xs text-muted-foreground mt-1"> Guardado: {payroll.createdAt ? format(payroll.createdAt, 'dd/MM/yyyy HH:mm', { locale: es }) : 'Fecha no disponible'} </p>
                      </div>
                      <div className="absolute top-2 right-2 flex flex-col gap-1 flex-shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => onLoad(payroll.key)} title="Cargar y Editar Nómina" className="h-8 w-8">
                          <FileSearch className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" title="Eliminar Nómina Guardada" className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                                   onClick={() => onDelete(payroll.key)}
                              >
                                  <Trash2 className="h-4 w-4" />
                              </Button>
                          </AlertDialogTrigger>
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
