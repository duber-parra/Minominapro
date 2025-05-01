
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Location } from '@/types/schedule'; // Assuming type exists

interface LocationSelectorProps {
  locations: Location[];
  selectedLocationId?: string;
  onLocationChange: (locationId: string) => void;
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  locations,
  selectedLocationId,
  onLocationChange,
}) => {
  return (
    <Select value={selectedLocationId} onValueChange={onLocationChange}>
      <SelectTrigger id="location-select">
        <SelectValue placeholder="Selecciona una sede" />
      </SelectTrigger>
      <SelectContent>
        {locations.map((location) => (
          <SelectItem key={location.id} value={location.id}>
            {location.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

    