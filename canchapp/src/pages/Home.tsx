import React, { useState } from 'react';
import { MapPin, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Typography } from '../components/ui/typography';
import { PromoBanner } from '../components/sections/PromoBanner';
import { MapCard } from '../components/sections/MapCard';
import { FiltersBar } from '../components/features/FiltersBar';
import { BookingPanel } from '../components/features/BookingPanel';
import { FieldCard } from '../components/features/FieldCard';
import { BookingCard } from '../components/features/BookingCard';
import { mockFields } from '../mock/fields';
import type { Booking, Field } from '../types/field';
import { useMapContext } from '../context/MapContext';
import demoReservationService from '../services/DemoReservationService';
import demoFavoritesService from '../services/DemoFavoritesService';

const Home: React.FC = () => {
  const initialFields = demoFavoritesService.applyFavorites(
    mockFields.map((f) => demoReservationService.applyLockedSlots(f)),
  );
  const [fields, setFields] = useState<Field[]>(initialFields);
  const [selectedFieldId, setSelectedFieldId] = useState<string>(initialFields[0]?.id ?? '');
  const [bookings, setBookings] = useState<Booking[]>(demoReservationService.getBookings());
  const { openMap } = useMapContext();
  const navigate = useNavigate();

  const selectedField = fields.find((f) => f.id === selectedFieldId) ?? fields[0] ?? null;

  const handleBookingCreated = (booking: Booking) => {
    const updated = demoReservationService.addBooking(booking);
    setBookings(updated);
  };

  const handleSlotBooked = (fieldId: string, slotId: string) => {
    demoReservationService.lockSlot(fieldId, slotId);

    setFields((prev) =>
      prev.map((field) =>
        field.id === fieldId
          ? {
              ...field,
              availability: field.availability.map((slot) =>
                slot.id === slotId ? { ...slot, status: 'taken', spotsLeft: undefined } : slot,
              ),
            }
          : field,
      ),
    );
  };

  const handleToggleFavorite = (fieldId: string) => {
    const favoriteIds = new Set(demoFavoritesService.toggleFavorite(fieldId));
    setFields((prev) =>
      prev.map((field) => ({
        ...field,
        isFavorite: favoriteIds.has(field.id),
      })),
    );
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Promo Banner */}
      <PromoBanner />

      {/* Layout de dos columnas: contenido principal + panel de reserva */}
      <div className="flex gap-6 items-start">

        {/* Columna izquierda: todo el contenido principal */}
        <div className="flex-1 min-w-0 space-y-8">

          {/* Sección: Mapa */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <Typography variant="h3" color="text">
                <MapPin className="inline w-5 h-5 text-[var(--color-primary)] mr-2" />
                Cerca de ti
              </Typography>
              <button
                className="flex items-center gap-1 text-[13px] font-extrabold text-[var(--color-primary-dark)] cursor-pointer hover:underline"
                onClick={openMap}
              >
                Ver mapa completo <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <FiltersBar />
            <div className="mt-4">
              <MapCard onOpenMap={openMap} />
            </div>
          </div>

          {/* Sección: Mejores Canchas */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <Typography variant="h3" color="text">
                <i className="fa-solid fa-star text-[var(--color-primary)] mr-2" />
                Mejores Canchas
              </Typography>
              <button className="flex items-center gap-1 text-[13px] font-extrabold text-[var(--color-primary-dark)] cursor-pointer hover:underline">
                Ver todas <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {fields.map(field => (
                <FieldCard
                  key={field.id}
                  field={field}
                  isSelected={selectedField?.id === field.id}
                  onSelect={(next) => setSelectedFieldId(next.id)}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </div>
          </div>

          {/* Sección: Mis Reservas */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <Typography variant="h3" color="text">
                <i className="fa-regular fa-calendar-check text-[var(--color-primary)] mr-2" />
                Mis Reservas
              </Typography>
              <button
                onClick={() => navigate('/bookings')}
                className="flex items-center gap-1 text-[13px] font-extrabold text-[var(--color-primary-dark)] cursor-pointer hover:underline"
              >
                Ver todas <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {bookings.slice(0, 3).map(booking => (
                <BookingCard key={booking.id} booking={booking} />
              ))}
            </div>
            {bookings.length > 3 && (
              <div className="mt-4 flex justify-center">
                <button
                  onClick={() => navigate('/bookings')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-lg)] border-2 border-[var(--color-primary)] text-[var(--color-primary-dark)] font-extrabold hover:bg-[var(--color-primary-tint)] transition-all duration-[var(--duration-fast)]"
                >
                  Ver más
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Columna derecha: panel de reserva sticky (solo desktop) */}
        <div className="hidden lg:block w-80 sticky top-20 flex-shrink-0">
          <BookingPanel
            field={selectedField}
            onBookingCreated={handleBookingCreated}
            onSlotBooked={handleSlotBooked}
          />
        </div>

      </div>
    </div>
  );
};

export default Home;
