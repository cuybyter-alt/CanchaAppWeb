# Zonas horarias y formato de horas — Guía para Frontend

El backend ahora guarda la **zona horaria IANA de cada usuario** y formatea todas
las horas de los mensajes en **24h (`HH:MM`)**, mostrando la hora del complejo y,
si el usuario está en otra zona, también su hora local.

---

## Resumen

| Concepto | Valor |
|---|---|
| Formato de horas en mensajes | 24h: `19:00`, rango `19:00 - 20:00` |
| Fin de franja a medianoche | Se muestra `23:59` |
| Zona del complejo | `America/Bogota` (autoritativa para la cancha) |
| Zona del usuario | Campo `timezone` (IANA) en el perfil |
| Valor por defecto | `America/Bogota` |
| Formato almacenado | IANA, ej. `America/Bogota` (no offsets) |

Ejemplo de mensaje cuando la zona del usuario difiere:

```
lunes 20 de octubre, 19:00 - 20:00 (tu hora local: martes 21 de octubre, 02:00 - 03:00)
```

Si coincide, solo se muestra una vez:

```
lunes 20 de octubre, 19:00 - 20:00
```

---

## Cómo obtener la zona del usuario

Solo el dispositivo la conoce de forma fiable. En web:

```ts
const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
// "America/Bogota"
```

En React Native (`Hermes` con `Intl` habilitado) funciona igual. Si tu build no
tiene `Intl`, usa una librería de dispositivo o un selector manual; **no envíes
offsets** (`-05:00`) porque no soportan horario de verano de otros países.

---

## Cuándo actualizar la zona (importante para que sea óptimo)

La zona cambia poco. No la envíes en cada petición. Recomendado:

1. **Al iniciar sesión / registrar**: envía `timezone` en el body. El backend la
   guarda en ese mismo momento (una sola escritura).
2. **Al abrir la app** (una vez por sesión): compara la zona del dispositivo con
   `user.timezone`. Si difiere, actualízala con `PUT /users/me/`.
3. **Opcional**: al volver del segundo plano (`visibilitychange`) o antes de
   reservar, repite la comparación.

```ts
const deviceTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

// Al abrir la app / después del login
if (user.timezone !== deviceTz) {
  await api.put("/api/identity/users/me/", { timezone: deviceTz });
}
```

> No hace falta actualizarla en cada request ni en cada reserva. Una vez por
> sesión y en el login es suficiente.

---

## Endpoints que aceptan `timezone`

### Login

`POST /api/identity/auth/login/`

```json
{
  "identifier": "juan@example.com",
  "password": "SecurePassword123",
  "timezone": "America/Bogota"
}
```

- `timezone` es **opcional**.
- Si viene, el backend la guarda antes de emitir los tokens.
- La respuesta incluye `data.user.timezone`.

### Registro

`POST /api/identity/register/` — campo opcional `timezone`.

### Firebase / OAuth

`POST /api/identity/auth/firebase/` — campo opcional `timezone`.

### Perfil

`GET /api/identity/users/me/` devuelve:

```json
{
  "success": true,
  "data": {
    "user_id": "...",
    "username": "juan",
    "email": "juan@example.com",
    "timezone": "America/Bogota"
  }
}
```

`PUT /api/identity/users/me/` (requiere Bearer token) acepta:

```json
{ "timezone": "Europe/Madrid" }
```

Los demás campos son opcionales, así que puedes enviar solo `timezone`.

**Validación:** debe ser un nombre IANA existente (`zoneinfo`). Si es inválido:

```json
{
  "success": false,
  "error_code": "VALIDATION_ERROR",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "La solicitud contiene errores de validación.",
    "details": { "timezone": ["Zona horaria inválida. Usa un nombre IANA..."] }
  }
}
```

---

## Uso de las horas en las respuestas

- Los campos `*_datetime` (ISO 8601 **con offset**, ej.
  `2026-10-20T19:00:00-05:00`) son la fuente de verdad para máquinas. Úsalos para
  ordenar, comparar o convertir si lo necesitas.
- Los campos `*_label` (`time_label`, `time_range_label`,
  `requested_time_label`) ya vienen en 24h listos para mostrar.
- Las **notificaciones** traen el texto ya formateado en 24h. Además incluyen en
  `metadata` los ISO (`start_datetime`, `end_datetime`) por si quieres
  re-renderizar con tu propia lógica.

---

## Reglas que el backend aplica

| Caso | Comportamiento |
|---|---|
| Usuario sin `timezone` | Se asume `America/Bogota` |
| Zona del usuario = zona del complejo | Se muestra una sola hora |
| Zona del usuario ≠ zona del complejo | Se muestran hora del complejo + tu hora local |
| Franja termina a medianoche | Se muestra `23:59` en lugar de `00:00` |
| Franja cruza de día (ej. 23:00-00:00) | La fecha corresponde al inicio de la franja |

> La **disponibilidad de canchas** siempre se expresa en hora del complejo. Un
> usuario en otra zona que reserve una cancha en Bogotá debe entender que
> `19:00` es hora de la sede; por eso el mensaje añade su hora local.

---

## Checklist frontend

1. Lee `Intl.DateTimeFormat().resolvedOptions().timeZone` al iniciar.
2. Envía `timezone` en login/registro/firebase (opcional, pero recomendado).
3. Tras el login, si `user.timezone` difiere del dispositivo, haz **un**
   `PUT /users/me/` con `{ timezone }`.
4. Muestra los `*_label` tal cual (ya están en 24h).
5. Usa los `*_datetime` ISO para cualquier cálculo; nunca asumas UTC sin zona.
6. No reenvíes la zona en cada request.
7. Provee una forma manual de cambiarla (selector de zona) para usuarios con
   `Intl` no disponible o que viajan.
