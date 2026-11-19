import type { ReactNode } from 'react';
import {
  Building2,
  CalendarDays,
  Clock3,
  CreditCard,
  Phone,
  Timer,
  Trophy,
  User,
} from 'lucide-react';
import { Dialog } from '../ui/dialog';
import { ComplexImageCover } from './ComplexImageThumb';

export type BookingDetailStatus = 'pending' | 'part_paid' | 'confirmed' | 'canceled' | 'rejected';

export interface BookingDetailData {
  bookingId: string;
  complexName: string;
  fieldName: string;
  dateLabel: string;
  timeRangeLabel: string;
  status: BookingDetailStatus;
  priceLabel?: string;
  customerName?: string;
  phone?: string;
  imageUrl?: string | null;
  sportLabel?: string;
  duration?: string;
  isGuest?: boolean;
  createdByName?: string | null;
}

interface BookingDetailModalProps {
  isOpen: boolean;
  data: BookingDetailData | null;
  onClose: () => void;
}

const STATUS_CONFIG: Record<BookingDetailStatus, { label: string; className: string }> = {
  pending: {
    label: 'Pendiente de abono',
    className: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  part_paid: {
    label: 'Abonada',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  confirmed: {
    label: 'Confirmada',
    className: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  canceled: {
    label: 'Cancelada',
    className: 'bg-red-100 text-red-800 border-red-200',
  },
  rejected: {
    label: 'Rechazada',
    className: 'bg-red-100 text-red-800 border-red-200',
  },
};

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value?: string | null;
}) {
  if (!value) return null;

  return (
    <div className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white px-3 py-2.5">
      <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-tint)] text-[var(--color-primary)]">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-[var(--color-text-3)]">
          {label}
        </p>
        <p className="mt-0.5 break-words text-sm font-extrabold text-[var(--color-text)]">
          {value}
        </p>
      </div>
    </div>
  );
}

export function BookingDetailModal({ isOpen, data, onClose }: BookingDetailModalProps) {
  if (!data) return null;

  const status = STATUS_CONFIG[data.status] ?? STATUS_CONFIG.pending;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Detalle de reserva" size="md">
      <div className="space-y-5 p-5 sm:p-6">
        <ComplexImageCover
          src={data.imageUrl}
          alt={data.complexName}
          className="h-36 rounded-[var(--radius-2xl)] border border-[var(--color-border)]"
        >
          <div className="relative z-10 flex h-full flex-col justify-end p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${status.className}`}>
                {status.label}
              </span>
              {data.isGuest && (
                <span className="inline-flex w-fit items-center rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-violet-700">
                  Invitado
                </span>
              )}
            </div>
            <h3 className="mt-2 text-2xl font-extrabold leading-tight text-white">
              {data.fieldName}
            </h3>
            <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-white/75">
              <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
              {data.complexName}
            </p>
            {data.createdByName && (
              <p className="mt-1 text-[11px] font-semibold text-white/55">
                Creada por {data.createdByName}
              </p>
            )}
          </div>
        </ComplexImageCover>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <DetailRow
            icon={<CalendarDays className="h-4 w-4" />}
            label="Fecha"
            value={data.dateLabel}
          />
          <DetailRow
            icon={<Clock3 className="h-4 w-4" />}
            label="Horario"
            value={data.timeRangeLabel}
          />
          <DetailRow
            icon={<User className="h-4 w-4" />}
            label="Jugador"
            value={data.customerName}
          />
          <DetailRow
            icon={<Phone className="h-4 w-4" />}
            label="Teléfono"
            value={data.phone}
          />
          <DetailRow
            icon={<CreditCard className="h-4 w-4" />}
            label="Total"
            value={data.priceLabel}
          />
          <DetailRow
            icon={<Timer className="h-4 w-4" />}
            label="Duración"
            value={data.duration}
          />
          <DetailRow
            icon={<Trophy className="h-4 w-4" />}
            label="Deporte"
            value={data.sportLabel}
          />
        </div>

        <p className="text-center text-[10px] font-semibold text-[var(--color-text-3)]">
          Información de la reserva.
        </p>
      </div>
    </Dialog>
  );
}

export default BookingDetailModal;
