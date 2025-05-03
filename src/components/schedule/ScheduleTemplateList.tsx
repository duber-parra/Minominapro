// src/components/schedule/ScheduleTemplateList.tsx
'use client';

import React from 'react';
import type { ScheduleTemplate } from '@/types/schedule'; // Adjust path if needed
import { Button } from '@/components/ui/button';
import { Trash2, Upload } from 'lucide-react';
import { format, parseISO } from 'date-fns'; // Import date-fns functions
import { es } from 'date-fns/locale'; // Import Spanish locale
import { AlertDialog, AlertDialogTrigger } from '@/components/ui/alert-dialog'; // Import AlertDialogTrigger for delete confirmation

interface ScheduleTemplateListProps {
  templates: ScheduleTemplate[];
  onLoadTemplate: (templateId: string) => void;
  onDeleteTemplate: (templateId: string) => void; // Changed to only need the ID
}

export function ScheduleTemplateList({ templates, onLoadTemplate, onDeleteTemplate }: ScheduleTemplateListProps) {
  if (!templates || templates.length === 0) {
    return (
      <div className="text-center p-6 border-dashed border rounded-md bg-muted/30">
        <p className="text-sm text-muted-foreground italic">No hay templates guardados para esta sede y vista.</p>
      </div>
    );
  }

  // Sort templates by creation date descending (most recent first)
  const sortedTemplates = [...templates].sort((a, b) => {
    const dateA = a.createdAt ? parseISO(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? parseISO(b.createdAt).getTime() : 0;
    return dateB - dateA; // Descending order
  });


  return (
        <ul className="space-y-3 max-h-[40vh] overflow-y-auto pr-2"> {/* Adjust height as needed */}
          {sortedTemplates.map((template) => (
            <li key={template.id} className="flex items-center justify-between p-3 border rounded-md bg-background hover:bg-accent">
              <div className="flex flex-col mr-2 overflow-hidden">
                <span className="font-medium truncate" title={template.name}>
                  {template.name || `Template (${template.id.substring(0, 8)})`}
                </span>
                <span className="text-xs text-muted-foreground">
                    ({template.type === 'daily' ? 'Diario' : 'Semanal'})
                     {/* Display creation date if available */}
                     {template.createdAt && ` - ${format(parseISO(template.createdAt), 'dd/MM/yy HH:mm', { locale: es })}`}
                </span>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button variant="outline" size="sm" onClick={() => onLoadTemplate(template.id)} title="Cargar Template">
                  <Upload className="h-4 w-4" />
                  {/* <span className="ml-1 hidden sm:inline">Cargar</span> */}
                </Button>
                {/* Wrap delete button in AlertDialogTrigger */}
                <AlertDialogTrigger asChild>
                   <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => onDeleteTemplate(template.id)} title="Eliminar Template">
                    <Trash2 className="h-4 w-4" />
                   </Button>
                </AlertDialogTrigger>
              </div>
            </li>
          ))}
        </ul>
  );
}
