// src/components/schedule/ScheduleTemplateList.tsx
'use client';

import React from 'react';
import type { ScheduleTemplate } from '@/types/schedule'; // Adjust path if needed
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { List, Trash2, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ScheduleTemplateListProps {
  templates: ScheduleTemplate[];
  onLoadTemplate: (templateId: string) => void;
  onDeleteTemplate: (templateId: string) => void; // Function to trigger delete confirmation in parent
}

export function ScheduleTemplateList({ templates, onLoadTemplate, onDeleteTemplate }: ScheduleTemplateListProps) {
  if (templates.length === 0) {
    return (
      <div className="text-center p-6 border-dashed border rounded-md bg-muted/50 mt-4">
        <p className="text-sm text-muted-foreground italic">
          No hay templates guardados para esta sede y vista.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <ul className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
        {templates.map((template) => (
          <li key={template.id} className="flex items-center justify-between p-3 border rounded-md bg-background hover:bg-accent">
            <div className="flex-grow mr-2 overflow-hidden">
                 <span className="font-medium truncate block" title={template.name}>
                     {template.name || `Template (${template.id.substring(0, 8)})`}
                 </span>
                 <span className="text-xs text-muted-foreground block">
                     Tipo: {template.type === 'day' ? 'Día' : 'Semana'}
                     {template.createdAt && ` | Creado: ${format(new Date(template.createdAt), 'dd/MM/yy HH:mm', { locale: es })}`}
                 </span>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button variant="outline" size="sm" onClick={() => onLoadTemplate(template.id)} title="Cargar Template">
                <Upload className="h-4 w-4" />
              </Button>
              {/* Use AlertDialogTrigger for delete */}
              <AlertDialog>
                 <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" title="Eliminar Template">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                 </AlertDialogTrigger>
                 {/* The AlertDialogContent for this trigger will be defined in the parent component (SchedulePage) */}
                 {/* It's important the parent manages the state `templateToDeleteId` and renders the content */}
              </AlertDialog>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
