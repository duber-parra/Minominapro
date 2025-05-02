// src/components/schedule/EmployeeSelectionModal.tsx
'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area'; // Use ScrollArea for potentially long lists
import type { Employee } from '@/types/schedule';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { X, UserPlus } from 'lucide-react';

interface EmployeeSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  onSelectEmployee: (employee: Employee) => void;
  departmentName: string;
  date: Date;
}

export const EmployeeSelectionModal: React.FC<EmployeeSelectionModalProps> = ({
  isOpen,
  onClose,
  employees,
  onSelectEmployee,
  departmentName,
  date,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Seleccionar Colaborador</DialogTitle>
          <DialogDescription>
            Elige un colaborador disponible para asignar a <strong>{departmentName}</strong> el{' '}
            <strong>{format(date, 'PPP', { locale: es })}</strong>.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
           {employees.length > 0 ? (
             <ScrollArea className="h-[300px] pr-4"> {/* Add max height and scrolling */}
                <div className="space-y-2">
                  {employees.map((employee) => (
                    <Button
                      key={employee.id}
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => onSelectEmployee(employee)}
                    >
                       <UserPlus className="mr-2 h-4 w-4" /> {employee.name}
                    </Button>
                  ))}
                </div>
             </ScrollArea>
           ) : (
             <p className="text-center text-muted-foreground italic">
               No hay colaboradores disponibles para asignar en esta fecha/departamento.
             </p>
           )}
        </div>
         <DialogFooter>
             <DialogClose asChild>
                 <Button type="button" variant="outline">
                    <X className="mr-2 h-4 w-4" /> Cancelar
                 </Button>
             </DialogClose>
         </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
