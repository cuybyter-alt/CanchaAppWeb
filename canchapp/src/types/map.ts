/**
 * Tipo de deporte disponible
 */
export type SportType = 'futbol' | 'basketball' | 'tennis' | 'volleyball' | 'paddle';

/**
 * Interfaz para representar una cancha deportiva
 */
export interface SportsField {
  id: string;
  name: string;
  sport: SportType;
  latitude: number;
  longitude: number;
  address: string;
  price: number;
  rating: number;
  available: boolean;
  distance?: number; // En kilómetros
  image?: string;
}

/**
 * Interfaz para las coordenadas del usuario
 */
export interface UserLocation {
  latitude: number;
  longitude: number;
}

/**
 * Configuración del mapa de Mapbox
 */
export interface MapConfig {
  style: string;
  center: [number, number]; // [longitude, latitude]
  zoom: number;
  pitch?: number;
  bearing?: number;
}

/**
 * Props para los marcadores en el mapa
 */
export interface MarkerData {
  field: SportsField;
  element: HTMLElement;
}
