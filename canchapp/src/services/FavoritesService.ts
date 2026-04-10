import ApiClient from './ApiClient';
import authService from './AuthService';
import type { ApiError } from './ApiClient';

interface FavoriteOutput {
  user_id: string;
  complex_id: string;
  created_at: string;
}

interface ApiResponse<T> {
  data: T;
  success?: boolean;
  message: string;
}

const LOCAL_KEY = 'canchapp-fav-complexes';

function readLocalIds(): Set<string> {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    return new Set(Array.isArray(parsed) ? parsed.filter((x: unknown) => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

function writeLocalIds(ids: Set<string>): void {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify([...ids]));
  } catch { /* ignore */ }
}

// In-memory cache to avoid repeated API calls within a session
let memCache: Set<string> | null = null;

const favoritesService = {
  invalidateCache(): void {
    memCache = null;
  },

  /**
   * Returns the set of favorited complex IDs.
   * Authenticated: fetches from API (cached after first call).
   * Unauthenticated: returns localStorage fallback.
   */
  async getFavoriteIds(): Promise<Set<string>> {
    if (!authService.isAuthenticated()) return readLocalIds();
    if (memCache !== null) return memCache;

    try {
      const res = await ApiClient.get<ApiResponse<FavoriteOutput[]>>(
        '/user-preferences/favorites/complexes/list/',
        { withAuth: true },
      );
      const ids = new Set(
        (Array.isArray(res.data) ? res.data : []).map((x) => x.complex_id),
      );
      memCache = ids;
      writeLocalIds(ids);
      return ids;
    } catch {
      return readLocalIds();
    }
  },

  /** POST /api/user-preferences/favorites/complexes/ */
  async addFavorite(complexId: string): Promise<void> {
    if (!authService.isAuthenticated()) {
      const ids = readLocalIds();
      ids.add(complexId);
      writeLocalIds(ids);
      memCache = ids;
      return;
    }

    try {
      await ApiClient.post<ApiResponse<FavoriteOutput>>(
        '/user-preferences/favorites/complexes/',
        { complex_id: complexId },
        { withAuth: true },
      );
    } catch (error) {
      const apiError = error as ApiError;
      // 409 = already in favorites → treat as success
      if (apiError?.status !== 409) throw error;
    }

    if (memCache) {
      memCache.add(complexId);
    } else {
      memCache = new Set([complexId]);
    }
    writeLocalIds(memCache);
  },

  /** DELETE /api/user-preferences/favorites/complexes/{complex_id}/ */
  async removeFavorite(complexId: string): Promise<void> {
    if (!authService.isAuthenticated()) {
      const ids = readLocalIds();
      ids.delete(complexId);
      writeLocalIds(ids);
      memCache = ids;
      return;
    }

    try {
      await ApiClient.delete<void>(
        `/user-preferences/favorites/complexes/${complexId}/`,
        { withAuth: true },
      );
    } catch (error) {
      const apiError = error as ApiError;
      // 404 = not in favorites → treat as success
      if (apiError?.status !== 404) throw error;
    }

    memCache?.delete(complexId);
    writeLocalIds(memCache ?? new Set());
  },

  /**
   * Toggles a complex's favorite state.
   * Returns the new state: true = now favorited, false = removed.
   */
  async toggleFavorite(complexId: string): Promise<boolean> {
    const ids = await this.getFavoriteIds();
    if (ids.has(complexId)) {
      await this.removeFavorite(complexId);
      return false;
    }
    await this.addFavorite(complexId);
    return true;
  },
};

export default favoritesService;
