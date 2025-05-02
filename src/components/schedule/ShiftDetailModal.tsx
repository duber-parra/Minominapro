'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch'; // Import Switch
import { Save, X, PencilLine } from 'lucide-react'; // Added PencilLine
import type { ShiftDetails } from '@/types/schedule'; // Assuming type exists
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils'; // Import cn

interface ShiftDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (details: ShiftDetails) => void;
  employeeName: string;
  departmentName: string;
  initialDetails?: Partial<ShiftDetails>; // For editing existing shifts
  isEditing?: boolean; // Flag to indicate if editing
}

// Basic time validation (HH:MM format)
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
const timeErrorMessage = 'Formato HH:MM inválido.';

export const ShiftDetailModal: React.FC<ShiftDetailModalProps> = ({
  isOpen,
  onClose,
  onSave,
  employeeName,
  departmentName,
  initialDetails,
  isEditing = false, // Default to false (adding)
}) => {
  const { toast } = useToast();
  const [startTime, setStartTime] = useState(initialDetails?.startTime || '08:00');
  const [endTime, setEndTime] = useState(initialDetails?.endTime || '17:00');
  const [includeBreak, setIncludeBreak] = useState(initialDetails?.includeBreak || false); // Default to false
  const [breakStartTime, setBreakStartTime] = useState(initialDetails?.breakStartTime || '15:00'); // Default 3 PM
  const [breakEndTime, setBreakEndTime] = useState(initialDetails?.breakEndTime || '18:00'); // Default 6 PM

  const [startTimeError, setStartTimeError] = useState<string | null>(null);
  const [endTimeError, setEndTimeError] = useState<string | null>(null);
  const [breakStartTimeError, setBreakStartTimeError] = useState<string | null>(null);
  const [breakEndTimeError, setBreakEndTimeError] = useState<string | null>(null);

  // Reset state when modal opens or initial details change
  useEffect(() => {
    if (isOpen) {
        const defaultStartTime = '08:00';
        const defaultEndTime = '17:00';
        const defaultBreakStartTime = '15:00';
        const defaultBreakEndTime = '18:00';

        setStartTime(initialDetails?.startTime || defaultStartTime);
        setEndTime(initialDetails?.endTime || defaultEndTime);
        setIncludeBreak(initialDetails?.includeBreak || false);
        setBreakStartTime(initialDetails?.breakStartTime || defaultBreakStartTime);
        setBreakEndTime(initialDetails?.breakEndTime || defaultBreakEndTime);
        setStartTimeError(null);
        setEndTimeError(null);
        setBreakStartTimeError(null);
        setBreakEndTimeError(null);
    }
   // Dependency includes initialDetails to reset when editing a different shift
   // isEditing is included to ensure reset happens correctly when switching between add/edit modes
  }, [isOpen, initialDetails, isEditing]);


  const handleSaveClick = () => {
    let isValid = true;
    setStartTimeError(null);
    setEndTimeError(null);
    setBreakStartTimeError(null);
    setBreakEndTimeError(null);

    if (!timeRegex.test(startTime)) {
      setStartTimeError(timeErrorMessage);
      isValid = false;
    }
    if (!timeRegex.test(endTime)) {
      setEndTimeError(timeErrorMessage);
      isValid = false;
    }

    // Validate break times only if break is included
    if (includeBreak) {
        if (!breakStartTime || !timeRegex.test(breakStartTime)) {
            setBreakStartTimeError(timeErrorMessage);
            isValid = false;
        }
        if (!breakEndTime || !timeRegex.test(breakEndTime)) {
            setBreakEndTimeError(timeErrorMessage);
            isValid = false;
        }

        // Check break end time is after break start time
        if (isValid && breakStartTime && breakEndTime && breakStartTime >= breakEndTime) {
             setBreakEndTimeError('Hora fin descanso debe ser posterior a hora inicio.');
             isValid = false;
             // Note: Simple comparison works for HH:MM within the same day.
             // More complex logic needed if breaks can cross midnight (unlikely scenario).
        }
    }


    // Basic check: end time should be after start time (doesn't handle overnight yet)
    if (isValid && startTime >= endTime) {
        // Allow overnight shifts for simplicity, maybe add a warning or flag later
        // setEndTimeError('Hora de fin debe ser posterior a la hora de inicio.');
        // isValid = false;
    }


    if (isValid) {
      onSave({
        startTime,
        endTime,
        includeBreak,
        breakStartTime: includeBreak ? breakStartTime : undefined, // Only save if included
        breakEndTime: includeBreak ? breakEndTime : undefined,     // Only save if included
      });
    } else {
        toast({
            title: "Error de Validación",
            description: "Por favor corrige los campos marcados.",
            variant: "destructive",
        });
    }
  };

  const title = isEditing ? 'Editar Detalles del Turno' : 'Detalles del Turno';
  const saveButtonText = isEditing ? 'Guardar Cambios' : 'Guardar Turno';
  const SaveIcon = isEditing ? PencilLine : Save; // Use different icon for editing

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Modificando' : 'Asignando'} a <strong>{employeeName}</strong> en <strong>{departmentName}</strong>.
            Ingresa las horas y el descanso.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Start Time */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="start-time" className="text-right">
              Inicio Turno
            </Label>
            <Input
              id="start-time"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className={cn("col-span-3", startTimeError && 'border-destructive ring-destructive')}
            />
             {startTimeError && <p className="col-span-4 text-xs text-destructive text-right">{startTimeError}</p>}
          </div>
          {/* End Time */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="end-time" className="text-right">
              Fin Turno
            </Label>
            <Input
              id="end-time"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className={cn("col-span-3", endTimeError && 'border-destructive ring-destructive')}
            />
             {endTimeError && <p className="col-span-4 text-xs text-destructive text-right">{endTimeError}</p>}
          </div>

          {/* Include Break Switch */}
          <div className="flex items-center justify-between space-x-2 pt-2 border-t mt-2">
             <Label htmlFor="include-break" className="font-medium">
                Incluir Descanso
             </Label>
             <Switch
                id="include-break"
                checked={includeBreak}
                onCheckedChange={setIncludeBreak}
             />
          </div>


          {/* Conditional Break Time Inputs */}
          {includeBreak && (
            <>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="break-start-time" className="text-right">
                  Inicio Descanso
                </Label>
                <Input
                  id="break-start-time"
                  type="time"
                  value={breakStartTime}
                  onChange={(e) => setBreakStartTime(e.target.value)}
                  className={cn("col-span-3", breakStartTimeError && 'border-destructive ring-destructive')}
                />
                 {breakStartTimeError && <p className="col-span-4 text-xs text-destructive text-right">{breakStartTimeError}</p>}
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="break-end-time" className="text-right">
                  Fin Descanso
                </Label>
                <Input
                  id="break-end-time"
                  type="time"
                  value={breakEndTime}
                  onChange={(e) => setBreakEndTime(e.target.value)}
                  className={cn("col-span-3", breakEndTimeError && 'border-destructive ring-destructive')}
                />
                 {breakEndTimeError && <p className="col-span-4 text-xs text-destructive text-right">{breakEndTimeError}</p>}
              </div>
            </>
          )}

        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              <X className="mr-2 h-4 w-4" /> Cancelar
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleSaveClick} variant="default">
            <SaveIcon className="mr-2 h-4 w-4" /> {saveButtonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
