
// src/components/saved-payroll-list.tsx
'use client';

import type { FC } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileSearch, FileDown, Trash2, Users, FileSpreadsheet } from 'lucide-react'; // Added FileSpreadsheet
import type { SavedPayrollData } from '@/types'; // Ensure this type is correctly defined
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from './results-display'; // Assuming formatCurrency is exported and correct
import { AlertDialog, AlertDialogTrigger } from '@/components/ui/alert-dialog'; // Import for delete confirmation
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu"; // Import DropdownMenu components

interface SavedPayrollListProps {
  payrolls: SavedPayrollData[];
  onLoad: (key: string) => void;
  onDelete: (key: string) => void; // Prop to trigger the delete confirmation dialog in parent
  onBulkExport: () => void; // For PDF
  onBulkExportCSV: () => void; // For bulk CSV export
  onExportSingleCSV: (key: string) => void; // Pass callback with key
}

export const SavedPayrollList: FC<SavedPayrollListProps> = ({
    payrolls,
    onLoad,
    onDelete, // Receives the function to initiate deletion (open dialog)
    onBulkExport,
    onBulkExportCSV, // Receive bulk CSV handler
    onExportSingleCSV // Receive single CSV handler
}) => {

    // Helper function to calculate final net pay for display
    const calculateNetoAPagar = (payroll: SavedPayrollData): number => {
        const baseMasExtras = payroll.summary.pagoTotalConSalarioQuincena;
        const auxTransporteValorConfig = 100000; // Assuming this value, ideally get from config
        const auxTransporteAplicado = payroll.incluyeAuxTransporte ? auxTransporteValorConfig : 0;
        const totalOtrosIngresos = (payroll.otrosIngresosLista || []).reduce((sum, item) => sum + item.monto, 0);
        const totalOtrasDeduccionesManuales = (payroll.otrasDeduccionesLista || []).reduce((sum, item) => sum + item.monto, 0);
        const totalDevengadoBruto = baseMasExtras + auxTransporteAplicado + totalOtrosIngresos;
        const ibcEstimadoQuincenal = baseMasExtras + totalOtrosIngresos;
        const deduccionSaludQuincenal = ibcEstimadoQuincenal * 0.04;
        const deduccionPensionQuincenal = ibcEstimadoQuincenal * 0.04;
        const totalDeduccionesLegales = deduccionSaludQuincenal + deduccionPensionQuincenal;
        const subtotalNetoParcial = totalDevengadoBruto - totalDeduccionesLegales;
        return subtotalNetoParcial - totalOtrasDeduccionesManuales;
    };


  return (
    <Card className="shadow-lg bg-card">
      <CardHeader className="relative flex flex-row items-start justify-between pb-4">
        <div className="flex-1 pr-24"> {/* Adjusted padding-right for buttons */}
            <CardTitle className="flex items-center gap-2 text-lg text-foreground">
              <Users className="h-4 w-4" /> Nóminas Guardadas ({payrolls.length})
            </CardTitle>
            <CardDescription> Carga, elimina o exporta nóminas guardadas. </CardDescription>
        </div>
         <div className="absolute top-4 right-4 flex items-center gap-1">
             {/* Bulk Export Dropdown */}
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" disabled={payrolls.length === 0} className="px-2 py-1 h-auto">
                        <FileDown className="mr-1 h-3 w-3" /> Exportar Todo
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={onBulkExport} disabled={payrolls.length === 0}>
                        <FileDown className="mr-2 h-4 w-4" /> PDF (Lista)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onBulkExportCSV} disabled={payrolls.length === 0}>
                        <FileSpreadsheet className="mr-2 h-4 w-4" /> CSV (Resumen)
                    </DropdownMenuItem>
                 </DropdownMenuContent>
             </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        {payrolls.length > 0 ? (
          <ul className="space-y-4 max-h-[70vh] lg:max-h-[calc(100vh-250px)] overflow-y-auto pr-2">
            {payrolls.map((payroll) => {
                 const netoFinal = calculateNetoAPagar(payroll);
                 return (
                    <li key={payroll.key} className="relative p-4 border rounded-lg shadow-sm bg-secondary/30 flex flex-col justify-between gap-3">
                      <div className="flex-grow min-w-0 pr-16">
                        <p className="font-semibold text-lg truncate text-foreground">{payroll.employeeId}</p>
                        <p className="text-sm text-muted-foreground"> Período: {format(payroll.periodStart, 'dd MMM', { locale: es })} - {format(payroll.periodEnd, 'dd MMM yyyy', { locale: es })} </p>
                         <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                            <span className="text-muted-foreground">Dev. Bruto:</span><span className="font-medium text-foreground text-right">{formatCurrency(payroll.summary.pagoTotalConSalarioQuincena + (payroll.incluyeAuxTransporte ? 100000 : 0) + (payroll.otrosIngresosLista || []).reduce((s,i)=>s+i.monto, 0) )}</span>
                            <span className="text-muted-foreground">Neto Estimado:</span><span className="font-semibold text-primary text-right">{formatCurrency(netoFinal)}</span>
                         </div>
                        <p className="text-xs text-muted-foreground mt-1"> Guardado: {payroll.createdAt ? format(payroll.createdAt, 'dd/MM/yyyy HH:mm', { locale: es }) : 'Fecha no disponible'} </p>
                      </div>
                      <div className="absolute top-2 right-2 flex flex-row gap-1 flex-shrink-0">
                         {/* Export Single CSV Button */}
                         <Button variant="ghost" size="icon" onClick={() => onExportSingleCSV(payroll.key)} title="Exportar a CSV" className="h-8 w-8">
                             <FileSpreadsheet className="h-4 w-4" />
                         </Button>
                        {/* Load Button */}
                        <Button variant="ghost" size="icon" onClick={() => onLoad(payroll.key)} title="Cargar y Editar Nómina" className="h-8 w-8">
                          <FileSearch className="h-4 w-4" />
                        </Button>
                        {/* Delete Button Trigger */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" title="Eliminar Nómina Guardada" className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                                  onClick={() => onDelete(payroll.key)} // Call parent's onDelete prop
                              >
                                  <Trash2 className="h-4 w-4" />
                              </Button>
                          </AlertDialogTrigger>
                           {/* The AlertDialogContent is defined in page.tsx */}
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

    