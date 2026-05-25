import ApiClient from './ApiClient';
import authService from './AuthService';
import type { ApiError } from './ApiClient';
import type {
  NotificationsResponse,
  NotificationSingleResponse,
  MarkAllReadResponse,
  NotificationQueryParams,
  NotificationOutput,
} from '../types/notification';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildQuery(params?: NotificationQueryParams): string {
  if (!params) return '';
  const q = new URLSearchParams();
  if (params.page !== undefined) q.set('page', String(params.page));
  if (params.page_size !== undefined) q.set('page_size', String(params.page_size));
  if (params.unread_only !== undefined) q.set('unread_only', String(params.unread_only));
  const qs = q.toString();
  return qs ? `?${qs}` : '';
}

// ─── Service ──────────────────────────────────────────────────────────────────

const notificationService = {
  /**
   * GET /api/notifications/
   * Returns paginated notifications for the authenticated user.
   */
  getNotifications: async (params?: NotificationQueryParams): Promise<NotificationsResponse> => {
    const path = `/notifications/${buildQuery(params)}`;

    const fetchOnce = async () =>
      ApiClient.get<NotificationsResponse>(path, { withAuth: true });

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

  /**
   * PATCH /api/notifications/<id>/read/
   * Marks a single notification as read.
   */
  markAsRead: async (notificationId: string): Promise<NotificationOutput> => {
    const path = `/notifications/${notificationId}/read/`;

    const fetchOnce = async () => {
      const res = await ApiClient.patch<NotificationSingleResponse>(path, {}, { withAuth: true });
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

  /**
   * POST /api/notifications/read-all/
   * Marks every unread notification for the authenticated user as read.
   */
  markAllAsRead: async (): Promise<number> => {
    const fetchOnce = async () => {
      const res = await ApiClient.post<MarkAllReadResponse>('/notifications/read-all/', {}, { withAuth: true });
      return res.data.updated;
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

  /**
   * Returns the total number of unread notifications (lightweight: page_size=1).
   */
  getUnreadCount: async (): Promise<number> => {
    try {
      const res = await notificationService.getNotifications({ unread_only: true, page: 1, page_size: 1 });
      return res.meta?.total ?? 0;
    } catch {
      return 0;
    }
  },

  // ─── Web Push (VAPID) ──────────────────────────────────────────────────────

  /**
   * GET /api/notifications/web-push/vapid-key/
   * Returns the VAPID public key for push subscription.
   */
  getVapidKey: async (): Promise<string> => {
    const fetchOnce = async () => {
      const res = await ApiClient.get<{ public_key: string } | string>(
        '/notifications/web-push/vapid-key/',
        { withAuth: true },
      );
      // Handle both { public_key: "..." } and plain string responses
      if (typeof res === 'string') return res;
      if (res && typeof res === 'object' && 'public_key' in res) return res.public_key;
      return String(res);
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

  /**
   * POST /api/notifications/web-push/subscribe/
   * Registers a browser push subscription.
   */
  subscribePush: async (subscription: PushSubscriptionJSON): Promise<void> => {
    const fetchOnce = async () => {
      await ApiClient.post<unknown>(
        '/notifications/web-push/subscribe/',
        subscription,
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
   * POST /api/notifications/web-push/unsubscribe/
   * Removes a browser push subscription.
   */
  unsubscribePush: async (endpoint: string): Promise<void> => {
    const fetchOnce = async () => {
      await ApiClient.post<unknown>(
        '/notifications/web-push/unsubscribe/',
        { endpoint },
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
};

export default notificationService;
