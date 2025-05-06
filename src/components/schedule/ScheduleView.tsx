// src/components/schedule/ScheduleView.tsx
import React, { useState, useEffect } from 'react';
import type { Department, ScheduleData, ShiftAssignment, ScheduleNote, Employee } from '@/types/schedule';
import { DepartmentColumn } from './DepartmentColumn';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format, parse as parseDateFns, isValid as isValidDate } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '../ui/button';
import { Plus, Copy, Eraser, NotebookPen } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';

interface ScheduleViewProps {
  departments: Department[];
  scheduleData: { [dateKey: string]: ScheduleData };
  onRemoveShift: (dateKey: string, departmentId: string, assignmentId: string) => void;
  viewMode: 'day' | 'week';
  weekDates: Date[];
  currentDate: Date;
  onAddShiftRequest: (departmentId: string, date: Date) => void;
  onShiftClick: (assignment: ShiftAssignment, date: Date, departmentId: string) => void;
  getScheduleForDate: (date: Date) => ScheduleData;
  onDuplicateDay: (sourceDate: Date) => void;
  onClearDay: (dateToClear: Date) => void;
  isHoliday: (date: Date | null | undefined) => boolean;
  isMobile: boolean;
  getNotesForDate: (date: Date) => ScheduleNote[];
  onOpenNotesModal: (date: Date) => void;
  employees: Employee[];
  setNoteToDeleteId?: (id: string | null) => void;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({
    departments,
    scheduleData,
    onRemoveShift,
    viewMode,
    weekDates,
    currentDate,
    onAddShiftRequest,
    onShiftClick,
    getScheduleForDate,
    onDuplicateDay,
    onClearDay,
    isHoliday,
    isMobile,
    getNotesForDate,
    onOpenNotesModal,
    employees,
    setNoteToDeleteId,
}) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Helper function to render notes tooltip content
  const renderNotesTooltip = (notes: ScheduleNote[]) => {
    if (!notes || notes.length === 0) return null;
    return (
        <div className="text-xs space-y-1 max-w-xs p-2 bg-popover text-popover-foreground rounded-md shadow-md border">
            <p className="font-medium mb-1">Anotaciones:</p>
            {notes.map(note => {
                const employeeName = note.employeeId ? employees.find(e => e.id === note.employeeId)?.name : null;
                // Format date for tooltip: Abbreviated day, numeric day, abbreviated month
                const noteDate = parseDateFns(note.date, 'yyyy-MM-dd', new Date());
                const formattedDate = isValidDate(noteDate) ? format(noteDate, 'EEE d MMM', { locale: es }) : note.date;
                return (
                     <p key={note.id}>
                         • {note.note} {employeeName ? <span className="italic text-muted-foreground">({employeeName})</span> : ''}
                     </p>
                );
            })}
        </div>
    );
  };

  if (viewMode === 'day') {
    // --- Day View ---
    const daySchedule = getScheduleForDate(currentDate);
    const dynamicGridClass = `grid-cols-1 sm:grid-cols-2 lg:grid-cols-${Math.min(departments.length, 4)} xl:grid-cols-${Math.min(departments.length, 5)}`;
    const isCurrentHoliday = isHoliday(currentDate);
    const notesForDay = getNotesForDate(currentDate);
    const totalAssignmentsForDay = isClient
        ? Object.values(daySchedule.assignments || {}).reduce((sum, deptAssignments) => sum + (deptAssignments?.length || 0), 0)
        : 0;

    return (
        <Card className={cn(
            "shadow-md bg-card border",
            isCurrentHoliday ? "border-primary border-2" : "border-border"
        )}>
            <CardHeader className={cn(
                "border-b relative",
                isCurrentHoliday ? "border-primary" : "border-border"
            )}>
                <CardTitle className={cn(
                    "text-lg font-medium flex items-center gap-2 pr-8",
                    isCurrentHoliday ? "text-primary font-semibold" : "text-foreground"
                )}>
                    <span>
                        Horario para el {format(currentDate, 'PPPP', { locale: es })}
                        {isCurrentHoliday && <span className="text-xs font-normal ml-2">(Festivo)</span>}
                    </span>
                     {notesForDay.length > 0 && (
                         <TooltipProvider delayDuration={100}>
                             <Tooltip>
                                 <TooltipTrigger asChild>
                                      <AlertDialog>
                                         <AlertDialogTrigger asChild>
                                              <Button
                                                 variant="ghost"
                                                 size="icon"
                                                 className="h-5 w-5 p-0 text-yellow-500 hover:text-yellow-600 cursor-pointer"
                                                 aria-label="Ver/Eliminar anotaciones"
                                                 onClick={(e) => {
                                                      e.stopPropagation(); // Prevent card click if any
                                                      if (setNoteToDeleteId && notesForDay.length > 0) {
                                                        // Action for click (delete) is handled by AlertDialog
                                                      }
                                                 }}
                                              >
                                                  <NotebookPen className="h-4 w-4" />
                                              </Button>
                                         </AlertDialogTrigger>
                                         <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                              <AlertDialogHeader>
                                                 <AlertDialogTitle>Eliminar Anotación?</AlertDialogTitle>
                                                 <AlertDialogDescription>
                                                    ¿Estás seguro de que quieres eliminar esta anotación? No se puede deshacer.
                                                    <br/>
                                                    <span className='italic'>{notesForDay[0]?.note}</span>
                                                 </AlertDialogDescription>
                                              </AlertDialogHeader>
                                              <AlertDialogFooter>
                                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                   <AlertDialogAction
                                                     className="bg-destructive hover:bg-destructive/90"
                                                     onClick={() => {
                                                         if (setNoteToDeleteId && notesForDay.length > 0) {
                                                             setNoteToDeleteId(notesForDay[0].id);
                                                         }
                                                     }}
                                                   >
                                                       Eliminar Anotación
                                                    </AlertDialogAction>
                                              </AlertDialogFooter>
                                         </AlertDialogContent>
                                      </AlertDialog>
                                  </TooltipTrigger>
                                 <TooltipContent side="bottom">
                                     {renderNotesTooltip(notesForDay)}
                                 </TooltipContent>
                             </Tooltip>
                         </TooltipProvider>
                     )}
                </CardTitle>
                <div className="absolute top-2 right-2 flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        onClick={() => onDuplicateDay(currentDate)}
                        title="Duplicar horario al día siguiente"
                    >
                        <Copy className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive hover:text-destructive/80"
                                title="Limpiar turnos del día"
                                disabled={!isClient || (totalAssignmentsForDay === 0 && notesForDay.length === 0)}
                            >
                                <Eraser className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                             <AlertDialogHeader>
                                 <AlertDialogTitle>¿Limpiar Día?</AlertDialogTitle>
                                 <AlertDialogDescription>
                                    Esta acción eliminará todos los turnos y anotaciones para el{' '}
                                    <strong>{format(currentDate, 'PPP', { locale: es })}</strong>. No se puede deshacer.
                                 </AlertDialogDescription>
                             </AlertDialogHeader>
                             <AlertDialogFooter>
                                 <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                 <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => onClearDay(currentDate)}>
                                     Limpiar Día
                                 </AlertDialogAction>
                             </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </CardHeader>
            <CardContent className="p-4">
                {departments.length > 0 ? (
                    <div className={`grid ${dynamicGridClass} gap-4`}>
                        {departments.map((department) => (
                            <DepartmentColumn
                                key={department.id}
                                department={department}
                                assignments={daySchedule.assignments[department.id] || []}
                                onRemoveShift={(deptId, assignId) => onRemoveShift(format(currentDate, 'yyyy-MM-dd'), deptId, assignId)}
                                date={currentDate}
                                onAddShiftRequest={onAddShiftRequest}
                                onShiftClick={onShiftClick}
                                isMobile={isMobile}
                            />
                        ))}
                    </div>
                ) : (
                     <p className="text-center text-muted-foreground italic py-4">
                         No hay departamentos definidos para esta sede. Agrega departamentos en la sección de configuración.
                     </p>
                )}
            </CardContent>
        </Card>
    );
  } else {
    // --- Week View ---
    const weekViewContent = (
        <div className="grid grid-cols-7 gap-1 min-w-[900px] overflow-x-auto"> {/* Allow horizontal scroll */}
            {weekDates.map((date, index) => {
               const daySchedule = getScheduleForDate(date);
               const dateKey = format(date, 'yyyy-MM-dd');
               const notesForDay = getNotesForDate(date);
               const totalAssignmentsForDay = isClient
                   ? Object.values(daySchedule.assignments || {}).reduce((sum, deptAssignments) => sum + (deptAssignments?.length || 0), 0)
                   : 0;
               const isLastDayOfWeek = index === weekDates.length - 1;
               const isCurrentHoliday = isHoliday(date);

               return (
                   <div key={dateKey} className="flex flex-col h-full">
                       <Card className={cn(
                           "shadow-sm bg-card border flex flex-col flex-grow",
                           isCurrentHoliday ? "border-primary border-2" : "border-border/50"
                       )}>
                           <CardHeader className={cn(
                               "pb-2 pt-3 px-2 border-b relative",
                               isCurrentHoliday ? "border-primary" : "border-border/50"
                           )}>
                               <CardTitle className={cn(
                                   "text-xs font-semibold text-center whitespace-nowrap flex items-center justify-center gap-1",
                                   isCurrentHoliday ? "text-primary" : "text-foreground"
                               )}>
                                   <span>{format(date, 'EEE d', { locale: es })}</span>
                                   {notesForDay.length > 0 && (
                                       <TooltipProvider delayDuration={100}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                     <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-4 w-4 p-0 text-yellow-500 hover:text-yellow-600 cursor-pointer"
                                                                aria-label="Ver/Eliminar anotaciones"
                                                                 onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <NotebookPen className="h-3 w-3" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                         <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                                             <AlertDialogHeader>
                                                                <AlertDialogTitle>Eliminar Anotación?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    ¿Estás seguro de que quieres eliminar esta anotación? No se puede deshacer.
                                                                    <br/>
                                                                    <span className='italic'>{notesForDay[0]?.note}</span>
                                                                </AlertDialogDescription>
                                                             </AlertDialogHeader>
                                                             <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    className="bg-destructive hover:bg-destructive/90"
                                                                    onClick={() => {
                                                                        if (setNoteToDeleteId && notesForDay.length > 0) {
                                                                            setNoteToDeleteId(notesForDay[0].id);
                                                                        }
                                                                    }}
                                                                >
                                                                    Eliminar Anotación
                                                                </AlertDialogAction>
                                                             </AlertDialogFooter>
                                                         </AlertDialogContent>
                                                     </AlertDialog>
                                                 </TooltipTrigger>
                                                <TooltipContent side="top">
                                                    {renderNotesTooltip(notesForDay)}
                                                </TooltipContent>
                                            </Tooltip>
                                       </TooltipProvider>
                                   )}
                               </CardTitle>
                               <CardDescription className="text-[10px] text-muted-foreground text-center">
                                   {format(date, 'MMM', { locale: es })} ({isClient ? totalAssignmentsForDay : '...'})
                                   {isCurrentHoliday && <span className="text-primary block font-medium">Festivo</span>}
                               </CardDescription>
                               <div className="absolute top-0.5 right-0.5 flex flex-col gap-0">
                                   {!isLastDayOfWeek && (
                                       <Button
                                           variant="ghost"
                                           size="icon"
                                           className="h-4 w-4 p-0 text-muted-foreground hover:text-foreground opacity-50 hover:opacity-100"
                                           onClick={() => onDuplicateDay(date)}
                                           title="Duplicar al día siguiente"
                                       >
                                           <Copy className="h-2.5 w-2.5" />
                                       </Button>
                                   )}
                                  <AlertDialog>
                                     <AlertDialogTrigger asChild>
                                         <Button
                                             variant="ghost"
                                             size="icon"
                                             className="h-4 w-4 p-0 text-destructive hover:text-destructive opacity-50 hover:opacity-100"
                                             title="Limpiar turnos del día"
                                             disabled={!isClient || (totalAssignmentsForDay === 0 && notesForDay.length === 0)}
                                         >
                                             <Eraser className="h-2.5 w-2.5" />
                                         </Button>
                                     </AlertDialogTrigger>
                                     <AlertDialogContent>
                                          <AlertDialogHeader>
                                              <AlertDialogTitle>¿Limpiar Día?</AlertDialogTitle>
                                              <AlertDialogDescription>
                                                 Esta acción eliminará todos los turnos y anotaciones para el{' '}
                                                 <strong>{format(date, 'PPP', { locale: es })}</strong>. No se puede deshacer.
                                              </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                              <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => onClearDay(date)}>
                                                  Limpiar Día
                                              </AlertDialogAction>
                                          </AlertDialogFooter>
                                     </AlertDialogContent>
                                  </AlertDialog>
                               </div>
                           </CardHeader>
                           <CardContent className="p-1 space-y-1 flex-grow overflow-y-auto">
                               {departments.length > 0 ? (
                                   departments.map((department) => (
                                       <div key={department.id} className="border rounded-sm p-1 bg-muted/10 relative">
                                           <div className="flex justify-between items-center mb-0.5">
                                               <h4 className="text-[10px] font-semibold text-foreground flex items-center gap-0.5 whitespace-nowrap overflow-hidden text-ellipsis pr-4">
                                                    {department.icon && <department.icon className="h-2.5 w-2.5 text-muted-foreground" />}
                                                    <span className="overflow-hidden text-ellipsis">{department.name}</span>
                                               </h4>
                                                <Button
                                                     variant="ghost"
                                                     size="icon"
                                                     className="absolute top-0 right-0 h-4 w-4 p-0 text-primary hover:bg-primary/10"
                                                     onClick={() => onAddShiftRequest(department.id, date)}
                                                     title="Añadir Colaborador"
                                                >
                                                    <Plus className="h-3 w-3" />
                                                </Button>
                                           </div>
                                           <DepartmentColumn
                                               department={department}
                                               assignments={daySchedule.assignments[department.id] || []}
                                               onRemoveShift={(deptId, assignId) => onRemoveShift(dateKey, deptId, assignId)}
                                               isWeekView
                                               date={date}
                                               onAddShiftRequest={onAddShiftRequest}
                                               onShiftClick={onShiftClick}
                                               isMobile={isMobile}
                                           />
                                       </div>
                                   ))
                                ) : (
                                     <p className="text-center text-[10px] text-muted-foreground italic pt-1">
                                         No hay deptos.
                                     </p>
                                )}
                           </CardContent>
                       </Card>
                   </div>
               );
           })}
        </div>
       );

    return weekViewContent;
  }
};
