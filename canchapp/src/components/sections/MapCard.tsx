import { useEffect, useRef, useState, useMemo } from 'react';
import { MapPin, Expand, AlertCircle } from 'lucide-react';
import type { Map } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  initializeMapbox,
  createMap,
  addMarkers,
  fitMapToMarkers,
  getUserLocation,
  calculateDistance,
  MAPBOX_STYLES,
} from '../../services/mapboxService';
import type { SportsField } from '../../types/map';

// Datos mock de canchas cercanas (definidos fuera del componente para evitar recreación)
const DEFAULT_FIELDS: SportsField[] = [
  {
    id: '1',
    name: 'El Estadio',
    sport: 'futbol',
    latitude: 40.7589,
    longitude: -73.9851,
    address: 'Times Square, Manhattan',
    price: 50,
    rating: 4.8,
    available: true,
    distance: 0.8,
  },
  {
    id: '2',
    name: 'La Cancha',
    sport: 'futbol',
    latitude: 40.7489,
    longitude: -73.9680,
    address: 'Grand Central, Manhattan',
    price: 45,
    rating: 4.6,
    available: true,
    distance: 1.2,
  },
  {
    id: '3',
    name: 'Padel Pro',
    sport: 'tennis',
    latitude: 40.7614,
    longitude: -73.9776,
    address: 'Central Park South',
    price: 60,
    rating: 4.9,
    available: false,
    distance: 0.5,
  },
  {
    id: '4',
    name: 'Hoop Zone',
    sport: 'basketball',
    latitude: 40.7580,
    longitude: -73.9855,
    address: 'West 42nd St, Manhattan',
    price: 40,
    rating: 4.5,
    available: true,
    distance: 0.9,
  },
  {
    id: '5',
    name: 'Cancha Norte',
    sport: 'futbol',
    latitude: 40.7689,
    longitude: -73.9794,
    address: 'Columbus Circle',
    price: 55,
    rating: 4.7,
    available: true,
    distance: 1.5,
  },
];

interface MapCardProps {
  fields?: SportsField[];
  onOpenMap?: () => void;
  style?: string;
  showMiniMap?: boolean; // Si es true, mostrar mapa pequeño. Si es false, mostrar mapa completo.
}

export function MapCard({
  fields = [],
  onOpenMap,
  style = MAPBOX_STYLES.dark,
  showMiniMap = true,
}: MapCardProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<Map | null>(null);
  const markersRef = useRef<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nearbyFields, setNearbyFields] = useState<SportsField[]>([]);
  const isInitialized = useRef(false);

  // Memorizar los campos a usar para evitar recálculos innecesarios
  const fieldsToUse = useMemo(() => {
    return fields.length > 0 ? fields : DEFAULT_FIELDS;
  }, [fields]);

  useEffect(() => {
    // Evitar reinicialización si ya se creó el mapa
    if (isInitialized.current || !mapContainer.current) {
      return;
    }

    console.log('🗺️ MapCard: Iniciando inicialización (solo una vez)');
    isInitialized.current = true;
    
    // Inicializar Mapbox
    initializeMapbox();

    // Obtener ubicación del usuario y calcular distancias
    const initializeMap = async () => {
      let fieldsToDisplay = [...fieldsToUse];
      
      const userLocation = await getUserLocation();
      console.log('📍 MapCard: Ubicación del usuario:', userLocation);
      
      if (userLocation && fields.length === 0) {
        // Si tenemos ubicación del usuario y usamos datos mock, calcular distancias
        fieldsToDisplay = fieldsToUse.map((field) => ({
          ...field,
          distance: calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            field.latitude,
            field.longitude
          ),
        }));
      }
      
      setNearbyFields(fieldsToDisplay);
      console.log('🗺️ MapCard: Creando mapa con', fieldsToDisplay.length, 'campos');

      try {
        // Crear el mapa
        const mapInstance = createMap(mapContainer.current!, {
          style,
          center:
            fieldsToDisplay.length > 0
              ? [fieldsToDisplay[0].longitude, fieldsToDisplay[0].latitude]
              : [-73.9851, 40.7589],
          zoom: 13,
          pitch: showMiniMap ? 30 : 45,
        });

        if (!mapInstance) {
          console.error('❌ MapCard: No se pudo crear la instancia del mapa');
          setError('No se pudo crear el mapa. Verifica tu token de Mapbox.');
          setIsLoading(false);
          return;
        }

        console.log('✓ MapCard: Instancia del mapa creada');
        map.current = mapInstance;

        // Cuando el mapa carga
        mapInstance.on('load', () => {
          console.log('✓ MapCard: Mapa cargado exitosamente');
          setIsLoading(false);
          
          // Agregar marcadores
          console.log('📍 MapCard: Agregando', fieldsToDisplay.length, 'marcadores');
          const markers = addMarkers(mapInstance, fieldsToDisplay);
          markersRef.current = markers;

          // Ajustar el viewport para mostrar todas las canchas
          if (fieldsToDisplay.length > 1) {
            console.log('🔍 MapCard: Ajustando viewport');
            fitMapToMarkers(mapInstance, fieldsToDisplay);
          }
        });

        // Manejo de errores
        mapInstance.on('error', (e) => {
          console.error('❌ MapCard: Error del mapa:', e);
          setError('Error al cargar el mapa');
          setIsLoading(false);
        });
      } catch (err) {
        console.error('❌ MapCard: Error al inicializar:', err);
        setError('Error al inicializar el mapa');
        setIsLoading(false);
      }
    };

    initializeMap();

    // Cleanup solo cuando el componente se desmonta
    return () => {
      console.log('🧹 MapCard: Limpiando mapa');
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
      markersRef.current = [];
      isInitialized.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Solo ejecutar una vez al montar

  // Efecto separado para actualizar marcadores cuando cambien los campos
  useEffect(() => {
    if (!map.current || !isInitialized.current || nearbyFields.length === 0) {
      return;
    }

    console.log('🔄 MapCard: Actualizando marcadores');
    
    // Remover marcadores anteriores
    markersRef.current.forEach((marker) => marker.remove());
    
    // Agregar nuevos marcadores
    const newMarkers = addMarkers(map.current, nearbyFields);
    markersRef.current = newMarkers;

    // Ajustar viewport
    if (nearbyFields.length > 1) {
      fitMapToMarkers(map.current, nearbyFields);
    }
  }, [nearbyFields]);

  return (
    <div
      className={`bg-[var(--color-text)] rounded-[var(--radius-2xl)] overflow-hidden relative ${
        showMiniMap ? 'h-[180px]' : 'h-full'
      } shadow-[var(--shadow-lg)]`}
      style={{ minHeight: showMiniMap ? '180px' : '400px' }}
    >
      {/* Contenedor del mapa */}
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-[var(--color-text)] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
            <p className="text-white font-[var(--font-body)] text-sm">Cargando mapa...</p>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 bg-[var(--color-text)] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 px-4 text-center">
            <AlertCircle className="w-10 h-10 text-[var(--color-accent)]" />
            <p className="text-white font-[var(--font-body)] text-sm">{error}</p>
            <p className="text-[var(--color-primary-light)] font-[var(--font-body)] text-xs">
              Configura tu token en .env.local
            </p>
          </div>
        </div>
      )}

      {/* Badge con contador de canchas */}
      {!isLoading && !error && nearbyFields.length > 0 && (
        <div className="absolute top-3 left-3 bg-black/50 backdrop-blur rounded-full px-3 py-1 text-xs font-extrabold text-white flex items-center gap-1 z-10">
          <MapPin className="w-3 h-3 text-[var(--color-primary)]" />
          {nearbyFields.length} canchas cercanas
        </div>
      )}

      {/* CTA Button */}
      {!isLoading && !error && onOpenMap && (
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
