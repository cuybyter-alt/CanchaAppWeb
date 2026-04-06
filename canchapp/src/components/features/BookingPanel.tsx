import React, { useEffect, useRef, useState } from 'react';
import { Calendar, Clock, MapPin, Star, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Booking, Field } from '../../types/field';
import { MiniFieldSVG } from '../ui/svg-assets';
import { formatPrice, formatPriceFull } from '../../lib/utils';
import authService from '../../services/AuthService';
import notify from '../../services/toast';
import schedulingService from '../../services/SchedulingService';
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
}

const DAY_NAMES = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'];

function generateDates(count = 7) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
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
  if (!isToday || !slot.startIso) return false;
  return new Date(slot.startIso) < new Date();
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

export const BookingPanel: React.FC<BookingPanelProps> = ({ field, onBookingCreated, onSlotBooked, preselectedSlotId, preselectedDate }) => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(dates[0].id);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(
    field?.availability.find(s => s.status !== 'taken')?.id ?? null
  );
  const [slots, setSlots] = useState(field?.availability ?? []);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  // Tracks whether the next slot-load should honour preselectedSlotId
  const applyPreselection = useRef(false);

  const getDateISO = (dateId: string): string => dateId;

  const isMockFieldId = (fieldId: string): boolean => /^field-\d+/i.test(fieldId);

  const todayISO = dates[0].id;
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

  useEffect(() => {
    setSlots(field?.availability ?? []);
    setSelectedSlot(field?.availability.find(s => s.status !== 'taken')?.id ?? null);
  }, [field]);

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
          setSelectedSlot((current) => {
            // Honour preselection from dialog (first load after dialog interaction)
            if (applyPreselection.current && preselectedSlotId) {
              applyPreselection.current = false;
              const target = apiSlots.find(s => s.id === preselectedSlotId && isAvailable(s));
              if (target) return target.id;
            }
            if (current && apiSlots.some((slot) => slot.id === current && isAvailable(slot))) {
              return current;
            }
            return apiSlots.find(isAvailable)?.id ?? null;
          });
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
        fieldName: field.name,
        sport: field.sport,
        sportLabel: field.sportLabel,
        date: `${date?.name ?? 'DÍA'}, ${date?.day ?? ''}`,
        time: `${slot.time} ${slot.period}`,
        duration: '60 min',
        players: 0,
        status: bookingResponse.status === 'cancelled' ? 'cancelled' : 'confirmed',
        price: slot.price,
      };

      onBookingCreated?.(newBooking);
      onSlotBooked?.(field.id, slot.id);

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

      notify.success('Reserva creada', 'Tu reserva fue registrada y el horario quedó bloqueado.');
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
    <div className="bg-[var(--color-surface)] rounded-[var(--radius-2xl)] border-[1.5px] border-[var(--color-border)] shadow-[var(--shadow-lg)] overflow-hidden flex flex-col">

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
          <p className="font-[var(--font-pixel)] text-[6px] tracking-widest uppercase text-[var(--color-primary)] mb-2">
            <Calendar className="inline w-3 h-3 mr-1" />
            PANEL DE RESERVA
          </p>
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
      <div className="p-5 flex-1 overflow-y-auto">

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
                    ? 'bg-[var(--color-primary)] border-[var(--color-primary)] shadow-[var(--shadow-primary)] scale-105'
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
        <div className="bg-[var(--color-surf2)] rounded-[var(--radius-xl)] p-4 border-[1.5px] border-[var(--color-border)] mb-4">
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

        {/* CTAs */}
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
      </div>
    </div>
  );
};
