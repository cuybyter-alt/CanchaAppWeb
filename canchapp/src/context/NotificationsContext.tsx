import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import notificationService from '../services/NotificationService';
import authService from '../services/AuthService';

// ─── Types ────────────────────────────────────────────────────────────────────

interface NotificationsContextValue {
  /** Total number of unread notifications */
  unreadCount: number;
  /** Re-fetches the unread count from the API */
  refresh: () => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const NotificationsContext = createContext<NotificationsContextValue>({
  unreadCount: 0,
  refresh: () => undefined,
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchCount = useCallback(async () => {
    if (!authService.isAuthenticated()) {
      setUnreadCount(0);
      return;
    }
    const count = await notificationService.getUnreadCount();
    setUnreadCount(count);
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (!authService.isAuthenticated()) return;
      const count = await notificationService.getUnreadCount();
      if (!cancelled) setUnreadCount(count);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = useCallback(() => {
    void fetchCount();
  }, [fetchCount]);

  return (
    <NotificationsContext.Provider value={{ unreadCount, refresh }}>
      {children}
    </NotificationsContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useNotifications(): NotificationsContextValue {
  return useContext(NotificationsContext);
}
