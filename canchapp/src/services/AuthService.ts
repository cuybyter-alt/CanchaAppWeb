import ApiClient, { type ApiError } from "./ApiClient";

// ─── Types (mirror del backend DTOs) ─────────────────────────────────────────

export interface UserOutput {
  user_id: string;
  username: string | null;
  email: string;
  f_name: string;
  l_name: string;
  role_name: string;
  role_names?: string[];
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

export interface UpdateProfilePayload {
  username?: string | null;
  f_name?: string | null;
  l_name?: string | null;
  avatar_url?: string | null;
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
  saveUser: (user: UserOutput) => {
    // Normalize: derive role_name from role_names if missing
    const normalized: UserOutput = {
      ...user,
      role_name: user.role_name || user.role_names?.[0] || '',
    };
    localStorage.setItem("user", JSON.stringify(normalized));
  },
  getUser: (): UserOutput | null => {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    try {
      return JSON.parse(raw) as UserOutput;
    } catch {
      localStorage.removeItem("user");
      return null;
    }
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
    const { role_name, ...rest } = payload;
    const res = await ApiClient.post<ApiResponse<UserOutput>>(
      "/identity/register/",
      { ...rest, role_names: [role_name] }
    );
    return res.data;
  },

  /**
   * GET /api/identity/users/me/
   * Obtiene el perfil del usuario autenticado.
   */
  getCurrentUserProfile: async (): Promise<UserOutput> => {
    try {
      const res = await ApiClient.get<ApiResponse<UserOutput>>(
        "/identity/users/me/",
        { withAuth: true }
      );
      return res.data;
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError?.status === 401) {
        await authService.refreshToken();
        const retry = await ApiClient.get<ApiResponse<UserOutput>>(
          "/identity/users/me/",
          { withAuth: true }
        );
        return retry.data;
      }
      throw error;
    }
  },

  /**
   * GET /api/identity/users/<user_id>/
   * Obtiene un perfil por id. Útil para pantallas administrativas.
   */
  getUserProfile: async (userId: string): Promise<UserOutput> => {
    try {
      const res = await ApiClient.get<ApiResponse<UserOutput>>(
        `/identity/users/${userId}/`,
        { withAuth: true }
      );
      return res.data;
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError?.status === 401) {
        await authService.refreshToken();
        const retry = await ApiClient.get<ApiResponse<UserOutput>>(
          `/identity/users/${userId}/`,
          { withAuth: true }
        );
        return retry.data;
      }
      throw error;
    }
  },

  /**
   * PUT /api/identity/users/me/
   * Actualiza el perfil del usuario autenticado.
   */
  updateCurrentUserProfile: async (
    payload: UpdateProfilePayload
  ): Promise<UserOutput> => {
    try {
      const res = await ApiClient.put<ApiResponse<UserOutput>>(
        "/identity/users/me/",
        payload,
        { withAuth: true }
      );
      return res.data;
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError?.status === 401) {
        await authService.refreshToken();
        const retry = await ApiClient.put<ApiResponse<UserOutput>>(
          "/identity/users/me/",
          payload,
          { withAuth: true }
        );
        return retry.data;
      }
      throw error;
    }
  },

  /**
   * PUT /api/identity/users/<user_id>/
   * Actualiza el perfil de un usuario concreto.
   */
  updateUserProfile: async (
    userId: string,
    payload: UpdateProfilePayload
  ): Promise<UserOutput> => {
    try {
      const res = await ApiClient.put<ApiResponse<UserOutput>>(
        `/identity/users/${userId}/`,
        payload,
        { withAuth: true }
      );
      return res.data;
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError?.status === 401) {
        await authService.refreshToken();
        const retry = await ApiClient.put<ApiResponse<UserOutput>>(
          `/identity/users/${userId}/`,
          payload,
          { withAuth: true }
        );
        return retry.data;
      }
      throw error;
    }
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
      { firebase_id_token: firebaseIdToken, role_names: [roleName] }
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

  /**
   * POST /api/identity/auth/password-reset/request/
   * Envía un código OTP al correo para restablecer la contraseña.
   * Siempre devuelve el mismo mensaje (anti-enumeración).
   */
  requestPasswordReset: async (email: string): Promise<string> => {
    const res = await ApiClient.post<ApiResponse<{ email: string }>>(
      "/identity/auth/password-reset/request/",
      { email }
    );
    return res.message;
  },

  /**
   * POST /api/identity/auth/password-reset/verify-otp/
   * Valida el OTP de 6 dígitos. Si es correcto, el backend confirma y
   * permite avanzar al paso de nueva contraseña.
   */
  verifyOtp: async (email: string, otp_code: string): Promise<void> => {
    await ApiClient.post<ApiResponse<{ email: string; otp_code: string }>>(
      "/identity/auth/password-reset/verify-otp/",
      { email, otp_code }
    );
  },

  /**
   * POST /api/identity/auth/password-reset/confirm/
   * Establece la nueva contraseña usando el email + OTP ya verificado.
   */
  confirmPasswordReset: async (
    email: string,
    otp_code: string,
    new_password: string
  ): Promise<void> => {
    await ApiClient.post<ApiResponse<unknown>>(
      "/identity/auth/password-reset/confirm/",
      { email, otp_code, new_password }
    );
  },

  isAuthenticated: (): boolean => !!tokenStorage.getAccess(),
};

export default authService;