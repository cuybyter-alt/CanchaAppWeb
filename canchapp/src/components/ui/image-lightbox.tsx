import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Image as ImageIcon, X } from 'lucide-react';

interface ImageLightboxProps {
  isOpen: boolean;
  src: string;
  alt: string;
  title?: string;
  onClose: () => void;
}

export function ImageLightbox({ isOpen, src, alt, title, onClose }: ImageLightboxProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const content = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title ?? alt}
      className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/90 p-4 animate-fade-in"
      onClick={(event) => {
        event.stopPropagation();
        onClose();
      }}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
        autoFocus
        aria-label="Cerrar imagen ampliada"
        className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-all hover:bg-[var(--color-primary)] hover:text-white active:scale-95 sm:right-6 sm:top-6"
      >
        <X className="h-5 w-5" />
      </button>

      <div
        className="flex max-h-[90vh] max-w-[95vw] flex-col items-center gap-3"
        onClick={(event) => event.stopPropagation()}
      >
        {failed ? (
          <div className="flex min-h-52 w-[min(90vw,42rem)] flex-col items-center justify-center gap-3 rounded-[var(--radius-2xl)] border border-white/15 bg-white/5 text-white/50">
            <ImageIcon className="h-12 w-12" />
            <span className="text-xs font-extrabold uppercase tracking-widest">
              Imagen no disponible
            </span>
          </div>
        ) : (
          <img
            src={src}
            alt={alt}
            onError={() => setFailed(true)}
            className="max-h-[82vh] max-w-[95vw] rounded-[var(--radius-xl)] object-contain shadow-[var(--shadow-2xl)]"
          />
        )}

        {title && (
          <p className="max-w-2xl text-center text-sm font-extrabold text-white/85">
            {title}
          </p>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
}

export default ImageLightbox;
