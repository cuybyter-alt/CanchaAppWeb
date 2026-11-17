import { useEffect, useState } from 'react';
import bookingService from '../services/BookingService';

const ADMIN_TODAY_STATS_EVENT = 'canchapp:admin-today-stats';

export interface AdminTodayStatsState {
  todayBookings: number;
  pendingBookings: number;
  loading: boolean;
}

export function requestAdminTodayStatsRefresh(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(ADMIN_TODAY_STATS_EVENT));
  }
}

export function useAdminTodayStats(): AdminTodayStatsState {
  const [state, setState] = useState<AdminTodayStatsState>({
    todayBookings: 0,
    pendingBookings: 0,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setState((prev) => ({ ...prev, loading: true }));
      try {
        const summary = await bookingService.getDashboardSummary();
        if (!cancelled) {
          setState({
            todayBookings: summary.pending_today,
            pendingBookings: summary.pending_approval,
            loading: false,
          });
        }
      } catch (error) {
        console.error('Dashboard summary error:', error);
        if (!cancelled) {
          setState({ todayBookings: 0, pendingBookings: 0, loading: false });
        }
      }
    };

    const handleRefresh = () => {
      void load();
    };

    void load();
    window.addEventListener(ADMIN_TODAY_STATS_EVENT, handleRefresh);

    return () => {
      cancelled = true;
      window.removeEventListener(ADMIN_TODAY_STATS_EVENT, handleRefresh);
    };
  }, []);

  return state;
}