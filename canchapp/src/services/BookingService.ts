import ApiClient from './ApiClient';
import authService from './AuthService';
import type { ApiError } from './ApiClient';
import type { Booking, Sport } from '../types/field';
import type { BookingConfirmation, BookingConfirmationResponse } from '../types/notification';

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

export interface AdminBookingRow {
  id: string;
  userId: string;
  customerName: string;
  approval: 'approved' | 'pending';
  fieldName: string;
  fieldId: string;
  complexName: string;
  timeSlotId: string;
  timeRange: string;
  phone: string;
  totalLabel: string;
  totalPrice: number;
  status: 'active' | 'canceled';
  isManual?: boolean;
  createdByAdmin?: boolean;
  startIso?: string;
}

const MANUAL_BOOKING_META_KEY = 'canchapp_manual_booking_meta';

/** El backend no persiste client_name; guardamos metadatos de reservas manuales en local. */
export const manualBookingMetaStorage = {
  get(bookingId: string): { clientName: string; phone?: string } | null {
    try {
      const raw = localStorage.getItem(MANUAL_BOOKING_META_KEY);
      if (!raw) return null;
      const all = JSON.parse(raw) as Record<string, { clientName: string; phone?: string }>;
      return all[bookingId] ?? null;
    } catch {
      return null;
    }
  },
  save(bookingId: string, meta: { clientName: string; phone?: string }) {
    if (!bookingId) return;
    try {
      const raw = localStorage.getItem(MANUAL_BOOKING_META_KEY);
      const all = raw ? (JSON.parse(raw) as Record<string, { clientName: string; phone?: string }>) : {};
      all[bookingId] = meta;
      localStorage.setItem(MANUAL_BOOKING_META_KEY, JSON.stringify(all));
    } catch {
      /* ignore quota errors */
    }
  },
};

function formatPersonName(user: {
  f_name?: string | null;
  l_name?: string | null;
  username?: string | null;
  email?: string;
}): string {
  const full = `${user.f_name ?? ''} ${user.l_name ?? ''}`.trim();
  if (full) return full;
  if (user.username?.trim()) return user.username.trim();
  if (user.email?.trim()) return user.email.trim();
  return 'Usuario';
}

function pickCustomerName(raw: RawRecord, user?: { f_name?: string | null; l_name?: string | null; username?: string | null; email?: string } | null): string {
  const nestedUser = raw.user as RawRecord | undefined;
  const fromApi =
    (typeof raw.client_name === 'string' && raw.client_name.trim()) ||
    (typeof raw.customer_name === 'string' && raw.customer_name.trim()) ||
    (nestedUser && formatPersonName({
      f_name: nestedUser.f_name as string,
      l_name: nestedUser.l_name as string,
      username: nestedUser.username as string,
      email: nestedUser.email as string,
    }));

  if (fromApi) return fromApi;
  if (user) return formatPersonName(user);
  return '—';
}

function pickPhone(raw: RawRecord, user?: { phone_number?: string | null } | null): string {
  if (typeof raw.phone === 'string' && raw.phone.trim()) return raw.phone.trim();
  if (user?.phone_number?.trim()) return user.phone_number.trim();
  return '—';
}

type RawRecord = Record<string, unknown>;

function toRecords(arr: unknown[]): RawRecord[] {
  return arr.filter((i): i is RawRecord => !!i && typeof i === 'object');
}

function parseBookingsTotal(res: unknown): number {
  if (res && typeof res === 'object') {
    const r = res as RawRecord;
    const data = r.data;
    if (data && typeof data === 'object' && typeof (data as RawRecord).total === 'number') {
      return (data as RawRecord).total as number;
    }
    if (typeof r.total === 'number') return r.total;
    const meta = r.meta;
    if (meta && typeof meta === 'object' && typeof (meta as RawRecord).total === 'number') {
      return (meta as RawRecord).total as number;
    }
  }
  return extractItems(res).length;
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
  if (raw === 'cancelled' || raw === 'canceled' || raw === 'rejected') return 'cancelled';
  if (isApproved || raw === 'confirmed' || raw === 'active' || raw === 'accepted') return 'confirmed';
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
    complexId: (raw.complex_id ?? slotField?.complex_id ?? '') as string,
    complexName: (raw.complex_name ?? slotField?.complex_name ?? '—') as string,
    fieldName,
    sport,
    sportLabel,
    date: formatDate(startDt),
    time: formatTime(startDt),
    endTime: formatTime(endDt),
    duration,
    players: (raw.players ?? 0) as number,
    status: mapStatus(raw.status as string, raw.is_approved as boolean),
    price,
    startIso: startDt,
  };
}

function mapToAdminBookingRow(
  raw: RawRecord,
  user?: { f_name?: string | null; l_name?: string | null; username?: string | null; email?: string; phone_number?: string | null } | null,
): AdminBookingRow {
  const slot = raw.time_slot as RawRecord | undefined;
  const slotField = slot ? (slot.field as RawRecord | undefined) : undefined;
  const startDt = (raw.start_datetime ?? slot?.start_datetime) as string | undefined;
  const endDt = (raw.end_datetime ?? slot?.end_datetime) as string | undefined;
  const fieldName = (raw.field_name ?? slotField?.name ?? '—') as string;
  const price = (raw.total_price ?? slot?.price ?? 0) as number;
  const status = (raw.status ?? 'active') as string;
  const isApproved = status === 'accepted' || status === 'confirmed' || (raw.is_approved as boolean);
  const bookingId = (raw.booking_id ?? raw.id ?? '') as string;
  const manualMeta = manualBookingMetaStorage.get(bookingId);

  let timeRange = '—';
  if (startDt && endDt) {
    const start = new Date(startDt);
    const end = new Date(endDt);
    const startStr = start.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false });
    const endStr = end.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false });
    timeRange = `${startStr} - ${endStr}`;
  }

  return {
    id: bookingId,
    userId: String(raw.user_id ?? ''),
    customerName: manualMeta?.clientName ?? pickCustomerName(raw, user),
    approval: isApproved ? 'approved' : 'pending',
    fieldName,
    fieldId: (raw.field_id ?? slotField?.field_id ?? '') as string,
    complexName: (raw.complex_name ?? '—') as string,
    timeSlotId: (raw.time_slot_id ?? '') as string,
    timeRange,
    phone: manualMeta?.phone ?? pickPhone(raw, user),
    totalLabel: `$${price.toLocaleString('es-CO')}`,
    totalPrice: price,
    status: status === 'rejected' || status === 'cancelled' || status === 'canceled' ? 'canceled' : 'active',
    isManual: (raw.created_by_admin ?? false) as boolean,
    createdByAdmin: (raw.created_by_admin ?? false) as boolean,
    startIso: startDt,
  };
}

async function enrichAdminBookingsFromApi(items: RawRecord[]): Promise<AdminBookingRow[]> {
  const userCache = new Map<string, Awaited<ReturnType<typeof authService.getUserProfile>> | null>();
  const userIds = [
    ...new Set(
      items
        .map((item) => String(item.user_id ?? ''))
        .filter((id) => id.length > 0),
    ),
  ];

  await Promise.all(
    userIds.map(async (userId) => {
      try {
        const profile = await authService.getUserProfile(userId);
        userCache.set(userId, profile);
      } catch {
        userCache.set(userId, null);
      }
    }),
  );

  return items.map((item) => {
    const userId = String(item.user_id ?? '');
    const user = userId ? userCache.get(userId) ?? null : null;
    return mapToAdminBookingRow(item, user);
  });
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

  cancelBooking: async (bookingId: string): Promise<void> => {
    const fetchOnce = async () => {
      await ApiClient.patch<ApiResponse<unknown>>(
        `/bookings/${bookingId}/cancel/`,
        {},
        { withAuth: true },
      );
    };
    try {
      await fetchOnce();
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError?.status === 401) {
        await authService.refreshToken();
        await fetchOnce();
        return;
      }
      throw error;
    }
  },

  /**
   * GET /api/bookings/my/?page=1&page_size=1
   * Devuelve el total de reservas del usuario (sin cargar todas las páginas).
   */
  getMyBookingsCount: async (): Promise<number> => {
    const path = '/bookings/my/?page=1&page_size=1';

    const fetchOnce = async () => {
      const res = await ApiClient.get<unknown>(path, { withAuth: true });
      return parseBookingsTotal(res);
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

  getMyBookings: async (params?: {
    page?: number;
    page_size?: number;
    /** Valor que se envía tal cual al backend como ?status=. Los estados reales del backend son:
     *  pending | accepted | rejected | confirmed | canceled */
    status?: 'pending' | 'accepted' | 'rejected' | 'confirmed' | 'canceled';
    is_approved?: boolean;
    is_past?: boolean;
  }): Promise<Booking[]> => {
    const query = new URLSearchParams();
    if (params?.page !== undefined) query.set('page', String(params.page));
    if (params?.page_size !== undefined) query.set('page_size', String(params.page_size));
    if (params?.status !== undefined) query.set('status', params.status);
    if (params?.is_approved !== undefined) query.set('is_approved', String(params.is_approved));
    if (params?.is_past !== undefined) query.set('is_past', String(params.is_past));
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

  // Admin endpoints
  getComplexBookings: async (complexId: string, params?: {
    page?: number;
    page_size?: number;
    status?: 'active' | 'canceled' | 'inactive';
    is_approved?: boolean;
  }): Promise<AdminBookingRow[]> => {
    const query = new URLSearchParams();
    if (params?.page !== undefined) query.set('page', String(params.page));
    if (params?.page_size !== undefined) query.set('page_size', String(params.page_size));
    if (params?.status !== undefined) query.set('status', params.status);
    if (params?.is_approved !== undefined) query.set('is_approved', String(params.is_approved));
    const qs = query.toString();
    const path = `/bookings/complex/${complexId}/${qs ? `?${qs}` : ''}`;

    const fetchOnce = async () => {
      const res = await ApiClient.get<unknown>(path, { withAuth: true });
      const items = extractItems(res);
      return enrichAdminBookingsFromApi(items);
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

  updateBookingStatus: async (bookingId: string, newStatus: 'accepted' | 'rejected'): Promise<void> => {
    const fetchOnce = async () => {
      await ApiClient.patch<ApiResponse<unknown>>(
        `/bookings/${bookingId}/status/${newStatus}/`,
        {},
        { withAuth: true },
      );
    };

    try {
      await fetchOnce();
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError?.status === 401) {
        await authService.refreshToken();
        await fetchOnce();
        return;
      }
      throw error;
    }
  },

  createAdminBooking: async (timeSlotId: string, clientName: string, clientPhone?: string): Promise<BookingOutput> => {
    const fetchOnce = async () => {
      const res = await ApiClient.post<ApiResponse<BookingOutput>>(
        '/bookings/',
        {
          time_slot_id: timeSlotId,
          client_name: clientName,
          phone: clientPhone || '',
          created_by_admin: true,
        },
        { withAuth: true },
      );
      return res.data;
    };

    try {
      const created = await fetchOnce();
      if (created.booking_id && clientName.trim()) {
        manualBookingMetaStorage.save(created.booking_id, {
          clientName: clientName.trim(),
          phone: clientPhone?.trim() || undefined,
        });
      }
      return created;
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError?.status === 401) {
        await authService.refreshToken();
        const created = await fetchOnce();
        if (created.booking_id && clientName.trim()) {
          manualBookingMetaStorage.save(created.booking_id, {
            clientName: clientName.trim(),
            phone: clientPhone?.trim() || undefined,
          });
        }
        return created;
      }
      throw error;
    }
  },

  /**
   * GET /api/bookings/<id>/confirmation/
   * Returns the QR token and short_code for a confirmed booking.
   */
  getBookingConfirmation: async (bookingId: string): Promise<BookingConfirmation> => {
    const path = `/bookings/${bookingId}/confirmation/`;

    const fetchOnce = async () => {
      const res = await ApiClient.get<BookingConfirmationResponse>(path, { withAuth: true });
      return res.data;
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
