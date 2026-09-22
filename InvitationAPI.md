# Invitation API — Guía de Endpoints

Sistema de invitaciones para que los propietarios de complejos inviten a personas a convertirse en **Managers**.

---

## Flujos

### Invitado con cuenta existente

```
Owner                          Backend                          Invitado (existente)
  │                               │                               │
  ├─POST /managers/invite/────────►│ crea ComplexInvitation        │
  │                               │ envía email con deep link ────►│
  │                               │                               │
  │                         (invitado abre el email, hace clic)   │
  │                               │                               │
  │                               │◄──GET /invitations/{token}/───┤  (preview, sin login)
  │                               │                               │
  │                               │◄──POST /invitations/{token}/accept/  (con JWT)
  │                               │ asigna rol Manager            │
  │                               │ crea ComplexManagerModel      │
  │                               │ marca invitation = accepted ──►│  200 OK
```

### Invitado sin cuenta (usuario nuevo)

```
Owner                          Backend                          Invitado (nuevo)
  │                               │                               │
  ├─POST /managers/invite/────────►│ crea ComplexInvitation        │
  │                               │ envía email con deep link ────►│
  │                               │                               │
  │                   (invitado abre email → frontend carga /invitaciones?token=…)
  │                               │                               │
  │                               │◄──GET /invitations/{token}/───┤  (preview datos del complejo)
  │                               │                               │
  │                               │◄─POST /invitations/{token}/register-and-accept/
  │                               │ registra usuario              │
  │                               │ asigna rol Manager            │
  │                               │ crea ComplexManagerModel      │
  │                               │ marca invitation = accepted   │
  │                               │ devuelve JWT + usuario ───────►│  201 Created
  │                               │                               │
  │                               │ redirige a GET /join/{token}/success/
```

---

## Endpoints

### 1. Enviar invitación

```
POST /api/complexes/{complex_id}/managers/invite/
Authorization: Bearer <owner_token>
```

**Body:**
```json
{
  "invitee_email": "persona@ejemplo.com"
}
```

**Respuestas:**

| Código | Cuándo |
|--------|--------|
| `201` | Invitación creada y email enviado |
| `400` | Email inválido |
| `401` | Sin autenticación |
| `403` | El usuario no es Owner |
| `404` | `complex_id` no existe |
| `409` | Ya existe una invitación `pending` para ese email en ese complejo |

**Comportamiento del email:**

| Caso | Mecanismo |
|------|-----------|
| Invitado **tiene cuenta** en Canchapp | Pipeline de notificaciones → `EmailDispatcher` → Brevo (in-app + email) |
| Invitado **no tiene cuenta** | Email directo vía `BrevoService` |

> **Deep link**: cuando `FRONTEND_URL` está configurado, el email incluye un botón que enlaza a
> `{FRONTEND_URL}/invitaciones?token={token}`. Si la variable está vacía, se muestra el token en texto plano.

**Respuesta `201`:**
```json
{
  "status": "success",
  "message": "Invitación enviada exitosamente.",
  "data": {
    "invitation_id": "550e8400-e29b-41d4-a716-446655440000",
    "complex_id": "...",
    "complex_name": "Complejo Test",
    "invitee_email": "persona@ejemplo.com",
    "token": "a1b2c3d4-...",
    "status": "pending",
    "invited_by": "...",
    "created_at": "2026-05-27T22:00:00Z",
    "expires_at": "2026-06-03T22:00:00Z",
    "accepted_at": null
  }
}
```

---

### 2. Ver detalle de invitación *(sin login)*

```
GET /api/complexes/invitations/{token}/
```

> Endpoint público. Permite al frontend mostrar los datos del complejo antes de que el invitado inicie sesión o se registre.

**Respuestas:**

| Código | Cuándo |
|--------|--------|
| `200` | Token encontrado |
| `404` | Token no existe |

**Respuesta `200`:**
```json
{
  "status": "success",
  "message": "Invitación obtenida exitosamente.",
  "data": {
    "invitation_id": "...",
    "complex_id": "...",
    "complex_name": "Complejo Test",
    "invitee_email": "persona@ejemplo.com",
    "token": "a1b2c3d4-...",
    "status": "pending",
    "invited_by": "...",
    "created_at": "...",
    "expires_at": "...",
    "accepted_at": null
  }
}
```

---

### 3. Aceptar invitación

```
POST /api/complexes/invitations/{token}/accept/
Authorization: Bearer <invitee_token>
```

> El email del usuario autenticado debe coincidir con el `invitee_email` de la invitación.

**Respuestas:**

| Código | Cuándo |
|--------|--------|
| `200` | Aceptada — rol Manager asignado, `ComplexManagerModel` creado |
| `401` | Sin autenticación |
| `403` | El email del JWT no coincide con `invitee_email` |
| `404` | Token no existe o invitación cancelada |
| `409` | La invitación ya fue aceptada |
| `422` | La invitación expiró (TTL: 7 días) |

**Efectos al aceptar (en orden):**
1. Se añade el rol global `Manager` al usuario (idempotente vía M2M)
2. Se crea una entrada en `ComplexManagerModel`
3. `invitation.status` → `"accepted"`, se registra `accepted_at`

---

### 4. Registrarse y aceptar en un solo paso *(usuario nuevo)*

```
POST /api/complexes/invitations/{token}/register-and-accept/
```

> Endpoint público (sin token JWT). Para invitados que **no tienen cuenta** en Canchapp.
> El email se extrae del token — no se envía en el cuerpo.

**Body:**
```json
{
  "f_name": "María",
  "l_name": "López",
  "username": "mlopez",
  "password": "supersecreta123"
}
```

**Respuestas:**

| Código | Cuándo |
|--------|--------|
| `201` | Cuenta creada, rol Manager asignado, invitación aceptada |
| `400` | Campos inválidos (e.g. contraseña < 8 caracteres) |
| `404` | Token no existe o invitación cancelada |
| `409` | Username o email ya registrado |
| `422` | La invitación expiró |

**Respuesta `201`:**
```json
{
  "status": "success",
  "message": "Cuenta creada. Ya sos manager de este complejo.",
  "data": {
    "access": "<JWT access token>",
    "refresh": "<JWT refresh token>",
    "user": {
      "user_id": "...",
      "email": "persona@ejemplo.com",
      "username": "mlopez",
      "f_name": "María",
      "l_name": "López",
      "role_names": ["Manager"]
    },
    "invitation": {
      "invitation_id": "...",
      "complex_id": "...",
      "complex_name": "Complejo Test",
      "status": "accepted",
      "accepted_at": "2026-05-27T22:30:00Z"
    }
  }
}
```

**Garantías transaccionales:** si el registro del usuario falla (e.g. username duplicado) o el `accept` falla, toda la operación se revierte. No se crean usuarios huérfanos.

**Flujo sugerido para el frontend:**

1. `GET /api/complexes/invitations/{token}/` → mostrar nombre del complejo y email en el formulario (read-only).
2. Usuario completa nombre, username y contraseña.
3. `POST /api/complexes/invitations/{token}/register-and-accept/` → guardar tokens en storage.
4. Redirigir a `GET /join/{token}/success/` (página HTML del servidor) o a la pantalla principal de la app.

---

### 5. Página de éxito *(HTML)*

```
GET /join/{token}/success/
```

> Página HTML server-rendered — **no es un endpoint JSON**. Mostrarla directamente en el navegador tras completar el registro. No requiere autenticación.

Muestra el nombre del complejo y un botón "Ir a Canchapp" que apunta a `FRONTEND_URL` (si está configurado).

---

### 7. Cancelar invitación pendiente

```
DELETE /api/complexes/{complex_id}/invitations/{invitation_id}/
Authorization: Bearer <owner_token>
```

**Respuestas:**

| Código | Cuándo |
|--------|--------|
| `204` | Cancelada exitosamente |
| `401` | Sin autenticación |
| `403` | No es el propietario del complejo |
| `404` | `invitation_id` no encontrado |
| `409` | La invitación ya no está en estado `pending` |

---

### 8. Listar invitaciones del complejo

```
GET /api/complexes/{complex_id}/invitations/
Authorization: Bearer <owner_token>
```

**Query params opcionales:**

| Parámetro | Valores posibles | Descripción |
|-----------|-----------------|-------------|
| `status` | `pending` \| `accepted` \| `cancelled` | Filtra por estado |

**Respuestas:**

| Código | Cuándo |
|--------|--------|
| `200` | Lista de invitaciones (puede ser vacía) |
| `401` | Sin autenticación |
| `403` | No es Owner |
| `404` | El complejo no existe |

---

## ¿Qué endpoint usar según el estado del invitado?

| Estado del invitado | Endpoint recomendado |
|---------------------|---------------------|
| **Tiene cuenta** y ya está logueado | `POST /invitations/{token}/accept/` |
| **Tiene cuenta** pero no está logueado | Redirigir a login → luego `POST /invitations/{token}/accept/` |
| **No tiene cuenta** | `POST /invitations/{token}/register-and-accept/` |

El frontend puede determinar el estado llamando primero a `GET /invitations/{token}/` (público) y verificando si el email del invitado ya está registrado. Alternativamente puede mostrar dos opciones en la misma pantalla: "Ya tengo cuenta" y "Crear cuenta".

---

## Configuración de entorno

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `FRONTEND_URL` | No | URL base del frontend (sin `/` final). Usada para el deep link en el email de invitación. Ejemplo: `https://app.canchapp.com`. Si está vacía, el email muestra el token en texto plano. |
| `BREVO_API_KEY` | Sí (prod) | API key de Brevo para envío de emails. |

---

## Tabla de errores de dominio

| Código de error | HTTP | Cuándo se lanza |
|-----------------|------|-----------------|
| `INVITATION_NOT_FOUND` | `404` | Token o ID de invitación inválido |
| `INVITATION_ALREADY_ACCEPTED` | `409` | Se intenta aceptar o cancelar una invitación ya aceptada |
| `INVITATION_EXPIRED` | `422` | Han pasado más de 7 días desde la creación |
| `PENDING_INVITATION_ALREADY_EXISTS` | `409` | Se intenta invitar al mismo email dos veces al mismo complejo |
| `INVITATION_EMAIL_MISMATCH` | `403` | El email del JWT no coincide con `invitee_email` |
| `USER_ALREADY_EXISTS` | `409` | Email o username ya registrado (solo en register-and-accept) |

---

## Componentes implementados

### Base de datos

| Tabla | Cambio |
|-------|--------|
| `complex_invitation` | **Nueva** — migración `0010_add_complex_invitation_model` |

**Columnas de `complex_invitation`:**

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `invitation_id` | `UUID` PK | Identificador único |
| `complex_id` | `UUID` FK → `complex` | Complejo al que se invita |
| `invitee_email` | `VARCHAR(254)` | Email del invitado |
| `token` | `UUID` UNIQUE | Token público para el link del email |
| `status` | `VARCHAR(20)` | `pending` / `accepted` / `cancelled` |
| `invited_by` | `UUID` | `user_id` del propietario que invitó |
| `expires_at` | `DATETIME` | Fecha de expiración (creación + 7 días) |
| `accepted_at` | `DATETIME` nullable | Cuándo fue aceptada |
| `created_at` | `DATETIME` | Auto |

**Índices:**
- `token` (lookup por link del email)
- `(invitee_email, complex_id, status)` (verificación de duplicados pendientes)

---

### Archivos modificados / creados

| Capa | Archivo | Qué se agregó |
|------|---------|---------------|
| Dominio | `complexes/domain/entities.py` | `ComplexInvitationEntity` |
| Dominio | `complexes/domain/exceptions.py` | 5 excepciones de invitación |
| Infraestructura | `complexes/infrastructure/models.py` | `ComplexInvitationModel` |
| Infraestructura | `complexes/infrastructure/repositories.py` | 7 métodos + mapper |
| Migración | `complexes/migrations/0010_add_complex_invitation_model.py` | Tabla + índices |
| Aplicación | `complexes/application/dto.py` | `SendInvitationInputDTO`, `ComplexInvitationOutputDTO` |
| Aplicación | `complexes/application/commands.py` | `SendComplexInvitationCommand`, `AcceptComplexInvitationCommand`, `CancelComplexInvitationCommand` |
| Aplicación | `complexes/application/queries.py` | `GetInvitationByTokenQuery`, `ListComplexInvitationsQuery` |
| Identidad | `identity/application/commands.py` | `AddRoleToUserCommand` |
| Identidad | `identity/infrastructure/repositories.py` | `add_role_to_user()` |
| API | `complexes/interfaces/api/serializers.py` | 4 serializers de invitación (incl. `RegisterAndAcceptSerializer`) |
| API | `complexes/interfaces/api/views.py` | 7 vistas de invitación (incl. `RegisterAndAcceptInvitationView`, `JoinSuccessView`) |
| API | `complexes/interfaces/api/urls.py` | 6 rutas nuevas |
| HTML | `complexes/templates/complexes/join_success.html` | Página de éxito server-rendered |
| Config | `canchapp/settings.py` | `FRONTEND_URL = os.getenv("FRONTEND_URL", "")` |
| Config | `.env.example` | Variable `FRONTEND_URL` documentada |
| Config | `canchapp/urls.py` | Ruta `GET /join/<token>/success/` |
| Notificaciones | `notifications/domain/services.py` | Evento `COMPLEX_MANAGER_INVITED` |
| Notificaciones | `notifications/infrastructure/dispatchers/email_dispatcher.py` | Soporte `invitation_link` en contexto |
| Notificaciones | `notifications/templates/.../complex_manager_invitation.html` | Botón CTA con deep link |
| Aplicación | `complexes/application/commands.py` | `RegisterAndAcceptInvitationCommand` + deep link en `_dispatch_invitation_email` |
| Tests | `complexes/tests/test_invitations.py` | 30 tests (unit + integración) — **30/30 passing** |
