# Notificaciones de reservas — flujo y acciones para Frontend

El flujo actual de una reserva es:

```
creada (pending) → abonada (part_paid) → confirmada (confirmed)
```

- **pending**: el jugador creó la reserva, pero **falta que abone**. No requiere
  aprobación del admin.
- **part_paid**: el jugador abonó. Debe presentar su QR/código al llegar.
- **confirmed**: el manager/owner escaneó el QR o validó el código en la cancha.

> Si un **owner/manager crea la reserva** (`created_by_admin=true`), nace
> directamente en `part_paid`, ya tiene confirmación QR y no debe mostrar el CTA
> **Abonar**. Si el responsable es un **invitado** (`is_guest=true`), no recibe
> notificación: el admin creador puede consultar el QR. Ver
> [`frontend-reservas-admin.md`](./frontend-reservas-admin.md).

El admin/manager puede **rechazar** (`rejected`) una reserva pendiente o
**registrar el abono** (`part_paid`) si el pago se hizo presencialmente.

---

## Eventos y metadata

Todas las notificaciones traen `event`, `message` (título), `content` (cuerpo ya
formateado en español y 24h) y `metadata`.

| `event` | Destinatario | `metadata.status` | Acción sugerida en UI |
|---|---|---|---|
| `BOOKING_CREATED` | Jugador | `pending` | Botón **Abonar** |
| `BOOKING_CREATED` | Owner/Manager | `pending` | Ver reserva / rechazar |
| `BOOKING_STATUS_CHANGED` | Jugador | `part_paid` | Mostrar **QR / código** |
| `BOOKING_STATUS_CHANGED` | Jugador | `rejected` | Estado final, sin acción |
| `BOOKING_STATUS_CHANGED` | Owner/Manager | `part_paid` | Solo informativo |
| `BOOKING_CONFIRMED` | Jugador | `confirmed` | Sin acción |
| `BOOKING_CANCELED` | Jugador | — | Sin acción |
| `BOOKING_RESCHEDULED` | Jugador / Admin | — | Ver nueva fecha |
| `BOOKING_MOVED` | Jugador / Admin | — | Ver nueva cancha/fecha |

Ejemplo al crear una reserva (jugador):

```json
{
  "event": "BOOKING_CREATED",
  "message": "Reserva creada — pendiente de abono.",
  "content": "Juan Pérez, tu reserva fue creada y quedó pendiente de abono. Abona desde esta notificación para asegurar tu cupo. Horario: miércoles 18 de noviembre, 08:00 - 09:00.",
  "metadata": {
    "booking_id": "uuid",
    "status": "pending",
    "start_datetime": "2026-11-18T13:00:00+00:00",
    "end_datetime": "2026-11-18T14:00:00+00:00"
  }
}
```

> `metadata.status` es la fuente para decidir el CTA. No infieras el estado solo
> del texto.

---

## Acción “Abonar”

Cuando `event == "BOOKING_CREATED"` y `metadata.status == "pending"`, muestra el
botón **Abonar** (solo al jugador dueño de la reserva).

```http
PATCH /api/bookings/{metadata.booking_id}/status/part_paid/
Authorization: Bearer <token>
```

- No requiere body.
- Respuesta 200: la reserva pasa a `part_paid`.
- Errores: `403` si no eres el dueño; `400` si la reserva ya no está `pending`;
  `404` si no existe.

Después del éxito:
1. Refresca la reserva/lista.
2. Muestra el QR/código con `GET /api/bookings/{booking_id}/confirmation/`.
3. El jugador verá el mensaje “Presenta tu código QR o código corto al llegar
   para confirmar”.

---

## Acción “Rechazar” (admin/manager)

```http
PATCH /api/bookings/{booking_id}/status/rejected/
Authorization: Bearer <token>
```

Solo para reservas `pending` y usuarios manager/owner del complejo. No hay acción
de “aprobar”: el admin no aprueba, solo rechaza o registra el abono.

---

## Después del abono

Al recibir `BOOKING_STATUS_CHANGED` con `metadata.status == "part_paid"`:

- Oculta el botón **Abonar**.
- Muestra el QR/código (`GET /api/bookings/{booking_id}/confirmation/`).
- El evento `BOOKING_CONFIRMED` llega cuando el manager valida la entrada; ya no
  hay acción pendiente.

---

## Notas

- Las fechas de `content` ya vienen formateadas en la zona del usuario (24h).
  Para lógica usa los ISO de `metadata` (`start_datetime`, `end_datetime`).
- No muestres “pendiente de aprobación”: el estado `pending` significa
  **pendiente de abono**.
- El badge del dashboard (`pending_approval`) cuenta reservas **por abonar**.
