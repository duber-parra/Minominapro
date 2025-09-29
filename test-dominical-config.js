// Test temporal para verificar que la configuración de días dominicales funciona correctamente
// Este archivo se puede eliminar después de verificar que todo funciona

// Ejemplo de cómo probar la nueva funcionalidad

import { esDiaDominical } from './src/lib/payroll-config-utils.ts';

// Test 1: Configuración por defecto - solo domingo
console.log('=== Test de configuración por defecto ===');
// Simular que la configuración está en localStorage con valores por defecto

// Domingo (día 0)
const domingo = new Date(2024, 0, 7); // 7 enero 2024 es domingo
console.log('¿Es domingo dominical?', esDiaDominical(domingo)); // Debería ser true

// Lunes (día 1)  
const lunes = new Date(2024, 0, 8); // 8 enero 2024 es lunes
console.log('¿Es lunes dominical?', esDiaDominical(lunes)); // Debería ser false

console.log('\n=== Fin de los tests ===');