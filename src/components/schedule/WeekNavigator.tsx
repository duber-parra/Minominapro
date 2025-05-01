// src/components/schedule/WeekNavigator.tsx
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronsLeft, ChevronsRight } from 'lucide-react';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale'; // Import Spanish locale

interface WeekNavigatorProps {
  currentDate: Date;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
}

export const WeekNavigator: React.FC<WeekNavigatorProps> = ({
  currentDate,
  onPreviousWeek,
  onNextWeek,
}) => {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Start on Monday
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

  // Format the week range string, handling year change within the week
  const startYear = format(weekStart, 'yyyy');
  const endYear = format(weekEnd, 'yyyy');
  const weekRange = `Semana del ${format(weekStart, 'd MMM', { locale: es })}${startYear !== endYear ? ' ' + startYear : ''} al ${format(weekEnd, 'd MMM yyyy', { locale: es })}`;

  return (
    <div className="flex items-center justify-center gap-2">
      <Button variant="outline" size="icon" onClick={onPreviousWeek} className="h-8 w-8">
        <ChevronsLeft className="h-4 w-4" />
        <span className="sr-only">Semana Anterior</span>
      </Button>
      <span className="text-sm font-medium text-center min-w-[200px]">
        {weekRange}
      </span>
      <Button variant="outline" size="icon" onClick={onNextWeek} className="h-8 w-8">
        <ChevronsRight className="h-4 w-4" />
        <span className="sr-only">Semana Siguiente</span>
      </Button>
    </div>
  );
};
