import { useEffect, useState } from 'react';
import bookingService from '../services/BookingService';

export interface AdminTodayStatsState {
  todayBookings: number;
  pendingBookings: number;
  loading: boolean;
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

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}