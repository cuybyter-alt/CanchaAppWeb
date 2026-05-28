import { useCallback, useEffect, useState } from 'react';
import { CheckCircle, Loader2, Pencil, Star, X } from 'lucide-react';
import { Dialog } from '../ui/dialog';
import reviewService from '../../services/ReviewService';
import { tokenStorage } from '../../services/AuthService';
import { notify } from '../../services/toast';
import type { Booking } from '../../types/field';
import type {
  PaginatedReviewOutput,
  ReviewOutput,
  CommentOutput,
  CreateReviewPayload,
  UpdateReviewPayload,
} from '../../types/review';

// ─── Props ────────────────────────────────────────────────────────────────────

interface ReviewsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  complexId: string;
  complexName: string;
  fieldId?: string;
  userBookings: Booking[];
}

// ─── StarRating ───────────────────────────────────────────────────────────────

interface StarRatingProps {
  value: number;
  onChange?: (n: number) => void;
  size?: 'sm' | 'md' | 'lg';
  readOnly?: boolean;
}

function StarRating({ value, onChange, size = 'md', readOnly = false }: StarRatingProps) {
  const [hovered, setHovered] = useState(0);

  const sizePx = size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-7 h-7' : 'w-5 h-5';
  const active = hovered || value;

  return (
    <div className={`flex items-center gap-0.5 ${readOnly ? '' : 'cursor-pointer'}`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`${sizePx} transition-colors ${
            n <= active
              ? 'fill-[var(--color-score)] text-[var(--color-score)]'
              : 'fill-transparent text-gray-300'
          } ${!readOnly ? 'hover:scale-110 active:scale-95 transition-transform' : ''}`}
          onClick={() => !readOnly && onChange?.(n)}
          onMouseEnter={() => !readOnly && setHovered(n)}
          onMouseLeave={() => !readOnly && setHovered(0)}
        />
      ))}
    </div>
  );
}

// ─── ReviewItem ───────────────────────────────────────────────────────────────

function getAvatarColor(userId: string): string {
  const colors = [
    'bg-[var(--color-primary)] text-white',
    'bg-[var(--color-accent)] text-white',
    'bg-blue-500 text-white',
    'bg-purple-500 text-white',
    'bg-amber-500 text-white',
    'bg-teal-500 text-white',
  ];
  let hash = 0;
  for (const c of userId) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
  return colors[hash % colors.length];
}

function formatReviewDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

interface ReviewItemProps {
  review: ReviewOutput;
  isOwn: boolean;
  isLoggedIn?: boolean;
  onEditClick?: () => void;
}

// ─── CommentRepliesPanel ──────────────────────────────────────────────────────

interface CommentRepliesPanelProps {
  commentId: string;
  isLoggedIn: boolean;
}

function CommentRepliesPanel({ commentId, isLoggedIn }: CommentRepliesPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [replies, setReplies] = useState<CommentOutput[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    if (loaded) return;
    setLoadingReplies(true);
    try {
      const data = await reviewService.getCommentReplies(commentId, { page_size: 50 });
      setReplies(data.items);
    } catch {
      notify.error('No se pudieron cargar las respuestas.');
    } finally {
      setLoadingReplies(false);
      setLoaded(true);
    }
  };

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    if (next) void load();
  };

  const handleSubmit = async () => {
    const text = replyText.trim();
    if (!text) return;
    setSubmitting(true);
    try {
      const created = await reviewService.createCommentReply(commentId, text);
      setReplies((prev) => [...prev, created]);
      setReplyText('');
      setLoaded(true);
      if (!expanded) setExpanded(true);
    } catch (e) {
      const err = e as { message?: string };
      notify.error(err?.message ?? 'No se pudo enviar la respuesta.');
    } finally {
      setSubmitting(false);
    }
  };

  const replyCount = loaded ? replies.length : 0;

  return (
    <div className="mt-2.5">
      <button
        onClick={toggle}
        className="text-xs font-bold text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] transition-colors"
      >
        {expanded
          ? 'Ocultar respuestas'
          : loaded && replyCount > 0
          ? `Ver ${replyCount} ${replyCount === 1 ? 'respuesta' : 'respuestas'}`
          : 'Responder'}
      </button>

      {expanded && (
        <div className="mt-2.5 pl-3 border-l-2 border-[var(--color-border)] space-y-3">
          {loadingReplies && (
            <div className="flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin text-[var(--color-primary)]" />
              <span className="text-xs text-[var(--color-text-3)]">Cargando respuestas…</span>
            </div>
          )}

          {loaded && replies.length === 0 && !loadingReplies && !isLoggedIn && (
            <p className="text-xs text-[var(--color-text-3)]">Sin respuestas aún.</p>
          )}

          {replies.map((reply) => (
            <div key={reply.id} className="flex items-start gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[10px] flex-shrink-0 ${getAvatarColor(reply.user_id)}`}>
                {(reply.user_name ?? reply.user_id).charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-xs font-bold text-[var(--color-text)]">
                    {reply.user_name ?? `Usuario #${reply.user_id.slice(0, 6)}`}
                  </span>
                  <span className="text-[10px] text-[var(--color-text-3)]">{formatReviewDate(reply.created_at)}</span>
                </div>
                <p className="text-xs text-[var(--color-text-2)] leading-relaxed mt-0.5">{reply.comment}</p>
              </div>
            </div>
          ))}

          {isLoggedIn && (
            <div className="flex gap-2 pt-1">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                maxLength={1000}
                rows={2}
                placeholder="Escribe una respuesta…"
                className="flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white
                  px-2.5 py-1.5 text-xs text-[var(--color-text)] placeholder:text-[var(--color-text-3)]
                  focus:outline-none focus:border-[var(--color-primary)] resize-none"
              />
              <button
                onClick={handleSubmit}
                disabled={submitting || !replyText.trim()}
                className="self-end flex items-center gap-1 px-3 py-1.5 rounded-[var(--radius-md)]
                  bg-[var(--color-primary)] text-white text-xs font-bold
                  hover:bg-[var(--color-primary-dark)] disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors"
              >
                {submitting && <Loader2 className="w-3 h-3 animate-spin" />}
                Enviar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ReviewItem({ review, isOwn, isLoggedIn = false, onEditClick }: ReviewItemProps) {
  const currentUser = tokenStorage.getUser();
  const displayName = isOwn
    ? `${currentUser?.f_name ?? ''} ${currentUser?.l_name ?? ''}`.trim() || 'Tú'
    : (review.user_name ?? `Usuario #${review.user_id.slice(0, 6)}`);
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className={`rounded-[var(--radius-xl)] border p-4 ${isOwn ? 'border-[var(--color-primary)] bg-[var(--color-primary-tint)]' : 'border-[var(--color-border)] bg-[var(--color-bg)]'}`}>
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0 ${getAvatarColor(review.user_id)}`}>
          {initial}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-sm font-extrabold ${isOwn ? 'text-[var(--color-primary-dark)]' : 'text-[var(--color-text)]'}`}>
                {displayName}
                {isOwn && <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-primary)]">(tú)</span>}
              </span>
              <StarRating value={review.rating} readOnly size="sm" />
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-[11px] text-[var(--color-text-3)]">{formatReviewDate(review.created_at)}</span>
              {isOwn && onEditClick && (
                <button
                  onClick={onEditClick}
                  className="w-7 h-7 flex items-center justify-center rounded-full text-[var(--color-primary)]
                    hover:bg-[var(--color-primary)] hover:text-white transition-colors"
                  title="Editar reseña"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Comment */}
          {review.comment && !review.comment.is_deleted && (
            <p className="text-sm text-[var(--color-text-2)] leading-relaxed">
              {review.comment.comment}
            </p>
          )}

          {/* Verified visit badge */}
          {review.verified_visit && (
            <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-[var(--color-primary-dark)] bg-[var(--color-primary-tint)] border border-[var(--color-primary)]/20 px-2 py-0.5 rounded-full">
              <CheckCircle className="w-3 h-3" />
              Visita verificada
            </span>
          )}

          {/* Replies */}
          {review.comment && !review.comment.is_deleted && (
            <CommentRepliesPanel commentId={review.comment.id} isLoggedIn={isLoggedIn} />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ReviewsDialog ────────────────────────────────────────────────────────────

export function ReviewsDialog({
  isOpen,
  onClose,
  complexId,
  complexName,
  fieldId,
  userBookings,
}: ReviewsDialogProps) {
  const currentUserId = tokenStorage.getUser()?.user_id ?? null;

  // List state
  const [paginatedData, setPaginatedData] = useState<PaginatedReviewOutput | null>(null);
  const [reviews, setReviews] = useState<ReviewOutput[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Own review
  const [userReview, setUserReview] = useState<ReviewOutput | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formRating, setFormRating] = useState(0);
  const [formComment, setFormComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // No local eligibility gate — backend rejects if the user cannot review.
  const confirmedBooking = userBookings[0] ?? null;
  const hasConfirmedBooking = currentUserId !== null;

  // ── Load reviews ────────────────────────────────────────────────────────────
  const loadReviews = useCallback(
    async (page: number, append: boolean) => {
      try {
        const data = await reviewService.getComplexReviews(complexId, {
          page,
          page_size: 10,
        });
        setPaginatedData(data);
        setReviews((prev) => {
          const next = append ? [...prev, ...data.items] : data.items;
          // Find own review
          if (currentUserId) {
            const own = next.find((r) => r.user_id === currentUserId) ?? null;
            setUserReview(own);
          }
          return next;
        });
      } catch {
        notify.error('No se pudieron cargar las reseñas.');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [complexId, currentUserId],
  );

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setReviews([]);
    setPaginatedData(null);
    setUserReview(null);
    setShowForm(false);
    setFormRating(0);
    setFormComment('');
    void loadReviews(1, false);
  }, [isOpen, loadReviews]);

  // ── Open form for editing own review ───────────────────────────────────────
  const handleEditClick = () => {
    if (userReview) {
      setFormRating(userReview.rating);
      setFormComment(userReview.comment?.comment ?? '');
    } else {
      setFormRating(0);
      setFormComment('');
    }
    setShowForm(true);
  };

  // ── Submit (create or update) ───────────────────────────────────────────────
  const handleSubmit = async () => {
    if (formRating === 0) {
      notify.error('Selecciona una calificación de 1 a 5 estrellas.');
      return;
    }
    setSubmitting(true);
    try {
      if (userReview) {
        // Update
        const payload: UpdateReviewPayload = { rating: formRating };
        if (formComment.trim()) payload.comment = formComment.trim();
        const updated = await reviewService.updateReview(userReview.id, payload);
        setUserReview(updated);
        setReviews((prev) =>
          prev.map((r) => (r.id === updated.id ? updated : r)),
        );
        notify.success('Reseña actualizada.');
      } else {
        // Create
        const resolvedFieldId = fieldId || confirmedBooking?.fieldId || '';
        const payload: CreateReviewPayload = {
          complex_id: complexId,
          field_id: resolvedFieldId,
          booking_id: confirmedBooking?.id || '',
          rating: formRating,
        };
        if (formComment.trim()) payload.comment = formComment.trim();
        const created = await reviewService.createReview(payload);
        setUserReview(created);
        setReviews((prev) => [created, ...prev]);
        setPaginatedData((prev) => prev ? { ...prev, total: prev.total + 1 } : prev);
        notify.success('¡Reseña publicada!');
      }
      setShowForm(false);
    } catch (e) {
      const err = e as { message?: string };
      notify.error(err?.message ?? 'No se pudo publicar la reseña.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Load more ───────────────────────────────────────────────────────────────
  const handleLoadMore = async () => {
    if (!paginatedData) return;
    setLoadingMore(true);
    await loadReviews(paginatedData.page + 1, true);
  };

  // ── Derived ─────────────────────────────────────────────────────────────────
  const avgRating =
    reviews.length > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : 0;
  const totalReviews = paginatedData?.total ?? 0;
  const hasMore = paginatedData ? paginatedData.page < paginatedData.total_pages : false;

  // Separate own review from others for display
  const ownReviews = reviews.filter((r) => r.user_id === currentUserId);
  const otherReviews = reviews.filter((r) => r.user_id !== currentUserId);

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="md">
      <div className="flex flex-col h-full max-h-[80vh]">
        {/* ── Fixed Header ── */}
        <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-[var(--color-border)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-[var(--color-text)] leading-tight">
                {complexName}
              </h2>
              {!loading && totalReviews > 0 && (
                <div className="flex items-center gap-2 mt-1">
                  <StarRating value={Math.round(avgRating)} readOnly size="sm" />
                  <span className="text-sm font-bold text-[var(--color-text-2)]">
                    {avgRating.toFixed(1)}{' '}
                    <span className="font-normal text-[var(--color-text-3)]">
                      ({totalReviews} {totalReviews === 1 ? 'reseña' : 'reseñas'})
                    </span>
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full text-[var(--color-text-3)]
                hover:bg-[var(--color-surf2)] hover:text-[var(--color-text)] transition-colors flex-shrink-0"
              aria-label="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">

          {/* ── My Review Section ── */}
          {!loading && (
            <section>
              {hasConfirmedBooking ? (
                <>
                  {/* User already has a review and is not editing */}
                  {userReview && !showForm ? (
                    <div>
                      <p className="text-xs font-bold text-[var(--color-text-3)] uppercase tracking-widest mb-2">
                        Tu reseña
                      </p>
                      <ReviewItem
                        review={userReview}
                        isOwn
                        onEditClick={handleEditClick}
                      />
                    </div>
                  ) : showForm ? (
                    /* Form — create or edit */
                    <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surf2)] p-4">
                      <p className="text-sm font-extrabold text-[var(--color-text)] mb-3">
                        {userReview ? 'Editar reseña' : 'Dejar una reseña'}
                      </p>

                      {/* Star input */}
                      <label className="block text-xs font-bold text-[var(--color-text-3)] uppercase tracking-widest mb-2">
                        Calificación
                      </label>
                      <StarRating value={formRating} onChange={setFormRating} size="lg" />

                      {/* Comment */}
                      <label className="block text-xs font-bold text-[var(--color-text-3)] uppercase tracking-widest mt-4 mb-2">
                        Comentario <span className="normal-case font-normal">(opcional)</span>
                      </label>
                      <textarea
                        value={formComment}
                        onChange={(e) => setFormComment(e.target.value)}
                        maxLength={1000}
                        rows={3}
                        placeholder="Comparte tu experiencia…"
                        className="w-full rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white
                          px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-3)]
                          focus:outline-none focus:border-[var(--color-primary)] resize-none"
                      />
                      <p className="text-[10px] text-[var(--color-text-3)] text-right mt-0.5">
                        {formComment.length}/1000
                      </p>

                      {/* Actions */}
                      <div className="flex items-center gap-2 mt-3">
                        <button
                          onClick={handleSubmit}
                          disabled={submitting || formRating === 0}
                          className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-lg)]
                            bg-[var(--color-primary)] text-white text-sm font-bold
                            hover:bg-[var(--color-primary-dark)] disabled:opacity-50 disabled:cursor-not-allowed
                            transition-colors"
                        >
                          {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                          {userReview ? 'Guardar cambios' : 'Publicar'}
                        </button>
                        <button
                          onClick={() => setShowForm(false)}
                          className="px-4 py-2 rounded-[var(--radius-lg)] border border-[var(--color-border)]
                            text-sm font-bold text-[var(--color-text-2)]
                            hover:bg-[var(--color-surf2)] transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* No review yet and form is hidden — show trigger */
                    <div className="rounded-[var(--radius-xl)] border border-dashed border-[var(--color-border)] bg-[var(--color-surf2)] p-4">
                      <p className="text-sm font-extrabold text-[var(--color-text)] mb-1">
                        Dejar una reseña
                      </p>
                      <p className="text-xs text-[var(--color-text-3)] mb-3">
                        ¿Cómo fue tu experiencia en {complexName}?
                      </p>
                      <button
                        onClick={handleEditClick}
                        className="px-4 py-2 rounded-[var(--radius-lg)]
                          bg-[var(--color-primary)] text-white text-sm font-bold
                          hover:bg-[var(--color-primary-dark)] transition-colors"
                      >
                        Escribir reseña
                      </button>
                    </div>
                  )}
                </>
              ) : (
                /* No confirmed booking */
                <div className="flex items-start gap-3 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surf2)] p-4">
                  <Star className="w-5 h-5 text-[var(--color-text-3)] flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-[var(--color-text-3)] leading-relaxed">
                    Necesitas una{' '}
                    <span className="font-bold text-[var(--color-text-2)]">
                      reserva confirmada
                    </span>{' '}
                    en este complejo para dejar tu reseña.
                  </p>
                </div>
              )}
            </section>
          )}

          {/* ── Reviews List ── */}
          <section>
            <p className="text-xs font-bold text-[var(--color-text-3)] uppercase tracking-widest mb-3">
              Reseñas{totalReviews > 0 ? ` (${totalReviews})` : ''}
            </p>

            {loading ? (
              <div className="flex items-center justify-center py-12 gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-[var(--color-primary)]" />
                <span className="text-sm text-[var(--color-text-3)]">Cargando reseñas…</span>
              </div>
            ) : reviews.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Star className="w-10 h-10 text-gray-200" />
                <p className="text-sm font-bold text-[var(--color-text-2)]">Sin reseñas aún</p>
                <p className="text-xs text-[var(--color-text-3)]">
                  Sé el primero en calificar este complejo.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {/* Own review at top */}
                {ownReviews.map((r) => (
                  <ReviewItem
                    key={r.id}
                    review={r}
                    isOwn
                    isLoggedIn={currentUserId !== null}
                    onEditClick={handleEditClick}
                  />
                ))}
                {/* Other reviews */}
                {otherReviews.map((r) => (
                  <ReviewItem key={r.id} review={r} isOwn={false} isLoggedIn={currentUserId !== null} />
                ))}

                {/* Load more */}
                {hasMore && (
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="w-full py-2.5 rounded-[var(--radius-xl)] border border-dashed border-[var(--color-border)]
                      text-sm font-bold text-[var(--color-text-2)]
                      hover:bg-[var(--color-primary-tint)] hover:text-[var(--color-primary-dark)]
                      hover:border-[var(--color-primary)] disabled:opacity-50
                      transition-all flex items-center justify-center gap-2"
                  >
                    {loadingMore ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Cargando…</>
                    ) : (
                      `Cargar más reseñas`
                    )}
                  </button>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </Dialog>
  );
}
