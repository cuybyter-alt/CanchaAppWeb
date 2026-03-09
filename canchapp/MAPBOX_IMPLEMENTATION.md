# 🗺️ Guía de Implementación de Mapbox

## 📋 Resumen

Hemos integrado **Mapbox GL JS** usando la **Styles API** para mostrar un mapa interactivo con las canchas deportivas cercanas.

## 🎯 Características Implementadas

✅ Mapa interactivo con Mapbox GL JS  
✅ Estilos de Mapbox (Dark theme por defecto)  
✅ Marcadores personalizados con iconos de deportes  
✅ Popups informativos al hacer clic en marcadores  
✅ Geolocalización del usuario  
✅ Cálculo de distancias  
✅ Controles de navegación y zoom  
✅ Datos mock con 5 canchas de ejemplo  
✅ Responsive y adaptable

---

## 🚀 Pasos para Configurar

### 1. Instalar Dependencias

```bash
cd canchapp
npm install mapbox-gl
```

### 2. Obtener Token de Mapbox

1. Ve a [https://account.mapbox.com/](https://account.mapbox.com/)
2. Inicia sesión o crea una cuenta
3. Ve a **Access Tokens**
4. Copia tu **Default public token** O crea uno nuevo con estos scopes:
   - `styles:read` (requerido)
   - `fonts:read` (opcional)
   - `sprites:read` (opcional)

### 3. Configurar Variables de Entorno

Abre el archivo `.env.local` en la raíz de `canchapp/` y pega tu token:

```env
VITE_MAPBOX_ACCESS_TOKEN=pk.eyJ1IjoieW91cnVzZXJuYW1lIiwiYSI6InlvdXJ0b2tlbiJ9.xxxxxxxxxxxx
```

⚠️ **Importante:** Este archivo ya está en `.gitignore`, así que tu token no se subirá a Git.

### 4. Reiniciar el Servidor de Desarrollo

```bash
npm run dev
```

---

## 📁 Archivos Creados

### 1. **src/types/map.ts**
Define los tipos TypeScript para:
- `SportsField`: Datos de una cancha deportiva
- `UserLocation`: Ubicación del usuario
- `MapConfig`: Configuración del mapa

### 2. **src/services/mapboxService.ts**
Servicio principal que incluye:
- `initializeMapbox()`: Inicializa el token
- `createMap()`: Crea la instancia del mapa
- `addMarkers()`: Agrega marcadores personalizados
- `fitMapToMarkers()`: Ajusta el viewport
- `getUserLocation()`: Obtiene la ubicación del usuario
- `calculateDistance()`: Calcula distancias con Haversine
- `MAPBOX_STYLES`: Constantes con los estilos disponibles

### 3. **src/components/sections/MapCard.tsx**
Componente React actualizado que:
- Muestra el mapa de Mapbox real
- Maneja estados de carga y errores
- Usa datos mock por defecto
- Es completamente personalizable

---

## 🎨 Estilos Disponibles

El servicio incluye todos los estilos oficiales de Mapbox:

```typescript
// Estilos Standard (Requieren GL JS v3+)
MAPBOX_STYLES.standard              // mapbox://styles/mapbox/standard
MAPBOX_STYLES.standardSatellite     // mapbox://styles/mapbox/standard-satellite

// Estilos Clásicos (Legacy)
MAPBOX_STYLES.streets               // mapbox://styles/mapbox/streets-v12
MAPBOX_STYLES.outdoors              // mapbox://styles/mapbox/outdoors-v12
MAPBOX_STYLES.light                 // mapbox://styles/mapbox/light-v11
MAPBOX_STYLES.dark                  // mapbox://styles/mapbox/dark-v11 ⭐ (En uso)
MAPBOX_STYLES.satellite             // mapbox://styles/mapbox/satellite-v9
MAPBOX_STYLES.satelliteStreets      // mapbox://styles/mapbox/satellite-streets-v12
MAPBOX_STYLES.navigationDay         // mapbox://styles/mapbox/navigation-day-v1
MAPBOX_STYLES.navigationNight       // mapbox://styles/mapbox/navigation-night-v1
```

Para cambiar el estilo, modifica la prop `style` en `MapCard`:

```tsx
<MapCard 
  style={MAPBOX_STYLES.streets}  // Cambia a streets
  onOpenMap={() => console.log('Opening map...')}
/>
```

---

## 🧪 Datos Mock Incluidos

El componente incluye **5 canchas de ejemplo** en Nueva York:

| Nombre | Deporte | Precio | Rating | Disponible |
|--------|---------|--------|--------|------------|
| El Estadio | Fútbol | $50/h | 4.8⭐ | ✅ |
| La Cancha | Fútbol | $45/h | 4.6⭐ | ✅ |
| Padel Pro | Tennis | $60/h | 4.9⭐ | ❌ |
| Hoop Zone | Basketball | $40/h | 4.5⭐ | ✅ |
| Cancha Norte | Fútbol | $55/h | 4.7⭐ | ✅ |

Estos datos son **solo para pruebas**. Más adelante se reemplazarán con datos reales de tu backend.

---

## 🔧 Uso Avanzado

### Pasar Datos Personalizados

```tsx
import type { SportsField } from '../types/map';

const myFields: SportsField[] = [
  {
    id: 'cancha-1',
    name: 'Mi Cancha',
    sport: 'futbol',
    latitude: -34.6037,
    longitude: -58.3816,
    address: 'Buenos Aires, Argentina',
    price: 80,
    rating: 5.0,
    available: true,
  },
];

<MapCard 
  fields={myFields}
  onOpenMap={() => navigate('/mapa-completo')}
  style={MAPBOX_STYLES.streets}
/>
```

### Modo Mapa Completo

```tsx
<MapCard 
  showMiniMap={false}  // Mapa grande (400px altura)
  fields={myFields}
  style={MAPBOX_STYLES.satellite}
/>
```

---

## 🎯 Características del Mapa

### Marcadores Personalizados
- 🎨 Forma de pin con punta (teardrop)
- 🟢 Verde si disponible, 🔴 rojo si ocupado
- ⚽ Iconos de Font Awesome según deporte
- 🎭 Hover effect con escala 1.2x

### Popups Informativos
- 📍 Nombre y dirección
- 💰 Precio por hora
- ⭐ Rating de 1-5
- 📏 Distancia (si está disponible)
- ✅ Estado de disponibilidad

### Controles
- 🧭 Navegación (zoom +/-)
- 📍 Geolocalización del usuario
- 🖱️ Pan, zoom, rotate con mouse/touch

---

## 📊 Flujo de Datos

```
Usuario abre Home
    ↓
MapCard se monta
    ↓
initializeMapbox() ← Lee VITE_MAPBOX_ACCESS_TOKEN
    ↓
createMap() ← Crea instancia de mapboxgl.Map
    ↓
getUserLocation() ← Solicita permiso de ubicación
    ↓
calculateDistance() ← Calcula distancia a cada cancha
    ↓
addMarkers() ← Agrega pins personalizados
    ↓
fitMapToMarkers() ← Ajusta viewport
    ↓
Mapa listo ✅
```

---

## 🐛 Troubleshooting

### Error: "No se pudo crear el mapa"
**Causa:** Token de Mapbox faltante o inválido  
**Solución:** 
1. Verifica que `.env.local` existe
2. Verifica que la variable se llama `VITE_MAPBOX_ACCESS_TOKEN`
3. Reinicia el servidor (`npm run dev`)

### Mapa negro o no carga
**Causa:** Problema con el estilo o la red  
**Solución:**
1. Abre la consola del navegador (F12)
2. Busca errores de red o CORS
3. Verifica que tu token tenga el scope `styles:read`

### Marcadores no aparecen
**Causa:** Coordenadas inválidas o fuera del viewport  
**Solución:**
1. Verifica que `latitude` y `longitude` sean números válidos
2. Usa `fitMapToMarkers()` para ajustar la vista

### "mapboxgl is not defined"
**Causa:** Librería no instalada  
**Solución:**
```bash
npm install mapbox-gl
npm install --save-dev @types/mapbox-gl  # Si usas TypeScript
```

---

## 🔐 Seguridad del Token

### ✅ Buenas Prácticas

- Usa un **token público** (empieza con `pk.`)
- Configura **URL restrictions** en Mapbox:
  - `http://localhost:5173/*`
  - `https://tu-dominio.com/*`
- Nunca subas `.env.local` a Git (ya está en `.gitignore`)
- Rota el token si lo expones accidentalmente

### 🚨 NO Hagas Esto

- ❌ No uses tokens secretos (empiezan con `sk.`)
- ❌ No hardcodees el token en el código
- ❌ No compartas el token en Discord/Slack sin revisar

---

## 📈 Próximos Pasos

### Backend Integration
1. Crear API endpoint: `GET /api/fields/nearby?lat={lat}&lng={lng}&radius={km}`
2. Conectar MapCard con datos reales
3. Implementar búsqueda y filtros

### Funcionalidades Extra
- [ ] Clustering de marcadores cuando hay muchos
- [ ] Direcciones con Mapbox Directions API
- [ ] Geocoding para buscar por dirección
- [ ] Modo vista 3D con pitch 60°
- [ ] Custom styles creados en Mapbox Studio

---

## 💰 Costos de Mapbox

### Tier Gratuito
- **50,000 map loads/month** gratis
- **50,000 geocodes/month** gratis
- Más que suficiente para desarrollo y MVP

### Pricing
- **$6 USD** por cada 1,000 map loads adicionales
- Mucho más económico que Google Maps
- Sin cargos sorpresa

👉 [Ver pricing completo](https://www.mapbox.com/pricing)

---

## 📚 Recursos

- [Mapbox GL JS Docs](https://docs.mapbox.com/mapbox-gl-js/guides/)
- [Styles API Reference](https://docs.mapbox.com/api/maps/styles/)
- [Ejemplos de Mapbox](https://docs.mapbox.com/mapbox-gl-js/example/)
- [Mapbox Studio](https://studio.mapbox.com/)

---

## 🎉 ¡Listo!

Tu mapa está configurado y listo para usar. Abre [http://localhost:5173](http://localhost:5173), navega a Home, y deberías ver el mapa funcionando con las 5 canchas de ejemplo.

**Si tienes algún problema, revisa la consola del navegador para ver los mensajes de error.**

---

**Desarrollado por GitHub Copilot** 🤖
