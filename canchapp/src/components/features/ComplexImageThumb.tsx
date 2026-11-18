import { useEffect, useState, type ReactNode } from 'react';
import { Building2 } from 'lucide-react';

type ThumbSize = 'xs' | 'sm' | 'md' | 'lg';

const THUMB_SIZES: Record<ThumbSize, string> = {
  xs: 'h-8 w-8',
  sm: 'h-10 w-10',
  md: 'h-14 w-14',
  lg: 'h-[72px] w-[72px]',
};

const ICON_SIZES: Record<ThumbSize, string> = {
  xs: 'h-3.5 w-3.5',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

interface ComplexImageThumbProps {
  src?: string | null;
  alt: string;
  size?: ThumbSize;
  className?: string;
}

export function ComplexImageThumb({
  src,
  alt,
  size = 'sm',
  className = '',
}: ComplexImageThumbProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const showImage = Boolean(src) && !failed;

  return (
    <div
      className={`relative flex flex-shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-primary-tint)] ${THUMB_SIZES[size]} ${className}`}
    >
      {showImage ? (
        <img
          src={src ?? undefined}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <Building2 className={`${ICON_SIZES[size]} text-[var(--color-primary)]`} />
      )}
    </div>
  );
}

interface ComplexImageCoverProps {
  src?: string | null;
  alt: string;
  className?: string;
  children?: ReactNode;
}

export function ComplexImageCover({
  src,
  alt,
  className = '',
  children,
}: ComplexImageCoverProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const showImage = Boolean(src) && !failed;

  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br from-[#1a3810] to-[#2d5a1a] ${className}`}
    >
      {showImage ? (
        <img
          src={src ?? undefined}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Building2 className="h-8 w-8 text-white/25" />
        </div>
      )}

      {showImage && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/10" />
      )}

      {children}
    </div>
  );
}

export default ComplexImageThumb;
