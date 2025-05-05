
// src/components/schedule/SummaryDashboard.tsx
'use client';

import React from 'react';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from '@/components/ui/scroll-area';
import { BarChartHorizontal, X } from "lucide-react";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatHours } from '@/components/results-display'; // Import formatHours

interface EmployeeHoursSummary {
  id: string;
  name: string;
  totalHours: number;
}

interface SummaryDashboardProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  viewMode: 'day' | 'week';
  targetDate: Date | null;
  weekDates: Date[];
  summaryData: EmployeeHoursSummary[];
}

export const SummaryDashboard: React.FC<SummaryDashboardProps> = ({
  isOpen,
  onOpenChange,
  viewMode,
  targetDate,
  weekDates,
  summaryData,
}) => {
    const getTitle = () => {
        if (viewMode === 'day' && targetDate) {
            return `Resumen Horas - ${format(targetDate, 'PPP', { locale: es })}`;
        } else if (viewMode === 'week' && weekDates.length > 0) {
            const start = weekDates[0];
            const end = weekDates[weekDates.length - 1];
            return `Resumen Horas - Semana ${format(start, 'dd MMM', { locale: es })} a ${format(end, 'dd MMM yyyy', { locale: es })}`;
        }
        return 'Resumen de Horas Programadas';
    };

    const getTotalHours = () => {
        return summaryData.reduce((total, emp) => total + emp.totalHours, 0);
    }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" className="hover:bg-primary hover:text-primary-foreground">
          <BarChartHorizontal className="mr-2 h-4 w-4" /> Resumen Horas
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[350px] sm:w-[400px] flex flex-col"> {/* Increased width */}
        <SheetHeader className="border-b pb-4">
          <SheetTitle>{getTitle()}</SheetTitle>
          <SheetDescription>
            Total de horas programadas por colaborador en el período visible.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-grow overflow-hidden py-4"> {/* Allow content to grow and scroll */}
            {summaryData.length > 0 ? (
                 <ScrollArea className="h-full pr-4">
                    <ul className="space-y-2">
                        {summaryData.map((emp) => (
                            <li key={emp.id} className="flex justify-between items-center p-2 border rounded-md bg-background">
                                <span className="font-medium text-sm text-foreground truncate">{emp.name}</span>
                                <span className="font-semibold text-sm text-primary">{formatHours(emp.totalHours)} hrs</span>
                            </li>
                        ))}
                    </ul>
                 </ScrollArea>
            ) : (
                 <p className="text-center text-muted-foreground italic py-6">
                     No hay turnos asignados en el período visible.
                 </p>
            )}
        </div>
         <div className="border-t pt-4 mt-auto"> {/* Footer section */}
             <div className="flex justify-between items-center font-bold text-lg text-foreground">
                 <span>Total General:</span>
                 <span>{formatHours(getTotalHours())} hrs</span>
             </div>
         </div>
         {/* Removed explicit close button
         <SheetClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
             <X className="h-4 w-4" />
             <span className="sr-only">Cerrar</span>
         </SheetClose>
         */}
      </SheetContent>
    </Sheet>
  );
};
