// src/components/schedule-template-list.tsx
import React from 'react';
import type { ScheduleTemplate } from '@/types/schedule'; // O donde definas el tipo
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { List, Trash2, Upload } from 'lucide-react'; // Iconos de ejemplo

interface ScheduleTemplateListProps {
  templates: ScheduleTemplate[];
  onLoadTemplate: (templateId: string) => void; // Función para cargar un template
  onDeleteTemplate: (templateId: string) => void; // Función para eliminar un template
}

export function ScheduleTemplateList({ templates, onLoadTemplate, onDeleteTemplate }: ScheduleTemplateListProps) {
  if (!Array.isArray(templates) || templates.length === 0) {
    return (
      <Card className="text-center p-6 border-dashed bg-muted/50">
        <CardHeader className="p-4"> {/* Added padding */}
          <CardTitle className="text-base">No Hay Templates</CardTitle> {/* Adjusted size */}
          <CardDescription className="text-xs">No se encontraron templates de horario guardados para esta vista.</CardDescription> {/* Adjusted size */}
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg bg-card">
      <CardHeader className="p-4"> {/* Adjusted padding */}
        <CardTitle className="flex items-center gap-2 text-base"> {/* Adjusted size */}
          <List className="h-4 w-4" /> Templates Guardados ({templates.length})
        </CardTitle>
        <CardDescription className="text-xs">Selecciona un template para cargar o eliminar.</CardDescription> {/* Adjusted size */}
      </CardHeader>
      <CardContent className="p-2"> {/* Adjusted padding */}
        <ul className="space-y-2 max-h-[30vh] overflow-y-auto pr-2"> {/* Adjusted height and spacing */}
          {templates.map((template) => (
            <li key={template.id} className="flex items-center justify-between p-2 border rounded-md bg-background hover:bg-accent/50"> {/* Added key prop, adjusted padding */}
              <span className="font-medium text-sm truncate mr-2" title={template.name}> {/* Adjusted size */}
                {template.name || `Template (${template.id.substring(0, 8)})`}
                 <span className="text-xs italic ml-1 text-muted-foreground">({template.type === 'daily' ? 'Diario' : 'Semanal'})</span>
              </span>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button variant="outline" size="xs" onClick={() => onLoadTemplate(template.id)} title="Cargar Template"> {/* Use xs size */}
                  <Upload className="h-3.5 w-3.5" /> {/* Adjusted icon size */}
                </Button>
                <Button variant="ghost" size="xs" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => onDeleteTemplate(template.id)} title="Eliminar Template"> {/* Use xs size */}
                  <Trash2 className="h-3.5 w-3.5" /> {/* Adjusted icon size */}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
