// src/components/schedule/ScheduleTemplateList.tsx
'use client';
import React from 'react';
import type { ScheduleTemplate } from '@/types/schedule';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { List, Trash2, Upload, LibraryBig, X } from 'lucide-react'; // Added LibraryBig
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface ScheduleTemplateListProps {
  isOpen: boolean;
  onClose: () => void;
  templates: ScheduleTemplate[]; // Expects already filtered templates
  onLoadTemplate: (templateId: string) => void;
  onDeleteTemplate: (templateId: string) => void;
  currentViewMode: 'day' | 'week'; 
}

export function ScheduleTemplateList({
  isOpen,
  onClose,
  templates, // Use the passed (already filtered) templates
  onLoadTemplate,
  onDeleteTemplate,
  currentViewMode
}: ScheduleTemplateListProps) {

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LibraryBig className="h-5 w-5" /> Templates ({currentViewMode === 'day' ? 'Diarios' : 'Semanales'})
          </DialogTitle>
          <DialogDescription>
            Selecciona un template para cargar o eliminar. Se muestran templates compatibles con la vista actual.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow overflow-hidden py-2">
          {templates.length > 0 ? (
            <ScrollArea className="h-full pr-4">
              <ul className="space-y-3">
                {templates.map((template) => (
                  <li key={template.id} className="flex items-center justify-between p-3 border rounded-md bg-background hover:bg-accent">
                    <div className="flex-grow mr-2 overflow-hidden">
                        <span className="font-medium truncate block" title={template.name}>
                            {template.name || `Template (${template.id.substring(0, 8)})`}
                        </span>
                        {template.createdAt && (
                             <span className="text-xs text-muted-foreground block">
                                Creado: {template.createdAt instanceof Date ? format(template.createdAt, 'dd MMM yyyy, HH:mm', { locale: es }) : format(parseISO(template.createdAt as string), 'dd MMM yyyy, HH:mm', { locale: es })}
                             </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button variant="outline" size="sm" onClick={() => { onLoadTemplate(template.id); onClose(); }} title="Cargar Template">
                        <Upload className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => onDeleteTemplate(template.id)} title="Eliminar Template">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          ) : (
            <div className="text-center p-6 border-dashed bg-muted/50 rounded-md h-full flex flex-col items-center justify-center">
                 <List className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-lg font-medium text-muted-foreground">No Hay Templates</p>
                <p className="text-sm text-muted-foreground">
                    No se encontraron templates {currentViewMode === 'day' ? 'diarios' : 'semanales'} para esta sede.
                </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Cerrar</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

