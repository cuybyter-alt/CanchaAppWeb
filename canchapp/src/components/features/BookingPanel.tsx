import React, { useEffect, useRef, useState } from 'react';
import { Calendar, Clock, CreditCard, MapPin, Star, X, Zap, CheckCircle2, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import type { Booking, Field } from '../../types/field';
import type { BookingConfirmation } from '../../types/notification';
import { MiniFieldSVG } from '../ui/svg-assets';
import { formatPrice, formatPriceFull } from '../../lib/utils';
import authService from '../../services/AuthService';
import notify from '../../services/toast';
import schedulingService, { localTodayISO } from '../../services/SchedulingService';
import bookingService from '../../services/BookingService';
import type { ApiError } from '../../services/ApiClient';

interface BookingPanelProps {
  field: Field | null;
  onBookingCreated?: (booking: Booking) => void;
  onSlotBooked?: (fieldId: string, slotId: string) => void;
  /** Slot id to pre-select (from ComplexFieldsDialog) */
  preselectedSlotId?: string;
  /** ISO date string to pre-select (from ComplexFieldsDialog) */
  preselectedDate?: string;
  /** Called when the user dismisses the panel */
  onClose?: () => void;
}

const DAY_NAMES = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'];

function generateDates(count = 7) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const iso = d.toLocaleDateString('en-CA');
    return {
      id: iso,
      name: DAY_NAMES[d.getDay()],
      day: d.getDate(),
      isToday: i === 0,
    };
  });
}

const dates = generateDates();

function isSlotPast(slot: import('../../types/field').TimeSlotData, isToday: boolean): boolean {
  if (!isToday) return false;
  if (slot.blockReason === 'past') return true;
  if (slot.startIso) return new Date(slot.startIso).getTime() <= Date.now();
  if (slot.time && slot.period) {
    const parts = slot.time.split(':');
    let h = parseInt(parts[0], 10);
    const m = parseInt(parts[1] || '0', 10);
    if (slot.period === 'PM' && h < 12) h += 12;
    if (slot.period === 'AM' && h === 12) h = 0;
    const now = new Date();
    return (h * 60 + m) <= (now.getHours() * 60 + now.getMinutes());
  }
  return false;
}

const sportIcons: Record<string, string> = {
  futbol5:    'fa-futbol',
  futbol7:    'fa-futbol',
  microfutbol:'fa-circle-dot',
  futbol11:   'fa-futbol',
};

const sportNames: Record<string, string> = {
  futbol5:    'Fútbol',
  futbol7:    'Fútbol',
  microfutbol:'Microfútbol',
  futbol11:   'Fútbol',
};

export const BookingPanel: React.FC<BookingPanelProps> = ({ field, onBookingCreated, onSlotBooked, preselectedSlotId, preselectedDate, onClose }) => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(dates[0].id);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(
    field?.availability.find(s => s.status !== 'taken')?.id ?? null
  );
  const [slots, setSlots] = useState(field?.availability ?? []);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [justPreselected, setJustPreselected] = useState(false);
  // Tracks whether the next slot-load should honour preselectedSlotId
  const applyPreselection = useRef(false);

  // Deposit flow states
  type BookingStep = 'select' | 'deposit' | 'success';
  const [bookingStep, setBookingStep] = useState<BookingStep>('select');
  const [pendingBookingId, setPendingBookingId] = useState<string | null>(null);
  const [isPayingDeposit, setIsPayingDeposit] = useState(false);
  const [qrData, setQrData] = useState<BookingConfirmation | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [createdBooking, setCreatedBooking] = useState<Booking | null>(null);

  const getDateISO = (dateId: string): string => dateId;

  const isMockFieldId = (fieldId: string): boolean => /^field-\d+/i.test(fieldId);

  const todayISO = localTodayISO();
  const isToday = selectedDate === todayISO;

  useEffect(() => {
    // Sync date when preselection changes (new slot chosen from dialog)
    if (preselectedDate && dates.some(d => d.id === preselectedDate)) {
      setSelectedDate(preselectedDate);
    }
    if (preselectedSlotId) {
      applyPreselection.current = true;
    }
  }, [preselectedSlotId, preselectedDate]);

  // Auto-clear the just-preselected animation flag after 3.5 s
  useEffect(() => {
    if (!justPreselected) return;
    const t = setTimeout(() => setJustPreselected(false), 3500);
    return () => clearTimeout(t);
  }, [justPreselected]);

  useEffect(() => {
    const avail = field?.availability ?? [];
    setSlots(avail);
    // Immediately honour preselection when the slot is already in the field's availability.
    // The synthetic field built in Home carries allSlots from the dialog, so this always hits
    // and avoids the race between the [field] reset and the async API call.
    if (preselectedSlotId) {
      const target = avail.find(s => s.id === preselectedSlotId && s.status !== 'taken');
      if (target) {
        setSelectedSlot(target.id);
        setJustPreselected(true);
        applyPreselection.current = false;
        return;
      }
    }
    setSelectedSlot(avail.find(s => s.status !== 'taken')?.id ?? null);
  }, [field, preselectedSlotId]);

  useEffect(() => {
    let mounted = true;

    const loadTimeSlots = async () => {
      if (!field) return;

      if (isMockFieldId(field.id)) {
        setSlots(field.availability ?? []);
        setSelectedSlot(field.availability.find((slot) => slot.status !== 'taken')?.id ?? null);
        return;
      }

      setIsLoadingSlots(true);
      try {
        const dateISO = getDateISO(selectedDate);
        const apiSlots = await schedulingService.getFieldTimeSlots(field.id, dateISO);
        if (!mounted) return;

        if (apiSlots.length > 0) {
          setSlots(apiSlots);
          const todayCheck = getDateISO(selectedDate) === dates[0].id;
          const isAvailable = (s: import('../../types/field').TimeSlotData) =>
            s.status !== 'taken' && !isSlotPast(s, todayCheck);
          // Only consume the flag when the slot is actually found
          // (prevents eating it on a wrong-date call before selectedDate state update settles)
          let preselectedTarget: string | null = null;
          if (applyPreselection.current && preselectedSlotId) {
            const target = apiSlots.find(s => s.id === preselectedSlotId && isAvailable(s));
            if (target) {
              applyPreselection.current = false;
              preselectedTarget = target.id;
            }
          }
          setSelectedSlot((current) => {
            if (preselectedTarget) return preselectedTarget;
            if (current && apiSlots.some((slot) => slot.id === current && isAvailable(slot))) {
              return current;
            }
            return apiSlots.find(isAvailable)?.id ?? null;
          });
          if (preselectedTarget) setJustPreselected(true);
        } else {
          const todayCheck = getDateISO(selectedDate) === dates[0].id;
          const isAvailable = (s: import('../../types/field').TimeSlotData) =>
            s.status !== 'taken' && !isSlotPast(s, todayCheck);
          setSlots(field.availability ?? []);
          setSelectedSlot(field.availability.find(isAvailable)?.id ?? null);
        }
      } catch {
        if (!mounted) return;
        setSlots(field.availability ?? []);
        setSelectedSlot(field.availability.find((slot) => slot.status !== 'taken')?.id ?? null);
      } finally {
        if (mounted) setIsLoadingSlots(false);
      }
    };

    loadTimeSlots();

    return () => {
      mounted = false;
    };
  }, [field, selectedDate]);

  const handleBookNow = async () => {
    if (!field) return;
    if (isBooking) return;

    if (isMockFieldId(field.id)) {
      notify.info('Espera un momento', 'Aún cargando canchas. Intenta reservar en unos segundos.');
      return;
    }

    const isAuthenticated = authService.isAuthenticated();
    if (!isAuthenticated) {
      notify.warning('Debes iniciar sesión para reservar', 'Regístrate o inicia sesión para continuar con tu reserva.');
      setTimeout(() => navigate('/login'), 900);
      return;
    }

    const slot = slots.find(s => s.id === selectedSlot);
    if (!slot) {
      notify.error('Selecciona un horario', 'Debes elegir un horario disponible antes de reservar.');
      return;
    }

    try {
      setIsBooking(true);
      const date = dates.find(d => d.id === selectedDate);
      const dateISO = getDateISO(selectedDate);

      const bookingResponse = await bookingService.createBooking(slot.id);

      const newBooking: Booking = {
        id: bookingResponse.booking_id ?? `booking-${Date.now()}`,
        fieldId: field.id,
        complexName: field.location,
        fieldName: field.name,
        sport: field.sport,
        sportLabel: field.sportLabel,
        date: `${date?.name ?? 'DÍA'}, ${date?.day ?? ''}`,
        time: `${slot.time} ${slot.period}`,
        endTime: '',
        duration: '60 min',
        players: 0,
        status: 'pending',
        price: slot.price,
      };

      setCreatedBooking(newBooking);
      setPendingBookingId(bookingResponse.booking_id);
      setBookingStep('deposit');

      try {
        const updatedSlots = await schedulingService.getFieldTimeSlots(field.id, dateISO);
        if (updatedSlots.length > 0) {
          setSlots(updatedSlots);
          setSelectedSlot(updatedSlots.find((s) => s.status !== 'taken')?.id ?? null);
        } else {
          setSlots(prev => prev.map(s => (s.id === slot.id ? { ...s, status: 'taken', spotsLeft: undefined } : s)));
          setSelectedSlot((prev) => (prev === slot.id ? null : prev));
        }
      } catch {
        setSlots(prev => prev.map(s => (s.id === slot.id ? { ...s, status: 'taken', spotsLeft: undefined } : s)));
        setSelectedSlot((prev) => (prev === slot.id ? null : prev));
      }

      notify.success('Reserva creada', 'Ahora abona para confirmar tu reserva.');
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError?.status === 409) {
        notify.error('Horario no disponible', 'Ese horario acaba de ser tomado. Selecciona otro e intenta de nuevo.');
      } else if (apiError?.status === 401) {
        notify.error('Sesión expirada', 'Inicia sesión nuevamente para completar la reserva.');
        setTimeout(() => navigate('/login'), 800);
      } else {
        notify.error('No se pudo crear la reserva', 'Revisa sesión activa y disponibilidad del horario.');
      }
    } finally {
      setIsBooking(false);
    }
  };

  const handlePayDeposit = async () => {
    if (!pendingBookingId) return;
    setIsPayingDeposit(true);
    try {
      await bookingService.payDeposit(pendingBookingId);
      if (createdBooking) {
        const updated = { ...createdBooking, status: 'part_paid' as const };
        setCreatedBooking(updated);
        onBookingCreated?.(updated);
        onSlotBooked?.(field?.id ?? '', selectedSlot ?? '');
      }
      setBookingStep('success');
      notify.success('¡Abono exitoso!', 'Tu reserva está abonada. Presenta el código QR al llegar.');

      // Load QR data
      setQrLoading(true);
      try {
        const data = await bookingService.getBookingConfirmation(pendingBookingId);
        setQrData(data);
      } catch {
        // QR will be available later
      } finally {
        setQrLoading(false);
      }
    } catch (err) {
      const apiError = err as ApiError;
      if (apiError?.status === 409) {
        notify.error('La reserva ya fue abonada o cancelada');
      } else {
        notify.error('No se pudo procesar el abono', 'Intenta de nuevo.');
      }
    } finally {
      setIsPayingDeposit(false);
    }
  };

  const handleReset = () => {
    setBookingStep('select');
    setPendingBookingId(null);
    setCreatedBooking(null);
    setQrData(null);
  };

  const handleSaveToFavorites = () => {
    const isAuthenticated = authService.isAuthenticated();
    if (!isAuthenticated) {
      notify.info('Inicia sesión para guardar favoritos');
      navigate('/login');
    }
  };

  if (!field) {
    return (
      <div className="bg-[var(--color-surface)] rounded-[var(--radius-2xl)] border-[1.5px] border-[var(--color-border)] shadow-[var(--shadow-lg)] p-6 flex items-center justify-center min-h-[200px]">
        <p className="text-sm font-bold text-[var(--color-text-3)] text-center">
          Selecciona una cancha para ver opciones de reserva
        </p>
      </div>
    );
  }

  const selectedSlotData = slots.find(s => s.id === selectedSlot);
  const basePrice = selectedSlotData?.price ?? field.price;

  return (
    <div className={`bg-[var(--color-surface)] shadow-[var(--shadow-lg)] overflow-hidden flex flex-col h-full ${
      onClose ? '' : 'rounded-[var(--radius-2xl)] border-[1.5px] border-[var(--color-border)]'
    }`}>

      {/* ── Header dark ── */}
      <div className="bg-[var(--color-text)] p-5 pb-6 relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent, transparent 11px, rgba(98,191,59,.05) 12px), repeating-linear-gradient(90deg, transparent, transparent 11px, rgba(98,191,59,.05) 12px)',
          }}
        />
        <div className="relative z-10">
          <div className="flex items-start justify-between">
            <p className="font-[var(--font-pixel)] text-[6px] tracking-widest uppercase text-[var(--color-primary)] mb-2">
              <Calendar className="inline w-3 h-3 mr-1" />
              PANEL DE RESERVA
            </p>
            {onClose && (
              <button
                onClick={onClose}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-white/10 text-white/60
                  hover:bg-white/20 hover:text-white transition-all flex-shrink-0 -mt-1"
                aria-label="Cerrar panel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <p className="font-[var(--font-display)] text-[26px] font-black tracking-tight text-white mb-2">
            {field.name}
          </p>
          <div className="flex gap-3 text-xs text-white/55 font-semibold flex-wrap">
            <span className="flex items-center gap-1">
              <i className={`fa-solid ${sportIcons[field.sport] ?? 'fa-futbol'} text-[var(--color-primary-light)]`} />
              {sportNames[field.sport] ?? field.sport} {field.sportLabel}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-[var(--color-primary-light)]" />
              {field.location}
            </span>
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3 text-[var(--color-score)]" />
              {field.rating}
            </span>
          </div>
        </div>
        <div className="absolute right-5 top-1/2 -translate-y-1/2 opacity-50">
          <MiniFieldSVG />
        </div>
      </div>

      {/* ── Body ── */}
      <div className="p-5 flex-1 overflow-y-auto min-h-0">

        {/* Seleccionar Fecha */}
        <p className="font-[var(--font-pixel)] text-[6px] tracking-widest uppercase text-[var(--color-text-3)] mb-3">
          <Calendar className="inline w-3 h-3 mr-1" />
          SELECCIONAR FECHA
        </p>
        <div className="flex gap-2 mb-5 overflow-x-auto pb-2">
          {dates.map((date) => {
            const isActive = selectedDate === date.id;
            return (
              <button
                key={date.id}
                onClick={() => setSelectedDate(date.id)}
                className={`
                  flex flex-col items-center gap-0.5 min-w-[52px] px-3 py-2 rounded-[var(--radius-lg)] cursor-pointer
                  border-[1.5px] transition-all duration-[var(--duration-fast)] flex-shrink-0
                  ${isActive
                    ? 'bg-[var(--color-primary)] border-[var(--color-primary)] shadow-[var(--shadow-primary)]'
                    : 'bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-tint)] hover:scale-105'
                  }
                `}
              >
                <span className={`text-[10px] font-extrabold ${isActive ? 'text-white' : 'text-[var(--color-text-3)]'}`}>
                  {date.name}
                  {date.isToday && (
                    <span className={`block font-[var(--font-pixel)] text-[5px] mt-0.5 ${isActive ? 'text-white/70' : 'text-[var(--color-primary)]'}`}>
                      HOY
                    </span>
                  )}
                </span>
                <span className={`font-[var(--font-display)] text-[22px] font-black leading-none ${isActive ? 'text-white' : 'text-[var(--color-text)]'}`}>
                  {date.day}
                </span>
              </button>
            );
          })}
        </div>

        {/* Horarios */}
        <p className="font-[var(--font-pixel)] text-[6px] tracking-widest uppercase text-[var(--color-text-3)] mb-3">
          <Clock className="inline w-3 h-3 mr-1" />
          HORARIOS
        </p>
        {isLoadingSlots && (
          <p className="text-[10px] font-bold text-[var(--color-text-3)] mb-2">
            Cargando horarios de esta cancha...
          </p>
        )}

        {/* Preselected-slot banner — appears when coming from the complex dialog */}
        {justPreselected && selectedSlotData && (
          <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-[var(--radius-lg)]
            bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/50 animate-pulse">
            <i className="fa-solid fa-wand-magic-sparkles text-[var(--color-primary)] text-xs" />
            <span className="text-[11px] font-extrabold text-[var(--color-primary-dark)]">
              Horario {selectedSlotData.time} {selectedSlotData.period} · {formatPrice(selectedSlotData.price)} preseleccionado
            </span>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 mb-5">
          {slots.map((slot) => {
            const isTaken   = slot.status === 'taken';
            const isPast    = isSlotPast(slot, isToday);
            const isBlocked = isTaken || isPast;
            const isActive  = selectedSlot === slot.id;
            const isAlmost  = slot.status === 'almost-full';
            return (
              <button
                key={slot.id}
                disabled={isBlocked}
                onClick={() => !isBlocked && setSelectedSlot(slot.id)}
                className={`
                  relative px-2 py-2 rounded-[var(--radius-md)] cursor-pointer text-center
                  border-[1.5px] transition-all duration-[var(--duration-fast)]
                  ${isBlocked
                    ? 'bg-[var(--color-surf2)] cursor-not-allowed opacity-55'
                    : isActive
                    ? `bg-[var(--color-primary)] border-[var(--color-primary)] shadow-[var(--shadow-primary)] scale-105${justPreselected ? ' ring-2 ring-white/60 ring-offset-1 ring-offset-[var(--color-primary)]' : ''}`
                    : isAlmost
                    ? 'border-[var(--color-score)] bg-[var(--color-score)]/6'
                    : 'bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-tint)] hover:scale-105'
                  }
                `}
              >
                {isAlmost && slot.spotsLeft && !isBlocked && (
                  <span className="absolute -top-2 right-1 font-[var(--font-pixel)] text-[5px] bg-[var(--color-score)] text-[var(--color-text)] px-1 py-0.5 rounded-[var(--radius-xs)]">
                    {slot.spotsLeft} quedan
                  </span>
                )}
                <div className={`font-[var(--font-display)] text-base font-extrabold leading-none ${isBlocked ? 'text-[var(--color-muted)]' : isActive ? 'text-white' : 'text-[var(--color-text)]'}`}>
                  {slot.time}
                </div>
                <div className={`text-[10px] font-bold ${isActive ? 'text-white' : 'text-[var(--color-text-3)]'}`}>
                  {slot.period}
                </div>
                {!isBlocked && (
                  <div className={`font-[var(--font-pixel)] text-[7px] mt-0.5 ${isActive ? 'text-white' : 'text-[var(--color-primary-dark)]'}`}>
                    {formatPrice(slot.price)}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Resumen de precio */}
        <div className="bg-[var(--color-surf2)] rounded-[var(--radius-xl)] p-4 border-[1.5px] border-[var(--color-border)] mb-2">
          <div className="flex justify-between items-center py-2 text-[13px] font-bold text-[var(--color-text-2)] border-b border-[var(--color-border)]">
            <span>
              <i className="fa-solid fa-futbol text-[var(--color-primary)] mr-1" />
              Alquiler de cancha
            </span>
            <span>{formatPriceFull(basePrice)}</span>
          </div>
          <div className="flex justify-between items-center pt-3 mt-1 text-base font-black text-[var(--color-text)]">
            <span>TOTAL</span>
            <span className="font-[var(--font-display)] text-[28px] text-[var(--color-primary)] leading-none">
              {formatPriceFull(basePrice)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Sticky CTA footer ── */}
      <div className="px-5 pb-5 pt-3 border-t border-[var(--color-border)] bg-[var(--color-surface)] flex-shrink-0">
        {/* Step: Select — Reserve button */}
        {bookingStep === 'select' && (
          <>
            <button
              onClick={handleBookNow}
              disabled={isLoadingSlots || isBooking || !selectedSlot}
              className="inline-flex items-center justify-center gap-2 w-full px-8 py-4 rounded-[var(--radius-xl)] mb-2
                font-[var(--font-display)] text-[22px] tracking-wider text-white font-black cursor-pointer
                bg-gradient-to-br from-[var(--color-primary-light)] via-[var(--color-primary)] to-[var(--color-primary-dark)]
                shadow-[var(--shadow-primary)] hover:scale-105 hover:-translate-y-0.5 active:scale-95
                transition-all duration-[var(--duration-fast)] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:translate-y-0"
            >
              <Zap className="w-5 h-5" />
              {isBooking ? 'RESERVANDO...' : 'RESERVAR AHORA'}
            </button>
            <button
              onClick={handleSaveToFavorites}
              className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 rounded-[var(--radius-xl)]
                bg-transparent border-2 border-[var(--color-border)] text-[var(--color-text-3)] font-bold cursor-pointer
                hover:border-[var(--color-primary)] hover:text-[var(--color-primary-dark)] hover:bg-[var(--color-primary-tint)]
                transition-all duration-[var(--duration-fast)]"
            >
              <i className="fa-regular fa-heart" />
              Guardar en Favoritos
            </button>
          </>
        )}

        {/* Step: Deposit — Pay deposit button */}
        {bookingStep === 'deposit' && createdBooking && (
          <div className="space-y-3">
            <div className="bg-amber-50 border border-amber-200 rounded-[var(--radius-lg)] p-3 text-center">
              <p className="text-xs font-extrabold text-amber-700 mb-1">Reserva creada — Pendiente de abono</p>
              <p className="text-[10px] text-amber-600">
                Abona para confirmar tu reserva y generar tu código QR de acceso.
              </p>
            </div>
            <div className="bg-[var(--color-surf2)] rounded-[var(--radius-lg)] p-3 flex items-center justify-between">
              <span className="text-sm font-bold text-[var(--color-text-2)]">Total a abonar</span>
              <span className="font-[var(--font-display)] text-xl font-black text-[var(--color-primary)]">
                {formatPriceFull(createdBooking.price)}
              </span>
            </div>
            <button
              onClick={handlePayDeposit}
              disabled={isPayingDeposit}
              className="inline-flex items-center justify-center gap-2 w-full px-8 py-4 rounded-[var(--radius-xl)]
                font-[var(--font-display)] text-[18px] tracking-wider text-white font-black cursor-pointer
                bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700
                shadow-lg hover:scale-105 hover:-translate-y-0.5 active:scale-95
                transition-all duration-[var(--duration-fast)] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isPayingDeposit ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  PROCESANDO...
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5" />
                  ABONAR AHORA
                </>
              )}
            </button>
            <button
              onClick={handleReset}
              disabled={isPayingDeposit}
              className="w-full py-2 text-xs font-bold text-[var(--color-text-3)] hover:text-[var(--color-text-2)] transition-colors"
            >
              Cancelar y volver
            </button>
          </div>
        )}

        {/* Step: Success — QR code */}
        {bookingStep === 'success' && createdBooking && (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2 text-[var(--color-primary)]">
              <CheckCircle2 className="w-5 h-5" />
              <p className="font-extrabold text-sm">¡Reserva abonada exitosamente!</p>
            </div>

            {qrLoading && (
              <div className="flex justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-[var(--color-primary)]" />
              </div>
            )}

            {qrData && (
              <div className="space-y-2">
                <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] p-4 text-center bg-white">
                  <QRCodeSVG value={qrData.token} size={140} level="M" includeMargin className="mx-auto" />
                </div>
                <div className="rounded-[var(--radius-xl)] border border-dashed border-[var(--color-primary)] p-3 text-center bg-[var(--color-surf2)]">
                  <p className="text-[10px] text-[var(--color-text-3)] font-bold mb-1">Código corto</p>
                  <p className="font-mono font-extrabold text-xl tracking-widest text-[var(--color-text)]">
                    {qrData.short_code}
                  </p>
                </div>
              </div>
            )}

            <p className="text-[10px] text-center text-[var(--color-text-3)] font-semibold">
              Presenta este código al llegar al complejo para confirmar tu reserva.
            </p>

            <button
              onClick={() => { handleReset(); onClose?.(); }}
              className="w-full py-3 rounded-[var(--radius-xl)] bg-[var(--color-primary)] text-white font-extrabold text-sm
                shadow-[var(--shadow-primary)] hover:bg-[var(--color-primary-dark)] transition-all"
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
