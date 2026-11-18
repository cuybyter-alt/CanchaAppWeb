# Prompt para Agente Frontend — HU-013 Malla Visual + Drag & Drop

## Contexto

El backend de Canchapp ya tiene implementados los endpoints para la HU-013. Necesitas implementar la interfaz de usuario para:

1. Visualizar la grilla diaria de horarios de un complejo
2. Mover reservas entre canchas/horarios mediante Drag & Drop
3. Mostrar un modal de confirmacion con el reajuste de precio antes de ejecutar el movimiento

---

## Endpoints del Backend

### 1. GET `/api/scheduling/complexes/{complex_id}/grid/?date=YYYY-MM-DD`

**Proposito:** Cargar todos los datos de la grilla para un complejo en una fecha.

**Auth:** Bearer Token JWT (rol Owner o Manager)

**Response exitosa (200):**

```json
{
  "success": true,
  "data": {
    "complex_id": "uuid",
    "complex_name": "Canchas El Golazo",
    "date": "2026-10-20",
    "fields": [
      {
        "field_id": "uuid",
        "field_name": "Cancha #1",
        "field_type": "futbol_5",
        "slot_duration_minutes": 60,
        "slots": [
          {
            "time_slot_id": "uuid",
            "field_id": "uuid",
            "start_datetime": "2026-10-20T18:00:00Z",
            "end_datetime": "2026-10-20T19:00:00Z",
            "price": 80000.0,
            "status": "available | booked | blocked",
            "booking_id": "uuid | null",
            "user_id": "uuid | null",
            "user_name": "Juan Perez | null",
            "booking_status": "pending | part_paid | confirmed | null"
          }
        ]
      }
    ]
  }
}
```

**Notas importantes:**
- `fields` es un array de canchas (columnas de la grilla)
- Cada field tiene `slots` (filas de la grilla)
- `slot_duration_minutes` puede variar por cancha (30, 60, 90, etc.)
- Los slots con `status: "booked"` tienen datos de reserva (`booking_id`, `user_name`, `booking_status`)
- Los slots con `status: "available"` pueden ser destino de un Drag & Drop
- Los timestamps vienen en UTC, convertir a hora local (America/Bogota, UTC-5)

### 2. PUT `/api/bookings/{booking_id}/move/`

**Proposito:** Ejecutar el movimiento de una reserva a otro slot.

**Auth:** Bearer Token JWT (rol Owner o Manager)

**Request body:**

```json
{
  "target_time_slot_id": "uuid-del-slot-destino"
}
```

**Response exitosa (200):**

```json
{
  "success": true,
  "data": {
    "booking_id": "uuid",
    "old_time_slot_id": "uuid",
    "new_time_slot_id": "uuid",
    "old_start_datetime": "2026-10-20T18:00:00Z",
    "new_start_datetime": "2026-10-20T19:00:00Z",
    "old_end_datetime": "2026-10-20T19:00:00Z",
    "new_end_datetime": "2026-10-20T20:00:00Z",
    "old_field_name": "Cancha #1",
    "new_field_name": "Cancha #2",
    "old_price": 80000.0,
    "new_price": 100000.0,
    "price_difference": 20000.0,
    "balance_type": "pending_payment | credit | no_change",
    "status": "confirmed",
    "updated_at": "2026-10-19T15:30:00Z"
  }
}
```

**Errores posibles:**
- 409: Slot destino no disponible
- 409: Reserva en estado invalido (canceled/rejected)
- 403: Sin permisos

---

## Implementacion sugerida

### Componente principal: `<ScheduleGrid complexId={uuid} />`

**Estado:**
```typescript
interface GridState {
  date: Date;
  complexId: string;
  complexName: string;
  fields: GridField[];
  isLoading: boolean;
  draggedBooking: DraggedBooking | null;
  showConfirmModal: boolean;
  moveResult: MoveResult | null;
}
```

**Tipos TypeScript:**
```typescript
interface GridField {
  field_id: string;
  field_name: string;
  field_type: string;
  slot_duration_minutes: number;
  slots: GridSlot[];
}

interface GridSlot {
  time_slot_id: string;
  field_id: string;
  start_datetime: string;
  end_datetime: string;
  price: number;
  status: "available" | "booked" | "blocked";
  booking_id: string | null;
  user_id: string | null;
  user_name: string | null;
  booking_status: string | null;
}

interface DraggedBooking {
  booking_id: string;
  field_id: string;
  time_slot_id: string;
  user_name: string;
  price: number;
  start_datetime: string;
  end_datetime: string;
}

interface MoveResult {
  booking_id: string;
  old_field_name: string;
  new_field_name: string;
  old_price: number;
  new_price: number;
  price_difference: number;
  balance_type: "pending_payment" | "credit" | "no_change";
  old_start_datetime: string;
  new_start_datetime: string;
  old_end_datetime: string;
  new_end_datetime: string;
}
```

### Flujo de Drag & Drop

1. **Al iniciar drag** (onDragStart):
   - Guardar el `DraggedBooking` con los datos del slot origen
   - Validar que el slot tenga `booking_id` (solo se pueden arrastrar reservas)

2. **Al hacer drop** (onDrop):
   - Obtener el `time_slot_id` del slot destino
   - Validar que el slot destino este en `status: "available"`
   - NO ejecutar el move aun — solo abrir el modal de confirmacion

3. **Modal de confirmacion:**
   - Mostrar: Cancha origen → Cancha destino
   - Mostrar: Horario origen → Horario destino
   - Mostrar: Precio anterior vs Precio nuevo
   - Mostrar: Diferencia con indicador visual (rojo si debe pagar, verde si tiene credito)
   - Boton "Confirmar movimiento" y "Cancelar"

4. **Al confirmar** (onClick confirmar):
   - Llamar a `PUT /api/bookings/{booking_id}/move/` con el `target_time_slot_id`
   - Si exito: recargar la grilla (refetch del grid endpoint)
   - Si error 409: mostrar toast "El slot destino ya no esta disponible"
   - Cerrar modal

### UX del modal de confirmacion

```
┌─────────────────────────────────────────────┐
│  Confirmar movimiento de reserva            │
│                                             │
│  Jugador: Juan Perez                        │
│                                             │
│  ┌──────────────┐    →    ┌──────────────┐  │
│  │ Cancha #1    │         │ Cancha #2    │  │
│  │ 7:00 PM      │         │ 8:00 PM      │  │
│  │ $80,000      │         │ $100,000     │  │
│  └──────────────┘         └──────────────┘  │
│                                             │
│  Diferencia de precio:                      │
│  +$20,000 COP (Saldo pendiente por pagar)   │
│                                             │
│  [Cancelar]          [Confirmar movimiento] │
└─────────────────────────────────────────────┘
```

### Colores sugeridos para los slots

| Estado | Color de fondo | Color de texto |
|---|---|---|
| `available` | blanco/gris claro | gris |
| `booked` (pending) | ambar claro | ambar oscuro |
| `booked` (part_paid) | azul claro | azul oscuro |
| `booked` (confirmed) | verde claro | verde oscuro |
| `blocked` | gris oscuro | blanco |

### Interaccion visual durante drag

- El slot que se esta arrastrando: reducir opacidad a 0.5
- Slots `available` validos: resaltar borde con color primario (ej. azul)
- Slots `booked` o `blocked`: no resaltar (no son drop targets)

---

## Dependencias sugeridas

Si usas React:
- `@dnd-kit/core` o `react-beautiful-dnd` para Drag & Drop
- `date-fns` o `dayjs` para manejo de fechas y conversion UTC→local

Si usas Vue:
- `vue-draggable-next` o `@vueuse/core` con drag events nativos

---

## Notificaciones en tiempo real

El backend envia notificaciones push al jugador cuando su reserva es movida. Si tu frontend tiene un listener de Web Push o un WebSocket, el jugador vera la notificacion automaticamente.

El evento de notificacion es `BOOKING_MOVED` con metadata:

```json
{
  "booking_id": "uuid",
  "old_field_name": "Cancha #1",
  "new_field_name": "Cancha #2",
  "price_difference": 20000.0,
  "balance_type": "pending_payment"
}
```

---

## Checklist de implementacion

- [ ] Crear componente `ScheduleGrid` con selector de fecha
- [ ] Implementar llamada al endpoint Grid y renderizado de la grilla
- [ ] Implementar Drag & Drop en los slots booked → available
- [ ] Crear modal de confirmacion con resumen de movimiento
- [ ] Implementar llamada al endpoint Move al confirmar
- [ ] Manejar errores (409 slot no disponible, 403 sin permisos)
- [ ] Refrescar la grilla despues de un move exitoso
- [ ] Mostrar notificaciones/toast de exito o error
- [ ] Convertir timestamps de UTC a hora local (America/Bogota)
- [ ] Aplicar colores diferenciados por estado de slot