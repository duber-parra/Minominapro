
'use client'; // Add this directive

import React, { useState, useEffect } from 'react'; // Import useState and useEffect
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { DraggableEmployee } from './DraggableEmployee';
import type { Employee } from '@/types/schedule';
import { Users } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile'; // Import the hook
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton

interface EmployeeListProps {
  employees: Employee[];
}

export const EmployeeList: React.FC<EmployeeListProps> = ({ employees }) => {
  const [isClient, setIsClient] = useState(false);
  const isMobile = useIsMobile(); // Use the hook

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Calculate count only on client
  const employeeCount = employees.length; // Calculate length directly

  // Do not render this component on mobile
  if (isMobile) {
    return null;
  }

  return (
    <Card className="h-full"> {/* Allow card to take full height */}
      <CardHeader>
         <CardTitle className="text-lg font-medium flex items-center gap-2 truncate"> {/* Add truncate here */}
             <Users className="h-5 w-5 text-muted-foreground flex-shrink-0" /> {/* Prevent icon shrink */}
             {/* Show count only on client to avoid hydration mismatch */}
             Colaboradores Disponibles ({isClient ? employeeCount : '...'})
         </CardTitle>
      </CardHeader>
       <CardContent className="space-y-3 overflow-y-auto max-h-[calc(100vh-200px)]"> {/* Make content scrollable */}
        {isClient ? ( // Only render the list content on the client
          employees.length > 0 ? (
            employees.map((employee) => (
              <DraggableEmployee key={employee.id} employee={employee} />
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center pt-4 italic">
              No hay colaboradores disponibles.
            </p>
          )
        ) : (
          // Show skeleton placeholders during SSR/initial hydration
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-2 border rounded-md bg-muted h-10">
                     <Skeleton className="h-4 w-3/4" />
                     <Skeleton className="h-4 w-4" />
                 </div>
             ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
