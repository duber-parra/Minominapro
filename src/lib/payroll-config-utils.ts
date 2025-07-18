// src/lib/payroll-config-utils.ts

import { VALORES as DEFAULT_VALORES, AUXILIO_TRANSPORTE_VALOR_QUINCENAL as DEFAULT_AUXILIO_TRANSPORTE } from '@/config/payroll-values';
import type { PayrollValues } from '@/hooks/use-payroll-config';

interface PayrollConfig {
  valores: PayrollValues;
  auxilioTransporte: number;
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
    };
  }

  try {
    const storedConfig = localStorage.getItem(STORAGE_KEY);
    if (!storedConfig) {
      return {
        valores: DEFAULT_VALORES,
        auxilioTransporte: DEFAULT_AUXILIO_TRANSPORTE,
      };
    }

    const parsedConfig = JSON.parse(storedConfig) as PayrollConfig;
    
    // Validate that all required keys exist
    const hasAllKeys = Object.keys(DEFAULT_VALORES).every(key => 
      key in parsedConfig.valores
    );
    
    if (hasAllKeys && typeof parsedConfig.auxilioTransporte === 'number') {
      return parsedConfig;
    }
    
    // Invalid configuration found, return defaults
    console.warn('Invalid payroll configuration found in localStorage, using defaults');
    return {
      valores: DEFAULT_VALORES,
      auxilioTransporte: DEFAULT_AUXILIO_TRANSPORTE,
    };
  } catch (error) {
    console.error('Error reading payroll configuration from localStorage:', error);
    return {
      valores: DEFAULT_VALORES,
      auxilioTransporte: DEFAULT_AUXILIO_TRANSPORTE,
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
