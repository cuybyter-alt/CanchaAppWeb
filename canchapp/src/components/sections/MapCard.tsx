import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Expand, AlertCircle, Navigation } from 'lucide-react';
import type { Map as MapboxMap } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  initializeMapbox,
  createMap,
  setupGeolocateControl,
  addComplexMarkers,
  fitMapToComplexMarkers,
  getUserLocation,
  MAPBOX_STYLES,
} from '../../services/mapboxService';
import type { ComplexMarker, UserLocation } from '../../types/map';
import { useMapContext } from '../../context/MapContext';
import complexesService from '../../services/ComplexesService';

type LocationState = 'checking' | 'prompt' | 'loading-loc' | 'map-loading' | 'map-ready' | 'error';

interface MapCardProps {
  onOpenMap?: () => void;
  style?: string;
  showMiniMap?: boolean;
  /** Called when a complex marker is clicked. If omitted, navigates to /complexes/:id. */
  onMarkerClick?: (marker: ComplexMarker) => void;
}

export function MapCard({
  onOpenMap,
  style = MAPBOX_STYLES.dark,
  showMiniMap = true,
  onMarkerClick,
}: MapCardProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<MapboxMap | null>(null);
  const markersRef = useRef<any[]>([]);
  const isInitialized = useRef(false);
  const autoGeolocateRef = useRef(false);
  // Keep a stable ref so startMap (useCallback) never needs onMarkerClick in its deps
  const onMarkerClickRef = useRef(onMarkerClick);
  useEffect(() => { onMarkerClickRef.current = onMarkerClick; }, [onMarkerClick]);

  const [locationState, setLocationState] = useState<LocationState>('checking');
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const { complexMarkers: contextComplexMarkers, setComplexMarkers } = useMapContext();
  // Use a ref so startMap always reads the latest context markers without re-creating
  const contextMarkersRef = useRef<ComplexMarker[]>(contextComplexMarkers);
  useEffect(() => { contextMarkersRef.current = contextComplexMarkers; }, [contextComplexMarkers]);

  // ── Initialize map once location is resolved ──────────────────────────
  const startMap = useCallback(async (userLoc: UserLocation | null) => {
    if (isInitialized.current || !mapContainer.current) return;
    isInitialized.current = true;
    setLocationState('map-loading');

    initializeMapbox();

    // Use cached markers from context or load from API
    let markersToDisplay: ComplexMarker[] = contextMarkersRef.current;
    if (markersToDisplay.length === 0) {
      try {
        const loaded = await complexesService.getComplexMarkers();
        if (loaded.length > 0) {
          markersToDisplay = loaded;
          setComplexMarkers(loaded);
        }
      } catch {
        // API unavailable — map still renders without pins
      }
    }

    const center: [number, number] = userLoc
      ? [userLoc.longitude, userLoc.latitude]
      : markersToDisplay.length > 0
      ? [markersToDisplay[0].longitude, markersToDisplay[0].latitude]
      : [-74.0721, 4.711];

    try {
      const mapInstance = createMap(mapContainer.current, {
        style,
        center,
        zoom: userLoc ? 13 : 11,
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

          const markerClickHandler = (marker: ComplexMarker) => {
            if (onMarkerClickRef.current) {
              onMarkerClickRef.current(marker);
            } else {
              navigate(`/complexes/${marker.id}`);
            }
          };
          const markers = addComplexMarkers(
            mapInstance,
            markersToDisplay,
            markerClickHandler,
          );
          markersRef.current = markers;

          if (userLoc) {
            mapInstance.flyTo({
              center: [userLoc.longitude, userLoc.latitude],
              zoom: 13,
              speed: 1.4,
              essential: true,
            });
            setTimeout(() => geoCtrl.trigger(), 1000);
          } else if (autoGeolocateRef.current) {
            setTimeout(() => geoCtrl.trigger(), 300);
          } else if (markersToDisplay.length > 1) {
            fitMapToComplexMarkers(mapInstance, markersToDisplay);
            if (!showMiniMap) setTimeout(() => geoCtrl.trigger(), 600);
          }

          setLocationState('map-ready');
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
  }, [style, showMiniMap, setComplexMarkers, navigate]);

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
            if (showMiniMap) {
              // Mini map: always show banner so the user can confirm location use
              setLocationState('prompt');
            } else {
              // Full map dialog: silently start with existing permission
              const loc = await getUserLocation();
              startMap(loc);
            }
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
  const handleAllowLocation = () => {
    // Start the map immediately — don't block on GPS.
    // The GeolocateControl triggered inside startMap's load handler will
    // request position (browser already has permission after the browser
    // dialog) and fly the map there automatically.
    autoGeolocateRef.current = true;
    startMap(null);
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

      {/* Overlay: solicitando permiso de ubicación */}
      {locationState === 'prompt' && (
        <LocationPermissionBanner
          loading={false}
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

      {/* Badge: contador de complejos */}
      {locationState === 'map-ready' && contextComplexMarkers.length > 0 && (
        <div className="absolute top-3 left-3 bg-black/50 backdrop-blur rounded-full px-3 py-1 text-xs font-extrabold text-white flex items-center gap-1 z-10">
          <MapPin className="w-3 h-3 text-[var(--color-primary)]" />
          {contextComplexMarkers.length} complejos cercanos
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
