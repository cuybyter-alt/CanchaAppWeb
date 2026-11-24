# Imágenes de complejos y canchas — Resumen para Frontend

Existen **dos tipos de imágenes**, ambas en Cloudflare R2 y con el mismo flujo de
subida (URL prefirmada → PUT a R2 → confirmar):

| Tipo | Recurso | Se usa para |
|---|---|---|
| Imagen de **complejo** | `complex_id` | Portada y galería del complejo |
| Imagen de **cancha** (`field`) | `field_id` | Foto de una cancha específica del complejo |

El backend nunca recibe el archivo; solo genera URLs firmadas.

Guía detallada de complejos: [`frontend-complex-images.md`](./frontend-complex-images.md).

---

## Endpoints

### Imágenes del complejo

| Acción | Método | Endpoint | Auth |
|---|---|---|---|
| Listar | `GET` | `/api/complexes/{complex_id}/images/` | Público |
| Pedir URL de subida | `POST` | `/api/complexes/{complex_id}/images/upload-url/` | JWT owner/manager |
| Subir archivo | `PUT` | `upload_url` (R2, no backend) | Ninguna |
| Confirmar / editar descripción | `PATCH` | `/api/complexes/{complex_id}/images/{image_id}/confirm/` | JWT owner/manager |
| Eliminar una | `DELETE` | `/api/complexes/{complex_id}/images/{image_id}/` | JWT owner/manager |
| Eliminar todas | `DELETE` | `/api/complexes/{complex_id}/images/` | JWT owner/manager |

### Imágenes de una cancha (`field`)

| Acción | Método | Endpoint | Auth |
|---|---|---|---|
| Listar | `GET` | `/api/fields/{field_id}/images/` | Público |
| Pedir URL de subida | `POST` | `/api/fields/{field_id}/images/upload-url/` | JWT owner/manager |
| Subir archivo | `PUT` | `upload_url` (R2, no backend) | Ninguna |
| Confirmar / editar descripción | `PATCH` | `/api/fields/{field_id}/images/{image_id}/confirm/` | JWT owner/manager |
| Eliminar una | `DELETE` | `/api/fields/{field_id}/images/{image_id}/` | JWT owner/manager |
| Eliminar todas | `DELETE` | `/api/fields/{field_id}/images/` | JWT owner/manager |

> El owner/manager se valida contra el **complejo al que pertenece** la cancha.

---

## Reglas

| Regla | Valor |
|---|---|
| Tamaño máximo | 5 MB (`5 * 1024 * 1024` bytes) |
| Tipos permitidos | `image/jpeg`, `image/png`, `image/webp` |
| Máximo confirmadas por **complejo** | 3 |
| Máximo confirmadas por **cancha** | 2 |
| Expiración de `upload_url` | 30 minutos |
| Imágenes `pending` sin confirmar | Se purgan a las 24 h (cron) |
| Escritura | Owner o manager del complejo |
| Lectura | Pública |

Estados: `pending` (no visible al público) → `confirmed` (visible). El borrado es
físico (no se usa `deleted`).

---

## Flujo de subida (igual para ambos tipos)

```
1. POST .../images/upload-url/  → { upload_url, image_id, r2_key }
2. PUT  <upload_url>            → subir el archivo a R2 (mismo Content-Type)
3. PATCH .../images/{image_id}/confirm/ → queda "confirmed" y visible
```

```ts
async function uploadImage(baseUrl: string, file: File) {
  // baseUrl ejemplo: `/api/complexes/${complexId}` o `/api/fields/${fieldId}`

  // 1. URL prefirmada
  const { data } = await api.post(`${baseUrl}/images/upload-url/`, {
    content_type: file.type,
    file_size: file.size,
  });
  const { upload_url, image_id } = data.data;

  // 2. Subir directo a R2 (sin Authorization)
  const res = await fetch(upload_url, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!res.ok) throw new Error("Falló la subida a R2");

  // 3. Confirmar (antes de este paso NO es visible)
  const confirmed = await api.patch(
    `${baseUrl}/images/${image_id}/confirm/`,
    { description: "Foto principal" } // opcional
  );
  return confirmed.data.data; // incluye image_url
}

// Ejemplos
await uploadImage(`/api/complexes/${complexId}`, file);
await uploadImage(`/api/fields/${fieldId}`, file);
```

Importante: el `PUT` a R2 debe usar **exactamente** el mismo `Content-Type`
declarado en el paso 1.

---

## Listar imágenes

```http
GET /api/complexes/{complex_id}/images/?status=confirmed&page=1&page_size=20
GET /api/fields/{field_id}/images/?status=confirmed&page=1&page_size=20
```

- Sin `status` devuelve también `pending`; para galería pública usa
  `status=confirmed`.
- Orden: `created_at` descendente.
- Cada ítem de complejo incluye `img_id`, `r2_key`, `image_url`, `status`,
  `description`, `file_size`, `uploaded_at`, `created_at`, `updated_at`.
- Cada ítem de cancha incluye lo mismo **más `field_id`**.

Renderiza siempre `image_url` (URL pública), nunca `r2_key`.

---

## Imágenes dentro de otros listados

| Endpoint | Campo | Cuándo |
|---|---|---|
| `GET /api/complexes/` | `last_image`, `images_count` | Siempre |
| `GET /api/complexes/manager/list/` | `last_image`, `images_count` | Siempre |
| Complejos (ambos) + reservas | `complex_image` | Con `?include_complex_image=true` |
| `GET /api/bookings/my/` y `/bookings/complex/{id}/` | `complex_image` | Con `?include_complex_image=true` |

```json
"last_image": {
  "r2_key": "complexes/<complex_id>/<uuid>.jpg",
  "image_url": "https://<r2-publico>/complexes/<complex_id>/<uuid>.jpg"
}
```

- `last_image` y `complex_image` son la **última imagen confirmada** o `null`.
- Si no envías `include_complex_image`, la clave `complex_image` no aparece.
- En reservas también se incluye siempre `complex_id`.

> Las imágenes de canchas **no** vienen embebidas en otros endpoints todavía.
> Consúmelas con `GET /api/fields/{field_id}/images/?status=confirmed` y usa la
> primera (o la que corresponda) como foto de la cancha.

---

## Errores principales

| HTTP | `error_code` | Cuándo |
|---|---|---|
| 401 | `UNAUTHORIZED` | Token ausente/expirado |
| 403 | `FORBIDDEN` | No es owner/manager del complejo |
| 404 | `RESOURCE_NOT_FOUND` | Complejo, cancha o imagen inexistente |
| 409 | `IMAGE_NOT_FOUND_IN_R2` | Se confirmó pero el archivo no está en R2 |
| 422 | `INVALID_IMAGE_TYPE` | MIME no permitido |
| 422 | `IMAGE_FILE_TOO_LARGE` | Archivo > 5 MB |
| 422 | `IMAGE_LIMIT_EXCEEDED` | Límite de imágenes confirmadas alcanzado |

---

## Checklist

1. Valida tipo y tamaño en el cliente antes de pedir la URL.
2. Sube a R2 con el mismo `Content-Type`; no agregues `Authorization`.
3. Confirma siempre; antes de confirmar la imagen no se muestra.
4. Usa `image_url` para renderizar.
5. Deshabilita “subir” si el complejo ya tiene 3 confirmadas o la cancha 2.
6. Para galería usa `?status=confirmed`.
7. Recuerda que las `pending` se eliminan a las 24 h.
