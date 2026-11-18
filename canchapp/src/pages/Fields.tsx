import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Search, SlidersHorizontal, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ComplexCard } from '../components/features/ComplexCard';
import { ComplexFieldsDialog } from '../components/features/ComplexFieldsDialog';
import { ReviewsDialog } from '../components/features/ReviewsDialog';
import { BookingPanel } from '../components/features/BookingPanel';
import { Typography } from '../components/ui/typography';
import type { NearbyComplex } from '../types/map';
import type { Booking, ComplexField, ComplexFieldType, ComplexListItem, Field, TimeSlotData } from '../types/field';
import complexesService from '../services/ComplexesService';
import favoritesService from '../services/FavoritesService';
import bookingService from '../services/BookingService';
import authService from '../services/AuthService';
import notify from '../services/toast';
import { formatPrice } from '../lib/utils';
import { useMapContext } from '../context/MapContext';

function toNearbyComplex(c: ComplexListItem): NearbyComplex {
  return {
    id: c.id,
    name: c.name,
    address: c.address ?? c.city,
    city: c.city,
    latitude: c.latitude ?? 0,
    longitude: c.longitude ?? 0,
    minPrice: c.minPrice,
    maxPrice: c.maxPrice,
    fieldsCount: c.fieldsCount,
    distanceKm: 0,
    distanceLabel: '',
    averageRating: c.averageRating ?? 0,
    reviewCount: c.reviewCount ?? 0,
    imageUrl: c.lastImageUrl ?? null,
    imagesCount: c.imagesCount ?? 0,
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

type SortId = 'relevance' | 'price-asc' | 'price-desc';

const sortOptions: Array<{ id: SortId; label: string }> = [
  { id: 'relevance', label: 'Relevancia' },
  { id: 'price-asc', label: 'Precio ↑' },
  { id: 'price-desc', label: 'Precio ↓' },
];

const Fields: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setSearchQuery } = useMapContext();
  const searchReqId = useRef(0);

  const appliedQuery = (searchParams.get('q') ?? '').trim();

  const [complexes, setComplexes] = useState<NearbyComplex[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  const [sortBy, setSortBy] = useState<SortId>('relevance');

  // Dialog / booking panel state
  const [selectedComplex, setSelectedComplex] = useState<NearbyComplex | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [panelField, setPanelField] = useState<Field | null>(null);
  const [panelSlotId, setPanelSlotId] = useState<string | undefined>(undefined);
  const [panelDate, setPanelDate] = useState<string | undefined>(undefined);
  const [bookingPanelOpen, setBookingPanelOpen] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviewTarget, setReviewTarget] = useState<{ complexId: string; complexName: string } | null>(null);

  // Load complexes whenever the applied navbar query changes
  useEffect(() => {
    let cancelled = false;
    const reqId = ++searchReqId.current;

    if (appliedQuery) setIsSearching(true);
    else setIsLoading(true);
    setError(null);

    complexesService
      .getComplexes({ search: appliedQuery || undefined, pageSize: 50 })
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
  }, [appliedQuery]);

  // Load past bookings so ReviewsDialog can verify review eligibility
  useEffect(() => {
    if (!authService.isAuthenticated()) return;
    let cancelled = false;
    bookingService
      .getMyBookings({ is_past: true })
      .then((data) => { if (!cancelled) setBookings(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Load favorite IDs
  useEffect(() => {
    favoritesService.getFavoriteIds().then(setFavoriteIds).catch(() => {});
  }, []);

  const handleToggleFavorite = async (complexId: string) => {
    try {
      const nowFavorited = await favoritesService.toggleFavorite(complexId);
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (nowFavorited) next.add(complexId); else next.delete(complexId);
        return next;
      });
      notify.success(
        nowFavorited ? 'Añadido a favoritos' : 'Eliminado de favoritos',
        nowFavorited ? 'Complejo guardado.' : 'Complejo eliminado de favoritos.',
      );
    } catch {
      notify.error('Error', 'No se pudo actualizar tus favoritos.');
    }
  };

  const handleSlotFromDialog = (complexField: ComplexField, slot: TimeSlotData, date: string, allSlots: TimeSlotData[]) => {
    if (!selectedComplex) return;
    const synthField = buildSyntheticField(complexField, selectedComplex, slot, allSlots);
    setPanelField(synthField);
    setPanelSlotId(slot.id);
    setPanelDate(date);
    setIsDialogOpen(false);
    setBookingPanelOpen(true);
  };

  const visibleComplexes = useMemo(() => {
    const list = [...complexes].sort((a, b) => {
      const aFav = favoriteIds.has(a.id) ? 0 : 1;
      const bFav = favoriteIds.has(b.id) ? 0 : 1;
      if (aFav !== bFav) return aFav - bFav;
      if (sortBy === 'price-asc') return (a.minPrice ?? 0) - (b.minPrice ?? 0);
      if (sortBy === 'price-desc') return (b.minPrice ?? 0) - (a.minPrice ?? 0);
      return 0;
    });
    return list;
  }, [complexes, favoriteIds, sortBy]);

  const showSkeleton = isLoading || isSearching;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-gradient-to-br from-[var(--color-primary-tint)] via-white to-emerald-50 p-5 shadow-[var(--shadow-sm)] sm:p-7">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent, transparent 22px, rgba(98,191,59,.09) 23px), repeating-linear-gradient(90deg, transparent, transparent 22px, rgba(98,191,59,.09) 23px)',
          }}
        />
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[var(--color-primary)]/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={() => navigate('/')}
              aria-label="Volver al inicio"
              className="mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-white/85 text-[var(--color-text-2)] shadow-[var(--shadow-sm)] transition-all hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>

            <div>
              <p className="mb-1 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[var(--color-primary)]">
                <Search className="h-3 w-3" />
                Explorar complejos
              </p>
              <h1 className="text-3xl font-extrabold leading-tight text-[var(--color-text)] sm:text-4xl">
                Buscar <span className="text-[var(--color-primary)]">canchas</span>
              </h1>
              <p className="mt-2 max-w-xl text-sm font-semibold leading-relaxed text-[var(--color-text-3)]">
                Consulta complejos, revisa sus canchas y encuentra el horario ideal para tu próximo partido.
              </p>
            </div>
          </div>

          {appliedQuery && (
            <div className="inline-flex max-w-full items-center gap-2 self-start rounded-full border border-[var(--color-primary)]/25 bg-white/85 px-4 py-2 shadow-[var(--shadow-sm)] md:self-auto">
              <Search className="h-3.5 w-3.5 flex-shrink-0 text-[var(--color-primary)]" />
              <span className="truncate text-sm font-extrabold text-[var(--color-text-2)]">
                “{appliedQuery}”
              </span>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  navigate('/fields', { replace: true });
                }}
                aria-label="Limpiar búsqueda"
                className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-surf2)] text-[var(--color-text-3)] transition-colors hover:bg-[var(--color-primary)]/15 hover:text-[var(--color-primary)]"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Results toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-extrabold text-[var(--color-text)]">
            {appliedQuery ? 'Resultados de búsqueda' : 'Complejos disponibles'}
          </p>
          <p className="mt-0.5 text-xs font-semibold text-[var(--color-text-3)]">
            {showSkeleton
              ? 'Cargando resultados...'
              : error
                ? 'No se pudieron cargar los resultados'
                : `${complexes.length} ${complexes.length === 1 ? 'complejo encontrado' : 'complejos encontrados'}${favoriteIds.size > 0 ? ' · favoritos primero' : ''}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-[var(--color-text-3)]" />
          <label
            htmlFor="fields-sort"
            className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--color-text-3)]"
          >
            Ordenar
          </label>
          <select
            id="fields-sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortId)}
            className="h-10 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-bold text-[var(--color-text-2)] outline-none transition-colors focus:border-[var(--color-primary)]"
          >
            {sortOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Skeletons */}
      {showSkeleton && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-[var(--color-surface)] border-[1.5px] border-[var(--color-border)] rounded-[var(--radius-2xl)] h-52 animate-pulse" />
          ))}
        </div>
      )}

      {/* Error */}
      {!showSkeleton && error && (
        <div className="bg-[var(--color-surface)] border-[1.5px] border-[var(--color-border)] rounded-[var(--radius-2xl)] p-8 text-center">
          <Typography variant="small" color="text-3">{error}</Typography>
        </div>
      )}

      {/* Empty */}
      {!showSkeleton && !error && complexes.length === 0 && (
        <div className="bg-[var(--color-surface)] border-[1.5px] border-[var(--color-border)] rounded-[var(--radius-2xl)] p-10 flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-full bg-[var(--color-primary-tint)] flex items-center justify-center">
            <i className="fa-solid fa-building-circle-xmark text-2xl text-[var(--color-primary)]" />
          </div>
          <Typography variant="h4" color="text">
            {appliedQuery ? `Sin resultados para "${appliedQuery}"` : 'No hay complejos disponibles'}
          </Typography>
          <Typography variant="small" color="text-3">
            {appliedQuery ? 'Intenta con otro nombre o ciudad.' : 'Vuelve más tarde.'}
          </Typography>
          {appliedQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                navigate('/fields', { replace: true });
              }}
              className="mt-1 text-sm font-bold text-[var(--color-primary-dark)] hover:underline"
            >
              Limpiar búsqueda
            </button>
          )}
        </div>
      )}

      {/* Grid */}
      {!showSkeleton && !error && visibleComplexes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {visibleComplexes.map((complex) => (
            <ComplexCard
              key={complex.id}
              complex={complex}
              isFavorite={favoriteIds.has(complex.id)}
              onToggleFavorite={handleToggleFavorite}
              onReviewOpen={(cId, cName) => setReviewTarget({ complexId: cId, complexName: cName })}
              onSelect={() => {
                setSelectedComplex(complex);
                setIsDialogOpen(true);
              }}
            />
          ))}
        </div>
      )}

      {/* Reviews dialog */}
      {reviewTarget && (
        <ReviewsDialog
          isOpen={!!reviewTarget}
          onClose={() => setReviewTarget(null)}
          complexId={reviewTarget.complexId}
          complexName={reviewTarget.complexName}
          userBookings={bookings}
        />
      )}

      {/* Complex fields dialog */}
      <ComplexFieldsDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        complex={selectedComplex}
        onSlotSelected={handleSlotFromDialog}
        onBookingCreated={(booking) => setBookings((prev) => [booking, ...prev])}
      />

      {/* Booking panel overlay */}
      {bookingPanelOpen && panelField && (
        <>
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[1000]"
            onClick={() => setBookingPanelOpen(false)}
          />
          <div className="
            animate-slide-in-bottom lg:animate-slide-in-right
            fixed z-[1001]
            bottom-0 left-0 right-0
            lg:top-0 lg:right-0 lg:bottom-0 lg:left-auto lg:w-[380px]
            bg-[var(--color-surface)]
            rounded-t-[var(--radius-2xl)] lg:rounded-tl-[var(--radius-2xl)] lg:rounded-tr-none lg:rounded-b-none
            overflow-hidden
            max-h-[88vh] lg:max-h-none
            shadow-[0_-8px_40px_rgba(0,0,0,.35)] lg:shadow-[-8px_0_40px_rgba(0,0,0,.25)]
            lg:border-l lg:border-[var(--color-border)]
          ">
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

export default Fields;
