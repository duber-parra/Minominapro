// src/components/schedule/ConfigTabs.tsx
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { PlusCircle, Edit, Trash2, Copy, Upload, Download, FileJson, FolderUp } from 'lucide-react'; // Added Upload, Download, FileJson, FolderUp
import type { Location, Department, Employee, ScheduleTemplate } from '@/types/schedule';
import { cn } from '@/lib/utils';

// Interface for props passed to ConfigTabs
interface ConfigTabsProps {
  locations: Location[];
  departments: Department[];
  employees: Employee[];
  templates: ScheduleTemplate[];
  selectedLocationId: string;
  iconMap: { [key: string]: React.ElementType };
  openConfigForm: (type: 'location' | 'department' | 'employee' | 'template', item?: any) => void;
  selectedConfigItem: any | null;
  confirmDeleteItem: (type: 'location' | 'department' | 'employee' | 'template', id: string, name: string) => void;
  handleCopyEmployeeId: (id: string) => void;
  handleLoadTemplate: (id: string) => void;
  configFormType: 'location' | 'department' | 'employee' | 'template' | null;
  locationFormData: { name: string };
  setLocationFormData: React.Dispatch<React.SetStateAction<{ name: string }>>;
  departmentFormData: { name: string; locationId: string; iconName?: string };
  setDepartmentFormData: React.Dispatch<React.SetStateAction<{ name: string; locationId: string; iconName?: string }>>;
  employeeFormData: { id: string; name: string; locationIds: string[]; departmentIds: string[] };
  setEmployeeFormData: React.Dispatch<React.SetStateAction<{ id: string; name: string; locationIds: string[]; departmentIds: string[] }>>;
  handleSaveLocation: () => void;
  handleSaveDepartment: () => void;
  handleSaveEmployee: () => void;
  setConfigFormType: React.Dispatch<React.SetStateAction<'location' | 'department' | 'employee' | 'template' | null>>;
  setSelectedConfigItem: React.Dispatch<React.SetStateAction<any | null>>;
  handleToggleEmployeeLocation: (locationId: string) => void;
  handleToggleEmployeeDepartment: (departmentId: string) => void;
  availableDepartmentsForEmployee: Department[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  locationSearch: string;
  setLocationSearch: (search: string) => void;
  departmentSearch: string;
  setDepartmentSearch: (search: string) => void;
  employeeSearch: string;
  setEmployeeSearch: (search: string) => void;
  templateSearch: string;
  setTemplateSearch: (search: string) => void;
  filteredLocationsData: Location[];
  filteredDepartmentsData: Department[];
  filteredEmployeesData: Employee[];
  filteredTemplatesData: ScheduleTemplate[];
   // Add JSON import/export handlers for templates
   handleExportTemplatesJson: () => void;
   handleImportTemplatesJsonClick: () => void;
   templateJsonInputRef: React.RefObject<HTMLInputElement>;
   handleImportTemplatesJson: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ConfigTabs({
    locations,
    departments,
    employees,
    templates,
    selectedLocationId,
    iconMap,
    openConfigForm,
    selectedConfigItem,
    confirmDeleteItem,
    handleCopyEmployeeId,
    handleLoadTemplate,
    configFormType,
    locationFormData,
    setLocationFormData,
    departmentFormData,
    setDepartmentFormData,
    employeeFormData,
    setEmployeeFormData,
    handleSaveLocation,
    handleSaveDepartment,
    handleSaveEmployee,
    setConfigFormType,
    setSelectedConfigItem,
    handleToggleEmployeeLocation,
    handleToggleEmployeeDepartment,
    availableDepartmentsForEmployee,
    activeTab,
    setActiveTab,
    locationSearch,
    setLocationSearch,
    departmentSearch,
    setDepartmentSearch,
    employeeSearch,
    setEmployeeSearch,
    templateSearch,
    setTemplateSearch,
    filteredLocationsData,
    filteredDepartmentsData,
    filteredEmployeesData,
    filteredTemplatesData,
    handleExportTemplatesJson, // Receive template JSON export handler
    handleImportTemplatesJsonClick, // Receive template JSON import click handler
    templateJsonInputRef, // Receive template JSON input ref
    handleImportTemplatesJson, // Receive template JSON import handler
}: ConfigTabsProps) {

    const renderConfigListContent = (items: any[], type: 'location' | 'department' | 'employee' | 'template') => (
         <ScrollArea className="h-full border rounded-md p-2"> {/* Added scroll for list */}
            {items.map(item => (
                <div
                    key={item.id}
                    onClick={() => openConfigForm(type, item)}
                    className={cn(
                        `relative p-2 mb-1 rounded cursor-pointer hover:bg-accent flex items-center justify-between group`, // Added relative
                        selectedConfigItem?.id === item.id ? 'bg-accent font-semibold' : ''
                    )}
                >
                    <span className="truncate flex items-center gap-1 flex-grow min-w-0 mr-10"> {/* Increased mr */}
                        {type === 'department' && item.icon && React.createElement(item.icon, { className: 'h-3 w-3 mr-1 flex-shrink-0' })}
                        {item.name}
                        {type === 'department' && <span className="text-xs italic ml-1">({locations.find(l => l.id === item.locationId)?.name || 'Sede?'})</span>}
                        {type === 'employee' && <span className="text-xs italic ml-1">(ID: {item.id})</span>}
                          {type === 'template' && (
                             <span className="text-xs italic ml-1">({item.type === 'week' ? 'Semanal' : 'Diario'}, {locations.find(l => l.id === item.locationId)?.name || 'Sede?'})</span>
                          )}
                    </span>
                     <div className="absolute top-1/2 right-1 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-0 flex-shrink-0"> {/* Positioned right */}
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); openConfigForm(type, item); }} title={`Editar ${type}`}>
                              <Edit className="h-4 w-4" />
                          </Button>
                         {type === 'employee' && (
                             <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); handleCopyEmployeeId(item.id); }} title="Copiar ID">
                                 <Copy className="h-4 w-4" />
                             </Button>
                         )}
                           {type === 'template' && (
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); handleLoadTemplate(item.id); }} title="Cargar Template">
                                <Upload className="h-4 w-4" />
                              </Button>
                           )}
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                                 <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={(e) => e.stopPropagation()} title={`Eliminar ${type}`}>
                                     <Trash2 className="h-4 w-4" />
                                 </Button>
                            </AlertDialogTrigger>
                           <AlertDialogContent>
                               <AlertDialogHeader> <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle> <AlertDialogDescription> Eliminar {type} "{item.name}"? Esta acción no se puede deshacer. </AlertDialogDescription> </AlertDialogHeader>
                               <AlertDialogFooter>
                                   <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancelar</AlertDialogCancel>
                                   <AlertDialogAction onClick={(e) => { e.stopPropagation(); confirmDeleteItem(type, item.id, item.name); }} className="bg-destructive hover:bg-destructive/90"> Eliminar </AlertDialogAction>
                               </AlertDialogFooter>
                           </AlertDialogContent>
                         </AlertDialog>
                     </div>
                </div>
            ))}
            {items.length === 0 && <div className="text-center text-muted-foreground p-4">No hay elementos.</div>}
        </ScrollArea>
    );

    const renderConfigDetailForm = () => {
        if (!configFormType) {
            return <div className="p-4 text-center text-muted-foreground">Selecciona un elemento de la lista para ver/editar detalles o presiona '+' para crear uno nuevo.</div>;
        }

        switch (configFormType) {
            case 'location':
                return (
                    <Card className="h-full flex flex-col">
                        <CardHeader>
                            <CardTitle>{selectedConfigItem ? 'Editar' : 'Agregar'} Sede</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-grow space-y-3 overflow-y-auto max-h-[calc(100%_-_150px)]">
                            <div>
                                <Label htmlFor="location-name">Nombre</Label>
                                <Input id="location-name" value={locationFormData.name} onChange={(e) => setLocationFormData({ name: e.target.value })} placeholder="Nombre de la Sede" />
                            </div>
                        </CardContent>
                         <CardFooter className="flex justify-end gap-2 border-t pt-4">
                            <Button variant="ghost" onClick={() => { setConfigFormType(null); setSelectedConfigItem(null); }}>Cancelar</Button>
                            <Button onClick={handleSaveLocation}>Guardar Sede</Button>
                        </CardFooter>
                    </Card>
                );
            case 'department':
                return (
                    <Card className="h-full flex flex-col">
                        <CardHeader>
                            <CardTitle>{selectedConfigItem ? 'Editar' : 'Agregar'} Departamento</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-grow space-y-3 overflow-y-auto max-h-[calc(100%_-_150px)]"> {/* Added scroll */}
                            <div>
                                <Label htmlFor="department-name">Nombre</Label>
                                <Input id="department-name" value={departmentFormData.name} onChange={(e) => setDepartmentFormData(prev => ({ ...prev, name: e.target.value }))} placeholder="Nombre del Departamento" />
                            </div>
                            <div>
                                <Label htmlFor="department-location">Sede</Label>
                                <Select value={departmentFormData.locationId} onValueChange={(value) => setDepartmentFormData(prev => ({ ...prev, locationId: value }))}>
                                    <SelectTrigger id="department-location"><SelectValue placeholder="Selecciona una sede" /></SelectTrigger>
                                    <SelectContent> {locations.map(loc => <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>)} </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="department-icon">Icono (Opcional)</Label>
                                <Select value={departmentFormData.iconName} onValueChange={(value) => setDepartmentFormData(prev => ({ ...prev, iconName: value === 'ninguno' ? undefined : value }))}>
                                    <SelectTrigger id="department-icon"><SelectValue placeholder="Selecciona icono" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ninguno">Ninguno</SelectItem>
                                         {Object.keys(iconMap).map(iconName => <SelectItem key={iconName} value={iconName}><span className='flex items-center gap-2'>{React.createElement(iconMap[iconName], { className: 'h-4 w-4' })} {/* Removed label */}</span></SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                         <CardFooter className="flex justify-end gap-2 border-t pt-4">
                            <Button variant="ghost" onClick={() => { setConfigFormType(null); setSelectedConfigItem(null); }}>Cancelar</Button>
                            <Button onClick={handleSaveDepartment}>Guardar Departamento</Button>
                        </CardFooter>
                    </Card>
                );
            case 'employee':
                return (
                     <Card className="h-full flex flex-col">
                        <CardHeader>
                            <CardTitle>{selectedConfigItem ? 'Editar' : 'Agregar'} Colaborador</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-grow space-y-3 overflow-y-auto max-h-[calc(100%_-_150px)]"> {/* Make content scrollable */}
                            <div>
                                <Label htmlFor="employee-id">ID Colaborador</Label>
                                <Input id="employee-id" value={employeeFormData.id} onChange={(e) => setEmployeeFormData(prev => ({ ...prev, id: e.target.value }))} placeholder="ID (Ej: Cédula)" disabled={!!selectedConfigItem} />
                            </div>
                            <div>
                                <Label htmlFor="employee-name">Nombre Completo</Label>
                                <Input id="employee-name" value={employeeFormData.name} onChange={(e) => setEmployeeFormData(prev => ({ ...prev, name: e.target.value }))} placeholder="Nombre y Apellido" />
                            </div>
                            <div>
                                <Label>Sedes</Label>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" className="w-full justify-start">
                                            {employeeFormData.locationIds.length > 0
                                                ? employeeFormData.locationIds
                                                    .map(id => locations.find(l => l.id === id)?.name)
                                                    .filter(Boolean)
                                                    .join(', ')
                                                : "Seleccionar Sedes"}
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-56">
                                        <DropdownMenuLabel>Sedes Disponibles</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        {locations.map((location) => (
                                            <DropdownMenuCheckboxItem
                                                key={location.id}
                                                checked={employeeFormData.locationIds.includes(location.id)}
                                                onCheckedChange={() => handleToggleEmployeeLocation(location.id)}
                                            >
                                                {location.name}
                                            </DropdownMenuCheckboxItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                            <div>
                                <Label>Departamentos (Opcional)</Label>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" className="w-full justify-start" disabled={availableDepartmentsForEmployee.length === 0}>
                                            {employeeFormData.departmentIds.length > 0
                                                ? employeeFormData.departmentIds
                                                    .map(id => departments.find(d => d.id === id)?.name)
                                                    .filter(Boolean)
                                                    .join(', ')
                                                : (availableDepartmentsForEmployee.length === 0 ? "Primero selecciona sede" : "Seleccionar Deptos")}
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-56">
                                        <DropdownMenuLabel>Departamentos Disponibles</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        {availableDepartmentsForEmployee.map((dept) => (
                                            <DropdownMenuCheckboxItem
                                                key={dept.id}
                                                checked={employeeFormData.departmentIds.includes(dept.id)}
                                                onCheckedChange={() => handleToggleEmployeeDepartment(dept.id)}
                                            >
                                                {dept.name} <span className="text-xs text-muted-foreground ml-1">({locations.find(l => l.id === dept.locationId)?.name})</span>
                                            </DropdownMenuCheckboxItem>
                                        ))}
                                        {availableDepartmentsForEmployee.length === 0 && <DropdownMenuItem disabled>No hay departamentos para las sedes seleccionadas.</DropdownMenuItem>}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </CardContent>
                         <CardFooter className="flex justify-between gap-2 border-t pt-4"> {/* Changed justify-end to justify-between */}
                            {selectedConfigItem && ( // Show delete button only when editing
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" > {/* Keep destructive variant */}
                                            <Trash2 className="mr-2 h-4 w-4" /> Eliminar Colaborador
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>¿Eliminar Colaborador?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Eliminar a "{selectedConfigItem.name}"? Se eliminarán sus turnos asociados en horarios. Esta acción no se puede deshacer.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={() => confirmDeleteItem('employee', selectedConfigItem.id, selectedConfigItem.name)}
                                                className="bg-destructive hover:bg-destructive/90"
                                            >
                                                Eliminar
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            )}
                            <div className="flex gap-2 ml-auto"> {/* Group Cancel and Save */}
                                <Button variant="ghost" onClick={() => { setConfigFormType(null); setSelectedConfigItem(null); }}>Cancelar</Button>
                                <Button onClick={handleSaveEmployee}>Guardar Colaborador</Button>
                            </div>
                         </CardFooter>
                    </Card>
                );
             case 'template':
                 return (
                     <Card className="h-full flex flex-col">
                         <CardHeader>
                             <CardTitle>{selectedConfigItem ? 'Detalles Template' : 'Agregar Template (Manual no implementado)'}</CardTitle>
                         </CardHeader>
                         <CardContent className="flex-grow space-y-3 overflow-y-auto max-h-[calc(100%_-_150px)]">
                             {selectedConfigItem ? (
                                 <>
                                     <div><Label>Nombre:</Label> <p>{selectedConfigItem.name}</p></div>
                                     <div><Label>Tipo:</Label> <p>{selectedConfigItem.type === 'week' ? 'Semanal' : 'Diario'}</p></div>
                                     <div><Label>Sede:</Label> <p>{locations.find(l => l.id === selectedConfigItem.locationId)?.name || 'N/A'}</p></div>
                                      <Textarea readOnly value={JSON.stringify(selectedConfigItem.assignments, null, 2)} rows={10} />
                                 </>
                             ) : (
                                 <p className="text-muted-foreground">La creación manual de templates no está implementada. Guarda templates desde el planificador.</p>
                             )}
                         </CardContent>
                         <CardFooter className="flex justify-end gap-2 border-t pt-4">
                             <Button variant="ghost" onClick={() => { setConfigFormType(null); setSelectedConfigItem(null); }}>Cerrar</Button>
                         </CardFooter>
                     </Card>
                 );
        }
    };

  return (
     <Tabs defaultValue="sedes" className="w-full h-full flex flex-col" value={activeTab} onValueChange={ tabValue => { setActiveTab(tabValue); setConfigFormType(null); setSelectedConfigItem(null); } }>
       <TabsList className="grid w-full grid-cols-4 mb-4 flex-shrink-0"> {/* Ensure TabsList doesn't shrink */}
         <TabsTrigger value="sedes">Sedes</TabsTrigger>
         <TabsTrigger value="departamentos">Departamentos</TabsTrigger>
         <TabsTrigger value="colaboradores">Colaboradores</TabsTrigger>
         <TabsTrigger value="templates">Templates</TabsTrigger>
       </TabsList>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-grow overflow-hidden"> {/* Layout Lista + Detalle */}
             <div className="md:col-span-1 flex flex-col gap-4 h-full overflow-hidden">
                 <div className="flex items-center gap-2 flex-shrink-0">
                     <Input
                         placeholder={`Buscar en ${activeTab}...`}
                         className="flex-grow"
                         value={
                             activeTab === 'sedes' ? locationSearch :
                             activeTab === 'departamentos' ? departmentSearch :
                             activeTab === 'colaboradores' ? employeeSearch :
                             templateSearch
                         }
                         onChange={(e) => {
                             const value = e.target.value;
                             if (activeTab === 'sedes') setLocationSearch(value);
                             else if (activeTab === 'departamentos') setDepartmentSearch(value);
                             else if (activeTab === 'colaboradores') setEmployeeSearch(value);
                             else if (activeTab === 'templates') setTemplateSearch(value);
                         }}
                     />
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                            const typeMap: Record<string, 'location' | 'department' | 'employee' | 'template'> = {
                                sedes: 'location',
                                departamentos: 'department',
                                colaboradores: 'employee',
                                templates: 'template',
                            };
                            const formType = typeMap[activeTab];
                            // Ensure selectedConfigItem is null when adding new
                            setSelectedConfigItem(null);
                             if (formType) {
                                 if (formType === 'location') setLocationFormData({ name: '' });
                                 else if (formType === 'department') setDepartmentFormData({ name: '', locationId: selectedLocationId || '', iconName: undefined });
                                 else if (formType === 'employee') setEmployeeFormData({ id: '', name: '', locationIds: selectedLocationId ? [selectedLocationId] : [], departmentIds: [] });
                                 // Don't clear form for template, as we're disabling the '+' button
                             }
                            if (formType && formType !== 'template') { // Only open form if not template
                                openConfigForm(formType, null);
                            }
                        }}
                        title={`Agregar ${activeTab}`}
                        disabled={activeTab === 'templates'} // Disable adding templates manually
                    >
                        <PlusCircle className="h-4 w-4" />
                    </Button>
                     {/* JSON Import/Export for Templates */}
                     {activeTab === 'templates' && (
                        <div className="flex gap-1">
                             <input
                                 type="file"
                                 accept=".json"
                                 ref={templateJsonInputRef}
                                 onChange={handleImportTemplatesJson}
                                 className="hidden"
                                 id="import-templates-json-input"
                             />
                             <Button
                                 variant="outline"
                                 size="icon"
                                 onClick={handleImportTemplatesJsonClick}
                                 title="Importar Templates (JSON)"
                             >
                                 <FolderUp className="h-4 w-4" />
                             </Button>
                             <Button
                                 variant="outline"
                                 size="icon"
                                 onClick={handleExportTemplatesJson}
                                 disabled={templates.length === 0}
                                 title="Exportar Templates (JSON)"
                             >
                                 <FileJson className="h-4 w-4" />
                             </Button>
                         </div>
                      )}
                 </div>

                 <div className="flex-grow overflow-hidden"> {/* Make list area scrollable */}
                     <TabsContent value="sedes" className="mt-0 h-full"> {renderConfigListContent(filteredLocationsData, 'location')} </TabsContent>
                     <TabsContent value="departamentos" className="mt-0 h-full"> {renderConfigListContent(filteredDepartmentsData, 'department')} </TabsContent>
                     <TabsContent value="colaboradores" className="mt-0 h-full"> {renderConfigListContent(filteredEmployeesData, 'employee')} </TabsContent>
                     <TabsContent value="templates" className="mt-0 h-full"> {renderConfigListContent(filteredTemplatesData, 'template')} </TabsContent>
                 </div>
             </div>

             <div className="md:col-span-2 h-full overflow-hidden"> {/* Ensure form area uses available height */}
                 {renderConfigDetailForm()}
             </div>
         </div>
     </Tabs>
  );
}

```