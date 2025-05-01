'use server';
 
 import {
     parse, format, addHours, addDays,
@@ -14,7 +14,7 @@
  
  
 // --- Constantes y Parámetros ---
 const HORAS_JORNADA_BASE = 7.66; // Horas base antes de considerar extras (ej: 47h/sem / 6 dias = 7.83, pero para cálculo diario se suele usar 8h o valor acuerdo. ¡AJUSTAR!)
 const HORA_NOCTURNA_INICIO = 21; // 9 PM (inclusive)
 const HORA_NOCTURNA_FIN = 6;   // 6 AM (exclusive)
 const HORA_INICIO_DESCANSO = 15; // 3 PM (inclusive)
