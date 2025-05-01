import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Clock } from 'lucide-react';
import type { ShiftAssignment } from '@/types/schedule'; // Assuming type exists
import { cn } from '@/lib/utils'; // Import cn

interface ShiftCardProps {
  assignment: ShiftAssignment;
  onRemove: () => void;
  isCompact?: boolean; // Optional flag for compact view
}

export const ShiftCard: React.FC<ShiftCardProps> = ({ assignment, onRemove, isCompact = false }) => {
  // Add useSortable hook here if making items within a column sortable
  // const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: assignment.id });
  // const style = { transform: CSS.Transform.toString(transform), transition };

  return (
     <Card
        // ref={setNodeRef} // For sortable
        // style={style} // For sortable
        className={cn(
            "bg-background border shadow-sm",
            isCompact ? "border-none shadow-none bg-transparent p-0" : "" // Remove borders/padding if compact
        )}
        // {...attributes} // For sortable
        // {...listeners} // For sortable
     >
       <CardContent className={cn(
           "flex items-center justify-between",
           isCompact ? "p-1" : "p-3" // Smaller padding if compact
       )}>
         <div className="flex-grow min-w-0">
             <p className={cn(
                 "font-medium truncate",
                 isCompact ? "text-[11px]" : "text-sm" // Smaller text if compact
             )}>{assignment.employee.name}</p>
             <p className={cn(
                 "text-muted-foreground flex items-center gap-1",
                 isCompact ? "text-[10px]" : "text-xs" // Smaller text if compact
             )}>
                 <Clock className={cn(isCompact ? "h-2.5 w-2.5" : "h-3 w-3")} />
                 {assignment.startTime}-{assignment.endTime}
                 {assignment.includeBreak && assignment.breakStartTime && assignment.breakEndTime && !isCompact && ( // Hide break details in compact
                    <span className="ml-1">(D: {assignment.breakStartTime}-{assignment.breakEndTime})</span>
                 )}
             </p>
         </div>
         <Button
             variant="ghost"
             size="icon"
             className={cn(
                 "text-destructive ml-1 flex-shrink-0", // Use ml-1 instead of ml-2
                 isCompact ? "h-5 w-5" : "h-7 w-7" // Smaller button if compact
             )}
             onClick={onRemove}
          >
           <Trash2 className={cn(isCompact ? "h-3 w-3" : "h-4 w-4")} /> {/* Smaller icon if compact */}
         </Button>
       </CardContent>
     </Card>
  );
};
