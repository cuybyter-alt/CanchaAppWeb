import { useEffect, useState } from 'react';
import { MapCard } from '../sections/MapCard';
import { Dialog } from '../ui/dialog';
import { ComplexFieldsDialog } from '../features/ComplexFieldsDialog';
import { BookingPanel } from '../features/BookingPanel';
import type { ComplexMarker, NearbyComplex } from '../../types/map';
import type { Booking, ComplexField, ComplexFieldType, Field, TimeSlotData } from '../../types/field';
import { formatPrice } from '../../lib/utils';

interface MapDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

// ── Local type helpers ─────────────────────────────────────────────────────

const COMPLEX_TO_SPORT: Record<ComplexFieldType, Field['sport']> = {
  futbol_5: 'futbol5',
  futbol_7: 'futbol7',
  futbol_11: 'futbol11',
  microfutbol: 'microfutbol',
  futsal: 'futbol5',
};

function markerToNearbyComplex(m: ComplexMarker): NearbyComplex {
  return { ...m, distanceKm: 0, distanceLabel: '' };
}

function buildSyntheticField(
  cf: ComplexField,
  complex: NearbyComplex,
  slot: TimeSlotData,
): Field {
  const sport = COMPLEX_TO_SPORT[cf.type] ?? 'futbol5';
  const sportLabel = cf.type.replace('_', ' ');
  const location = [complex.name, complex.city].filter(Boolean).join(' · ');
  return {
    id: cf.fieldId,
    name: cf.name,
    sport,
    sportLabel,
    location,
    distance: complex.distanceLabel || complex.address || '',
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

// ── Component ──────────────────────────────────────────────────────────────

export function MapDialog({ isOpen, onClose }: MapDialogProps) {
  const [selectedComplex, setSelectedComplex] = useState<NearbyComplex | null>(null);
  const [isComplexDialogOpen, setIsComplexDialogOpen] = useState(false);
  const [panelField, setPanelField] = useState<Field | null>(null);
  const [bookingPanelFlash, setBookingPanelFlash] = useState(false);

  // Reset internal state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setIsComplexDialogOpen(false);
      setPanelField(null);
      setBookingPanelFlash(false);
    }
  }, [isOpen]);

  const handleMarkerClick = (marker: ComplexMarker) => {
    setSelectedComplex(markerToNearbyComplex(marker));
    setIsComplexDialogOpen(true);
  };

  const handleSlotFromDialog = (complexField: ComplexField, slot: TimeSlotData, _date: string) => {
    if (!selectedComplex) return;
    const synthField = buildSyntheticField(complexField, selectedComplex, slot);
    setPanelField(synthField);
    setIsComplexDialogOpen(false);
    setBookingPanelFlash(true);
    setTimeout(() => setBookingPanelFlash(false), 2500);
  };

  // BookingPanel callbacks — booking is confirmed via API + toast; no local
  // state needs updating inside the map dialog.
  const handleBookingCreated = (_booking: Booking) => {};
  const handleSlotBooked = (_fieldId: string, _slotId: string) => {};

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="🗺️ Mapa de Canchas Cercanas" size="full">
      {/* ── Two-column layout: map left, booking panel right (desktop) ── */}
      <div className="flex">

        {/* Map column */}
        <div className="flex-1 relative" style={{ minHeight: '72vh' }}>
          <MapCard showMiniMap={false} onMarkerClick={handleMarkerClick} />
        </div>

        {/* Booking / legend panel (desktop only, right side) */}
        <div
          className="hidden lg:flex flex-col w-80 flex-shrink-0 border-l border-[var(--color-border)] bg-[var(--color-surf2)] overflow-y-auto"
          style={{ maxHeight: '82vh' }}
        >
          {panelField ? (
            <>
              {/* Flash hint */}
              {bookingPanelFlash && (
                <div className="mx-4 mt-4 flex items-center gap-2 px-3 py-2 rounded-[var(--radius-lg)]
                  bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/40 animate-pulse">
                  <i className="fa-solid fa-arrow-down text-[var(--color-primary)] animate-bounce text-sm" />
                  <span className="text-[11px] font-extrabold text-[var(--color-primary-dark)]">
                    Horario preseleccionado
                  </span>
                </div>
              )}
              <div className={`flex-1 transition-all duration-300 ${
                bookingPanelFlash
                  ? 'ring-2 ring-[var(--color-primary)] ring-offset-2 ring-offset-[var(--color-surf2)] rounded-[var(--radius-2xl)] m-2'
                  : ''
              }`}>
                <BookingPanel
                  field={panelField}
                  onBookingCreated={handleBookingCreated}
                  onSlotBooked={handleSlotBooked}
                />
              </div>
            </>
          ) : (
            /* Legend panel */
            <div className="p-5 flex flex-col gap-4">
              <p className="text-[11px] font-extrabold text-[var(--color-text-3)] uppercase tracking-widest">
                Cómo usar el mapa
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-2.5 text-[12px] font-medium text-[var(--color-text-2)]">
                  <span className="w-5 h-5 mt-0.5 rounded-full bg-[var(--color-primary)]/20 flex items-center justify-center flex-shrink-0">
                    <i className="fa-solid fa-location-dot text-[var(--color-primary)] text-[10px]" />
                  </span>
                  Haz clic en un marcador para ver las canchas del complejo
                </li>
                <li className="flex items-start gap-2.5 text-[12px] font-medium text-[var(--color-text-2)]">
                  <span className="w-5 h-5 mt-0.5 rounded-full bg-[var(--color-primary)]/20 flex items-center justify-center flex-shrink-0">
                    <i className="fa-solid fa-clock text-[var(--color-primary)] text-[10px]" />
                  </span>
                  Selecciona un horario disponible en el diálogo
                </li>
                <li className="flex items-start gap-2.5 text-[12px] font-medium text-[var(--color-text-2)]">
                  <span className="w-5 h-5 mt-0.5 rounded-full bg-[var(--color-primary)]/20 flex items-center justify-center flex-shrink-0">
                    <i className="fa-solid fa-calendar-check text-[var(--color-primary)] text-[10px]" />
                  </span>
                  Pulsa "Ir al panel" para confirmar tu reserva aquí
                </li>
              </ul>
              <div className="mt-2 border-t border-[var(--color-border)] pt-4 space-y-2">
                <div className="flex items-center gap-2 text-[11px] font-semibold text-[var(--color-text-3)]">
                  <div className="w-3 h-3 rounded-full bg-[var(--color-primary)]" />
                  Con canchas disponibles
                </div>
                <div className="flex items-center gap-2 text-[11px] font-semibold text-[var(--color-text-3)]">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  Sin canchas / sin datos de precio
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile: legend / booking panel below the map */}
      <div className="lg:hidden px-5 py-4 bg-[var(--color-surf2)] border-t border-[var(--color-border)]">
        {panelField ? (
          <>
            {bookingPanelFlash && (
              <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-[var(--radius-lg)]
                bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/40 animate-pulse">
                <i className="fa-solid fa-arrow-down text-[var(--color-primary)] animate-bounce" />
                <span className="text-[11px] font-extrabold text-[var(--color-primary-dark)]">
                  Horario preseleccionado — reserva aquí
                </span>
              </div>
            )}
            <BookingPanel
              field={panelField}
              onBookingCreated={handleBookingCreated}
              onSlotBooked={handleSlotBooked}
            />
          </>
        ) : (
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-5 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[var(--color-primary)]" />
                <span className="text-[var(--color-text-2)] text-[12px]">Con canchas</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-[var(--color-text-2)] text-[12px]">Sin datos</span>
              </div>
            </div>
            <p className="text-[11px] font-medium text-[var(--color-text-3)]">
              💡 Toca un marcador para ver canchas y horarios
            </p>
          </div>
        )}
      </div>

      {/* Complex fields dialog — rendered as a child (higher z-index) */}
      <ComplexFieldsDialog
        isOpen={isComplexDialogOpen}
        onClose={() => setIsComplexDialogOpen(false)}
        complex={selectedComplex}
        onSlotSelected={handleSlotFromDialog}
        onBookingCreated={handleBookingCreated}
      />
    </Dialog>
  );
}

