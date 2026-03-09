const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestOptions {
  body?: unknown;
  headers?: Record<string, string>;
  withAuth?: boolean;
}

export interface ApiError {
  status: number;
  message: string;
  detail?: unknown;
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
    let errorDetail: unknown;
    try {
      errorDetail = await response.json();
    } catch {
      errorDetail = await response.text();
    }

    const error: ApiError = {
      status: response.status,
      message: getErrorMessage(response.status, errorDetail),
      detail: errorDetail,
    };
    throw error;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

function getErrorMessage(status: number, detail?: unknown): string {
  // Try to extract message from Django REST Framework response
  if (detail && typeof detail === "object") {
    const d = detail as Record<string, unknown>;
    if (typeof d.message === "string") return d.message;
    if (typeof d.detail === "string") return d.detail;
  }

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
