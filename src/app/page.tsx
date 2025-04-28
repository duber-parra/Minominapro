'use client'; // This page needs client-side interactivity for form state

import React, { useState } from 'react';
import { WorkdayForm } from '@/components/workday-form';
import { ResultsDisplay } from '@/components/results-display';
import type { CalculationResults, CalculationError } from '@/types'; // Assuming types are defined
import { Toaster } from '@/components/ui/toaster';

export default function Home() {
  const [results, setResults] = useState<CalculationResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleCalculationComplete = (data: CalculationResults | CalculationError) => {
    setIsLoading(false);
    if ('error' in data) {
      setError(data.error);
      setResults(null);
    } else {
      setResults(data);
      setError(null);
    }
  };

  const handleCalculationStart = () => {
    setIsLoading(true);
    setError(null);
    setResults(null);
  }

  return (
    <main className="container mx-auto p-4 md:p-8 max-w-4xl">
      <h1 className="text-3xl font-bold text-center mb-8 text-primary">Workday Calculator</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <WorkdayForm
          onCalculationStart={handleCalculationStart}
          onCalculationComplete={handleCalculationComplete}
          isLoading={isLoading}
        />
        <ResultsDisplay results={results} error={error} isLoading={isLoading} />
      </div>
      <Toaster />
    </main>
  );
}
