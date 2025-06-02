// src/lib/time-utils.ts

import { format as formatFns, parse as parseFns } from 'date-fns';
import { es } from 'date-fns/locale'; // Import Spanish locale if needed for 'am/pm'

/**
 * Formats a time string (HH:mm) into 12-hour format (h:mm a).
 * Handles invalid input gracefully.
 *
 * @param timeString - The time string in "HH:mm" format.
 * @returns The formatted time string (e.g., "8:00 AM") or the original string if invalid.
 */
export function formatTo12Hour(timeString: string | undefined): string {
  if (!timeString || !/^\d{2}:\d{2}$/.test(timeString)) {
    return timeString || ''; // Return original or empty string if invalid/undefined
  }

  try {
    // Create a dummy date object with the time to use date-fns formatting
    const dummyDate = parseFns(timeString, 'HH:mm', new Date());
    // Format using 'h:mm a' for 12-hour format with AM/PM
    // Use locale 'es' if you want 'a. m.'/'p. m.' instead of AM/PM
    return formatFns(dummyDate, 'h:mm a', { locale: es });
  } catch (error) {
    console.error(`Error formatting time string "${timeString}":`, error);
    return timeString; // Return original string on error
  }
}

/**
 * Parses a time string (HH:MM) into total minutes from midnight.
 * @param timeStr - The time string in "HH:mm" format.
 * @returns The total minutes from midnight, or 0 if invalid.
 */
export const parseTimeToMinutes = (timeStr: string | undefined): number => {
    if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
};
