
// src/services/payroll-settings-service.ts
'use client'; // Ensure this runs on the client-side for localStorage access

// Assuming defaultPayrollSettings is also defined and exported from '@/types/payroll-settings'
import { defaultPayrollSettings, type PayrollSettings } from '@/types/payroll-settings';


const SETTINGS_LOCAL_STORAGE_KEY = 'payrollSettingsGlobal';

export async function getPayrollSettings(): Promise<PayrollSettings> {
  console.log('[getPayrollSettings] Attempting to get settings from localStorage...');
  if (typeof window === 'undefined') {
    console.warn("[getPayrollSettings] Not on client-side. Returning default payroll settings.");
    return { ...defaultPayrollSettings, id: 'global' };
  }

  try {
    const settingsString = localStorage.getItem(SETTINGS_LOCAL_STORAGE_KEY);
    if (settingsString) {
      const storedSettingsRaw = JSON.parse(settingsString);
      console.log("[getPayrollSettings] Settings found in localStorage. Raw data:", storedSettingsRaw);

      const processedSettings: Partial<PayrollSettings> = {};
      for (const key in defaultPayrollSettings) {
        if (Object.prototype.hasOwnProperty.call(defaultPayrollSettings, key)) {
          const K = key as keyof PayrollSettings;
          if (Object.prototype.hasOwnProperty.call(storedSettingsRaw, K)) {
            const storedValue = storedSettingsRaw[K];
            if (typeof defaultPayrollSettings[K] === 'number') {
              const numValue = parseFloat(String(storedValue));
              if (!isNaN(numValue)) {
                (processedSettings[K] as any) = numValue;
              } else {
                console.warn(`[getPayrollSettings] Invalid numeric value for ${K}: '${storedValue}'. Falling back to default.`);
                (processedSettings[K] as any) = defaultPayrollSettings[K];
              }
            } else if (typeof defaultPayrollSettings[K] === 'boolean') {
              (processedSettings[K] as any) = typeof storedValue === 'boolean' ? storedValue : defaultPayrollSettings[K];
            }
             else {
              (processedSettings[K] as any) = storedValue;
            }
          } else {
            // If a key is in defaults but not in stored, use the default
             (processedSettings[K] as any) = defaultPayrollSettings[K];
          }
        }
      }

      const settingsToReturn: PayrollSettings = {
        ...defaultPayrollSettings, // Ensure all default keys are present
        ...processedSettings,       // Override with processed stored data
        id: 'global',
        lastUpdated: storedSettingsRaw.lastUpdated ? new Date(storedSettingsRaw.lastUpdated) : undefined,
      };

      console.log("[getPayrollSettings] Processed settings to be returned:", settingsToReturn);
      return settingsToReturn;
    } else {
      console.log("[getPayrollSettings] No payroll settings found in localStorage, returning default settings.");
      return { ...defaultPayrollSettings, id: 'global' };
    }
  } catch (error) {
    console.error("[getPayrollSettings] Error fetching payroll settings from localStorage:", error);
    console.log("[getPayrollSettings] Returning default settings due to error.");
    return { ...defaultPayrollSettings, id: 'global' }; // Return defaults on error
  }
}

export async function savePayrollSettings(settings: Omit<PayrollSettings, 'id' | 'lastUpdated' | 'summary'>): Promise<void> {
  console.log('[savePayrollSettings] Received settings to save to localStorage:', settings);
  if (typeof window === 'undefined') {
    console.error("[savePayrollSettings] Not on client-side. Cannot save payroll settings to localStorage.");
    throw new Error("Operación no disponible en el servidor. No se pudieron guardar los ajustes.");
  }
  try {
    // Ensure all numeric values are stored as numbers, not strings
    const sanitizedSettings: Record<string, any> = {};
    for (const key in settings) {
        if (Object.prototype.hasOwnProperty.call(settings, key)) {
            const K = key as keyof typeof settings;
            const value = settings[K];
             const defaultType = typeof defaultPayrollSettings[K as keyof PayrollSettings];

            if (defaultType === 'number' && typeof value === 'string' && !isNaN(parseFloat(value))) {
                sanitizedSettings[K] = parseFloat(value);
            } else if (defaultType === 'boolean' && typeof value !== 'boolean') {
                 // Attempt to coerce to boolean if not already, or use default
                 sanitizedSettings[K] = value === 'true' ? true : (value === 'false' ? false : defaultPayrollSettings[K as keyof PayrollSettings]);
            }
            else {
                sanitizedSettings[K] = value;
            }
        }
    }

    const settingsToSave = {
      ...defaultPayrollSettings, // Start with defaults to ensure all fields are present
      ...sanitizedSettings,    // Override with sanitized input
      id: undefined, // Remove id and summary before saving global settings
      summary: undefined,
      lastUpdated: new Date().toISOString(), // Store date as ISO string for localStorage
    };
    delete settingsToSave.id;
    delete settingsToSave.summary;


    localStorage.setItem(SETTINGS_LOCAL_STORAGE_KEY, JSON.stringify(settingsToSave));
    console.log("[savePayrollSettings] Payroll settings saved successfully to localStorage.", settingsToSave);
  } catch (error) {
    console.error("[savePayrollSettings] Error saving payroll settings to localStorage:", error);
    let errorMessage = "No se pudo guardar la configuración localmente.";
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      errorMessage = "No se pudo guardar la configuración: almacenamiento local lleno.";
    }
    throw new Error(errorMessage);
  }
}
