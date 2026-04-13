import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ComplexCard } from '../components/features/ComplexCard';
import { ComplexFieldsDialog } from '../components/features/ComplexFieldsDialog';
import { Typography } from '../components/ui/typography';
import type { NearbyComplex } from '../types/map';
import type { Booking, ComplexListItem } from '../types/field';
import complexesService from '../services/ComplexesService';
import favoritesService from '../services/FavoritesService';
import notify from '../services/toast';

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

      {/* Skeleton */}
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
        onBookingCreated={(booking) => setBookings((prev) => [booking, ...prev])}
      />
    </div>
  );
};

export default Complexes;
