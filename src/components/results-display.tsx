'use client';
 
 import type { FC } from 'react';
@@ -189,14 +189,14 @@
 }
 
 const formatCurrency = (value: number): string => {
-    // Format number to Colombian Pesos (COP) without decimals
+    // Format number to Colombian Pesos (COP) with thousand separators and without decimals
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
-}
+};
 
 const formatHours = (hours: number): string => {
     // Format to use comma as decimal separator for Spanish locale

