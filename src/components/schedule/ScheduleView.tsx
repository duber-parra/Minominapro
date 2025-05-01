
import React from 'react';
import type { Department, ScheduleData } from '@/types/schedule'; // Assuming types exist
import { DepartmentColumn } from './DepartmentColumn'; // Assuming DepartmentColumn component exists

interface ScheduleViewProps {
  departments: Department[];
  scheduleData: ScheduleData; // Contains assignments: { [deptId]: ShiftAssignment[] }
  onRemoveShift: (departmentId: string, assignmentId: string) => void;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({ departments, scheduleData, onRemoveShift }) => {
  // Calculate the number of columns needed based on departments
  const gridColsClass = `grid-cols-${departments.length <= 4 ? departments.length : 4}`; // Max 4 cols for simplicity, adjust as needed
  const dynamicGridClass = `grid gap-4 lg:grid-cols-${Math.min(departments.length, 4)} xl:grid-cols-${Math.min(departments.length, 5)}`; // More responsive approach

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 ${dynamicGridClass} gap-4`}>
      {departments.map((department) => (
        <DepartmentColumn
          key={department.id}
          department={department}
          assignments={scheduleData.assignments[department.id] || []}
          onRemoveShift={onRemoveShift} // Pass down the handler
          // onAddShift={() => {}} // Placeholder for '+' button logic if needed
        />
      ))}
    </div>
  );
};

    