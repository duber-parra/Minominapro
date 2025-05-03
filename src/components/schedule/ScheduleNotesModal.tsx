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
  initialDate?: Date; // Optional initial date
}

export const ScheduleNotesModal: React.FC<ScheduleNotesModalProps> = ({
  isOpen,
  onClose,
  notes: allNotes, // Rename prop to avoid conflict
  employees,
  onAddNote,
  onDeleteNote, // Use the renamed prop
  initialDate, // Receive initial date
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(initialDate || new Date());
  const [noteText, setNoteText] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [noteToDeleteId, setNoteToDeleteId] = useState<string | null>(null); // State for delete confirmation
  const { toast } = useToast();

  // Filter notes based on initialDate if provided, otherwise use all notes
  const filteredNotes = initialDate
    ? allNotes.filter(note => note.date === format(initialDate, 'yyyy-MM-dd'))
    : allNotes;

  // Reset form when modal opens or initialDate changes
  useEffect(() => {
    if (isOpen) {
      setSelectedDate(initialDate || new Date()); // Use initialDate if available
      setNoteText('');
      setSelectedEmployeeId(undefined);
      setError(null);
      setNoteToDeleteId(null); // Reset delete confirmation on open
    }
  }, [isOpen, initialDate]);

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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <NotebookPen className="h-5 w-5" />
            {initialDate ? `Anotaciones para ${format(initialDate, 'PPP', { locale: es })}` : 'Anotaciones Futuras / Eventos'}
          </DialogTitle>
          <DialogDescription>
            {initialDate ? 'Haz clic en una nota para eliminarla.' : 'Agrega o elimina notas para fechas específicas.'}
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
                        'w-full justify-start text-left font-normal',
                        !selectedDate && 'text-muted-foreground'
                    )}
                    >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                     {/* Use shorter date format */}
                    {selectedDate ? format(selectedDate, 'dd MMM yyyy', { locale: es }) : <span>Selecciona fecha</span>}
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
              {initialDate ? `Anotaciones Existentes (${filteredNotes.length})` : `Anotaciones Guardadas (${allNotes.length})`}
          </h4>
          {filteredNotes.length > 0 ? (
            <ScrollArea className="h-[40vh] pr-4"> {/* Increased height */}
              <ul className="space-y-2">
                {filteredNotes.map((note) => {
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
                    </li>
                  );
                 })}
              </ul>
            </ScrollArea>
          ) : (
            <p className="text-sm text-muted-foreground italic text-center py-4">
                {initialDate ? 'No hay anotaciones para esta fecha.' : 'No hay anotaciones guardadas.'}
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

       {/* Confirmation Dialog for Deleting Note */}
       <AlertDialog open={!!noteToDeleteId} onOpenChange={(open) => !open && setNoteToDeleteId(null)}>
         <AlertDialogContent>
           <AlertDialogHeader>
             <AlertDialogTitle>¿Eliminar esta anotación?</AlertDialogTitle>
             <AlertDialogDescription>
                {/* Optionally show note details here */}
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

    </Dialog>
  );
};