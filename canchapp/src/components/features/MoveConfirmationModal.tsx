import React from 'react';
import { X, ArrowRight, Loader2 } from 'lucide-react';
import type { DraggedBooking, GridSlot, GridField } from '../../types/grid';

interface MoveConfirmationModalProps {
  draggedBooking: DraggedBooking;
  targetSlot: GridSlot;
  targetField: GridField;
  sourceField: GridField;
  isMoving: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  formatTime: (utcISO: string) => string;
}

export const MoveConfirmationModal: React.FC<MoveConfirmationModalProps> = ({
  draggedBooking,
  targetSlot,
  targetField,
  sourceField,
  isMoving,
  onConfirm,
  onCancel,
  formatTime,
}) => {
  const priceDifference = targetSlot.price - draggedBooking.price;
  const isCredit = priceDifference < 0;
  const isPending = priceDifference > 0;
  const balanceLabel = isCredit
    ? 'Saldo a favor del cliente'
    : isPending
    ? 'Saldo pendiente por pagar'
    : 'Sin cambio de precio';
  const balanceColor = isCredit
    ? 'text-green-600'
    : isPending
    ? 'text-red-600'
    : 'text-gray-600';

  return (
    <div
      className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px] flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md bg-[var(--color-surface)] rounded-[var(--radius-2xl)] p-5 border border-[var(--color-border)] shadow-[var(--shadow-2xl)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-extrabold text-[var(--color-text)] text-lg">
              Confirmar movimiento de reserva
            </p>
            <p className="text-xs text-[var(--color-text-3)] font-semibold mt-0.5">
              Jugador: {draggedBooking.user_name}
            </p>
          </div>
          <button
            onClick={onCancel}
            disabled={isMoving}
            className="w-8 h-8 rounded-full bg-[var(--color-surf2)] inline-flex items-center justify-center hover:bg-[var(--color-border)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 p-3 rounded-[var(--radius-lg)] bg-[var(--color-surf2)] border border-[var(--color-border)]">
            <p className="text-[10px] font-extrabold text-[var(--color-text-3)] uppercase tracking-wide mb-1">
              Origen
            </p>
            <p className="font-extrabold text-[var(--color-text)] text-sm">
              {sourceField.field_name}
            </p>
            <p className="text-xs text-[var(--color-text-2)] font-bold">
              {formatTime(draggedBooking.start_datetime)}
            </p>
            <p className="text-sm font-extrabold text-[var(--color-primary)] mt-1">
              ${draggedBooking.price.toLocaleString('es-CO')}
            </p>
          </div>

          <ArrowRight className="w-5 h-5 text-[var(--color-text-3)] flex-shrink-0" />

          <div className="flex-1 p-3 rounded-[var(--radius-lg)] bg-[var(--color-primary-tint)] border border-[var(--color-primary)]/20">
            <p className="text-[10px] font-extrabold text-[var(--color-primary)] uppercase tracking-wide mb-1">
              Destino
            </p>
            <p className="font-extrabold text-[var(--color-text)] text-sm">
              {targetField.field_name}
            </p>
            <p className="text-xs text-[var(--color-text-2)] font-bold">
              {formatTime(targetSlot.start_datetime)}
            </p>
            <p className="text-sm font-extrabold text-[var(--color-primary)] mt-1">
              ${targetSlot.price.toLocaleString('es-CO')}
            </p>
          </div>
        </div>

        <div className="p-3 rounded-[var(--radius-lg)] bg-[var(--color-surf2)] mb-4">
          <p className="text-xs font-bold text-[var(--color-text-3)] mb-1">
            Diferencia de precio:
          </p>
          <p className={`text-lg font-extrabold ${balanceColor}`}>
            {priceDifference >= 0 ? '+' : ''}${priceDifference.toLocaleString('es-CO')} COP
          </p>
          <p className={`text-xs font-bold ${balanceColor} mt-0.5`}>
            {balanceLabel}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isMoving}
            className="flex-1 py-2.5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white text-[var(--color-text-2)] font-extrabold text-sm hover:bg-[var(--color-surf2)] transition-colors disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isMoving}
            className="flex-1 py-2.5 rounded-[var(--radius-lg)] bg-[var(--color-primary)] text-white font-extrabold text-sm shadow-[var(--shadow-primary)] hover:bg-[var(--color-primary-dark)] transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isMoving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Moviendo...
              </>
            ) : (
              'Confirmar movimiento'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};