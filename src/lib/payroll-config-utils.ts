// src/lib/payroll-config-utils.ts

import { VALORES as DEFAULT_VALORES, AUXILIO_TRANSPORTE_VALOR_QUINCENAL as DEFAULT_AUXILIO_TRANSPORTE } from '@/config/payroll-values';
import type { PayrollValues, DominicalDaysConfig } from '@/hooks/use-payroll-config';

// Configuración por defecto: solo domingos tienen recargo dominical
const DEFAULT_DOMINICAL_DAYS: DominicalDaysConfig = {
  domingo: true,
  lunes: false,
  martes: false,
  miercoles: false,
  jueves: false,
  viernes: false,
  sabado: false,
};

interface PayrollConfig {
  valores: PayrollValues;
  auxilioTransporte: number;
  diasDominicales: DominicalDaysConfig;
}

const STORAGE_KEY = 'payroll_configuration';

/**
 * Get the current payroll configuration from localStorage
 * Falls back to default values if no configuration is found or if it's invalid
 */
export const getPayrollConfig = (): PayrollConfig => {
  if (typeof window === 'undefined') {
    // Server-side rendering - return defaults
    return {
      valores: DEFAULT_VALORES,
      auxilioTransporte: DEFAULT_AUXILIO_TRANSPORTE,
      diasDominicales: DEFAULT_DOMINICAL_DAYS,
    };
  }

  try {
    const storedConfig = localStorage.getItem(STORAGE_KEY);
    if (!storedConfig) {
      return {
        valores: DEFAULT_VALORES,
        auxilioTransporte: DEFAULT_AUXILIO_TRANSPORTE,
        diasDominicales: DEFAULT_DOMINICAL_DAYS,
      };
    }

    const parsedConfig = JSON.parse(storedConfig) as PayrollConfig;
    
    // Validate that all required keys exist
    const hasAllKeys = Object.keys(DEFAULT_VALORES).every(key => 
      key in parsedConfig.valores
    );
    
    // Validate diasDominicales or set default if missing
    const diasDominicales = parsedConfig.diasDominicales || DEFAULT_DOMINICAL_DAYS;
    
    if (hasAllKeys && typeof parsedConfig.auxilioTransporte === 'number') {
      return {
        ...parsedConfig,
        diasDominicales
      };
    }
    
    // Invalid configuration found, return defaults
    console.warn('Invalid payroll configuration found in localStorage, using defaults');
    return {
      valores: DEFAULT_VALORES,
      auxilioTransporte: DEFAULT_AUXILIO_TRANSPORTE,
      diasDominicales: DEFAULT_DOMINICAL_DAYS,
    };
  } catch (error) {
    console.error('Error reading payroll configuration from localStorage:', error);
    return {
      valores: DEFAULT_VALORES,
      auxilioTransporte: DEFAULT_AUXILIO_TRANSPORTE,
      diasDominicales: DEFAULT_DOMINICAL_DAYS,
    };
  }
};

/**
 * Get only the valores (hourly rates) from the configuration
 */
export const getPayrollValores = (): PayrollValues => {
  return getPayrollConfig().valores;
};

/**
 * Get only the auxilio transporte value from the configuration
 */
export const getAuxilioTransporteValue = (): number => {
  return getPayrollConfig().auxilioTransporte;
};

/**
 * Get the dominical days configuration
 */
export const getDiasDominicales = (): DominicalDaysConfig => {
  return getPayrollConfig().diasDominicales;
};

/**
 * Check if a specific date should have dominical surcharge based on configuration
 * @param fecha - The date to check
 * @returns boolean - true if the day should have dominical surcharge
 */
export const esDiaDominical = (fecha: Date): boolean => {
  const diasConfig = getDiasDominicales();
  const dayOfWeek = fecha.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  switch (dayOfWeek) {
    case 0: return diasConfig.domingo;
    case 1: return diasConfig.lunes;
    case 2: return diasConfig.martes;
    case 3: return diasConfig.miercoles;
    case 4: return diasConfig.jueves;
    case 5: return diasConfig.viernes;
    case 6: return diasConfig.sabado;
    default: return false;
  }
};

/**
 * Check if the user has custom configuration (different from defaults)
 */
export const hasCustomConfiguration = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const config = getPayrollConfig();
  
  // Check if valores are different from defaults
  const valoresChanged = Object.keys(DEFAULT_VALORES).some(key => {
    const currentValue = config.valores[key as keyof PayrollValues];
    const defaultValue = DEFAULT_VALORES[key as keyof PayrollValues];
    return currentValue !== defaultValue;
  });
  
  // Check if auxilio transporte is different from default
  const auxilioChanged = config.auxilioTransporte !== DEFAULT_AUXILIO_TRANSPORTE;
  
  return valoresChanged || auxilioChanged;
};
