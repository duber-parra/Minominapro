'use client';

import type { FC } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Hourglass, AlertCircle, Clock, Moon, Sun, CalendarDays, ChevronsRight } from 'lucide-react';
import type { CalculationResults, CalculationError } from '@/types'; // Assuming types are defined

interface ResultsDisplayProps {
  results: CalculationResults | null;
  error: string | null;
  isLoading: boolean;
}

const formatCurrency = (value: number): string => {
    // Format number to Colombian Pesos (COP) without decimals
   return new Intl.NumberFormat('es-CO', {
       style: 'currency',
       currency: 'COP',
       minimumFractionDigits: 0,
       maximumFractionDigits: 0,
   }).format(value);
}

const formatHours = (hours: number): string => {
    // Format to use comma as decimal separator for Spanish locale
    return hours.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const iconMap: { [key: string]: React.ElementType } = {
  Ordinaria_Diurna_Base: Sun,
  Recargo_Noct_Base: Moon,
  Recargo_Dom_Diurno_Base: CalendarDays,
  Recargo_Dom_Noct_Base: Moon, // Can combine with CalendarDays if needed
  HED: ChevronsRight, // Extra Diurnal
  HEN: ChevronsRight, // Extra Nocturnal - Could use Moon + ChevronsRight
  HEDD_F: CalendarDays, // Extra Dom/Fes Diurnal - Combine Sun + CalendarDays
  HEND_F: Moon, // Extra Dom/Fes Nocturnal - Combine Moon + CalendarDays
};

// --- Spanish Labels ---
const labelMap: { [key: string]: string } = {
    Ordinaria_Diurna_Base: "Horas Ordinarias Diurnas",
    Recargo_Noct_Base: "Horas Ordinarias Nocturnas (Recargo)",
    Recargo_Dom_Diurno_Base: "Horas Dominicales/Festivas Diurnas (Recargo)",
    Recargo_Dom_Noct_Base: "Horas Dominicales/Festivas Nocturnas (Recargo)",
    HED: "Horas Extras Diurnas (L-S)",
    HEN: "Horas Extras Nocturnas (L-S)",
    HEDD_F: "Horas Extras Dominicales/Festivas Diurnas",
    HEND_F: "Horas Extras Dominicales/Festivas Nocturnas",
};


export const ResultsDisplay: FC<ResultsDisplayProps> = ({ results, error, isLoading }) => {
  return (
    <Card className="bg-card shadow-lg rounded-lg h-fit">
      <CardHeader>
        <CardTitle className="text-primary flex items-center gap-2">
           <Hourglass className="w-5 h-5"/> Resultados del Cálculo
        </CardTitle>
        <CardDescription>Desglose detallado de horas trabajadas y pago.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-8 w-1/3 mt-4" />
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : results ? (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-primary">Desglose de Horas</h3>
             <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="text-right">Horas</TableHead>
                    <TableHead className="text-right">Pago</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {Object.entries(results.horasDetalladas)
                     .filter(([, hours]) => hours > 0.001) // Only show categories with hours
                     .map(([key, hours]) => {
                        const IconComponent = iconMap[key] || Clock;
                        const label = labelMap[key] || key.replace(/_/g, ' '); // Fallback label
                        const pay = results.pagosDetallados[key as keyof CalculationResults['pagosDetallados']] ?? 0;
                        return (
                        <TableRow key={key}>
                            <TableCell><IconComponent className="w-4 h-4 text-muted-foreground" /></TableCell>
                            <TableCell className="font-medium">{label}</TableCell>
                            <TableCell className="text-right">{formatHours(hours)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(pay)}</TableCell>
                        </TableRow>
                        );
                    })}
                </TableBody>
             </Table>

            <div className="mt-4 pt-4 border-t border-border">
               <p className="text-sm text-muted-foreground text-right">
                 Horas Totales Trabajadas: {formatHours(results.duracionTotalTrabajadaHoras)}
               </p>
            </div>
            <div className="mt-2 pt-4 border-t border-border">
               <h3 className="text-xl font-bold text-primary text-right">
                  Pago Total: {formatCurrency(results.pagoTotal)}
               </h3>
               <p className="text-xs text-muted-foreground text-right mt-1">
                   (Incluye recargos y pago de horas extras sobre el valor base por hora)
               </p>
            </div>

          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">
            Ingresa los detalles y haz clic en Calcular para ver los resultados.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
