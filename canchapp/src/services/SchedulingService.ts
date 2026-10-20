import ApiClient from './ApiClient';
import type { Field, Sport, TimeSlotData } from '../types/field';
import type { GridData, MoveResult } from '../types/grid';

interface ApiResponse<T> {
  data: T;
  success?: boolean;
  message: string;
  meta?: Record<string, string | number | boolean>;
}

interface TimeSlotOutput {
  time_slot_id?: string;
  start_datetime?: string;
  end_datetime?: string;
  price?: number;
  status?: string;
  is_available?: boolean;
}

interface FieldAvailabilityOutput {
  field_id?: string;
  field_name?: string;
  field_type?: string;
  city?: string;
  complex_name?: string;
  distance_km?: number;
  min_slot_price?: number;
  max_slot_price?: number;
}

type RawRecord = Record<string, unknown>;

function extractArray(value: unknown): RawRecord[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is RawRecord => !!item && typeof item === 'object');
  }

  if (value && typeof value === 'object') {
    const obj = value as RawRecord;
    const keys = ['items', 'results', 'data', 'fields', 'time_slots'];
    for (const key of keys) {
      const candidate = obj[key];
      if (Array.isArray(candidate)) {
        return candidate.filter((item): item is RawRecord => !!item && typeof item === 'object');
      }
    }
  }

  return [];
}

const FALLBACK_TIMES = [
  '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
  '12:00 PM', '1:00 PM', '3:00 PM', '5:00 PM',
  '7:00 PM', '8:00 PM', '9:00 PM', '10:00 PM',
];

function parseSport(fieldType?: string): { sport: Sport; sportLabel: string } {
  const t = (fieldType ?? '').toLowerCase();
  if (t.includes('11')) return { sport: 'futbol11', sportLabel: 'Fútbol 11' };
  if (t.includes('7')) return { sport: 'futbol7', sportLabel: 'Fútbol 7' };
  if (t.includes('micro')) return { sport: 'microfutbol', sportLabel: 'Microfútbol' };
  return { sport: 'futbol5', sportLabel: 'Fútbol 5' };
}

function defaultAvailability(price: number, dateISO?: string): TimeSlotData[] {
  const targetDate = dateISO || localTodayISO();
  const isToday = targetDate === localTodayISO();
  const now = new Date();

  return FALLBACK_TIMES.map((slot, idx) => {
    const [time, period] = slot.split(' ');
    const parts = time.split(':');
    let h = parseInt(parts[0], 10);
    const m = parseInt(parts[1] || '0', 10);
    if (period === 'PM' && h < 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;

    const slotDate = new Date(`${targetDate}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`);
    const isPast = isToday && slotDate.getTime() <= now.getTime();

    return {
      id: `slot-${idx}`,
      time,
      period: period as 'AM' | 'PM',
      price,
      status: isPast ? 'taken' : 'available',
      startIso: slotDate.toISOString(),
      blockReason: isPast ? 'past' : undefined,
    };
  });
}

export function localTodayISO(): string {
  return new Date().toLocaleDateString('en-CA');
}

function toTimeSlotData(item: TimeSlotOutput, idx: number, dateISO?: string): TimeSlotData {
  let start = item.start_datetime ? new Date(item.start_datetime) : null;
  const hh = start ? start.getHours() : 8 + idx;
  const mm = start ? String(start.getMinutes()).padStart(2, '0') : '00';
  const period: 'AM' | 'PM' = hh >= 12 ? 'PM' : 'AM';
  const hour12 = ((hh + 11) % 12) + 1;

  const targetDate = dateISO || (item.start_datetime ? item.start_datetime.split('T')[0] : localTodayISO());
  if (!start && targetDate) {
    start = new Date(`${targetDate}T${String(hh).padStart(2, '0')}:${mm}:00`);
  }

  const now = new Date();
  const isPast = start ? start.getTime() <= now.getTime() : false;

  const status = String(item.status ?? '').toLowerCase();
  const isMaintenance = status === 'maintenance';
  const isTaken =
    isMaintenance ||
    isPast ||
    item.is_available === false ||
    status === 'booked' ||
    status === 'taken' ||
    status === 'reserved' ||
    status === 'unavailable' ||
    status === 'blocked' ||
    status === 'inactive';

  return {
    id: item.time_slot_id ?? `slot-${idx}`,
    time: `${hour12}:${mm}`,
    period,
    price: Number(item.price ?? 0),
    status: isTaken ? 'taken' : 'available',
    startIso: item.start_datetime || (start ? start.toISOString() : undefined),
    endIso: item.end_datetime,
    blockReason: isTaken ? (isMaintenance ? 'maintenance' : (isPast ? 'past' : 'booked')) : undefined,
  };
}

const schedulingService = {
  searchAvailableFields: async (dateISO: string): Promise<Field[]> => {
    const query = new URLSearchParams({ date: dateISO, page_size: '12' }).toString();
    const res = await ApiClient.get<ApiResponse<{ items?: FieldAvailabilityOutput[] } | FieldAvailabilityOutput[]>>(
      `/scheduling/fields/search/?${query}`,
    );

    const payload = res.data;
    const items = Array.isArray(payload) ? payload : payload?.items ?? [];

    return items
      .filter((it) => it.field_id)
      .map((it, idx) => {
        const { sport, sportLabel } = parseSport(it.field_type);
        const price = Number(it.min_slot_price ?? it.max_slot_price ?? 30000);

        return {
          id: it.field_id as string,
          name: it.field_name ?? `Cancha ${idx + 1}`,
          sport,
          sportLabel,
          location: it.city ?? it.complex_name ?? 'Cerca de ti',
          distance: typeof it.distance_km === 'number' ? `${it.distance_km.toFixed(1)} km` : `${(idx + 1).toFixed(1)} km`,
          price,
          priceLabel: `$${Math.round(price / 1000)}k`,
          rating: 4.7,
          reviewCount: 50 + idx * 10,
          image: 'soccer-field',
          tags: ['turf'],
          amenities: [
            { icon: 'lightbulb', label: 'Iluminación' },
            { icon: 'shower', label: 'Duchas' },
          ],
          availability: defaultAvailability(price, dateISO),
          isFavorite: false,
          capacity: sport === 'futbol11' ? 22 : sport === 'futbol7' ? 14 : 10,
        } as Field;
      });
  },

  getFieldTimeSlots: async (fieldId: string, dateISO: string): Promise<TimeSlotData[]> => {
    const query = new URLSearchParams({ date: dateISO }).toString();
    const res = await ApiClient.get<ApiResponse<TimeSlotOutput[]>>(`/scheduling/fields/${fieldId}/time-slots/?${query}`);

    const slotsRaw = extractArray(res.data) as TimeSlotOutput[];
    return slotsRaw.map((item, idx) => toTimeSlotData(item, idx, dateISO));
  },

  getComplexSchedules: async (complexId: string): Promise<FieldSchedule[]> => {
    const res = await ApiClient.get<ApiResponse<FieldSchedule[]>>(`/scheduling/complexes/${complexId}/schedules/`);
    return Array.isArray(res.data) ? res.data : [];
  },

  createSchedule: async (complexId: string, payload: CreateSchedulePayload): Promise<FieldSchedule> => {
    const res = await ApiClient.post<ApiResponse<FieldSchedule>>(
      `/scheduling/complexes/${complexId}/schedules/`,
      payload,
      { withAuth: true },
    );
    return res.data as FieldSchedule;
  },

  createSchedulePricing: async (scheduleId: string, payload: CreateSchedulePricingPayload): Promise<SchedulePricing> => {
    const res = await ApiClient.post<ApiResponse<SchedulePricing>>(
      `/scheduling/schedules/${scheduleId}/pricings/`,
      payload,
      { withAuth: true },
    );
    return res.data as SchedulePricing;
  },

  listSchedulePricings: async (scheduleId: string): Promise<SchedulePricing[]> => {
    const res = await ApiClient.get<ApiResponse<SchedulePricing[]>>(`/scheduling/schedules/${scheduleId}/pricings/`);
    return Array.isArray(res.data) ? res.data : [];
  },

  updateSchedule: async (scheduleId: string, payload: UpdateSchedulePayload): Promise<FieldSchedule> => {
    const res = await ApiClient.put<ApiResponse<FieldSchedule>>(
      `/scheduling/schedules/${scheduleId}/`,
      payload,
      { withAuth: true },
    );
    return res.data as FieldSchedule;
  },

  deleteSchedule: async (scheduleId: string): Promise<void> => {
    await ApiClient.delete(`/scheduling/schedules/${scheduleId}/`, { withAuth: true });
  },

  updateSchedulePricing: async (pricingId: string, payload: CreateSchedulePricingPayload): Promise<SchedulePricing> => {
    const res = await ApiClient.put<ApiResponse<SchedulePricing>>(
      `/scheduling/pricings/${pricingId}/`,
      payload,
      { withAuth: true },
    );
    return res.data as SchedulePricing;
  },

  deleteSchedulePricing: async (pricingId: string): Promise<void> => {
    await ApiClient.delete(`/scheduling/pricings/${pricingId}/`, { withAuth: true });
  },

  getGrid: async (
    complexId: string,
    params: { date?: string; startDate?: string; endDate?: string },
  ): Promise<GridData> => {
    const query = new URLSearchParams();
    if (params.date) {
      query.set('date', params.date);
    } else if (params.startDate && params.endDate) {
      query.set('start_date', params.startDate);
      query.set('end_date', params.endDate);
    }
    const res = await ApiClient.get<ApiResponse<GridData>>(
      `/scheduling/complexes/${complexId}/grid/?${query.toString()}`,
      { withAuth: true },
    );
    return res.data as GridData;
  },

  moveBooking: async (bookingId: string, targetTimeSlotId: string): Promise<MoveResult> => {
    const res = await ApiClient.put<ApiResponse<MoveResult>>(
      `/bookings/${bookingId}/move/`,
      { target_time_slot_id: targetTimeSlotId },
      { withAuth: true },
    );
    return res.data as MoveResult;
  },
};

export default schedulingService;

// ─── Admin schedule types (exported for pages) ────────────────────────────────

export interface SchedulePricing {
  pricing_id: string;
  schedule_id: string;
  start_time: string;
  end_time: string;
  price: number;
  created_at: string;
  updated_at: string;
}

export interface FieldSchedule {
  schedule_id: string;
  complex_id: string;
  field_id: string | null;
  day_of_week: number;
  opening_time: string;
  closing_time: string;
  slot_duration_minutes: number;
  created_at: string;
  updated_at: string;
  pricings: SchedulePricing[];
}

export interface CreateSchedulePayload {
  field_id?: string;
  day_of_week: number;
  opening_time: string;
  closing_time: string;
  slot_duration_minutes: number;
}

export interface UpdateSchedulePayload {
  opening_time: string;
  closing_time: string;
  slot_duration_minutes: number;
}

export interface CreateSchedulePricingPayload {
  start_time: string;  // "HH:mm"
  end_time: string;    // "HH:mm"
  price: string;       // decimal string, e.g. "70000.00"
}
