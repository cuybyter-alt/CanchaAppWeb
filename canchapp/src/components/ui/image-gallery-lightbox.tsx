import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Image as ImageIcon, X } from 'lucide-react';

export interface GalleryImageItem {
  src: string;
  alt: string;
  title?: string;
}

interface ImageGalleryLightboxProps {
  isOpen: boolean;
  images: GalleryImageItem[];
  initialIndex?: number;
  onClose: () => void;
}

export function ImageGalleryLightbox({
  isOpen,
  images,
  initialIndex = 0,
  onClose,
}: ImageGalleryLightboxProps) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [failed, setFailed] = useState(false);

  const total = images.length;
  const safeIndex = total === 0 ? 0 : Math.min(Math.max(activeIndex, 0), total - 1);
  const current = total > 0 ? images[safeIndex] : null;

  useEffect(() => {
    if (!isOpen) return;
    setActiveIndex(total === 0 ? 0 : Math.min(Math.max(initialIndex, 0), total - 1));
  }, [isOpen, initialIndex, total]);

  useEffect(() => {
    setFailed(false);
  }, [current?.src, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        onClose();
        return;
      }

      if (total <= 1) return;

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        event.stopImmediatePropagation();
        setActiveIndex((prev) => (prev - 1 + total) % total);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        event.stopImmediatePropagation();
        setActiveIndex((prev) => (prev + 1) % total);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen, onClose, total]);

  if (!isOpen || !current) return null;

  const goPrev = () => setActiveIndex((prev) => (prev - 1 + total) % total);
  const goNext = () => setActiveIndex((prev) => (prev + 1) % total);

  const content = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={current.title ?? current.alt}
      className="fixed inset-0 z-[100000] flex flex-col bg-black/95 p-3 text-white animate-fade-in sm:p-5"
      onClick={onClose}
    >
      <div className="relative z-10 flex items-center justify-between gap-3">
        <span className="rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-extrabold tracking-wide text-white/80 backdrop-blur-sm">
          {safeIndex + 1} / {total}
        </span>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
          autoFocus
          aria-label="Cerrar galería"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-all hover:bg-[var(--color-primary)] active:scale-95"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div
        className="relative flex min-h-0 flex-1 items-center justify-center gap-2 py-3 sm:gap-4"
        onClick={(event) => event.stopPropagation()}
      >
        {total > 1 && (
          <button
            type="button"
            onClick={goPrev}
            aria-label="Foto anterior"
            className="absolute left-0 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-all hover:bg-[var(--color-primary)] active:scale-95 sm:h-12 sm:w-12"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        {failed ? (
          <div className="flex h-[50vh] w-[min(88vw,48rem)] flex-col items-center justify-center gap-3 rounded-[var(--radius-2xl)] border border-white/15 bg-white/5 text-white/50">
            <ImageIcon className="h-12 w-12" />
            <span className="text-xs font-extrabold uppercase tracking-widest">
              Imagen no disponible
            </span>
          </div>
        ) : (
          <img
            key={current.src}
            src={current.src}
            alt={current.alt}
            onError={() => setFailed(true)}
            className="max-h-[70vh] max-w-[88vw] rounded-[var(--radius-xl)] object-contain shadow-[var(--shadow-2xl)] sm:max-h-[74vh]"
          />
        )}

        {total > 1 && (
          <button
            type="button"
            onClick={goNext}
            aria-label="Foto siguiente"
            className="absolute right-0 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-all hover:bg-[var(--color-primary)] active:scale-95 sm:h-12 sm:w-12"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>

      <div
        className="relative z-10 flex flex-col items-center gap-3"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="max-w-2xl text-center text-sm font-extrabold text-white/90">
          {current.title ?? current.alt}
        </p>

        {total > 1 && (
          <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
            {images.map((image, index) => (
              <button
                key={`${image.src}-${index}`}
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`Ver foto ${index + 1} de ${total}`}
                aria-current={index === safeIndex ? 'true' : undefined}
                className={`h-14 w-20 flex-shrink-0 overflow-hidden rounded-[var(--radius-lg)] border-2 transition-all active:scale-95 ${
                  index === safeIndex
                    ? 'border-[var(--color-primary)] opacity-100'
                    : 'border-white/20 opacity-55 hover:opacity-100'
                }`}
              >
                <img
                  src={image.src}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
}

export default ImageGalleryLightbox;
