import { MapPin, ArrowRight, Heart } from 'lucide-react';
import type { NearbyComplex } from '../../types/map';
import { Typography } from '../ui/typography';
import { formatPrice } from '../../lib/utils';

interface ComplexCardProps {
  complex: NearbyComplex;
  onSelect: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: (complexId: string) => void;
}

export function ComplexCard({ complex, onSelect, isFavorite, onToggleFavorite }: ComplexCardProps) {
  return (
    <div
      className="group cursor-pointer bg-[var(--color-surface)] rounded-[var(--radius-2xl)] overflow-hidden
        border-[1.5px] border-[var(--color-border)] shadow-[var(--shadow-md)]
        transition-all duration-[var(--duration-mid)]
        hover:-translate-y-1.5 hover:scale-[1.01] hover:shadow-[var(--shadow-xl)] hover:border-[var(--color-primary)]"
      onClick={onSelect}
    >
      {/* Visual header */}
      <div
        className="h-[130px] relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #1a3810, #2d5a1a)' }}
      >
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.3) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
          }}
        />

        {/* Center icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <i className="fa-solid fa-building text-white/15 text-6xl" />
        </div>

        {/* Distance badge — top right */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          {onToggleFavorite && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(complex.id); }}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all active:scale-90
                ${isFavorite
                  ? 'bg-red-500 text-white shadow-md'
                  : 'bg-black/50 backdrop-blur-sm text-white/70 hover:text-red-400'
                }`}
            >
              <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-white' : ''}`} />
            </button>
          )}
          <div className="flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full px-2.5 py-1">
            <MapPin className="w-2.5 h-2.5 text-[var(--color-primary)]" />
            <span className="font-[var(--font-pixel)] text-[7px] tracking-widest text-white">
              {complex.distanceLabel}
            </span>
          </div>
        </div>

        {/* Fields count — bottom right */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full px-2.5 py-1">
          <i className="fa-solid fa-futbol text-[8px] text-[var(--color-primary)]" />
          <span className="font-[var(--font-pixel)] text-[7px] tracking-widest text-white">
            {complex.fieldsCount} {complex.fieldsCount === 1 ? 'cancha' : 'canchas'}
          </span>
        </div>

        {/* City pill — bottom left */}
        <div className="absolute bottom-3 left-3">
          <span className="inline-flex items-center gap-1 font-[var(--font-pixel)] text-[6px] tracking-wider px-2 py-1 rounded-full bg-white/15 text-white border border-white/25">
            <i className="fa-solid fa-location-dot text-[7px]" />
            {complex.city}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 pb-5">
        <Typography variant="h5" color="text" className="mb-0.5 truncate">
          {complex.name}
        </Typography>
        <p className="text-[11px] text-[var(--color-text-3)] mb-4 truncate font-medium">
          {complex.address}
        </p>

        {/* Price + CTA */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] text-[var(--color-text-3)] font-medium">Desde</span>
            <span className="text-[15px] font-extrabold text-[var(--color-primary-dark)] font-[var(--font-display)]">
              {formatPrice(complex.minPrice)}
              <span className="text-[10px] font-medium text-[var(--color-text-3)] ml-0.5">/hr</span>
            </span>
          </div>

          <button
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[var(--radius-lg)]
              bg-[var(--color-primary)] text-white font-extrabold text-[11px]
              hover:bg-[var(--color-primary-dark)] active:scale-95
              transition-all duration-[var(--duration-fast)] shadow-[var(--shadow-sm)]"
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
          >
            Ver canchas
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
