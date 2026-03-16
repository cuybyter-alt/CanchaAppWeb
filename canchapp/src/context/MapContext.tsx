import { createContext, useContext } from 'react';
import type { ComplexMarker } from '../types/map';

interface MapContextType {
  openMap: () => void;
  complexMarkers: ComplexMarker[];
  setComplexMarkers: (markers: ComplexMarker[]) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

export const MapContext = createContext<MapContextType>({
  openMap: () => {},
  complexMarkers: [],
  setComplexMarkers: () => {},
  searchQuery: '',
  setSearchQuery: () => {},
});

export const useMapContext = () => useContext(MapContext);
