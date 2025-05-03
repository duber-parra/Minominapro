
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { parse, differenceInMinutes, addDays, format as formatFns } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { X, Minimize2, Calculator, Clock, Copy, Percent, Divide, Minus, Plus, Equal, Dot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency, formatHours } from '@/components/results-display';

const valoresHoraLaboral = {
  HOD: 6189.13,
  JD: 7.66,
  HED: 7736.41,
  HEN: 10830.98,
  RN: 2166,
  RD_F: 4642,
  RDN_F: 6808,
  HEDF: 12378.26,
  HENF: 15472.83,
};
type HourType = keyof typeof valoresHoraLaboral;
type OperatorType = '+' | '-' | 'x' | '÷';

const CalculadoraLaboral: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [mode, setMode] = useState<'valorHoras' | 'duracionTurno'>('valorHoras');
  const { toast } = useToast();
  const calculatorRef = useRef<HTMLDivElement>(null); // Ref for the calculator card

  const [displayValue, setDisplayValue] = useState<string>('0');
  const [operand1, setOperand1] = useState<number | null>(null);
  const [operator, setOperator] = useState<OperatorType | null>(null);
  const [waitingForOperand2, setWaitingForOperand2] = useState<boolean>(false);

  const [startTime, setStartTime] = useState<string>('10:00');
  const [endTime, setEndTime] = useState<string>('23:00');
  const [durationResult, setDurationResult] = useState<string>('');

  // State to prevent hydration errors for client-only rendering parts
  const [hasMounted, setHasMounted] = useState(false);
  const [minimizedButtonHidden, setMinimizedButtonHidden] = useState(true); // Start hidden on server
  const [cardHidden, setCardHidden] = useState(false); // Start visible on server (matching initial isOpen=true)

  useEffect(() => {
    setHasMounted(true);
    // Update visibility based on isOpen *after* mount
    setMinimizedButtonHidden(isOpen);
    setCardHidden(!isOpen);
  }, [isOpen]);


  // --- Effect to handle clicks outside the calculator ---
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      // Only close if clicking outside AND it's currently open
      if (isOpen && calculatorRef.current && !calculatorRef.current.contains(event.target as Node)) {
        setIsOpen(false); // Minimize if click is outside
      }
    }
    // Bind the event listener only if the component is open
    if (isOpen) {
        document.addEventListener("mousedown", handleClickOutside);
    } else {
        document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      // Always remove listener on cleanup
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [calculatorRef, isOpen]); // Re-run if ref or isOpen changes


  const calculate = (op1: number, op2: number, op: OperatorType): number => {
    switch (op) {
      case '+': return op1 + op2;
      case '-': return op1 - op2;
      case 'x': return op1 * op2;
      case '÷': return op2 === 0 ? NaN : op1 / op2;
      default: console.warn(`Unknown operator: ${op}`); return op2;
    }
  };

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
      if (displayValue === '0' && digit === '0') return;
      if (displayValue === '0' && digit !== '0') {
          setDisplayValue(digit);
      } else {
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
    if (!isNaN(currentValue) && currentValue !== 0) {
        setDisplayValue(String(currentValue * -1));
    } else if (displayValue === '0') {
        setDisplayValue('0');
    }
  };

  const inputPercent = () => {
    const currentValue = parseFloat(displayValue);
    if (!isNaN(currentValue)) {
      const result = operand1 !== null && operator
                     ? operand1 * (currentValue / 100)
                     : currentValue / 100;
      setDisplayValue(String(result));
      setWaitingForOperand2(false); // Percent calculation is usually final for the current input
    }
  };


  const performOperation = (nextOperator: OperatorType) => {
    const inputValue = parseFloat(displayValue);
    if (isNaN(inputValue)) return;

    if (operand1 !== null && operator && !waitingForOperand2) {
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
      const result = calculate(operand1, monetaryValue, operator);
       if (isNaN(result)) {
            setDisplayValue("Error");
            setOperand1(null);
            setOperator(null);
            setWaitingForOperand2(false);
            return;
       }
      setDisplayValue(String(result));
      setOperand1(result);
      setOperator(null); // Operator is consumed
      setWaitingForOperand2(true); // Set wait=true to allow chaining next operator
    } else {
      setDisplayValue(String(monetaryValue));
      setOperand1(monetaryValue);
      setOperator(null); // No operator was pending
      setWaitingForOperand2(true); // Set wait=true to allow chaining next operator
    }
  };


  const handleEquals = () => {
    const inputValue = parseFloat(displayValue);
     if (isNaN(inputValue)) return; // Prevent NaN issues if display is "Error"

    if (operator && operand1 !== null) {
      // If waitingForOperand2 is true, it means user pressed op1, operator, then equals (use op1 as op2)
      // If waitingForOperand2 is false, it means user pressed op1, operator, op2, then equals
      const operand2 = waitingForOperand2 ? operand1 : inputValue;
      const result = calculate(operand1, operand2, operator);
      if (isNaN(result)) {
        setDisplayValue("Error");
      } else {
        setDisplayValue(String(result));
      }
      setOperand1(null); // Reset operand1 after equals
      setOperator(null); // Reset operator
      setWaitingForOperand2(false); // Ready for new calculation
    }
    // If no operator, '=' does nothing, just keeps the current displayValue
  };


  const calculateDuration = useCallback(() => {
    try {
      const start = parse(startTime, 'HH:mm', new Date());
      let end = parse(endTime, 'HH:mm', new Date());

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        setDurationResult('');
        return;
      }

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

   useEffect(() => {
       const handleKeyDown = (event: KeyboardEvent) => {
           if (mode !== 'valorHoras' || !isOpen) return;

           const { key } = event;
           if (displayValue === "Error" && key !== 'Backspace' && key !== 'Delete' && key !== 'c' && key !== 'C' && key !== 'Escape') {
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
               event.preventDefault();
               performOperation('÷');
           } else if (key === 'Enter' || key === '=') {
               event.preventDefault();
               handleEquals();
           } else if (key === 'Backspace' || key === 'Delete') {
                if (displayValue === "Error") {
                   clearCalculator();
                } else if (displayValue !== '0') {
                   if (displayValue.length > 1) {
                       setDisplayValue(displayValue.slice(0, -1));
                   } else {
                       setDisplayValue('0');
                   }
                   // If user backspaces after pressing an operator, allow new input
                   if (waitingForOperand2 && operator) {
                        // Maybe don't change waiting state? Or handle differently?
                        // Let's keep it simple: allow backspace always
                   }
                }
           } else if (key === 'Escape' || key === 'c' || key === 'C') {
               clearCalculator();
           } else if (key === '%') {
               inputPercent();
           }
       };

       window.addEventListener('keydown', handleKeyDown);
       return () => {
           window.removeEventListener('keydown', handleKeyDown);
       };
   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [mode, isOpen, displayValue, operator, operand1, waitingForOperand2, clearCalculator]); // Dependencies include state used in handlers

  const handleCopy = () => {
    let textToCopy = '';
    if (mode === 'valorHoras') {
        // Try to get the raw number before copying, avoid formatted currency
        const numericValue = parseFloat(displayValue);
        if (!isNaN(numericValue)) {
            textToCopy = String(numericValue); // Copy the raw number
        } else {
            textToCopy = displayValue; // Copy as is if not a number (e.g., "Error")
        }
    } else if (mode === 'duracionTurno') {
      textToCopy = durationResult;
    }

    if (textToCopy && textToCopy !== "Error") {
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


  // Format display value - show raw number for valorHoras, duration string otherwise
  const formattedDisplayValue = mode === 'valorHoras'
    ? (isNaN(parseFloat(displayValue)) ? displayValue : displayValue) // Show raw number or "Error"
    : durationResult || '0 horas, 0 minutos'; // Show duration result


  // Render the full calculator card and the minimized button,
  // Use CSS classes to hide/show them based on `isOpen` and `hasMounted`.
  // This prevents the hydration error by ensuring both versions exist in the initial server render.
  return (
    <>
      {/* Minimized Button - Always rendered, visibility controlled by state */}
      <Button
        className={cn(
          "fixed bottom-4 right-4 z-50 rounded-full h-12 w-12 p-0 shadow-lg",
          minimizedButtonHidden && "hidden" // Use state to control visibility after mount
        )}
        onClick={() => setIsOpen(true)}
        aria-label="Abrir Calculadora Laboral"
        title="Abrir Calculadora"
      >
        <Calculator className="h-6 w-6" />
      </Button>

       {/* Full Calculator Card - Always rendered, visibility controlled by state */}
      <Card
        ref={calculatorRef}
        className={cn(
          "fixed bottom-4 right-4 z-50 w-80 shadow-lg bg-card text-card-foreground rounded-lg",
           cardHidden && "hidden" // Use state to control visibility after mount
        )}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-3 px-4 bg-primary rounded-t-lg">
          <CardTitle className="text-base font-semibold flex items-center gap-2 text-white">
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
          <div className="flex items-center justify-center space-x-2 mb-2">
            <Label htmlFor="mode-switch" className={cn(mode === 'valorHoras' ? 'text-primary font-medium' : 'text-muted-foreground')}>Valor Horas</Label>
            <Switch
              id="mode-switch"
              checked={mode === 'duracionTurno'}
              onCheckedChange={(checked) => setMode(checked ? 'duracionTurno' : 'valorHoras')}
            />
            <Label htmlFor="mode-switch" className={cn(mode === 'duracionTurno' ? 'text-primary font-medium' : 'text-muted-foreground')}>Duración Turno</Label>
          </div>

          <div className={cn(
              "bg-background border rounded-md p-3 text-right text-2xl font-mono h-14 overflow-hidden text-ellipsis whitespace-nowrap",
              displayValue === "Error" && "text-destructive"
           )}>
            {formattedDisplayValue}
          </div>

          {mode === 'valorHoras' ? (
            <>
              <div className="grid grid-cols-4 gap-1">
                {Object.keys(valoresHoraLaboral).filter(k => k !== 'JD').map((key, index) => (
                  <Button
                      key={key}
                      variant="outline"
                      size="sm"
                      className="text-xs p-1 h-auto"
                      onClick={() => handleHourTypeClick(key as HourType)}
                      title={`${key} (${formatCurrency(valoresHoraLaboral[key as HourType], false)}/hr)`} // Exclude symbol in title
                  >
                      {key}
                  </Button>
                ))}
              </div>
              <div className="h-px bg-border my-2"></div>
              <div className="grid grid-cols-4 gap-2">
                <Button variant="secondary" className="col-span-1 text-lg hover:bg-destructive hover:text-destructive-foreground" onClick={clearCalculator}>C</Button> {/* Use secondary, hover destructive */}
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
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default CalculadoraLaboral;
