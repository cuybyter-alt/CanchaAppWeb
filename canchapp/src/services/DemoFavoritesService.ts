import type { Field } from '../types/field';

const FAVORITES_KEY = 'canchapp-demo-favorites';

const isBrowser = () => typeof window !== 'undefined' && typeof localStorage !== 'undefined';

function readFavoriteIds(): string[] {
  if (!isBrowser()) return [];
  const raw = localStorage.getItem(FAVORITES_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function writeFavoriteIds(ids: string[]): void {
  if (!isBrowser()) return;
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
}

export const demoFavoritesService = {
  getFavoriteIds(): string[] {
    return readFavoriteIds();
  },

  toggleFavorite(fieldId: string): string[] {
    const ids = new Set(readFavoriteIds());
    if (ids.has(fieldId)) {
      ids.delete(fieldId);
    } else {
      ids.add(fieldId);
    }
    const updated = [...ids];
    writeFavoriteIds(updated);
    return updated;
  },

  applyFavorites(fields: Field[]): Field[] {
    const ids = new Set(readFavoriteIds());
    return fields.map((f) => ({
      ...f,
      // localStorage is the single source of truth for favorites.
      isFavorite: ids.has(f.id),
    }));
  },
};

export default demoFavoritesService;
