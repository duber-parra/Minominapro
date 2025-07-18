// src/components/payroll-config-indicator.tsx

'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { hasCustomConfiguration } from '@/lib/payroll-config-utils';

export const PayrollConfigIndicator = () => {
  const [hasCustomConfig, setHasCustomConfig] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkCustomConfig = () => {
      try {
        const hasCustom = hasCustomConfiguration();
        setHasCustomConfig(hasCustom);
      } catch (error) {
        console.error('Error checking custom configuration:', error);
        setHasCustomConfig(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkCustomConfig();

    // Listen for storage changes to update the indicator
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'payroll_configuration') {
        checkCustomConfig();
      }
    };

    // Listen for custom config change events
    const handleConfigChange = () => {
      checkCustomConfig();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('payroll-config-changed', handleConfigChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('payroll-config-changed', handleConfigChange);
    };
  }, []);

  if (isLoading) {
    return null;
  }

  if (!hasCustomConfig) {
    return null;
  }

  return (
    <Badge 
      variant="secondary" 
      className="text-xs bg-primary/10 text-primary border-primary/20"
      title="Usando configuración personalizada de valores de nómina"
    >
      Config. Personalizada
    </Badge>
  );
};
