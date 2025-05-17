// src/app/payroll-settings/page.tsx
import { PayrollSettingsForm } from '@/components/payroll-settings-form';
import React from 'react';

export default function PayrollSettingsPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <PayrollSettingsForm />
    </div>
  );
}
