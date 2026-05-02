import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Search, X, Map, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ComplexCard } from '../components/features/ComplexCard';
import { ComplexFieldsDialog } from '../components/features/ComplexFieldsDialog';
import { BookingPanel } from '../components/features/BookingPanel';
import { MapCard } from '../components/sections/MapCard';
import { Typography } from '../components/ui/typography';
import type { NearbyComplex, ComplexMarker } from '../types/map';
import type { Booking, ComplexField, ComplexFieldType, ComplexListItem, Field, TimeSlotData } from '../types/field';
import complexesService from '../services/ComplexesService';
import favoritesService from '../services/FavoritesService';
import notify from '../services/toast';
import { formatPrice } from '../lib/utils';

function toNearbyComplex(c: ComplexListItem): NearbyComplex {
  return {
    id: c.id,
    name: c.name,
    address: c.city,
    city: c.city,
    latitude: 0,
    longitude: 0,
    minPrice: c.minPrice,
    maxPrice: c.maxPrice,
    fieldsCount: c.fieldsCount,
    distanceKm: 0,
    distanceLabel: '',
  };
}

const COMPLEX_TO_SPORT: Record<ComplexFieldType, Field['sport']> = {
  futbol_5: 'futbol5', futbol_7: 'futbol7', futbol_11: 'futbol11',
  microfutbol: 'microfutbol', futsal: 'futbol5',
};
const COMPLEX_SPORT_LABEL: Record<ComplexFieldType, string> = {
  futbol_5: 'Fútbol 5', futbol_7: 'Fútbol 7', futbol_11: 'Fútbol 11',
  microfutbol: 'Microfútbol', futsal: 'Futsal',
};

function buildSyntheticField(cf: ComplexField, complex: NearbyComplex, slot: TimeSlotData, allSlots: TimeSlotData[]): Field {
  return {
    id: cf.fieldId,
    name: cf.name,
    sport: COMPLEX_TO_SPORT[cf.type] ?? 'futbol5',
    sportLabel: COMPLEX_SPORT_LABEL[cf.type] ?? cf.type,
    location: `${complex.name} · ${complex.city}`,
    distance: '',
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

const Complexes: React.FC = () => {
  const navigate = useNavigate();

  const [complexes, setComplexes] = useState<NearbyComplex[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchReqId = useRef(0);

  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  const [selectedComplex, setSelectedComplex] = useState<NearbyComplex | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [, setBookings] = useState<Booking[]>([]);

  // Booking panel (opens after slot selection in dialog)
  const [panelField, setPanelField] = useState<Field | null>(null);
  const [panelSlotId, setPanelSlotId] = useState<string | undefined>(undefined);
  const [panelDate, setPanelDate] = useState<string | undefined>(undefined);
  const [bookingPanelOpen, setBookingPanelOpen] = useState(false);

  const [showMap, setShowMap] = useState(true);

  const handleSlotFromDialog = (complexField: ComplexField, slot: TimeSlotData, date: string, allSlots: TimeSlotData[]) => {
    if (!selectedComplex) return;
    const synthField = buildSyntheticField(complexField, selectedComplex, slot, allSlots);
    setPanelField(synthField);
    setPanelSlotId(slot.id);
    setPanelDate(date);
    setIsDialogOpen(false);
    setBookingPanelOpen(true);
  };

  const handleMapMarkerClick = (marker: ComplexMarker) => {
    setSelectedComplex({ ...marker, distanceKm: 0, distanceLabel: '' });
    setIsDialogOpen(true);
  };

  // Debounce search query
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 280);
    return () => clearTimeout(t);
  }, [query]);

  // Load complexes on mount and when search changes
  useEffect(() => {
    let cancelled = false;
    const reqId = ++searchReqId.current;

    if (debouncedQuery) {
      setIsSearching(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    complexesService
      .getComplexes({ search: debouncedQuery || undefined, pageSize: 50 })
      .then((data) => {
        if (cancelled || reqId !== searchReqId.current) return;
        setComplexes(data.map(toNearbyComplex));
      })
      .catch(() => {
        if (cancelled || reqId !== searchReqId.current) return;
        setError('No se pudieron cargar los complejos. Intenta de nuevo.');
      })
      .finally(() => {
        if (cancelled || reqId !== searchReqId.current) return;
        setIsLoading(false);
        setIsSearching(false);
      });

    return () => { cancelled = true; };
  }, [debouncedQuery]);

  // Load favorite IDs
  useEffect(() => {
    favoritesService.getFavoriteIds().then(setFavoriteIds).catch(() => {});
  }, []);

  const handleToggleFavorite = async (complexId: string) => {
    try {
      const nowFavorited = await favoritesService.toggleFavorite(complexId);
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (nowFavorited) { next.add(complexId); } else { next.delete(complexId); }
        return next;
      });
      notify.success(
        nowFavorited ? 'Añadido a favoritos' : 'Eliminado de favoritos',
        nowFavorited ? 'Complejo guardado en tus favoritos.' : 'Complejo eliminado de favoritos.',
      );
    } catch {
      notify.error('Error', 'No se pudo actualizar tus favoritos.');
    }
  };

  const sortedComplexes = [...complexes].sort((a, b) => {
    const aFav = favoriteIds.has(a.id) ? 0 : 1;
    const bFav = favoriteIds.has(b.id) ? 0 : 1;
    return aFav - bFav;
  });

  const showSkeleton = isLoading || isSearching;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surf2)] transition-all duration-[var(--duration-fast)]"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>

        <Typography variant="h3" color="text" className="text-right">
          <i className="fa-solid fa-building text-[var(--color-primary)] mr-2" />
          Complejos
        </Typography>
      </div>

      {/* Embedded map */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-[var(--color-text-3)] uppercase tracking-widest">
            <Map className="w-3 h-3 text-[var(--color-primary)]" />
            Mapa de complejos
          </div>
          <button
            onClick={() => setShowMap(p => !p)}
            className="flex items-center gap-1 text-[11px] font-bold text-[var(--color-text-3)] hover:text-[var(--color-primary)] transition-colors"
          >
            {showMap
              ? <><ChevronUp className="w-3.5 h-3.5" /> Ocultar</>
              : <><ChevronDown className="w-3.5 h-3.5" /> Mostrar</>}
          </button>
        </div>
        {showMap && (
          <div className="h-[220px] rounded-[var(--radius-2xl)] overflow-hidden">
            <MapCard
              showMiniMap={false}
              fullMapHeight="220px"
              onMarkerClick={handleMapMarkerClick}
            />
          </div>
        )}
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-3)] pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar complejos por nombre o ciudad…"
          className="w-full pl-10 pr-10 py-3 rounded-[var(--radius-xl)]
            bg-[var(--color-surface)] border-[1.5px] border-[var(--color-border)]
            text-[var(--color-text)] placeholder:text-[var(--color-text-3)]
            text-sm font-semibold
            focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20
            transition-all duration-[var(--duration-fast)]"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); inputRef.current?.focus(); }}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center
              rounded-full bg-[var(--color-border)] text-[var(--color-text-3)] hover:bg-[var(--color-primary)]/20
              hover:text-[var(--color-primary)] transition-all"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Result count */}
      {!showSkeleton && !error && complexes.length > 0 && (
        <p className="text-xs font-bold text-[var(--color-text-3)] -mt-2">
          {debouncedQuery
            ? `${complexes.length} resultado${complexes.length !== 1 ? 's' : ''} para "${debouncedQuery}"`
            : `${complexes.length} complejo${complexes.length !== 1 ? 's' : ''} disponibles`}
          {favoriteIds.size > 0 && ' · favoritos primero'}
        </p>
      )}
      {showSkeleton && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-[var(--color-surface)] border-[1.5px] border-[var(--color-border)] rounded-[var(--radius-2xl)] h-52 animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Error */}
      {!showSkeleton && error && (
        <div className="bg-[var(--color-surface)] border-[1.5px] border-[var(--color-border)] rounded-[var(--radius-2xl)] p-8 text-center">
          <Typography variant="small" color="text-3">{error}</Typography>
        </div>
      )}

      {/* Empty state */}
      {!showSkeleton && !error && complexes.length === 0 && (
        <div className="bg-[var(--color-surface)] border-[1.5px] border-[var(--color-border)] rounded-[var(--radius-2xl)] p-10 flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-full bg-[var(--color-primary-tint)] flex items-center justify-center">
            <i className="fa-solid fa-building-circle-xmark text-2xl text-[var(--color-primary)]" />
          </div>
          <Typography variant="h4" color="text">
            {debouncedQuery ? `Sin resultados para "${debouncedQuery}"` : 'No hay complejos disponibles'}
          </Typography>
          <Typography variant="small" color="text-3">
            {debouncedQuery ? 'Intenta con otro nombre o ciudad.' : 'Vuelve más tarde.'}
          </Typography>
          {debouncedQuery && (
            <button
              onClick={() => setQuery('')}
              className="mt-1 text-sm font-bold text-[var(--color-primary-dark)] hover:underline"
            >
              Limpiar búsqueda
            </button>
          )}
        </div>
      )}

      {/* Grid */}
      {!showSkeleton && !error && sortedComplexes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {sortedComplexes.map((complex) => (
            <ComplexCard
              key={complex.id}
              complex={complex}
              isFavorite={favoriteIds.has(complex.id)}
              onToggleFavorite={handleToggleFavorite}
              onSelect={() => {
                setSelectedComplex(complex);
                setIsDialogOpen(true);
              }}
            />
          ))}
        </div>
      )}

      {/* Complex fields dialog */}
      <ComplexFieldsDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        complex={selectedComplex}
        onSlotSelected={handleSlotFromDialog}
        onBookingCreated={(booking) => setBookings((prev) => [booking, ...prev])}
      />

      {/* Booking panel overlay (slides up on mobile, right drawer on desktop) */}
      {bookingPanelOpen && panelField && (
        <>
          {/* Backdrop with blur (mobile + desktop) */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[1000]"
            onClick={() => setBookingPanelOpen(false)}
          />
          {/* Panel container */}
          <div className="
            animate-slide-in-bottom lg:animate-slide-in-right
            fixed z-[1001]
            bottom-0 left-0 right-0
            lg:top-16 lg:right-0 lg:bottom-0 lg:left-auto lg:w-[380px]
            bg-[var(--color-surface)]
            rounded-t-[var(--radius-2xl)] lg:rounded-tl-[var(--radius-2xl)] lg:rounded-tr-none lg:rounded-b-none
            overflow-hidden overflow-y-auto
            max-h-[88vh] lg:max-h-none
            shadow-[0_-8px_40px_rgba(0,0,0,.35)] lg:shadow-[-8px_0_40px_rgba(0,0,0,.25)]
            lg:border-l lg:border-[var(--color-border)]
          ">
            {/* Mobile drag handle */}
            <div className="lg:hidden flex justify-center pt-3 pb-1 sticky top-0 bg-[var(--color-surface)] z-10">
              <div className="w-10 h-1 bg-[var(--color-border)] rounded-full" />
            </div>
            <BookingPanel
              field={panelField}
              onBookingCreated={(booking) => setBookings((prev) => [booking, ...prev])}
              preselectedSlotId={panelSlotId}
              preselectedDate={panelDate}
              onClose={() => setBookingPanelOpen(false)}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default Complexes;
