import { createContext, useContext } from 'react';
import type { ComplexMarker } from '../types/map';

export interface MapCenterCoords {
  lng: number;
  lat: number;
  zoom?: number;
}

interface MapContextType {
  openMap: () => void;
  openMapAt: (coords: MapCenterCoords) => void;
  complexMarkers: ComplexMarker[];
  setComplexMarkers: (markers: ComplexMarker[]) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  centerOn?: MapCenterCoords;
  setCenterOn: (coords?: MapCenterCoords) => void;
}

export const MapContext = createContext<MapContextType>({
  openMap: () => {},
  openMapAt: () => {},
  complexMarkers: [],
  setComplexMarkers: () => {},
  searchQuery: '',
  setSearchQuery: () => {},
  centerOn: undefined,
  setCenterOn: () => {},
});

export const useMapContext = () => useContext(MapContext);
