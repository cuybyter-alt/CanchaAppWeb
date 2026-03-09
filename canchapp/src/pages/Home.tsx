import React, { useState } from 'react';
import { MapPin, ArrowRight } from 'lucide-react';
import { Typography } from '../components/ui/typography';
import { PromoBanner } from '../components/sections/PromoBanner';
import { MapCard } from '../components/sections/MapCard';
import { FiltersBar } from '../components/features/FiltersBar';
import { BookingPanel } from '../components/features/BookingPanel';
import { FieldCard } from '../components/features/FieldCard';
import { BookingCard } from '../components/features/BookingCard';
import { mockFields, mockBookings } from '../mock/fields';
import type { Field } from '../types/field';
import { useMapContext } from '../context/MapContext';

const Home: React.FC = () => {
  const [selectedField, setSelectedField] = useState<Field>(mockFields[0]);
  const { openMap } = useMapContext();

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
              {mockFields.map(field => (
                <FieldCard
                  key={field.id}
                  field={field}
                  isSelected={selectedField.id === field.id}
                  onSelect={setSelectedField}
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
              <button className="flex items-center gap-1 text-[13px] font-extrabold text-[var(--color-primary-dark)] cursor-pointer hover:underline">
                Ver todas <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {mockBookings.map(booking => (
                <BookingCard key={booking.id} booking={booking} />
              ))}
            </div>
          </div>

        </div>

        {/* Columna derecha: panel de reserva sticky (solo desktop) */}
        <div className="hidden lg:block w-80 sticky top-20 flex-shrink-0">
          <BookingPanel field={selectedField} />
        </div>

      </div>
    </div>
  );
};

export default Home;
