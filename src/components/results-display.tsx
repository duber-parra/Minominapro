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
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import type { CalculationResults, CalculationError } from '@/types';

interface ResultsDisplayProps {
  results: CalculationResults | null;
  error: string | null;
  isLoading: boolean;
}

// Mapeo de claves a etiquetas legibles en español
const labelMap: Record<string, string> = {
    Ordinaria_Diurna_Base: 'Horas Ordinarias Diurnas (Base)',
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

export const ResultsDisplay: FC<ResultsDisplayProps> = ({ results, error, isLoading }) => {
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
          <AlertTitle>Error en el Cálculo</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      );
    }

    if (!results) {
      return (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Esperando Cálculo</AlertTitle>
          <AlertDescription>Ingresa los datos en el formulario y presiona "Calcular Pago" para ver los resultados.</AlertDescription>
        </Alert>
      );
    }

    const {
        horasDetalladas,
        pagoDetallado,
        pagoTotalRecargosExtras,
        pagoTotalConSalario,
        duracionTotalTrabajadaHoras
    } = results;

    return (
      <>
        <Alert variant="default" className="mb-6 border-green-500 bg-green-50 dark:bg-green-900/20">
             <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
             <AlertTitle className="text-green-700 dark:text-green-300">Cálculo Exitoso</AlertTitle>
             <AlertDescription className="text-green-600 dark:text-green-400">
                El cálculo de la jornada se completó correctamente. Total horas trabajadas: {formatHours(duracionTotalTrabajadaHoras)}.
             </AlertDescription>
         </Alert>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50%] text-primary">Categoría</TableHead>
              <TableHead className="text-right text-primary">Horas</TableHead>
              <TableHead className="text-right text-primary">Pago (Recargo/Extra)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayOrder.map((key) => {
              const horas = horasDetalladas[key];
              const pago = pagoDetallado[key];
              // No mostrar filas con 0 horas y 0 pago, excepto la base diurna si tiene horas
              if ((horas === 0 && pago === 0) && key !== 'Ordinaria_Diurna_Base') {
                  return null;
              }
               // Para Ordinaria_Diurna_Base, mostrar si hay horas, aunque el pago sea 0
              if (key === 'Ordinaria_Diurna_Base' && horas === 0) {
                  return null;
              }

              return (
                <TableRow key={key}>
                  <TableCell className="font-medium text-muted-foreground">{labelMap[key] || key}</TableCell>
                  <TableCell className="text-right">{formatHours(horas)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(pago)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <Separator className="my-4" />
        <div className="space-y-2">
             <div className="flex justify-between font-semibold text-lg">
               <span>Total Recargos y Horas Extras:</span>
               <span className="text-accent">{formatCurrency(pagoTotalRecargosExtras)}</span>
             </div>
             <div className="flex justify-between font-bold text-xl text-primary">
               <span>Pago Total Estimado (Incluye Base Quincenal):</span>
               <span>{formatCurrency(pagoTotalConSalario)}</span>
             </div>
        </div>
         <CardDescription className="mt-4 text-xs text-muted-foreground">
            Nota: Este es un cálculo estimado. El pago final puede variar según deducciones, bonificaciones y políticas específicas de la empresa. El salario base quincenal es fijo ($711,750).
        </CardDescription>
      </>
    );
  };

  return (
    <Card className="bg-card shadow-lg rounded-lg">
      <CardHeader>
        <CardTitle className="text-primary">Resultados del Cálculo</CardTitle>
        <CardDescription>Detalle de horas y pago estimado para el periodo ingresado.</CardDescription>
      </CardHeader>
      <CardContent>
        {renderContent()}
      </CardContent>
    </Card>
  );
}

const formatCurrency = (value: number): string => {
    // Format number to Colombian Pesos (COP) with thousand separators and without decimals
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
};

const formatHours = (hours: number): string => {
    // Format to use comma as decimal separator for Spanish locale
    return hours.toLocaleString('es-CO', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};
