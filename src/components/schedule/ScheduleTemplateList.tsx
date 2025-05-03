// src/components/schedule/ScheduleTemplateList.tsx
'use client';

import React from 'react';
import type { ScheduleTemplate } from '@/types/schedule'; // Adjust path if needed
import { Button } from '@/components/ui/button';
import { Trash2, Upload, List } from 'lucide-react'; // Added List
import { format, parseISO } from 'date-fns'; // Import date-fns functions
import { es } from 'date-fns/locale'; // Import Spanish locale
import { AlertDialog, AlertDialogTrigger } from '@/components/ui/alert-dialog'; // Import AlertDialogTrigger for delete confirmation
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'; // Import Card components

interface ScheduleTemplateListProps {
  templates: ScheduleTemplate[];
  onLoadTemplate: (templateId: string) => void; // Función para cargar un template
  onDeleteTemplate: (templateId: string) => void; // Función para eliminar un template
}

export function ScheduleTemplateList({ templates, onLoadTemplate, onDeleteTemplate }: ScheduleTemplateListProps) {
  // Log received templates for debugging
  React.useEffect(() => {
    console.log("[ScheduleTemplateList] Received templates prop:", templates);
  }, [templates]);

  if (!Array.isArray(templates) || templates.length === 0) { // Ensure templates is an array
    return (
       // Use Card for consistent styling when empty
       <Card className="text-center p-6 border-dashed bg-muted/30">
         <CardHeader className="p-0">
           <CardTitle className="text-lg">No Hay Templates</CardTitle>
           <CardDescription>No se encontraron templates guardados para esta sede y vista.</CardDescription>
         </CardHeader>
       </Card>
    );
  }

  // Sort templates by creation date descending (most recent first)
  const sortedTemplates = [...templates].sort((a, b) => {
     // Handle cases where createdAt might be missing or invalid
    const dateA = a.createdAt && typeof a.createdAt === 'string' ? parseISO(a.createdAt).getTime() : 0;
    const dateB = b.createdAt && typeof b.createdAt === 'string' ? parseISO(b.createdAt).getTime() : 0;
    return dateB - dateA; // Descending order
  });


  return (
         // Use Card for consistency when there are templates
        <Card className="shadow-lg bg-card">
           <CardHeader className="pb-4"> {/* Add some bottom padding */}
             <CardTitle className="flex items-center gap-2 text-lg">
               <List className="h-4 w-4" /> Templates Disponibles ({sortedTemplates.length})
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
                           {/* Display creation date if available and valid */}
                           {template.createdAt && typeof template.createdAt === 'string' && (
                               <> - {format(parseISO(template.createdAt), 'dd/MM/yy HH:mm', { locale: es })}</>
                           )}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button variant="outline" size="sm" onClick={() => onLoadTemplate(template.id)} title="Cargar Template">
                        <Upload className="h-4 w-4" />
                        {/* <span className="ml-1 hidden sm:inline">Cargar</span> */}
                      </Button>
                      {/* Wrap delete button in AlertDialogTrigger */}
                      <AlertDialog>
                          <AlertDialogTrigger asChild>
                             <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => onDeleteTemplate(template.id)} title="Eliminar Template">
                              <Trash2 className="h-4 w-4" />
                             </Button>
                          </AlertDialogTrigger>
                           {/* Define AlertDialogContent in the parent component (page.tsx) */}
                      </AlertDialog>
                    </div>
                  </li>
                ))}
              </ul>
           </CardContent>
         </Card>
  );
}
