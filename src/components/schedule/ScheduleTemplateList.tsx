// src/components/schedule/ScheduleTemplateList.tsx
'use client';

import React from 'react';
import type { ScheduleTemplate } from '@/types/schedule'; // Adjust path if needed
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { List, Trash2, Upload } from 'lucide-react';
import { format, parseISO } from 'date-fns'; // Import date-fns functions
import { es } from 'date-fns/locale'; // Import Spanish locale

interface ScheduleTemplateListProps {
  templates: ScheduleTemplate[];
  onLoadTemplate: (templateId: string) => void;
  onDeleteTemplate: (templateId: string) => void;
}

export function ScheduleTemplateList({ templates, onLoadTemplate, onDeleteTemplate }: ScheduleTemplateListProps) {
  if (!templates || templates.length === 0) {
    return (
      <Card className="text-center p-6 border-dashed bg-muted/50">
        <CardHeader>
          <CardTitle className="text-lg">No Hay Templates</CardTitle>
          <CardDescription>No se encontraron templates de horario guardados.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Sort templates by creation date descending (most recent first)
  const sortedTemplates = [...templates].sort((a, b) => {
    const dateA = a.createdAt ? parseISO(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? parseISO(b.createdAt).getTime() : 0;
    return dateB - dateA; // Descending order
  });


  return (
    <Card className="shadow-lg bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <List className="h-4 w-4" /> Templates de Horario ({sortedTemplates.length})
        </CardTitle>
        <CardDescription>Selecciona un template para cargar o eliminar.</CardDescription>
      </CardHeader>
      <CardContent>
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
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => onDeleteTemplate(template.id)} title="Eliminar Template">
                  <Trash2 className="h-4 w-4" />
                  {/* <span className="ml-1 hidden sm:inline">Eliminar</span> */}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}