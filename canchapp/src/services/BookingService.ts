import ApiClient from './ApiClient';
import authService from './AuthService';
import type { ApiError } from './ApiClient';
import type { Booking, Sport } from '../types/field';

interface ApiResponse<T> {
  data: T;
  success?: boolean;
  message: string;
  meta?: Record<string, string | number | boolean>;
}

export interface BookingOutput {
  booking_id: string;
  time_slot_id: string;
  status?: string;
  is_approved?: boolean;
  total_price?: number;
}

type RawRecord = Record<string, unknown>;

function toRecords(arr: unknown[]): RawRecord[] {
  return arr.filter((i): i is RawRecord => !!i && typeof i === 'object');
}

function extractItems(data: unknown): RawRecord[] {
  if (Array.isArray(data)) return toRecords(data);
  if (data && typeof data === 'object') {
    const d = data as RawRecord;
    // { data: [...] }
    if (Array.isArray(d.data)) return toRecords(d.data as unknown[]);
    // { data: { items: [...] } }  — paginated envelope
    if (d.data && typeof d.data === 'object') {
      const nested = d.data as RawRecord;
      for (const key of ['items', 'results', 'bookings']) {
        if (Array.isArray(nested[key])) return toRecords(nested[key] as unknown[]);
      }
    }
    // flat keys
    for (const key of ['results', 'items', 'bookings']) {
      if (Array.isArray(d[key])) return toRecords(d[key] as unknown[]);
    }
  }
  return [];
}

function parseSport(fieldType?: string): { sport: Sport; sportLabel: string } {
  const t = (fieldType ?? '').toLowerCase();
  if (t.includes('11')) return { sport: 'futbol11', sportLabel: 'Fútbol 11' };
  if (t.includes('7')) return { sport: 'futbol7', sportLabel: 'Fútbol 7' };
  if (t.includes('micro') || t.includes('futsal')) return { sport: 'microfutbol', sportLabel: 'Microfútbol' };
  return { sport: 'futbol5', sportLabel: 'Fútbol 5' };
}

function formatDate(isoString?: string): string {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatTime(isoString?: string): string {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function mapStatus(raw?: string, isApproved?: boolean): Booking['status'] {
  if (raw === 'cancelled' || raw === 'canceled') return 'cancelled';
  if (isApproved || raw === 'confirmed' || raw === 'active') return 'confirmed';
  return 'pending';
}

function mapBackendBooking(raw: RawRecord): Booking {
  const slot = raw.time_slot as RawRecord | undefined;
  const slotField = slot ? (slot.field as RawRecord | undefined) : undefined;
  const startDt = (raw.start_datetime ?? slot?.start_datetime) as string | undefined;
  const endDt = (raw.end_datetime ?? slot?.end_datetime) as string | undefined;
  const fieldName = (raw.field_name ?? slotField?.name ?? '—') as string;
  const fieldType = (raw.field_type ?? slotField?.field_type ?? raw.sport) as string | undefined;
  const { sport, sportLabel } = parseSport(fieldType);
  const price = (raw.total_price ?? slot?.price ?? 0) as number;

  let duration = '60 min';
  if (startDt && endDt) {
    const mins = Math.round((new Date(endDt).getTime() - new Date(startDt).getTime()) / 60000);
    duration = `${mins} min`;
  }

  return {
    id: (raw.booking_id ?? raw.id ?? '') as string,
    fieldId: (raw.field_id ?? slotField?.field_id ?? '') as string,
    fieldName,
    sport,
    sportLabel,
    date: formatDate(startDt),
    time: formatTime(startDt),
    duration,
    players: (raw.players ?? 0) as number,
    status: mapStatus(raw.status as string, raw.is_approved as boolean),
    price,
  };
}

const bookingService = {
  createBooking: async (timeSlotId: string): Promise<BookingOutput> => {
    try {
      const res = await ApiClient.post<ApiResponse<BookingOutput>>('/bookings/', {
        time_slot_id: timeSlotId,
      }, {
        withAuth: true,
      });

      return res.data;
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError?.status === 401) {
        await authService.refreshToken();
        const retry = await ApiClient.post<ApiResponse<BookingOutput>>('/bookings/', {
          time_slot_id: timeSlotId,
        }, {
          withAuth: true,
        });
        return retry.data;
      }

      throw error;
    }
  },

  getBookings: async (): Promise<Booking[]> => {
    try {
      const res = await ApiClient.get<unknown>('/bookings/', { withAuth: true });
      return extractItems(res).map(mapBackendBooking);
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError?.status === 401) {
        await authService.refreshToken();
        const retry = await ApiClient.get<unknown>('/bookings/', { withAuth: true });
        return extractItems(retry).map(mapBackendBooking);
      }
      throw error;
    }
  },

  getMyBookings: async (params?: {
    page?: number;
    page_size?: number;
    status?: 'active' | 'canceled' | 'inactive';
    is_approved?: boolean;
  }): Promise<Booking[]> => {
    const query = new URLSearchParams();
    if (params?.page !== undefined) query.set('page', String(params.page));
    if (params?.page_size !== undefined) query.set('page_size', String(params.page_size));
    if (params?.status !== undefined) query.set('status', params.status);
    if (params?.is_approved !== undefined) query.set('is_approved', String(params.is_approved));
    const qs = query.toString();
    const path = `/bookings/my/${qs ? `?${qs}` : ''}`;

    const fetchOnce = async () => {
      const res = await ApiClient.get<unknown>(path, { withAuth: true });
      return extractItems(res).map(mapBackendBooking);
    };

    try {
      return await fetchOnce();
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError?.status === 401) {
        await authService.refreshToken();
        return await fetchOnce();
      }
      throw error;
    }
  },
};

export default bookingService;
