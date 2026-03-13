import ApiClient from './ApiClient';
import type { Field, FieldType, Sport, TimeSlotData } from '../types/field';
import type { ComplexMarker } from '../types/map';

interface ApiResponse<T> {
  data: T;
  success?: boolean;
  message?: string;
  meta?: Record<string, string | number | boolean | null | undefined>;
}

interface ComplexContext {
  id: string;
  name: string;
  city?: string;
}

type RawRecord = Record<string, unknown>;

interface FieldsCachePayload {
  timestamp: number;
  data: Field[];
}

interface LoadFieldsOptions {
  onBatch?: (fields: Field[]) => void;
  useCache?: boolean;
}

const FALLBACK_TIMES = [
  '8:00 AM',
  '9:00 AM',
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '1:00 PM',
  '3:00 PM',
  '5:00 PM',
  '7:00 PM',
  '8:00 PM',
  '9:00 PM',
  '10:00 PM',
];

const FIELDS_CACHE_KEY = 'canchapp-fields-cache-v1';
const CACHE_TTL_MS = 5 * 60 * 1000;
const FIELDS_CONCURRENCY = 8;

let memoryCache: FieldsCachePayload | null = null;
let inFlightRequest: Promise<Field[]> | null = null;

const isBrowser = () => typeof window !== 'undefined' && typeof localStorage !== 'undefined';

const isCacheFresh = (timestamp: number): boolean => Date.now() - timestamp <= CACHE_TTL_MS;

const readStorageCache = (): FieldsCachePayload | null => {
  if (!isBrowser()) return null;

  const raw = localStorage.getItem(FIELDS_CACHE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as FieldsCachePayload;
    if (!parsed || !Array.isArray(parsed.data) || typeof parsed.timestamp !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeStorageCache = (payload: FieldsCachePayload): void => {
  if (!isBrowser()) return;
  localStorage.setItem(FIELDS_CACHE_KEY, JSON.stringify(payload));
};

const extractArray = (value: unknown): RawRecord[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is RawRecord => !!item && typeof item === 'object');
  }

  if (value && typeof value === 'object') {
    const obj = value as RawRecord;
    const candidateKeys = ['items', 'results', 'complexes', 'fields', 'data'];

    for (const key of candidateKeys) {
      const candidate = obj[key];
      if (Array.isArray(candidate)) {
        return candidate.filter((item): item is RawRecord => !!item && typeof item === 'object');
      }
    }
  }

  return [];
};

const asString = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  return undefined;
};

const asNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};

const parseSport = (rawType?: string): { sport: Sport; sportLabel: string } => {
  const t = (rawType ?? '').toLowerCase();
  if (t.includes('11')) return { sport: 'futbol11', sportLabel: 'Fútbol 11' };
  if (t.includes('7')) return { sport: 'futbol7', sportLabel: 'Fútbol 7' };
  if (t.includes('micro')) return { sport: 'microfutbol', sportLabel: 'Microfútbol' };
  return { sport: 'futbol5', sportLabel: 'Fútbol 5' };
};

const parseTag = (rawType?: string, surface?: string): FieldType => {
  const sportType = (rawType ?? '').toLowerCase();
  const fieldSurface = (surface ?? '').toLowerCase();

  if (sportType.includes('premium')) return 'premium';
  if (fieldSurface.includes('sintet') || fieldSurface.includes('turf')) return 'turf';
  if (fieldSurface.includes('indoor') || fieldSurface.includes('techad')) return 'indoor';
  return 'outdoor';
};

const defaultAvailability = (price: number): TimeSlotData[] =>
  FALLBACK_TIMES.map((slot, idx) => {
    const [time, period] = slot.split(' ');
    return {
      id: `slot-${idx}`,
      time,
      period: period as 'AM' | 'PM',
      price,
      status: 'available',
    };
  });

const mapComplex = (item: RawRecord): ComplexContext | null => {
  const id =
    asString(item.complex_id) ??
    asString(item.id) ??
    asString(item.uuid);

  if (!id) return null;

  return {
    id,
    name: asString(item.name) ?? asString(item.complex_name) ?? 'Complejo deportivo',
    city: asString(item.city) ?? asString(item.address_city),
  };
};

const mapField = (item: RawRecord, complex: ComplexContext, index: number): Field | null => {
  const id = asString(item.field_id) ?? asString(item.id) ?? asString(item.uuid);
  if (!id) return null;

  const rawType = asString(item.field_type) ?? asString(item.sport_type) ?? asString(item.sport);
  const { sport, sportLabel } = parseSport(rawType);

  const rawPrice =
    asNumber(item.price_per_hour) ??
    asNumber(item.hourly_price) ??
    asNumber(item.base_price) ??
    asNumber(item.price) ??
    30000;

  const price = Math.max(1000, Math.round(rawPrice));
  const fieldName = asString(item.field_name) ?? asString(item.name) ?? `Cancha ${index + 1}`;
  const tag = parseTag(rawType, asString(item.surface_type));

  return {
    id,
    name: fieldName,
    sport,
    sportLabel,
    location: complex.city ?? complex.name,
    distance: `${(0.7 + (index % 6) * 0.3).toFixed(1)} km`,
    price,
    priceLabel: `$${Math.round(price / 1000)}k`,
    rating: 4.7,
    reviewCount: 80 + index * 7,
    image: 'soccer-field',
    tags: [tag],
    amenities: [
      { icon: 'lightbulb', label: 'Iluminación' },
      { icon: 'shower', label: 'Duchas' },
    ],
    availability: defaultAvailability(price),
    isFavorite: false,
    capacity: sport === 'futbol11' ? 22 : sport === 'futbol7' ? 14 : 10,
    description: `Cancha de ${sportLabel} en ${complex.name}`,
  };
};

const complexesService = {
  getCachedFieldsSync(): Field[] {
    if (memoryCache && isCacheFresh(memoryCache.timestamp)) {
      return memoryCache.data;
    }

    const storageCache = readStorageCache();
    if (storageCache && isCacheFresh(storageCache.timestamp)) {
      memoryCache = storageCache;
      return storageCache.data;
    }

    return [];
  },

  async getAllFieldsFromAllComplexes(options: LoadFieldsOptions = {}): Promise<Field[]> {
    const { onBatch, useCache = true } = options;

    const cached = useCache ? this.getCachedFieldsSync() : [];
    if (cached.length > 0) {
      onBatch?.(cached);
      return cached;
    }

    if (inFlightRequest) {
      if (onBatch) {
        const maybeCached = this.getCachedFieldsSync();
        if (maybeCached.length > 0) onBatch(maybeCached);
      }
      return inFlightRequest;
    }

    inFlightRequest = this.loadAllFieldsFromApi(onBatch);

    try {
      const loaded = await inFlightRequest;
      return loaded;
    } finally {
      inFlightRequest = null;
    }
  },

  async getComplexMarkers(): Promise<ComplexMarker[]> {
    const res = await ApiClient.get<ApiResponse<unknown>>('/complexes/?page_size=100');
    const items = extractArray(res.data);

    return items
      .map((item): ComplexMarker | null => {
        const id = asString(item.complex_id) ?? asString(item.id);
        const lat = asNumber(item.latitude);
        const lng = asNumber(item.longitude);
        if (!id || lat === undefined || lng === undefined) return null;

        return {
          id,
          name: asString(item.name) ?? 'Complejo deportivo',
          address: asString(item.address) ?? '',
          city: asString(item.city) ?? '',
          latitude: lat,
          longitude: lng,
          minPrice: asNumber(item.min_price) ?? 0,
          maxPrice: asNumber(item.max_price) ?? 0,
          fieldsCount: asNumber(item.fields_count) ?? 0,
        };
      })
      .filter((m): m is ComplexMarker => m !== null);
  },

  async loadAllFieldsFromApi(onBatch?: (fields: Field[]) => void): Promise<Field[]> {
    const complexesRes = await ApiClient.get<ApiResponse<unknown>>('/complexes/?page_size=100');
    const complexItems = extractArray(complexesRes.data);
    const complexes = complexItems
      .map((item) => mapComplex(item))
      .filter((item): item is ComplexContext => item !== null);

    if (complexes.length === 0) {
      return [];
    }

    const merged: Field[] = [];
    const seen = new Set<string>();

    for (let i = 0; i < complexes.length; i += FIELDS_CONCURRENCY) {
      const batch = complexes.slice(i, i + FIELDS_CONCURRENCY);
      const settled = await Promise.allSettled(
        batch.map(async (complex) => {
          const response = await ApiClient.get<ApiResponse<unknown>>(`/complexes/${complex.id}/fields/`);
          const fieldItems = extractArray(response.data);

          return fieldItems
            .map((item, idx) => mapField(item, complex, idx))
            .filter((field): field is Field => field !== null);
        }),
      );

      for (const result of settled) {
        if (result.status !== 'fulfilled') continue;

        for (const field of result.value) {
          if (seen.has(field.id)) continue;
          seen.add(field.id);
          merged.push(field);
        }
      }

      if (merged.length > 0) {
        onBatch?.([...merged]);
      }
    }

    if (merged.length > 0) {
      const payload: FieldsCachePayload = {
        timestamp: Date.now(),
        data: merged,
      };
      memoryCache = payload;
      writeStorageCache(payload);
    }

    return merged;
  },
};

export default complexesService;
