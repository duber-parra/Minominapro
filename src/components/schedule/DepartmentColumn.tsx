
import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import type { Department, ShiftAssignment } from '@/types/schedule'; // Assuming types exist
import { ShiftCard } from './ShiftCard'; // Assuming ShiftCard component exists

interface DepartmentColumnProps {
  department: Department;
  assignments: ShiftAssignment[];
  onRemoveShift: (departmentId: string, assignmentId: string) => void;
  // onAddShift: (departmentId: string) => void; // Might be needed for '+' button logic
}

export const DepartmentColumn: React.FC<DepartmentColumnProps> = ({
  department,
  assignments,
  onRemoveShift,
  // onAddShift,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: department.id, // Use department ID as the droppable ID
  });

  const style = {
    // Highlight when dragging over
    backgroundColor: isOver ? 'hsl(var(--accent)/0.1)' : undefined,
    borderColor: isOver ? 'hsl(var(--accent))' : undefined,
    borderWidth: isOver ? '2px' : '1px',
    borderStyle: isOver ? 'dashed' : 'solid',
    minHeight: '200px', // Ensure columns have a minimum height
    transition: 'background-color 0.2s ease, border-color 0.2s ease', // Smooth transition
  };

  return (
    <Card ref={setNodeRef} style={style} className="flex flex-col h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
         <CardTitle className="text-lg font-medium flex items-center gap-2">
             {department.icon && <department.icon className="h-4 w-4 text-muted-foreground" />}
             {department.name} ({assignments.length})
         </CardTitle>
        {/* Add shift button - Logic needed */}
        {/* <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onAddShift(department.id)}>
          <Plus className="h-4 w-4" />
        </Button> */}
      </CardHeader>
      <CardContent className="flex-grow p-4 space-y-3 overflow-y-auto">
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
          <p className="text-sm text-muted-foreground text-center pt-4 italic">
            Arrastra un colaborador aquí o usa '+'
          </p>
        )}
        {/* </SortableContext> */}
      </CardContent>
    </Card>
  );
};

    