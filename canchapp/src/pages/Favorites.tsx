import React, { useEffect, useState } from 'react';
import { ArrowLeft, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ComplexCard } from '../components/features/ComplexCard';
import { ComplexFieldsDialog } from '../components/features/ComplexFieldsDialog';
import { Typography } from '../components/ui/typography';
import type { NearbyComplex } from '../types/map';
import type { Booking } from '../types/field';
import favoritesService from '../services/FavoritesService';
import complexesService from '../services/ComplexesService';
import authService from '../services/AuthService';
import notify from '../services/toast';

/** Maps ComplexListItem → NearbyComplex (defaults for display-only fields) */
function toNearbyComplex(c: { id: string; name: string; city: string; minPrice: number; maxPrice: number; fieldsCount: number }): NearbyComplex {
  return {
    ...c,
    address: c.city,
    latitude: 0,
    longitude: 0,
    distanceKm: 0,
    distanceLabel: '',
  };
}

const Favorites: React.FC = () => {
  const navigate = useNavigate();
  const isAuthenticated = authService.isAuthenticated();

  const [favorites, setFavorites] = useState<NearbyComplex[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [selectedComplex, setSelectedComplex] = useState<NearbyComplex | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const load = async () => {
      try {
        const [ids, allComplexes] = await Promise.all([
          favoritesService.getFavoriteIds(),
          complexesService.getComplexes({ pageSize: 200 }),
        ]);
        if (cancelled) return;

        const favSet = new Set(ids);
        const favComplexes = allComplexes
          .filter((c) => favSet.has(c.id))
          .map(toNearbyComplex);

        setFavoriteIds(favSet);
        setFavorites(favComplexes);
      } catch (err) {
        if (!cancelled) setError((err as { message?: string })?.message ?? 'Error al cargar favoritos.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, []);

  const handleToggleFavorite = async (complexId: string) => {
    try {
      const nowFavorited = await favoritesService.toggleFavorite(complexId);
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (nowFavorited) {
          next.add(complexId);
        } else {
          next.delete(complexId);
          setFavorites((prevList) => prevList.filter((c) => c.id !== complexId));
        }
        return next;
      });
      notify.success(
        nowFavorited ? 'Añadido a favoritos' : 'Eliminado de favoritos',
        nowFavorited ? 'Complejo guardado.' : 'Complejo eliminado de tus favoritos.',
      );
    } catch {
      notify.error('Error', 'No se pudo actualizar tus favoritos.');
    }
  };

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
          <Heart className="inline w-5 h-5 text-red-500 mr-2 fill-red-500" />
          Mis Favoritos
        </Typography>
      </div>

      {/* Not authenticated */}
      {!isAuthenticated && !isLoading && (
        <div className="bg-[var(--color-surface)] border-[1.5px] border-[var(--color-border)] rounded-[var(--radius-2xl)] p-8 text-center">
          <Typography variant="h4" color="text" className="mb-2">
            Inicia sesión para ver tus favoritos
          </Typography>
          <Typography variant="small" color="text-3" className="mb-4">
            Guarda complejos favoritos y accede a ellos desde cualquier dispositivo.
          </Typography>
          <button
            onClick={() => navigate('/login')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-lg)]
              bg-[var(--color-primary)] text-white font-extrabold text-sm shadow-[var(--shadow-primary)]
              hover:bg-[var(--color-primary-dark)] transition-all"
          >
            Iniciar sesión
          </button>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-[var(--color-surface)] border-[1.5px] border-[var(--color-border)] rounded-[var(--radius-2xl)] h-52 animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Error */}
      {!isLoading && error && (
        <div className="bg-[var(--color-surface)] border-[1.5px] border-[var(--color-border)] rounded-[var(--radius-2xl)] p-8 text-center">
          <Typography variant="small" color="text-3">{error}</Typography>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && isAuthenticated && favorites.length === 0 && (
        <div className="bg-[var(--color-surface)] border-[1.5px] border-[var(--color-border)] rounded-[var(--radius-2xl)] p-8 text-center">
          <Typography variant="h4" color="text" className="mb-2">
            Aún no tienes complejos favoritos
          </Typography>
          <Typography variant="small" color="text-3" className="mb-4">
            Toca el corazón en cualquier complejo para guardarlo aquí.
          </Typography>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-lg)]
              bg-[var(--color-primary)] text-white font-extrabold text-sm shadow-[var(--shadow-primary)]
              hover:bg-[var(--color-primary-dark)] transition-all"
          >
            Explorar complejos
          </button>
        </div>
      )}

      {/* Favorites grid */}
      {!isLoading && !error && favorites.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {favorites.map((complex) => (
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

export default Favorites;
