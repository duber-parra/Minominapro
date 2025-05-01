import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Clock } from 'lucide-react';
import type { ShiftAssignment } from '@/types/schedule'; // Assuming type exists

interface ShiftCardProps {
  assignment: ShiftAssignment;
  onRemove: () => void;
}

export const ShiftCard: React.FC<ShiftCardProps> = ({ assignment, onRemove }) => {
  // Add useSortable hook here if making items within a column sortable
  // const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: assignment.id });
  // const style = { transform: CSS.Transform.toString(transform), transition };

  return (
     <Card
        // ref={setNodeRef} // For sortable
        // style={style} // For sortable
        className="bg-background border shadow-sm"
        // {...attributes} // For sortable
        // {...listeners} // For sortable
     >
       <CardContent className="p-3 flex items-center justify-between">
         <div className="flex-grow min-w-0">
             <p className="text-sm font-medium truncate">{assignment.employee.name}</p>
             <p className="text-xs text-muted-foreground flex items-center gap-1">
                 <Clock className="h-3 w-3" />
                 {assignment.startTime} - {assignment.endTime}
                 {assignment.includeBreak && assignment.breakStartTime && assignment.breakEndTime && (
                    <span className="ml-1">(D: {assignment.breakStartTime}-{assignment.breakEndTime})</span>
                 )}
             </p>
         </div>
         <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive ml-2" onClick={onRemove}>
           <Trash2 className="h-4 w-4" />
         </Button>
       </CardContent>
     </Card>
  );
};