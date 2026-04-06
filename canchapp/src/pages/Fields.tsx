import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Search, SlidersHorizontal, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FieldCard } from '../components/features/FieldCard';
import { Typography } from '../components/ui/typography';
import type { Field, Sport } from '../types/field';
import demoReservationService from '../services/DemoReservationService';
import demoFavoritesService from '../services/DemoFavoritesService';
import complexesService from '../services/ComplexesService';

const sportFilters: Array<{ id: 'all' | Sport; label: string; icon: string }> = [
  { id: 'all', label: 'Todos', icon: 'fa-border-all' },
  { id: 'futbol5', label: 'Fútbol 5', icon: 'fa-futbol' },
  { id: 'futbol7', label: 'Fútbol 7', icon: 'fa-futbol' },
  { id: 'futbol11', label: 'Fútbol 11', icon: 'fa-futbol' },
  { id: 'microfutbol', label: 'Microfútbol', icon: 'fa-circle-dot' },
];

const typeFilters = [
  { id: 'all', label: 'Todas' },
  { id: 'turf', label: 'Césped artificial' },
  { id: 'indoor', label: 'Techada' },
  { id: 'outdoor', label: 'Al aire libre' },
  { id: 'premium', label: 'Premium' },
] as const;

const sortOptions = [
  { id: 'relevance', label: 'Relevancia' },
  { id: 'price-asc', label: 'Precio ↑' },
  { id: 'price-desc', label: 'Precio ↓' },
  { id: 'rating', label: 'Mejor valorado' },
  { id: 'distance', label: 'Más cercano' },
] as const;

type SortId = (typeof sortOptions)[number]['id'];
type TypeId = (typeof typeFilters)[number]['id'];

const parseDistance = (value: string): number => {
  const n = Number.parseFloat(value.replace(',', '.'));
  return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
};

const normalizeText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

const Fields: React.FC = () => {
  const navigate = useNavigate();
  const requestIdRef = useRef(0);

  const initialCachedFields = complexesService.getCachedFieldsSync();
  const preparedInitial = demoFavoritesService.applyFavorites(
    initialCachedFields.map((field) => demoReservationService.applyLockedSlots(field)),
  );

  const [allFields, setAllFields] = useState<Field[]>(preparedInitial);
  const [remoteSearchFields, setRemoteSearchFields] = useState<Field[] | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<string>(preparedInitial[0]?.id ?? '');
  const [isLoading, setIsLoading] = useState(preparedInitial.length === 0);
  const [isSearching, setIsSearching] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [sportFilter, setSportFilter] = useState<'all' | Sport>('all');
  const [typeFilter, setTypeFilter] = useState<TypeId>('all');
  const [availableNow, setAvailableNow] = useState(false);
  const [sortBy, setSortBy] = useState<SortId>('relevance');

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 280);
    return () => window.clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    let mounted = true;

    const loadInitialFields = async () => {
      setIsLoading(true);
      setLoadingError(null);

      try {
        const apiFields = await complexesService.getAllFieldsFromAllComplexes({
          onBatch: (batchFields) => {
            if (!mounted || batchFields.length === 0) return;
            const prepared = demoFavoritesService.applyFavorites(
              batchFields.map((field) => demoReservationService.applyLockedSlots(field)),
            );
            setAllFields(prepared);
            setSelectedFieldId((current) => {
              if (prepared.some((field) => field.id === current)) return current;
              return prepared[0]?.id ?? '';
            });
          },
        });

        if (!mounted) return;
        const prepared = demoFavoritesService.applyFavorites(
          apiFields.map((field) => demoReservationService.applyLockedSlots(field)),
        );
        setAllFields(prepared);
      } catch (error) {
        console.error('No se pudo cargar el catálogo de canchas.', error);
        if (mounted) {
          setLoadingError('No se pudo cargar el catálogo desde el backend.');
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    loadInitialFields();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const reqId = ++requestIdRef.current;

    const runSearch = async () => {
      if (!debouncedQuery) {
        setRemoteSearchFields(null);
        setSuggestions([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);

      try {
        const [names, result] = await Promise.all([
          complexesService.getComplexNameSuggestions(debouncedQuery, 7),
          complexesService.getFootballFieldsByComplexSearch(debouncedQuery, {
            onBatch: (batchFields) => {
              if (!mounted || reqId !== requestIdRef.current) return;
              const prepared = demoFavoritesService.applyFavorites(
                batchFields.map((field) => demoReservationService.applyLockedSlots(field)),
              );
              setRemoteSearchFields(prepared);
            },
          }),
        ]);

        if (!mounted || reqId !== requestIdRef.current) return;
        const prepared = demoFavoritesService.applyFavorites(
          result.map((field) => demoReservationService.applyLockedSlots(field)),
        );
        setRemoteSearchFields(prepared);
        setSuggestions(names);
      } catch (error) {
        console.error('No se pudo ejecutar la búsqueda remota de canchas.', error);
      } finally {
        if (mounted && reqId === requestIdRef.current) {
          setIsSearching(false);
        }
      }
    };

    runSearch();

    return () => {
      mounted = false;
    };
  }, [debouncedQuery]);

  const sourceFields = debouncedQuery
    ? (remoteSearchFields && remoteSearchFields.length > 0 ? remoteSearchFields : allFields)
    : allFields;

  const visibleFields = useMemo(() => {
    const result = [...sourceFields];

    const normalizedQuery = normalizeText(debouncedQuery);

    let filtered = result.filter((f) => {
      if (normalizedQuery) {
        const haystack = [f.name, f.location, f.sportLabel, f.description ?? '']
          .map((x) => normalizeText(String(x)))
          .join(' ');
        if (!haystack.includes(normalizedQuery)) return false;
      }

      if (sportFilter !== 'all' && f.sport !== sportFilter) return false;
      if (typeFilter !== 'all' && !f.tags.includes(typeFilter)) return false;
      if (availableNow && !f.availability.some((slot) => slot.status === 'available')) return false;
      return true;
    });

    switch (sortBy) {
      case 'price-asc':
        filtered = filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        filtered = filtered.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        filtered = filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'distance':
        filtered = filtered.sort((a, b) => parseDistance(a.distance) - parseDistance(b.distance));
        break;
      default:
        if (debouncedQuery) {
          const q = normalizeText(debouncedQuery);
          filtered = filtered.sort((a, b) => {
            const score = (f: Field) => {
              const n = normalizeText(f.name);
              if (n === q) return 0;
              if (n.startsWith(q)) return 1;
              if (n.includes(q)) return 2;
              return 3;
            };
            return score(a) - score(b) || b.rating - a.rating;
          });
        }
        break;
    }

    return filtered;
  }, [sourceFields, sportFilter, typeFilter, availableNow, sortBy, debouncedQuery]);

  const handleToggleFavorite = (fieldId: string) => {
    const favoriteIds = new Set(demoFavoritesService.toggleFavorite(fieldId));
    const syncFavorites = (items: Field[]) =>
      items.map((field) => ({
        ...field,
        isFavorite: favoriteIds.has(field.id),
      }));

    setAllFields((prev) => syncFavorites(prev));
    setRemoteSearchFields((prev) => (prev ? syncFavorites(prev) : prev));
  };

  const activeFiltersCount =
    (sportFilter !== 'all' ? 1 : 0) +
    (typeFilter !== 'all' ? 1 : 0) +
    (availableNow ? 1 : 0);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="bg-[var(--color-surface)] border-[1.5px] border-[var(--color-border)] rounded-[var(--radius-2xl)] p-4 sm:p-5 shadow-[var(--shadow-md)]">
        <div className="flex items-end justify-between gap-3 flex-wrap mb-4">
          <div>
            <Typography variant="pixel" color="primary" className="mb-1">
              <i className="fa-solid fa-location-dot mr-1" />
              CATÁLOGO DE FÚTBOL
            </Typography>
            <Typography variant="h2" color="text">
              BUSCAR CANCHAS
            </Typography>
          </div>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surf2)] transition-all duration-[var(--duration-fast)]"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[var(--color-text-3)]" />
          <input
            type="text"
            value={query}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                setDebouncedQuery(query.trim());
                setShowSuggestions(false);
              }
            }}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre del complejo o cancha..."
            className="w-full h-12 pl-12 pr-11 rounded-[var(--radius-xl)] border-[1.5px] border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] font-semibold outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-glow)]"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setSuggestions([]);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full hover:bg-[var(--color-surf2)] flex items-center justify-center text-[var(--color-text-3)]"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {showSuggestions && query.trim().length > 0 && suggestions.length > 0 && (
            <div className="absolute top-[calc(100%+6px)] left-0 right-0 z-20 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-xl)] shadow-[var(--shadow-lg)] p-1.5">
              {suggestions.map((name) => (
                <button
                  key={name}
                  onClick={() => {
                    setQuery(name);
                    setDebouncedQuery(name.trim());
                    setShowSuggestions(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-[var(--radius-md)] text-sm font-semibold text-[var(--color-text-2)] hover:bg-[var(--color-primary-tint)] hover:text-[var(--color-primary-dark)]"
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap mb-3">
          {sportFilters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setSportFilter(filter.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-extrabold border-2 transition-all duration-[var(--duration-fast)] ${
                sportFilter === filter.id
                  ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                  : 'bg-[var(--color-surface)] text-[var(--color-text-2)] border-[var(--color-border)] hover:border-[var(--color-primary)]'
              }`}
            >
              <i className={`fa-solid ${filter.icon} text-xs`} />
              {filter.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button className="inline-flex items-center gap-2 px-3 py-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] text-sm font-extrabold text-[var(--color-text-2)] bg-[var(--color-surf2)]">
              <SlidersHorizontal className="w-4 h-4" />
              Filtros ({activeFiltersCount})
            </button>

            {typeFilters.map((type) => (
              <button
                key={type.id}
                onClick={() => setTypeFilter(type.id)}
                className={`px-3 py-2 rounded-full border text-xs font-extrabold transition-all ${
                  typeFilter === type.id
                    ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                    : 'border-[var(--color-border)] text-[var(--color-text-3)] hover:border-[var(--color-primary)]'
                }`}
              >
                {type.label}
              </button>
            ))}

            <button
              onClick={() => setAvailableNow((prev) => !prev)}
              className={`px-3 py-2 rounded-full border text-xs font-extrabold transition-all ${
                availableNow
                  ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                  : 'border-[var(--color-border)] text-[var(--color-text-3)] hover:border-[var(--color-primary)]'
              }`}
            >
              Disponible ya
            </button>
          </div>

          <div className="lg:ml-auto">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortId)}
              className="h-10 px-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] text-sm font-bold text-[var(--color-text-2)] outline-none focus:border-[var(--color-primary)]"
            >
              {sortOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  Ordenar: {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {(isLoading || isSearching) && (
        <p className="text-xs font-bold text-[var(--color-text-3)]">
          {isSearching ? 'Buscando en backend...' : 'Cargando canchas...'}
        </p>
      )}

      {loadingError && allFields.length === 0 && !debouncedQuery && (
        <div className="bg-[var(--color-surface)] border-[1.5px] border-[var(--color-border)] rounded-[var(--radius-2xl)] p-6 text-center">
          <Typography variant="h4" color="text" className="mb-2">
            No se pudo cargar el catálogo
          </Typography>
          <Typography variant="small" color="text-3">
            {loadingError}
          </Typography>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {visibleFields.map((field) => (
          <FieldCard
            key={field.id}
            field={field}
            isSelected={selectedFieldId === field.id}
            onSelect={(next) => setSelectedFieldId(next.id)}
            onToggleFavorite={handleToggleFavorite}
          />
        ))}
      </div>

      {!isLoading && !isSearching && visibleFields.length === 0 && (
        <div className="bg-[var(--color-surface)] border-[1.5px] border-[var(--color-border)] rounded-[var(--radius-2xl)] p-6 text-center">
          <Typography variant="h4" color="text" className="mb-2">
            No encontramos canchas de fútbol
          </Typography>
          <Typography variant="small" color="text-3">
            Ajusta la búsqueda o limpia filtros para ver más resultados.
          </Typography>
        </div>
      )}
    </div>
  );
};

export default Fields;
