# Imágenes de Complejos — Guía para Frontend

Todas las imágenes se almacenan en **Cloudflare R2**. El backend **no recibe el archivo**: genera una URL prefirmada, el frontend sube el archivo directamente a R2, y luego el backend confirma la subida.

---

## Resumen rápido

| Acción | Método | Endpoint | Auth |
|---|---|---|---|
| Listar imágenes | `GET` | `/api/complexes/{complex_id}/images/` | Público |
| Solicitar URL de subida | `POST` | `/api/complexes/{complex_id}/images/upload-url/` | JWT (owner/manager) |
| Subir archivo a R2 | `PUT` | `upload_url` (directo a R2, NO es el backend) | Ninguna |
| Confirmar subida / editar descripción | `PATCH` | `/api/complexes/{complex_id}/images/{image_id}/confirm/` | JWT (owner/manager) |
| Eliminar una imagen | `DELETE` | `/api/complexes/{complex_id}/images/{image_id}/` | JWT (owner/manager) |
| Eliminar todas las imágenes | `DELETE` | `/api/complexes/{complex_id}/images/` | JWT (owner/manager) |

### Reglas y límites

| Regla | Valor |
|---|---|
| Tamaño máximo | 5 MB (5 * 1024 * 1024 bytes) |
| Tipos permitidos | `image/jpeg`, `image/png`, `image/webp` |
| Máximo de imágenes confirmadas por complejo | 3 |
| Expiración de la URL prefirmada | 30 minutos |
| Limpieza de imágenes `pending` | Tras 24 h sin confirmar (cron) |
| Quién puede escribir | Owner del complejo o manager asignado |
| Quién puede listar | Cualquiera (no requiere token) |

---

## Envelope de respuestas

Todas las respuestas usan el mismo formato:

```json
{
  "success": true,
  "message": "Mensaje legible",
  "data": {},
  "meta": {}
}
```

Errores:

```json
{
  "success": false,
  "error_code": "FORBIDDEN",
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to upload images to this complex.",
    "details": {}
  }
}
```

---

## Flujo de subida (3 pasos)

```
1. POST /images/upload-url/   → backend devuelve upload_url + image_id
2. PUT  <upload_url>          → frontend sube el archivo a R2
3. PATCH /images/{image_id}/confirm/ → backend verifica en R2 y marca "confirmed"
```

> **Importante:** la imagen NO se muestra hasta el paso 3. Las imágenes `pending` se borran automáticamente a las 24 h.

### Ejemplo TypeScript

```typescript
async function uploadComplexImage(complexId: string, file: File) {
  // 1. Pedir URL prefirmada
  const { data } = await api.post(
    `/api/complexes/${complexId}/images/upload-url/`,
    {
      content_type: file.type,   // debe ser image/jpeg | image/png | image/webp
      file_size: file.size,      // bytes
    }
  );

  const { upload_url, image_id } = data.data;

  // 2. Subir el archivo directo a R2 (sin Authorization, con el mismo Content-Type)
  const uploadRes = await fetch(upload_url, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!uploadRes.ok) throw new Error("Falló la subida a R2");

  // 3. Confirmar
  const confirmed = await api.patch(
    `/api/complexes/${complexId}/images/${image_id}/confirm/`,
    { description: "Cancha principal" } // opcional
  );

  return confirmed.data.data; // imagen confirmada con image_url
}
```

> El `PUT` a R2 debe enviar **exactamente** el mismo `Content-Type` declarado en el paso 1. Si no coincide, R2 rechaza la firma.

---

## 1. Solicitar URL de subida

### `POST /api/complexes/{complex_id}/images/upload-url/`

**Auth:** Bearer Token — owner o manager del complejo.

**Body:**

```json
{
  "content_type": "image/jpeg",
  "file_size": 245760
}
```

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `content_type` | string | Sí | `image/jpeg`, `image/png` o `image/webp` |
| `file_size` | number | Sí | Tamaño en bytes (1 a 5 MB) |

**Response 201:**

```json
{
  "success": true,
  "message": "URL de presigned generada exitosamente.",
  "data": {
    "upload_url": "https://<R2_ENDPOINT>/complexes/<complex_id>/<uuid>.jpg?X-Amz-...",
    "image_id": "3f1b2c4d-....-....",
    "r2_key": "complexes/<complex_id>/<uuid>.jpg"
  },
  "meta": {}
}
```

Crea un registro en estado `pending`. Guarda el `image_id` para confirmar y el `r2_key` para referencia.

**Errores:**

| HTTP | `error_code` | Cuándo |
|---|---|---|
| 404 | `RESOURCE_NOT_FOUND` | El complejo no existe |
| 403 | `FORBIDDEN` | No es owner ni manager |
| 422 | `INVALID_IMAGE_TYPE` | `content_type` no permitido |
| 422 | `IMAGE_FILE_TOO_LARGE` | `file_size` > 5 MB |
| 422 | `IMAGE_LIMIT_EXCEEDED` | Ya hay 3 imágenes confirmadas |
| 401 | `UNAUTHORIZED` | Falta token o expiró |

---

## 2. Subir el archivo a R2

### `PUT {upload_url}`

- Destino: **R2 directamente**, no el backend.
- Body: el archivo binario (raw).
- Header obligatorio: `Content-Type` idéntico al declarado (`image/jpeg`, etc.).
- **No** enviar `Authorization` (la firma ya autoriza).
- Si el `PUT` devuelve 2xx, el objeto existe en R2.

---

## 3. Confirmar subida / editar descripción

### `PATCH /api/complexes/{complex_id}/images/{image_id}/confirm/`

**Auth:** Bearer Token — owner o manager del complejo.

**Body (opcional):**

```json
{
  "description": "Cancha sintética principal"
}
```

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `description` | string | No | Máximo 500 caracteres |

**Response 200:**

```json
{
  "success": true,
  "message": "Imagen confirmada exitosamente.",
  "data": {
    "img_id": "3f1b2c4d-....-....",
    "complex_id": "9a8b7c6d-....-....",
    "r2_key": "complexes/<complex_id>/<uuid>.jpg",
    "image_url": "https://<R2_PUBLIC_URL>/complexes/<complex_id>/<uuid>.jpg",
    "status": "confirmed",
    "file_size": 245760,
    "uploaded_at": "2026-10-20T13:00:00.000000+00:00",
    "description": "Cancha sintética principal",
    "created_at": "2026-10-20T12:58:00.000000+00:00",
    "updated_at": "2026-10-20T13:00:00.000000+00:00"
  },
  "meta": {}
}
```

### Cómo editar una imagen

No existe un endpoint de edición dedicado. La **edición soportada es la descripción**, y se hace llamando de nuevo a este mismo `PATCH` sobre una imagen ya confirmada:

```typescript
await api.patch(`/api/complexes/${complexId}/images/${imageId}/confirm/`, {
  description: "Nueva descripción",
});
```

- El backend verifica que el objeto siga existiendo en R2.
- Actualiza `description` y `uploaded_at`.
- Si envías `description` vacío o lo omites, la descripción anterior **no se borra**.

> Para cambiar la imagen en sí (archivo), el flujo es: subir una nueva y eliminar la anterior.

**Errores:**

| HTTP | `error_code` | Cuándo |
|---|---|---|
| 404 | `RESOURCE_NOT_FOUND` | `image_id` no existe (el registro) |
| 403 | `FORBIDDEN` | No es owner ni manager |
| 409 | `IMAGE_NOT_FOUND_IN_R2` | El archivo no llegó a R2 (el registro pending se elimina) |
| 401 | `UNAUTHORIZED` | Falta token o expiró |

---

## 4. Listar imágenes

### `GET /api/complexes/{complex_id}/images/`

**Auth:** pública (sin token).

**Query params:**

| Param | Tipo | Default | Descripción |
|---|---|---|---|
| `status` | string | (todos) | `pending` \| `confirmed` \| `deleted` |
| `page` | number | 1 | Página (>= 1) |
| `page_size` | number | 20 | Elementos por página (1–100) |

**Response 200:**

```json
{
  "success": true,
  "message": "Imágenes obtenidas exitosamente.",
  "data": {
    "items": [
      {
        "img_id": "3f1b2c4d-....-....",
        "complex_id": "9a8b7c6d-....-....",
        "r2_key": "complexes/<complex_id>/<uuid>.jpg",
        "image_url": "https://<R2_PUBLIC_URL>/complexes/<complex_id>/<uuid>.jpg",
        "status": "confirmed",
        "file_size": 245760,
        "uploaded_at": "2026-10-20T13:00:00.000000+00:00",
        "description": "Cancha principal",
        "created_at": "2026-10-20T12:58:00.000000+00:00",
        "updated_at": "2026-10-20T13:00:00.000000+00:00"
      }
    ],
    "total": 1,
    "page": 1,
    "page_size": 20,
    "total_pages": 1
  },
  "meta": {
    "total": 1,
    "page": 1,
    "page_size": 20,
    "total_pages": 1
  }
}
```

- Ordenado por `created_at` descendente (más reciente primero).
- Sin `status`, devuelve también las `pending`.

**Errores:**

| HTTP | `error_code` | Cuándo |
|---|---|---|
| 404 | `RESOURCE_NOT_FOUND` | El complejo no existe |

---

## 5. Eliminar una imagen

### `DELETE /api/complexes/{complex_id}/images/{image_id}/`

**Auth:** Bearer Token — owner o manager del complejo.

Borra el objeto en R2 (best-effort) y **elimina el registro de la base de datos** (hard delete).

**Response:** `204 No Content` (sin body).

**Errores:**

| HTTP | `error_code` | Cuándo |
|---|---|---|
| 404 | `RESOURCE_NOT_FOUND` | `image_id` no existe |
| 403 | `FORBIDDEN` | No es owner ni manager |
| 401 | `UNAUTHORIZED` | Falta token o expiró |

---

## 6. Eliminar todas las imágenes

### `DELETE /api/complexes/{complex_id}/images/`

**Auth:** Bearer Token — owner o manager del complejo.

Elimina todas las imágenes del complejo (pending y confirmadas).

**Response 200:**

```json
{
  "success": true,
  "message": "2 imagen(es) eliminada(s) exitosamente.",
  "data": {
    "deleted_count": 2,
    "failed_count": 0
  },
  "meta": {}
}
```

| Campo | Descripción |
|---|---|
| `deleted_count` | Registros eliminados correctamente |
| `failed_count` | Objetos que no se pudieron borrar en R2 (el registro igual se elimina) |

**Errores:**

| HTTP | `error_code` | Cuándo |
|---|---|---|
| 404 | `RESOURCE_NOT_FOUND` | El complejo no existe |
| 403 | `FORBIDDEN` | No es owner ni manager |
| 401 | `UNAUTHORIZED` | Falta token o expiró |

---

## Cómo vienen las imágenes en otros endpoints

### Listado de complejos — `GET /api/complexes/`

Cada item incluye un resumen de imágenes **solo de las confirmadas**:

```json
{
  "last_image": {
    "r2_key": "complexes/<complex_id>/<uuid>.jpg",
    "image_url": "https://<R2_PUBLIC_URL>/complexes/<complex_id>/<uuid>.jpg"
  },
  "images_count": 2
}
```

| Campo | Descripción |
|---|---|
| `last_image` | Imagen confirmada más reciente, o `null` si no hay |
| `images_count` | Total de imágenes **confirmadas** |

Ideal para la tarjeta del listado: usa `last_image.image_url` como portada.

### Detalle de complejo — `GET /api/complexes/{complex_id}/`

Incluye `images`: **todas las imágenes del complejo, sin filtrar por estado** (incluye `pending`).

```json
{
  "images": [
    {
      "img_id": "...",
      "r2_key": "complexes/<complex_id>/<uuid>.jpg",
      "image_url": "https://<R2_PUBLIC_URL>/complexes/<complex_id>/<uuid>.jpg",
      "status": "confirmed",
      "description": "Cancha principal"
    }
  ]
}
```

> **Recomendación:** si el detalle es público, filtra en cliente `images.filter(i => i.status === "confirmed")`, o consume `GET /images/?status=confirmed`. Solo el panel del owner/manager debería mostrar `pending`.

---

## Estados de una imagen

| Estado | Significado | Se muestra al público |
|---|---|---|
| `pending` | Registro creado, archivo aún no confirmado en R2 | No |
| `confirmed` | Archivo verificado en R2 | Sí |
| `deleted` | Definido en el modelo, pero **en la práctica no se usa**: el borrado es físico | — |

---

## Errores globales relevantes

| HTTP | `error_code` | Causa |
|---|---|---|
| 401 | `UNAUTHORIZED` | Token ausente, inválido o expirado |
| 403 | `FORBIDDEN` | Sin permisos de owner/manager |
| 404 | `RESOURCE_NOT_FOUND` | Complejo o imagen inexistente |
| 422 | `INVALID_IMAGE_TYPE` | MIME no permitido |
| 422 | `IMAGE_FILE_TOO_LARGE` | Archivo > 5 MB |
| 422 | `IMAGE_LIMIT_EXCEEDED` | Más de 3 imágenes confirmadas |
| 409 | `IMAGE_NOT_FOUND_IN_R2` | Se confirmó pero el archivo no está en R2 |

---

## Checklist para el frontend

1. Valida en cliente tipo y tamaño antes de llamar al backend (5 MB, jpeg/png/webp).
2. Envía `content_type` y `file_size` reales del archivo.
3. Sube con `PUT` a `upload_url` usando el mismo `Content-Type`. No agregues `Authorization`.
4. Confirma siempre después del `PUT`; antes de confirmar la imagen no es visible.
5. Usa `image_url` (URL pública) para renderizar, nunca `r2_key`.
6. Para mostrar portadas usa `last_image` del listado; para galería usa `?status=confirmed`.
7. Deshabilita el botón de subir si `images_count >= 3`.
8. Recuerda que las `pending` sin confirmar se purgan a las 24 h.
