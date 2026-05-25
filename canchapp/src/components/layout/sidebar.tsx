import { Calendar, Heart, Home, MapPin, Search, Settings, Wallet, User } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Typography } from '../ui/typography';
import { Badge } from '../ui/badge';
import { useEffect, useState } from 'react';
import { useMapContext } from '../../context/MapContext';
import authService from '../../services/AuthService';
import bookingService from '../../services/BookingService';
import complexesService from '../../services/ComplexesService';
import schedulingService from '../../services/SchedulingService';
import { formatPrice } from '../../lib/utils';
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

export function Sidebar({ onQuickBook }: SidebarProps = {}) {
  const { openMap } = useMapContext();
  const navigate = useNavigate();

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

        const today = new Date().toISOString().split('T')[0];

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
      <div className="flex-1 overflow-y-auto min-h-0 flex flex-col gap-1 px-6 pt-6 pb-2">
      {/* Menu Section */}
      <Typography variant="pixel-sm" color="muted" className="px-3 pt-2 pb-1 mt-2">
        MENÚ
      </Typography>

      <NavLink
        to="/"
        end
        className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-3 rounded-[var(--radius-lg)] cursor-pointer text-sm font-extrabold
          transition-all duration-[var(--duration-fast)] relative no-underline
          ${
            isActive
              ? 'bg-[var(--color-primary-tint)] text-[var(--color-primary-dark)] before:absolute before:left-0 before:top-[20%] before:bottom-[20%] before:w-[3px] before:rounded-r-[var(--radius-xs)] before:bg-[var(--color-primary)]'
              : 'text-[var(--color-text-2)] hover:bg-[var(--color-surf2)] hover:text-[var(--color-primary-dark)]'
          }`
        }
      >
        <Home className="w-[18px] h-[18px] flex-shrink-0" />
        Inicio
      </NavLink>

      <NavLink
        to="/fields"
        className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-3 rounded-[var(--radius-lg)] cursor-pointer text-sm font-extrabold
          transition-all duration-[var(--duration-fast)] relative no-underline
          ${
            isActive
              ? 'bg-[var(--color-primary-tint)] text-[var(--color-primary-dark)] before:absolute before:left-0 before:top-[20%] before:bottom-[20%] before:w-[3px] before:rounded-r-[var(--radius-xs)] before:bg-[var(--color-primary)]'
              : 'text-[var(--color-text-2)] hover:bg-[var(--color-surf2)] hover:text-[var(--color-primary-dark)]'
          }`
        }
      >
        <Search className="w-[18px] h-[18px] flex-shrink-0" />
        Buscar Canchas
      </NavLink>

      <NavLink
        to="/bookings"
        className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-3 rounded-[var(--radius-lg)] cursor-pointer text-sm font-extrabold
          transition-all duration-[var(--duration-fast)] relative no-underline
          ${
            isActive
              ? 'bg-[var(--color-primary-tint)] text-[var(--color-primary-dark)] before:absolute before:left-0 before:top-[20%] before:bottom-[20%] before:w-[3px] before:rounded-r-[var(--radius-xs)] before:bg-[var(--color-primary)]'
              : 'text-[var(--color-text-2)] hover:bg-[var(--color-surf2)] hover:text-[var(--color-primary-dark)]'
          }`
        }
      >
        <Calendar className="w-[18px] h-[18px] flex-shrink-0" />
        Mis Reservas
        {!loadingBookingsCount && myBookingsCount > 0 && (
          <Badge variant="primary" className="ml-auto">
            {myBookingsCount}
          </Badge>
        )}
      </NavLink>

      <NavLink
        to="/favorites"
        className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-3 rounded-[var(--radius-lg)] cursor-pointer text-sm font-extrabold
          transition-all duration-[var(--duration-fast)] relative no-underline
          ${
            isActive
              ? 'bg-[var(--color-primary-tint)] text-[var(--color-primary-dark)] before:absolute before:left-0 before:top-[20%] before:bottom-[20%] before:w-[3px] before:rounded-r-[var(--radius-xs)] before:bg-[var(--color-primary)]'
              : 'text-[var(--color-text-2)] hover:bg-[var(--color-surf2)] hover:text-[var(--color-primary-dark)]'
          }`
        }
      >
        <Heart className="w-[18px] h-[18px] flex-shrink-0" />
        Favoritos
      </NavLink>

      <button
        className="flex items-center gap-3 px-3 py-3 rounded-[var(--radius-lg)] cursor-pointer text-sm font-extrabold text-[var(--color-text-2)] transition-all duration-[var(--duration-fast)] hover:bg-[var(--color-surf2)] hover:text-[var(--color-primary-dark)]"
        onClick={openMap}
      >
        <MapPin className="w-[18px] h-[18px] flex-shrink-0" />
        Mapa Cercano
      </button>

      {/* Divider */}
      <div className="h-[1.5px] bg-[var(--color-border)] rounded-sm my-2" />

      {/* Account Section */}
      <Typography variant="pixel-sm" color="muted" className="px-3 pt-2 pb-1">
        CUENTA
      </Typography>

      <NavLink
        to="/profile"
        className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-3 rounded-[var(--radius-lg)] cursor-pointer text-sm font-extrabold
          transition-all duration-[var(--duration-fast)] relative no-underline
          ${
            isActive
              ? 'bg-[var(--color-primary-tint)] text-[var(--color-primary-dark)] before:absolute before:left-0 before:top-[20%] before:bottom-[20%] before:w-[3px] before:rounded-r-[var(--radius-xs)] before:bg-[var(--color-primary)]'
              : 'text-[var(--color-text-2)] hover:bg-[var(--color-surf2)] hover:text-[var(--color-primary-dark)]'
          }`
        }
      >
        <User className="w-[18px] h-[18px] flex-shrink-0" />
        Perfil
      </NavLink>

      <NavLink
        to="/payments"
        className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-3 rounded-[var(--radius-lg)] cursor-pointer text-sm font-extrabold
          transition-all duration-[var(--duration-fast)] relative no-underline
          ${
            isActive
              ? 'bg-[var(--color-primary-tint)] text-[var(--color-primary-dark)] before:absolute before:left-0 before:top-[20%] before:bottom-[20%] before:w-[3px] before:rounded-r-[var(--radius-xs)] before:bg-[var(--color-primary)]'
              : 'text-[var(--color-text-2)] hover:bg-[var(--color-surf2)] hover:text-[var(--color-primary-dark)]'
          }`
        }
      >
        <Wallet className="w-[18px] h-[18px] flex-shrink-0" />
        Pagos
        <Badge variant="accent" className="ml-auto">
          !
        </Badge>
      </NavLink>

      <NavLink
        to="/settings"
        className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-3 rounded-[var(--radius-lg)] cursor-pointer text-sm font-extrabold
          transition-all duration-[var(--duration-fast)] relative no-underline
          ${
            isActive
              ? 'bg-[var(--color-primary-tint)] text-[var(--color-primary-dark)] before:absolute before:left-0 before:top-[20%] before:bottom-[20%] before:w-[3px] before:rounded-r-[var(--radius-xs)] before:bg-[var(--color-primary)]'
              : 'text-[var(--color-text-2)] hover:bg-[var(--color-surf2)] hover:text-[var(--color-primary-dark)]'
          }`
        }
      >
        <Settings className="w-[18px] h-[18px] flex-shrink-0" />
        Configuración
      </NavLink>

      <div className="h-[1.5px] bg-[var(--color-border)] rounded-sm my-2" />
      </div>{/* end scrollable nav */}

      {/* Quick-reserve widget — always visible, pinned at bottom */}
      <div className="flex-shrink-0 px-6 pb-6 pt-3">
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
                  {quickSlot.slot.time} {quickSlot.slot.period}
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
      </div>{/* end pinned widget wrapper */}
      </div>
    </aside>
  );
}
