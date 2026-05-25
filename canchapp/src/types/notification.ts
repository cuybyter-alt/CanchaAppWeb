// ─── Notification Types ───────────────────────────────────────────────────────

export interface NotificationOutput {
  notification_id: string;
  user_id: string;
  event: string;
  message: string;
  content: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
  metadata: Record<string, string> | null;
}

export interface NotificationsMeta {
  total: number;
  page: number;
  page_size: number;
}

export interface NotificationsResponse {
  data: NotificationOutput[];
  success?: boolean;
  message: string;
  meta: NotificationsMeta;
}

export interface NotificationSingleResponse {
  data: NotificationOutput;
  success?: boolean;
  message: string;
}

export interface MarkAllReadResponse {
  data: { updated: number };
  success?: boolean;
  message: string;
}

export interface NotificationQueryParams {
  page?: number;
  page_size?: number;
  unread_only?: boolean;
}

// ─── Booking Confirmation ─────────────────────────────────────────────────────

export interface BookingConfirmation {
  booking_id: string;
  token: string;
  short_code: string;
  used: boolean;
}

export interface BookingConfirmationResponse {
  status: string;
  message: string;
  data: BookingConfirmation;
}
