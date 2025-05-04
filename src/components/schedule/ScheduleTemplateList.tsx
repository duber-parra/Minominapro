// src/components/schedule/ScheduleTemplateList.tsx
'use client'; // Ensure this component is treated as a client component

import React from 'react';
import type { ScheduleTemplate } from '@/types/schedule'; // O donde definas el tipo
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { List, Trash2, Upload } from 'lucide-react'; // Iconos de ejemplo
import { ScrollArea } from '@/components/ui/scroll-area'; // Import ScrollArea
import { format } from 'date-fns'; // Import format from date-fns
import { es } from 'date-fns/locale'; // Import Spanish locale

interface ScheduleTemplateListProps {
  templates: ScheduleTemplate[];
  onLoadTemplate: (templateId: string) => void; // Función para cargar un template
  onDeleteTemplate: (templateId: string) => void; // Función para eliminar un template (trigger confirmation)
}

export function ScheduleTemplateList({ templates, onLoadTemplate, onDeleteTemplate }: ScheduleTemplateListProps) {
  if (templates.length === 0) {
    return (
        <div className="text-center p-6 text-muted-foreground italic">
          No hay templates guardados para esta sede y vista.
        </div>
    );
  }

  return (
        <ScrollArea className="h-[calc(100%-4rem)] border rounded-md p-2"> {/* Adjust height dynamically */}
          <ul className="space-y-3">
            {templates.map((template) => (
              <li key={template.id} className="flex items-center justify-between p-3 border rounded-md bg-background hover:bg-accent">
                <span className="font-medium truncate mr-2 flex-grow min-w-0" title={template.name}>
                   {template.name || `Template (${template.id.substring(0, 8)})`}
                   <span className="text-xs text-muted-foreground ml-1 block">
                        ({template.createdAt instanceof Date ? format(template.createdAt, 'dd/MM/yy', { locale: es }) : 'Fecha inválida'}) {/* Show date */}
                   </span>
                </span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button variant="outline" size="sm" onClick={() => onLoadTemplate(template.id)} title="Cargar Template">
                    <Upload className="h-4 w-4" /> {/* Use Upload icon for Load */}
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => onDeleteTemplate(template.id)} title="Eliminar Template">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </ScrollArea>
  );
}
