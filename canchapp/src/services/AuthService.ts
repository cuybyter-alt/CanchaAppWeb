import ApiClient from "./ApiClient";

// ─── Types (mirror del backend DTOs) ─────────────────────────────────────────

export interface UserOutput {
  user_id: string;
  username: string | null;
  email: string;
  f_name: string;
  l_name: string;
  role_name: string;
  status: string;
  avatar_url: string | null;
  is_guest: boolean;
}

export interface TokenPairOutput {
  access: string;
  refresh: string;
  user: UserOutput;
}

export interface LoginPayload {
  identifier: string; // email o username
  password: string;
}

export interface RegisterPayload {
  email: string;
  f_name: string;
  l_name: string;
  password: string;
  role_name: "Owner" | "Manager" | "Player";
  username: string;
}

// Wrapper que usa el backend: { data, success, message, meta }
interface ApiResponse<T> {
  data: T;
  success?: boolean;
  message: string;
  meta?: Record<string, string | number | boolean>;
}

// ─── Token helpers ────────────────────────────────────────────────────────────

export const tokenStorage = {
  save: (tokens: Pick<TokenPairOutput, "access" | "refresh">) => {
    localStorage.setItem("access_token", tokens.access);
    localStorage.setItem("refresh_token", tokens.refresh);
  },
  clear: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
  },
  getAccess: () => localStorage.getItem("access_token"),
  getRefresh: () => localStorage.getItem("refresh_token"),
  saveUser: (user: UserOutput) =>
    localStorage.setItem("user", JSON.stringify(user)),
  getUser: (): UserOutput | null => {
    const raw = localStorage.getItem("user");
    return raw ? (JSON.parse(raw) as UserOutput) : null;
  },
};

// ─── Auth Service ─────────────────────────────────────────────────────────────

const authService = {
  /**
   * POST /api/identity/auth/login/
   * Login con email o username + contraseña
   */
  login: async (payload: LoginPayload): Promise<TokenPairOutput> => {
    const res = await ApiClient.post<ApiResponse<TokenPairOutput>>(
      "/identity/auth/login/",
      payload
    );
    tokenStorage.save(res.data);
    tokenStorage.saveUser(res.data.user);
    return res.data;
  },

  /**
   * POST /api/identity/register/
   * Registro con email, nombre, contraseña y rol
   */
  register: async (payload: RegisterPayload): Promise<UserOutput> => {
    const res = await ApiClient.post<ApiResponse<UserOutput>>(
      "/identity/register/",
      payload
    );
    return res.data;
  },

  /**
   * POST /api/identity/auth/firebase/
   * Login/registro mediante Firebase OAuth (Google, etc.)
   */
  firebaseAuth: async (
    firebaseIdToken: string,
    roleName: "Owner" | "Manager" | "Player" = "Player"
  ): Promise<TokenPairOutput> => {
    const res = await ApiClient.post<ApiResponse<TokenPairOutput>>(
      "/identity/auth/firebase/",
      { firebase_id_token: firebaseIdToken, role_name: roleName }
    );
    tokenStorage.save(res.data);
    tokenStorage.saveUser(res.data.user);
    return res.data;
  },

  /**
   * POST /api/identity/auth/refresh/
   * Renueva el access token usando el refresh token
   */
  refreshToken: async (): Promise<{ access: string }> => {
    const refresh = tokenStorage.getRefresh();
    if (!refresh) throw new Error("No hay refresh token disponible.");
    const res = await ApiClient.post<ApiResponse<{ access: string }>>(
      "/identity/auth/refresh/",
      { refresh }
    );
    localStorage.setItem("access_token", res.data.access);
    return res.data;
  },

  /**
   * POST /api/identity/auth/logout/
   * Invalida el refresh token en el servidor
   */
  logout: async (): Promise<void> => {
    const refresh = tokenStorage.getRefresh();
    if (refresh) {
      try {
        await ApiClient.post("/identity/auth/logout/", { refresh }, { withAuth: true });
      } catch {
        // Si falla el logout remoto igual limpiamos local
      }
    }
    tokenStorage.clear();
  },

  isAuthenticated: (): boolean => !!tokenStorage.getAccess(),
};

export default authService;