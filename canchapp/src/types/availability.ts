import type { ComplexFieldType } from './field';

/** Semáforo de estado de una cancha para la franja consultada. */
export type AvailabilityStatus = 'available' | 'occupied' | 'maintenance';

export type PaymentMethodId = 'cash' | 'nequi' | 'daviplata' | 'transfer' | 'card';

export interface PaymentMethodOption {
  id: PaymentMethodId;
  label: string;
}

export interface AdminComplexOption {
  id: string;
  name: string;
}

export interface AvailabilityQuery {
  complexId: string;
  /** Fecha en formato YYYY-MM-DD */
  date: string;
  /** Hora de inicio en formato HH:mm (24h) */
  time: string;
  /** Filtro opcional; si se omite se consideran todos los tipos de cancha */
  fieldType?: ComplexFieldType;
}

export interface AvailabilityFieldResult {
  fieldId: string;
  fieldName: string;
  fieldType: ComplexFieldType;
  complexId: string;
  complexName: string;
  status: AvailabilityStatus;
  /** Indica si el horario ya pasó de hora en la fecha actual */
  isPast?: boolean;
  /** Identificador de la franja consultada (null si la cancha no tiene franja en ese horario) */
  slotId: string | null;
  /** Tarifa por hora en COP (null si no hay franja con tarifa) */
  hourlyRate: number | null;
  startIso?: string;
  endIso?: string;
  /** Hora consultada, ej. "07:00 PM" */
  timeLabel: string;
}

export interface AlternativeFieldSlot {
  fieldId: string;
  fieldName: string;
  slotId: string;
  hourlyRate: number;
}

/** Bloque horario libre cercano al solicitado, con las canchas que lo ofrecen. */
export interface AlternativeTimeBlock {
  /** Minutos desde medianoche */
  minutes: number;
  /** Hora en formato HH:mm (24h), útil para relanzar la búsqueda */
  time: string;
  timeLabel: string;
  fields: AlternativeFieldSlot[];
}

export interface AvailabilitySearchResult {
  query: AvailabilityQuery;
  requestedTimeLabel: string;
  /** Tarjetas de cancha: disponibles primero, luego ocupadas y en mantenimiento */
  fields: AvailabilityFieldResult[];
  availableCount: number;
  alternatives: AlternativeTimeBlock[];
  /** Canchas consideradas por la búsqueda (activas y que cumplen el filtro de tipo) */
  fieldsConsulted: number;
  /** Canchas cuya agenda no pudo consultarse */
  failedFields: number;
}

export interface QuickBookingInput {
  fieldId: string;
  slotId: string;
  date: string;
  clientName: string;
  clientPhone: string;
  paymentMethod: PaymentMethodId;
}

export type QuickBookingOutcome =
  | { status: 'created'; bookingId: string }
  | { status: 'slot_unavailable'; message: string };

export interface AvailabilityFormErrors {
  complexId?: string;
  date?: string;
  time?: string;
}

export interface QuickBookingFormErrors {
  clientName?: string;
  clientPhone?: string;
  paymentMethod?: string;
}
