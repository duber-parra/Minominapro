
import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { GripVertical } from 'lucide-react';
import type { Employee } from '@/types/schedule'; // Assuming type exists

interface DraggableEmployeeProps {
  employee: Employee;
}

export const DraggableEmployee: React.FC<DraggableEmployeeProps> = ({ employee }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: employee.id, // Use employee ID as the draggable ID
    data: { type: 'employee', employee }, // Pass employee data
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : 'auto', // Ensure dragged item is on top
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  return (
    <Button
      ref={setNodeRef}
      style={style}
      variant="outline"
      className="w-full flex items-center justify-between p-2 bg-card hover:bg-muted/50"
      {...listeners}
      {...attributes}
    >
      <span>{employee.name}</span>
      <GripVertical className="h-4 w-4 text-muted-foreground" />
    </Button>
  );
};

    