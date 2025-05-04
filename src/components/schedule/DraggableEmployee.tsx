
'use client'; // Add this directive

import React, { useState, useEffect } from 'react'; // Import useState and useEffect
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { GripVertical } from 'lucide-react';
import type { Employee } from '@/types/schedule'; // Assuming type exists
import { cn } from '@/lib/utils'; // Import cn
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton

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
    disabled: !isClient, // Disable dragging until client-side hydration is complete
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : 'auto', // Ensure dragged item is on top
    cursor: isDragging ? 'grabbing' : (isClient ? 'grab' : 'default'), // Set cursor only on client
  };

  // Render a placeholder during SSR and initial hydration
  if (!isClient) {
    return (
      <div className="flex items-center justify-between p-2 border rounded-md bg-muted h-10">
           <Skeleton className="h-4 w-3/4" />
           <Skeleton className="h-4 w-4" />
       </div>
    );
  }

  // Render the actual draggable button only on the client
  return (
    <Button
      ref={setNodeRef}
      style={style}
      variant="outline"
      className="w-full flex items-center justify-between p-2 bg-card hover:bg-muted/50"
      {...listeners}
      {...attributes}
    >
      <span className="truncate">{employee.name}</span> {/* Add truncate here */}
      <GripVertical className="h-4 w-4 text-muted-foreground" />
    </Button>
  );
};
