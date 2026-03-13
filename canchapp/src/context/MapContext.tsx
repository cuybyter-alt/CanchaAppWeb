import { createContext, useContext } from 'react';
import type { ComplexMarker } from '../types/map';

interface MapContextType {
  openMap: () => void;
  complexMarkers: ComplexMarker[];
  setComplexMarkers: (markers: ComplexMarker[]) => void;
}

export const MapContext = createContext<MapContextType>({
  openMap: () => {},
  complexMarkers: [],
  setComplexMarkers: () => {},
});

export const useMapContext = () => useContext(MapContext);
