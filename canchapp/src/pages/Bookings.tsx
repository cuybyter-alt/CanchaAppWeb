import React, { useMemo, useState, useEffect } from 'react';
import { ArrowLeft, CalendarCheck, Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BookingCard } from '../components/features/BookingCard';
import { Typography } from '../components/ui/typography';
import type { Booking } from '../types/field';
import bookingService from '../services/BookingService';

type Tab = 'upcoming' | 'past';

const isUpcoming = (b: Booking): boolean =>
  !b.startIso || new Date(b.startIso) >= new Date();

const isPast = (b: Booking): boolean =>
  !!b.startIso && new Date(b.startIso) < new Date();

const Bookings: React.FC = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tab, setTab] = useState<Tab>('upcoming');
  const [complexQuery, setComplexQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    bookingService
      .getMyBookings()
      .then((data) => {
        if (!cancelled) setBookings(data);
      })
      .catch((err) => {
        if (!cancelled) setError((err as { message?: string })?.message ?? 'Error al cargar reservas.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const upcomingBookings = useMemo(
    () => bookings.filter(isUpcoming).sort((a, b) => {
      if (!a.startIso || !b.startIso) return 0;
      return new Date(a.startIso).getTime() - new Date(b.startIso).getTime();
    }),
    [bookings],
  );

  const pastBookings = useMemo(() => {
    let filtered = bookings.filter(isPast);

    if (complexQuery.trim()) {
      const q = complexQuery.trim().toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.complexName.toLowerCase().includes(q) ||
          b.fieldName.toLowerCase().includes(q),
      );
    }

    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      filtered = filtered.filter((b) => b.startIso && new Date(b.startIso) >= from);
    }

    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      filtered = filtered.filter((b) => b.startIso && new Date(b.startIso) <= to);
    }

    return filtered.sort((a, b) => {
      if (!a.startIso || !b.startIso) return 0;
      return new Date(b.startIso).getTime() - new Date(a.startIso).getTime();
    });
  }, [bookings, complexQuery, dateFrom, dateTo]);

  const visibleBookings = tab === 'upcoming' ? upcomingBookings : pastBookings;

  const clearPastFilters = () => {
    setComplexQuery('');
    setDateFrom('');
    setDateTo('');
  };

  const hasPastFilters = complexQuery.trim() || dateFrom || dateTo;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surf2)] transition-all duration-[var(--duration-fast)]"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>
        <Typography variant="h3" color="text" className="text-right">
          <CalendarCheck className="inline w-5 h-5 text-[var(--color-primary)] mr-2" />
          Mis Reservas
        </Typography>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[var(--color-surf2)] rounded-[var(--radius-xl)] w-fit border border-[var(--color-border)]">
        <button
          onClick={() => setTab('upcoming')}
          className={`px-5 py-2 rounded-[var(--radius-lg)] text-sm font-extrabold transition-all duration-[var(--duration-fast)] ${
            tab === 'upcoming'
              ? 'bg-[var(--color-surface)] text-[var(--color-primary-dark)] shadow-[var(--shadow-sm)]'
              : 'text-[var(--color-text-3)] hover:text-[var(--color-text-2)]'
          }`}
        >
          Próximas
          {!loading && upcomingBookings.length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 rounded-full bg-[var(--color-primary)] text-white text-[10px] font-black">
              {upcomingBookings.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('past')}
          className={`px-5 py-2 rounded-[var(--radius-lg)] text-sm font-extrabold transition-all duration-[var(--duration-fast)] ${
            tab === 'past'
              ? 'bg-[var(--color-surface)] text-[var(--color-primary-dark)] shadow-[var(--shadow-sm)]'
              : 'text-[var(--color-text-3)] hover:text-[var(--color-text-2)]'
          }`}
        >
          Pasadas
        </button>
      </div>

      {/* Filters (only for past tab) */}
      {tab === 'past' && (
        <div className="bg-[var(--color-surface)] border-[1.5px] border-[var(--color-border)] rounded-[var(--radius-2xl)] p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Complex / field search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-3)]" />
              <input
                type="text"
                value={complexQuery}
                onChange={(e) => setComplexQuery(e.target.value)}
                placeholder="Buscar por complejo o cancha…"
                className="w-full h-10 pl-9 pr-9 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] text-sm font-semibold text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-glow)]"
              />
              {complexQuery && (
                <button
                  onClick={() => setComplexQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-3)] hover:text-[var(--color-text)]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Date range */}
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-10 px-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] text-sm font-semibold text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
              />
              <span className="text-xs font-bold text-[var(--color-text-3)]">a</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-10 px-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] text-sm font-semibold text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
              />
            </div>

            {hasPastFilters && (
              <button
                onClick={clearPastFilters}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] text-xs font-extrabold text-[var(--color-text-2)] hover:bg-[var(--color-surf2)] transition-all"
              >
                <X className="w-3.5 h-3.5" />
                Limpiar
              </button>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="bg-[var(--color-surface)] border-[1.5px] border-[var(--color-border)] rounded-[var(--radius-2xl)] p-8 text-center">
          <Typography variant="small" color="text-3">
            Cargando reservas…
          </Typography>
        </div>
      ) : error ? (
        <div className="bg-[var(--color-surface)] border-[1.5px] border-[var(--color-border)] rounded-[var(--radius-2xl)] p-8 text-center">
          <Typography variant="small" color="text-3">
            {error}
          </Typography>
        </div>
      ) : visibleBookings.length === 0 ? (
        <div className="bg-[var(--color-surface)] border-[1.5px] border-[var(--color-border)] rounded-[var(--radius-2xl)] p-8 text-center">
          <Typography variant="h4" color="text" className="mb-2">
            {tab === 'upcoming' ? 'No tienes reservas próximas' : 'No se encontraron reservas pasadas'}
          </Typography>
          <Typography variant="small" color="text-3">
            {tab === 'upcoming'
              ? 'Haz tu primera reserva desde la página principal.'
              : hasPastFilters
              ? 'Intenta ajustar los filtros de búsqueda.'
              : 'Aún no tienes reservas completadas.'}
          </Typography>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visibleBookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              onCancelled={(id) =>
                setBookings((prev) =>
                  prev.map((b) => (b.id === id ? { ...b, status: 'cancelled' as const } : b)),
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Bookings;
