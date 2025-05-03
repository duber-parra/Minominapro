// src/components/schedule-template-list.tsx
'use client';

import React from 'react';
import type { ScheduleTemplate } from '@/types/schedule'; // Ensure type is correctly imported
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { List, Trash2, Upload } from 'lucide-react'; // Icons for actions
import { format } from 'date-fns'; // Import format
import { es } from 'date-fns/locale'; // Import Spanish locale

interface ScheduleTemplateListProps {
  templates: ScheduleTemplate[];
  onLoadTemplate: (templateId: string) => void; // Function to load a template
  onDeleteTemplate: (templateId: string) => void; // Function to initiate deletion
}

export function ScheduleTemplateList({ templates, onLoadTemplate, onDeleteTemplate }: ScheduleTemplateListProps) {

    // Add this conditional rendering for the empty state
    if (!templates || templates.length === 0) {
        return (
             <div className="text-center text-muted-foreground italic py-4">
                 No hay templates guardados para esta sede y vista.
            </div>
        );
    }

  return (
      <ul className="space-y-3 max-h-[40vh] overflow-y-auto pr-2"> {/* Use ul directly */}
          {templates.map((template) => (
              <li key={template.id} className="flex items-center justify-between p-3 border rounded-md bg-background hover:bg-accent">
                  <span className="font-medium truncate mr-2 flex flex-col" title={template.name}>
                       {template.name || `Template (${template.id.substring(0, 8)})`}
                        <span className="text-xs text-muted-foreground">
                            ({template.type === 'week' ? 'Semanal' : 'Diario'})
                             {template.createdAt instanceof Date ? ` - ${format(template.createdAt, 'dd/MM/yy', { locale: es })}` : ''}
                        </span>
                  </span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                      <Button variant="outline" size="sm" onClick={() => onLoadTemplate(template.id)} title="Cargar Template">
                           <Upload className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => onDeleteTemplate(template.id)} title="Eliminar Template">
                           <Trash2 className="h-4 w-4" />
                      </Button>
                  </div>
              </li>
          ))}
      </ul>
  );
}