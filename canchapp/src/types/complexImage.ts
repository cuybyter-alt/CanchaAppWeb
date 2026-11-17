export type ComplexImageStatus = 'pending' | 'confirmed' | 'deleted';

export interface ComplexImage {
  img_id: string;
  complex_id?: string;
  r2_key: string;
  image_url: string;
  status: ComplexImageStatus;
  file_size?: number | null;
  uploaded_at?: string | null;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface RequestImageUploadResult {
  upload_url: string;
  image_id: string;
  r2_key: string;
}

export interface ComplexImageListResult {
  items: ComplexImage[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
