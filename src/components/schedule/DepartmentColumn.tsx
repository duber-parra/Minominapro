// src/components/schedule/DepartmentColumn.tsx

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import type { Department, ShiftAssignment, Employee } from '@/types/schedule'; // Assuming types exist
import { ShiftCard } from './ShiftCard'; // Assuming ShiftCard component exists
import { format } from 'date-fns';
import { cn } from '@/lib/utils'; // Added cn

interface DepartmentColumnProps {
  department: Department;
  assignments: ShiftAssignment[];
  onRemoveShift: (departmentId: string, assignmentId: string) => void;
  date: Date; // Date for this column
  onAssign: (employee: Employee, departmentId: string, date: Date) => void; // Handler for '+' button assignment
  isWeekView?: boolean; // Flag for potentially different rendering in week view
}

export const DepartmentColumn: React.FC<DepartmentColumnProps> = ({
  department,
  assignments,
  onRemoveShift,
  date,
  onAssign,
  isWeekView = false,
}) => {
  const dateKey = format(date, 'yyyy-MM-dd');
  const { setNodeRef, isOver } = useDroppable({
    id: `${department.id}_${dateKey}`, // Make ID unique per department and date
    data: {
        type: 'department',
        id: department.id,
        date: dateKey, // Pass date string in data
    }
  });

  const style = {
    // Highlight when dragging over
    backgroundColor: isOver ? 'hsl(var(--accent)/0.1)' : undefined,
    borderColor: isOver ? 'hsl(var(--accent))' : (isWeekView ? 'hsl(var(--border) / 0.3)' : undefined), // Lighter border in week view normal state
    borderWidth: '1px', // Use 1px border always
    borderStyle: isOver ? 'dashed' : 'solid',
    minHeight: isWeekView ? '60px' : '200px', // Shorter min-height for week view
    transition: 'background-color 0.2s ease, border-color 0.2s ease', // Smooth transition
    borderRadius: isWeekView ? '0.375rem' : undefined, // Add rounding in week view
  };

  // Simplified rendering for week view
  if (isWeekView) {
    return ( // Start of return statement for week view
      // Ensure this div correctly wraps the content
      <div ref={setNodeRef} style={style} className="p-1 space-y-0.5"> {/* Reduced padding and space */}
          {assignments.length > 0 ? (
              assignments.map((assignment) => (
                  <ShiftCard
                      key={assignment.id}
                      assignment={assignment}
                      onRemove={() => onRemoveShift(department.id, assignment.id)}
                      isCompact // Use compact rendering
                  />
              ))
          ) : (
              <p className="text-[9px] text-muted-foreground text-center py-1 italic">Vacío</p> // Smaller text and padding
          )}
      </div>
    ); // End of return statement for week view
  }

  // Full rendering for day view
  return ( // Start of return for day view
    <Card ref={setNodeRef} style={style} className="flex flex-col h-full shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4 border-b">
         <CardTitle className="text-base font-medium flex items-center gap-2 text-foreground"> {/* Adjusted size */}
             {department.icon && <department.icon className="h-3.5 w-3.5 text-muted-foreground" />}
             {department.name} ({assignments.length})
         </CardTitle>
        {/* Add shift button - Now enabled also for Day View */}
        <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => {
                // Placeholder action for Day View '+' click
                // The current onAssign requires an Employee, which we don't have here.
                // We need a mechanism to select an employee *after* clicking this button.
                console.log(`(+) Clicked for Dept: ${department.name} (${department.id}) on Date: ${format(date, 'yyyy-MM-dd')}. Need to implement employee selection.`);
                // Future: Trigger a modal or sidebar to select an employee, then call:
                // onAssign(selectedEmployee, department.id, date);
            }}
            title="Añadir Colaborador (Selección pendiente)"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="flex-grow p-3 space-y-2 overflow-y-auto"> {/* Adjusted padding */}
        {/* Use SortableContext if items within the column need to be sortable */}
        {/* <SortableContext items={assignments.map(a => a.id)} strategy={verticalListSortingStrategy}> */}
        {assignments.length > 0 ? (
          assignments.map((assignment) => (
             <ShiftCard
                 key={assignment.id}
                 assignment={assignment}
                 onRemove={() => onRemoveShift(department.id, assignment.id)}
             />
          ))
        ) : (
          <p className="text-xs text-muted-foreground text-center pt-4 italic">
            Arrastra un colaborador aquí
          </p>
        )}
        {/* </SortableContext> */}
      </CardContent>
    </Card>
  ); // End of return for day view
};
