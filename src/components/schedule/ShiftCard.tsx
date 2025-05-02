import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Clock, Coffee } from 'lucide-react'; // Added Coffee icon for break
import type { ShiftAssignment } from '@/types/schedule'; // Assuming type exists
import { cn } from '@/lib/utils'; // Import cn

interface ShiftCardProps {
  assignment: ShiftAssignment;
  onRemove: (event: React.MouseEvent<HTMLButtonElement>) => void; // Pass event to stop propagation
  isCompact?: boolean; // Optional flag for compact view
  onClick?: () => void; // Optional click handler for the card
}

export const ShiftCard: React.FC<ShiftCardProps> = ({ assignment, onRemove, isCompact = false, onClick }) => {
  // Add useSortable hook here if making items within a column sortable
  // const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: assignment.id });
  // const style = { transform: CSS.Transform.toString(transform), transition };

  const handleRemoveClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation(); // Prevent triggering the card's onClick
    onRemove(event);
  };


  return (
     <Card
        // ref={setNodeRef} // For sortable
        // style={style} // For sortable
        className={cn(
            "group bg-background border shadow-sm transition-colors duration-150", // Add 'group' class, transition
            isCompact ? "border-none shadow-none bg-transparent p-0 hover:bg-accent/50 cursor-pointer" : "hover:border-primary", // Remove borders/padding if compact, add hover background and cursor
            onClick && "cursor-pointer" // Add cursor pointer if onClick is provided
        )}
        // {...attributes} // For sortable
        // {...listeners} // For sortable - Be careful with listeners vs onClick
        onClick={onClick} // Add onClick handler to the card
     >
       <CardContent className={cn(
           "flex items-center justify-between",
           isCompact ? "p-0.5" : "p-3" // Smaller padding if compact
       )}>
         <div className="flex-grow min-w-0 overflow-hidden mr-1"> {/* Allow shrinking and hide overflow, add margin */}
             <p className={cn(
                 "font-medium truncate",
                 isCompact ? "text-xs" : "text-sm" // Increased compact font size back to xs
             )} title={assignment.employee.name}>{assignment.employee.name}</p>
             <div className={cn( // Wrap times in a div for better spacing control
                 "text-muted-foreground flex flex-wrap items-center", // Use flex-wrap and items-center
                 isCompact ? "text-[11px] gap-x-1 gap-y-0" : "text-xs gap-x-1.5 gap-y-0.5" // Increased compact font size from 10px, allow wrapping
             )}>
                 {/* Shift Time */}
                 <span className="flex items-center gap-0.5">
                     <Clock className={cn("flex-shrink-0", isCompact ? "h-2.5 w-2.5" : "h-3 w-3")} /> {/* Slightly larger icon, prevent shrink */}
                     <span className="whitespace-nowrap">{assignment.startTime}-{assignment.endTime}</span> {/* Prevent time wrap */}
                 </span>
                 {/* Break Time - Show icon and text if included */}
                 {assignment.includeBreak && assignment.breakStartTime && assignment.breakEndTime && (
                    <span className={cn(
                        "flex items-center gap-0.5",
                        isCompact && "text-blue-600 dark:text-blue-400" // Optional: different color for break icon in compact
                        )} title={`Descanso: ${assignment.breakStartTime}-${assignment.breakEndTime}`}>
                        <Coffee className={cn("flex-shrink-0", isCompact ? "h-2.5 w-2.5" : "h-3 w-3")} /> {/* Break icon */}
                        {/* Show break times in compact view as well */}
                        <span className="whitespace-nowrap">D: {assignment.breakStartTime}-{assignment.breakEndTime}</span>
                    </span>
                 )}
             </div>
         </div>
         <Button
             variant="ghost"
             size="icon"
             className={cn(
                 "text-destructive flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-transparent", // Hide by default, show on group hover, add transition, transparent hover bg
                 isCompact ? "h-4 w-4" : "h-7 w-7", // Smaller button if compact
                 // Hide the button only when NOT hovering for compact view
                 isCompact && "group-hover:opacity-100 md:opacity-0"
             )}
             onClick={handleRemoveClick} // Use the new handler
             title="Eliminar turno" // Add title for accessibility
          >
           <Trash2 className={cn(isCompact ? "h-2.5 w-2.5" : "h-4 w-4")} /> {/* Smaller icon if compact */}
         </Button>
       </CardContent>
     </Card>
  );
};
