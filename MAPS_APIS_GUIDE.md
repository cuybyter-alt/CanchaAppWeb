# APIs Reales para Mapas de Canchas - Guía de Implementación

## 🗺️ Opciones de APIs Disponibles

### 1. **Google Maps Platform** (⭐ RECOMENDADO)

**APIs necesarias:**
- **Maps JavaScript API**: Para renderizar el mapa
- **Places API**: Para buscar canchas deportivas cercanas
- **Geocoding API**: Para convertir direcciones en coordenadas
- **Distance Matrix API**: Para calcular distancias

**Ventajas:**
- ✅ Base de datos completa de negocios locales
- ✅ Búsqueda por tipo (campos deportivos, canchas, etc.)
- ✅ Filtros avanzados (distancia, rating, abierto ahora)
- ✅ Documentación excelente
- ✅ Familiar para usuarios

**Costos:**
- $7 USD por 1,000 solicitudes de mapa
- $32 USD por 1,000 búsquedas de Places
- 200 USD de crédito gratis mensual (suficiente para desarrollo)

**Ejemplo de implementación:**

```bash
npm install @googlemaps/js-api-loader
```

```typescript
// services/googleMaps.ts
import { Loader } from '@googlemaps/js-api-loader';

const loader = new Loader({
  apiKey: process.env.VITE_GOOGLE_MAPS_API_KEY!,
  version: 'weekly',
  libraries: ['places', 'geometry'],
});

export async function findNearbySportFields(lat: number, lng: number, radius: number = 5000) {
  const { google } = await loader.load();
  
  const service = new google.maps.places.PlacesService(
    document.createElement('div')
  );

  return new Promise((resolve, reject) => {
    const request = {
      location: new google.maps.LatLng(lat, lng),
      radius,
      type: 'stadium', // o 'park', 'gym'
      keyword: 'cancha futbol', // búsqueda personalizada
    };

    service.nearbySearch(request, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK) {
        resolve(results);
      } else {
        reject(status);
      }
    });
  });
}

// Uso en componente
const [fields, setFields] = useState([]);

useEffect(() => {
  navigator.geolocation.getCurrentPosition(async (position) => {
    const results = await findNearbySportFields(
      position.coords.latitude,
      position.coords.longitude
    );
    setFields(results);
  });
}, []);
```

---

### 2. **Mapbox** (⭐ Alternativa Moderna)

**APIs necesarias:**
- **Mapbox GL JS**: Renderizado de mapas
- **Geocoding API**: Búsqueda de lugares
- **Directions API**: Rutas y navegación

**Ventajas:**
- ✅ Más personalizable visualmente
- ✅ Mejor rendimiento en mobile
- ✅ Estilo retro/gaming compatible
- ✅ 50,000 solicitudes gratis/mes

**Costos:**
- Gratis hasta 50,000 cargas de mapa/mes
- $5 USD por 1,000 solicitudes adicionales

**Ejemplo:**

```bash
npm install mapbox-gl
```

```typescript
// components/MapboxMap.tsx
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useEffect, useRef } from 'react';

mapboxgl.accessToken = process.env.VITE_MAPBOX_TOKEN!;

export function MapboxMap({ fields }) {
  const mapContainer = useRef(null);
  const map = useRef(null);

  useEffect(() => {
    if (map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11', // tema oscuro
      center: [-77.0428, -12.0464], // Lima, Perú
      zoom: 12,
    });

    // Agregar marcadores de canchas
    fields.forEach((field) => {
      new mapboxgl.Marker({ color: '#62bf3b' })
        .setLngLat([field.lng, field.lat])
        .setPopup(
          new mapboxgl.Popup().setHTML(`
            <h3>${field.name}</h3>
            <p>${field.address}</p>
          `)
        )
        .addTo(map.current);
    });
  }, [fields]);

  return <div ref={mapContainer} className="h-96 rounded-lg" />;
}
```

---

### 3. **OpenStreetMap + Leaflet** (💰 GRATIS)

**Componentes:**
- **Leaflet.js**: Librería de renderizado
- **Nominatim**: Geocoding gratis
- **Overpass API**: Consultar datos OSM

**Ventajas:**
- ✅ Completamente gratis
- ✅ Open source
- ✅ Sin límites de uso
- ❌ Requiere tu propia base de datos de canchas

**Ejemplo:**

```bash
npm install leaflet react-leaflet
```

```typescript
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export function LeafletMap({ fields }) {
  return (
    <MapContainer 
      center={[-12.0464, -77.0428]} 
      zoom={13} 
      className="h-96 rounded-lg"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
      />
      {fields.map((field) => (
        <Marker key={field.id} position={[field.lat, field.lng]}>
          <Popup>{field.name}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
```

---

## 🎯 Recomendación Final

### Para tu aplicación Canchapp:

**OPCIÓN 1: Google Maps (Mejor para MVP)**
- Ya tiene datos de canchas reales
- Búsqueda automática funciona out-of-the-box
- Los usuarios confían en Google Maps
- 200 USD/mes gratis es suficiente para empezar

**OPCIÓN 2: Mapbox + Backend Propio (Mejor para escala)**
- Más control sobre el diseño
- Integra mejor con tu tema retro/gaming
- Necesitas construir tu propia base de datos de canchas
- Mejor cuando tengas usuarios verificando/agregando canchas

**Implementación Híbrida (IDEAL):**
1. Usa Google Places API para descubrir canchas inicialmente
2. Guarda las canchas en tu BD con info adicional (precios, horarios, fotos)
3. Renderiza con Mapbox para mejor UX
4. Los dueños de canchas pueden "reclamar" sus lugares y agregar más info

---

## 📦 Estructura Sugerida

```typescript
// types/field.ts
export interface SportsField {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  sports: string[]; // ['futbol', 'basketball']
  pricePerHour: number;
  rating: number;
  photos: string[];
  amenities: string[]; // ['vestuarios', 'estacionamiento']
  verified: boolean;
}

// services/fieldsApi.ts
export async function getNearbyFields(lat: number, lng: number) {
  // Llama a tu backend que combina:
  // 1. Datos de tu BD
  // 2. Google Places como fallback
  const response = await fetch(
    `/api/fields/nearby?lat=${lat}&lng=${lng}&radius=5000`
  );
  return response.json();
}
```

¿Con cuál quieres empezar? Puedo ayudarte a configurar cualquiera de las tres opciones.
