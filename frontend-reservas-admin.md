# Reservas creadas por admin — Guía para Frontend

Un **owner o manager** puede crear reservas:

1. A nombre de un jugador registrado (`user_id`).
2. A nombre de una persona sin cuenta (`guest`, solo nombre y teléfono).
3. A su propio nombre (sin `user_id` ni `guest`).

Todas nacen **abonadas (`part_paid`)**, con confirmación QR generada.

---

## Endpoint

```http
POST /api/bookings/
Authorization: Bearer <token owner/manager>
Content-Type: application/json
```

### A) Jugador registrado

```json
{
  "time_slot_id": "uuid-del-slot",
  "user_id": "uuid-del-jugador"
}
```

### B) Persona sin cuenta (invitado)

```json
{
  "time_slot_id": "uuid-del-slot",
  "guest": {
    "name": "Juan Pérez",
    "phone_number": "3001234567",
    "email": "opcional@correo.com"
  }
}
```

### C) A nombre del propio admin

```json
{ "time_slot_id": "uuid-del-slot" }
```

Reglas:

- `user_id` y `guest` son mutuamente excluyentes (`400`).
- `guest` solo lo puede enviar un owner/manager (`403` si es jugador).
- El invitado se crea como usuario sin login (`is_guest=true`). No recibe push
  ni puede consultar su QR; el admin que creó la reserva sí puede verlo.
- `guest.email` es opcional. Si no se envía, se genera un email interno.
- Si el email ya existe → `409 USER_ALREADY_EXISTS` (usar `user_id`).
- El slot debe estar disponible (`409 SLOT_NOT_AVAILABLE`).

---

## Buscar jugador por UUID, email o username

El frontend puede:

1. **UUID exacto**: `GET /api/identity/users/{user_id}/` (perfil completo).
2. **Email o username exacto** (recomendado para el selector):

```http
GET /api/identity/users/lookup/?identifier=correo@ejemplo.com
Authorization: Bearer <token owner/manager>
```

```json
{
  "success": true,
  "data": {
    "user_id": "uuid",
    "f_name": "Ana",
    "l_name": "Gómez",
    "email": "ana@ejemplo.com",
    "avatar_url": null,
    "is_guest": false
  }
}
```

- Solo Owner/Manager (`403` para jugadores).
- Coincidencia exacta; no es búsqueda difusa.
- `404 USER_NOT_FOUND` si no existe.
- Para sugerencias, usa `user_id`/`user_name` de reservas anteriores del
  complejo (`GET /api/bookings/complex/{complex_id}/`).

---

## Response 201

```json
{
  "success": true,
  "message": "Reserva creada exitosamente.",
  "data": {
    "booking_id": "uuid",
    "complex_name": "Complejo Norte",
    "field_name": "Cancha 1",
    "start_datetime": "2026-11-18T13:00:00+00:00",
    "end_datetime": "2026-11-18T14:00:00+00:00",
    "user_id": "uuid-del-responsable",
    "user_name": "Juan Pérez",
    "is_guest": true,
    "total_price": 70000.0,
    "status": "part_paid",
    "created_by_admin": true,
    "created_by": "uuid-del-admin",
    "created_by_name": "Admin Dueño",
    "reviewed_by": "uuid-del-admin",
    "reviewed_at": "2026-11-17T19:00:00+00:00"
  }
}
```

### Significado de los campos

| Campo | Qué representa |
|---|---|
| `user_id` | Responsable de la reserva (jugador o invitado) |
| `user_name` | Nombre del responsable |
| `is_guest` | `true` si el responsable no tiene cuenta |
| `created_by` | Quién creó la reserva (jugador o admin) |
| `created_by_name` | Nombre de quien la creó (para “Creada por...”) |
| `created_by_admin` | `true` si la creó un owner/manager |
| `reviewed_by` | Quién aplicó el cambio de estado (en admin-created, el admin) |

Diferencias:

| Caso | `status` | `created_by` | `is_guest` |
|---|---|---|---|
| Jugador reserva para sí | `pending` | jugador | `false` |
| Admin reserva para jugador | `part_paid` | admin | `false` |
| Admin reserva para invitado | `part_paid` | admin | `true` |

---

## Notificaciones

- **Jugador registrado**: recibe `BOOKING_CREATED` con
  `message = "Reserva creada — abonada."` y `metadata.status = "part_paid"`.
- **Invitado**: **no** recibe notificación (no tiene cuenta).
- **Admin creador**: no recibe notificación de “nueva reserva”.

---

## Obtener el QR

El QR se genera siempre. Pueden consultarlo:

- el dueño de la reserva (jugador),
- quien la creó (`created_by`, el admin),
- un owner/manager del complejo.

```http
GET /api/bookings/{booking_id}/confirmation/
Authorization: Bearer <token>
```

```json
{
  "success": true,
  "data": {
    "booking_id": "uuid",
    "token": "...",
    "short_code": "A3K9ZX",
    "used": false
  }
}
```

Para invitados, el admin debe mostrar/imprimir este QR, porque el invitado no
puede iniciar sesión.

---

## Uso típico en el panel admin

1. Elegir slot.
2. Elegir responsable:
   - Buscar por email/username (`lookup`) o UUID.
   - O completar nombre + teléfono para invitado.
   - O “Reservar a mi nombre”.
3. `POST /api/bookings/` con `user_id`, `guest` o nada.
4. La reserva aparece como **abonada**.
5. Mostrar u obtener el QR desde la sesión del admin.
6. El manager confirma la entrada con `POST /api/bookings/confirm/`.

---

## Errores

| HTTP | `error_code` | Cuándo |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `user_id` y `guest` juntos, o falta `name` |
| 401 | `UNAUTHORIZED` | Token ausente/expirado |
| 403 | `PERMISSION_DENIED` | Jugador intenta reservar para otro o crear invitado |
| 404 | `USER_NOT_FOUND` | `user_id` inexistente |
| 404 | `TIME_SLOT_NOT_FOUND` | Slot inexistente |
| 409 | `SLOT_NOT_AVAILABLE` | Slot ya reservado o bloqueado |
| 409 | `USER_ALREADY_EXISTS` | Email de invitado ya registrado |

---

## Checklist frontend

1. Mostrar selector de jugador solo a owner/manager del complejo.
2. Usar `lookup` por email/username + sugerencias de reservas anteriores.
3. Para invitado, pedir nombre y teléfono; email opcional.
4. No mostrar “Abonar” si `created_by_admin=true` o `status=part_paid`.
5. Mostrar badge “Creada por {created_by_name}” cuando `created_by_admin=true`.
6. Para invitados, ofrecer al admin ver/imprimir el QR.
7. No esperar notificaciones ni login del invitado.
