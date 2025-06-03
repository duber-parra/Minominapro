// src/components/PayrollTest.tsx
'use client';

import { useEffect, useState } from 'react';
import { calculateSingleWorkday } from '@/actions/calculate-workday';
import { WorkdayFormValues, CalculationResults, CalculationError } from '@/types';

function PayrollTest() {
    const [results, setResults] = useState<CalculationResults | CalculationError | null>(null);

    useEffect(() => {
        const testData: WorkdayFormValues = {
            startDate: new Date('2024-07-07'), // Domingo
            startTime: '14:00',
            endTime: '23:00',
            endsNextDay: false,
            includeBreak: false,
            breakStartTime: '17:00',
            breakEndTime: '18:00',
        };

        async function runTest() {
            const res = await calculateSingleWorkday(testData, 'test-id');
            setResults(res);
            console.log('Test Results:', res); // Imprime los resultados también
        }

        runTest();
    }, []);

    return (
        <div>
            <h1>Payroll Test</h1>
            {results && (
                <pre>{JSON.stringify(results, null, 2)}</pre>
            )}
        </div>
    );
}

export default PayrollTest;