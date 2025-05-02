

'use client';

import type { FC } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, CheckCircle2, Info, PlusCircle, MinusCircle, Trash2, Bus } from 'lucide-react'; // Added Bus icon
// Removed unused import: CalculationError
import type { CalculationResults, QuincenalCalculationSummary, AdjustmentItem } from '@/types';
import { Button } from './ui/button'; // Import Button
import { Switch } from './ui/switch'; // Import Switch
import { Label } from './ui/label'; // Import Label

interface ResultsDisplayProps {
  // Can receive either single day results or summary results
  results: CalculationResults | QuincenalCalculationSummary | null;
  error: string | null;
  isLoading: boolean;
  isSummary?: boolean; // Flag to indicate if displaying summary
  // New props for adjustments in summary view
  otrosIngresos?: AdjustmentItem[];
  otrasDeducciones?: AdjustmentItem[];
  onAddIngreso?: () => void; // Handler to open income modal
  onAddDeduccion?: () => void; // Handler to open deduction modal
  onDeleteIngreso?: (id: string) => void; // Handler to delete income item
  onDeleteDeduccion?: (id: string) => void; // Handler to delete deduction item
  // Props for Transportation Allowance
  incluyeAuxTransporte?: boolean;
  onToggleTransporte?: () => void;
  auxTransporteValor?: number;
  // Consider adding edit handlers if needed
}

// Mapeo de claves a etiquetas legibles en español
export const labelMap: Record<string, string> = {
    Ordinaria_Diurna_Base: 'Horas Base Diurnas (Umbral 7,66h)',
    Recargo_Noct_Base: 'Recargo Nocturno (Base)',
    Recargo_Dom_Diurno_Base: 'Recargo Dominical/Festivo Diurno (Base)',
    Recargo_Dom_Noct_Base: 'Recargo Dominical/Festivo Nocturno (Base)',
    HED: 'Horas Extras Diurnas (Laboral)',
    HEN: 'Horas Extras Nocturnas (Laboral)',
    HEDD_F: 'Horas Extras Diurnas (Dominical/Festivo)',
    HEND_F: 'Horas Extras Nocturnas (Dominical/Festivo)',
};

// --- Abbreviated Label Map for Compact Display ---
export const abbreviatedLabelMap: Record<string, string> = {
    Ordinaria_Diurna_Base: 'H.Base Diu.',
    Recargo_Noct_Base: 'Rec.Noct.',
    Recargo_Dom_Diurno_Base: 'Rec.Dom.Diu.',
    Recargo_Dom_Noct_Base: 'Rec.Dom.Noct.',
    HED: 'HED',
    HEN: 'HEN',
    HEDD_F: 'HEDD/F',
    HEND_F: 'HEND/F',
};


// Orden deseado para mostrar los resultados
export const displayOrder: (keyof CalculationResults['horasDetalladas'])[] = [
    'Ordinaria_Diurna_Base',
    'Recargo_Noct_Base',
    'Recargo_Dom_Diurno_Base',
    'Recargo_Dom_Noct_Base',
    'HED',
    'HEN',
    'HEDD_F',
    'HEND_F',
];

// Helper function for formatting currency (can be moved to utils later)
export const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0, // Changed to 0 as per user request (implicitly via example)
        maximumFractionDigits: 0, // Changed to 0 as per user request (implicitly via example)
    }).format(value);
};

// Helper function for formatting hours
export const formatHours = (hours: number): string => {
    // Display with 2 decimal places for consistency
    return hours.toLocaleString('es-CO', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};


export const ResultsDisplay: FC<ResultsDisplayProps> = ({
    results,
    error,
    isLoading,
    isSummary = false,
    otrosIngresos = [], // Default to empty array
    otrasDeducciones = [], // Default to empty array
    onAddIngreso,
    onAddDeduccion,
    onDeleteIngreso,
    onDeleteDeduccion,
    incluyeAuxTransporte = false, // Default value
    onToggleTransporte,
    auxTransporteValor = 0, // Default value
}) => {

  const renderSkeletons = () => (
    <div className="space-y-4">
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-6 w-1/2" />
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex justify-between">
            <Skeleton className="h-5 w-2/5" />
            <Skeleton className="h-5 w-1/4" />
            <Skeleton className="h-5 w-1/4" />
          </div>
        ))}
      </div>
      <Separator />
      <div className="flex justify-between font-semibold">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-6 w-1/4" />
      </div>
       <Separator />
       {isSummary && <Skeleton className="h-6 w-1/3 mb-2" />} {/* Skeleton for Transport */}
       <Skeleton className="h-6 w-1/3 mb-2" /> {/* Skeleton for Base Salary */}
      <div className="flex justify-between font-bold text-lg">
        <Skeleton className="h-7 w-2/5" />
        <Skeleton className="h-7 w-1/3" />
      </div>
       {/* Skeletons for adjustments */}
      {isSummary && (
        <>
            <Separator className="my-4" />
            <Skeleton className="h-6 w-1/3 mb-2" />
            <Skeleton className="h-5 w-full mb-1" />
            <Skeleton className="h-5 w-full mb-4" />
            <Separator className="my-4" />
            <Skeleton className="h-6 w-1/3 mb-2" />
            <Skeleton className="h-5 w-full mb-1" />
            <Skeleton className="h-5 w-full mb-4" />
            <Separator className="my-4" />
             <div className="flex justify-between font-bold text-xl">
                 <Skeleton className="h-8 w-2/5" />
                 <Skeleton className="h-8 w-1/3" />
             </div>
        </>
      )}
    </div>
  );

  const renderContent = () => {
    if (isLoading) {
      return renderSkeletons();
    }

    if (error) {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error en el Cálculo</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      );
    }

    if (!results) {
      return (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Esperando Datos</AlertTitle>
          <AlertDescription>
             {isSummary
                ? 'Agrega días trabajados o carga una nómina guardada para ver el resumen quincenal.'
                : 'Completa el formulario del día y presiona Calcular/Agregar para ver los resultados.'}
          </AlertDescription>
        </Alert>
      );
    }

    // Determine which type of results we have
    const data = isSummary ? results as QuincenalCalculationSummary : results as CalculationResults;
    const horas = isSummary ? data.totalHorasDetalladas : data.horasDetalladas;
    const pagos = isSummary ? data.totalPagoDetallado : data.pagoDetallado;
    const totalRecargosExtras = isSummary ? data.totalPagoRecargosExtrasQuincena : data.pagoTotalRecargosExtras;
    // pagoTotalConSalarioQuincena = Base + Extras (from summary calculation)
    const baseMasExtras = isSummary ? data.pagoTotalConSalarioQuincena : (data.pagoTotalRecargosExtras /* + implicit base pay not calc here */);
    const totalHorasTrabajadas = isSummary ? data.totalDuracionTrabajadaHorasQuincena : data.duracionTotalTrabajadaHoras;
    const diasCalculados = isSummary ? data.diasCalculados : 1;
    const salarioBaseQuincenal = isSummary ? data.salarioBaseQuincenal : 0;

    // Calculate Adjustment Totals (only for summary)
    const totalOtrosIngresos = isSummary ? (otrosIngresos || []).reduce((sum, item) => sum + item.monto, 0) : 0;
    const totalOtrasDeducciones = isSummary ? (otrasDeducciones || []).reduce((sum, item) => sum + item.monto, 0) : 0;

    // Determine applied transport allowance
    const auxTransporteAplicado = isSummary && incluyeAuxTransporte ? (auxTransporteValor || 0) : 0;

    // Calculate Total Devengado Bruto (Base + Extras + Aux Transporte + Otros Ingresos)
    const totalDevengadoBruto = isSummary ? baseMasExtras + auxTransporteAplicado + totalOtrosIngresos : baseMasExtras;

    // Calculate Legal Deductions (Salud 4%, Pension 4%) based on IBC
    // IBC = Total Devengado Bruto EXCLUDING Aux Transporte
    const ibcEstimadoQuincenal = isSummary ? baseMasExtras + totalOtrosIngresos : 0; // Use devengado bruto *without* transport aux
    const deduccionSaludQuincenal = isSummary ? ibcEstimadoQuincenal * 0.04 : 0;
    const deduccionPensionQuincenal = isSummary ? ibcEstimadoQuincenal * 0.04 : 0;
    const totalDeduccionesLegales = deduccionSaludQuincenal + deduccionPensionQuincenal;

    // Calculate Subtotal Neto Parcial (Total Devengado Bruto - Deducciones Ley)
    const subtotalNetoParcial = isSummary ? totalDevengadoBruto - totalDeduccionesLegales : 0;

    // Calculate Final Net Pay (Subtotal Neto Parcial - Otras Deducciones)
    const netoAPagar = isSummary ? subtotalNetoParcial - totalOtrasDeducciones : 0;


    return (
      <>
        {!isSummary && ( // Show success alert only for single day calculation success
          <Alert variant="default" className="mb-6 border-green-500 bg-green-50 dark:bg-green-900/20">
               <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
               <AlertTitle className="text-green-700 dark:text-green-300">Cálculo de Día Exitoso</AlertTitle>
               <AlertDescription className="text-green-600 dark:text-green-400">
                  Total horas trabajadas este día: {formatHours(totalHorasTrabajadas)}.
               </AlertDescription>
           </Alert>
        )}

        {/* --- Table for Hour Breakdown --- */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50%] text-foreground">{isSummary ? `Categoría (Total ${diasCalculados} días)` : 'Categoría (Día Actual)'}</TableHead>
              <TableHead className="text-right text-foreground">Horas</TableHead>
              <TableHead className="text-right text-foreground">Pago (Recargo/Extra)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayOrder.map((key) => {
              const horasCategoria = horas[key];
              const pagoCategoria = pagos[key];

              // Conditionally display rows based on whether they have values
              if (key === 'Ordinaria_Diurna_Base' && horasCategoria <= 0) return null;
              if (key !== 'Ordinaria_Diurna_Base' && horasCategoria <= 0 && pagoCategoria <= 0) return null;

              return (
                <TableRow key={key}>
                  <TableCell className="font-medium text-muted-foreground">
                    {/* Use fullLabelMap for summary, abbreviated for single day */}
                    {isSummary ? (labelMap[key] || key) : (abbreviatedLabelMap[key] || key)}
                  </TableCell>
                  <TableCell className="text-right">{formatHours(horasCategoria)}</TableCell>
                  <TableCell className="text-right">
                    {key === 'Ordinaria_Diurna_Base' ? '-' : formatCurrency(pagoCategoria)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* --- Totals Section --- */}
        <Separator className="my-4" />
        <div className="space-y-2">
             <div className="flex justify-between font-semibold text-base">
                 <span className="text-foreground">Total Horas Trabajadas {isSummary ? 'en Quincena' : 'este Día'}:</span>
                 <span className="text-foreground">{formatHours(totalHorasTrabajadas)}</span>
             </div>
             <Separator className="my-2" />
             <div className="flex justify-between font-semibold text-lg">
               <span className="text-foreground">Total Recargos y Horas Extras {isSummary ? 'Quincenales' : 'del Día'}:</span>
               <span className="text-primary">{formatCurrency(totalRecargosExtras)}</span> {/* Changed from text-accent */}
             </div>
             {isSummary && ( // Only show breakdown in summary view
                <>
                 <div className="flex justify-between text-muted-foreground">
                    <span>+ Salario Base Quincenal:</span>
                    <span>{formatCurrency(salarioBaseQuincenal)}</span>
                 </div>
                  {/* Transportation Allowance Toggle */}
                 <div className="flex justify-between items-center text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <Label htmlFor="transport-switch" className="flex items-center gap-1 cursor-pointer">
                            <Bus className="h-4 w-4" />
                            Incluir Auxilio de Transporte:
                        </Label>
                        <span>(+ {formatCurrency(auxTransporteValor || 0)})</span>
                    </div>
                    <Switch
                        id="transport-switch"
                        checked={incluyeAuxTransporte}
                        onCheckedChange={onToggleTransporte}
                        disabled={!onToggleTransporte} // Disable if handler not provided
                    />
                 </div>
                 {/* Optional: Show applied transport allowance explicitly */}
                 {/* {auxTransporteAplicado > 0 && (
                     <div className="flex justify-between text-muted-foreground">
                         <span>+ Auxilio de Transporte Aplicado:</span>
                         <span>{formatCurrency(auxTransporteAplicado)}</span>
                     </div>
                 )} */}
                 {/* Other Income (Placeholder - Actual items listed below) */}
                 {totalOtrosIngresos > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                        <span>+ Total Otros Ingresos:</span>
                        <span>{formatCurrency(totalOtrosIngresos)}</span>
                    </div>
                 )}

                 <Separator className="my-2 border-dashed" />
                 {/* Total Devengado Bruto */}
                 <div className="flex justify-between font-semibold text-lg">
                   <span className="text-foreground">Total Devengado Bruto Estimado:</span>
                   <span className="text-foreground">{formatCurrency(totalDevengadoBruto)}</span>
                 </div>
                 <Separator className="my-2" />

                 {/* Legal Deductions Section */}
                 <div className="flex justify-between text-muted-foreground">
                    <span>- Deducción Salud (4% s/IBC*):</span>
                    <span>{formatCurrency(deduccionSaludQuincenal)}</span>
                 </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>- Deducción Pensión (4% s/IBC*):</span>
                    <span>{formatCurrency(deduccionPensionQuincenal)}</span>
                 </div>
                 <Separator className="my-2 border-dashed" />
                 {/* Subtotal after Legal Deductions */}
                  <div className="flex justify-between font-medium text-base">
                    <span className="text-foreground">Subtotal (Dev. Bruto - Ded. Ley):</span>
                    <span className="text-foreground">{formatCurrency(subtotalNetoParcial)}</span>
                  </div>
                </>
             )}
        </div>

        {/* --- Adjustment Sections (Only in Summary View) --- */}
        {isSummary && (
            <>
                {/* Otros Ingresos Section */}
                <Separator className="my-4" />
                <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="font-semibold text-foreground">Otros Ingresos / Ajustes a Favor</h4>
                        <Button variant="outline" size="sm" onClick={onAddIngreso} disabled={!onAddIngreso}>
                           <PlusCircle className="mr-2 h-4 w-4" /> Añadir Ingreso
                        </Button>
                    </div>
                     {(otrosIngresos || []).length > 0 ? (
                        <ul className="space-y-1 text-sm">
                           {otrosIngresos.map(item => (
                              <li key={item.id} className="flex justify-between items-center text-muted-foreground">
                                 <span className='truncate pr-2'>{item.descripcion || 'Ingreso sin descripción'}</span>
                                 <div className="flex items-center gap-2 flex-shrink-0">
                                     <span>+ {formatCurrency(item.monto)}</span>
                                     <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive/80" onClick={() => onDeleteIngreso && onDeleteIngreso(item.id)} disabled={!onDeleteIngreso}>
                                        <Trash2 className="h-4 w-4" />
                                     </Button>
                                 </div>
                              </li>
                           ))}
                           {/* Separator removed from inside list */}
                        </ul>
                    ) : (
                        <p className="text-sm text-muted-foreground italic">No hay otros ingresos registrados.</p>
                    )}
                     {/* Show Total Otros Ingresos only if list has items */}
                    {(otrosIngresos || []).length > 0 && (
                        <>
                          <Separator className="my-2 border-dashed"/>
                           <div className="flex justify-between items-center font-medium text-foreground text-sm">
                              <span>Total Otros Ingresos (Manuales):</span>
                              <span>{formatCurrency(totalOtrosIngresos)}</span>
                           </div>
                        </>
                    )}
                </div>

                {/* Otras Deducciones Section */}
                <Separator className="my-4" />
                <div className="mb-4">
                   <div className="flex justify-between items-center mb-2">
                       <h4 className="font-semibold text-foreground">Otras Deducciones / Descuentos</h4>
                       <Button
                           variant="outline"
                           size="sm"
                           onClick={onAddDeduccion}
                           disabled={!onAddDeduccion}
                           className="hover:bg-destructive hover:text-destructive-foreground" // Red hover for deduction button
                       >
                          <MinusCircle className="mr-2 h-4 w-4" /> Añadir Deducción
                       </Button>
                    </div>
                    {(otrasDeducciones || []).length > 0 ? (
                         <ul className="space-y-1 text-sm">
                           {otrasDeducciones.map(item => (
                              <li key={item.id} className="flex justify-between items-center text-muted-foreground">
                                 <span className='truncate pr-2'>{item.descripcion || 'Deducción sin descripción'}</span>
                                 <div className="flex items-center gap-2 flex-shrink-0">
                                    <span>- {formatCurrency(item.monto)}</span>
                                     <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive/80" onClick={() => onDeleteDeduccion && onDeleteDeduccion(item.id)} disabled={!onDeleteDeduccion}>
                                         <Trash2 className="h-4 w-4" />
                                      </Button>
                                 </div>
                              </li>
                           ))}
                           {/* Separator removed from inside list */}
                        </ul>
                    ) : (
                         <p className="text-sm text-muted-foreground italic">No hay otras deducciones registradas.</p>
                    )}
                    {/* Show Total Otras Deducciones only if list has items */}
                     {(otrasDeducciones || []).length > 0 && (
                         <>
                            <Separator className="my-2 border-dashed"/>
                            <div className="flex justify-between items-center font-medium text-foreground text-sm">
                               <span>Total Otras Deducciones (Manuales):</span>
                               <span>{formatCurrency(totalOtrasDeducciones)}</span>
                            </div>
                         </>
                     )}
                </div>

                {/* Final Net Pay Section */}
                <Separator className="my-4" />
                <div className="flex justify-between font-bold text-xl mt-4">
                  <span className="text-foreground">Neto a Pagar Estimado Quincenal:</span>
                  <span className="text-primary">{formatCurrency(netoAPagar)}</span> {/* Use theme's primary color */}
                </div>
             </>
        )}

         {/* Footer Notes */}
         <CardDescription className="mt-4 text-xs text-muted-foreground">
              {isSummary
                 ? `*IBC (Ingreso Base de Cotización) estimado como Devengado Bruto sin Auxilio de Transporte. Las deducciones legales son aproximadas.`
                 : `Nota: Este es el cálculo solo para este día.`
              }
              <br/>
             {isSummary
                ? `Cálculo para ${diasCalculados} días. Base: ${formatCurrency(salarioBaseQuincenal)}. Pago final puede variar.`
                : `Total quincenal incluirá base, otros días, deducciones y ajustes.`
             }
        </CardDescription>
      </>
    );
  };

  return (
     <>
      {renderContent()}
     </>

  );
}


