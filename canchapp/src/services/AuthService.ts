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
  location?: string | null;
  phone_number?: string | null;
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
  location?: string | null;
  phone_number?: string | null;
}

export interface ChangePasswordPayload {
  old_password: string;
  new_password: string;
}

// Wrapper que usa el backend: { data, success, message, meta }
interface ApiResponse<T> {
  data: T;
  success?: boolean;
  message: string;
  meta?: Record<string, string | number | boolean>;
}

const asOptionalString = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
};

/** Normaliza el usuario devuelto por el backend (soporta envelope y camelCase). */
export const parseUserOutput = (raw: unknown): UserOutput => {
  const source =
    raw && typeof raw === "object" && "data" in (raw as Record<string, unknown>)
      ? (raw as ApiResponse<unknown>).data
      : raw;

  const u = (source ?? {}) as Record<string, unknown>;
  const roleNames = Array.isArray(u.role_names)
    ? (u.role_names as string[])
    : Array.isArray(u.roleNames)
      ? (u.roleNames as string[])
      : [];

  return {
    user_id: String(u.user_id ?? u.userId ?? ""),
    username: asOptionalString(u.username),
    email: String(u.email ?? ""),
    f_name: String(u.f_name ?? u.fName ?? ""),
    l_name: String(u.l_name ?? u.lName ?? ""),
    role_names: roleNames,
    role_name: String(u.role_name ?? u.roleName ?? roleNames[0] ?? ""),
    status: String(u.status ?? "active"),
    avatar_url: asOptionalString(u.avatar_url ?? u.avatarUrl),
    is_guest: Boolean(u.is_guest ?? u.isGuest ?? false),
    location: asOptionalString(u.location),
    phone_number: asOptionalString(u.phone_number ?? u.phoneNumber),
  };
};

const mergeProfilePayload = (
  user: UserOutput,
  payload?: UpdateProfilePayload
): UserOutput => {
  if (!payload) return user;
  return {
    ...user,
    location: user.location ?? payload.location ?? null,
    phone_number: user.phone_number ?? payload.phone_number ?? null,
  };
};

const PROFILE_EXTRAS_PREFIX = "canchapp_profile_extras_";

/** Respaldo local cuando el API no devuelve teléfono/ubicación en GET. */
export const profileExtrasStorage = {
  get(userId: string): Pick<UserOutput, "location" | "phone_number"> | null {
    if (!userId) return null;
    try {
      const raw = localStorage.getItem(`${PROFILE_EXTRAS_PREFIX}${userId}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      return {
        location: asOptionalString(parsed.location),
        phone_number: asOptionalString(parsed.phone_number),
      };
    } catch {
      return null;
    }
  },
  save(
    userId: string,
    extras: { location?: string | null; phone_number?: string | null }
  ) {
    if (!userId) return;
    localStorage.setItem(
      `${PROFILE_EXTRAS_PREFIX}${userId}`,
      JSON.stringify({
        location: extras.location ?? null,
        phone_number: extras.phone_number ?? null,
      })
    );
  },
};

export const enrichUserWithStoredExtras = (user: UserOutput): UserOutput => {
  if (!user.user_id) return user;
  const extras = profileExtrasStorage.get(user.user_id);
  if (!extras) return user;
  return {
    ...user,
    location: user.location ?? extras.location ?? null,
    phone_number: user.phone_number ?? extras.phone_number ?? null,
  };
};

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
    const enriched = enrichUserWithStoredExtras(user);
    const normalized: UserOutput = {
      ...enriched,
      role_name: enriched.role_name || enriched.role_names?.[0] || "",
    };
    localStorage.setItem("user", JSON.stringify(normalized));
  },
  getUser: (): UserOutput | null => {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as UserOutput;
      return enrichUserWithStoredExtras(parsed);
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
    tokenStorage.saveUser(enrichUserWithStoredExtras(parseUserOutput(res.data.user)));
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
      const res = await ApiClient.get<ApiResponse<unknown>>(
        "/identity/users/me/",
        { withAuth: true }
      );
      return enrichUserWithStoredExtras(parseUserOutput(res));
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError?.status === 401) {
        await authService.refreshToken();
        const retry = await ApiClient.get<ApiResponse<unknown>>(
          "/identity/users/me/",
          { withAuth: true }
        );
        return enrichUserWithStoredExtras(parseUserOutput(retry));
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
    const parseUpdateResponse = (res: ApiResponse<unknown>) => {
      const merged = enrichUserWithStoredExtras(
        mergeProfilePayload(parseUserOutput(res), payload)
      );
      if (merged.user_id) {
        profileExtrasStorage.save(merged.user_id, {
          location: merged.location ?? payload.location ?? null,
          phone_number: merged.phone_number ?? payload.phone_number ?? null,
        });
      }
      return merged;
    };

    try {
      const res = await ApiClient.put<ApiResponse<unknown>>(
        "/identity/users/me/",
        payload,
        { withAuth: true }
      );
      return parseUpdateResponse(res);
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError?.status === 401) {
        await authService.refreshToken();
        const retry = await ApiClient.put<ApiResponse<unknown>>(
          "/identity/users/me/",
          payload,
          { withAuth: true }
        );
        return parseUpdateResponse(retry);
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
    tokenStorage.saveUser(enrichUserWithStoredExtras(parseUserOutput(res.data.user)));
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

  /**
   * POST /api/identity/auth/change-password/
   * Cambia la contraseña del usuario autenticado (requiere contraseña actual).
   */
  changePassword: async (payload: ChangePasswordPayload): Promise<void> => {
    const fetchOnce = async () => {
      await ApiClient.post<ApiResponse<unknown>>(
        "/identity/auth/change-password/",
        payload,
        { withAuth: true }
      );
    };

    try {
      await fetchOnce();
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError?.status === 401 && apiError.code !== "INVALID_OLD_PASSWORD") {
        await authService.refreshToken();
        await fetchOnce();
        return;
      }
      throw error;
    }
  },

  isAuthenticated: (): boolean => !!tokenStorage.getAccess(),
};

export default authService;