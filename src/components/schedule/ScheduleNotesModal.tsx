// src/components/schedule/ScheduleNotesModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { format, parse as parseDateFns, isValid as isValidDate } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, CalendarIcon, NotebookPen, PlusCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ScheduleNote, Employee } from '@/types/schedule';
import { useToast } from '@/hooks/use-toast';

interface ScheduleNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: ScheduleNote[];
  employees: Employee[]; // To populate the dropdown
  onAddNote: (newNoteData: Omit<ScheduleNote, 'id'>) => void;
  onDeleteNote: (noteId: string) => void;
}

export const ScheduleNotesModal: React.FC<ScheduleNotesModalProps> = ({
  isOpen,
  onClose,
  notes,
  employees,
  onAddNote,
  onDeleteNote,
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [noteText, setNoteText] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedDate(new Date());
      setNoteText('');
      setSelectedEmployeeId(undefined);
      setError(null);
    }
  }, [isOpen]);

  const handleAddClick = () => {
    setError(null);
    if (!selectedDate) {
      setError('Por favor selecciona una fecha.');
      return;
    }
    if (!noteText.trim()) {
      setError('Por favor ingresa una nota.');
      return;
    }

    const newNoteData: Omit<ScheduleNote, 'id'> = {
      date: format(selectedDate, 'yyyy-MM-dd'),
      note: noteText.trim(),
      employeeId: selectedEmployeeId || undefined, // Ensure empty string becomes undefined
    };

    onAddNote(newNoteData);

    // Reset form fields after adding
    setNoteText('');
    setSelectedEmployeeId(undefined);
    // Optionally keep the date or advance it? Keep for now.
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <NotebookPen className="h-5 w-5" />
            Anotaciones Futuras / Eventos
          </DialogTitle>
          <DialogDescription>
            Agrega o elimina notas para fechas específicas. Se mostrará un indicador (🗓️) en el planificador esos días.
          </DialogDescription>
        </DialogHeader>

        {/* --- Formulario para añadir nota --- */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-4 border-b pb-6">
          {/* Date Picker */}
          <div className="space-y-2 sm:col-span-1">
            <Label htmlFor="note-date">Fecha</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="note-date"
                  variant={'outline'}
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !selectedDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, 'PPP', { locale: es }) : <span>Selecciona fecha</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                  locale={es}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Note Text */}
          <div className="space-y-2 sm:col-span-2">
             <Label htmlFor="note-text">Nota / Descripción</Label>
             <Textarea
                id="note-text"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Ej: Cumpleaños Carlos P., Solo hasta mediodía..."
                rows={3}
             />
          </div>

          {/* Optional Employee Link */}
          <div className="space-y-2 sm:col-span-3">
            <Label htmlFor="note-employee">Colaborador (Opcional)</Label>
            <Select value={selectedEmployeeId} onValueChange={(value) => setSelectedEmployeeId(value === 'ninguno' ? undefined : value)}>
              <SelectTrigger id="note-employee">
                <SelectValue placeholder="Vincular a colaborador..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ninguno">Ninguno</SelectItem>
                {employees.map(emp => (
                  <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

           {/* Error Message */}
          {error && <p className="text-sm text-destructive sm:col-span-3">{error}</p>}

          {/* Add Button */}
          <div className="sm:col-span-3 flex justify-end">
             <Button onClick={handleAddClick}>
                 <PlusCircle className="mr-2 h-4 w-4" /> Añadir Anotación
             </Button>
          </div>
        </div>

        {/* --- Lista de notas existentes --- */}
        <div className="flex-grow overflow-hidden py-4">
          <h4 className="mb-3 font-medium text-sm text-foreground">Anotaciones Guardadas</h4>
          {notes.length > 0 ? (
            <ScrollArea className="h-[35vh] pr-4"> {/* Ajusta altura según necesites */}
              <ul className="space-y-2">
                {notes.map((note) => {
                   const employeeName = note.employeeId ? employees.find(e => e.id === note.employeeId)?.name : null;
                   const noteDate = parseDateFns(note.date, 'yyyy-MM-dd', new Date());
                   const formattedDate = isValidDate(noteDate) ? format(noteDate, 'EEE dd MMM', { locale: es }) : note.date;
                  return (
                    <li key={note.id} className="flex items-start justify-between p-2 border rounded-md bg-background text-sm">
                      <div className="flex-grow mr-2">
                         <span className="font-medium text-foreground">{note.note}</span>
                         <span className="block text-xs text-muted-foreground">
                            {formattedDate}
                            {employeeName ? ` - ${employeeName}` : ''}
                         </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 flex-shrink-0 text-destructive hover:bg-destructive/10"
                        onClick={() => onDeleteNote(note.id)}
                        title="Eliminar anotación"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  );
                 })}
              </ul>
            </ScrollArea>
          ) : (
            <p className="text-sm text-muted-foreground italic text-center py-4">No hay anotaciones guardadas.</p>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">
              <X className="mr-2 h-4 w-4" /> Cerrar
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};