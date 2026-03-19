import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { SportsField, MapConfig, UserLocation, ComplexMarker } from '../types/map';

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

  return map;
}

/**
 * Agrega el control de geolocalización al mapa y lo retorna para poder
 * dispararlo programáticamente con .trigger()
 */
export function setupGeolocateControl(map: mapboxgl.Map): mapboxgl.GeolocateControl {
  const control = new mapboxgl.GeolocateControl({
    positionOptions: {
      enableHighAccuracy: true,
    },
    trackUserLocation: true,
    showUserHeading: true,
  });
  map.addControl(control, 'top-right');
  return control;
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
    futbol5:    'fa-futbol',
    futbol7:    'fa-futbol',
    futbol11:   'fa-futbol',
    microfutbol: 'fa-circle-dot',
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
        timeout: 15000,  // 15s — GPS on mobile needs more time
        maximumAge: 60000, // accept a cached position up to 1 min old
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

// ── Complex markers (complejos deportivos desde la API) ─────────────────────

function createComplexMarkerElement(
  complex: ComplexMarker,
  onNavigate?: (complex: ComplexMarker) => void,
): HTMLElement {
  // el must NOT have position:relative — Mapbox positions its markers with
  // transform:translate on a wrapper div inside the map canvas. Adding
  // position:relative here makes the browser anchor child absolutely-
  // positioned elements to el instead of to the map canvas, which causes
  // markers to drift when the page (not the map) is scrolled.
  // We give el explicit dimensions equal to the pin so Mapbox anchor logic works.
  const el = document.createElement('div');
  el.style.cssText = 'width:40px;height:40px;cursor:pointer;overflow:visible;';

  const color = complex.fieldsCount > 0 ? '#62bf3b' : '#ff9f43';
  const minK = Math.round(complex.minPrice / 1000);
  const maxK = Math.round(complex.maxPrice / 1000);
  const priceRange = minK === maxK ? `$${minK}k/h` : `$${minK}k–$${maxK}k/h`;

  // ── Tooltip — appended to document.body so it escapes any overflow:hidden ──
  // Positioned with position:fixed, coordinates updated on each mouseover.
  const tooltip = document.createElement('div');
  tooltip.style.cssText = [
    'position:fixed',
    'opacity:0',
    'pointer-events:none',
    'transition:opacity 0.18s ease,transform 0.18s ease',
    'background:#0D1F08',
    'border:1.5px solid rgba(98,191,59,0.35)',
    'border-radius:14px',
    'padding:10px 12px 9px',
    'min-width:170px',
    'max-width:210px',
    'box-shadow:0 8px 28px rgba(0,0,0,0.65)',
    'font-family:Nunito,sans-serif',
    'z-index:9999',
    'white-space:normal',
    'transform:translateY(8px)',
  ].join(';');

  tooltip.innerHTML = `
    <p style="color:#62bf3b;font-size:12px;font-weight:800;margin:0 0 6px;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:186px;">${complex.name}</p>
    <div style="display:flex;align-items:center;gap:5px;margin-bottom:9px;flex-wrap:wrap;">
      <span style="display:inline-flex;align-items:center;gap:3px;background:rgba(98,191,59,0.12);border:1px solid rgba(98,191,59,0.25);border-radius:20px;padding:2px 8px;">
        <i class="fa-solid fa-futbol" style="color:#62bf3b;font-size:9px;"></i>
        <span style="color:#a7d99a;font-size:10px;font-weight:700;">${complex.fieldsCount} cancha${complex.fieldsCount !== 1 ? 's' : ''}</span>
      </span>
      <span style="display:inline-flex;align-items:center;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:2px 8px;">
        <span style="color:#8cb87d;font-size:10px;font-weight:600;">${priceRange}</span>
      </span>
    </div>
    <div style="display:flex;align-items:center;justify-content:center;gap:5px;background:rgba(98,191,59,0.15);border:1px solid rgba(98,191,59,0.3);border-radius:8px;padding:5px 10px;color:#62bf3b;font-size:11px;font-weight:800;">
      Ver canchas <i class="fa-solid fa-arrow-right" style="font-size:9px;"></i>
    </div>
    <div style="position:absolute;bottom:-5px;left:50%;width:9px;height:9px;background:#0D1F08;border-right:1.5px solid rgba(98,191,59,0.35);border-bottom:1.5px solid rgba(98,191,59,0.35);transform:translateX(-50%) rotate(45deg);"></div>
  `;

  document.body.appendChild(tooltip);

  // ── Pin circle ─────────────────────────────────────────────────────────
  const circle = document.createElement('div');
  circle.style.cssText = [
    `background:${color}`,
    'width:40px',
    'height:40px',
    'border-radius:50%',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'border:3px solid #1a2e14',
    'box-shadow:0 4px 12px rgba(0,0,0,0.4)',
    'transition:transform 0.18s ease,box-shadow 0.18s ease',
  ].join(';');
  circle.innerHTML = `<i class="fa-solid fa-futbol" style="color:white;font-size:15px;pointer-events:none;"></i>`;

  el.appendChild(circle);

  // ── Hover: position tooltip via getBoundingClientRect ──────────────────
  el.addEventListener('mouseover', () => {
    const rect = el.getBoundingClientRect();
    const tooltipWidth = 210;
    let left = rect.left + rect.width / 2 - tooltipWidth / 2;
    // Clamp to viewport
    left = Math.max(8, Math.min(left, window.innerWidth - tooltipWidth - 8));
    const top = rect.top - 10; // will be shifted up by tooltip height via bottom anchor

    // We want the tooltip bottom to sit 10px above the pin top
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${rect.top - 10}px`;
    tooltip.style.transform = 'translateY(-100%)';
    tooltip.style.opacity = '1';
    circle.style.transform = 'scale(1.18)';
    circle.style.boxShadow = '0 6px 22px rgba(98,191,59,0.5)';
    // suppress unused var warning
    void top;
  });

  el.addEventListener('mouseout', (e: MouseEvent) => {
    if (!el.contains(e.relatedTarget as Node | null)) {
      tooltip.style.opacity = '0';
      tooltip.style.transform = 'translateY(calc(-100% + 8px))';
      circle.style.transform = 'scale(1)';
      circle.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)';
    }
  });

  // ── Cleanup: remove tooltip from body when marker is destroyed ─────────
  // Mapbox calls element.remove() when the marker is removed from the map.
  const observer = new MutationObserver(() => {
    if (!document.body.contains(el)) {
      tooltip.remove();
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // ── Click → open dialog ─────────────────────────────────────────────────
  el.addEventListener('click', () => onNavigate?.(complex));

  return el;
}

export function addComplexMarkers(
  map: mapboxgl.Map,
  complexes: ComplexMarker[],
  onNavigate?: (complex: ComplexMarker) => void,
): mapboxgl.Marker[] {
  const markers: mapboxgl.Marker[] = [];

  complexes.forEach((complex) => {
    const el = createComplexMarkerElement(complex, onNavigate);
    const marker = new mapboxgl.Marker({ element: el })
      .setLngLat([complex.longitude, complex.latitude])
      .addTo(map);
    markers.push(marker);
  });

  return markers;
}

export function fitMapToComplexMarkers(
  map: mapboxgl.Map,
  complexes: ComplexMarker[],
): void {
  if (complexes.length === 0) return;

  const bounds = new mapboxgl.LngLatBounds();
  complexes.forEach((c) => bounds.extend([c.longitude, c.latitude]));

  map.fitBounds(bounds, {
    padding: { top: 50, bottom: 50, left: 50, right: 50 },
    maxZoom: 14,
  });
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
