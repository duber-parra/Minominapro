# Sistema de Configuración de Valores de Nómina

## Descripción General

Este sistema permite a los usuarios personalizar los valores por hora utilizados en los cálculos de nómina, guardando la configuración en el navegador (localStorage) para persistir entre sesiones.

## Características

### 🔧 Configuración Dinámica
- **Valores por Hora**: Permite modificar todos los valores de recargos y horas extras
- **Auxilio de Transporte**: Configurable independientemente  
- **Persistencia**: Los valores se guardan automáticamente en localStorage
- **Valores por Defecto**: Fallback automático a valores predeterminados

### 🎯 Integración Completa
- **Cálculos en Tiempo Real**: Los nuevos valores se aplican inmediatamente
- **Server Actions**: Compatible con funciones server-side de Next.js
- **Edición Manual**: Funciona con la edición manual de horas calculadas
- **Exportación PDF**: Los PDFs usan los valores configurados

### 🔒 Seguridad y Validación
- **Validación de Campos**: Valores numéricos positivos requeridos
- **Manejo de Errores**: Fallback a valores por defecto en caso de error
- **Tipado Fuerte**: TypeScript para prevenir errores

## Archivos Principales

### `src/hooks/use-payroll-config.ts`
Hook principal que maneja:
- Carga y guardado de configuración
- Validación de datos
- Funciones de utilidad

### `src/components/payroll-config-modal.tsx`
Componente de interfaz con:
- Formulario completo de configuración
- Organización por categorías
- Botón de reset a valores por defecto

### `src/lib/payroll-config-utils.ts`
Utilidades para:
- Obtener configuración desde localStorage
- Detectar configuración personalizada
- Funciones de acceso rápido

### `src/actions/calculate-workday.ts`
Función de cálculo actualizada para:
- Recibir valores personalizados como parámetro
- Usar configuración dinámica en lugar de constantes

## Uso del Sistema

### 1. Configurar Valores
1. Hacer clic en el botón ⚙️ "Configurar" en el navbar
2. Modificar los valores deseados en el formulario
3. Hacer clic en "Guardar cambios"

### 2. Restablecer Valores
1. Abrir el modal de configuración
2. Hacer clic en "Restablecer por defecto"
3. Confirmar la acción

### 3. Indicador Visual
- Badge "Config. Personalizada" aparece cuando se usan valores personalizados
- Se oculta automáticamente cuando se usan valores por defecto

## Valores Configurables

### Horas Base (Dentro de 7.66h)
- `Ordinaria_Diurna_Base`: Horas base diurnas laborales
- `Recargo_Noct_Base`: Recargo nocturno base
- `Recargo_Dom_Diurno_Base`: Recargo dominical diurno base
- `Recargo_Dom_Noct_Base`: Recargo dominical nocturno base

### Horas Extras (Después de 7.66h)
- `HED`: Hora Extra Diurna
- `HEN`: Hora Extra Nocturna  
- `HEDD_F`: Hora Extra Dominical/Festiva Diurna
- `HEND_F`: Hora Extra Dominical/Festiva Nocturna

### Auxilio de Transporte
- Valor quincenal configurable independientemente

## Compatibilidad

- ✅ Cálculos automáticos
- ✅ Edición manual de horas
- ✅ Importación de horarios
- ✅ Duplicación de turnos
- ✅ Exportación PDF
- ✅ Nóminas guardadas
- ✅ SSR (Server-Side Rendering)

## Consideraciones Técnicas

### localStorage vs Server Actions
- Los server actions (`'use server'`) no pueden acceder a localStorage
- Se pasan los valores como parámetros desde el cliente
- Fallback automático a valores por defecto en SSR

### Validación de Datos
- Todos los valores deben ser números positivos
- Validación tanto en cliente como en servidor
- Manejo robusto de errores

### Performance
- Carga única al inicializar el hook
- Caché en memoria durante la sesión
- Mínimo impacto en el rendimiento
