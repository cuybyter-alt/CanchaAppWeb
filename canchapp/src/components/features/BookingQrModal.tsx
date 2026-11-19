import { useEffect, useState } from 'react';
import { Loader2, Printer, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Dialog } from '../ui/dialog';
import bookingService from '../../services/BookingService';
import type { BookingConfirmation } from '../../types/notification';

interface BookingQrModalProps {
  bookingId: string | null;
  onClose: () => void;
}

export function BookingQrModal({ bookingId, onClose }: BookingQrModalProps) {
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId) {
      setConfirmation(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    bookingService
      .getBookingConfirmation(bookingId)
      .then((data) => {
        if (!cancelled) setConfirmation(data);
      })
      .catch(() => {
        if (!cancelled) setError('No se pudo cargar el código QR de la reserva.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  return (
    <Dialog isOpen={!!bookingId} onClose={onClose} title="Código QR de la reserva" size="sm">
      <div id="booking-qr-print" className="space-y-5 p-6">
        <div className="text-center">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--color-primary)]">
            Confirmación de acceso
          </p>
          <p className="mt-1 text-sm font-semibold text-[var(--color-text-3)]">
            Presenta o imprime este código para validar la entrada.
          </p>
        </div>

        {loading && (
          <div className="flex justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
          </div>
        )}

        {error && (
          <div className="rounded-[var(--radius-lg)] border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {confirmation && (
          <>
            <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-5 text-center">
              <QRCodeSVG
                value={confirmation.token}
                size={200}
                level="M"
                includeMargin
                className="mx-auto"
              />
            </div>

            <div className="rounded-[var(--radius-xl)] border border-dashed border-[var(--color-primary)] bg-[var(--color-surf2)] p-4 text-center">
              <p className="mb-2 flex items-center justify-center gap-1.5 text-xs font-bold text-[var(--color-text-3)]">
                <QrCode className="h-3.5 w-3.5" />
                Código corto
              </p>
              <p className="font-mono text-2xl font-extrabold tracking-[0.2em] text-[var(--color-text)]">
                {confirmation.short_code}
              </p>
            </div>

            {confirmation.used && (
              <p className="text-center text-xs font-bold text-amber-600">
                Este código ya fue utilizado.
              </p>
            )}
          </>
        )}

        <div className="flex gap-2 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            disabled={!confirmation}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-[var(--color-border)] bg-white px-4 py-2.5 text-sm font-extrabold text-[var(--color-text-2)] transition-colors hover:border-[var(--color-primary)] disabled:opacity-50"
          >
            <Printer className="h-4 w-4" />
            Imprimir
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full bg-[var(--color-primary)] px-4 py-2.5 text-sm font-extrabold text-white shadow-[var(--shadow-primary)]"
          >
            Cerrar
          </button>
        </div>
      </div>
    </Dialog>
  );
}

export default BookingQrModal;
