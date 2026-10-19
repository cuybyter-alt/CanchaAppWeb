import React, { useState } from 'react';
import { AlertTriangle, Building2, CalendarDays, CircleDot, Clock3, Loader, Search } from 'lucide-react';
import { Dialog } from '../ui/dialog';
import availabilitySearchService from '../../services/AvailabilitySearchService';
import { notify } from '../../services/toast';
import {
  FIELD_TYPE_LABELS,
  PAYMENT_METHODS,
  extractErrorMessage,
  formatLongDate,
  validateQuickBooking,
} from '../../lib/availability';
import { formatPriceFull } from '../../lib/utils';
import type {
  AvailabilityFieldResult,
  PaymentMethodId,
  QuickBookingFormErrors,
} from '../../types/availability';

interface QuickBookingDialogProps {
  /** Cancha disponible seleccionada; el modal está abierto cuando no es null. */
  target: AvailabilityFieldResult | null;
  /** Fecha consultada (YYYY-MM-DD) */
  date: string;
  onClose: () => void;
  /** Se invoca cuando la reserva fue creada correctamente. */
  onBooked: (target: AvailabilityFieldResult) => void;
  /** El horario fue tomado: el administrador vuelve a la búsqueda conservando los resultados. */
  onBackToSearch: (target: AvailabilityFieldResult) => void;
  /** El horario fue tomado: se relanza la búsqueda para ofrecer alternativas actualizadas. */
  onShowAlternatives: (target: AvailabilityFieldResult) => void;
}

const inputClass =
  'w-full h-10 px-3 rounded-[var(--radius-md)] border-[1.5px] border-[var(--color-border)] bg-white font-semibold text-sm focus:outline-none focus:border-[var(--color-primary)] disabled:opacity-60';

const labelClass = 'block mb-1.5 font-extrabold text-sm text-[var(--color-text-2)]';

const SummaryRow: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({
  icon,
  label,
  value,
}) => (
  <div className="flex items-center gap-2 min-w-0">
    <span className="text-[var(--color-primary-dark)] flex-shrink-0">{icon}</span>
    <div className="min-w-0">
      <p className="text-[10px] font-extrabold tracking-widest text-[var(--color-text-3)] uppercase">
        {label}
      </p>
      <p className="text-sm font-extrabold text-[var(--color-text)] truncate first-letter:uppercase">{value}</p>
    </div>
  </div>
);

const QuickBookingDialog: React.FC<QuickBookingDialogProps> = ({
  target,
  date,
  onClose,
  onBooked,
  onBackToSearch,
  onShowAlternatives,
}) => {
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId | ''>('cash');
  const [errors, setErrors] = useState<QuickBookingFormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);

  const handleClose = () => {
    if (submitting) return;
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!target || !target.slotId || submitting) return;

    const validation = validateQuickBooking({ clientName, clientPhone, paymentMethod });
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    setSubmitting(true);
    try {
      const outcome = await availabilitySearchService.quickBook({
        fieldId: target.fieldId,
        slotId: target.slotId,
        date,
        clientName,
        clientPhone,
        paymentMethod: paymentMethod as PaymentMethodId,
      });

      if (outcome.status === 'slot_unavailable') {
        setConflictMessage(outcome.message);
        return;
      }

      notify.success(
        'Reserva creada',
        `${clientName.trim()} · ${target.fieldName} · ${formatLongDate(date)} a las ${target.timeLabel}`,
      );
      onBooked(target);
    } catch (err) {
      notify.error(extractErrorMessage(err, 'No se pudo crear la reserva. Inténtalo de nuevo.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog isOpen={target !== null} onClose={handleClose} title="Reserva rápida" size="sm">
      {target && (
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4" noValidate>
          <div className="grid grid-cols-2 gap-3 p-4 rounded-[var(--radius-xl)] bg-[var(--color-primary-tint)] border border-[var(--color-border)]">
            <SummaryRow icon={<Building2 className="w-4 h-4" />} label="Complejo" value={target.complexName} />
            <SummaryRow
              icon={<CircleDot className="w-4 h-4" />}
              label="Cancha"
              value={`${target.fieldName} · ${FIELD_TYPE_LABELS[target.fieldType] ?? target.fieldType}`}
            />
            <SummaryRow icon={<CalendarDays className="w-4 h-4" />} label="Fecha" value={formatLongDate(date)} />
            <SummaryRow icon={<Clock3 className="w-4 h-4" />} label="Horario" value={target.timeLabel} />
            <p className="col-span-2 text-sm font-extrabold text-[var(--color-primary-dark)]">
              Tarifa por hora: {target.hourlyRate !== null ? formatPriceFull(target.hourlyRate) : '—'}
            </p>
          </div>

          {conflictMessage ? (
            <div
              id="quick-booking-conflict"
              role="alert"
              className="rounded-[var(--radius-xl)] border border-red-300 bg-red-50 p-4 flex flex-col gap-3"
            >
              <p className="text-sm font-extrabold text-red-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                {conflictMessage}
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  id="quick-booking-back"
                  type="button"
                  onClick={() => onBackToSearch(target)}
                  className="flex-1 px-4 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white text-[var(--color-text-2)] font-extrabold text-sm hover:border-[var(--color-primary)]"
                >
                  Volver a la búsqueda
                </button>
                <button
                  id="quick-booking-alternatives"
                  type="button"
                  onClick={() => onShowAlternatives(target)}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-white font-extrabold text-sm shadow-[var(--shadow-primary)]"
                >
                  <Search className="w-4 h-4" />
                  Ver alternativas
                </button>
              </div>
            </div>
          ) : (
            <>
              <div>
                <label htmlFor="quick-booking-name" className={labelClass}>
                  Nombre del jugador *
                </label>
                <input
                  id="quick-booking-name"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ej: Juan Pérez"
                  className={inputClass}
                  disabled={submitting}
                  autoFocus
                  autoComplete="off"
                />
                {errors.clientName && (
                  <p className="mt-1 text-xs font-bold text-red-600">{errors.clientName}</p>
                )}
              </div>

              <div>
                <label htmlFor="quick-booking-phone" className={labelClass}>
                  Teléfono del jugador *
                </label>
                <input
                  id="quick-booking-phone"
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="Ej: +57 300 123 4567"
                  className={inputClass}
                  disabled={submitting}
                  autoComplete="off"
                />
                {errors.clientPhone && (
                  <p className="mt-1 text-xs font-bold text-red-600">{errors.clientPhone}</p>
                )}
              </div>

              <div>
                <label htmlFor="quick-booking-payment" className={labelClass}>
                  Método de pago *
                </label>
                <select
                  id="quick-booking-payment"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethodId | '')}
                  className={inputClass}
                  disabled={submitting}
                >
                  <option value="">Seleccionar método</option>
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method.id} value={method.id}>
                      {method.label}
                    </option>
                  ))}
                </select>
                {errors.paymentMethod && (
                  <p className="mt-1 text-xs font-bold text-red-600">{errors.paymentMethod}</p>
                )}
              </div>

              <div className="flex justify-end gap-2 mt-1">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={submitting}
                  className="px-4 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white text-[var(--color-text-2)] font-extrabold text-sm hover:border-[var(--color-primary)] disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  id="quick-booking-confirm"
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-white font-extrabold text-sm shadow-[var(--shadow-primary)] hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  {submitting ? (
                    <>
                      <Loader className="w-3.5 h-3.5 animate-spin inline-block mr-1" />
                      Reservando...
                    </>
                  ) : (
                    'Confirmar reserva'
                  )}
                </button>
              </div>
            </>
          )}
        </form>
      )}
    </Dialog>
  );
};

export default QuickBookingDialog;
