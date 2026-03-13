import ApiClient from './ApiClient';
import type { Field, Sport, TimeSlotData } from '../types/field';

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

function defaultAvailability(price: number): TimeSlotData[] {
  return FALLBACK_TIMES.map((slot, idx) => {
    const [time, period] = slot.split(' ');
    return {
      id: `slot-${idx}`,
      time,
      period: period as 'AM' | 'PM',
      price,
      status: 'available',
    };
  });
}

function toTimeSlotData(item: TimeSlotOutput, idx: number): TimeSlotData {
  const start = item.start_datetime ? new Date(item.start_datetime) : null;
  const hh = start ? start.getHours() : 8 + idx;
  const mm = start ? String(start.getMinutes()).padStart(2, '0') : '00';
  const period: 'AM' | 'PM' = hh >= 12 ? 'PM' : 'AM';
  const hour12 = ((hh + 11) % 12) + 1;

  return {
    id: item.time_slot_id ?? `slot-${idx}`,
    time: `${hour12}:${mm}`,
    period,
    price: Number(item.price ?? 0),
    status: item.status === 'booked' || item.status === 'taken' ? 'taken' : 'available',
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
          availability: defaultAvailability(price),
          isFavorite: false,
          capacity: sport === 'futbol11' ? 22 : sport === 'futbol7' ? 14 : 10,
        } as Field;
      });
  },

  getFieldTimeSlots: async (fieldId: string, dateISO: string): Promise<TimeSlotData[]> => {
    const query = new URLSearchParams({ date: dateISO }).toString();
    const res = await ApiClient.get<ApiResponse<TimeSlotOutput[]>>(`/scheduling/fields/${fieldId}/time-slots/?${query}`);

    const slots = Array.isArray(res.data) ? res.data : [];
    return slots.map((item, idx) => toTimeSlotData(item, idx));
  },
};

export default schedulingService;
