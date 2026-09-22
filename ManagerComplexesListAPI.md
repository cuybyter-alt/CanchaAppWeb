# Pantalla "Mis Complejos" — Guía de integración con el backend

Este documento explica cómo conectar la pantalla de complejos administrados al endpoint `GET /api/complexes/manager/list/`.

---

## ¿Qué devuelve este endpoint?

Devuelve **todos los complejos donde el usuario autenticado aparece como propietario (owner) o como gestor (manager) activo**. La respuesta es paginada y soporta filtros. No hay un endpoint separado para "mis complejos como owner" y "mis complejos como manager" — este endpoint los unifica.

> El backend usa el `user_id` extraído del JWT para hacer la consulta. No se envía ningún ID en el cuerpo ni en la URL.

---

## Autenticación

El endpoint requiere JWT. El token de acceso debe enviarse en el encabezado `Authorization`:

```
Authorization: Bearer <access_token>
```

Si no se envía el token, la respuesta es `401 Unauthorized`.

---

## Ruta

```
GET /api/complexes/manager/list/
```

---

## Parámetros de consulta (query params)

Todos son opcionales. Se pasan como parámetros en la URL.

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `search` | `string` | Filtra por nombre o dirección del complejo (búsqueda parcial, case-insensitive) |
| `city` | `string` | Filtra por ciudad (match exacto, case-insensitive). Ej: `Bogota` |
| `status` | `string` | Filtra por estado del complejo. Valores: `active` \| `inactive` |
| `field_type` | `string` | Solo devuelve complejos que tengan al menos una cancha de este tipo. Valores: `futbol_5` \| `futbol_7` \| `futbol_11` \| `futsal` \| `microfutbol` |
| `has_fields` | `boolean` | `true` para solo devolver complejos con al menos 1 cancha registrada |
| `page` | `integer` | Número de página. Default: `1` |
| `page_size` | `integer` | Resultados por página. Default: `20`, máximo: `100` |

**Ejemplos de URL con filtros:**

```
/api/complexes/manager/list/?city=Bogota&status=active
/api/complexes/manager/list/?search=cancha&page=2&page_size=10
/api/complexes/manager/list/?field_type=futbol_5&has_fields=true
```

---

## Estructura de la respuesta exitosa (`200`)

```json
{
  "status": "success",
  "message": "Complejos gestionados obtenidos exitosamente.",
  "data": {
    "items": [ ... ],
    "total": 12,
    "page": 1,
    "page_size": 20,
    "total_pages": 1
  },
  "meta": {
    "total": 12,
    "page": 1,
    "page_size": 20,
    "total_pages": 1
  }
}
```

### Campos de paginación

| Campo | Descripción |
|-------|-------------|
| `total` | Total de complejos que coinciden con los filtros aplicados |
| `page` | Página actual |
| `page_size` | Cantidad de ítems en esta página |
| `total_pages` | Total de páginas disponibles |

### Estructura de cada ítem en `items`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `complex_id` | `UUID` | Identificador único del complejo |
| `owner_id` | `UUID` | ID del propietario del complejo |
| `name` | `string` | Nombre del complejo |
| `address` | `string \| null` | Dirección |
| `city` | `string \| null` | Ciudad |
| `latitude` | `float \| null` | Latitud geográfica |
| `longitude` | `float \| null` | Longitud geográfica |
| `distance_km` | `float \| null` | Distancia en km desde un punto de referencia (solo si se usaron filtros `lat`/`lng`) |
| `status` | `string` | Estado: `active` o `inactive` |
| `fields_count` | `integer` | Cantidad de canchas registradas en el complejo |
| `min_price` | `float \| null` | Precio mínimo (COP) entre todas las franjas horarias |
| `max_price` | `float \| null` | Precio máximo (COP) entre todas las franjas horarias |
| `average_rating` | `float \| null` | Calificación promedio (escala 1–5, 1 decimal) |
| `total_reviews` | `integer` | Cantidad total de reseñas |
| `last_image` | `object \| null` | Última imagen confirmada (ver tabla siguiente) |
| `images_count` | `integer` | Total de imágenes confirmadas |
| `created_at` | `datetime` | Fecha de creación (ISO 8601) |
| `updated_at` | `datetime` | Última actualización (ISO 8601) |

### Estructura de `last_image`

| Campo | Descripción |
|-------|-------------|
| `r2_key` | Path interno del archivo en el almacenamiento de imágenes |
| `image_url` | URL pública de la imagen lista para usar en `<img src>` |

Si el complejo no tiene imágenes, `last_image` viene como `null`.

---

## Respuestas de error

| Código | Cuándo ocurre |
|--------|---------------|
| `400` | Parámetro de consulta inválido (ej: `page_size=200` supera el máximo) |
| `401` | No se envió el JWT o el token está vencido |

---

## Comportamiento importante a tener en cuenta

### El endpoint incluye complejos propios Y gestionados
El usuario puede ser **owner** de algunos complejos y **manager** de otros. Ambos tipos se devuelven en la misma lista sin distinción de campo. Si el frontend necesita diferenciarlos visualmente, puede comparar `owner_id` con el `user_id` del usuario autenticado (disponible en el JWT decodificado).

```
Si item.owner_id == user_id  →  el usuario es propietario de este complejo
Si item.owner_id != user_id  →  el usuario es manager (fue invitado)
```

### No hay duplicados
Si el usuario es owner de un complejo y también está registrado como manager del mismo (caso poco común), el backend lo devuelve **una sola vez**.

### Lista vacía es válida
Si el usuario no es owner ni manager de ningún complejo, el backend responde `200` con `items: []` y `total: 0`. No es un error.

### Los filtros se aplican sobre el conjunto ya restringido
Al aplicar `city=Bogota`, el backend primero restringe a los complejos donde el usuario tiene acceso y luego aplica el filtro de ciudad. No se devuelven complejos de Bogotá de otros owners.

---

## Flujo de pantalla recomendado

```
Usuario abre "Mis Complejos"
        │
        ▼
GET /api/complexes/manager/list/
  (sin filtros, page=1)
        │
        ├─► items vacíos → mostrar estado vacío: "Aún no gestionas ningún complejo"
        │
        └─► items con datos → renderizar lista de complejos
                │
                ├─► usuario aplica filtro (search, ciudad, etc.)
                │     └─► nueva llamada con query params actualizados, page=1
                │
                └─► usuario llega al final de la lista
                      └─► si page < total_pages → cargar siguiente página
                            GET ...?page=2
```

---

## Paginación

La paginación es por offset de páginas. Para implementar scroll infinito o botones de navegación:

- La primera carga usa `page=1` (o sin el parámetro, el default es `1`).
- Para saber si hay más páginas: `page < total_pages`.
- Al cambiar cualquier filtro, resetear a `page=1`.
- `page_size` puede ajustarse según el diseño (máximo `100`). Para listas con cards grandes se recomienda `10`–`20`.

---

## Uso del campo `last_image`

El campo `last_image.image_url` contiene una URL pública lista para usar directamente. No requiere ningún procesamiento adicional ni autenticación para acceder a la imagen.

Si `last_image` es `null`, mostrar un placeholder o imagen por defecto en la UI.
