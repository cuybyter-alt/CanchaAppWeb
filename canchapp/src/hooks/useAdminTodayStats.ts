import { useEffect, useState } from 'react';
import { fetchAdminTodaySummary } from '../services/StatisticsService';

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
        const summary = await fetchAdminTodaySummary();
        if (!cancelled) {
          setState({
            todayBookings: summary.todayBookings,
            pendingBookings: summary.pendingBookings,
            loading: false,
          });
        }
      } catch (error) {
        console.error('Admin today stats error:', error);
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
