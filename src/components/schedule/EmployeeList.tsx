
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { DraggableEmployee } from './DraggableEmployee'; // Assuming DraggableEmployee component exists
import type { Employee } from '@/types/schedule'; // Assuming type exists
import { Users } from 'lucide-react';

interface EmployeeListProps {
  employees: Employee[];
}

export const EmployeeList: React.FC<EmployeeListProps> = ({ employees }) => {
  return (
    <Card className="h-full"> {/* Allow card to take full height */}
      <CardHeader>
         <CardTitle className="text-lg font-medium flex items-center gap-2 truncate"> {/* Add truncate here */}
             <Users className="h-5 w-5 text-muted-foreground flex-shrink-0" /> {/* Prevent icon shrink */}
             Colaboradores Disponibles ({employees.length})
         </CardTitle>
      </CardHeader>
       <CardContent className="space-y-3 overflow-y-auto max-h-[calc(100vh-200px)]"> {/* Make content scrollable */}
        {employees.length > 0 ? (
          employees.map((employee) => (
            <DraggableEmployee key={employee.id} employee={employee} />
          ))
        ) : (
          <p className="text-sm text-muted-foreground text-center pt-4 italic">
            No hay colaboradores para esta sede.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
