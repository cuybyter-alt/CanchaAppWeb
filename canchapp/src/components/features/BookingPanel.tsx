import React, { useEffect, useState } from 'react';
import { Calendar, Clock, MapPin, Minus, Plus, Star, Users, Zap } from 'lucide-react';
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
}

const dates = [
  { id: 'mon',  name: 'LUN', day: 24 },
  { id: 'tue',  name: 'MAR', day: 25 },
  { id: 'wed',  name: 'MIE', day: 26 },
  { id: 'thu',  name: 'JUE', day: 27 },
  { id: 'fri',  name: 'VIE', day: 28 },
  { id: 'sat',  name: 'SAB', day: 29, isToday: true },
  { id: 'sun',  name: 'DOM', day: 1 },
  { id: 'mon2', name: 'LUN', day: 2 },
];

const durations = [
  { id: '1h',  label: '1 hr' },
  { id: '90m', label: '1.5 hrs' },
  { id: '2h',  label: '2 hrs' },
];

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

export const BookingPanel: React.FC<BookingPanelProps> = ({ field, onBookingCreated, onSlotBooked }) => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState('sat');
  const [selectedDuration, setSelectedDuration] = useState('1h');
  const [selectedSlot, setSelectedSlot] = useState<string | null>(
    field?.availability.find(s => s.status !== 'taken')?.id ?? null
  );
  const [playerCount, setPlayerCount] = useState(field?.capacity ?? 10);
  const [slots, setSlots] = useState(field?.availability ?? []);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isBooking, setIsBooking] = useState(false);

  const getDateISO = (dateId: string): string => {
    const idx = Math.max(0, dates.findIndex((d) => d.id === dateId));
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + idx);
    return date.toISOString().slice(0, 10);
  };

  const isMockFieldId = (fieldId: string): boolean => /^field-\d+/i.test(fieldId);

  useEffect(() => {
    setSlots(field?.availability ?? []);
    setSelectedSlot(field?.availability.find(s => s.status !== 'taken')?.id ?? null);
    setPlayerCount(field?.capacity ?? 10);
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
          setSelectedSlot((current) => {
            if (current && apiSlots.some((slot) => slot.id === current && slot.status !== 'taken')) {
              return current;
            }
            return apiSlots.find((slot) => slot.status !== 'taken')?.id ?? null;
          });
        } else {
          setSlots(field.availability ?? []);
          setSelectedSlot(field.availability.find((slot) => slot.status !== 'taken')?.id ?? null);
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
      notify.info('Espera un momento', 'Aún cargando canchas reales. Intenta reservar en unos segundos.');
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
      const duration = durations.find(d => d.id === selectedDuration);
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
        duration: duration?.label ?? '1 hr',
        players: playerCount,
        status: bookingResponse.status === 'cancelled' ? 'cancelled' : 'confirmed',
        price: slot.price + 2000,
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
  const weekendSurcharge = 2000;
  const total = basePrice + weekendSurcharge;

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

        {/* Duración */}
        <p className="font-[var(--font-pixel)] text-[6px] tracking-widest uppercase text-[var(--color-text-3)] mb-3">
          <Clock className="inline w-3 h-3 mr-1" />
          DURACIÓN
        </p>
        <div className="flex gap-2 mb-4">
          {durations.map((dur) => {
            const isActive = selectedDuration === dur.id;
            return (
              <button
                key={dur.id}
                onClick={() => setSelectedDuration(dur.id)}
                className={`
                  flex-1 px-3 py-2 rounded-[var(--radius-md)] cursor-pointer text-[13px] font-extrabold text-center
                  border-[1.5px] transition-all duration-[var(--duration-fast)]
                  ${isActive
                    ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-[var(--shadow-primary)]'
                    : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-2)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary-dark)] hover:bg-[var(--color-primary-tint)]'
                  }
                `}
              >
                {dur.label}
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
            const isActive  = selectedSlot === slot.id;
            const isAlmost  = slot.status === 'almost-full';
            return (
              <button
                key={slot.id}
                disabled={isTaken}
                onClick={() => !isTaken && setSelectedSlot(slot.id)}
                className={`
                  relative px-2 py-2 rounded-[var(--radius-md)] cursor-pointer text-center
                  border-[1.5px] transition-all duration-[var(--duration-fast)]
                  ${isTaken
                    ? 'bg-[var(--color-surf2)] cursor-not-allowed opacity-55'
                    : isActive
                    ? 'bg-[var(--color-primary)] border-[var(--color-primary)] shadow-[var(--shadow-primary)] scale-105'
                    : isAlmost
                    ? 'border-[var(--color-score)] bg-[var(--color-score)]/6'
                    : 'bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-tint)] hover:scale-105'
                  }
                `}
              >
                {isAlmost && slot.spotsLeft && (
                  <span className="absolute -top-2 right-1 font-[var(--font-pixel)] text-[5px] bg-[var(--color-score)] text-[var(--color-text)] px-1 py-0.5 rounded-[var(--radius-xs)]">
                    {slot.spotsLeft} quedan
                  </span>
                )}
                <div className={`font-[var(--font-display)] text-base font-extrabold leading-none ${isTaken ? 'text-[var(--color-muted)]' : isActive ? 'text-white' : 'text-[var(--color-text)]'}`}>
                  {slot.time}
                </div>
                <div className={`text-[10px] font-bold ${isActive ? 'text-white' : 'text-[var(--color-text-3)]'}`}>
                  {slot.period}
                </div>
                {!isTaken && (
                  <div className={`font-[var(--font-pixel)] text-[7px] mt-0.5 ${isActive ? 'text-white' : 'text-[var(--color-primary-dark)]'}`}>
                    {formatPrice(slot.price)}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Jugadores */}
        <p className="font-[var(--font-pixel)] text-[6px] tracking-widest uppercase text-[var(--color-text-3)] mb-3">
          <Users className="inline w-3 h-3 mr-1" />
          JUGADORES
        </p>
        <div className="flex items-center gap-3 bg-[var(--color-surf2)] rounded-[var(--radius-xl)] p-4 border-[1.5px] border-[var(--color-border)] mb-5">
          <Users className="w-5 h-5 text-[var(--color-primary)]" />
          <div className="flex-1">
            <p className="text-sm font-bold text-[var(--color-text)] leading-tight">Cantidad de Jugadores</p>
            <p className="text-xs font-bold text-[var(--color-text-3)]">Capacidad máx: {field.capacity} jugadores</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPlayerCount(Math.max(2, playerCount - 1))}
              className="w-8 h-8 rounded-[var(--radius-md)] border-[1.5px] border-[var(--color-border)] bg-[var(--color-surface)] cursor-pointer flex items-center justify-center text-[var(--color-text-2)] transition-all duration-[var(--duration-fast)] hover:bg-[var(--color-primary)] hover:border-[var(--color-primary)] hover:text-white hover:scale-110 active:scale-90"
            >
              <Minus className="w-4 h-4" />
            </button>
            <div className="font-[var(--font-display)] text-2xl font-black min-w-8 text-center text-[var(--color-text)]">
              {playerCount}
            </div>
            <button
              onClick={() => setPlayerCount(Math.min(field.capacity, playerCount + 1))}
              className="w-8 h-8 rounded-[var(--radius-md)] border-[1.5px] border-[var(--color-border)] bg-[var(--color-surface)] cursor-pointer flex items-center justify-center text-[var(--color-text-2)] transition-all duration-[var(--duration-fast)] hover:bg-[var(--color-primary)] hover:border-[var(--color-primary)] hover:text-white hover:scale-110 active:scale-90"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Resumen de precio */}
        <div className="bg-[var(--color-surf2)] rounded-[var(--radius-xl)] p-4 border-[1.5px] border-[var(--color-border)] mb-4">
          <div className="flex justify-between items-center py-2 text-[13px] font-bold text-[var(--color-text-2)] border-b border-[var(--color-border)]">
            <span>
              <i className="fa-solid fa-futbol text-[var(--color-primary)] mr-1" />
              Alquiler de cancha (1h)
            </span>
            <span>{formatPriceFull(basePrice)}</span>
          </div>
          <div className="flex justify-between items-center py-2 text-[13px] font-bold text-[var(--color-text-2)] border-b border-[var(--color-border)]">
            <span>
              <Zap className="inline w-3 h-3 text-[var(--color-primary)] mr-1" />
              Recargo fin de semana
            </span>
            <span>{formatPriceFull(weekendSurcharge)}</span>
          </div>
          <div className="flex justify-between items-center py-2 text-[13px] font-bold text-[var(--color-text-2)] border-b border-[var(--color-border)]">
            <span>
              <i className="fa-solid fa-shirt text-[var(--color-primary)] mr-1" />
              Petos (opc.)
            </span>
            <span>$0</span>
          </div>
          <div className="flex justify-between items-center pt-3 mt-1 text-base font-black text-[var(--color-text)]">
            <span>TOTAL</span>
            <span className="font-[var(--font-display)] text-[28px] text-[var(--color-primary)] leading-none">
              {formatPriceFull(total)}
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
