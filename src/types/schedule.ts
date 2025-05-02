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
    includeBreak: boolean; // Flag to indicate if break is included
    breakStartTime?: string; // Format "HH:MM", optional
    breakEndTime?: string;   // Format "HH:MM", optional
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
    // Use Omit to exclude 'id' from the saved assignment structure in the template
    [departmentId: string]: Omit<ShiftAssignment, 'id'>[];
    // Alternatively, if you want to save employee ID but not the full object:
    // [departmentId: string]: (Omit<ShiftAssignment, 'id' | 'employee'> & { employeeId: string })[];
  };
   createdAt: string; // ISO Date string when the template was created
}


// Interface for data sent to Payroll Calculator
// TODO: Update this interface if the payroll calculator needs the break start/end times
export interface PayrollCalculationInput {
  employeeId: string;
  periodoInicio: string; // Format "YYYY-MM-DD"
  periodoFin: string;    // Format "YYYY-MM-DD"
  salarioBasePeriodo: number;
  turnos: {
    fecha: string;          // Format "YYYY-MM-DD"
    horaEntrada: string;    // Format "HH:MM"
    horaSalida: string;     // Format "HH:MM"
    // Consider how break information should be passed. Duration might still be useful.
    duracionDescansoMinutos: number; // Keeping this for now, calculate from start/end times if provided
  }[];
}

    