import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  createMap,
  getUserLocation,
  initializeMapbox,
  setupGeocoder,
} from '../../services/mapboxService';
import type MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';

interface ComplexLocationPickerProps {
  latitude: string;
  longitude: string;
  onChange: (latitude: string, longitude: string) => void;
}

const hasValidCoords = (latitude: string, longitude: string) => {
  const lat = Number(latitude);
  const lng = Number(longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) && latitude !== '' && longitude !== '';
};

export function ComplexLocationPicker({
  latitude,
  longitude,
  onChange,
}: ComplexLocationPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const geocoderContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const geocoderRef = useRef<MapboxGeocoder | null>(null);
  const onChangeRef = useRef(onChange);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    let cancelled = false;

    const placeMarker = (lng: number, lat: number) => {
      if (!mapRef.current) return;

      if (markerRef.current) {
        markerRef.current.setLngLat([lng, lat]);
        return;
      }

      const marker = new mapboxgl.Marker({ color: '#62bf3b', draggable: true })
        .setLngLat([lng, lat])
        .addTo(mapRef.current);

      marker.on('dragend', () => {
        const position = marker.getLngLat();
        onChangeRef.current(position.lat.toFixed(6), position.lng.toFixed(6));
      });

      markerRef.current = marker;
    };

    const setupMap = () => {
      if (!mapContainerRef.current || mapRef.current) return;

      initializeMapbox();
      setMapError(null);

      const valid = hasValidCoords(latitude, longitude);
      const center: [number, number] = valid
        ? [Number(longitude), Number(latitude)]
        : [-74.0721, 4.711];

      const map = createMap(mapContainerRef.current, {
        style: 'mapbox://styles/mapbox/dark-v11',
        center,
        zoom: valid ? 15 : 11,
        pitch: 0,
      });

      if (!map) {
        setMapError('No se pudo inicializar el mapa. Verifica el token de Mapbox.');
        return;
      }

      if (cancelled) {
        map.remove();
        return;
      }

      mapRef.current = map;

      if (valid) {
        placeMarker(Number(longitude), Number(latitude));
      }

      map.on('click', (event) => {
        const { lng, lat } = event.lngLat;
        placeMarker(lng, lat);
        onChangeRef.current(lat.toFixed(6), lng.toFixed(6));
      });

      map.once('load', () => {
        if (cancelled) return;
        map.resize();

        if (!geocoderContainerRef.current) return;
        const geocoder = setupGeocoder({ placeholder: 'Buscar dirección del complejo...' });
        geocoderRef.current = geocoder;
        geocoderContainerRef.current.innerHTML = '';
        geocoderContainerRef.current.appendChild(geocoder.onAdd(map));

        geocoder.on(
          'result',
          (event: {
            result: { geometry: { coordinates: [number, number] } };
          }) => {
            const [lng, lat] = event.result.geometry.coordinates;
            onChangeRef.current(lat.toFixed(6), lng.toFixed(6));
            map.flyTo({ center: [lng, lat], zoom: 16, speed: 1.4, essential: true });
            placeMarker(lng, lat);
          },
        );

        if (!valid) {
          void getUserLocation().then((userLoc) => {
            if (cancelled || !userLoc) return;
            map.flyTo({
              center: [userLoc.longitude, userLoc.latitude],
              zoom: 13,
              speed: 1.2,
              essential: true,
            });
          });
        }
      });

      window.setTimeout(() => {
        if (!cancelled) map.resize();
      }, 0);
    };

    const timer = window.setTimeout(() => {
      void setupMap();
    }, 80);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);

      if (geocoderRef.current) {
        try {
          geocoderRef.current.onRemove();
        } catch {
          // noop
        }
        geocoderRef.current = null;
      }

      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-3">
      <div className="geocoder-admin" ref={geocoderContainerRef} />
      <div className="relative">
        <div
          ref={mapContainerRef}
          className="w-full overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-text)]"
          style={{ height: 320, minHeight: 320 }}
        />
        {mapError && (
          <div className="absolute inset-0 flex items-center justify-center rounded-[var(--radius-xl)] bg-[var(--color-text)]/90 p-4 text-center">
            <p className="text-sm font-bold text-white/75">{mapError}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ComplexLocationPicker;
