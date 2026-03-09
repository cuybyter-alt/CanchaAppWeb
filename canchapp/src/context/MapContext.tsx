import { createContext, useContext } from 'react';

interface MapContextType {
  openMap: () => void;
}

export const MapContext = createContext<MapContextType>({ openMap: () => {} });

export const useMapContext = () => useContext(MapContext);
