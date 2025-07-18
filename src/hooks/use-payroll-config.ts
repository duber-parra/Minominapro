// src/hooks/use-payroll-config.ts

import { useState, useEffect, useCallback } from 'react';
import { VALORES as DEFAULT_VALORES, AUXILIO_TRANSPORTE_VALOR_QUINCENAL as DEFAULT_AUXILIO_TRANSPORTE } from '@/config/payroll-values';

export type PayrollValues = typeof DEFAULT_VALORES;

interface PayrollConfig {
  valores: PayrollValues;
  auxilioTransporte: number;
}

const DEFAULT_CONFIG: PayrollConfig = {
  valores: DEFAULT_VALORES,
  auxilioTransporte: DEFAULT_AUXILIO_TRANSPORTE,
};

const STORAGE_KEY = 'payroll_configuration';

export const usePayrollConfig = () => {
  const [config, setConfig] = useState<PayrollConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);

  // Load configuration from localStorage on mount
  useEffect(() => {
    const loadConfig = () => {
      try {
        const storedConfig = localStorage.getItem(STORAGE_KEY);
        if (storedConfig) {
          const parsedConfig = JSON.parse(storedConfig) as PayrollConfig;
          
          // Validate that all required keys exist
          const hasAllKeys = Object.keys(DEFAULT_VALORES).every(key => 
            key in parsedConfig.valores
          );
          
          if (hasAllKeys && typeof parsedConfig.auxilioTransporte === 'number') {
            setConfig(parsedConfig);
          } else {
            console.warn('Invalid payroll configuration found, using defaults');
            setConfig(DEFAULT_CONFIG);
          }
        }
      } catch (error) {
        console.error('Error loading payroll configuration:', error);
        setConfig(DEFAULT_CONFIG);
      } finally {
        setIsLoading(false);
      }
    };

    loadConfig();
  }, []);

  // Save configuration to localStorage
  const saveConfig = useCallback((newConfig: PayrollConfig) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
      setConfig(newConfig);
    } catch (error) {
      console.error('Error saving payroll configuration:', error);
      throw new Error('Error al guardar la configuración');
    }
  }, []);

  // Update specific values
  const updateValores = useCallback((newValores: Partial<PayrollValues>) => {
    const updatedConfig = {
      ...config,
      valores: { ...config.valores, ...newValores }
    };
    saveConfig(updatedConfig);
  }, [config, saveConfig]);

  // Update auxilio transporte
  const updateAuxilioTransporte = useCallback((newValue: number) => {
    const updatedConfig = {
      ...config,
      auxilioTransporte: newValue
    };
    saveConfig(updatedConfig);
  }, [config, saveConfig]);

  // Reset to default values
  const resetToDefaults = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setConfig(DEFAULT_CONFIG);
    } catch (error) {
      console.error('Error resetting payroll configuration:', error);
      throw new Error('Error al restablecer la configuración');
    }
  }, []);

  // Get current values for calculations
  const getCurrentValues = useCallback(() => config.valores, [config.valores]);

  // Get current auxilio transporte value
  const getCurrentAuxilioTransporte = useCallback(() => config.auxilioTransporte, [config.auxilioTransporte]);

  return {
    config,
    isLoading,
    updateValores,
    updateAuxilioTransporte,
    resetToDefaults,
    getCurrentValues,
    getCurrentAuxilioTransporte,
    saveConfig,
  };
};
