'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { parse, differenceInMinutes, addDays, format as formatFns } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { X, Minimize2, Calculator, Clock, Copy, Percent, Divide, Minus, Plus, Equal, Dot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency, formatHours } from '@/components/results-display'; // Reuse formatting functions

// Define hourly rates (relevant for Value Mode)
// Updated with provided values
const valoresHoraLaboral = {
  HOD: 6189.13,    // Valor Hora Ordinaria Diurna (Example, might not be needed directly if base pay is separate)
  JD: 7.66,        // Jornada Diaria (hours, not monetary)
  HED: 7736.41,    // Hora Extra Diurna
  HEN: 10830.98,   // Hora Extra Nocturna
  RN: 2166,        // Recargo Nocturno
  RD_F: 4642,      // Recargo Dominical/Festivo Diurno
  RDN_F: 6808,     // Recargo Dominical/Festivo Nocturno
  HEDF: 12378.26,  // Hora Extra Diurna Festiva
  HENF: 15472.83,  // Hora Extra Nocturna Festiva
};
type HourType = keyof typeof valoresHoraLaboral;
type OperatorType = '+' | '-' | 'x' | '÷'; // Use 'x' for multiply internally

const CalculadoraLaboral: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true); // Start open
  const [mode, setMode] = useState<'valorHoras' | 'duracionTurno'>('valorHoras');
  const { toast } = useToast();

  // --- State for Value Mode ---
  const [displayValue, setDisplayValue] = useState<string>('0');
  const [operand1, setOperand1] = useState<number | null>(null);
  const [operator, setOperator] = useState<OperatorType | null>(null);
  const [waitingForOperand2, setWaitingForOperand2] = useState<boolean>(false);
  // Removed accumulator state

  // --- State for Duration Mode ---
  const [startTime, setStartTime] = useState<string>('10:00');
  const [endTime, setEndTime] = useState<string>('23:00');
  const [durationResult, setDurationResult] = useState<string>('');

  // --- Calculator Logic ---
  const calculate = (op1: number, op2: number, op: OperatorType): number => {
    switch (op) {
      case '+': return op1 + op2;
      case '-': return op1 - op2;
      case 'x': return op1 * op2;
      case '÷': return op2 === 0 ? NaN : op1 / op2; // Handle division by zero
      default: console.warn(`Unknown operator: ${op}`); return op2; // Should not happen
    }
  };

  // --- Handlers for Value Mode ---

  const clearCalculator = useCallback(() => {
    setDisplayValue('0');
    setOperand1(null);
    setOperator(null);
    setWaitingForOperand2(false);
  }, []);

  const inputDigit = (digit: string) => {
    if (waitingForOperand2) {
      setDisplayValue(digit);
      setWaitingForOperand2(false);
    } else {
      // Prevent multiple leading zeros unless it's just "0"
      if (displayValue === '0' && digit === '0') return;
      // Replace "0" if a non-zero digit is entered
      if (displayValue === '0' && digit !== '0') {
          setDisplayValue(digit);
      } else {
          // Limit display length (e.g., 15 digits)
          if (displayValue.replace(/[^0-9.-]/g, '').length < 15) {
              setDisplayValue(displayValue + digit);
          }
      }
    }
  };


  const inputDecimal = () => {
    if (waitingForOperand2) {
      setDisplayValue('0.');
      setWaitingForOperand2(false);
    } else if (!displayValue.includes('.')) {
      setDisplayValue(displayValue + '.');
    }
  };

  const toggleSign = () => {
    const currentValue = parseFloat(displayValue);
    if (!isNaN(currentValue) && currentValue !== 0) { // Avoid making "0" negative
        setDisplayValue(String(currentValue * -1));
    } else if (displayValue === '0') {
        setDisplayValue('0'); // Keep it zero
    }
    // Do not change waitingForOperand2 here
  };


  const inputPercent = () => {
    const currentValue = parseFloat(displayValue);
    if (!isNaN(currentValue)) {
      const result = operand1 !== null && operator
                     ? operand1 * (currentValue / 100) // Calculate percentage of operand1
                     : currentValue / 100;             // Or percentage of the displayed value itself
      setDisplayValue(String(result));
      // After percent, usually the calculation ends or needs an operator again
      // Resetting operand1 and operator might be standard calculator behavior here
      // setOperand1(null);
      // setOperator(null);
      setWaitingForOperand2(false); // Allow further input or equals
    }
  };

  const performOperation = (nextOperator: OperatorType) => {
    const inputValue = parseFloat(displayValue);

    if (isNaN(inputValue)) return; // Ignore if display is not a valid number

    if (operand1 !== null && operator && !waitingForOperand2) {
      // Sequence like: number, operator, number, operator (calculate intermediate)
      const result = calculate(operand1, inputValue, operator);
       if (isNaN(result)) {
           setDisplayValue("Error");
           setOperand1(null);
           setOperator(null);
           setWaitingForOperand2(false);
           return;
       }
      setDisplayValue(String(result));
      setOperand1(result);
    } else {
      // First operator in sequence, or chaining after equals/hour type
      setOperand1(inputValue);
    }

    setWaitingForOperand2(true);
    setOperator(nextOperator);
  };


  const handleHourTypeClick = (type: HourType) => {
    const hours = parseFloat(displayValue);
    const rate = valoresHoraLaboral[type];

    if (isNaN(hours) || hours <= 0 || rate === undefined || type === 'JD') {
      toast({ title: "Entrada inválida", description: `Ingresa un número de horas válido (>0) y selecciona un tipo de hora calculable (JD no aplica).`, variant: "destructive" });
      return;
    }

    const monetaryValue = hours * rate;

    if (operator && operand1 !== null) {
      // There's a pending operation (e.g., 2 HED + [current value])
      const result = calculate(operand1, monetaryValue, operator);
       if (isNaN(result)) {
            setDisplayValue("Error");
            setOperand1(null);
            setOperator(null);
            setWaitingForOperand2(false);
            return;
       }
      setDisplayValue(formatCurrency(result)); // Show result of pending operation
      setOperand1(result); // Store result for further chaining
      setOperator(null); // Clear the operator after calculation
      setWaitingForOperand2(true); // Ready for the NEXT operator
    } else {
      // No pending operation, this is the first value or starts a new chain
      setDisplayValue(formatCurrency(monetaryValue)); // Show calculated monetary value
      setOperand1(monetaryValue); // Store it as the first operand
      setOperator(null); // Ensure no operator is pending
      setWaitingForOperand2(true); // Ready for an operator
    }
  };


  const handleEquals = () => {
    const inputValue = parseFloat(displayValue);

    if (operator && operand1 !== null && !waitingForOperand2) {
      const result = calculate(operand1, inputValue, operator);
      if (isNaN(result)) {
        setDisplayValue("Error");
      } else {
         // Format the FINAL result as currency only when equals is pressed
        setDisplayValue(formatCurrency(result));
      }
      setOperand1(null); // Reset for new calculation
      setOperator(null);
      setWaitingForOperand2(false);
    } else if (operand1 !== null && operator && waitingForOperand2) {
       // Case: 5 + = (repeat last operation with operand1) - standard calc behavior
       const result = calculate(operand1, operand1, operator);
       if (isNaN(result)) {
           setDisplayValue("Error");
       } else {
           setDisplayValue(formatCurrency(result));
           setOperand1(result); // Allow further '=' presses to repeat
       }
       // Keep operator, keep waitingForOperand2 true? Or reset? Resetting is safer.
       // setOperand1(null);
       // setOperator(null);
       // setWaitingForOperand2(false);
    }
    // If no operator or operand1, equals does nothing.
    // If waitingForOperand2 is true but no operator (e.g., after hour type calc), equals might just finalize display formatting
    else if (operand1 !== null && !operator && waitingForOperand2) {
        setDisplayValue(formatCurrency(operand1)); // Format the existing operand1
        setWaitingForOperand2(false); // Finalized display
    }
    // else do nothing
  };


  // --- Handlers for Duration Mode ---

  const calculateDuration = useCallback(() => {
    try {
      const start = parse(startTime, 'HH:mm', new Date());
      let end = parse(endTime, 'HH:mm', new Date());

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        setDurationResult(''); // Clear if invalid times
        return;
      }

      // Handle overnight
      if (end < start) {
        end = addDays(end, 1);
      }

      const diffMinutes = differenceInMinutes(end, start);
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;

      setDurationResult(`${hours} horas, ${minutes} minutos`);

    } catch (error) {
      console.error("Error calculating duration:", error);
      setDurationResult('Error');
    }
  }, [startTime, endTime]);

  useEffect(() => {
    if (mode === 'duracionTurno') {
      calculateDuration();
    }
  }, [startTime, endTime, mode, calculateDuration]);


  // --- Keyboard Handling (Value Mode Only) ---
   useEffect(() => {
       const handleKeyDown = (event: KeyboardEvent) => {
           if (mode !== 'valorHoras' || !isOpen) return;

           const { key } = event;
           // Allow keyboard input only if display is not showing "Error"
           if (displayValue === "Error" && key !== 'Backspace' && key !== 'Delete' && key !== 'c' && key !== 'C') {
               return;
           }


           if (/\d/.test(key)) {
               inputDigit(key);
           } else if (key === '.') {
               inputDecimal();
           } else if (key === '+') {
               performOperation('+');
           } else if (key === '-') {
               performOperation('-');
           } else if (key === '*') {
               performOperation('x');
           } else if (key === '/') {
               event.preventDefault(); // Prevent browser find functionality
               performOperation('÷');
           } else if (key === 'Enter' || key === '=') {
               event.preventDefault(); // Prevent form submission if inside one
               handleEquals();
           } else if (key === 'Backspace' || key === 'Delete') {
               if (displayValue !== '0' && displayValue !== "Error") {
                   if (displayValue.length > 1) {
                       setDisplayValue(displayValue.slice(0, -1));
                   } else {
                       setDisplayValue('0');
                   }
                   setWaitingForOperand2(false); // Allow number input after backspace
               } else if (displayValue === "Error") {
                   clearCalculator(); // Clear error on backspace/delete
               }
           } else if (key === 'Escape' || key === 'c' || key === 'C') {
               clearCalculator();
           } else if (key === '%') {
               inputPercent();
           }
           // Add Shift + = for '+' if needed, handle other potential keys
       };

       window.addEventListener('keydown', handleKeyDown);
       return () => {
           window.removeEventListener('keydown', handleKeyDown);
       };
   }, [mode, isOpen, displayValue, operator, operand1, waitingForOperand2, clearCalculator]); // Added clearCalculator dependency


  // --- Copy to Clipboard ---
  const handleCopy = () => {
    let textToCopy = '';
    if (mode === 'valorHoras') {
      // Remove currency formatting for copying raw number if needed, or copy formatted value
      // Let's copy the displayed value directly for now
      textToCopy = displayValue;
    } else if (mode === 'duracionTurno') {
      textToCopy = durationResult;
    }

    if (textToCopy && textToCopy !== "Error") { // Don't copy "Error"
      navigator.clipboard.writeText(textToCopy)
        .then(() => {
          toast({ title: 'Copiado', description: `"${textToCopy}" copiado al portapapeles.` });
        })
        .catch(err => {
          console.error('Error al copiar:', err);
          toast({ title: 'Error al Copiar', variant: 'destructive' });
        });
    }
  };

  if (!isOpen) {
    return (
      <Button
        className="fixed bottom-4 right-4 z-50 rounded-full h-12 w-12 p-0 shadow-lg"
        onClick={() => setIsOpen(true)}
        aria-label="Abrir Calculadora Laboral"
        title="Abrir Calculadora"
      >
        <Calculator className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 z-50 w-80 shadow-lg bg-card text-card-foreground rounded-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-3 px-4 bg-primary text-primary-foreground rounded-t-lg">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
           {mode === 'valorHoras' ? <Calculator className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
           Calculadora Laboral
        </CardTitle>
        <div className="flex items-center gap-1">
           <Button variant="ghost" size="icon" className="h-7 w-7 text-primary-foreground hover:bg-primary/80" onClick={handleCopy} title="Copiar Resultado">
             <Copy className="h-4 w-4" />
           </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-primary-foreground hover:bg-primary/80" onClick={() => setIsOpen(false)} title="Cerrar">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Mode Switch */}
        <div className="flex items-center justify-center space-x-2 mb-2">
           <Label htmlFor="mode-switch" className={cn(mode === 'valorHoras' ? 'text-primary font-medium' : 'text-muted-foreground')}>Valor Horas</Label>
          <Switch
            id="mode-switch"
            checked={mode === 'duracionTurno'}
            onCheckedChange={(checked) => setMode(checked ? 'duracionTurno' : 'valorHoras')}
          />
           <Label htmlFor="mode-switch" className={cn(mode === 'duracionTurno' ? 'text-primary font-medium' : 'text-muted-foreground')}>Duración Turno</Label>
        </div>

        {/* Display Area */}
        <div className={cn(
            "bg-background border rounded-md p-3 text-right text-2xl font-mono h-14 overflow-hidden text-ellipsis whitespace-nowrap",
            displayValue === "Error" && "text-destructive" // Style error state
         )}>
           {mode === 'valorHoras' ? displayValue : durationResult || '0h 0m'}
        </div>


        {/* Conditional Content based on Mode */}
        {mode === 'valorHoras' ? (
          <>
            {/* Hour Type Buttons */}
             <div className="grid grid-cols-4 gap-1"> {/* Adjusted to 4 columns */}
               {/* Filter out JD and map others */}
               {Object.keys(valoresHoraLaboral).filter(k => k !== 'JD').map((key, index) => (
                 <Button
                    key={key}
                    variant="outline"
                    size="sm"
                    // Removed specific green styling, use theme's outline
                    className="text-xs p-1 h-auto" // Smaller padding, auto height
                    onClick={() => handleHourTypeClick(key as HourType)}
                    title={`${key} (${formatCurrency(valoresHoraLaboral[key as HourType])}/hr)`} // Add title with rate
                 >
                    {key}
                 </Button>
              ))}
            </div>
             <div className="h-px bg-border my-2"></div>
            {/* Numeric Calculator Buttons */}
            <div className="grid grid-cols-4 gap-2">
              <Button variant="destructive" className="col-span-1 text-lg" onClick={clearCalculator}>C</Button>
              <Button variant="secondary" className="text-lg" onClick={toggleSign}>+/-</Button>
              <Button variant="secondary" className="text-lg" onClick={inputPercent}>%</Button>
              <Button variant="outline" className="text-lg bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/50 dark:hover:bg-blue-800/70 border-blue-300 dark:border-blue-700" onClick={() => performOperation('÷')}>÷</Button>

              <Button variant="secondary" className="text-lg" onClick={() => inputDigit('7')}>7</Button>
              <Button variant="secondary" className="text-lg" onClick={() => inputDigit('8')}>8</Button>
              <Button variant="secondary" className="text-lg" onClick={() => inputDigit('9')}>9</Button>
              <Button variant="outline" className="text-lg bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/50 dark:hover:bg-blue-800/70 border-blue-300 dark:border-blue-700" onClick={() => performOperation('x')}>x</Button>

              <Button variant="secondary" className="text-lg" onClick={() => inputDigit('4')}>4</Button>
              <Button variant="secondary" className="text-lg" onClick={() => inputDigit('5')}>5</Button>
              <Button variant="secondary" className="text-lg" onClick={() => inputDigit('6')}>6</Button>
              <Button variant="outline" className="text-lg bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/50 dark:hover:bg-blue-800/70 border-blue-300 dark:border-blue-700" onClick={() => performOperation('-')}>-</Button>

              <Button variant="secondary" className="text-lg" onClick={() => inputDigit('1')}>1</Button>
              <Button variant="secondary" className="text-lg" onClick={() => inputDigit('2')}>2</Button>
              <Button variant="secondary" className="text-lg" onClick={() => inputDigit('3')}>3</Button>
              <Button variant="outline" className="text-lg bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/50 dark:hover:bg-blue-800/70 border-blue-300 dark:border-blue-700" onClick={() => performOperation('+')}>+</Button>

              <Button variant="secondary" className="col-span-2 text-lg" onClick={() => inputDigit('0')}>0</Button>
              <Button variant="secondary" className="text-lg" onClick={inputDecimal}>.</Button>
              <Button variant="default" className="text-lg bg-primary hover:bg-primary/90" onClick={handleEquals}>=</Button>
            </div>
          </>
        ) : (
          /* Duration Mode Inputs */
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 items-end">
               <div>
                 <Label htmlFor="start-time-calc">Hora Inicio</Label>
                 <Input
                    id="start-time-calc"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                 />
               </div>
               <div>
                 <Label htmlFor="end-time-calc">Hora Fin</Label>
                 <Input
                    id="end-time-calc"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                 />
               </div>
            </div>
             {/* Result is shown in the main display area */}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CalculadoraLaboral;
