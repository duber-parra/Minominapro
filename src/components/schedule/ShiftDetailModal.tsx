
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
import { Save, X } from 'lucide-react';
import type { ShiftDetails } from '@/types/schedule'; // Assuming type exists
import { useToast } from '@/hooks/use-toast';

interface ShiftDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (details: ShiftDetails) => void;
  employeeName: string;
  departmentName: string;
  initialDetails?: Partial<ShiftDetails>; // For editing existing shifts
}

// Basic time validation (HH:MM format)
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const ShiftDetailModal: React.FC<ShiftDetailModalProps> = ({
  isOpen,
  onClose,
  onSave,
  employeeName,
  departmentName,
  initialDetails,
}) => {
  const { toast } = useToast();
  const [startTime, setStartTime] = useState(initialDetails?.startTime || '08:00');
  const [endTime, setEndTime] = useState(initialDetails?.endTime || '17:00');
  const [breakDuration, setBreakDuration] = useState(
    (initialDetails?.breakDurationMinutes ?? 60).toString() // Default to 60 mins
  );
  const [startTimeError, setStartTimeError] = useState<string | null>(null);
  const [endTimeError, setEndTimeError] = useState<string | null>(null);
  const [breakError, setBreakError] = useState<string | null>(null);

  // Reset state when modal opens or initial details change
  useEffect(() => {
    if (isOpen) {
      setStartTime(initialDetails?.startTime || '08:00');
      setEndTime(initialDetails?.endTime || '17:00');
      setBreakDuration((initialDetails?.breakDurationMinutes ?? 60).toString());
      setStartTimeError(null);
      setEndTimeError(null);
      setBreakError(null);
    }
  }, [isOpen, initialDetails]);

  const handleSaveClick = () => {
    let isValid = true;
    setStartTimeError(null);
    setEndTimeError(null);
    setBreakError(null);

    if (!timeRegex.test(startTime)) {
      setStartTimeError('Formato HH:MM inválido.');
      isValid = false;
    }
    if (!timeRegex.test(endTime)) {
      setEndTimeError('Formato HH:MM inválido.');
      isValid = false;
    }

    const breakMinutes = parseInt(breakDuration, 10);
    if (isNaN(breakMinutes) || breakMinutes < 0) {
      setBreakError('Debe ser un número positivo o 0.');
      isValid = false;
    }

    // Basic check: end time should be after start time (doesn't handle overnight yet)
    if (isValid && startTime >= endTime) {
        setEndTimeError('Hora de fin debe ser posterior a la hora de inicio.');
        // Note: This simple check fails for overnight shifts. Needs date-fns or similar for proper comparison.
        // For now, we allow it but ideally should be handled.
        // isValid = false; // Temporarily allow overnight for simplicity
    }


    if (isValid) {
      onSave({
        startTime,
        endTime,
        breakDurationMinutes: breakMinutes,
      });
    } else {
        toast({
            title: "Error de Validación",
            description: "Por favor corrige los campos marcados.",
            variant: "destructive",
        });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Detalles del Turno</DialogTitle>
          <DialogDescription>
            Asignando a <strong>{employeeName}</strong> en <strong>{departmentName}</strong>.
            Ingresa las horas y el descanso.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Start Time */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="start-time" className="text-right">
              Inicio
            </Label>
            <Input
              id="start-time"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className={`col-span-3 ${startTimeError ? 'border-destructive ring-destructive' : ''}`}
            />
             {startTimeError && <p className="col-span-4 text-xs text-destructive text-right">{startTimeError}</p>}
          </div>
          {/* End Time */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="end-time" className="text-right">
              Fin
            </Label>
            <Input
              id="end-time"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className={`col-span-3 ${endTimeError ? 'border-destructive ring-destructive' : ''}`}
            />
             {endTimeError && <p className="col-span-4 text-xs text-destructive text-right">{endTimeError}</p>}
          </div>
          {/* Break Duration */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="break-duration" className="text-right">
              Descanso (min)
            </Label>
            <Input
              id="break-duration"
              type="number"
              value={breakDuration}
              onChange={(e) => setBreakDuration(e.target.value)}
              min="0"
              className={`col-span-3 ${breakError ? 'border-destructive ring-destructive' : ''}`}
              placeholder="Ej: 60"
            />
             {breakError && <p className="col-span-4 text-xs text-destructive text-right">{breakError}</p>}
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              <X className="mr-2 h-4 w-4" /> Cancelar
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleSaveClick} variant="default">
            <Save className="mr-2 h-4 w-4" /> Guardar Turno
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

    