# 🗺️ Mapbox en Android (Kotlin) — Estilos y Marcadores

Equivalente Android del `mapboxService.ts` implementado en la web.

---

## 📦 1. Dependencias

En `build.gradle.kts` (app):

```kotlin
dependencies {
    implementation("com.mapbox.maps:android:11.9.0")
}
```

En `settings.gradle.kts`:

```kotlin
dependencyResolutionManagement {
    repositories {
        google()
        mavenCentral()
        maven { url = uri("https://api.mapbox.com/downloads/v2/releases/maven") }
    }
}
```

---

## 🔑 2. Token de Acceso

En `res/values/strings.xml`:

```xml
<string name="mapbox_access_token">pk.TU_TOKEN_AQUI</string>
```

En `AndroidManifest.xml`:

```xml
<application>
    <meta-data
        android:name="com.mapbox.token"
        android:value="@string/mapbox_access_token" />
</application>
```

> El mismo token `pk.xxx` que usas en `.env.local` de la web sirve aquí.
> Recuerda agregar el **Application ID** de tu app en las restricciones del token en Mapbox.

---

## 🗺️ 3. Layout XML

```xml
<!-- res/layout/fragment_map.xml -->
<com.mapbox.maps.MapView
    android:id="@+id/mapView"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    app:mapbox_cameraZoom="13.0"
    app:mapbox_cameraPitch="45.0" />
```

---

## 🎨 4. Estilos del Mapa

Equivalentes exactos de `MAPBOX_STYLES` del archivo TypeScript:

```kotlin
object MapboxStyles {
    // Estilos Standard (SDK v11+)
    const val STANDARD          = "mapbox://styles/mapbox/standard"
    const val STANDARD_SATELLITE = "mapbox://styles/mapbox/standard-satellite"

    // Estilos Clásicos
    const val STREETS           = "mapbox://styles/mapbox/streets-v12"
    const val OUTDOORS          = "mapbox://styles/mapbox/outdoors-v12"
    const val LIGHT             = "mapbox://styles/mapbox/light-v11"
    const val DARK              = "mapbox://styles/mapbox/dark-v11"   // ⭐ El que usa la web
    const val SATELLITE         = "mapbox://styles/mapbox/satellite-v9"
    const val SATELLITE_STREETS = "mapbox://styles/mapbox/satellite-streets-v12"
    const val NAVIGATION_DAY    = "mapbox://styles/mapbox/navigation-day-v1"
    const val NAVIGATION_NIGHT  = "mapbox://styles/mapbox/navigation-night-v1"
}
```

### Cargar el estilo en el mapa

```kotlin
class MapFragment : Fragment() {

    private lateinit var mapView: MapView

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        mapView = view.findViewById(R.id.mapView)

        mapView.getMapboxMap().loadStyleUri(MapboxStyles.DARK) { style ->
            // Mapa listo — aquí agregas marcadores
            setupMarkers(style)
        }
    }
}
```

---

## 📍 5. Marcadores Personalizados (Burbujas de Canchas)

En la web se usan elementos HTML con CSS. En Android se usan **`ViewAnnotation`** — vistas nativas que flotan sobre el mapa ancladas a coordenadas, lo más equivalente al sistema de tooltips/popups de la web.

### 5.1 Layout del marcador

```xml
<!-- res/layout/marker_cancha.xml -->
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="wrap_content"
    android:layout_height="wrap_content"
    android:orientation="vertical"
    android:gravity="center_horizontal">

    <!-- Burbuja principal -->
    <LinearLayout
        android:id="@+id/bubble"
        android:layout_width="wrap_content"
        android:layout_height="40dp"
        android:background="@drawable/bg_marker_available"
        android:paddingStart="10dp"
        android:paddingEnd="10dp"
        android:gravity="center_vertical"
        android:orientation="horizontal"
        android:elevation="6dp">

        <ImageView
            android:id="@+id/markerIcon"
            android:layout_width="18dp"
            android:layout_height="18dp"
            android:src="@drawable/ic_soccer_ball"
            android:tint="@color/white" />

        <TextView
            android:id="@+id/markerName"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_marginStart="6dp"
            android:textColor="@color/white"
            android:textSize="12sp"
            android:textStyle="bold"
            android:maxLines="1"
            android:ellipsize="end"
            android:maxWidth="120dp" />
    </LinearLayout>

    <!-- Pico triangular inferior -->
    <View
        android:layout_width="12dp"
        android:layout_height="8dp"
        android:background="@drawable/bg_marker_tip" />

</LinearLayout>
```

### 5.2 Drawables para el marcador

`res/drawable/bg_marker_available.xml` — burbuja verde (disponible):
```xml
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <solid android:color="#62bf3b" />
    <corners android:radius="20dp" />
</shape>
```

`res/drawable/bg_marker_unavailable.xml` — burbuja roja (ocupada):
```xml
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <solid android:color="#ff4757" />
    <corners android:radius="20dp" />
</shape>
```

`res/drawable/bg_marker_tip.xml` — pico inferior:
```xml
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item>
        <rotate
            android:fromDegrees="45"
            android:pivotX="50%"
            android:pivotY="50%">
            <shape android:shape="rectangle">
                <solid android:color="#62bf3b" />
            </shape>
        </rotate>
    </item>
</layer-list>
```

### 5.3 Data class de la cancha

```kotlin
data class SportsField(
    val id: String,
    val name: String,
    val sport: String,
    val latitude: Double,
    val longitude: Double,
    val address: String,
    val price: Int,
    val rating: Double,
    val available: Boolean,
    val distance: Double? = null,
)
```

### 5.4 Agregar los marcadores al mapa

```kotlin
import com.mapbox.maps.ViewAnnotationAnchor
import com.mapbox.maps.extension.style.utils.ColorUtils
import com.mapbox.maps.plugin.annotation.annotations
import com.mapbox.maps.viewannotation.ViewAnnotationManager
import com.mapbox.maps.viewannotation.geometry
import com.mapbox.maps.viewannotation.viewAnnotationOptions
import com.mapbox.geojson.Point

class MapFragment : Fragment() {

    private lateinit var mapView: MapView
    private lateinit var viewAnnotationManager: ViewAnnotationManager

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        mapView = view.findViewById(R.id.mapView)
        viewAnnotationManager = mapView.viewAnnotationManager

        mapView.getMapboxMap().loadStyleUri(MapboxStyles.DARK) {
            addFieldMarkers(mockFields)
        }
    }

    private fun addFieldMarkers(fields: List<SportsField>) {
        fields.forEach { field ->
            val markerView = LayoutInflater.from(requireContext())
                .inflate(R.layout.marker_cancha, mapView, false)

            // Nombre de la cancha
            markerView.findViewById<TextView>(R.id.markerName).text = field.name

            // Color según disponibilidad
            val bubble = markerView.findViewById<LinearLayout>(R.id.bubble)
            val bgRes = if (field.available) R.drawable.bg_marker_available
                        else R.drawable.bg_marker_unavailable
            bubble.setBackgroundResource(bgRes)

            // Agregar al mapa anclado a las coordenadas
            viewAnnotationManager.addViewAnnotation(
                resId = R.layout.marker_cancha,
                options = viewAnnotationOptions {
                    geometry(Point.fromLngLat(field.longitude, field.latitude))
                    anchor(ViewAnnotationAnchor.BOTTOM)
                    allowOverlap(true)
                },
            )

            // Click para abrir detalle
            markerView.setOnClickListener {
                showFieldDetail(field)
            }
        }
    }

    private fun showFieldDetail(field: SportsField) {
        // Navegar a detalle o mostrar BottomSheet
    }
}
```

---

## 💬 6. Popup / Info Card al hacer clic

Equivalente al popup HTML de la web. Se recomienda un **BottomSheetDialog**:

```kotlin
class FieldInfoBottomSheet(private val field: SportsField) : BottomSheetDialogFragment() {

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        return inflater.inflate(R.layout.bottom_sheet_field, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        view.findViewById<TextView>(R.id.tvName).text = field.name
        view.findViewById<TextView>(R.id.tvAddress).text = field.address
        view.findViewById<TextView>(R.id.tvPrice).text = "$${field.price}/hora"
        view.findViewById<TextView>(R.id.tvRating).text = "${field.rating}/5"

        val badge = view.findViewById<TextView>(R.id.tvAvailability)
        if (field.available) {
            badge.text = "✓ Disponible"
            badge.setBackgroundColor(Color.parseColor("#62bf3b"))
        } else {
            badge.text = "✕ Ocupada"
            badge.setBackgroundColor(Color.parseColor("#ff4757"))
        }

        field.distance?.let {
            view.findViewById<TextView>(R.id.tvDistance).text = "%.1f km".format(it)
        }
    }
}

// Uso desde MapFragment:
private fun showFieldDetail(field: SportsField) {
    FieldInfoBottomSheet(field).show(childFragmentManager, "field_detail")
}
```

---

## 📍 7. Geolocalización del usuario

Equivalente de `getUserLocation()` de la web:

```kotlin
// Permiso en AndroidManifest.xml:
// <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />

private fun requestUserLocation() {
    val locationPlugin = mapView.location
    locationPlugin.updateSettings {
        enabled = true
        pulsingEnabled = true
    }

    // Obtener coordenadas una vez
    mapView.getMapboxMap().setCamera(
        CameraOptions.Builder()
            .zoom(14.0)
            .build()
    )
}
```

---

## 📐 8. Ajustar vista a todos los marcadores

Equivalente de `fitMapToMarkers()` / `fitMapToComplexMarkers()`:

```kotlin
import com.mapbox.maps.CameraOptions
import com.mapbox.maps.CoordinateBounds

private fun fitCameraToFields(fields: List<SportsField>) {
    if (fields.isEmpty()) return

    val points = fields.map { Point.fromLngLat(it.longitude, it.latitude) }
    val bounds = CoordinateBounds.hull(points)

    val camera = mapView.getMapboxMap().cameraForCoordinateBounds(
        bounds,
        EdgeInsets(50.0, 50.0, 50.0, 50.0), // padding
        null,
        null
    )
    mapView.getMapboxMap().setCamera(camera)
}
```

---

## 🔄 9. Comparativa Web ↔ Android

| Concepto | Web (TypeScript) | Android (Kotlin) |
|---|---|---|
| Inicializar mapa | `mapboxgl.accessToken = token` | `meta-data` en `AndroidManifest.xml` |
| Cargar estilo | `new mapboxgl.Map({ style: ... })` | `loadStyleUri(MapboxStyles.DARK)` |
| Marcador HTML | `createMarkerElement()` + `mapboxgl.Marker` | `ViewAnnotation` con layout XML |
| Popup info | `mapboxgl.Popup().setHTML(...)` | `BottomSheetDialogFragment` |
| Geolocalización | `navigator.geolocation.getCurrentPosition()` | `mapView.location.updateSettings { enabled = true }` |
| Ajustar viewport | `map.fitBounds(bounds, padding)` | `cameraForCoordinateBounds(bounds, EdgeInsets(...))` |
| Hover / tooltip | `mouseover` + `position:fixed` | No aplica en móvil — usar `longClick` o tap |

---

## 📚 Recursos

- [Mapbox Maps SDK for Android](https://docs.mapbox.com/android/maps/guides/)
- [View Annotations](https://docs.mapbox.com/android/maps/guides/annotations/view-annotations/)
- [Style Constants](https://docs.mapbox.com/android/maps/api/11.0.0/mapbox-maps-android/com.mapbox.maps/-style/index.html)
- [Camera & Viewport](https://docs.mapbox.com/android/maps/guides/camera-and-animation/)
