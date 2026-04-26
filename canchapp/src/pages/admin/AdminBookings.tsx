import React, { useMemo, useState } from 'react';
import {
  Building2,
  CalendarCheck,
  Check,
  CircleDot,
  Clock3,
  Hand,
  Phone,
  QrCode,
  Smartphone,
  X,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { notify } from '../../services/toast';

type BookingFilter = 'all' | 'active' | 'pending' | 'canceled';
type BookingApproval = 'approved' | 'pending';

interface AdminBookingRow {
  id: string;
  customerName: string;
  approval: BookingApproval;
  fieldName: string;
  fieldId: string;
  complexName: string;
  timeSlotId: string;
  timeRange: string;
  phone: string;
  totalLabel: string;
  totalPrice: number;
  status: 'active' | 'canceled';
  isManual?: boolean;
}

interface ManualField {
  id: string;
  name: string;
  complexName: string;
}

interface ManualTimeSlot {
  id: string;
  fieldId: string;
  timeRange: string;
  price: number;
}

const seedBookings: AdminBookingRow[] = [
  {
    id: 'booking-demo-1',
    customerName: 'Juan Pérez',
    approval: 'approved',
    fieldName: 'Cancha Principal',
    fieldId: 'field-main',
    complexName: 'Complejo Deportivo El Estadio',
    timeSlotId: 'slot-14',
    timeRange: '14:00 - 15:00',
    phone: '+57 300 111 2222',
    totalLabel: '$80.000',
    totalPrice: 80000,
    status: 'active',
  },
  {
    id: 'booking-demo-2',
    customerName: 'María González',
    approval: 'approved',
    fieldName: 'Cancha Principal',
    fieldId: 'field-main',
    complexName: 'Complejo Deportivo El Estadio',
    timeSlotId: 'slot-18',
    timeRange: '18:00 - 19:00',
    phone: '+57 300 333 4444',
    totalLabel: '$100.000',
    totalPrice: 100000,
    status: 'active',
  },
  {
    id: 'booking-demo-3',
    customerName: 'Carlos López',
    approval: 'pending',
    fieldName: 'Cancha Secundaria',
    fieldId: 'field-secondary',
    complexName: 'Complejo Deportivo El Estadio',
    timeSlotId: 'slot-16',
    timeRange: '16:00 - 17:00',
    phone: '+57 300 555 6666',
    totalLabel: '$60.000',
    totalPrice: 60000,
    status: 'active',
  },
];

const manualFields: ManualField[] = [
  {
    id: 'field-main',
    name: 'Cancha Principal',
    complexName: 'Complejo Deportivo El Estadio',
  },
  {
    id: 'field-secondary',
    name: 'Cancha Secundaria',
    complexName: 'Complejo Deportivo El Estadio',
  },
];

const manualSlots: ManualTimeSlot[] = [
  { id: 'slot-20', fieldId: 'field-main', timeRange: '20:00 - 21:00', price: 90000 },
  { id: 'slot-21', fieldId: 'field-main', timeRange: '21:00 - 22:00', price: 90000 },
  { id: 'slot-19', fieldId: 'field-secondary', timeRange: '19:00 - 20:00', price: 70000 },
];

const filters: { key: BookingFilter; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'active', label: 'Activas' },
  { key: 'pending', label: 'Pendientes' },
  { key: 'canceled', label: 'Canceladas' },
];

const AdminBookings: React.FC = () => {
  const [filter, setFilter] = useState<BookingFilter>('all');
  const [bookings, setBookings] = useState<AdminBookingRow[]>(seedBookings);
  const [selectedBooking, setSelectedBooking] = useState<AdminBookingRow | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState('');

  const [manualFieldId, setManualFieldId] = useState('');
  const [manualSlotId, setManualSlotId] = useState('');
  const [manualClientName, setManualClientName] = useState('');
  const [manualClientPhone, setManualClientPhone] = useState('');

  const counts = useMemo(() => {
    const active = bookings.filter((booking) => booking.status === 'active').length;
    const pending = bookings.filter(
      (booking) => booking.status === 'active' && booking.approval === 'pending',
    ).length;
    const canceled = bookings.filter((booking) => booking.status === 'canceled').length;
    return {
      all: bookings.length,
      active,
      pending,
      canceled,
    };
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      if (filter === 'all') return true;
      if (filter === 'active') return booking.status === 'active';
      if (filter === 'canceled') return booking.status === 'canceled';
      return booking.status === 'active' && booking.approval === 'pending';
    });
  }, [bookings, filter]);

  const availableSlots = useMemo(
    () => manualSlots.filter((slot) => slot.fieldId === manualFieldId),
    [manualFieldId],
  );

  const formatPrice = (value: number) => `$${value.toLocaleString('es-CO')}`;

  const generateConfirmationCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i += 1) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleManualBooking = (event: React.FormEvent) => {
    event.preventDefault();
    if (!manualFieldId || !manualSlotId || !manualClientName.trim()) {
      notify.error('Completa los campos obligatorios.');
      return;
    }

    const field = manualFields.find((item) => item.id === manualFieldId);
    const slot = manualSlots.find((item) => item.id === manualSlotId);
    if (!field || !slot) {
      notify.error('Cancha u horario no disponible.');
      return;
    }

    const next: AdminBookingRow = {
      id: `manual-${Date.now()}`,
      customerName: manualClientName.trim(),
      approval: 'approved',
      fieldName: field.name,
      fieldId: field.id,
      complexName: field.complexName,
      timeSlotId: slot.id,
      timeRange: slot.timeRange,
      phone: manualClientPhone.trim() || '+57 300 000 0000',
      totalLabel: formatPrice(slot.price),
      totalPrice: slot.price,
      status: 'active',
      isManual: true,
    };

    setBookings((prev) => [next, ...prev]);
    setManualFieldId('');
    setManualSlotId('');
    setManualClientName('');
    setManualClientPhone('');
    setShowManualForm(false);
    notify.success('Reserva manual creada.');
  };

  const approveBooking = (id: string) => {
    setBookings((prev) =>
      prev.map((booking) =>
        booking.id === id && booking.status === 'active' && booking.approval === 'pending'
          ? { ...booking, approval: 'approved' }
          : booking,
      ),
    );
    notify.success('Reserva aprobada.');
  };

  const cancelBooking = (id: string) => {
    setBookings((prev) =>
      prev.map((booking) =>
        booking.id === id && booking.status === 'active'
          ? { ...booking, status: 'canceled' }
          : booking,
      ),
    );
    notify.warning('Reserva cancelada.');
  };

  const openQr = (booking: AdminBookingRow) => {
    setSelectedBooking(booking);
    setConfirmationCode(generateConfirmationCode());
  };

  return (
    <div className="p-5 sm:p-8 space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="text-[10px] font-extrabold tracking-widest text-[var(--color-primary)] uppercase mb-1 flex items-center gap-1.5">
            <CalendarCheck className="w-3 h-3" />
            Reservas
          </p>
          <h1 className="text-4xl font-extrabold text-[var(--color-text)] leading-tight">
            Gestión de <span className="text-[var(--color-primary)]">Reservas</span>
          </h1>
        </div>

        <button
          onClick={() => setShowManualForm((prev) => !prev)}
          className="px-4 py-2.5 rounded-full bg-[var(--color-primary)] text-white font-extrabold text-sm inline-flex items-center gap-2 shadow-[var(--shadow-primary)] hover:-translate-y-0.5 hover:brightness-95 transition-all active:scale-95"
        >
          <Hand className="w-4 h-4" />
          {showManualForm ? 'Cancelar' : 'Reserva Manual'}
        </button>
      </div>

      {showManualForm && (
        <div className="bg-[var(--color-surface)] rounded-[var(--radius-2xl)] border-[1.5px] border-[var(--color-primary)] shadow-[var(--shadow-primary)] p-5 animate-fade-in">
          <p className="font-extrabold text-[var(--color-text)] text-lg mb-1">
            Registrar Reserva Presencial
          </p>
          <p className="text-sm text-[var(--color-text-3)] mb-4">
            Crea una reserva manual para clientes que llegan directo al complejo.
          </p>

          <form
            onSubmit={handleManualBooking}
            className="grid grid-cols-1 md:grid-cols-2 gap-3"
          >
            <div>
              <label className="block mb-1.5 font-extrabold text-sm text-[var(--color-text-2)]">
                Cancha *
              </label>
              <select
                value={manualFieldId}
                onChange={(event) => {
                  setManualFieldId(event.target.value);
                  setManualSlotId('');
                }}
                className="w-full h-10 px-3 rounded-[var(--radius-md)] border-[1.5px] border-[var(--color-border)] bg-white font-semibold text-sm"
                required
              >
                <option value="">Seleccionar cancha</option>
                {manualFields.map((field) => (
                  <option key={field.id} value={field.id}>
                    {field.name} ({field.complexName})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-1.5 font-extrabold text-sm text-[var(--color-text-2)]">
                Horario disponible *
              </label>
              <select
                value={manualSlotId}
                onChange={(event) => setManualSlotId(event.target.value)}
                className="w-full h-10 px-3 rounded-[var(--radius-md)] border-[1.5px] border-[var(--color-border)] bg-white font-semibold text-sm disabled:opacity-60"
                disabled={!manualFieldId}
                required
              >
                <option value="">
                  {manualFieldId
                    ? availableSlots.length > 0
                      ? 'Seleccionar horario'
                      : 'Sin horarios disponibles'
                    : 'Selecciona cancha primero'}
                </option>
                {availableSlots.map((slot) => (
                  <option key={slot.id} value={slot.id}>
                    {slot.timeRange} - {formatPrice(slot.price)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-1.5 font-extrabold text-sm text-[var(--color-text-2)]">
                Nombre del cliente *
              </label>
              <input
                value={manualClientName}
                onChange={(event) => setManualClientName(event.target.value)}
                placeholder="Ej: Juan Pérez"
                className="w-full h-10 px-3 rounded-[var(--radius-md)] border-[1.5px] border-[var(--color-border)] bg-white font-semibold text-sm"
                required
              />
            </div>

            <div>
              <label className="block mb-1.5 font-extrabold text-sm text-[var(--color-text-2)]">
                Teléfono del cliente
              </label>
              <input
                value={manualClientPhone}
                onChange={(event) => setManualClientPhone(event.target.value)}
                placeholder="Ej: +57 300 123 4567"
                className="w-full h-10 px-3 rounded-[var(--radius-md)] border-[1.5px] border-[var(--color-border)] bg-white font-semibold text-sm"
              />
            </div>

            <div className="md:col-span-2 flex justify-end gap-2 mt-1">
              <button
                type="button"
                onClick={() => setShowManualForm(false)}
                className="px-4 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white text-[var(--color-text-2)] font-extrabold text-sm hover:border-[var(--color-primary)]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-white font-extrabold text-sm shadow-[var(--shadow-primary)] hover:-translate-y-0.5 transition-all"
              >
                Confirmar Reserva
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {filters.map((item) => (
          <button
            key={item.key}
            onClick={() => setFilter(item.key)}
            className={`px-5 py-2 rounded-full text-base font-extrabold border transition-all ${
              filter === item.key
                ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-[var(--shadow-primary)]'
                : 'bg-[var(--color-surf2)] text-[var(--color-text-2)] border-[var(--color-border)] hover:border-[var(--color-primary)]'
            }`}
          >
            {item.label}
            <span className="ml-1 opacity-75">({counts[item.key]})</span>
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredBookings.map((booking) => (
          <article
            key={booking.id}
            className="bg-[var(--color-surface)] border-[1.5px] border-[var(--color-border)] rounded-[var(--radius-2xl)] p-3.5 md:p-4 shadow-[var(--shadow-md)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--color-primary)] hover:shadow-[var(--shadow-primary)]"
          >
            <div className="flex flex-col xl:flex-row xl:items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center flex-shrink-0 shadow-[var(--shadow-primary)]">
                <Smartphone className="w-4 h-4" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h2 className="text-lg md:text-xl font-extrabold text-[var(--color-text)] leading-none">
                    {booking.customerName}
                  </h2>
                  {booking.approval === 'approved' ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[var(--color-primary)] text-white uppercase">
                      Aprobada
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[var(--color-accent)] text-white uppercase">
                      Pendiente
                    </span>
                  )}
                  {booking.isManual && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[var(--color-score)] text-[var(--color-text)] uppercase">
                      Presencial
                    </span>
                  )}
                  {booking.status === 'canceled' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[var(--color-accent)] text-white uppercase">
                      Cancelada
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm md:text-base text-[var(--color-text-2)] font-bold">
                  <span className="inline-flex items-center gap-1.5">
                    <CircleDot className="w-4 h-4 text-[var(--color-primary)]" />
                    {booking.fieldName}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[var(--color-text-3)]">
                    <Building2 className="w-4 h-4" />
                    {booking.complexName}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock3 className="w-4 h-4 text-[var(--color-primary)]" />
                    {booking.timeRange}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[var(--color-text-3)]">
                    <Phone className="w-4 h-4" />
                    {booking.phone}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 xl:gap-2.5 flex-wrap xl:flex-nowrap">
                <p className="text-2xl md:text-3xl leading-none font-extrabold text-[var(--color-primary)] mr-1">
                  {booking.totalLabel}
                </p>

                <button
                  onClick={() => approveBooking(booking.id)}
                  disabled={booking.status === 'canceled' || booking.approval === 'approved'}
                  className="px-3 py-1.5 rounded-full bg-[var(--color-primary)] text-white text-sm font-extrabold inline-flex items-center gap-1.5 shadow-[var(--shadow-primary)] transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-55 disabled:cursor-not-allowed"
                >
                  <Check className="w-3.5 h-3.5" />
                  Aprobar
                </button>

                <button
                  onClick={() => openQr(booking)}
                  disabled={booking.status === 'canceled'}
                  className="px-3 py-1.5 rounded-full border border-[var(--color-border)] text-[var(--color-text-2)] bg-white text-sm font-extrabold inline-flex items-center gap-1.5 hover:border-[var(--color-primary)] hover:-translate-y-0.5 transition-all active:scale-95"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  Ver QR
                </button>

                <button
                  onClick={() => cancelBooking(booking.id)}
                  disabled={booking.status === 'canceled'}
                  className="px-3 py-1.5 rounded-full bg-[var(--color-accent)] text-white text-sm font-extrabold inline-flex items-center gap-1.5 shadow-[var(--shadow-md)] hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-55 disabled:cursor-not-allowed"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancelar
                </button>
              </div>
            </div>
          </article>
        ))}

        {filteredBookings.length === 0 && (
          <div className="bg-[var(--color-surface)] border-[1.5px] border-dashed border-[var(--color-border)] rounded-[var(--radius-2xl)] p-10 text-center">
            <div className="w-14 h-14 rounded-full bg-[var(--color-primary-tint)] flex items-center justify-center mx-auto mb-3">
              <CalendarCheck className="w-7 h-7 text-[var(--color-primary)]" />
            </div>
            <p className="font-extrabold text-[var(--color-text)] text-lg">Sin reservas</p>
            <p className="text-sm text-[var(--color-text-3)] mt-1">
              No hay reservas para el filtro seleccionado.
            </p>
          </div>
        )}
      </div>

      {selectedBooking && (
        <div
          className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px] flex items-center justify-center p-4"
          onClick={() => setSelectedBooking(null)}
        >
          <div
            className="w-full max-w-sm bg-[var(--color-surface)] rounded-[var(--radius-2xl)] p-5 border border-[var(--color-border)] shadow-[var(--shadow-primary)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="font-extrabold text-[var(--color-text)]">Verificar Reserva</p>
              <button
                onClick={() => setSelectedBooking(null)}
                className="w-8 h-8 rounded-full bg-[var(--color-surf2)] inline-flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-[var(--color-text-3)] mb-3 text-center font-semibold">
              {selectedBooking.customerName}
            </p>

            <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] p-5 text-center mb-3 bg-white">
              <QRCodeSVG
                value={`CANCHAPP:${selectedBooking.id}`}
                size={180}
                level="H"
                includeMargin={false}
                className="mx-auto"
              />
            </div>

            <div className="rounded-[var(--radius-xl)] border border-dashed border-[var(--color-primary)] p-4 text-center mb-3 bg-[var(--color-surf2)]">
              <p className="text-xs text-[var(--color-text-3)] font-bold mb-2">Código de Confirmación</p>
              <p className="font-extrabold text-lg tracking-widest mt-3 text-[var(--color-text)]">
                {confirmationCode}
              </p>
            </div>

            <p className="text-sm text-[var(--color-text-2)] font-semibold text-center">
              {selectedBooking.fieldName} • {selectedBooking.timeRange}
            </p>

            <button
              onClick={() => setSelectedBooking(null)}
              className="mt-4 w-full px-4 py-2.5 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-white font-extrabold text-sm shadow-[var(--shadow-primary)]"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBookings;
