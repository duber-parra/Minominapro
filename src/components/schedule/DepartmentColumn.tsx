
// src/components/schedule/DepartmentColumn.tsx
'use client'; // Ensure client component

import React, { useState, useEffect } from 'react'; // Import useState and useEffect
import { useDroppable } from '@dnd-kit/core';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import type { Department, ShiftAssignment, Employee } from '@/types/schedule'; // Assuming types exist
import { ShiftCard } from './ShiftCard'; // Assuming ShiftCard component exists
import { format } from 'date-fns';
import { cn } from '@/lib/utils'; // Added cn
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton for placeholder

interface DepartmentColumnProps {
  department: Department;
  assignments: ShiftAssignment[];
  onRemoveShift: (departmentId: string, assignmentId: string) => void;
  date: Date; // Date for this column
  onAddShiftRequest: (departmentId: string, date: Date) => void; // New handler for '+' button click
  onShiftClick: (assignment: ShiftAssignment, date: Date, departmentId: string) => void; // Handler for clicking a shift card
  isWeekView?: boolean; // Flag for potentially different rendering in week view
  isMobile: boolean; // Flag to detect mobile view
}

export const DepartmentColumn: React.FC<DepartmentColumnProps> = ({
  department,
  assignments,
  onRemoveShift,
  date,
  onAddShiftRequest, // Destructure new handler
  onShiftClick, // Destructure shift click handler
  isWeekView = false,
  isMobile, // Destructure mobile flag
}) => {
  const [isClient, setIsClient] = useState(false); // State for client-side rendering

  useEffect(() => {
    setIsClient(true); // Set true after initial mount
  }, []);

  const dateKey = format(date, 'yyyy-MM-dd');
  const { setNodeRef, isOver } = useDroppable({
    id: `${department.id}_${dateKey}`, // Make ID unique per department and date
    data: {
        type: 'department',
        id: department.id,
        date: dateKey, // Pass date string in data
    },
    disabled: isMobile || !isClient, // Disable dropping on mobile or until client-side hydration
  });

  const style = {
    backgroundColor: isOver ? 'hsl(var(--accent)/0.1)' : undefined,
    borderColor: isOver ? 'hsl(var(--accent))' : (isWeekView ? 'hsl(var(--border) / 0.3)' : undefined), // Lighter border in week view normal state
    borderWidth: '1px',
    borderStyle: isOver ? 'dashed' : 'solid',
    minHeight: isWeekView ? '60px' : '200px',
    transition: 'background-color 0.2s ease, border-color 0.2s ease',
    borderRadius: isWeekView ? '0.375rem' : undefined,
  };

  // Render placeholder on server and initial client render
  const renderPlaceholder = () => {
    if (isWeekView) {
      return <Skeleton className="h-6 w-full" />; // Simple skeleton for week view
    }
    return (
      <div className="p-3 space-y-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-5 w-3/4" />
      </div>
    );
  };

  // Actual content rendering logic
  const renderContent = () => {
     const assignmentCount = assignments.length; // Calculate length here

    if (isWeekView) {
      return (
        <>
          {assignmentCount > 0 ? (
            assignments.map((assignment) => (
              <ShiftCard
                key={assignment.id}
                assignment={assignment}
                onRemove={(e) => { e.stopPropagation(); onRemoveShift(department.id, assignment.id); }}
                isCompact
                onClick={() => onShiftClick(assignment, date, department.id)}
              />
            ))
          ) : (
            // Minimal placeholder for empty week view cells on desktop
             !isMobile && <div className="h-4"></div> // Small spacer
          )}
          {/* Single '+' button at the bottom for week view on mobile */}
          {/* Removed the mobile '+' button, handled in ScheduleView now */}
        </>
      );
    } else {
      // Full rendering for day view
      return (
        <>
          {assignmentCount > 0 ? (
            assignments.map((assignment) => (
              <ShiftCard
                key={assignment.id}
                assignment={assignment}
                onRemove={(e) => { e.stopPropagation(); onRemoveShift(department.id, assignment.id); }}
                onClick={() => onShiftClick(assignment, date, department.id)}
              />
            ))
          ) : (
            <p className="text-xs text-muted-foreground text-center pt-4 italic">
              {!isMobile ? 'Arrastra o usa +' : 'Usa + para añadir'} {/* Adjusted text based on mobile */}
            </p>
          )}
        </>
      );
    }
  };

  // Main return logic
  if (isWeekView) {
     // Simplified structure for week view, '+' button logic handled inside ScheduleView
    return (
      <div ref={setNodeRef} style={style} className="p-1 space-y-0.5">
        {isClient ? renderContent() : renderPlaceholder()}
      </div>
    );
  } else {
    // Day view with Card structure and a single '+' button in the header
    return (
      <Card ref={setNodeRef} style={style} className="flex flex-col h-full shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4 border-b">
           <CardTitle className="text-base font-medium flex items-center gap-2 text-foreground">
               {department.icon && <department.icon className="h-3.5 w-3.5 text-muted-foreground" />}
                {/* Show count only on client */}
               {department.name} ({isClient ? assignments.length : '...'})
           </CardTitle>
           {/* Single '+' button in the header for Day View */}
          <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-primary hover:bg-primary/10" // Styled button
              onClick={() => onAddShiftRequest(department.id, date)}
              title="Añadir Colaborador"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="flex-grow p-3 space-y-2 overflow-y-auto">
          {isClient ? renderContent() : renderPlaceholder()}
        </CardContent>
      </Card>
    );
  }
};
