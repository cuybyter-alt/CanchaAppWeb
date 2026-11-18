import ApiClient, { type ApiError } from './ApiClient';
import type {
  ComplexImage,
  ComplexImageListResult,
  RequestImageUploadResult,
} from '../types/complexImage';

interface ApiResponse<T> {
  data: T;
  success?: boolean;
  message?: string;
}

interface ListImagesOptions {
  status?: 'pending' | 'confirmed' | 'deleted';
  page?: number;
  pageSize?: number;
}

interface UploadImageOptions {
  description?: string;
  onProgress?: (progress: number) => void;
}

export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const IMAGE_MAX_CONFIRMED = 3;
export const IMAGE_ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

const EXTENSION_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

const NORMALIZED_MIME: Record<string, string> = {
  'image/jpg': 'image/jpeg',
};

const isAcceptedType = (value: string): boolean =>
  (IMAGE_ACCEPTED_TYPES as readonly string[]).includes(value);

export const getImageContentType = (file: File): string => {
  const normalized = NORMALIZED_MIME[file.type] ?? file.type;
  if (isAcceptedType(normalized)) return normalized;

  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  return EXTENSION_MIME[extension] ?? normalized;
};

export const validateImageFile = (file: File): string | null => {
  if (file.size <= 0) return 'El archivo está vacío.';

  const contentType = getImageContentType(file);
  if (!isAcceptedType(contentType)) {
    return 'Formato no soportado. Usa una imagen JPG, PNG o WebP.';
  }

  if (file.size > IMAGE_MAX_BYTES) {
    return 'La imagen supera el límite de 5 MB.';
  }

  return null;
};

export const getImageErrorMessage = (error: unknown): string => {
  const err = error as Partial<ApiError> & { message?: string };

  switch (err.code) {
    case 'INVALID_IMAGE_TYPE':
      return 'Formato no soportado. Usa una imagen JPG, PNG o WebP.';
    case 'IMAGE_FILE_TOO_LARGE':
      return 'La imagen supera el límite de 5 MB.';
    case 'IMAGE_LIMIT_EXCEEDED':
      return 'Este complejo ya tiene 3 imágenes. Elimina una para poder subir otra.';
    case 'IMAGE_NOT_FOUND_IN_R2':
      return 'La imagen no llegó al almacenamiento. Intenta subirla de nuevo.';
    case 'IMAGE_NOT_FOUND':
      return 'La imagen ya no existe. Actualiza la galería.';
    case 'COMPLEX_NOT_FOUND':
      return 'El complejo ya no existe o no está disponible.';
    default:
      break;
  }

  if (err.status === 401) return 'Tu sesión expiró. Inicia sesión de nuevo para continuar.';
  if (err.status === 403) return 'No tienes permisos para administrar las imágenes de este complejo.';
  if (err.status === 404) return 'No se encontró el recurso solicitado.';
  if (err.status === 413) return 'La imagen es demasiado grande para el servidor.';

  if (typeof err.message === 'string' && err.message.trim().length > 0) {
    return err.message;
  }

  return 'No se pudo completar la operación con la imagen. Intenta de nuevo.';
};

export const uploadFileToR2 = (
  uploadUrl: string,
  file: File,
  contentType: string,
  onProgress?: (progress: number) => void,
): Promise<void> =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl, true);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.timeout = 120_000;

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || event.total <= 0) return;
      const progress = Math.min(100, Math.round((event.loaded / event.total) * 100));
      onProgress?.(progress);
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
        return;
      }
      reject(new Error(`No se pudo subir la imagen al almacenamiento (HTTP ${xhr.status}).`));
    };

    xhr.onerror = () => {
      reject(
        new Error(
          'No se pudo conectar con el almacenamiento de imágenes. Revisa la conexión e intenta de nuevo.',
        ),
      );
    };

    xhr.ontimeout = () => {
      reject(new Error('La subida de la imagen tardó demasiado. Intenta de nuevo.'));
    };

    xhr.onabort = () => {
      reject(new Error('La subida de la imagen fue cancelada.'));
    };

    xhr.send(file);
  });

const ComplexImagesService = {
  list: async (
    complexId: string,
    { status = 'confirmed', page = 1, pageSize = 100 }: ListImagesOptions = {},
  ): Promise<ComplexImageListResult> => {
    const query = new URLSearchParams({
      status,
      page: String(page),
      page_size: String(pageSize),
    });

    const res = await ApiClient.get<ApiResponse<ComplexImageListResult>>(
      `/complexes/${complexId}/images/?${query.toString()}`,
    );

    return {
      items: Array.isArray(res.data?.items) ? res.data.items : [],
      total: res.data?.total ?? 0,
      page: res.data?.page ?? page,
      page_size: res.data?.page_size ?? pageSize,
      total_pages: res.data?.total_pages ?? 1,
    };
  },

  requestUpload: async (complexId: string, file: File): Promise<RequestImageUploadResult> => {
    const validationError = validateImageFile(file);
    if (validationError) {
      throw new Error(validationError);
    }

    const res = await ApiClient.post<ApiResponse<RequestImageUploadResult>>(
      `/complexes/${complexId}/images/upload-url/`,
      {
        content_type: getImageContentType(file),
        file_size: file.size,
      },
      { withAuth: true },
    );

    if (!res.data?.upload_url || !res.data?.image_id) {
      throw new Error('El servidor no devolvió una URL de subida válida.');
    }

    return res.data;
  },

  confirm: async (
    complexId: string,
    imageId: string,
    description?: string,
  ): Promise<ComplexImage> => {
    const res = await ApiClient.patch<ApiResponse<ComplexImage>>(
      `/complexes/${complexId}/images/${imageId}/confirm/`,
      description === undefined ? {} : { description },
      { withAuth: true },
    );

    return res.data;
  },

  remove: async (complexId: string, imageId: string): Promise<void> => {
    await ApiClient.delete<void>(`/complexes/${complexId}/images/${imageId}/`, {
      withAuth: true,
    });
  },

  upload: async (
    complexId: string,
    file: File,
    { description, onProgress }: UploadImageOptions = {},
  ): Promise<ComplexImage> => {
    const validationError = validateImageFile(file);
    if (validationError) {
      throw new Error(validationError);
    }

    const contentType = getImageContentType(file);
    const ticket = await ComplexImagesService.requestUpload(complexId, file);

    try {
      await uploadFileToR2(ticket.upload_url, file, contentType, onProgress);
    } catch (error) {
      try {
        await ComplexImagesService.remove(complexId, ticket.image_id);
      } catch {
        // Best effort: the backend also purges expired pending images.
      }
      throw error;
    }

    return ComplexImagesService.confirm(complexId, ticket.image_id, description);
  },
};

export default ComplexImagesService;
