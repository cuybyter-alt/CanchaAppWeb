import { useEffect, useState } from 'react';
import { Image as ImageIcon, Images, Maximize2 } from 'lucide-react';
import { ImageLightbox } from '../ui/image-lightbox';
import type { ComplexImage } from '../../types/complexImage';

interface ComplexImageGalleryProps {
  images: ComplexImage[];
  alt: string;
}

export function ComplexImageGallery({ images, alt }: ComplexImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set());
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const confirmedImages = images.filter((image) => image.status === 'confirmed');
  const total = confirmedImages.length;
  const safeIndex = total === 0 ? 0 : Math.min(activeIndex, total - 1);
  const activeImage = confirmedImages[safeIndex];

  useEffect(() => {
    if (activeIndex >= total && total > 0) setActiveIndex(0);
  }, [activeIndex, total]);

  if (total === 0 || !activeImage) return null;

  const markFailed = (url: string) => {
    setFailedUrls((prev) => {
      const next = new Set(prev);
      next.add(url);
      return next;
    });
  };

  const mainFailed = failedUrls.has(activeImage.image_url);

  return (
    <>
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-[var(--font-display)] text-lg font-extrabold text-[var(--color-text)]">
          <Images className="h-5 w-5 text-[var(--color-primary)]" />
          Fotos del complejo
        </h2>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary-tint)] px-3 py-1 text-[11px] font-extrabold text-[var(--color-primary-dark)]">
          <i className="fa-solid fa-camera text-[9px]" />
          {total} foto{total === 1 ? '' : 's'}
        </span>
      </div>

      <div className="overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-text)] shadow-[var(--shadow-md)]">
        <div
          className="relative aspect-[16/9] cursor-zoom-in"
          onClick={() => !mainFailed && setLightboxOpen(true)}
        >
          {mainFailed ? (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[var(--color-text)] text-white/40">
              <ImageIcon className="h-10 w-10" />
              <span className="text-[11px] font-extrabold uppercase tracking-widest">
                Imagen no disponible
              </span>
            </div>
          ) : (
            <img
              key={activeImage.image_url}
              src={activeImage.image_url}
              alt={activeImage.description || alt}
              loading="lazy"
              onError={() => markFailed(activeImage.image_url)}
              className="h-full w-full object-cover animate-fade-in"
            />
          )}

          {!mainFailed && activeImage.description && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-4 pt-12">
              <p className="max-w-2xl text-sm font-semibold text-white">
                {activeImage.description}
              </p>
            </div>
          )}

          {!mainFailed && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setLightboxOpen(true);
              }}
              aria-label="Ampliar foto del complejo"
              title="Ampliar foto"
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-all hover:bg-[var(--color-primary)] active:scale-95"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {total > 1 && (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6">
          {confirmedImages.map((image, index) => {
            const isActive = index === safeIndex;
            const thumbnailFailed = failedUrls.has(image.image_url);

            return (
              <button
                key={image.img_id}
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`Ver foto ${index + 1} de ${total}`}
                aria-current={isActive ? 'true' : undefined}
                className={`relative aspect-[4/3] overflow-hidden rounded-[var(--radius-lg)] border-2 transition-all duration-200 active:scale-95 ${
                  isActive
                    ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary-glow)]'
                    : 'border-transparent opacity-65 hover:opacity-100'
                }`}
              >
                {thumbnailFailed ? (
                  <span className="flex h-full w-full items-center justify-center bg-[var(--color-surf2)] text-[var(--color-text-3)]">
                    <ImageIcon className="h-4 w-4" />
                  </span>
                ) : (
                  <img
                    src={image.image_url}
                    alt=""
                    loading="lazy"
                    onError={() => markFailed(image.image_url)}
                    className="h-full w-full object-cover"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </section>

    <ImageLightbox
      isOpen={lightboxOpen}
      src={activeImage.image_url}
      alt={activeImage.description || alt}
      title={alt}
      onClose={() => setLightboxOpen(false)}
    />
    </>
  );
}

export default ComplexImageGallery;
