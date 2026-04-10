import React, { useState, useEffect } from 'react';
import { ArrowLeft, CalendarCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BookingCard } from '../components/features/BookingCard';
import { Typography } from '../components/ui/typography';
import type { Booking } from '../types/field';
import bookingService from '../services/BookingService';

const Bookings: React.FC = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surf2)] transition-all duration-[var(--duration-fast)]"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>

        <Typography variant="h3" color="text" className="text-right">
          <CalendarCheck className="inline w-5 h-5 text-[var(--color-primary)] mr-2" />
          Todas Mis Reservas
        </Typography>
      </div>

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
      ) : bookings.length === 0 ? (
        <div className="bg-[var(--color-surface)] border-[1.5px] border-[var(--color-border)] rounded-[var(--radius-2xl)] p-8 text-center">
          <Typography variant="h4" color="text" className="mb-2">
            Aún no tienes reservas
          </Typography>
          <Typography variant="small" color="text-3">
            Haz tu primera reserva desde la página principal.
          </Typography>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {bookings.map((booking) => (
            <BookingCard key={booking.id} booking={booking} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Bookings;
