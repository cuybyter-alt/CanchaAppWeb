import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { SportsField, MapConfig, UserLocation } from '../types/map';

/**
 * Token de acceso de Mapbox desde las variables de entorno
 */
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

/**
 * Configuración por defecto del mapa
 */
const DEFAULT_MAP_CONFIG: MapConfig = {
  style: 'mapbox://styles/mapbox/dark-v11', // Estilo oscuro que combina con el tema gaming
  center: [-74.0060, 40.7128], // Nueva York por defecto
  zoom: 13,
  pitch: 45,
  bearing: 0,
};

/**
 * Inicializa el token de acceso de Mapbox
 */
export function initializeMapbox(): void {
  if (!MAPBOX_TOKEN) {
    console.error('⚠️ VITE_MAPBOX_ACCESS_TOKEN no está configurado en .env.local');
    console.error('Token actual:', MAPBOX_TOKEN);
    return;
  }
  console.log('✓ Inicializando Mapbox con token:', MAPBOX_TOKEN.substring(0, 20) + '...');
  mapboxgl.accessToken = MAPBOX_TOKEN;
}

/**
 * Crea una instancia del mapa de Mapbox
 * @param container - ID o elemento HTML del contenedor del mapa
 * @param config - Configuración opcional del mapa
 * @returns Instancia del mapa de Mapbox
 */
export function createMap(
  container: string | HTMLElement,
  config: Partial<MapConfig> = {}
): mapboxgl.Map | null {
  if (!MAPBOX_TOKEN) {
    console.error('⚠️ No se puede crear el mapa sin un token de Mapbox');
    return null;
  }

  const mapConfig = { ...DEFAULT_MAP_CONFIG, ...config };

  const map = new mapboxgl.Map({
    container,
    style: mapConfig.style,
    center: mapConfig.center,
    zoom: mapConfig.zoom,
    pitch: mapConfig.pitch || 0,
    bearing: mapConfig.bearing || 0,
  });

  // Agregar controles de navegación
  map.addControl(new mapboxgl.NavigationControl(), 'top-right');

  // Agregar control de geolocalización
  map.addControl(
    new mapboxgl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true,
      },
      trackUserLocation: true,
      showUserHeading: true,
    }),
    'top-right'
  );

  return map;
}

/**
 * Crea un elemento HTML personalizado para el marcador
 * @param field - Datos de la cancha deportiva
 * @returns Elemento HTML del marcador
 */
function createMarkerElement(field: SportsField): HTMLElement {
  const el = document.createElement('div');
  el.className = 'custom-marker';
  
  // Mapeo de iconos Font Awesome según el deporte
  const iconMap: Record<string, string> = {
    futbol: 'fa-futbol',
    basketball: 'fa-basketball',
    tennis: 'fa-table-tennis-paddle-ball',
    volleyball: 'fa-volleyball',
    paddle: 'fa-baseball',
  };

  const icon = iconMap[field.sport] || 'fa-location-dot';
  const color = field.available ? '#62bf3b' : '#ff4757';

  el.innerHTML = `
    <div style="
      background: ${color};
      width: 40px;
      height: 40px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      display: flex;
      align-items: center;
      justify-content: center;
      border: 3px solid #1a2e14;
      box-shadow: 0 4px 8px rgba(0,0,0,0.3);
      cursor: pointer;
      transition: transform 0.2s ease;
    ">
      <i class="fa-solid ${icon}" style="
        transform: rotate(45deg);
        color: white;
        font-size: 18px;
      "></i>
    </div>
  `;

  el.addEventListener('mouseenter', () => {
    el.style.transform = 'scale(1.2)';
  });

  el.addEventListener('mouseleave', () => {
    el.style.transform = 'scale(1)';
  });

  return el;
}

/**
 * Crea el contenido del popup para una cancha
 * @param field - Datos de la cancha deportiva
 * @returns HTML del popup
 */
function createPopupContent(field: SportsField): string {
  return `
    <div style="padding: 8px; font-family: 'Nunito', sans-serif;">
      <h3 style="margin: 0 0 8px 0; color: #62bf3b; font-size: 16px; font-weight: 700;">
        ${field.name}
      </h3>
      <p style="margin: 4px 0; font-size: 14px; color: #2d4a25;">
        <i class="fa-solid fa-location-dot"></i> ${field.address}
      </p>
      <p style="margin: 4px 0; font-size: 14px; color: #2d4a25;">
        <i class="fa-solid fa-dollar-sign"></i> $${field.price}/hora
      </p>
      <p style="margin: 4px 0; font-size: 14px; color: #2d4a25;">
        <i class="fa-solid fa-star" style="color: #ffd60a;"></i> ${field.rating}/5
      </p>
      ${field.distance ? `
        <p style="margin: 4px 0; font-size: 14px; color: #2d4a25;">
          <i class="fa-solid fa-route"></i> ${field.distance.toFixed(1)} km
        </p>
      ` : ''}
      <div style="margin-top: 8px;">
        <span style="
          display: inline-block;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          background: ${field.available ? '#62bf3b' : '#ff4757'};
          color: white;
        ">
          ${field.available ? '✓ Disponible' : '✕ Ocupada'}
        </span>
      </div>
    </div>
  `;
}

/**
 * Agrega marcadores al mapa para las canchas deportivas
 * @param map - Instancia del mapa de Mapbox
 * @param fields - Array de canchas deportivas
 * @returns Array de marcadores creados
 */
export function addMarkers(
  map: mapboxgl.Map,
  fields: SportsField[]
): mapboxgl.Marker[] {
  const markers: mapboxgl.Marker[] = [];

  fields.forEach((field) => {
    const el = createMarkerElement(field);
    
    const popup = new mapboxgl.Popup({
      offset: 25,
      closeButton: true,
      closeOnClick: false,
    }).setHTML(createPopupContent(field));

    const marker = new mapboxgl.Marker({ element: el })
      .setLngLat([field.longitude, field.latitude])
      .setPopup(popup)
      .addTo(map);

    markers.push(marker);
  });

  return markers;
}

/**
 * Ajusta el viewport del mapa para mostrar todos los marcadores
 * @param map - Instancia del mapa de Mapbox
 * @param fields - Array de canchas deportivas
 */
export function fitMapToMarkers(
  map: mapboxgl.Map,
  fields: SportsField[]
): void {
  if (fields.length === 0) return;

  const bounds = new mapboxgl.LngLatBounds();

  fields.forEach((field) => {
    bounds.extend([field.longitude, field.latitude]);
  });

  map.fitBounds(bounds, {
    padding: { top: 50, bottom: 50, left: 50, right: 50 },
    maxZoom: 15,
  });
}

/**
 * Obtiene la ubicación actual del usuario
 * @returns Promesa con la ubicación del usuario o null si no está disponible
 */
export async function getUserLocation(): Promise<UserLocation | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.warn('⚠️ Geolocalización no disponible en este navegador');
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        console.warn('⚠️ Error al obtener la ubicación:', error.message);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );
  });
}

/**
 * Calcula la distancia entre dos puntos geográficos usando la fórmula de Haversine
 * @param lat1 - Latitud del punto 1
 * @param lon1 - Longitud del punto 1
 * @param lat2 - Latitud del punto 2
 * @param lon2 - Longitud del punto 2
 * @returns Distancia en kilómetros
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Estilos de Mapbox disponibles
 */
export const MAPBOX_STYLES = {
  // Estilos Standard (Requieren GL JS v3+)
  standard: 'mapbox://styles/mapbox/standard',
  standardSatellite: 'mapbox://styles/mapbox/standard-satellite',
  
  // Estilos clásicos (Legacy pero funcionales)
  streets: 'mapbox://styles/mapbox/streets-v12',
  outdoors: 'mapbox://styles/mapbox/outdoors-v12',
  light: 'mapbox://styles/mapbox/light-v11',
  dark: 'mapbox://styles/mapbox/dark-v11',
  satellite: 'mapbox://styles/mapbox/satellite-v9',
  satelliteStreets: 'mapbox://styles/mapbox/satellite-streets-v12',
  navigationDay: 'mapbox://styles/mapbox/navigation-day-v1',
  navigationNight: 'mapbox://styles/mapbox/navigation-night-v1',
} as const;
