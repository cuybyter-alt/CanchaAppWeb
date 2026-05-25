import ApiClient from './ApiClient';
import authService from './AuthService';
import type { ApiError } from './ApiClient';
import type {
  PaginatedReviewOutput,
  PaginatedCommentOutput,
  CommentRepliesResponse,
  ReviewOutput,
  CommentOutput,
  ReviewsResponse,
  ReviewSingleResponse,
  CommentSingleResponse,
  CreateReviewPayload,
  UpdateReviewPayload,
} from '../types/review';

interface ReviewsQueryParams {
  page?: number;
  page_size?: number;
}

const reviewService = {
  // ── GET /api/reviews/complex/{complex_id}/ ────────────────────────────────
  // No auth required — publicly viewable
  async getComplexReviews(
    complexId: string,
    params: ReviewsQueryParams = {},
  ): Promise<PaginatedReviewOutput> {
    const qs = new URLSearchParams();
    if (params.page !== undefined) qs.set('page', String(params.page));
    if (params.page_size !== undefined) qs.set('page_size', String(params.page_size));
    const query = qs.toString() ? `?${qs.toString()}` : '';
    const res = await ApiClient.get<ReviewsResponse>(
      `/reviews/complex/${complexId}/${query}`,
    );
    return res.data;
  },

  // ── POST /api/reviews/complex ─────────────────────────────────────────────
  async createReview(payload: CreateReviewPayload): Promise<ReviewOutput> {
    const doFetch = () =>
      ApiClient.post<ReviewSingleResponse>('/reviews/complex', payload, { withAuth: true });
    try {
      return (await doFetch()).data;
    } catch (e) {
      const err = e as ApiError;
      if (err?.status === 401) {
        await authService.refreshToken();
        return (await doFetch()).data;
      }
      throw e;
    }
  },

  // ── PATCH /api/reviews/{review_id}/ ───────────────────────────────────────
  async updateReview(reviewId: string, payload: UpdateReviewPayload): Promise<ReviewOutput> {
    const doFetch = () =>
      ApiClient.patch<ReviewSingleResponse>(`/reviews/${reviewId}/`, payload, { withAuth: true });
    try {
      return (await doFetch()).data;
    } catch (e) {
      const err = e as ApiError;
      if (err?.status === 401) {
        await authService.refreshToken();
        return (await doFetch()).data;
      }
      throw e;
    }
  },

  // ── PATCH /api/reviews/comments/{comment_id}/ ─────────────────────────────
  async editComment(commentId: string, comment: string): Promise<CommentOutput> {
    const doFetch = () =>
      ApiClient.patch<CommentSingleResponse>(
        `/reviews/comments/${commentId}/`,
        { comment },
        { withAuth: true },
      );
    try {
      return (await doFetch()).data;
    } catch (e) {
      const err = e as ApiError;
      if (err?.status === 401) {
        await authService.refreshToken();
        return (await doFetch()).data;
      }
      throw e;
    }
  },

  // ── DELETE /api/reviews/comments/{comment_id}/delete/ ────────────────────
  async deleteComment(commentId: string): Promise<void> {
    const doFetch = () =>
      ApiClient.delete<void>(`/reviews/comments/${commentId}/delete/`, { withAuth: true });
    try {
      await doFetch();
    } catch (e) {
      const err = e as ApiError;
      if (err?.status === 401) {
        await authService.refreshToken();
        await doFetch();
        return;
      }
      throw e;
    }
  },

  // ── GET /api/reviews/comments/{comment_id}/replies/ ───────────────────────
  async getCommentReplies(
    commentId: string,
    params: ReviewsQueryParams = {},
  ): Promise<PaginatedCommentOutput> {
    const qs = new URLSearchParams();
    if (params.page !== undefined) qs.set('page', String(params.page));
    if (params.page_size !== undefined) qs.set('page_size', String(params.page_size));
    const query = qs.toString() ? `?${qs.toString()}` : '';
    const res = await ApiClient.get<CommentRepliesResponse>(
      `/reviews/comments/${commentId}/replies/${query}`,
    );
    return res.data;
  },

  // ── POST /api/reviews/comments/{comment_id}/replies/create/ ───────────────
  async createCommentReply(commentId: string, comment: string): Promise<CommentOutput> {
    const doFetch = () =>
      ApiClient.post<CommentSingleResponse>(
        `/reviews/comments/${commentId}/replies/create/`,
        { comment },
        { withAuth: true },
      );
    try {
      return (await doFetch()).data;
    } catch (e) {
      const err = e as ApiError;
      if (err?.status === 401) {
        await authService.refreshToken();
        return (await doFetch()).data;
      }
      throw e;
    }
  },
};

export default reviewService;
