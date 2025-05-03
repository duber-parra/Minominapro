
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
const valoresHoraLaboral = {
  HOD: 6189.13, // Valor Hora Ordinaria Diurna
  JD: 7.66,     // (Jornada Diaria - not a monetary value for direct calc here)
  HED: 7736.41, // Hora Extra Diurna
  HEN: 10830.98, // Hora Extra Nocturna
  RN: 2166,  // Recargo Nocturno
  RD_F: 4642, // Recargo Dominical/Festivo Diurno
  RDN_F: 6808, // Recargo Dominical/Festivo Nocturno
  HEDF: 12378.26, // Hora Extra Diurna Festiva
  HENF: 15472.83, // Hora Extra Nocturna Festiva
};
type HourType = keyof typeof valoresHoraLaboral;

const CalculadoraLaboral: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true); // Start open
  const [mode, setMode] = useState<'valorHoras' | 'duracionTurno'>('valorHoras');
  const { toast } = useToast();

  // --- State for Value Mode ---
  const [displayValue, setDisplayValue] = useState<string>('0');
  const [operand1, setOperand1] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForOperand2, setWaitingForOperand2] = useState<boolean>(false);
  const [accumulator, setAccumulator] = useState<number>(0); // To accumulate monetary values

  // --- State for Duration Mode ---
  const [startTime, setStartTime] = useState<string>('10:00');
  const [endTime, setEndTime] = useState<string>('23:00');
  const [durationResult, setDurationResult] = useState<string>('');

  // --- Handlers for Value Mode ---

  const clearCalculator = useCallback(() => {
    setDisplayValue('0');
    setOperand1(null);
    setOperator(null);
    setWaitingForOperand2(false);
    setAccumulator(0);
  }, []);

  const inputDigit = (digit: string) => {
    if (waitingForOperand2) {
      setDisplayValue(digit);
      setWaitingForOperand2(false);
    } else {
      setDisplayValue(displayValue === '0' ? digit : displayValue + digit);
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
    setDisplayValue(
      displayValue.charAt(0) === '-' ? displayValue.slice(1) : '-' + displayValue
    );
  };

  const inputPercent = () => {
    const currentValue = parseFloat(displayValue);
    if (!isNaN(currentValue)) {
      setDisplayValue(String(currentValue / 100));
      setWaitingForOperand2(false); // Allow further input
    }
  };

  const performOperation = (nextOperator: string) => {
    const inputValue = parseFloat(displayValue);

    if (operand1 === null) {
      setOperand1(inputValue);
    } else if (operator) {
      const result = calculate(operand1, inputValue, operator);
      setDisplayValue(String(result));
      setOperand1(result);
    }

    setWaitingForOperand2(true);
    setOperator(nextOperator);
  };

  const handleEquals = () => {
    const inputValue = parseFloat(displayValue);
    if (operator && operand1 !== null) {
      const result = calculate(operand1, inputValue, operator);
      setDisplayValue(String(result));
      setOperand1(null); // Reset for next calculation chain
      setOperator(null);
      setWaitingForOperand2(false);
      // Keep accumulator as is, user needs to press C to clear it
    }
     // If there was an accumulator, display its formatted value
     if (accumulator !== 0) {
        setDisplayValue(formatCurrency(accumulator));
        setAccumulator(0); // Reset accumulator after displaying result
        setOperand1(null);
        setOperator(null);
        setWaitingForOperand2(false);
    }
  };

   const handleHourTypeClick = (type: HourType) => {
        const hours = parseFloat(displayValue);
        const rate = valoresHoraLaboral[type];

        if (isNaN(hours) || rate === undefined || type === 'JD') {
             toast({ title: "Entrada inválida", description: `Ingresa las horas primero y selecciona un tipo válido (JD no es calculable).`, variant: "destructive" });
            return;
        }

        const calculatedValue = hours * rate;
        setAccumulator(prev => prev + calculatedValue); // Add to accumulator
        setDisplayValue(formatCurrency(accumulator + calculatedValue)); // Show running total
        setWaitingForOperand2(true); // Ready for next number or operation
        setOperand1(accumulator + calculatedValue); // Use accumulated value as operand 1 if user chains with +,- etc.
        setOperator('+'); // Assume user wants to add next value
   };

  const calculate = (op1: number, op2: number, op: string): number => {
    switch (op) {
      case '+': return op1 + op2;
      case '-': return op1 - op2;
      case 'x': return op1 * op2;
      case '÷': return op2 === 0 ? NaN : op1 / op2; // Handle division by zero
      default: return op2;
    }
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
               performOperation('÷');
           } else if (key === 'Enter' || key === '=') {
               handleEquals();
           } else if (key === 'Backspace' || key === 'Delete' || key === 'c' || key === 'C') {
               clearCalculator();
           } else if (key === '%') {
               inputPercent();
           }
           // Add more keys if needed (+/-, etc.)
       };

       window.addEventListener('keydown', handleKeyDown);
       return () => {
           window.removeEventListener('keydown', handleKeyDown);
       };
       // Re-bind if mode changes or calculator state influencing handlers change
   }, [mode, isOpen, displayValue, operator, operand1, waitingForOperand2, accumulator, clearCalculator]);


  // --- Copy to Clipboard ---
  const handleCopy = () => {
    let textToCopy = '';
    if (mode === 'valorHoras') {
      textToCopy = displayValue;
    } else if (mode === 'duracionTurno') {
      textToCopy = durationResult;
    }

    if (textToCopy) {
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
          {/* <Button variant="ghost" size="icon" className="h-7 w-7 text-primary-foreground hover:bg-primary/80" title="Minimizar">
            <Minimize2 className="h-4 w-4" />
          </Button> */}
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
        <div className="bg-background border rounded-md p-3 text-right text-2xl font-mono h-14 overflow-hidden text-ellipsis">
           {mode === 'valorHoras' ? displayValue : durationResult || '0h 0m'}
        </div>

        {/* Conditional Content based on Mode */}
        {mode === 'valorHoras' ? (
          <>
            {/* Hour Type Buttons */}
            <div className="grid grid-cols-3 gap-2">
              {Object.keys(valoresHoraLaboral).filter(k => k !== 'JD').map((key) => (
                 <Button
                    key={key}
                    variant="outline"
                    size="sm"
                    className="text-xs bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-800/50 border-green-300 dark:border-green-700 text-green-800 dark:text-green-300"
                    onClick={() => handleHourTypeClick(key as HourType)}
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

    