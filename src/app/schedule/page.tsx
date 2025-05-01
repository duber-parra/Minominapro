@@ -359,7 +359,7 @@
       {/* Main content area with 7 columns on large screens */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
 
-        {/* Column 1: Configuration */}
+                {/* Column 1: Configuration */}
                 <div className="lg:col-span-1">
                     <Card>
                         <CardHeader>
@@ -461,7 +461,7 @@
                 </div>
 
                 {/* Column 2: Weekly Schedule View */}
-                <div className="lg:col-span-2">
+                <div className="lg:col-span-4">
                     <Card>
                         <CardHeader className="flex flex-row items-center justify-between">
                             <CardTitle>Horario Semanal - {selectedLocationId}</CardTitle>
@@ -473,7 +473,7 @@
                         <CardContent>
                             <DndContext id="DndDescribedBy-0" onDragEnd={handleDragEnd} >
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[600px]"> {/* Added a fixed height for the main grid container */}
-                                    <div className="md:col-span-1">
+                                    <div className="md:col-span-2 lg:col-span-1">
                                         <EmployeeList employees={filteredEmployees} />
                                     </div>
                                     <div className="md:col-span-1">
@@ -490,7 +490,7 @@
                 </div>
             </div>
 
-            {/* Modals */}
+              {/* Modals */}
             <ShiftDetailModal
                 isOpen={isShiftModalOpen}
                 onClose={() => setIsShiftModalOpen(false)}
