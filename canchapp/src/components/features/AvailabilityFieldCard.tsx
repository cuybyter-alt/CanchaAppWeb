import React from 'react';
import { CalendarPlus, CheckCircle2, Clock3, Wrench, XCircle } from 'lucide-react';
import { FIELD_TYPE_LABELS } from '../../lib/availability';
import { formatPriceFull } from '../../lib/utils';
import type { AvailabilityFieldResult, AvailabilityStatus } from '../../types/availability';

interface StatusStyle {
  label: string;
  card: string;
  badge: string;
  icon: React.ReactNode;
}

const STATUS_STYLES: Record<AvailabilityStatus, StatusStyle> = {
  available: {
    label: 'Disponible',
    card: 'border-emerald-300 bg-emerald-50/60',
    badge: 'bg-emerald-100 text-emerald-700',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  occupied: {
    label: 'Ocupada',
    card: 'border-red-300 bg-red-50/60',
    badge: 'bg-red-100 text-red-700',
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
  maintenance: {
    label: 'En mantenimiento',
    card: 'border-amber-300 bg-amber-50/70',
    badge: 'bg-amber-100 text-amber-800',
    icon: <Wrench className="w-3.5 h-3.5" />,
  },
};

interface AvailabilityFieldCardProps {
  result: AvailabilityFieldResult;
  onQuickBook: (result: AvailabilityFieldResult) => void;
}

const AvailabilityFieldCard: React.FC<AvailabilityFieldCardProps> = ({ result, onQuickBook }) => {
  const style = STATUS_STYLES[result.status];
  const canBook = result.status === 'available' && !result.isPast && result.slotId !== null;
  const badgeLabel = result.isPast ? 'Horario pasado' : style.label;

  return (
    <article
      id={`availability-card-${result.fieldId}`}
      className={`rounded-[var(--radius-xl)] border-[1.5px] p-4 flex flex-col gap-3 transition-all ${
        result.isPast ? 'border-gray-200 bg-gray-50/70 opacity-75' : style.card
      }`}
      aria-label={`${result.fieldName}: ${badgeLabel}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="font-extrabold text-[var(--color-text)] truncate">{result.fieldName}</h4>
          <p className="text-xs font-semibold text-[var(--color-text-3)] mt-0.5 truncate">
            {FIELD_TYPE_LABELS[result.fieldType] ?? result.fieldType} · {result.complexName}
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase flex-shrink-0 ${
            result.isPast ? 'bg-gray-200 text-gray-700' : style.badge
          }`}
        >
          {result.isPast ? <Clock3 className="w-3.5 h-3.5" /> : style.icon}
          {badgeLabel}
        </span>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-extrabold tracking-widest text-[var(--color-text-3)] uppercase flex items-center gap-1">
            <Clock3 className="w-3 h-3" />
            Horario consultado
          </p>
          <p className="text-sm font-extrabold text-[var(--color-text)] mt-0.5">{result.timeLabel}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-extrabold tracking-widest text-[var(--color-text-3)] uppercase">
            Tarifa por hora
          </p>
          <p className="text-base font-extrabold text-[var(--color-primary-dark)] mt-0.5">
            {result.hourlyRate !== null ? formatPriceFull(result.hourlyRate) : '—'}
          </p>
        </div>
      </div>

      {canBook ? (
        <button
          id={`quick-book-${result.fieldId}`}
          type="button"
          onClick={() => onQuickBook(result)}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-[var(--color-primary)] text-white font-extrabold text-sm shadow-[var(--shadow-primary)] hover:-translate-y-0.5 hover:brightness-95 transition-all active:scale-95"
        >
          <CalendarPlus className="w-4 h-4" />
          Reserva rápida
        </button>
      ) : (
        <p className="text-xs font-bold text-[var(--color-text-3)] text-center py-2">
          {result.status === 'maintenance'
            ? 'No se puede reservar mientras esté en mantenimiento.'
            : result.isPast
              ? 'Este horario ya pasó. No está disponible para reservar.'
              : 'Este horario ya está reservado.'}
        </p>
      )}
    </article>
  );
};

export default AvailabilityFieldCard;
