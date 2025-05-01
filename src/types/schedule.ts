
// src/types/schedule.ts

import type { LucideIcon } from 'lucide-react';

export interface Location {
  id: string;
  name: string;
}

export interface Department {
  id: string;
  name: string;
  locationId: string; // Link to Location
  icon?: LucideIcon; // Optional icon component
}

export interface Employee {
  id: string;
  name: string;
  primaryLocationId: string; // Link to primary Location
  // Add other relevant employee details if needed (e.g., role, skills)
}

export interface ShiftDetails {
    startTime: string; // Format "HH:MM"
    endTime: string;   // Format "HH:MM"
    breakDurationMinutes: number;
}

export interface ShiftAssignment extends ShiftDetails {
  id: string; // Unique ID for the assignment instance
  employee: Employee; // Assigned employee details
  // departmentId is implicit from the column it's in (or could be added explicitly)
}

// Represents the schedule data for a specific date and location
export interface ScheduleData {
    date: Date;
    assignments: {
        [departmentId: string]: ShiftAssignment[]; // Keyed by department ID
    };
}

// Interface for shift templates (optional)
export interface ShiftTemplate {
  id: string;
  name: string;
  locationId: string;
  assignments: {
    [departmentId: string]: Pick<ShiftAssignment, 'employee' | 'startTime' | 'endTime' | 'breakDurationMinutes'>[];
  };
}

// Interface for data sent to Payroll Calculator
export interface PayrollCalculationInput {
  employeeId: string;
  periodoInicio: string; // Format "YYYY-MM-DD"
  periodoFin: string;    // Format "YYYY-MM-DD"
  salarioBasePeriodo: number;
  turnos: {
    fecha: string;          // Format "YYYY-MM-DD"
    horaEntrada: string;    // Format "HH:MM"
    horaSalida: string;     // Format "HH:MM"
    duracionDescansoMinutos: number;
  }[];
}

    