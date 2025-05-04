// src/components/schedule/ScheduleTemplateList.tsx
'use client';

import React from 'react';
import type { ScheduleTemplate } from '@/types/schedule'; // Or where you define the type
import { Button } from '@/components/ui/button';
import { List, Trash2, Upload } from 'lucide-react'; // Example icons

interface ScheduleTemplateListProps {
  templates: ScheduleTemplate[];
  onLoadTemplate: (templateId: string) => void; // Function to load a template
  onDeleteTemplate: (templateId: string) => void; // Function to initiate template deletion
}

export function ScheduleTemplateList({ templates, onLoadTemplate, onDeleteTemplate }: ScheduleTemplateListProps) {
  if (templates.length === 0) {
    return (
      <div className="text-center p-6 border-dashed border rounded-md bg-muted/50 my-4">
        <p className="text-sm text-muted-foreground">No hay templates guardados para esta sede y vista.</p>
      </div>
    );
  }

  return (
    <div className="my-4">
      <ul className="space-y-3 max-h-[50vh] overflow-y-auto pr-2"> {/* Adjust height as needed */}
        {templates.map((template) => (
          <li key={template.id} className="flex items-center justify-between p-3 border rounded-md bg-background hover:bg-accent">
            <span className="font-medium truncate mr-2" title={template.name}>
              {template.name || `Template (${template.id.substring(0, 8)})`}
            </span>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button variant="outline" size="sm" onClick={() => onLoadTemplate(template.id)} title="Cargar Template">
                <Upload className="h-4 w-4" />
                <span className="ml-1 hidden sm:inline">Cargar</span> {/* Hide text on smaller screens */}
              </Button>
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => onDeleteTemplate(template.id)} title="Eliminar Template">
                <Trash2 className="h-4 w-4" />
                <span className="ml-1 hidden sm:inline">Eliminar</span> {/* Hide text on smaller screens */}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
