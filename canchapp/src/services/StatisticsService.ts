import ApiClient, { type ApiError } from './ApiClient';
import authService from './AuthService';
import bookingService from './BookingService';
 
interface ApiResponse<T> {
  data: T;
  success?: boolean;
  message: string;
}
 
export interface ComplexStats {
  complex_id: string;
  complex_name: string;
  total_fields: number;
  active_fields: number;
  maintenance_fields: number;
  inactive_fields: number;
  pending_bookings: number;
  today_income: number;
  today_occupancy: number;
}
 
export interface AdminStats {
  total_complexes: number;
  total_fields: number;
  total_active_fields: number;
  total_maintenance_fields: number;
  total_inactive_fields: number;
  total_pending_bookings: number;
  total_today_income: number;
  total_today_occupancy: number;
  complexes: ComplexStats[];
}
 
export interface IncomeDataPoint {
  date: string;
  income: number;
}
 
export interface AdminIncomeSeries {
  interval: string;
  start_date: string;
  end_date: string;
  total_series: IncomeDataPoint[];
}
 
// ── Tipos para Usage ─────────────────────────────────────────────────────────
 
export type UsageInterval = 'hour' | 'day' | 'week' | 'month';
export type UsageOrder = 'asc' | 'desc';
 
export interface UsageDataPoint {
  label: string;
  bookings: number;
  percentage: number;
}
 
export interface ComplexUsage {
  complex_id: string;
  complex_name: string;
  total_bookings: number;
  interval: string;
  start_date: string;
  end_date: string;
  usage: UsageDataPoint[];
}
 
export interface FieldUsage {
  field_id: string;
  field_name: string;
  total_bookings: number;
  interval: string;
  start_date: string;
  end_date: string;
  usage: UsageDataPoint[];
}
 
export interface UsageParams {
  start_date: string;
  end_date: string;
  interval: UsageInterval;
  order: UsageOrder;
}
 
// ── Helpers internos ──────────────────────────────────────────────────────────
 
function toLocalDateString(date: Date): string {
  return date.toLocaleDateString('en-CA');
}
 
export function getCurrentMonthRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start: toLocalDateString(start), end: toLocalDateString(end) };
}
 
export function formatCOP(amount: number): string {
  return `$${Math.round(amount).toLocaleString('es-CO')}`;
}
 
function todayLocalISO(): string {
  return new Date().toLocaleDateString('en-CA');
}
 
export async function countAdminTodayBookings(complexIds: string[]): Promise<number> {
  if (complexIds.length === 0) return 0;
  const today = todayLocalISO();
  const results = await Promise.all(
    complexIds.map((id) => bookingService.getComplexBookings(id).catch(() => [])),
  );
  return results.flat().filter((b) => b.startIso?.slice(0, 10) === today).length;
}
 
export interface AdminTodaySummary {
  todayBookings: number;
  pendingBookings: number;
}
 
async function withAuthRetry<T>(fetchOnce: () => Promise<T>): Promise<T> {
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
}
 
// ── Servicio ──────────────────────────────────────────────────────────────────
 
const statisticsService = {
  /** GET /api/statistics/ */
  getAdminStats: async (date?: string): Promise<AdminStats> => {
    const qs = date ? `?date=${encodeURIComponent(date)}` : '';
    return withAuthRetry(async () => {
      const res = await ApiClient.get<ApiResponse<AdminStats>>(
        `/statistics/${qs}`,
        { withAuth: true },
      );
      return res.data;
    });
  },
 
  /** GET /api/statistics/income/ */
  getAdminIncome: async (params: {
    start_date: string;
    end_date: string;
    interval: 'day' | 'week' | 'month' | 'semester' | 'year';
  }): Promise<AdminIncomeSeries> => {
    const query = new URLSearchParams({
      start_date: params.start_date,
      end_date: params.end_date,
      interval: params.interval,
    });
    return withAuthRetry(async () => {
      const res = await ApiClient.get<ApiResponse<AdminIncomeSeries>>(
        `/statistics/income/?${query.toString()}`,
        { withAuth: true },
      );
      return res.data;
    });
  },
 
  /** GET /api/statistics/complexes/<complex_id>/usage/ */
  getComplexUsage: async (complexId: string, params: UsageParams): Promise<ComplexUsage> => {
    const query = new URLSearchParams({
      start_date: params.start_date,
      end_date: params.end_date,
      interval: params.interval,
      order: params.order,
    });
    return withAuthRetry(async () => {
      const res = await ApiClient.get<ApiResponse<ComplexUsage>>(
        `/statistics/complexes/${complexId}/usage/?${query.toString()}`,
        { withAuth: true },
      );
      return res.data;
    });
  },
 
  /** GET /api/statistics/fields/<field_id>/usage/ */
  getFieldUsage: async (fieldId: string, params: UsageParams): Promise<FieldUsage> => {
    const query = new URLSearchParams({
      start_date: params.start_date,
      end_date: params.end_date,
      interval: params.interval,
      order: params.order,
    });
    return withAuthRetry(async () => {
      const res = await ApiClient.get<ApiResponse<FieldUsage>>(
        `/statistics/fields/${fieldId}/usage/?${query.toString()}`,
        { withAuth: true },
      );
      return res.data;
    });
  },
 
  sumIncome(series: IncomeDataPoint[]): number {
    return series.reduce((sum, point) => sum + (point.income ?? 0), 0);
  },
};
 
export async function fetchAdminTodaySummary(): Promise<AdminTodaySummary> {
  const adminStats = await statisticsService.getAdminStats();
  const todayBookings = await countAdminTodayBookings(
    adminStats.complexes.map((c) => c.complex_id),
  );
  return {
    todayBookings,
    pendingBookings: adminStats.total_pending_bookings,
  };
}
 
export default statisticsService;