import ApiClient, { type ApiError } from './ApiClient';
import type {
  ComplexImage,
  ComplexImageListResult,
  RequestImageUploadResult,
} from '../types/complexImage';
import {
  getImageContentType,
  getImageErrorMessage,
  uploadFileToR2,
  validateImageFile,
} from './ComplexImagesService';

interface ApiResponse<T> {
  data: T;
  success?: boolean;
  message?: string;
}

interface ListImagesOptions {
  status?: 'pending' | 'confirmed';
  page?: number;
  pageSize?: number;
}

interface UploadImageOptions {
  description?: string;
  onProgress?: (progress: number) => void;
}

export const FIELD_IMAGE_MAX_CONFIRMED = 2;

export const getFieldImageErrorMessage = (error: unknown): string => {
  const err = error as Partial<ApiError> & { message?: string };
  if (err?.code === 'IMAGE_LIMIT_EXCEEDED') {
    return 'Esta cancha ya tiene 2 imágenes. Elimina una para poder subir otra.';
  }
  return getImageErrorMessage(error);
};

const FieldImagesService = {
  list: async (
    fieldId: string,
    { status = 'confirmed', page = 1, pageSize = 100 }: ListImagesOptions = {},
  ): Promise<ComplexImageListResult> => {
    const query = new URLSearchParams({
      status,
      page: String(page),
      page_size: String(pageSize),
    });

    const res = await ApiClient.get<ApiResponse<ComplexImageListResult>>(
      `/fields/${fieldId}/images/?${query.toString()}`,
    );

    return {
      items: Array.isArray(res.data?.items) ? res.data.items : [],
      total: res.data?.total ?? 0,
      page: res.data?.page ?? page,
      page_size: res.data?.page_size ?? pageSize,
      total_pages: res.data?.total_pages ?? 1,
    };
  },

  requestUpload: async (fieldId: string, file: File): Promise<RequestImageUploadResult> => {
    const validationError = validateImageFile(file);
    if (validationError) throw new Error(validationError);

    const res = await ApiClient.post<ApiResponse<RequestImageUploadResult>>(
      `/fields/${fieldId}/images/upload-url/`,
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
    fieldId: string,
    imageId: string,
    description?: string,
  ): Promise<ComplexImage> => {
    const res = await ApiClient.patch<ApiResponse<ComplexImage>>(
      `/fields/${fieldId}/images/${imageId}/confirm/`,
      description === undefined ? {} : { description },
      { withAuth: true },
    );

    return res.data;
  },

  remove: async (fieldId: string, imageId: string): Promise<void> => {
    await ApiClient.delete<void>(`/fields/${fieldId}/images/${imageId}/`, {
      withAuth: true,
    });
  },

  upload: async (
    fieldId: string,
    file: File,
    { description, onProgress }: UploadImageOptions = {},
  ): Promise<ComplexImage> => {
    const validationError = validateImageFile(file);
    if (validationError) throw new Error(validationError);

    const contentType = getImageContentType(file);
    const ticket = await FieldImagesService.requestUpload(fieldId, file);

    try {
      await uploadFileToR2(ticket.upload_url, file, contentType, onProgress);
    } catch (error) {
      try {
        await FieldImagesService.remove(fieldId, ticket.image_id);
      } catch {
        // Best effort; pending images are purged by the backend.
      }
      throw error;
    }

    return FieldImagesService.confirm(fieldId, ticket.image_id, description);
  },
};

export default FieldImagesService;
