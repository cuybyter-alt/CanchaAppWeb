import { Bell, Calendar, Heart, Home, MapPin, Search, Settings, Wallet, User, Zap } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Typography } from '../ui/typography';
import { Badge } from '../ui/badge';
import { useEffect, useState, type ReactNode } from 'react';
import { useMapContext } from '../../context/MapContext';
import authService from '../../services/AuthService';
import bookingService from '../../services/BookingService';
import { useNotifications } from '../../context/NotificationsContext';
import complexesService from '../../services/ComplexesService';
import schedulingService from '../../services/SchedulingService';
import { formatPrice } from '../../lib/utils';
import { getTodayISO } from '../../lib/timezone';
import type { NearbyComplex } from '../../types/map';
import type { ComplexField, ComplexFieldType, Field, TimeSlotData } from '../../types/field';

interface QuickSlot {
  complexId: string;
  complexName: string;
  fieldId: string;
  fieldName: string;
  date: string;
  slot: TimeSlotData;
  allSlots: TimeSlotData[];
  field: Field;
}

interface SidebarProps {
  onQuickBook?: (field: Field, slotId: string, date: string) => void;
  collapsed?: boolean;
}

const COMPLEX_TO_SPORT: Record<ComplexFieldType, Field['sport']> = {
  futbol_5: 'futbol5',
  futbol_7: 'futbol7',
  futbol_11: 'futbol11',
  microfutbol: 'microfutbol',
  futsal: 'futbol5',
};

const COMPLEX_SPORT_LABEL: Record<ComplexFieldType, string> = {
  futbol_5: 'Fútbol 5',
  futbol_7: 'Fútbol 7',
  futbol_11: 'Fútbol 11',
  microfutbol: 'Microfútbol',
  futsal: 'Futsal',
};

const QUICK_SLOT_CACHE_TTL = 5 * 60 * 1000;
let quickSlotCache: { ts: number; slot: QuickSlot | null } | null = null;

function buildSyntheticField(cf: ComplexField, complex: NearbyComplex, slot: TimeSlotData, allSlots: TimeSlotData[]): Field {
  return {
    id: cf.fieldId,
    name: cf.name,
    sport: COMPLEX_TO_SPORT[cf.type] ?? 'futbol5',
    sportLabel: COMPLEX_SPORT_LABEL[cf.type] ?? cf.type,
    location: `${complex.name} · ${complex.city}`,
    distance: complex.distanceLabel,
    price: slot.price,
    priceLabel: formatPrice(slot.price),
    rating: 0,
    reviewCount: 0,
    image: '',
    tags: [],
    amenities: [],
    availability: allSlots.length > 0 ? allSlots : [slot],
    isFavorite: false,
    capacity: 10,
  };
}

function getCachedCoords(): { lat: number; lng: number } | null {
  try {
    const raw = localStorage.getItem('canchapp-coords');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { lat: number; lng: number; ts: number };
    if (Date.now() - parsed.ts > 30 * 60 * 1000) { localStorage.removeItem('canchapp-coords'); return null; }
    return { lat: parsed.lat, lng: parsed.lng };
  } catch { return null; }
}

const navItemClass = (isActive: boolean, collapsed: boolean) =>
  `group relative flex items-center rounded-[var(--radius-lg)] cursor-pointer text-sm font-extrabold transition-all duration-[var(--duration-fast)] no-underline ${
    collapsed ? 'justify-center px-0 py-3' : 'gap-3 px-3 py-3'
  } ${
    isActive
      ? 'bg-[var(--color-primary-tint)] text-[var(--color-primary-dark)] before:absolute before:left-0 before:top-[20%] before:bottom-[20%] before:w-[3px] before:rounded-r-[var(--radius-xs)] before:bg-[var(--color-primary)]'
      : 'text-[var(--color-text-2)] hover:bg-[var(--color-surf2)] hover:text-[var(--color-primary-dark)]'
  }`;

function SidebarNavContent({
  icon,
  label,
  collapsed,
  badgeText,
  badgeVariant = 'primary',
}: {
  icon: ReactNode;
  label: string;
  collapsed: boolean;
  badgeText?: string | number;
  badgeVariant?: 'primary' | 'accent';
}) {
  const hasBadge = badgeText !== undefined && badgeText !== '' && badgeText !== 0;

  return (
    <>
      <span className="flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center">{icon}</span>
      <span
        className={`overflow-hidden whitespace-nowrap transition-all duration-200 ${
          collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'
        }`}
      >
        {label}
      </span>

      {hasBadge &&
        (collapsed ? (
          <span
            className={`absolute right-1 top-1 flex h-[15px] min-w-[15px] items-center justify-center rounded-full px-1 text-[8px] font-black text-white shadow-sm ${
              badgeVariant === 'accent'
                ? 'bg-[var(--color-accent)]'
                : 'bg-[var(--color-primary)]'
            }`}
          >
            {badgeText}
          </span>
        ) : (
          <Badge
            variant={badgeVariant}
            className="ml-auto"
          >
            {badgeText}
          </Badge>
        ))}
    </>
  );
}

function SidebarLink({
  to,
  end,
  icon,
  label,
  collapsed,
  badgeText,
  badgeVariant,
}: {
  to: string;
  end?: boolean;
  icon: ReactNode;
  label: string;
  collapsed: boolean;
  badgeText?: string | number;
  badgeVariant?: 'primary' | 'accent';
}) {
  return (
    <NavLink
      to={to}
      end={end}
      title={collapsed ? label : undefined}
      aria-label={label}
      className={({ isActive }) => navItemClass(isActive, collapsed)}
    >
      <SidebarNavContent
        icon={icon}
        label={label}
        collapsed={collapsed}
        badgeText={badgeText}
        badgeVariant={badgeVariant}
      />
    </NavLink>
  );
}

function SidebarAction({
  icon,
  label,
  collapsed,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  collapsed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={collapsed ? label : undefined}
      aria-label={label}
      className={navItemClass(false, collapsed)}
    >
      <SidebarNavContent icon={icon} label={label} collapsed={collapsed} />
    </button>
  );
}

export function Sidebar({ onQuickBook, collapsed = false }: SidebarProps = {}) {
  const { openMap } = useMapContext();
  const navigate = useNavigate();
  const { unreadCount: notifUnreadCount } = useNotifications();

  const [quickSlot, setQuickSlot] = useState<QuickSlot | null>(null);
  const [loadingQuick, setLoadingQuick] = useState(true);
  const [countdown, setCountdown] = useState('');
  const [myBookingsCount, setMyBookingsCount] = useState(0);
  const [loadingBookingsCount, setLoadingBookingsCount] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadBookingsCount = async () => {
      if (!authService.isAuthenticated()) {
        if (!cancelled) {
          setMyBookingsCount(0);
          setLoadingBookingsCount(false);
        }
        return;
      }

      try {
        const total = await bookingService.getMyBookingsCount();
        if (!cancelled) setMyBookingsCount(total);
      } catch {
        if (!cancelled) setMyBookingsCount(0);
      } finally {
        if (!cancelled) setLoadingBookingsCount(false);
      }
    };

    void loadBookingsCount();

    return () => {
      cancelled = true;
    };
  }, []);

  // Load nearest complex + first available slot
  useEffect(() => {
    let cancelled = false;

    if (quickSlotCache && Date.now() - quickSlotCache.ts < QUICK_SLOT_CACHE_TTL) {
      setQuickSlot(quickSlotCache.slot);
      setLoadingQuick(false);
      return () => {
        cancelled = true;
      };
    }

    const load = async () => {
      setLoadingQuick(true);
      try {
        const coords = getCachedCoords();
        let complexes: NearbyComplex[] = [];
        let resolvedSlot: QuickSlot | null = null;

        if (coords) {
          complexes = await complexesService.getNearbyComplexes(coords.lat, coords.lng, 1);
        } else {
          // Fallback: get any complex from list
          const list = await complexesService.getComplexes({ pageSize: 1 });
          if (list.length > 0) {
            complexes = [{ id: list[0].id, name: list[0].name, address: list[0].city, city: list[0].city, latitude: 0, longitude: 0, minPrice: list[0].minPrice, maxPrice: list[0].maxPrice, fieldsCount: list[0].fieldsCount, distanceKm: 0, distanceLabel: '' }];
          }
        }

        if (cancelled || complexes.length === 0) return;

        const complex = complexes[0];
        const fields = await complexesService.getComplexFields(complex.id);
        if (cancelled) return;

        const activeFields = fields.filter(f => f.status === 'active');
        if (activeFields.length === 0) return;

        const today = getTodayISO();

        // Try each field until we find an available slot
        for (const cf of activeFields) {
          if (cancelled) return;
          try {
            const slots = await schedulingService.getFieldTimeSlots(cf.fieldId, today);
            const now = new Date();
            const available = slots.find(s =>
              s.status !== 'taken' &&
              (!s.startIso || new Date(s.startIso) > now)
            );
            if (available) {
              resolvedSlot = {
                complexId: complex.id,
                complexName: complex.name,
                fieldId: cf.fieldId,
                fieldName: cf.name,
                date: today,
                slot: available,
                allSlots: slots,
                field: buildSyntheticField(cf, complex, available, slots),
              };
              break;
            }
          } catch { /* skip this field */ }
        }

        if (!cancelled) {
          quickSlotCache = { ts: Date.now(), slot: resolvedSlot };
          setQuickSlot(resolvedSlot);
        }
      } catch { /* silent */ } finally {
        if (!cancelled) setLoadingQuick(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, []);

  // Countdown to the quick slot start time
  useEffect(() => {
    if (!quickSlot?.slot.startIso) return;
    const target = new Date(quickSlot.slot.startIso);

    const tick = () => {
      const diff = target.getTime() - Date.now();
      if (diff <= 0) { setCountdown('¡Ya disponible!'); return; }
      const hrs = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setCountdown(`${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')} restante`);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [quickSlot]);

  return (
    <aside className="sticky top-16 h-[calc(100vh-64px)] bg-[var(--color-surface)] border-r-[1.5px] border-[var(--color-border)] flex flex-col overflow-hidden">
      {/* Scrollable nav area */}
      <div
        className={`flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pb-2 pt-6 transition-all duration-300 ${
          collapsed ? 'px-2' : 'px-6'
        }`}
      >
        {!collapsed ? (
          <Typography variant="pixel-sm" color="muted" className="px-3 pt-2 pb-1 mt-2">
            MENÚ
          </Typography>
        ) : (
          <div className="mx-2 my-2 h-px bg-[var(--color-border)]" />
        )}

        <SidebarLink
          to="/"
          end
          icon={<Home className="w-[18px] h-[18px]" />}
          label="Inicio"
          collapsed={collapsed}
        />

        <SidebarLink
          to="/fields"
          icon={<Search className="w-[18px] h-[18px]" />}
          label="Buscar Canchas"
          collapsed={collapsed}
        />

        <SidebarLink
          to="/bookings"
          icon={<Calendar className="w-[18px] h-[18px]" />}
          label="Mis Reservas"
          collapsed={collapsed}
          badgeText={!loadingBookingsCount && myBookingsCount > 0 ? myBookingsCount : undefined}
        />

        <SidebarLink
          to="/notifications"
          icon={<Bell className="w-[18px] h-[18px]" />}
          label="Notificaciones"
          collapsed={collapsed}
          badgeText={notifUnreadCount > 0 ? notifUnreadCount : undefined}
        />

        <SidebarLink
          to="/favorites"
          icon={<Heart className="w-[18px] h-[18px]" />}
          label="Favoritos"
          collapsed={collapsed}
        />

        <SidebarAction
          icon={<MapPin className="w-[18px] h-[18px]" />}
          label="Mapa Cercano"
          collapsed={collapsed}
          onClick={openMap}
        />

        <div className="my-2 h-[1.5px] rounded-sm bg-[var(--color-border)]" />

        {!collapsed ? (
          <Typography variant="pixel-sm" color="muted" className="px-3 pt-2 pb-1">
            CUENTA
          </Typography>
        ) : (
          <div className="mx-2 my-2 h-px bg-[var(--color-border)]" />
        )}

        <SidebarLink
          to="/profile"
          icon={<User className="w-[18px] h-[18px]" />}
          label="Perfil"
          collapsed={collapsed}
        />

        <SidebarLink
          to="/payments"
          icon={<Wallet className="w-[18px] h-[18px]" />}
          label="Pagos"
          collapsed={collapsed}
          badgeText="!"
          badgeVariant="accent"
        />

        <SidebarLink
          to="/settings"
          icon={<Settings className="w-[18px] h-[18px]" />}
          label="Configuración"
          collapsed={collapsed}
        />

        <div className="my-2 h-[1.5px] rounded-sm bg-[var(--color-border)]" />
      </div>{/* end scrollable nav */}

      {/* Quick-reserve widget — always visible, pinned at bottom */}
      <div
        className={`flex-shrink-0 pt-3 transition-all duration-300 ${
          collapsed ? 'px-2 pb-4' : 'px-6 pb-6'
        }`}
      >
      {collapsed ? (
        <button
          type="button"
          title="Reserva rápida"
          aria-label="Reserva rápida"
          onClick={() => {
            if (onQuickBook && quickSlot) {
              onQuickBook(quickSlot.field, quickSlot.slot.id, quickSlot.date);
            } else {
              navigate('/complexes');
            }
          }}
          className="flex h-12 w-full items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-text)] text-[var(--color-primary)] shadow-[var(--shadow-md)] transition-all hover:scale-[1.03] hover:text-[var(--color-primary-light)] active:scale-95"
        >
          <Zap className="h-[18px] w-[18px]" />
        </button>
      ) : (
      <div className="bg-[var(--color-text)] rounded-[var(--radius-xl)] p-4 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent, transparent 11px, rgba(98,191,59,.05) 12px), repeating-linear-gradient(90deg, transparent, transparent 11px, rgba(98,191,59,.05) 12px)',
          }}
        />
        <div className="relative z-10">
          <Typography variant="pixel-sm" color="primary" className="mb-2">
            <i className="fa-solid fa-bolt mr-1" />
            RESERVA RÁPIDA
          </Typography>

          {loadingQuick ? (
            <div className="space-y-2 animate-pulse">
              <div className="h-3 bg-white/10 rounded w-3/4" />
              <div className="h-3 bg-white/10 rounded w-1/2" />
            </div>
          ) : quickSlot ? (
            <>
              <Typography variant="h5" color="white" className="mb-1 leading-tight">
                {quickSlot.complexName}
              </Typography>
              <p className="text-white/60 text-[11px] font-semibold mb-2 truncate">
                {quickSlot.fieldName}
              </p>
              <div className="flex gap-3 text-xs text-white/50 font-semibold flex-wrap mb-3">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {quickSlot.slot.time}
                </span>
                <span className="flex items-center gap-1">
                  <i className="fa-solid fa-tag text-[var(--color-primary)]" />
                  <span className="text-[var(--color-primary-light)]">
                    ${Math.round(quickSlot.slot.price / 1000)}k
                  </span>
                </span>
              </div>
              {countdown && (
                <Typography variant="pixel" className="!text-[10px] !text-[var(--color-score)] mb-3">
                  {countdown}
                </Typography>
              )}
              <button
                onClick={() => {
                  if (onQuickBook && quickSlot) {
                    onQuickBook(quickSlot.field, quickSlot.slot.id, quickSlot.date);
                  } else {
                    navigate('/complexes');
                  }
                }}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-[var(--radius-lg)]
                  bg-[var(--color-primary)] text-white text-[11px] font-extrabold
                  hover:opacity-90 active:scale-95 transition-all"
              >
                <i className="fa-solid fa-calendar-check" />
                Reservar ahora
              </button>
            </>
          ) : (
            <>
              <p className="text-white/50 text-[11px] font-semibold mb-3">
                No hay horarios disponibles hoy cerca de ti.
              </p>
              <button
                onClick={() => navigate('/complexes')}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-[var(--radius-lg)]
                  border border-white/20 text-white/70 text-[11px] font-extrabold
                  hover:bg-white/10 active:scale-95 transition-all"
              >
                Ver complejos
              </button>
            </>
          )}
        </div>
      </div>
      )}{/* end pinned widget wrapper */}
      </div>
    </aside>
  );
}
