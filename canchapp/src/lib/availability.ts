import type { ApiError } from '../services/ApiClient';
import type { ComplexField, ComplexFieldType, TimeSlotData } from '../types/field';
import type {
  AlternativeTimeBlock,
  AvailabilityFieldResult,
  AvailabilityFormErrors,
  AvailabilityQuery,
  AvailabilityStatus,
  PaymentMethodId,
  PaymentMethodOption,
  QuickBookingFormErrors,
} from '../types/availability';
import { localTodayISO } from '../services/SchedulingService';

export const FIELD_TYPE_LABELS: Record<ComplexFieldType, string> = {
  futbol_5: 'Fútbol 5',
  futbol_7: 'Fútbol 7',
  futbol_11: 'Fútbol 11',
  microfutbol: 'Microfútbol',
  futsal: 'Futsal',
};

export const FIELD_TYPE_OPTIONS: { value: ComplexFieldType; label: string }[] = (
  Object.keys(FIELD_TYPE_LABELS) as ComplexFieldType[]
).map((value) => ({ value, label: FIELD_TYPE_LABELS[value] }));

/** Métodos de pago habilitados para reservas presenciales. */
export const PAYMENT_METHODS: PaymentMethodOption[] = [
  { id: 'cash', label: 'Efectivo' },
  { id: 'nequi', label: 'Nequi' },
  { id: 'daviplata', label: 'Daviplata' },
  { id: 'transfer', label: 'Transferencia' },
  { id: 'card', label: 'Tarjeta' },
];

/** Máximo de bloques horarios alternativos que se sugieren cuando no hay cupo. */
export const MAX_ALTERNATIVE_BLOCKS = 4;

/** Duración asumida de una franja cuando el backend no informa la hora de fin. */
export const DEFAULT_SLOT_MINUTES = 60;

const MIN_PHONE_DIGITS = 7;
const MAX_PHONE_DIGITS = 15;
const MIN_NAME_LENGTH = 2;

/** Convierte "HH:mm" (24h) a minutos desde medianoche; null si el formato es inválido. */
export const timeToMinutes = (value: string): number | null => {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};

/** Convierte minutos desde medianoche a "HH:mm" (24h). */
export const minutesToTime = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/** Convierte minutos desde medianoche a una etiqueta de 12 horas, ej. "07:00 PM". */
export const minutesToLabel = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = ((h + 11) % 12) + 1;
  return `${String(hour12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
};

export const isValidISODate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  );
};

/** Fecha larga en español para mostrar al administrador, ej. "domingo, 18 de octubre". */
export const formatLongDate = (isoDate: string): string => {
  if (!isValidISODate(isoDate)) return isoDate;
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
};

/** Hora de inicio de una franja en minutos desde medianoche (hora local del navegador). */
export const slotStartMinutes = (slot: TimeSlotData): number | null => {
  if (!slot.startIso) return null;
  const start = new Date(slot.startIso);
  if (Number.isNaN(start.getTime())) return null;
  return start.getHours() * 60 + start.getMinutes();
};

export const slotDurationMinutes = (slot: TimeSlotData): number => {
  if (slot.startIso && slot.endIso) {
    const diff = Math.round(
      (new Date(slot.endIso).getTime() - new Date(slot.startIso).getTime()) / 60000,
    );
    if (Number.isFinite(diff) && diff > 0) return diff;
  }
  return DEFAULT_SLOT_MINUTES;
};

/** Tarifa por hora a partir del precio de la franja y su duración real. */
export const hourlyRateOf = (slot: TimeSlotData): number =>
  Math.round((slot.price * 60) / slotDurationMinutes(slot));

export interface FieldSlotsEntry {
  field: ComplexField;
  complexName: string;
  slots: TimeSlotData[];
}

const STATUS_ORDER: Record<AvailabilityStatus, number> = {
  available: 0,
  occupied: 1,
  maintenance: 2,
};

/**
 * Determina el estado de una cancha para la hora solicitada.
 * Si el horario solicitado ya pasó en la fecha de hoy, se marca como no disponible (isPast: true)
 * para evitar reservas retroactivas.
 * Devuelve null cuando la cancha no tiene una franja que inicie a esa hora y no está en mantenimiento.
 */
export const buildFieldResult = (
  entry: FieldSlotsEntry,
  requestedMinutes: number,
  queryDate?: string,
  now: Date = new Date(),
): AvailabilityFieldResult | null => {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const isPastTime =
    queryDate && queryDate < localTodayISO()
      ? true
      : queryDate === localTodayISO()
        ? requestedMinutes <= currentMinutes
        : false;

  const matches = entry.slots.filter((slot) => slotStartMinutes(slot) === requestedMinutes);
  const match = matches.find((slot) => slot.status !== 'taken') ?? matches[0];
  const isMaintenance =
    entry.field.status === 'maintenance' || match?.blockReason === 'maintenance';

  if (!match && !isMaintenance) return null;

  const isPast =
    isPastTime ||
    match?.blockReason === 'past' ||
    Boolean(match?.startIso && new Date(match.startIso).getTime() <= now.getTime());

  const status: AvailabilityStatus = isMaintenance
    ? 'maintenance'
    : isPast || !match || match.status === 'taken'
      ? 'occupied'
      : 'available';

  return {
    fieldId: entry.field.fieldId,
    fieldName: entry.field.name,
    fieldType: entry.field.type,
    complexId: entry.field.complexId,
    complexName: entry.complexName,
    status,
    isPast,
    slotId: isPast ? null : (match?.id ?? null),
    hourlyRate: match ? hourlyRateOf(match) : null,
    startIso: match?.startIso,
    endIso: match?.endIso,
    timeLabel: minutesToLabel(requestedMinutes),
  };
};

export const compareFieldResults = (
  a: AvailabilityFieldResult,
  b: AvailabilityFieldResult,
): number =>
  STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
  a.fieldName.localeCompare(b.fieldName, 'es', { numeric: true });

/**
 * Sugiere los bloques horarios libres más cercanos a la hora solicitada, respetando
 * las canchas (sede y tipo) ya filtradas. Excluye canchas en mantenimiento, franjas
 * ocupadas y franjas que ya comenzaron o pasaron.
 */
export const findAlternativeBlocks = (
  entries: FieldSlotsEntry[],
  requestedMinutes: number,
  now: Date = new Date(),
  max: number = MAX_ALTERNATIVE_BLOCKS,
  queryDate?: string,
): AlternativeTimeBlock[] => {
  const blocks = new Map<number, AlternativeTimeBlock>();
  const isToday = queryDate ? queryDate === localTodayISO() : true;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  for (const entry of entries) {
    if (entry.field.status !== 'active') continue;

    for (const slot of entry.slots) {
      if (slot.status === 'taken' || slot.blockReason === 'past') continue;
      const minutes = slotStartMinutes(slot);
      if (minutes === null || minutes === requestedMinutes) continue;
      // Descartar si el horario ya pasó en el día de hoy
      if (isToday && minutes <= currentMinutes) continue;
      if (slot.startIso && new Date(slot.startIso).getTime() <= now.getTime()) continue;

      const block = blocks.get(minutes) ?? {
        minutes,
        time: minutesToTime(minutes),
        timeLabel: minutesToLabel(minutes),
        fields: [],
      };
      block.fields.push({
        fieldId: entry.field.fieldId,
        fieldName: entry.field.name,
        slotId: slot.id,
        hourlyRate: hourlyRateOf(slot),
      });
      blocks.set(minutes, block);
    }
  }

  return [...blocks.values()]
    .sort(
      (a, b) =>
        Math.abs(a.minutes - requestedMinutes) - Math.abs(b.minutes - requestedMinutes) ||
        a.minutes - b.minutes,
    )
    .slice(0, max)
    .map((block) => ({
      ...block,
      fields: [...block.fields].sort((a, b) =>
        a.fieldName.localeCompare(b.fieldName, 'es', { numeric: true }),
      ),
    }));
};

/**
 * Valida los datos de la barra de búsqueda. La sede es obligatoria únicamente
 * cuando el administrador gestiona más de un complejo (o aún no hay una sede seleccionada).
 * Impide buscar disponibilidad en una hora que ya haya pasado para el día de hoy.
 */
export const validateAvailabilityQuery = (
  input: Pick<AvailabilityQuery, 'complexId' | 'date' | 'time'>,
  todayISO: string,
  now: Date = new Date(),
): AvailabilityFormErrors => {
  const errors: AvailabilityFormErrors = {};

  if (!input.complexId) {
    errors.complexId = 'Selecciona la sede antes de buscar.';
  }

  if (!input.date) {
    errors.date = 'La fecha es obligatoria.';
  } else if (!isValidISODate(input.date)) {
    errors.date = 'La fecha no es válida.';
  } else if (input.date < todayISO) {
    errors.date = 'La fecha no puede ser anterior a hoy.';
  }

  if (!input.time) {
    errors.time = 'La hora de inicio es obligatoria.';
  } else {
    const requestedMinutes = timeToMinutes(input.time);
    if (requestedMinutes === null) {
      errors.time = 'La hora no es válida.';
    } else if (input.date === todayISO) {
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      if (requestedMinutes <= currentMinutes) {
        errors.time = 'La hora seleccionada ya pasó. Elige un horario futuro.';
      }
    }
  }

  return errors;
};

export const isPaymentMethodId = (value: string): value is PaymentMethodId =>
  PAYMENT_METHODS.some((method) => method.id === value);

export const getPaymentMethodLabel = (id: string): string =>
  PAYMENT_METHODS.find((method) => method.id === id)?.label ?? id;

/** Una reserva presencial exige, como mínimo, nombre y teléfono del jugador y un método de pago. */
export const validateQuickBooking = (input: {
  clientName: string;
  clientPhone: string;
  paymentMethod: string;
}): QuickBookingFormErrors => {
  const errors: QuickBookingFormErrors = {};

  if (input.clientName.trim().length < MIN_NAME_LENGTH) {
    errors.clientName = 'Ingresa el nombre del jugador.';
  }

  const phone = input.clientPhone.trim();
  const phoneDigits = phone.replace(/\D/g, '').length;
  if (!phone) {
    errors.clientPhone = 'Ingresa el teléfono del jugador.';
  } else if (
    !/^\+?[\d\s()-]+$/.test(phone) ||
    phoneDigits < MIN_PHONE_DIGITS ||
    phoneDigits > MAX_PHONE_DIGITS
  ) {
    errors.clientPhone = 'Ingresa un teléfono válido (7 a 15 dígitos).';
  }

  if (!isPaymentMethodId(input.paymentMethod)) {
    errors.paymentMethod = 'Selecciona un método de pago.';
  }

  return errors;
};

/** Extrae un mensaje legible de un ApiError o Error desconocido. */
export const extractErrorMessage = (error: unknown, fallback: string): string => {
  if (error && typeof error === 'object') {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return fallback;
};

const CONFLICT_PATTERN =
  /unavailable|not available|already|booked|taken|conflict|ocupad|no disponible|reservad|ya no est/i;

/**
 * Indica si un error de la API corresponde a un conflicto de horario
 * (la franja fue tomada antes de confirmar).
 */
export const isSlotConflictError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const apiError = error as Partial<ApiError>;
  if (apiError.status === 409) return true;
  if (apiError.status === 400 || apiError.status === 422) {
    return CONFLICT_PATTERN.test(`${apiError.code ?? ''} ${apiError.message ?? ''}`);
  }
  return false;
};
