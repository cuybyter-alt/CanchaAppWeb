import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { MapPin, Expand, AlertCircle, Navigation } from 'lucide-react';
import type { Map as MapboxMap } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  initializeMapbox,
  createMap,
  setupGeolocateControl,
  addMarkers,
  fitMapToMarkers,
  getUserLocation,
  calculateDistance,
  MAPBOX_STYLES,
} from '../../services/mapboxService';
import type { SportsField, UserLocation } from '../../types/map';

// Datos mock de canchas cercanas (definidos fuera del componente para evitar recreación)
const DEFAULT_FIELDS: SportsField[] = [
  {
    id: '1',
    name: 'Cancha El Diamante',
    sport: 'futbol5',
    latitude: 40.7589,
    longitude: -73.9851,
    address: 'Times Square, Manhattan',
    price: 28000,
    rating: 4.9,
    available: true,
    distance: 0.8,
  },
  {
    id: '2',
    name: 'El Porvenir F7',
    sport: 'futbol7',
    latitude: 40.7489,
    longitude: -73.9680,
    address: 'Grand Central, Manhattan',
    price: 35000,
    rating: 4.7,
    available: true,
    distance: 1.2,
  },
  {
    id: '3',
    name: 'Micro Los Pinos',
    sport: 'microfutbol',
    latitude: 40.7614,
    longitude: -73.9776,
    address: 'Central Park South',
    price: 22000,
    rating: 4.6,
    available: false,
    distance: 0.5,
  },
  {
    id: '4',
    name: 'Estadio Norte F11',
    sport: 'futbol11',
    latitude: 40.7580,
    longitude: -73.9855,
    address: 'West 42nd St, Manhattan',
    price: 55000,
    rating: 4.8,
    available: true,
    distance: 0.9,
  },
  {
    id: '5',
    name: 'Cancha Centenario',
    sport: 'futbol5',
    latitude: 40.7689,
    longitude: -73.9794,
    address: 'Columbus Circle',
    price: 28000,
    rating: 4.5,
    available: true,
    distance: 1.5,
  },
];

type LocationState = 'checking' | 'prompt' | 'loading-loc' | 'map-loading' | 'map-ready' | 'error';

interface MapCardProps {
  fields?: SportsField[];
  onOpenMap?: () => void;
  style?: string;
  showMiniMap?: boolean;
}

export function MapCard({
  fields = [],
  onOpenMap,
  style = MAPBOX_STYLES.dark,
  showMiniMap = true,
}: MapCardProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<MapboxMap | null>(null);
  const markersRef = useRef<any[]>([]);
  const isInitialized = useRef(false);

  const [locationState, setLocationState] = useState<LocationState>('checking');
  const [nearbyFields, setNearbyFields] = useState<SportsField[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fieldsToUse = useMemo(() => fields.length > 0 ? fields : DEFAULT_FIELDS, [fields]);

  // ── Initialize map once location is resolved ──────────────────────────
  const startMap = useCallback(async (userLoc: UserLocation | null) => {
    if (isInitialized.current || !mapContainer.current) return;
    isInitialized.current = true;
    setLocationState('map-loading');

    initializeMapbox();

    let fieldsToDisplay = [...fieldsToUse];
    if (userLoc && fields.length === 0) {
      fieldsToDisplay = fieldsToUse.map((f) => ({
        ...f,
        distance: calculateDistance(userLoc.latitude, userLoc.longitude, f.latitude, f.longitude),
      }));
    }
    setNearbyFields(fieldsToDisplay);

    const center: [number, number] = userLoc
      ? [userLoc.longitude, userLoc.latitude]
      : fieldsToDisplay.length > 0
      ? [fieldsToDisplay[0].longitude, fieldsToDisplay[0].latitude]
      : [-74.006, 40.7128];

    try {
      const mapInstance = createMap(mapContainer.current, {
        style,
        center,
        zoom: userLoc ? 14 : 13,
        pitch: showMiniMap ? 30 : 45,
      });

      if (!mapInstance) {
        setError('No se pudo crear el mapa. Verifica tu token de Mapbox.');
        setLocationState('error');
        return;
      }

      map.current = mapInstance;
      const geoCtrl = setupGeolocateControl(mapInstance);

      mapInstance.on('load', () => {
          // Recalculate canvas size in case the container was scaled during
          // a CSS animation (e.g. dialog open transition)
          mapInstance.resize();

          setLocationState('map-ready');
          const markers = addMarkers(mapInstance, fieldsToDisplay);
          markersRef.current = markers;

          if (fieldsToDisplay.length > 1 && !userLoc) {
            fitMapToMarkers(mapInstance, fieldsToDisplay);
          }

          // Trigger geolocate: always on full map, or when we have the location on mini
          if (userLoc || !showMiniMap) {
            setTimeout(() => geoCtrl.trigger(), 600);
          }
        });

      mapInstance.on('error', (e) => {
        console.error('❌ MapCard: Error del mapa:', e);
        setError('Error al cargar el mapa');
        setLocationState('error');
      });
    } catch (err) {
      console.error('❌ MapCard: Error al inicializar:', err);
      setError('Error al inicializar el mapa');
      setLocationState('error');
    }
  }, [fieldsToUse, fields.length, style, showMiniMap]);

  // ── Check geolocation permission silently on mount ────────────────────
  useEffect(() => {
    async function checkPermission() {
      if (!('geolocation' in navigator)) {
        // No geolocation support → skip prompt
        startMap(null);
        return;
      }

      if ('permissions' in navigator) {
        try {
          const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
          if (result.state === 'granted') {
            // Already permitted → get location silently and start map
            const loc = await getUserLocation();
            startMap(loc);
          } else if (result.state === 'denied') {
            // Blocked → start map without location (no point prompting)
            startMap(null);
          } else {
            // 'prompt' → show our custom banner
            setLocationState('prompt');
          }
        } catch {
          setLocationState('prompt');
        }
      } else {
        // Permissions API not supported → show banner
        setLocationState('prompt');
      }
    }

    checkPermission();
  }, [startMap]);

  // ── Banner actions ────────────────────────────────────────────────────
  const handleAllowLocation = async () => {
    setLocationState('loading-loc');
    const loc = await getUserLocation(); // triggers native browser prompt
    startMap(loc ?? null);
  };

  const handleSkipLocation = () => {
    startMap(null);
  };

  // ── Cleanup on unmount ────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
      markersRef.current = [];
      isInitialized.current = false;
    };
  }, []);

  return (
    <div
      className={`bg-[var(--color-text)] rounded-[var(--radius-2xl)] overflow-hidden relative ${
        showMiniMap ? 'h-[180px]' : 'h-full'
      } shadow-[var(--shadow-lg)]`}
      style={{ minHeight: showMiniMap ? '180px' : '400px' }}
    >
      {/* Mapa — siempre renderizado para que el ref esté disponible */}
      <div
        ref={mapContainer}
        className="absolute inset-0 w-full h-full"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      {/* Overlay: verificando / mapa cargando */}
      {(locationState === 'checking' || locationState === 'map-loading') && !error && (
        <div className="absolute inset-0 bg-[var(--color-text)] flex items-center justify-center z-10">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
            <p className="text-white/60 text-sm font-semibold">Cargando mapa...</p>
          </div>
        </div>
      )}

      {/* Overlay: solicitar permiso de ubicación */}
      {(locationState === 'prompt' || locationState === 'loading-loc') && (
        <LocationPermissionBanner
          loading={locationState === 'loading-loc'}
          onAllow={handleAllowLocation}
          onSkip={handleSkipLocation}
          showMiniMap={showMiniMap}
        />
      )}

      {/* Overlay: error */}
      {error && (
        <div className="absolute inset-0 bg-[var(--color-text)] flex items-center justify-center z-10">
          <div className="flex flex-col items-center gap-3 px-4 text-center">
            <AlertCircle className="w-10 h-10 text-[var(--color-accent)]" />
            <p className="text-white text-sm">{error}</p>
            <p className="text-[var(--color-primary-light)] text-xs">
              Configura tu token en .env.local
            </p>
          </div>
        </div>
      )}

      {/* Badge: contador de canchas */}
      {locationState === 'map-ready' && nearbyFields.length > 0 && (
        <div className="absolute top-3 left-3 bg-black/50 backdrop-blur rounded-full px-3 py-1 text-xs font-extrabold text-white flex items-center gap-1 z-10">
          <MapPin className="w-3 h-3 text-[var(--color-primary)]" />
          {nearbyFields.length} canchas cercanas
        </div>
      )}

      {/* CTA: abrir mapa completo */}
      {locationState === 'map-ready' && onOpenMap && (
        <button
          className="absolute bottom-3 right-3 bg-[var(--color-primary)] text-white border-none rounded-[var(--radius-badge)] cursor-pointer px-4 py-2 font-bold text-[13px] shadow-[var(--shadow-primary)] flex items-center gap-2 transition-transform hover:scale-105 active:scale-95 z-10"
          onClick={onOpenMap}
        >
          <Expand className="w-3 h-3" />
          Abrir Mapa
        </button>
      )}
    </div>
  );
}

// ── Location Permission Banner ─────────────────────────────────────────────
interface BannerProps {
  loading: boolean;
  onAllow: () => void;
  onSkip: () => void;
  showMiniMap: boolean;
}

function LocationPermissionBanner({ loading, onAllow, onSkip, showMiniMap }: BannerProps) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#0a1a08]/90 backdrop-blur-sm px-4">
      <div className="flex flex-col items-center text-center gap-4 max-w-[220px]">

        {/* Pulsing location icon */}
        <div className="relative flex items-center justify-center">
          <div className="absolute w-16 h-16 rounded-full bg-[var(--color-primary)]/20 animate-ping" />
          <div className="relative w-12 h-12 rounded-full bg-[var(--color-primary)]/25 border border-[var(--color-primary)]/40 flex items-center justify-center">
            <Navigation className="w-5 h-5 text-[var(--color-primary)]" />
          </div>
        </div>

        {/* Text (only when there's space) */}
        {!showMiniMap && (
          <div className="space-y-1">
            <p className="text-white font-extrabold text-base leading-snug">
              ¿Dónde estás ahora?
            </p>
            <p className="text-white/50 text-xs leading-relaxed">
              Activa tu ubicación para ver las canchas más cercanas a ti.
            </p>
          </div>
        )}

        {/* Actions */}
        {loading ? (
          <div className="flex items-center gap-2 text-[var(--color-primary)] text-xs font-bold">
            <div className="w-3.5 h-3.5 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
            Obteniendo ubicación…
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 w-full">
            <button
              className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-extrabold text-xs px-4 py-2.5 rounded-[var(--radius-lg)] transition-all hover:scale-[1.02] active:scale-95 shadow-[var(--shadow-primary)] flex items-center justify-center gap-2"
              onClick={onAllow}
            >
              <Navigation className="w-3.5 h-3.5" />
              Compartir mi ubicación
            </button>
            <button
              className="text-white/35 hover:text-white/60 text-xs font-semibold transition-colors py-1"
              onClick={onSkip}
            >
              Continuar sin ubicación
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
