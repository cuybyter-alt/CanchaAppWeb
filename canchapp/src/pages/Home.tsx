import React, { useEffect, useRef, useState } from 'react';
import { MapPin, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Typography } from '../components/ui/typography';
import { PromoBanner } from '../components/sections/PromoBanner';
import { MapCard } from '../components/sections/MapCard';
import { FiltersBar } from '../components/features/FiltersBar';
import { BookingPanel } from '../components/features/BookingPanel';
import { BookingCard } from '../components/features/BookingCard';
import { ComplexCard } from '../components/features/ComplexCard';
import { ComplexFieldsDialog } from '../components/features/ComplexFieldsDialog';
import { mockFields } from '../mock/fields';
import type { Booking, ComplexField, ComplexFieldType, Field, TimeSlotData } from '../types/field';
import type { NearbyComplex } from '../types/map';
import { useMapContext } from '../context/MapContext';
import demoReservationService from '../services/DemoReservationService';
import demoFavoritesService from '../services/DemoFavoritesService';
import complexesService from '../services/ComplexesService';
import { formatPrice } from '../lib/utils';

const FILTER_TO_API: Record<string, string | undefined> = {
  futbol5: 'futbol_5',
  futbol7: 'futbol_7',
  futbol11: 'futbol_11',
  microfutbol: 'microfutbol',
  futsal: 'futsal',
};

const COMPLEX_TO_SPORT: Record<ComplexFieldType, Field['sport']> = {
  futbol_5: 'futbol5',
  futbol_7: 'futbol7',
  futbol_11: 'futbol11',
  microfutbol: 'microfutbol',
  futsal: 'futbol5',
};

const COMPLEX_SPORT_LABEL: Record<ComplexFieldType, string> = {
  futbol_5: 'F\u00fatbol 5',
  futbol_7: 'F\u00fatbol 7',
  futbol_11: 'F\u00fatbol 11',
  microfutbol: 'Microf\u00fatbol',
  futsal: 'Futsal',
};

function buildSyntheticField(cf: ComplexField, complex: import('../types/map').NearbyComplex, slot: TimeSlotData): Field {
  return {
    id: cf.fieldId,
    name: cf.name,
    sport: COMPLEX_TO_SPORT[cf.type] ?? 'futbol5',
    sportLabel: COMPLEX_SPORT_LABEL[cf.type] ?? cf.type,
    location: `${complex.name} \u00b7 ${complex.city}`,
    distance: complex.distanceLabel,
    price: slot.price,
    priceLabel: formatPrice(slot.price),
    rating: 0,
    reviewCount: 0,
    image: '',
    tags: [],
    amenities: [],
    availability: [slot],
    isFavorite: false,
    capacity: 10,
  };
}

const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const Home: React.FC = () => {
  const initialCachedFields = complexesService.getCachedFieldsSync();
  const initialFields = demoFavoritesService.applyFavorites(
    initialCachedFields.map((f) => demoReservationService.applyLockedSlots(f)),
  );
  const [fields, setFields] = useState<Field[]>(initialFields);
  const [selectedFieldId, setSelectedFieldId] = useState<string>(initialFields[0]?.id ?? '');
  const [bookings, setBookings] = useState<Booking[]>(demoReservationService.getBookings());
  const [locationGranted, setLocationGranted] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  // Nearby complexes
  const [nearbyComplexes, setNearbyComplexes] = useState<NearbyComplex[]>([]);
  const [isLoadingComplexes, setIsLoadingComplexes] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedComplex, setSelectedComplex] = useState<NearbyComplex | null>(null);
  const [isComplexDialogOpen, setIsComplexDialogOpen] = useState(false);
  // Panel override: when a slot is chosen from the dialog on desktop
  const [panelOverrideField, setPanelOverrideField] = useState<Field | null>(null);
  const [bookingPanelFlash, setBookingPanelFlash] = useState(false);
  // Skip first run of filter effect (initial complexes loaded by geo effect)
  const skipFirstFilterEffect = useRef(true);
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

  useEffect(() => {
    let mounted = true;

    const loadFields = async () => {
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
          // loading complete
        }
      }
    };

    loadFields();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;

    let cancelled = false;
    setIsLoadingComplexes(true);

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        if (cancelled) return;
        setLocationGranted(true);
        setUserCoords({ lat: coords.latitude, lng: coords.longitude });
        try {
          const complexes = await complexesService.getNearbyComplexes(
            coords.latitude,
            coords.longitude,
          );
          if (cancelled) return;
          setNearbyComplexes(complexes);
        } catch (err) {
          console.error('Error cargando complejos cercanos:', err);
        } finally {
          if (!cancelled) setIsLoadingComplexes(false);
        }
      },
      () => { if (!cancelled) setIsLoadingComplexes(false); },
      { timeout: 8000, enableHighAccuracy: false },
    );

    return () => {
      cancelled = true;
    };
  }, []);

  // Re-fetch complexes when the active sport filter changes
  useEffect(() => {
    if (skipFirstFilterEffect.current) {
      skipFirstFilterEffect.current = false;
      return;
    }
    if (!userCoords) return;

    const fieldType = FILTER_TO_API[activeFilter];
    let cancelled = false;
    setIsLoadingComplexes(true);

    complexesService
      .getNearbyComplexes(userCoords.lat, userCoords.lng, 6, fieldType)
      .then((results) => { if (!cancelled) setNearbyComplexes(results); })
      .catch(console.error)
      .finally(() => { if (!cancelled) setIsLoadingComplexes(false); });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter]);

  const handleSlotFromDialog = (complexField: ComplexField, slot: TimeSlotData, _date: string) => {
    if (!selectedComplex) return;
    const synthField = buildSyntheticField(complexField, selectedComplex, slot);
    setPanelOverrideField(synthField);
    setIsComplexDialogOpen(false);
    setBookingPanelFlash(true);
    setTimeout(() => setBookingPanelFlash(false), 2500);
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
            <FiltersBar
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
            />
            <div className="mt-4">
              <MapCard
                onOpenMap={openMap}
                onMarkerClick={(marker) => {
                  const distKm = userCoords
                    ? haversineKm(userCoords.lat, userCoords.lng, marker.latitude, marker.longitude)
                    : 0;
                  setSelectedComplex({
                    ...marker,
                    distanceKm: distKm,
                    distanceLabel: distKm > 0 ? `${distKm.toFixed(1)} km` : '',
                  });
                  setIsComplexDialogOpen(true);
                }}
              />
            </div>
          </div>

          {/* Sección: Complejos Cercanos */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <Typography variant="h3" color="text">
                <i className="fa-solid fa-location-dot text-[var(--color-primary)] mr-2" />
                Complejos Cercanos
              </Typography>
              <button
                onClick={() => navigate('/fields')}
                className="flex items-center gap-1 text-[13px] font-extrabold text-[var(--color-primary-dark)] cursor-pointer hover:underline"
              >
                Ver todos <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            {isLoadingComplexes ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-[var(--color-surface)] border-[1.5px] border-[var(--color-border)] rounded-[var(--radius-2xl)] h-52 animate-pulse"
                  />
                ))}
              </div>
            ) : nearbyComplexes.length === 0 ? (
              <div className="bg-[var(--color-surface)] border-[1.5px] border-[var(--color-border)] rounded-[var(--radius-2xl)] p-6 text-center">
                <Typography variant="h4" color="text" className="mb-2">
                  No se encontraron complejos cercanos
                </Typography>
                <Typography variant="small" color="text-3">
                  Activa tu ubicación para ver complejos cerca de ti, o{' '}
                  <button
                    onClick={() => navigate('/fields')}
                    className="underline font-bold text-[var(--color-primary-dark)]"
                  >
                    explora todo
                  </button>.
                </Typography>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {nearbyComplexes.map((complex) => (
                  <ComplexCard
                    key={complex.id}
                    complex={complex}
                    onSelect={() => {
                      setSelectedComplex(complex);
                      setIsComplexDialogOpen(true);
                    }}
                  />
                ))}
              </div>
            )}
            {locationGranted && nearbyComplexes.length > 0 && (
              <p className="mt-3 text-xs font-bold text-[var(--color-text-3)]">
                Ordenados por distancia
              </p>
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
          {/* Flash hint when a slot is pre-selected from the complex dialog */}
          {bookingPanelFlash && (
            <div className="mb-2 flex items-center gap-2 px-3 py-2 rounded-[var(--radius-lg)]
              bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/40 animate-pulse">
              <i className="fa-solid fa-arrow-down text-[var(--color-primary)] animate-bounce text-sm" />
              <span className="text-[11px] font-extrabold text-[var(--color-primary-dark)]">
                Horario preseleccionado — confirma aqu\u00ed
              </span>
            </div>
          )}
          <div className={`transition-all duration-300 ${
            bookingPanelFlash
              ? 'ring-2 ring-[var(--color-primary)] ring-offset-2 ring-offset-[var(--color-surface)] rounded-[var(--radius-2xl)]'
              : ''
          }`}>
            <BookingPanel
              field={panelOverrideField ?? selectedField}
              onBookingCreated={handleBookingCreated}
              onSlotBooked={handleSlotBooked}
            />
          </div>
        </div>

      </div>

      {/* Dialog: canchas de un complejo */}
      <ComplexFieldsDialog
        isOpen={isComplexDialogOpen}
        onClose={() => setIsComplexDialogOpen(false)}
        complex={selectedComplex}
        onSlotSelected={handleSlotFromDialog}
        onBookingCreated={handleBookingCreated}
      />
    </div>
  );
};

export default Home;
