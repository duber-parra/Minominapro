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
  iconName?: string; // Optional: Store the name of the icon for serialization
}

export interface Employee {
  id: string; // User-defined or managed Employee ID (e.g., payroll ID)
  name: string;
  // Changed primaryLocationId to locationIds array
  locationIds: string[]; // Array of location IDs the employee is associated with
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
  id: string; // Unique ID for the assignment instance (e.g., uuid)
  employee: Employee; // Assigned employee details (includes the user-defined employee.id)
  // departmentId is implicit from the column it's in (or could be added explicitly)
}

// Represents the schedule data for a specific date and location
export interface ScheduleData {
    date: Date;
    assignments: {
        [departmentId: string]: ShiftAssignment[]; // Keyed by department ID
    };
}

// Represents assignments for a single day, keyed by department ID
// Stores only employee ID reference for templates
export type DailyAssignments = {
    [departmentId: string]: Omit<ShiftAssignment, 'id' | 'employee'> & { employee: { id: string } }[];
};

// Represents assignments for a week, keyed by date string ('yyyy-MM-dd')
export type WeeklyAssignments = {
    [dateKey: string]: DailyAssignments; // Date string maps to daily assignments structure
};


// Interface for Schedule Templates (kept for clarity, though functionality removed temporarily)
export interface ScheduleTemplate {
  id: string;
  name: string;
  type: 'day' | 'week'; // Type of template
  locationId: string; // Associated location
  assignments: DailyAssignments | WeeklyAssignments; // Assignments data
  createdAt?: Date | string; // Optional creation timestamp
}

// --- New Interface for Schedule Notes/Events ---
export interface ScheduleNote {
  id: string; // Unique ID (e.g., `note-${Date.now()}`)
  date: string; // Date in 'yyyy-MM-dd' format
  note: string; // The description of the event/note
  employeeId?: string; // Optional associated employee ID
}
// --- End of New Interface ---


// Interface for data sent to Payroll Calculator (kept for reference)
export interface PayrollCalculationInput {
  employeeId: string; // This should be the user-defined Employee ID
  periodoInicio: string; // Format "YYYY-MM-DD"
  periodoFin: string;    // Format "YYYY-MM-DD"
  salarioBasePeriodo: number;
  turnos: {
    fecha: string;          // Format "YYYY-MM-DD"
    horaEntrada: string;    // Format "HH:MM"
    horaSalida: string;     // Format "HH:MM"
    // Consider how break information should be passed. Duration might still be useful.
    duracionDescansoMinutos: number; // Keeping this for now, calculate from start/end times if provided
    // Include break start/end times if needed by calculator
    inicioDescanso?: string; // Optional "HH:MM"
    finDescanso?: string;   // Optional "HH:MM"
  }[];
}