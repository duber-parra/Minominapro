
'use client'; // Add this directive

import React, { useState, useEffect } from 'react'; // Import useState and useEffect
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { DraggableEmployee } from './DraggableEmployee';
import type { Employee } from '@/types/schedule';
import { Users } from 'lucide-react';

interface EmployeeListProps {
  employees: Employee[];
}

export const EmployeeList: React.FC<EmployeeListProps> = ({ employees }) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Calculate count only on client
  const employeeCount = isClient ? employees.length : 0;

  return (
    <Card className="h-full"> {/* Allow card to take full height */}
      <CardHeader>
         <CardTitle className="text-lg font-medium flex items-center gap-2 truncate"> {/* Add truncate here */}
             <Users className="h-5 w-5 text-muted-foreground flex-shrink-0" /> {/* Prevent icon shrink */}
             Colaboradores Disponibles ({employeeCount}) {/* Use client-side count */}
         </CardTitle>
      </CardHeader>
       <CardContent className="space-y-3 overflow-y-auto max-h-[calc(100vh-200px)]"> {/* Make content scrollable */}
        {isClient ? ( // Only render the list on the client
          employees.length > 0 ? (
            employees.map((employee) => (
              <DraggableEmployee key={employee.id} employee={employee} />
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center pt-4 italic">
              No hay colaboradores para esta sede o ya están asignados.
            </p>
          )
        ) : (
          // Optionally show a loading state or placeholder during SSR/initial hydration
          <p className="text-sm text-muted-foreground text-center pt-4 italic">
            Cargando colaboradores...
          </p>
        )}
      </CardContent>
    </Card>
  );
};

    