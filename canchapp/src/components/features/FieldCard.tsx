import { Heart, MapPin, Star } from 'lucide-react';
import { useState } from 'react';
import type { Field } from '../../types/field';
import { Badge } from '../ui/badge';
import { Typography } from '../ui/typography';
import { FieldPitchSVG, BasketballCourtSVG, PadelCourtSVG } from '../ui/svg-assets';
import { formatPrice } from '../../lib/utils';

interface FieldCardProps {
  field: Field;
  isSelected?: boolean;
  onSelect?: (field: Field) => void;
}

const getSportGradient = (sport: string) => {
  switch (sport) {
    case 'soccer':     return 'linear-gradient(145deg, #1a3810, #2d5a1a)';
    case 'basketball': return 'linear-gradient(145deg, #0d1f3c, #1a3a6b)';
    case 'padel':      return 'linear-gradient(145deg, #2a1a10, #5a3a1a)';
    default:           return 'linear-gradient(145deg, #1a3810, #2d5a1a)';
  }
};

const getFieldSVG = (sport: string) => {
  switch (sport) {
    case 'soccer':     return <FieldPitchSVG />;
    case 'basketball': return <BasketballCourtSVG />;
    case 'padel':      return <PadelCourtSVG />;
    default:           return <FieldPitchSVG />;
  }
};

const getSportIcon = (sport: string) => {
  switch (sport) {
    case 'soccer':     return 'futbol';
    case 'basketball': return 'basketball';
    case 'padel':      return 'table-tennis-paddle-ball';
    default:           return 'futbol';
  }
};

const getTagBadge = (tag: string) => {
  switch (tag) {
    case 'turf':    return <span key={tag} className="inline-flex items-center gap-1 font-[var(--font-pixel)] text-[6px] tracking-wider px-2 py-1 rounded-full bg-[var(--color-accent)]/20 text-[#FF8F99] border border-[var(--color-accent)]/25">Césped Artificial</span>;
    case 'indoor':  return <span key={tag} className="inline-flex items-center gap-1 font-[var(--font-pixel)] text-[6px] tracking-wider px-2 py-1 rounded-full bg-white/15 text-white border border-white/25">Techada</span>;
    case 'outdoor': return <span key={tag} className="inline-flex items-center gap-1 font-[var(--font-pixel)] text-[6px] tracking-wider px-2 py-1 rounded-full bg-white/15 text-white border border-white/25">Al aire libre</span>;
    case 'premium': return <span key={tag} className="inline-flex items-center gap-1 font-[var(--font-pixel)] text-[6px] tracking-wider px-2 py-1 rounded-full bg-[var(--color-score)] text-[var(--color-text)]"><i className="fa-solid fa-crown" /> Premium</span>;
    default:        return null;
  }
};

export function FieldCard({ field, isSelected, onSelect }: FieldCardProps) {
  const [isFavorite, setIsFavorite] = useState(field.isFavorite);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFavorite(!isFavorite);
  };

  return (
    <div
      className={`
        group cursor-pointer bg-[var(--color-surface)] rounded-[var(--radius-2xl)] overflow-hidden
        border-[1.5px] shadow-[var(--shadow-md)] transition-all duration-[var(--duration-mid)]
        hover:-translate-y-1.5 hover:scale-[1.01] hover:shadow-[var(--shadow-xl)]
        ${
          isSelected
            ? 'border-[var(--color-primary)] shadow-[var(--shadow-xl)] ring-[3px] ring-[var(--color-primary-glow)]'
            : 'border-[var(--color-border)] hover:border-[var(--color-primary)]'
        }
      `}
      onClick={() => onSelect?.(field)}
    >
      {/* Visual de la cancha */}
      <div className="h-[140px] relative overflow-hidden" style={{ background: getSportGradient(field.sport) }}>
        <div className="absolute inset-0 flex items-center justify-center">
          {getFieldSVG(field.sport)}
        </div>

        {/* Tags */}
        <div className="absolute top-3 left-3 flex gap-1 flex-wrap z-10">
          <Badge variant="primary" className="flex items-center gap-1 !font-[var(--font-pixel)] !text-[6px]">
            <i className={`fa-solid fa-${getSportIcon(field.sport)}`} />
            {field.sportLabel}
          </Badge>
          {field.tags.map(tag => getTagBadge(tag))}
        </div>

        {/* Favorito */}
        <button
          className={`
            absolute top-3 right-3 w-8 h-8 rounded-full
            border-[1.5px] flex items-center justify-center
            transition-all duration-[var(--duration-fast)] z-10
            ${
              isFavorite
                ? 'bg-[var(--color-accent)]/25 border-[var(--color-accent)]/20 text-[var(--color-accent)]'
                : 'bg-white/12 border-white/20 text-white/60 hover:bg-[var(--color-accent)]/30 hover:text-[var(--color-accent)]'
            }
            hover:scale-110 active:scale-95
          `}
          onClick={handleFavoriteClick}
        >
          <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-current' : ''}`} />
        </button>

        {/* Rating */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-black/40 backdrop-blur rounded-full px-2 py-1">
          <Star className="w-2.5 h-2.5 fill-[var(--color-score)] text-[var(--color-score)]" />
          <span className="font-[var(--font-pixel)] text-[6px] tracking-widest uppercase text-[var(--color-score)]">
            {field.rating} · {field.reviewCount}
          </span>
        </div>
      </div>

      {/* Cuerpo de la tarjeta */}
      <div className="p-4 pb-5">
        <Typography variant="h4" as="h3" className="mb-2">
          {field.name}
        </Typography>

        <div className="flex items-center gap-1 mb-3">
          <MapPin className="w-3 h-3 text-[var(--color-primary)]" />
          <Typography variant="small" color="text-3" className="text-xs font-bold">
            {field.location} · {field.distance}
          </Typography>
        </div>

        {/* Amenidades */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {field.amenities.map((amenity, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--color-text-3)]
                bg-[var(--color-surf2)] rounded-full px-2 py-1 border border-[var(--color-border)]"
            >
              <i className={`fa-solid fa-${amenity.icon} text-[10px] text-[var(--color-primary)]`} />
              {amenity.label}
            </span>
          ))}
        </div>

        {/* Disponibilidad */}
        <Typography variant="pixel-sm" color="text-3" className="mb-2">
          DISPONIBILIDAD HOY
        </Typography>
        <div className="flex gap-1 mb-3 flex-wrap">
          {field.availability.map((slot, idx) => (
            <div
              key={idx}
              className={`w-2 h-2 rounded-sm ${
                slot.status === 'available'
                  ? 'bg-[var(--color-primary)]'
                  : slot.status === 'almost-full'
                  ? 'bg-[var(--color-score)]'
                  : 'bg-[var(--color-border)]'
              }`}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t-[1.5px] border-dashed border-[var(--color-border)]">
          <div>
            <div className="font-[var(--font-display)] text-[26px] font-black tracking-tight text-[var(--color-primary)] leading-none">
              {formatPrice(field.price)}
            </div>
            <Typography variant="small" color="text-3" className="text-xs">
              por hora
            </Typography>
          </div>
          <button
            className="inline-flex items-center justify-center gap-2 font-bold transition-all duration-[var(--duration-fast)] cursor-pointer
              bg-gradient-to-br from-[var(--color-primary-light)] via-[var(--color-primary)] to-[var(--color-primary-dark)]
              text-white shadow-[var(--shadow-primary)] hover:scale-105 hover:-translate-y-0.5 active:scale-95
              px-5 py-2 text-sm rounded-[var(--radius-badge)]"
          >
            <i className="fa-solid fa-calendar-check" />
            Reservar
          </button>
        </div>
      </div>
    </div>
  );
}
