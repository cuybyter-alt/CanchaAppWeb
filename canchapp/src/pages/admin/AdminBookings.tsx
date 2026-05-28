import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Building2,
  CalendarCheck,
  Check,
  CheckCircle2,
  CircleDot,
  Clock3,
  Hand,
  Loader,
  Phone,
  QrCode,
  Smartphone,
  X,
} from 'lucide-react';
import { tokenStorage } from '../../services/AuthService';
import bookingService, { type AdminBookingRow } from '../../services/BookingService';
import ComplexesService from '../../services/ComplexesService';
import schedulingService from '../../services/SchedulingService';
import { notify } from '../../services/toast';
import type { TimeSlotData } from '../../types/field';

type BookingFilter = 'all' | 'active' | 'pending' | 'canceled' | 'confirmed';

interface OwnedComplex {
  id: string;
  name: string;
}

interface AdminFieldOption {
  id: string;
  name: string;
  complexId: string;
  complexName: string;
}

interface BookingBadge {
  label: string;
  className: string;
}

const filters: { key: BookingFilter; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'active', label: 'Activas' },
  { key: 'pending', label: 'Pendientes' },
  { key: 'canceled', label: 'Canceladas' },
  { key: 'confirmed', label: 'Confirmadas' },
];

const AdminBookings: React.FC = () => {
  const userId = tokenStorage.getUser()?.user_id ?? null;

  const [filter, setFilter] = useState<BookingFilter>('all');
  const [bookings, setBookings] = useState<AdminBookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmingBooking, setConfirmingBooking] = useState<AdminBookingRow | null>(null);
  const [confirmInput, setConfirmInput] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);

  const [complexes, setComplexes] = useState<OwnedComplex[]>([]);
  const [fields, setFields] = useState<AdminFieldOption[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlotData[]>([]);

  const [manualFieldId, setManualFieldId] = useState('');
  const [manualSlotId, setManualSlotId] = useState('');
  const [manualClientName, setManualClientName] = useState('');
  const [manualClientPhone, setManualClientPhone] = useState('');
  const [submittingManual, setSubmittingManual] = useState(false);

  const formatPrice = (value: number) => `$${value.toLocaleString('es-CO')}`;

  const formatSlotLabel = (slot: TimeSlotData) => {
    const time = `${slot.time} ${slot.period}`;
    return `${time} - ${formatPrice(slot.price)}${slot.status !== 'available' ? ' (ocupado)' : ''}`;
  };

  const getBookingBadge = (booking: AdminBookingRow): BookingBadge => {
    if (booking.status === 'confirmed') {
      return {
        label: 'Confirmada',
        className: 'bg-emerald-600 text-white',
      };
    }

    if (booking.status === 'canceled') {
      return {
        label: 'Cancelada',
        className: 'bg-red-200 text-red-900',
      };
    }

    if (booking.approval === 'approved') {
      return {
        label: 'Aprobada',
        className: 'bg-[var(--color-primary)] text-white',
      };
    }

    return {
      label: 'Pendiente',
      className: 'bg-[var(--color-accent)] text-white',
    };
  };

  const reloadBookingsForComplexes = async (complexList: OwnedComplex[]) => {
    if (complexList.length === 0) {
      setBookings([]);
      return;
    }

    const settled = await Promise.allSettled(
      complexList.map((complex) => bookingService.getComplexBookings(complex.id)),
    );

    const merged = settled.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));
    const unique = Array.from(new Map(merged.map((booking) => [booking.id, booking])).values());

    unique.sort((left, right) => {
      const leftTime = left.startIso ? new Date(left.startIso).getTime() : 0;
      const rightTime = right.startIso ? new Date(right.startIso).getTime() : 0;
      return rightTime - leftTime;
    });

    setBookings(unique);

    if (settled.some((result) => result.status === 'rejected')) {
      notify.warning('Algunas reservas no pudieron cargarse.');
    }
  };

  const reloadFieldsForComplexes = async (complexList: OwnedComplex[]) => {
    if (complexList.length === 0) {
      setFields([]);
      return;
    }

    const settled = await Promise.allSettled(
      complexList.map(async (complex) => {
        const complexFields = await ComplexesService.getComplexFields(complex.id);
        return complexFields.map((field) => ({
          id: field.fieldId,
          name: field.name,
          complexId: complex.id,
          complexName: complex.name,
        }));
      }),
    );

    const merged = settled.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));
    const unique = Array.from(new Map(merged.map((field) => [field.id, field])).values());
    setFields(unique);

    if (settled.some((result) => result.status === 'rejected')) {
      notify.warning('Algunas canchas no pudieron cargarse.');
    }
  };

  const loadInitialData = async () => {
    if (!userId) {
      setLoading(false);
      setError('Debes iniciar sesión para ver tus complejos.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const complexItems = await ComplexesService.getComplexes({ ownerId: userId, pageSize: 50 });
      const owned = complexItems.map((complex) => ({ id: complex.id, name: complex.name }));
      setComplexes(owned);

      if (owned.length === 0) {
        setBookings([]);
        setFields([]);
        notify.warning('No tienes complejos asociados.');
        return;
      }

      await Promise.all([reloadBookingsForComplexes(owned), reloadFieldsForComplexes(owned)]);
    } catch (err) {
      const msg = (err as any)?.message || 'Error cargando reservas';
      setError(msg);
      notify.error(msg);
      console.error('Error loading admin bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadInitialData();
  }, [userId]);

  useEffect(() => {
    if (!manualFieldId) {
      setTimeSlots([]);
      setManualSlotId('');
      return;
    }

    let cancelled = false;

    const loadTimeSlots = async () => {
      try {
        const dateISO = new Date().toISOString().slice(0, 10);
        const slots = await schedulingService.getFieldTimeSlots(manualFieldId, dateISO);
        if (cancelled) return;
        const available = slots.filter((slot) => slot.status === 'available');
        setTimeSlots(available);
        setManualSlotId((current) => (available.some((slot) => slot.id === current) ? current : ''));
      } catch (err) {
        if (cancelled) return;
        setTimeSlots([]);
        setManualSlotId('');
        const msg = (err as any)?.message || 'No se pudieron cargar los horarios disponibles.';
        notify.error(msg);
      }
    };

    void loadTimeSlots();

    return () => {
      cancelled = true;
    };
  }, [manualFieldId]);

  const counts = useMemo(() => {
    const active = bookings.filter((booking) => booking.status === 'active').length;
    const pending = bookings.filter((booking) => booking.status === 'active' && booking.approval === 'pending').length;
    const canceled = bookings.filter((booking) => booking.status === 'canceled').length;
    const confirmed = bookings.filter((booking) => booking.status === 'confirmed').length;
    return {
      all: bookings.length,
      active,
      pending,
      canceled,
      confirmed,
    };
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      if (filter === 'all') return true;
      if (filter === 'active') return booking.status === 'active';
      if (filter === 'canceled') return booking.status === 'canceled';
      if (filter === 'confirmed') return booking.status === 'confirmed';
      return booking.status === 'active' && booking.approval === 'pending';
    });
  }, [bookings, filter]);

  const availableSlots = useMemo(() => timeSlots, [timeSlots]);

  const handleManualBooking = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!manualFieldId || !manualSlotId || !manualClientName.trim()) {
      notify.error('Completa los campos obligatorios.');
      return;
    }

    setSubmittingManual(true);
    try {
      await bookingService.createAdminBooking(
        manualSlotId,
        manualClientName.trim(),
        manualClientPhone.trim() || undefined,
      );

      await reloadBookingsForComplexes(complexes);

      setManualFieldId('');
      setManualSlotId('');
      setManualClientName('');
      setManualClientPhone('');
      setShowManualForm(false);
      notify.success('Reserva manual creada exitosamente.');
    } catch (err) {
      const msg = (err as any)?.message || 'Error creando reserva manual';
      notify.error(msg);
      console.error('Error creating manual booking:', err);
    } finally {
      setSubmittingManual(false);
    }
  };

  const approveBooking = async (id: string) => {
    try {
      await bookingService.updateBookingStatus(id, 'accepted');
      await reloadBookingsForComplexes(complexes);
      notify.success('Reserva aprobada.');
    } catch (err) {
      const msg = (err as any)?.message || 'Error aprobando reserva';
      notify.error(msg);
      console.error('Error approving booking:', err);
    }
  };

  const cancelBooking = async (id: string) => {
    try {
      await bookingService.updateBookingStatus(id, 'rejected');
      await reloadBookingsForComplexes(complexes);
      notify.warning('Reserva cancelada.');
    } catch (err) {
      const msg = (err as any)?.message || 'Error cancelando reserva';
      notify.error(msg);
      console.error('Error canceling booking:', err);
    }
  };

  const openConfirm = (booking: AdminBookingRow) => {
    setConfirmingBooking(booking);
    setConfirmInput('');
  };

  const handleConfirmCheckin = async () => {
    if (!confirmingBooking || !confirmInput.trim()) return;
    setConfirming(true);
    try {
      const code = confirmInput.trim();
      const isToken = code.length > 10;
      await bookingService.confirmBookingByToken(
        isToken ? code : undefined,
        isToken ? undefined : code,
      );
      await reloadBookingsForComplexes(complexes);
      notify.success('¡Check-in confirmado!');
      setConfirmingBooking(null);
      setConfirmInput('');
    } catch (err) {
      notify.error((err as any)?.message || 'Error al confirmar la reserva');
    } finally {
      setConfirming(false);
    }
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
          <p className="mt-2 text-sm font-semibold text-[var(--color-text-3)]">
            Mostrando reservas de tus complejos: {complexes.length}
          </p>
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
          <p className="font-extrabold text-[var(--color-text)] text-lg mb-1">Registrar Reserva Presencial</p>
          <p className="text-sm text-[var(--color-text-3)] mb-4">
            Crea una reserva manual para una cancha que pertenezca a uno de tus complejos.
          </p>

          <form onSubmit={handleManualBooking} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block mb-1.5 font-extrabold text-sm text-[var(--color-text-2)]">
                Cancha *
              </label>
              <select
                value={manualFieldId}
                onChange={(e) => {
                  setManualFieldId(e.target.value);
                  setManualSlotId('');
                }}
                className="w-full h-10 px-3 rounded-[var(--radius-md)] border-[1.5px] border-[var(--color-border)] bg-white font-semibold text-sm"
                required
                disabled={fields.length === 0}
              >
                <option value="">
                  {fields.length === 0 ? 'Sin canchas disponibles' : 'Seleccionar cancha'}
                </option>
                {fields.map((field) => (
                  <option key={field.id} value={field.id}>
                    {field.complexName} · {field.name}
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
                onChange={(e) => setManualSlotId(e.target.value)}
                className="w-full h-10 px-3 rounded-[var(--radius-md)] border-[1.5px] border-[var(--color-border)] bg-white font-semibold text-sm disabled:opacity-60"
                disabled={!manualFieldId || availableSlots.length === 0}
                required
              >
                <option value="">
                  {!manualFieldId
                    ? 'Selecciona cancha primero'
                    : availableSlots.length > 0
                      ? 'Seleccionar horario'
                      : 'Sin horarios disponibles'}
                </option>
                {availableSlots.map((slot) => (
                  <option key={slot.id} value={slot.id}>
                    {formatSlotLabel(slot)}
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
                onChange={(e) => setManualClientName(e.target.value)}
                placeholder="Ej: Juan Pérez"
                className="w-full h-10 px-3 rounded-[var(--radius-md)] border-[1.5px] border-[var(--color-border)] bg-white font-semibold text-sm"
                required
                disabled={submittingManual}
              />
            </div>

            <div>
              <label className="block mb-1.5 font-extrabold text-sm text-[var(--color-text-2)]">
                Teléfono del cliente
              </label>
              <input
                value={manualClientPhone}
                onChange={(e) => setManualClientPhone(e.target.value)}
                placeholder="Ej: +57 300 123 4567"
                className="w-full h-10 px-3 rounded-[var(--radius-md)] border-[1.5px] border-[var(--color-border)] bg-white font-semibold text-sm"
                disabled={submittingManual}
              />
            </div>

            <div className="md:col-span-2 flex justify-end gap-2 mt-1">
              <button
                type="button"
                onClick={() => setShowManualForm(false)}
                className="px-4 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white text-[var(--color-text-2)] font-extrabold text-sm hover:border-[var(--color-primary)]"
                disabled={submittingManual}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-white font-extrabold text-sm shadow-[var(--shadow-primary)] hover:-translate-y-0.5 transition-all disabled:opacity-60"
                disabled={submittingManual}
              >
                {submittingManual ? (
                  <>
                    <Loader className="w-3.5 h-3.5 animate-spin inline-block mr-1" />
                    Creando...
                  </>
                ) : (
                  'Confirmar Reserva'
                )}
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

      {loading && (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader className="w-8 h-8 text-[var(--color-primary)] animate-spin mb-3" />
          <p className="text-[var(--color-text-2)] font-semibold">Cargando reservas...</p>
        </div>
      )}

      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-[var(--radius-2xl)] p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-extrabold text-red-900">Error</p>
            <p className="text-sm text-red-800 mt-1">{error}</p>
          </div>
        </div>
      )}

      {!loading && !error && (
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
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${getBookingBadge(booking).className}`}
                    >
                      {getBookingBadge(booking).label}
                    </span>
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
                    disabled={booking.status === 'canceled' || booking.status === 'confirmed' || booking.approval === 'approved'}
                    className="px-3 py-1.5 rounded-full bg-[var(--color-primary)] text-white text-sm font-extrabold inline-flex items-center gap-1.5 shadow-[var(--shadow-primary)] transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-55 disabled:cursor-not-allowed"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Aprobar
                  </button>

                  {booking.status === 'confirmed' ? (
                    <span className="px-3 py-1.5 rounded-full bg-emerald-600 text-white text-sm font-extrabold inline-flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Confirmada
                    </span>
                  ) : (
                    <button
                      onClick={() => openConfirm(booking)}
                      disabled={booking.status === 'canceled'}
                      className="px-3 py-1.5 rounded-full border border-[var(--color-border)] text-[var(--color-text-2)] bg-white text-sm font-extrabold inline-flex items-center gap-1.5 hover:border-emerald-500 hover:text-emerald-700 hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-55 disabled:cursor-not-allowed"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      Confirmar
                    </button>
                  )}

                  <button
                    onClick={() => cancelBooking(booking.id)}
                    disabled={booking.status === 'canceled'}
                    className="px-3 py-1.5 rounded-full bg-red-600 text-white text-sm font-extrabold inline-flex items-center gap-1.5 shadow-[var(--shadow-md)] hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-55 disabled:cursor-not-allowed"
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
                No hay reservas para los complejos de tu cuenta.
              </p>
            </div>
          )}
        </div>
      )}

      {confirmingBooking && (
        <div
          className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px] flex items-center justify-center p-4"
          onClick={() => !confirming && setConfirmingBooking(null)}
        >
          <div
            className="w-full max-w-sm bg-[var(--color-surface)] rounded-[var(--radius-2xl)] p-5 border border-[var(--color-border)] shadow-[var(--shadow-primary)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-extrabold text-[var(--color-text)]">Confirmar Check-in</p>
                <p className="text-xs text-[var(--color-text-3)] font-semibold mt-0.5">
                  {confirmingBooking.customerName} · {confirmingBooking.fieldName}
                </p>
              </div>
              <button
                onClick={() => !confirming && setConfirmingBooking(null)}
                className="w-8 h-8 rounded-full bg-[var(--color-surf2)] inline-flex items-center justify-center hover:bg-[var(--color-border)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mb-4 p-3 bg-[var(--color-surf2)] rounded-[var(--radius-lg)] text-xs text-[var(--color-text-3)] font-semibold space-y-1">
              <p>Pide al cliente que muestre su código y:</p>
              <p>• Ingresa el <strong className="text-[var(--color-text)]">código corto</strong> (ej: <code>AB3XPQ</code>)</p>
              <p>• O pega el token completo si usas un lector de QR</p>
            </div>

            <div className="mb-4">
              <label className="block mb-1.5 font-extrabold text-sm text-[var(--color-text-2)]">
                Código del cliente *
              </label>
              <input
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value.toUpperCase())}
                placeholder="Ej: AB3XPQ"
                className="w-full h-10 px-3 rounded-[var(--radius-md)] border-[1.5px] border-[var(--color-border)] bg-white font-mono font-extrabold text-sm tracking-widest text-center focus:outline-none focus:border-emerald-500"
                autoFocus
                disabled={confirming}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setConfirmingBooking(null)}
                disabled={confirming}
                className="flex-1 px-4 py-2.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white text-[var(--color-text-2)] font-extrabold text-sm hover:border-[var(--color-primary)] transition-colors disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmCheckin}
                disabled={confirming || !confirmInput.trim()}
                className="flex-1 px-4 py-2.5 rounded-[var(--radius-md)] bg-emerald-600 text-white font-extrabold text-sm shadow-sm hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                {confirming ? (
                  <>
                    <Loader className="w-3.5 h-3.5 animate-spin" />
                    Confirmando...
                  </>
                ) : (
                  'Confirmar Check-in'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBookings;