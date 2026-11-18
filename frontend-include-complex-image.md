# Incluir la imagen del complejo — Guía para Frontend

Cuatro endpoints de listado aceptan el parámetro opcional
`include_complex_image`. Cuando se envía en `true`, cada ítem incluye
`complex_image` con la **última imagen confirmada** del complejo.

Es **opt-in** para no agregar consultas ni payload a quien no lo necesita.

---

## Endpoints que lo soportan

| Método | Endpoint | Ítem que gana `complex_image` |
|---|---|---|
| `GET` | `/api/bookings/my/` | Cada reserva del jugador |
| `GET` | `/api/bookings/complex/{complex_id}/` | Cada reserva del complejo (admin/manager) |
| `GET` | `/api/complexes/manager/list/` | Cada complejo administrado |
| `GET` | `/api/complexes/` | Cada complejo público |

Se combina con los filtros y paginación existentes.

---

## Uso

```http
GET /api/bookings/my/?include_complex_image=true
Authorization: Bearer <token>
```

```http
GET /api/bookings/complex/{complex_id}/?include_complex_image=true&page=1&page_size=20
Authorization: Bearer <token>
```

```http
GET /api/complexes/manager/list/?include_complex_image=true
Authorization: Bearer <token>
```

```http
GET /api/complexes/?include_complex_image=true&city=Popayan
```

Valores aceptados: `true`, `false`, `1`, `0`. Por defecto: `false`.

---

## Forma de la respuesta

Con `include_complex_image=true`:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "booking_id": "uuid",
        "complex_id": "uuid",
        "complex_name": "Complejo Norte",
        "field_name": "Cancha 1",
        "start_datetime": "2026-11-18T13:00:00+00:00",
        "end_datetime": "2026-11-18T14:00:00+00:00",
        "status": "pending",
        "complex_image": {
          "r2_key": "complexes/42/uuid.jpg",
          "image_url": "https://cdn.example.com/complexes/42/uuid.jpg"
        }
      }
    ],
    "total": 1,
    "page": 1,
    "page_size": 10,
    "total_pages": 1
  }
}
```

Reglas:

- `complex_image` es `null` si el complejo no tiene imágenes confirmadas.
- Si **no** envías el parámetro, la clave `complex_image` **no aparece** en el
  ítem (el resto del payload no cambia).
- `complex_id` se agrega siempre en las reservas (útil para enlazar al complejo).
- La imagen es la **última confirmada** (`status="confirmed"`, orden
  `created_at` descendente). Nunca se devuelven imágenes `pending` o `deleted`.

---

## Tipos TypeScript

```ts
interface ComplexImage {
  r2_key: string;
  image_url: string;
}

interface BookingItem {
  booking_id: string;
  complex_id: string;
  complex_name: string;
  field_name: string;
  start_datetime: string; // ISO 8601
  end_datetime: string;   // ISO 8601
  status: "pending" | "part_paid" | "confirmed" | "canceled" | "rejected";
  complex_image?: ComplexImage | null;
}

interface ComplexItem {
  complex_id: string;
  name: string;
  // ...campos existentes...
  complex_image?: ComplexImage | null;
  // En /api/complexes/ (público) sigue existiendo:
  last_image?: ComplexImage | null;
  images_count?: number;
}
```

---

## Ejemplo en el frontend

```ts
async function getMyBookingsWithImages() {
  const { data } = await api.get("/api/bookings/my/", {
    params: { include_complex_image: true, page_size: 20 },
  });
  return data.data.items as BookingItem[];
}
```

```tsx
function BookingCard({ booking }: { booking: BookingItem }) {
  return (
    <article>
      <img
        src={booking.complex_image?.image_url ?? "/placeholder-complex.png"}
        alt={booking.complex_name}
      />
      <h3>{booking.complex_name}</h3>
      <p>{booking.field_name}</p>
    </article>
  );
}
```

---

## Notas

- **Complejos públicos:** `GET /api/complexes/` ya devuelve `last_image` e
  `images_count` siempre. `include_complex_image=true` agrega además
  `complex_image` para que el contrato sea igual en los cuatro endpoints.
- **Rendimiento:** las imágenes se cargan en una sola consulta por página
  (no hay N+1). Solo se ejecuta si el parámetro es `true`.
- **Sin migraciones** ni cambios de paginación.
- El parámetro aparece documentado en Swagger/OpenAPI para cada endpoint.
