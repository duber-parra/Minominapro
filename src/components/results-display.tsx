
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
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
// Removed unused import: CalculationError
import type { CalculationResults, QuincenalCalculationSummary } from '@/types';

interface ResultsDisplayProps {
  // Can receive either single day results or summary results
  results: CalculationResults | QuincenalCalculationSummary | null;
  error: string | null;
  isLoading: boolean;
  isSummary?: boolean; // Flag to indicate if displaying summary
}

// Mapeo de claves a etiquetas legibles en español
const labelMap: Record<string, string> = {
    Ordinaria_Diurna_Base: 'Horas Base Diurnas (Umbral 7,66h)',
    Recargo_Noct_Base: 'Recargo Nocturno (Base)',
    Recargo_Dom_Diurno_Base: 'Recargo Dominical/Festivo Diurno (Base)',
    Recargo_Dom_Noct_Base: 'Recargo Dominical/Festivo Nocturno (Base)',
    HED: 'Horas Extras Diurnas (Laboral)',
    HEN: 'Horas Extras Nocturnas (Laboral)',
    HEDD_F: 'Horas Extras Diurnas (Dominical/Festivo)',
    HEND_F: 'Horas Extras Nocturnas (Dominical/Festivo)',
};

// Orden deseado para mostrar los resultados
const displayOrder: (keyof CalculationResults['horasDetalladas'])[] = [
    'Ordinaria_Diurna_Base',
    'Recargo_Noct_Base',
    'Recargo_Dom_Diurno_Base',
    'Recargo_Dom_Noct_Base',
    'HED',
    'HEN',
    'HEDD_F',
    'HEND_F',
];

export const ResultsDisplay: FC<ResultsDisplayProps> = ({ results, error, isLoading, isSummary = false }) => {

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
      <div className="flex justify-between font-bold text-lg">
        <Skeleton className="h-7 w-2/5" />
        <Skeleton className="h-7 w-1/3" />
      </div>
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
          <AlertTitle>Error</AlertTitle>
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
                ? 'Agrega días trabajados para ver el resumen quincenal.'
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
    const totalConSalario = isSummary ? data.pagoTotalConSalarioQuincena : data.pagoTotalConSalario; // Note: pagoTotalConSalario for single day might be less useful now
    const totalHorasTrabajadas = isSummary ? data.totalDuracionTrabajadaHorasQuincena : data.duracionTotalTrabajadaHoras;
    const diasCalculados = isSummary ? data.diasCalculados : 1;


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

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50%] text-primary">Categoría ({isSummary ? `Total ${diasCalculados} días` : 'Día Actual'})</TableHead>
              <TableHead className="text-right text-primary">Horas</TableHead>
              <TableHead className="text-right text-primary">Pago (Recargo/Extra)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayOrder.map((key) => {
              const horasCategoria = horas[key];
              const pagoCategoria = pagos[key];

              // Conditionally display rows based on whether they have values
              if ((horasCategoria === 0 && pagoCategoria === 0) && key !== 'Ordinaria_Diurna_Base') {
                  return null;
              }
              if (key === 'Ordinaria_Diurna_Base' && horasCategoria === 0) {
                  return null;
              }

              return (
                <TableRow key={key}>
                  <TableCell className="font-medium text-muted-foreground">{labelMap[key] || key}</TableCell>
                  <TableCell className="text-right">{formatHours(horasCategoria)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(pagoCategoria)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <Separator className="my-4" />
        <div className="space-y-2">
             <div className="flex justify-between font-semibold text-base">
                 <span>Total Horas Trabajadas {isSummary ? 'en Quincena' : 'este Día'}:</span>
                 <span>{formatHours(totalHorasTrabajadas)}</span>
             </div>
             <Separator className="my-2" />
             <div className="flex justify-between font-semibold text-lg">
               <span>Total Recargos y Horas Extras {isSummary ? 'Quincenales' : 'del Día'}:</span>
               <span className="text-accent">{formatCurrency(totalRecargosExtras)}</span>
             </div>
             {isSummary && ( // Only show total with salary in the summary view
                <>
                 <div className="flex justify-between text-muted-foreground">
                    <span>+ Salario Base Quincenal:</span>
                    <span>{formatCurrency((data as QuincenalCalculationSummary).salarioBaseQuincenal)}</span>
                 </div>
                 <Separator className="my-2" />
                 <div className="flex justify-between font-bold text-xl text-primary">
                   <span>Pago Bruto Estimado Quincenal:</span>
                   <span>{formatCurrency(totalConSalario)}</span>
                 </div>
                </>
             )}
        </div>
         <CardDescription className="mt-4 text-xs text-muted-foreground">
             {isSummary
                ? `Nota: Este es un cálculo bruto estimado para ${diasCalculados} días. El pago final incluirá deducciones legales, otros ingresos/deducciones y políticas específicas.`
                : `Nota: Este es el cálculo solo para este día. El total quincenal incluirá el salario base y los resultados de otros días.`
             }
             {isSummary && ` El salario base quincenal considerado es ${formatCurrency((data as QuincenalCalculationSummary).salarioBaseQuincenal)}.`}
        </CardDescription>
      </>
    );
  };

  return (
    // Use passed-in Card structure if needed, or render directly
     <>
      {/* Title is handled by the parent component now */}
      {/* <CardHeader>
        <CardTitle className="text-primary">{isSummary ? 'Resumen Quincenal' : 'Resultados del Día'}</CardTitle>
        <CardDescription>{isSummary ? `Detalle agregado para los ${results ? (results as QuincenalCalculationSummary).diasCalculados : 0} días.` : 'Detalle de horas y pago estimado para el día ingresado.'}</CardDescription>
      </CardHeader> */}
      {renderContent()}
     </>

  );
}

// Formatting functions remain the same
const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
};

const formatHours = (hours: number): string => {
    return hours.toLocaleString('es-CO', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};
