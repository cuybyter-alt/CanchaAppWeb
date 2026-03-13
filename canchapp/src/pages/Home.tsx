import React, { useEffect, useState } from 'react';
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
import complexesService from '../services/ComplexesService';

const Home: React.FC = () => {
  const initialCachedFields = complexesService.getCachedFieldsSync();
  const initialFields = demoFavoritesService.applyFavorites(
    initialCachedFields.map((f) => demoReservationService.applyLockedSlots(f)),
  );
  const [fields, setFields] = useState<Field[]>(initialFields);
  const [selectedFieldId, setSelectedFieldId] = useState<string>(initialFields[0]?.id ?? '');
  const [bookings, setBookings] = useState<Booking[]>(demoReservationService.getBookings());
  const [isLoadingFields, setIsLoadingFields] = useState(false);
  const { openMap } = useMapContext();
  const navigate = useNavigate();

  const selectedField = fields.find((f) => f.id === selectedFieldId) ?? fields[0] ?? null;
  const favoriteFields = fields.filter((field) => field.isFavorite);
  const featuredFavoriteFields = favoriteFields.slice(0, 3);

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

  useEffect(() => {
    let mounted = true;

    const loadFields = async () => {
      setIsLoadingFields(true);
      let receivedAnyBatch = false;

      try {
        const apiFields = await complexesService.getAllFieldsFromAllComplexes({
          onBatch: (batchFields) => {
            if (!mounted || batchFields.length === 0) return;
            receivedAnyBatch = true;

            const preparedBatch = demoFavoritesService.applyFavorites(
              batchFields.map((field) => demoReservationService.applyLockedSlots(field)),
            );

            setFields(preparedBatch);
            setSelectedFieldId((current) => {
              if (preparedBatch.some((field) => field.id === current)) return current;
              return preparedBatch[0]?.id ?? '';
            });
          },
        });
        if (!mounted || apiFields.length === 0) return;

        const preparedFields = demoFavoritesService.applyFavorites(
          apiFields.map((field) => demoReservationService.applyLockedSlots(field)),
        );

        setFields(preparedFields);
        setSelectedFieldId((current) => {
          if (preparedFields.some((field) => field.id === current)) return current;
          return preparedFields[0]?.id ?? '';
        });
      } catch (error) {
        console.error('No se pudieron cargar las canchas desde complexes/fields. Usando mock.', error);
        if (!receivedAnyBatch) {
          const fallbackFields = demoFavoritesService.applyFavorites(
            mockFields.map((f) => demoReservationService.applyLockedSlots(f)),
          );
          setFields(fallbackFields);
          setSelectedFieldId(fallbackFields[0]?.id ?? '');
        }
      } finally {
        if (mounted) {
          setIsLoadingFields(false);
        }
      }
    };

    loadFields();

    return () => {
      mounted = false;
    };
  }, []);

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
              <button
                onClick={() => navigate('/fields')}
                className="flex items-center gap-1 text-[13px] font-extrabold text-[var(--color-primary-dark)] cursor-pointer hover:underline"
              >
                Ver todas <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            {featuredFavoriteFields.length === 0 ? (
              <div className="bg-[var(--color-surface)] border-[1.5px] border-[var(--color-border)] rounded-[var(--radius-2xl)] p-6 text-center">
                <Typography variant="h4" color="text" className="mb-2">
                  Aún no tienes canchas favoritas
                </Typography>
                <Typography variant="small" color="text-3">
                  Entra a Ver todas y marca tus favoritas con el corazón.
                </Typography>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {featuredFavoriteFields.map(field => (
                  <FieldCard
                    key={field.id}
                    field={field}
                    isSelected={selectedField?.id === field.id}
                    onSelect={(next) => setSelectedFieldId(next.id)}
                    onToggleFavorite={handleToggleFavorite}
                  />
                ))}
              </div>
            )}
            {isLoadingFields && (
              <p className="mt-3 text-xs font-bold text-[var(--color-text-3)]">
                Cargando canchas desde complejos...
              </p>
            )}
            {favoriteFields.length > 3 && (
              <div className="mt-4 flex justify-center">
                <button
                  onClick={() => navigate('/favorites')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-lg)] border-2 border-[var(--color-primary)] text-[var(--color-primary-dark)] font-extrabold hover:bg-[var(--color-primary-tint)] transition-all duration-[var(--duration-fast)]"
                >
                  Ver más
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
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
