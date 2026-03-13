import React, { useMemo } from 'react';
import { ArrowLeft, CalendarCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BookingCard } from '../components/features/BookingCard';
import { Typography } from '../components/ui/typography';
import demoReservationService from '../services/DemoReservationService';
import type { Booking } from '../types/field';

const Bookings: React.FC = () => {
  const navigate = useNavigate();

  const bookings = useMemo<Booking[]>(() => demoReservationService.getBookings(), []);

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

      {bookings.length === 0 ? (
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
