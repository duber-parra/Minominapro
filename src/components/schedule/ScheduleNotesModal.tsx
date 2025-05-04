// src/components/schedule/ScheduleNotesModal.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { format, parse as parseDateFns, isValid as isValidDate, isWithinInterval } from 'date-fns';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
  onDeleteNote: (noteId: string) => void; // Renamed prop
  initialDate?: Date; // Optional initial date when opened from a specific day
  // New props for filtering based on context
  viewMode: 'day' | 'week';
  currentDate: Date; // The date currently focused in the planner (day view target or week start)
  weekDates?: Date[]; // Array of dates in the current week view
}

export const ScheduleNotesModal: React.FC<ScheduleNotesModalProps> = ({
  isOpen,
  onClose,
  notes: allNotes, // Rename prop to avoid conflict
  employees,
  onAddNote,
  onDeleteNote, // Use the renamed prop
  initialDate, // Receive initial date
  viewMode,
  currentDate,
  weekDates,
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(initialDate || currentDate);
  const [noteText, setNoteText] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [noteToDeleteId, setNoteToDeleteId] = useState<string | null>(null); // State for delete confirmation
  const { toast } = useToast();

  // Filter notes based on context (initialDate or current view)
  const displayedNotes = useMemo(() => {
      if (initialDate) {
          // If modal opened for a specific day, show only notes for that day
          const dateKey = format(initialDate, 'yyyy-MM-dd');
          return allNotes.filter(note => note.date === dateKey);
      } else if (viewMode === 'week' && weekDates && weekDates.length === 7) {
          // If opened generally in week view, show notes for the current week
          const weekInterval = { start: weekDates[0], end: weekDates[6] };
          return allNotes.filter(note => {
              const noteDate = parseDateFns(note.date, 'yyyy-MM-dd', new Date());
              return isValidDate(noteDate) && isWithinInterval(noteDate, weekInterval);
          }).sort((a, b) => a.date.localeCompare(b.date)); // Sort notes by date within the week
      } else {
          // If opened generally in day view, show notes for the selectedDate in the form
          if (selectedDate) {
             const dateKey = format(selectedDate, 'yyyy-MM-dd');
             return allNotes.filter(note => note.date === dateKey);
          }
          return []; // Or show all future notes? For now, show for selected day
      }
  }, [allNotes, initialDate, viewMode, weekDates, selectedDate]);

  // Reset form when modal opens or initialDate changes
  useEffect(() => {
    if (isOpen) {
      setSelectedDate(initialDate || currentDate); // Use initialDate or the planner's current date
      setNoteText('');
      setSelectedEmployeeId(undefined);
      setError(null);
      setNoteToDeleteId(null); // Reset delete confirmation on open
    }
  }, [isOpen, initialDate, currentDate]);

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

  // Function to actually delete the note after confirmation
   const confirmDeleteNote = () => {
       if (noteToDeleteId) {
           onDeleteNote(noteToDeleteId);
           setNoteToDeleteId(null); // Close the confirmation dialog
       }
   };

  const getModalTitle = () => {
      if (initialDate) return `Anotaciones para ${format(initialDate, 'PPP', { locale: es })}`;
      if (viewMode === 'week') return 'Anotaciones de la Semana';
      if (selectedDate) return `Anotaciones para ${format(selectedDate, 'PPP', { locale: es })}`;
      return 'Anotaciones Futuras / Eventos';
  };

   const getModalDescription = () => {
       if (initialDate) return 'Haz clic en una nota para eliminarla.';
       if (viewMode === 'week') return 'Notas guardadas para la semana actual. Haz clic en una nota para eliminarla.';
       if (selectedDate) return `Agrega o elimina notas para el día seleccionado (${format(selectedDate, 'PPP', { locale: es })}).`;
       return 'Agrega o elimina notas para fechas específicas.';
   };


  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <NotebookPen className="h-5 w-5" />
            {getModalTitle()}
          </DialogTitle>
          <DialogDescription>
             {getModalDescription()}
          </DialogDescription>
        </DialogHeader>

        {/* --- Formulario para añadir nota (only if not viewing specific date) --- */}
        {!initialDate && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-2 border-b pb-4"> {/* Reduced py and pb */}
            {/* Date Picker */}
            <div className="space-y-2 sm:col-span-1">
                <Label htmlFor="note-date">Fecha</Label>
                <Popover>
                <PopoverTrigger asChild>
                    <Button
                    id="note-date"
                    variant={'outline'}
                    className={cn(
                        'w-full justify-start text-left font-normal overflow-hidden whitespace-nowrap', // Added overflow styles
                        !selectedDate && 'text-muted-foreground'
                    )}
                    >
                    <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" /> {/* Prevent icon shrinking */}
                     {/* Use shorter date format and ensure it doesn't overflow */}
                    <span className="truncate"> {/* Added truncate */}
                        {selectedDate ? format(selectedDate, 'dd MMM yyyy', { locale: es }) : <span>Selecciona fecha</span>}
                    </span>
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
        )}


        {/* --- Lista de notas existentes --- */}
        <div className="flex-grow overflow-hidden py-2"> {/* Reduced py */}
          <h4 className="mb-3 font-medium text-sm text-foreground">
             Anotaciones Guardadas ({displayedNotes.length})
          </h4>
          {displayedNotes.length > 0 ? (
            <ScrollArea className="h-[40vh] pr-4"> {/* Increased height */}
              <ul className="space-y-2">
                {displayedNotes.map((note) => {
                   const employeeName = note.employeeId ? employees.find(e => e.id === note.employeeId)?.name : null;
                   const noteDate = parseDateFns(note.date, 'yyyy-MM-dd', new Date());
                   // Format date for display: Abbreviated day, numeric day, abbreviated month
                   const formattedDate = isValidDate(noteDate) ? format(noteDate, 'EEE d MMM', { locale: es }) : note.date;
                  return (
                     <li key={note.id} className="flex items-start justify-between p-2 border rounded-md bg-background text-sm">
                       <div className="flex-grow mr-2 overflow-hidden"> {/* Added overflow-hidden */}
                         <p className="font-medium text-foreground block truncate">{note.note}</p> {/* Added truncate */}
                         <span className="block text-xs text-muted-foreground truncate"> {/* Added truncate */}
                            {formattedDate}
                            {employeeName ? ` - ${employeeName}` : ''}
                         </span>
                       </div>
                        {/* Delete Button Trigger */}
                         <AlertDialog>
                             <AlertDialogTrigger asChild>
                                <Button
                                   variant="ghost"
                                   size="icon"
                                   className="h-6 w-6 text-destructive hover:text-destructive/80 flex-shrink-0"
                                   title="Eliminar anotación"
                                   onClick={() => setNoteToDeleteId(note.id)} // Set ID to delete on click
                                >
                                   <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                             <AlertDialogContent>
                               <AlertDialogHeader>
                                 <AlertDialogTitle>¿Eliminar esta anotación?</AlertDialogTitle>
                                 <AlertDialogDescription>
                                    "{note.note}"
                                    <br />
                                    Esta acción no se puede deshacer.
                                 </AlertDialogDescription>
                               </AlertDialogHeader>
                               <AlertDialogFooter>
                                 <AlertDialogCancel onClick={() => setNoteToDeleteId(null)}>Cancelar</AlertDialogCancel>
                                 <AlertDialogAction
                                    onClick={confirmDeleteNote} // Call the delete function on confirm
                                    className="bg-destructive hover:bg-destructive/90">
                                    Eliminar Anotación
                                 </AlertDialogAction>
                               </AlertDialogFooter>
                            </AlertDialogContent>
                         </AlertDialog>
                     </li>
                  );
                 })}
              </ul>
            </ScrollArea>
          ) : (
            <p className="text-sm text-muted-foreground italic text-center py-4">
                 No hay anotaciones guardadas para {initialDate ? 'esta fecha' : (viewMode === 'week' ? 'esta semana' : 'este día')}.
            </p>
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
