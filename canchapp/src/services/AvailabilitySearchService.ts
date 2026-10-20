import type { ApiError } from './ApiClient';
import bookingService from './BookingService';
import ComplexesService from './ComplexesService';
import schedulingService, { localTodayISO } from './SchedulingService';
import {
  buildFieldResult,
  compareFieldResults,
  extractErrorMessage,
  findAlternativeBlocks,
  isSlotConflictError,
  minutesToLabel,
  timeToMinutes,
  validateAvailabilityQuery,
  validateQuickBooking,
  type FieldSlotsEntry,
} from '../lib/availability';
import type {
  AdminComplexOption,
  AvailabilityFieldResult,
  AvailabilityQuery,
  AvailabilitySearchResult,
  QuickBookingInput,
  QuickBookingOutcome,
} from '../types/availability';

const SLOT_TAKEN_MESSAGE =
  'El horario ya no está disponible. Vuelve a la búsqueda o elige una alternativa.';
const SLOT_IN_PROGRESS_MESSAGE =
  'Este horario ya se está confirmando en otra solicitud. Espera unos segundos e inténtalo de nuevo.';

/** Complejos que el administrador puede consultar; se llena en getAdminComplexes. */
let managedComplexIds: Set<string> | null = null;

/** Franjas con una confirmación en curso, para evitar envíos dobles desde esta sesión. */
const slotsBeingBooked = new Set<string>();

const buildApiError = (status: number, message: string): ApiError => ({ status, message });

const ensureComplexAccess = async (complexId: string): Promise<void> => {
  if (!managedComplexIds) {
    await availabilitySearchService.getAdminComplexes();
  }
  if (!managedComplexIds?.has(complexId)) {
    throw buildApiError(403, 'No tienes acceso al complejo seleccionado.');
  }
};

const availabilitySearchService = {
  /**
   * GET /api/complexes/manager/list/
   * Complejos donde el usuario autenticado es propietario o administrador activo.
   */
  async getAdminComplexes(): Promise<AdminComplexOption[]> {
    const complexes = await ComplexesService.getManagerComplexes({ pageSize: 100 });
    const options = complexes.map((complex) => ({ id: complex.id, name: complex.name }));
    managedComplexIds = new Set(options.map((option) => option.id));
    return options;
  },

  /**
   * Consulta en tiempo real la disponibilidad de las canchas de una sede para una fecha y hora.
   * Compone los endpoints existentes de canchas del complejo y franjas por cancha, de modo que
   * reutiliza la misma lógica de conflictos y tarifas que el flujo de reservas.
   */
  async search(
    query: AvailabilityQuery,
    complexName: string,
  ): Promise<AvailabilitySearchResult> {
    const errors = validateAvailabilityQuery(query, localTodayISO());
    const firstError = errors.complexId ?? errors.date ?? errors.time;
    if (firstError) {
      throw buildApiError(400, firstError);
    }

    await ensureComplexAccess(query.complexId);

    const requestedMinutes = timeToMinutes(query.time) as number;
    const fields = await ComplexesService.getComplexFields(query.complexId);
    const relevantFields = fields.filter(
      (field) => field.status !== 'inactive' && (!query.fieldType || field.type === query.fieldType),
    );

    const base = {
      query,
      requestedTimeLabel: minutesToLabel(requestedMinutes),
      fieldsConsulted: relevantFields.length,
    };

    if (relevantFields.length === 0) {
      return { ...base, fields: [], availableCount: 0, alternatives: [], failedFields: 0 };
    }

    const settled = await Promise.allSettled(
      relevantFields.map((field) => schedulingService.getFieldTimeSlots(field.fieldId, query.date)),
    );

    const entries: FieldSlotsEntry[] = [];
    let failedFields = 0;
    let firstFailure: unknown = null;

    settled.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        entries.push({ field: relevantFields[index], complexName, slots: result.value });
        return;
      }
      failedFields += 1;
      firstFailure = firstFailure ?? result.reason;
    });

    if (entries.length === 0) {
      throw firstFailure ?? { status: 500, message: 'No se pudo consultar la disponibilidad.' };
    }

    const results = entries
      .map((entry) => buildFieldResult(entry, requestedMinutes, query.date))
      .filter((item): item is AvailabilityFieldResult => item !== null)
      .sort(compareFieldResults);

    const availableCount = results.filter((item) => item.status === 'available').length;
    const alternatives =
      availableCount === 0 ? findAlternativeBlocks(entries, requestedMinutes, new Date(), undefined, query.date) : [];

    return { ...base, fields: results, availableCount, alternatives, failedFields };
  },

  /**
   * Crea la reserva presencial de una franja. No confía en lo mostrado por la búsqueda:
   * vuelve a consultar la franja y delega la creación al flujo transaccional existente
   * (POST /bookings/), cuyo servidor rechaza con conflicto si la franja ya fue tomada o ya pasó.
   */
  async quickBook(input: QuickBookingInput): Promise<QuickBookingOutcome> {
    const errors = validateQuickBooking(input);
    const firstError = errors.clientName ?? errors.clientPhone ?? errors.paymentMethod;
    if (firstError) {
      throw buildApiError(400, firstError);
    }

    if (input.date < localTodayISO()) {
      return { status: 'slot_unavailable', message: 'No se puede reservar en una fecha que ya pasó.' };
    }

    if (slotsBeingBooked.has(input.slotId)) {
      return { status: 'slot_unavailable', message: SLOT_IN_PROGRESS_MESSAGE };
    }

    slotsBeingBooked.add(input.slotId);
    try {
      try {
        const slots = await schedulingService.getFieldTimeSlots(input.fieldId, input.date);
        const current = slots.find((slot) => slot.id === input.slotId);
        if (!current || current.status === 'taken' || current.blockReason === 'past') {
          return {
            status: 'slot_unavailable',
            message: current?.blockReason === 'past' ? 'Este horario ya pasó y no se puede reservar.' : SLOT_TAKEN_MESSAGE,
          };
        }
      } catch {
        // Si la verificación previa falla, la decisión definitiva la toma el servidor al crear la reserva.
      }

      const created = await bookingService.createAdminBooking(
        input.slotId,
        input.clientName.trim(),
        input.clientPhone.trim(),
        input.paymentMethod,
      );
      return { status: 'created', bookingId: created.booking_id };
    } catch (error) {
      if (isSlotConflictError(error)) {
        return { status: 'slot_unavailable', message: SLOT_TAKEN_MESSAGE };
      }
      throw {
        ...(typeof error === 'object' && error !== null ? error : {}),
        message: extractErrorMessage(error, 'No se pudo crear la reserva. Inténtalo de nuevo.'),
      };
    } finally {
      slotsBeingBooked.delete(input.slotId);
    }
  },
};

export default availabilitySearchService;
