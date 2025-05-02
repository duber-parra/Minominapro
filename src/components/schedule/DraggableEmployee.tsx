
'use client'; // Add this directive

import React, { useState, useEffect } from 'react'; // Import useState and useEffect
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { GripVertical } from 'lucide-react';
import type { Employee } from '@/types/schedule'; // Assuming type exists

interface DraggableEmployeeProps {
  employee: Employee;
}

export const DraggableEmployee: React.FC<DraggableEmployeeProps> = ({ employee }) => {
  const [isClient, setIsClient] = useState(false); // State to track client-side rendering

  useEffect(() => {
    setIsClient(true); // Set to true only on the client after initial render
  }, []);

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

  // Render only on the client side to avoid hydration mismatch
  if (!isClient) {
    // Optionally render a placeholder or null during SSR and initial hydration
    return (
      <Button
        variant="outline"
        className="w-full flex items-center justify-between p-2 bg-card hover:bg-muted/50 opacity-50 cursor-wait" // Indicate loading/placeholder state
        disabled
      >
        <span>{employee.name}</span>
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </Button>
    );
  }

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
