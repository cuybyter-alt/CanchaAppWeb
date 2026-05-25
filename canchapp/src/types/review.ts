// ─── Comment ──────────────────────────────────────────────────────────────────

export interface CommentOutput {
  id: string;
  user_id: string;
  user_name?: string;
  parent_id: string | null;
  comment: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Review ───────────────────────────────────────────────────────────────────

export interface ReviewOutput {
  id: string;
  complex_id: string;
  field_id: string;
  user_id: string;
  /** Optional — backend may return this undocumented field */
  user_name?: string;
  rating: number;
  verified_visit: boolean;
  comment: CommentOutput | null;
  created_at: string;
}

// ─── Paginated response from GET /api/reviews/complex/{id}/ ──────────────────

export interface PaginatedReviewOutput {
  items: ReviewOutput[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface PaginatedCommentOutput {
  items: CommentOutput[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CommentRepliesResponse {
  data: PaginatedCommentOutput;
  success?: boolean;
  message: string;
}

export interface ReviewsResponse {
  data: PaginatedReviewOutput;
  success?: boolean;
  message: string;
  meta?: Record<string, string | number | boolean>;
}

export interface ReviewSingleResponse {
  data: ReviewOutput;
  success?: boolean;
  message: string;
  meta?: Record<string, string | number | boolean>;
}

// ─── Payloads ─────────────────────────────────────────────────────────────────

export interface CreateReviewPayload {
  complex_id: string;
  field_id: string;
  booking_id: string;
  rating: number;
  comment?: string;
}

export interface UpdateReviewPayload {
  rating?: number;
  comment?: string;
}

export interface UpdateCommentPayload {
  comment: string;
}

// ─── Comment single response ──────────────────────────────────────────────────

export interface CommentSingleResponse {
  data: CommentOutput;
  success?: boolean;
  message: string;
}
