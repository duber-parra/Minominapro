'use server';
 
 import {
     parse, format, addHours, addDays,
@@ -14,7 +14,7 @@
  
  
 // --- Constantes y Parámetros ---
-const HORAS_JORNADA_BASE = 7.66; // Horas base antes de considerar extras (ej: 47h/sem / 6 dias = 7.83, pero para cálculo diario se suele usar 8h o valor acuerdo. ¡AJUSTAR!)
+const HORAS_JORNADA_BASE = 7.66; // Horas base antes de considerar extras (ej: 47h/sem / 6 dias = 7.83, pero para cálculo diario se suele usar 8h o valor acuerdo. ¡AJUSTAR!)
 const HORA_NOCTURNA_INICIO = 21; // 9 PM (inclusive)
 const HORA_NOCTURNA_FIN = 6;   // 6 AM (exclusive)
 const HORA_INICIO_DESCANSO = 15; // 3 PM (inclusive)
@@ -22,15 +22,15 @@
 
 // Valores por hora (pesos colombianos) - Ejemplo basado en SMMLV 2024 ($1,300,000) + Aux ($162,000) --> Valor Hora Ordinaria ~$5,416.67
 // ESTOS VALORES SON EJEMPLOS Y DEBEN SER CALCULADOS CON PRECISIÓN SEGÚN NORMATIVA Y SALARIO REAL
-const VALORES_RECARGOS_EXTRAS = {
-    "Recargo_Noct_Base": 5417 * 0.35,          // Recargo 35% sobre hora ordinaria por ser nocturna
-    "HED": 5417 * 0.25,                       // Valor extra por hora extra diurna (25% adicional al valor base)
-    "HEN": 5417 * 0.75,                       // Valor extra por hora extra nocturna (75% adicional al valor base)
-    "Recargo_Dom_Diurno_Base": 5417 * 0.75,    // Recargo 75% sobre hora ordinaria por ser dominical/festiva diurna
-    "Recargo_Dom_Noct_Base": 5417 * (0.75 + 0.35), // Recargo 75% (dominical) + 35% (nocturno) = 110%
-    "HEDD_F": 5417 * (1 + 0.75 + 0.25),       // Valor hora (100%) + Recargo Dom (75%) + Recargo Extra Diurna (25%) = 200% --> Extra es 100%
-    "HEND_F": 5417 * (1 + 0.75 + 0.75),       // Valor hora (100%) + Recargo Dom (75%) + Recargo Extra Nocturna (75%) = 250% --> Extra es 150%
-    "Ordinaria_Diurna_Base": 0                // La hora base no tiene recargo *adicional* en sí misma
+const VALORES = { // ESTE ES EL OBJETO QUE DEBES ACTUALIZAR SI LOS VALORES CAMBIAN:
+    "Recargo_Noct_Base": 2166,          // Recargo Nocturno (dentro de las 7.6h base, laboral)
+    "HED": 7736.41,                        // Hora Extra Diurna (después de 7.6h,laboral, hasta las 9 pm )
+    "HEN": 10830.98,                        // Hora Extra Nocturna (después de 7.6h, laboral)
+    "Recargo_Dom_Diurno_Base": 4642,    // Recargo Dominical/Festivo Diurno (dentro de 7.6h)
+    "Recargo_Dom_Noct_Base": 6808,    // Recargo Dominical/Festivo Nocturno (dentro de 7.6h)
+    "HEDD_F": 12378.26,                     // Hora Extra Dominical/Festiva Diurna (después de 7.6h)
+    "HEND_F": 15472.83,                     // Hora Extra Dominical/Festiva Nocturna (después de 7.6h)
+    "Ordinaria_Diurna_Base": 0          // Horas base diurnas laborales (sin recargo adicional sobre el salario)
 };
 
 // Valor hora base - Ejemplo: Salario Mínimo 2024 / 235 horas mensuales (aproximado legal)
@@ -158,6 +158,6 @@
             };
 
     } catch (error) {
-
+      return { error: "Ocurrió un error al calcular la jornada laboral." };
     }
+  }
+
+