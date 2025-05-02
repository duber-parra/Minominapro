// src/components/schedule/WeekNavigator.tsx
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronsLeft, ChevronsRight } from 'lucide-react';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale'; // Import Spanish locale
import { Card } from '@/components/ui/card'; // Import Card for background

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
    <Card className="flex items-center justify-center gap-2 px-3 py-2 bg-card shadow-sm border border-border rounded-lg"> {/* Wrap in Card, add padding */}
      <Button variant="ghost" size="icon" onClick={onPreviousWeek} className="h-9 w-9 text-muted-foreground hover:text-primary"> {/* Larger button, ghost variant */}
        <ChevronsLeft className="h-5 w-5" /> {/* Larger icon */}
        <span className="sr-only">Semana Anterior</span>
      </Button>
      <span className="text-base font-semibold text-foreground text-center min-w-[220px]"> {/* Larger, bolder text */}
        {weekRange}
      </span>
      <Button variant="ghost" size="icon" onClick={onNextWeek} className="h-9 w-9 text-muted-foreground hover:text-primary"> {/* Larger button, ghost variant */}
        <ChevronsRight className="h-5 w-5" /> {/* Larger icon */}
        <span className="sr-only">Semana Siguiente</span>
      </Button>
    </Card>
  );
};
