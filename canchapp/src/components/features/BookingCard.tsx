import { Calendar, Clock, Users, CreditCard, X as XIcon } from 'lucide-react';
import type { Booking } from '../../types/field';
import { Typography } from '../ui/typography';

interface BookingCardProps {
  booking: Booking;
}

const getSportGradient = (sport: string) => {
  switch (sport) {
    case 'soccer':     return 'linear-gradient(145deg, #1a3810, #2d5a1a)';
    case 'basketball': return 'linear-gradient(145deg, #0d1f3c, #1a3a6b)';
    case 'padel':      return 'linear-gradient(145deg, #2a1a10, #5a3a1a)';
    default:           return 'linear-gradient(145deg, #1a3810, #2d5a1a)';
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

const getSportIconColor = (sport: string) => {
  if (sport === 'padel') return 'linear-gradient(145deg, #FFE84D, var(--color-score-dark))';
  return 'linear-gradient(145deg, var(--color-primary-light), var(--color-primary-dark))';
};

export function BookingCard({ booking }: BookingCardProps) {
  const statusConfig = {
    confirmed: { label: 'CONFIRMADA', icon: 'check',  bg: 'bg-[var(--color-primary)] text-white' },
    pending:   { label: 'PENDIENTE',  icon: 'clock',  bg: 'bg-[var(--color-score)] text-[var(--color-text)]' },
    cancelled: { label: 'CANCELADA',  icon: 'xmark',  bg: 'bg-[var(--color-accent)] text-white' },
  };
  const status = statusConfig[booking.status];

  return (
    <div
      className="bg-[var(--color-surface)] rounded-[var(--radius-2xl)] border-[1.5px] border-[var(--color-border)]
        shadow-[var(--shadow-md)] overflow-hidden relative cursor-pointer
        transition-all duration-[var(--duration-mid)] hover:-translate-y-1 hover:shadow-[var(--shadow-xl)]"
    >
      {/* Header con gradiente del deporte */}
      <div className="p-4 pb-5 relative overflow-hidden" style={{ background: getSportGradient(booking.sport) }}>
        <div
          className="w-12 h-12 rounded-[var(--radius-lg)] flex items-center justify-center text-[22px]
            shadow-[var(--shadow-md)] relative z-10"
          style={{ background: getSportIconColor(booking.sport) }}
        >
          <i className={`fa-solid fa-${getSportIcon(booking.sport)} text-white`} />
        </div>

        {/* Estado */}
        <span className={`absolute top-3 right-3 font-[var(--font-pixel)] text-[6px] px-2 py-1 rounded-full z-20 ${status.bg}`}>
          <i className={`fa-solid fa-${status.icon} mr-1`} />
          {status.label}
        </span>

        {/* Borde redondeado inferior blanco */}
        <div className="absolute bottom-0 left-0 right-0 h-5 bg-[var(--color-surface)] rounded-t-[var(--radius-2xl)]" />
      </div>

      {/* Cuerpo */}
      <div className="p-2 px-4 pb-4">
        <Typography variant="h5" as="h3" className="leading-tight">
          {booking.fieldName}
        </Typography>
        <div className="flex gap-3 mt-1 text-[12px] font-semibold text-[var(--color-text-3)] flex-wrap">
          <span className="flex items-center gap-1">
            <Calendar className="w-2.5 h-2.5 text-[var(--color-primary)]" />
            {booking.date}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-2.5 h-2.5 text-[var(--color-primary)]" />
            {booking.time}
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-2.5 h-2.5 text-[var(--color-primary)]" />
            {booking.sportLabel}
          </span>
        </div>
      </div>

      {/* Acciones */}
      <div className="px-4 pb-4 flex gap-2">
        {booking.status === 'confirmed' && (
          <>
            <button className="inline-flex items-center justify-center gap-2 font-bold transition-all duration-[var(--duration-fast)] cursor-pointer
              bg-gradient-to-br from-[var(--color-primary-light)] via-[var(--color-primary)] to-[var(--color-primary-dark)]
              text-white shadow-[var(--shadow-primary)] hover:scale-105 active:scale-95
              px-3 py-1.5 text-xs rounded-[var(--radius-md)] flex-1">
              <i className="fa-solid fa-qrcode" />
              Código QR
            </button>
            <button className="inline-flex items-center justify-center gap-2 font-bold transition-all duration-[var(--duration-fast)] cursor-pointer
              bg-transparent border-2 border-[var(--color-border)] text-[var(--color-text-3)]
              hover:border-[var(--color-primary)] hover:text-[var(--color-primary-dark)] hover:bg-[var(--color-primary-tint)]
              px-3 py-1.5 text-xs rounded-[var(--radius-md)] flex-1">
              <i className="fa-solid fa-users-rectangle" />
              Invitar
            </button>
          </>
        )}
        {booking.status === 'pending' && (
          <>
            <button className="inline-flex items-center justify-center gap-2 font-bold transition-all duration-[var(--duration-fast)] cursor-pointer
              bg-gradient-to-br from-[var(--color-primary-light)] via-[var(--color-primary)] to-[var(--color-primary-dark)]
              text-white shadow-[var(--shadow-primary)] hover:scale-105 active:scale-95
              px-3 py-1.5 text-xs rounded-[var(--radius-md)] flex-1">
              <CreditCard className="w-3 h-3" />
              Pagar Ahora
            </button>
            <button className="inline-flex items-center justify-center gap-2 font-bold transition-all duration-[var(--duration-fast)] cursor-pointer
              bg-transparent border-2 border-[var(--color-border)] text-[var(--color-text-3)]
              hover:border-[var(--color-primary)] hover:text-[var(--color-primary-dark)] hover:bg-[var(--color-primary-tint)]
              px-3 py-1.5 text-xs rounded-[var(--radius-md)] flex-1">
              <XIcon className="w-3 h-3" />
              Cancelar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
