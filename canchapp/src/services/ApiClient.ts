const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestOptions {
  body?: unknown;
  headers?: Record<string, string>;
  withAuth?: boolean;
}

// Backend error envelope: { success: false, error: { code, message, details } }
export interface ErrorDetail {
  code: string;
  message: string;
  details?: Record<string, string>;
}

export interface ApiError {
  status: number;
  message: string;
  code?: string;
  details?: Record<string, string>;
  raw?: unknown;
}

async function request<T>(
  method: HttpMethod,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, headers = {}, withAuth = false } = options;

  const defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };

  if (withAuth) {
    const token = localStorage.getItem("access_token");
    if (token) {
      defaultHeaders["Authorization"] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: defaultHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let errorBody: unknown;
    try {
      errorBody = await response.json();
    } catch {
      errorBody = await response.text();
    }

    const error: ApiError = {
      status: response.status,
      ...parseErrorBody(response.status, errorBody),
      raw: errorBody,
    };
    throw error;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

/**
 * Parses the backend error envelope:
 *   { success: false, error: { code, message, details } }
 * Falls back to legacy DRF { detail } and then to generic status messages.
 */
function parseErrorBody(
  status: number,
  body: unknown,
): Pick<ApiError, "message" | "code" | "details"> {
  if (body && typeof body === "object") {
    const b = body as Record<string, unknown>;

    // Standard envelope: { error: { code, message, details } }
    if (b.error && typeof b.error === "object") {
      const e = b.error as Record<string, unknown>;
      return {
        message: typeof e.message === "string" ? e.message : fallbackMessage(status),
        code: typeof e.code === "string" ? e.code : undefined,
        details:
          e.details && typeof e.details === "object"
            ? (e.details as Record<string, string>)
            : undefined,
      };
    }

    // Legacy DRF: { message } or { detail }
    if (typeof b.message === "string") return { message: b.message };
    if (typeof b.detail === "string")  return { message: b.detail };
  }

  return { message: fallbackMessage(status) };
}

function fallbackMessage(status: number): string {
  const messages: Record<number, string> = {
    400: "Datos inválidos. Revisa los campos.",
    401: "No autorizado. Verifica tus credenciales.",
    403: "No tienes permiso para realizar esta acción.",
    404: "Recurso no encontrado.",
    409: "El recurso ya existe.",
    422: "Datos inválidos.",
    500: "Error interno del servidor. Intenta más tarde.",
  };
  return messages[status] ?? "Ocurrió un error inesperado.";
}

const ApiClient = {
  get: <T>(path: string, options?: Omit<RequestOptions, "body">) =>
    request<T>("GET", path, options),

  post: <T>(
    path: string,
    body?: unknown,
    options?: Omit<RequestOptions, "body">,
  ) => request<T>("POST", path, { ...options, body }),

  put: <T>(
    path: string,
    body?: unknown,
    options?: Omit<RequestOptions, "body">,
  ) => request<T>("PUT", path, { ...options, body }),

  patch: <T>(
    path: string,
    body?: unknown,
    options?: Omit<RequestOptions, "body">,
  ) => request<T>("PATCH", path, { ...options, body }),

  delete: <T>(path: string, options?: Omit<RequestOptions, "body">) =>
    request<T>("DELETE", path, options),
};

export default ApiClient;
