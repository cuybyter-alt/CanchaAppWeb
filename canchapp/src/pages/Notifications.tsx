import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, BellOff, CheckCheck, ChevronRight, Loader2, QrCode, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Dialog } from '../components/ui/dialog';
import notificationService from '../services/NotificationService';
import bookingService from '../services/BookingService';
import { useNotifications } from '../context/NotificationsContext';
import { notify } from '../services/toast';
import type { NotificationOutput, BookingConfirmation, NotificationsMeta } from '../types/notification';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'all' | 'unread' | 'read';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatNotifDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-CO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function eventLabel(event: string): string {
  const map: Record<string, string> = {
    booking_accepted: 'Reserva Aprobada',
    booking_rejected: 'Reserva Rechazada',
    booking_cancelled: 'Reserva Cancelada',
    booking_created: 'Nueva Reserva',
    payment_confirmed: 'Pago Confirmado',
    reminder: 'Recordatorio',
  };
  return map[event] ?? event.replace(/_/g, ' ');
}

function eventColor(event: string): string {
  if (event.includes('accepted') || event.includes('confirmed') || event.includes('created')) {
    return 'bg-[var(--color-primary-tint)] text-[var(--color-primary-dark)]';
  }
  if (event.includes('rejected') || event.includes('cancelled')) {
    return 'bg-red-50 text-red-700';
  }
  if (event.includes('payment')) {
    return 'bg-blue-50 text-blue-700';
  }
  return 'bg-gray-100 text-gray-600';
}

function isBookingConfirmationEvent(event: string): boolean {
  return event === 'booking_accepted' || event === 'booking_confirmed';
}

// ─── QR Confirmation Panel (inside dialog) ───────────────────────────────────

function ConfirmationQR({ bookingId }: { bookingId: string }) {
  const [conf, setConf] = useState<BookingConfirmation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    bookingService
      .getBookingConfirmation(bookingId)
      .then((data) => { if (!cancelled) setConf(data); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [bookingId]);

  if (loading) {
    return (
      <div className="mt-4 rounded-[var(--radius-xl)] bg-[var(--color-primary-tint)] p-5 flex items-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-[var(--color-primary)]" />
        <span className="text-sm font-semibold text-[var(--color-primary-dark)]">
          Cargando código de confirmación…
        </span>
      </div>
    );
  }

  if (error || !conf) return null;

  return (
    <div className="mt-4 rounded-[var(--radius-xl)] bg-[var(--color-primary-tint)] border border-[var(--color-primary)]/20 p-5">
      <p className="text-xs font-bold text-[var(--color-primary-dark)] mb-4 uppercase tracking-widest flex items-center justify-center gap-1.5">
        <QrCode className="w-3.5 h-3.5" />
        Código de Confirmación
      </p>

      {/* QR code — large, centered, easy to scan at court */}
      <div className="flex flex-col items-center gap-4">
        <div className="rounded-[var(--radius-xl)] bg-white p-4 shadow-md">
          <QRCodeSVG
            value={conf.token}
            size={180}
            bgColor="#ffffff"
            fgColor="#1a1a1a"
            level="M"
          />
        </div>

        {/* Short code */}
        <div className="flex items-center gap-2 bg-[var(--color-primary)] rounded-[var(--radius-lg)] px-5 py-3">
          <QrCode className="w-5 h-5 text-white flex-shrink-0" />
          <span className="font-mono font-black text-white text-2xl tracking-[0.2em]">
            {conf.short_code}
          </span>
        </div>

        <p className="text-sm text-[var(--color-text-3)] text-center">
          Presenta este código al llegar al complejo
        </p>

        {conf.used && (
          <span className="text-sm font-bold text-[var(--color-accent)] bg-red-50 px-3 py-1.5 rounded-full">
            ✓ Código ya utilizado
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Notification Detail Dialog ───────────────────────────────────────────────

interface NotifDetailDialogProps {
  notif: NotificationOutput | null;
  onClose: () => void;
}

function NotifDetailDialog({ notif, onClose }: NotifDetailDialogProps) {
  if (!notif) return null;

  const bookingId = notif.metadata?.booking_id ?? null;
  // Show QR whenever the backend provides a booking_id in metadata,
  // regardless of the exact event name variant sent by the API.
  const showQr = bookingId != null;

  return (
    <Dialog isOpen={!!notif} onClose={onClose} size="sm">
      <div className="p-6">
        {/* Close button (dialog header is empty so we add our own) */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest ${eventColor(notif.event)}`}>
            {eventLabel(notif.event)}
          </span>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-[var(--color-text-3)]
              hover:bg-[var(--color-surf2)] hover:text-[var(--color-text)] transition-colors flex-shrink-0"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Title */}
        <h2 className="text-xl font-black text-[var(--color-text)] leading-snug mb-1">
          {notif.message}
        </h2>

        {/* Date */}
        <p className="text-xs text-[var(--color-text-3)] mb-4">
          {formatNotifDate(notif.created_at)}
        </p>

        {/* Content body */}
        {notif.content && (
          <p className="text-sm text-[var(--color-text-2)] leading-relaxed">
            {notif.content}
          </p>
        )}

        {/* QR confirmation — prominent, centered, scannable */}
        {showQr && <ConfirmationQR bookingId={bookingId!} />}
      </div>
    </Dialog>
  );
}

// ─── Notification List Item ───────────────────────────────────────────────────

interface NotifItemProps {
  notif: NotificationOutput;
  onClick: (notif: NotificationOutput) => void;
}

function NotifItem({ notif, onClick }: NotifItemProps) {
  const hasQr =
    isBookingConfirmationEvent(notif.event) &&
    notif.metadata?.booking_id != null;

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onClick(notif)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(notif); }}
      className={`
        relative rounded-[var(--radius-xl)] border transition-all duration-200 cursor-pointer
        focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-1
        ${notif.is_read
          ? 'bg-[var(--color-bg)] border-[var(--color-border)] hover:bg-[var(--color-surf2)]'
          : 'bg-white border-[var(--color-border)] shadow-sm hover:shadow-md border-l-4 border-l-[var(--color-primary)]'
        }
      `}
    >
      <div className="p-4 flex items-center gap-3">
        {/* Unread indicator */}
        <div className="flex-shrink-0 w-2.5 flex items-center justify-center">
          {!notif.is_read && (
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-accent)]" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${eventColor(notif.event)}`}>
              {eventLabel(notif.event)}
            </span>
            {hasQr && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--color-primary-tint)] text-[var(--color-primary-dark)] flex items-center gap-1">
                <QrCode className="w-2.5 h-2.5" />
                QR
              </span>
            )}
          </div>
          <p className={`text-sm font-bold leading-snug truncate ${notif.is_read ? 'text-[var(--color-text-2)]' : 'text-[var(--color-text)]'}`}>
            {notif.message}
          </p>
          <p className={`text-xs mt-0.5 truncate ${notif.is_read ? 'text-[var(--color-text-3)]' : 'text-[var(--color-text-3)]'}`}>
            {notif.content || formatNotifDate(notif.created_at)}
          </p>
        </div>

        {/* Date + chevron */}
        <div className="flex-shrink-0 flex flex-col items-end gap-1">
          <p className="text-[10px] text-[var(--color-text-3)] whitespace-nowrap hidden sm:block">
            {new Date(notif.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
          </p>
          <ChevronRight className="w-4 h-4 text-[var(--color-text-3)]" />
        </div>
      </div>
    </article>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="flex-1 min-w-0 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-5 text-center">
      <p className={`text-4xl font-black ${color}`}>{value}</p>
      <p className="text-[10px] font-bold text-[var(--color-text-3)] uppercase tracking-widest mt-1">{label}</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Notifications() {
  const { refresh: refreshBadge } = useNotifications();

  const [notifications, setNotifications] = useState<NotificationOutput[]>([]);
  const [meta, setMeta] = useState<NotificationsMeta>({ total: 0, page: 1, page_size: 20 });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('all');

  // Detail dialog
  const [selectedNotif, setSelectedNotif] = useState<NotificationOutput | null>(null);

  // Stats (loaded independently for accuracy)
  const [totalCount, setTotalCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);

  const [markingAll, setMarkingAll] = useState(false);

  // ── Load stats ──────────────────────────────────────────────────────────────
  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const [allRes, unreadRes] = await Promise.all([
        notificationService.getNotifications({ page: 1, page_size: 1 }),
        notificationService.getNotifications({ page: 1, page_size: 1, unread_only: true }),
      ]);
      setTotalCount(allRes.meta?.total ?? 0);
      setUnreadCount(unreadRes.meta?.total ?? 0);
    } catch {
      // Non-critical — stats remain at 0
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // ── Load notifications ──────────────────────────────────────────────────────
  const loadNotifications = useCallback(async (currentTab: Tab, page: number, append: boolean) => {
    if (page === 1) setLoading(true);
    setError(null);

    try {
      const params =
        currentTab === 'unread'
          ? { page, page_size: 20, unread_only: true }
          : { page, page_size: 20 };

      const res = await notificationService.getNotifications(params);
      const items = res.data ?? [];

      setNotifications((prev) => (append ? [...prev, ...items] : items));
      setMeta(res.meta ?? { total: 0, page, page_size: 20 });
    } catch (err) {
      const e = err as { message?: string };
      setError(e?.message ?? 'Error al cargar notificaciones.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // ── Initial load ────────────────────────────────────────────────────────────
  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  useEffect(() => {
    setNotifications([]);
    void loadNotifications(tab, 1, false);
  }, [tab, loadNotifications]);

  // ── Derived list for "Leídas" tab (client-side filter) ──────────────────────
  const displayedNotifications = useMemo(() => {
    if (tab === 'read') return notifications.filter((n) => n.is_read);
    return notifications;
  }, [notifications, tab]);

  // ── Click notification: open dialog + mark as read ─────────────────────────
  const handleItemClick = useCallback(async (notif: NotificationOutput) => {
    setSelectedNotif(notif);

    if (notif.is_read) return;

    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.notification_id === notif.notification_id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    refreshBadge();

    try {
      await notificationService.markAsRead(notif.notification_id);
      // Keep dialog open showing updated state
      setSelectedNotif((prev) =>
        prev?.notification_id === notif.notification_id ? { ...prev, is_read: true } : prev
      );
    } catch {
      // Revert
      setNotifications((prev) =>
        prev.map((n) => (n.notification_id === notif.notification_id ? { ...n, is_read: false } : n))
      );
      setUnreadCount((c) => c + 1);
      refreshBadge();
      notify.error('No se pudo marcar como leída.');
    }
  }, [refreshBadge]);

  // ── Mark all as read ────────────────────────────────────────────────────────
  const handleMarkAllAsRead = async () => {
    if (markingAll || unreadCount === 0) return;
    setMarkingAll(true);
    const prevNotifs = notifications;
    const prevCount = unreadCount;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    refreshBadge();

    try {
      await notificationService.markAllAsRead();
      void loadStats();
    } catch {
      setNotifications(prevNotifs);
      setUnreadCount(prevCount);
      refreshBadge();
      notify.error('No se pudieron marcar todas como leídas.');
    } finally {
      setMarkingAll(false);
    }
  };

  // ── Load more ───────────────────────────────────────────────────────────────
  const handleLoadMore = async () => {
    const nextPage = meta.page + 1;
    setLoadingMore(true);
    await loadNotifications(tab, nextPage, true);
  };

  const hasMore = notifications.length < (meta?.total ?? 0);
  const readCount = totalCount - unreadCount;

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-8">

        {/* Header */}
        <div className="mb-6">
          <p className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-widest mb-1">
            ● NOTIFICACIONES
          </p>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-[var(--color-text)] leading-tight">
                Mis{' '}
                <span className="text-[var(--color-primary)]">Notificaciones</span>
              </h1>
              <p className="text-sm text-[var(--color-text-3)] mt-1">
                Revisa tus reservas y códigos de confirmación
              </p>
            </div>
            <button
              onClick={handleMarkAllAsRead}
              disabled={markingAll || unreadCount === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-lg)] border border-[var(--color-border)]
                bg-white text-sm font-bold text-[var(--color-text-2)]
                hover:bg-[var(--color-primary-tint)] hover:text-[var(--color-primary-dark)] hover:border-[var(--color-primary)]
                disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
            >
              {markingAll ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCheck className="w-4 h-4" />
              )}
              Marcar todas como leídas
            </button>
          </div>
        </div>

        {/* Stats cards */}
        <div className="flex gap-3 mb-6">
          {loadingStats ? (
            <>
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex-1 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-5 animate-pulse h-20" />
              ))}
            </>
          ) : (
            <>
              <StatCard value={totalCount} label="Total" color="text-[var(--color-primary)]" />
              <StatCard value={unreadCount} label="No leídas" color="text-[var(--color-accent)]" />
              <StatCard value={Math.max(0, readCount)} label="Leídas" color="text-[var(--color-primary)]" />
            </>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setTab('all')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all duration-200 border
              ${tab === 'all'
                ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm'
                : 'bg-white text-[var(--color-text-2)] border-[var(--color-border)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary-dark)]'
              }`}
          >
            <Bell className="w-3.5 h-3.5" />
            Todas
            {totalCount > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-black
                ${tab === 'all' ? 'bg-white/30 text-white' : 'bg-[var(--color-primary-tint)] text-[var(--color-primary-dark)]'}`}>
                {totalCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setTab('unread')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all duration-200 border
              ${tab === 'unread'
                ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)] shadow-sm'
                : 'bg-white text-[var(--color-text-2)] border-[var(--color-border)] hover:border-[var(--color-accent)] hover:text-red-600'
              }`}
          >
            <span className="w-2 h-2 rounded-full bg-current flex-shrink-0" />
            No leídas
            {unreadCount > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-black
                ${tab === 'unread' ? 'bg-white/30 text-white' : 'bg-red-50 text-red-600'}`}>
                {unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setTab('read')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all duration-200 border
              ${tab === 'read'
                ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm'
                : 'bg-white text-[var(--color-text-2)] border-[var(--color-border)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary-dark)]'
              }`}
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Leídas
            {readCount > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-black
                ${tab === 'read' ? 'bg-white/30 text-white' : 'bg-[var(--color-primary-tint)] text-[var(--color-primary-dark)]'}`}>
                {readCount}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
            <p className="text-sm font-semibold text-[var(--color-text-3)]">Cargando notificaciones…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <BellOff className="w-12 h-12 text-[var(--color-accent)]" />
            <p className="text-base font-bold text-[var(--color-text)]">Algo salió mal</p>
            <p className="text-sm text-[var(--color-text-3)] text-center max-w-xs">{error}</p>
            <button
              onClick={() => void loadNotifications(tab, 1, false)}
              className="mt-2 px-4 py-2 rounded-[var(--radius-lg)] bg-[var(--color-primary)] text-white text-sm font-bold hover:bg-[var(--color-primary-dark)] transition-colors"
            >
              Reintentar
            </button>
          </div>
        ) : displayedNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-16 h-16 rounded-full bg-[var(--color-primary-tint)] flex items-center justify-center">
              <Bell className="w-8 h-8 text-[var(--color-primary)]" />
            </div>
            <p className="text-base font-bold text-[var(--color-text)]">
              {tab === 'unread' ? 'Todo al día' : 'Sin notificaciones'}
            </p>
            <p className="text-sm text-[var(--color-text-3)] text-center max-w-xs">
              {tab === 'unread'
                ? 'No tienes notificaciones sin leer.'
                : tab === 'read'
                ? 'Aún no has leído ninguna notificación.'
                : 'Cuando tengas actividad, aparecerá aquí.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {displayedNotifications.map((notif) => (
              <NotifItem
                key={notif.notification_id}
                notif={notif}
                onClick={handleItemClick}
              />
            ))}

            {/* Load more — only for 'all' and 'unread' tabs */}
            {tab !== 'read' && hasMore && (
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="mt-2 w-full py-3 rounded-[var(--radius-xl)] border border-dashed border-[var(--color-border)]
                  bg-white text-sm font-bold text-[var(--color-text-2)]
                  hover:bg-[var(--color-primary-tint)] hover:text-[var(--color-primary-dark)] hover:border-[var(--color-primary)]
                  disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200
                  flex items-center justify-center gap-2"
              >
                {loadingMore ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Cargando…</>
                ) : (
                  `Cargar más (${meta.total - notifications.length} restantes)`
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Detail dialog */}
      <NotifDetailDialog
        notif={selectedNotif}
        onClose={() => setSelectedNotif(null)}
      />
    </div>
  );
}
