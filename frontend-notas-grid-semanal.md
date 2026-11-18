# Cambios Grid Semanal — Notas para Frontend

## Endpoint modificado

`GET /api/scheduling/complexes/{complex_id}/grid/`

Ahora soporta **dos modos**: día único y rango de fechas (máx 7 días).

---

## Parámetros query

| Modo | Parámetros | Ejemplo |
|---|---|---|
| Día único | `?date=YYYY-MM-DD` | `?date=2026-10-20` |
| Rango | `?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD` | `?start_date=2026-10-20&end_date=2026-10-26` |

**Reglas:**
- No se pueden mezclar `date` con `start_date`/`end_date`
- Si no se envía nada → 400
- `start_date` debe ser ≤ `end_date`
- Rango máximo: 7 días

---

## Cambios en la response

### 1. `date` se reemplaza por `start_date` + `end_date`

**Antes:**
```json
{
  "complex_id": "uuid",
  "complex_name": "Canchas El Golazo",
  "date": "2026-10-20",
  "fields": [...]
}
```

**Ahora (modo día único):**
```json
{
  "complex_id": "uuid",
  "complex_name": "Canchas El Golazo",
  "start_date": "2026-10-20",
  "end_date": "2026-10-20",
  "fields": [...]
}
```

**Ahora (modo rango):**
```json
{
  "complex_id": "uuid",
  "complex_name": "Canchas El Golazo",
  "start_date": "2026-10-20",
  "end_date": "2026-10-26",
  "fields": [...]
}
```

### 2. Nuevo campo `slot_date` en cada slot

En modo rango, cada slot incluye `slot_date` (YYYY-MM-DD) para indicar a qué día pertenece. En modo día único es `null`.

```json
{
  "time_slot_id": "uuid",
  "field_id": "uuid",
  "start_datetime": "2026-10-20T23:00:00Z",
  "end_datetime": "2026-10-21T00:00:00Z",
  "price": 80000.0,
  "status": "available",
  "booking_id": null,
  "user_id": null,
  "user_name": null,
  "booking_status": null,
  "slot_date": "2026-10-20"
}
```

**Nota importante:** `slot_date` se calcula en hora local (America/Bogota, UTC-5), no en UTC. Si un slot tiene `start_datetime: "2026-10-21T00:00:00Z"` (medianoche UTC), su `slot_date` será `"2026-10-20"` (7pm en Bogotá).

### 3. `slot_duration_minutes` en modo rango

Cuando el rango abarca múltiples días, `slot_duration_minutes` se calcula usando el primer día del rango. Si la duración varía por día de semana en la configuración del complejo, la duración real de cada slot se puede inferir de `start_datetime` y `end_datetime`.

---

## Errores nuevos

| Código | Mensaje |
|---|---|
| 400 | "No puedes usar 'date' junto con 'start_date'/'end_date'." |
| 400 | "Debes proporcionar 'date' o 'start_date'+'end_date'." |
| 400 | "start_date debe ser menor o igual a end_date." |
| 400 | "El rango máximo es de 7 días." |

---

## Cambios en el endpoint de Reschedule (ya existente)

La response de `PATCH /api/bookings/{id}/reschedule/` ahora incluye `old_price` y `new_price`:

```json
{
  "booking_id": "uuid",
  "old_field_name": "Cancha #1",
  "new_field_name": "Cancha #2",
  "old_price": 80000.0,
  "new_price": 100000.0,
  "price_difference": 20000.0,
  "status": "confirmed",
  ...
}
```

---

## Checklist de integración frontend

- [ ] Actualizar llamada al Grid para usar `start_date`/`end_date` en vez de solo `date`
- [ ] Manejar `slot_date` en modo rango para agrupar slots por día
- [ ] Actualizar el tipo GridSlot para incluir `slot_date: string | null`
- [ ] Actualizar el tipo ScheduleGrid para usar `start_date`/`end_date` en vez de `date`
- [ ] Manejar los nuevos errores 400 de validación
- [ ] Implementar vista semanal que consume el endpoint con rango de 7 días