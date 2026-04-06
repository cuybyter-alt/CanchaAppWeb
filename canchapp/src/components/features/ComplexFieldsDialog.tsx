import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronDown, MapPin, RefreshCw, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Dialog } from '../ui/dialog';
import { Badge } from '../ui/badge';
import type { NearbyComplex } from '../../types/map';
import type { Booking, ComplexField, ComplexFieldStatus, ComplexFieldType, TimeSlotData } from '../../types/field';
import complexesService from '../../services/ComplexesService';
import schedulingService from '../../services/SchedulingService';
import bookingService from '../../services/BookingService';
import authService from '../../services/AuthService';
import notify from '../../services/toast';
import { formatPriceFull } from '../../lib/utils';

interface ComplexFieldsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  complex: NearbyComplex | null;
  /** Called on desktop when user picks a slot – parent should pre-fill BookingPanel */
  onSlotSelected?: (field: ComplexField, slot: TimeSlotData, date: string, allSlots: TimeSlotData[]) => void;
  /** Called after a successful inline booking (mobile flow) */
  onBookingCreated?: (booking: Booking) => void;
}

const FIELD_TYPE_LABELS: Record<ComplexFieldType, string> = {
  futbol_5: 'F\u00fatbol 5',
  futbol_7: 'F\u00fatbol 7',
  futbol_11: 'F\u00fatbol 11',
  microfutbol: 'Microf\u00fatbol',
  futsal: 'Futsal',
};

const STATUS_CONFIG: Record<ComplexFieldStatus, { label: string; dot: string; badge: string }> = {
  active: {
    label: 'Activa',
    dot: 'bg-emerald-400',
    badge: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  },
  maintenance: {
    label: 'Mantenimiento',
    dot: 'bg-amber-400',
    badge: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  },
  inactive: {
    label: 'Inactiva',
    dot: 'bg-red-400',
    badge: 'bg-red-500/15 text-red-400 border border-red-500/30',
  },
};

interface SlotsState {
  loading: boolean;
  error: string | null;
  slots: TimeSlotData[];
  date: string;
}

function buildDates(): { iso: string; label: string }[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const iso = d.toISOString().split('T')[0];
    const label =
      i === 0
        ? 'Hoy'
        : i === 1
        ? 'Ma\u00f1ana'
        : d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' });
    return { iso, label };
  });
}

function isSlotPast(slot: TimeSlotData, isToday: boolean): boolean {
  if (!isToday) return false;
  if (slot.startIso) return new Date(slot.startIso) < new Date();
  return false;
}

export function ComplexFieldsDialog({ isOpen, onClose, complex, onSlotSelected, onBookingCreated }: ComplexFieldsDialogProps) {
  const [fields, setFields] = useState<ComplexField[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<(() => void) | null>(null);

  const [selectedDate, setSelectedDate] = useState<string>('');
  const [expandedFieldId, setExpandedFieldId] = useState<string | null>(null);
  const [slotsMap, setSlotsMap] = useState<Record<string, SlotsState>>({});
  const slotsAbortRef = useRef<Record<string, () => void>>({});

  // Slot selection state
  const [selectedSlotKey, setSelectedSlotKey] = useState<string | null>(null);
  const [selectedFieldForSlot, setSelectedFieldForSlot] = useState<ComplexField | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlotData | null>(null);
  const [isMobileBooking, setIsMobileBooking] = useState(false);
  const [bookingDone, setBookingDone] = useState(false);
  const navigate = useNavigate();

  const todayIso = new Date().toISOString().split('T')[0];
  const dates = buildDates();
  const isToday = selectedDate === todayIso;

  const fetchFields = (complexId: string) => {
    abortRef.current?.();
    let cancelled = false;
    abortRef.current = () => { cancelled = true; };

    setIsLoading(true);
    setError(null);
    setFields([]);

    complexesService
      .getComplexFields(complexId)
      .then((data) => { if (!cancelled) setFields(data); })
      .catch(() => {
        if (!cancelled) setError('No se pudieron cargar las canchas. Intenta de nuevo.');
      })
      .finally(() => { if (!cancelled) setIsLoading(false); });
  };

  const loadSlots = (fieldId: string, date: string) => {
    slotsAbortRef.current[fieldId]?.();
    let cancelled = false;
    slotsAbortRef.current[fieldId] = () => { cancelled = true; };

    setSlotsMap((prev) => ({
      ...prev,
      [fieldId]: { loading: true, error: null, slots: prev[fieldId]?.slots ?? [], date },
    }));

    schedulingService
      .getFieldTimeSlots(fieldId, date)
      .then((slots) => {
        if (!cancelled)
          setSlotsMap((prev) => ({ ...prev, [fieldId]: { loading: false, error: null, slots, date } }));
      })
      .catch(() => {
        if (!cancelled)
          setSlotsMap((prev) => ({
            ...prev,
            [fieldId]: { loading: false, error: 'No se pudieron cargar los horarios.', slots: [], date },
          }));
      });
  };

  const handleFieldClick = (field: ComplexField) => {
    if (field.status !== 'active') return;
    if (expandedFieldId === field.fieldId) {
      setExpandedFieldId(null);
      return;
    }
    setExpandedFieldId(field.fieldId);
    const existing = slotsMap[field.fieldId];
    if (!existing || existing.error || existing.date !== selectedDate) {
      loadSlots(field.fieldId, selectedDate);
    }
  };

  const handleDateChange = (iso: string) => {
    setSelectedDate(iso);
    setSlotsMap({});
    if (expandedFieldId) loadSlots(expandedFieldId, iso);
  };

  const handleSlotClick = (field: ComplexField, slot: TimeSlotData) => {
    setSelectedSlotKey(`${field.fieldId}:${slot.id}`);
    setSelectedFieldForSlot(field);
    setSelectedTimeSlot(slot);
    setBookingDone(false);
    // On desktop (>= lg) the parent will be notified via the footer "Ir al panel" button.
    // On mobile the footer shows an inline "Reservar" button instead.
  };

  const handleMobileBook = async () => {
    if (!selectedTimeSlot || !selectedFieldForSlot || isMobileBooking) return;
    if (!authService.isAuthenticated()) {
      notify.warning('Debes iniciar sesión', 'Regístrate o inicia sesión para continuar.');
      setTimeout(() => { onClose(); navigate('/login'); }, 800);
      return;
    }
    setIsMobileBooking(true);
    try {
      const resp = await bookingService.createBooking(selectedTimeSlot.id);
      const newBooking: Booking = {
        id: resp.booking_id ?? `booking-${Date.now()}`,
        fieldId: selectedFieldForSlot.fieldId,
        fieldName: selectedFieldForSlot.name,
        sport: 'futbol5',
        sportLabel: FIELD_TYPE_LABELS[selectedFieldForSlot.type] ?? selectedFieldForSlot.type,
        date: selectedDate,
        time: `${selectedTimeSlot.time} ${selectedTimeSlot.period}`,
        duration: '1 hr',
        players: 10,
        status: resp.status === 'cancelled' ? 'cancelled' : 'confirmed',
        price: selectedTimeSlot.price,
      };
      onBookingCreated?.(newBooking);
      setBookingDone(true);
      notify.success('¡Reserva confirmada!', `${selectedFieldForSlot.name} · ${selectedTimeSlot.time} ${selectedTimeSlot.period}`);
      setTimeout(onClose, 2000);
    } catch (err: unknown) {
      const e = err as { status?: number };
      if (e?.status === 409) {
        notify.error('Horario no disponible', 'Acaba de ser tomado. Selecciona otro.');
      } else if (e?.status === 401) {
        notify.error('Sesión expirada', 'Inicia sesión nuevamente.');
        setTimeout(() => { onClose(); navigate('/login'); }, 800);
      } else {
        notify.error('No se pudo reservar', 'Intenta de nuevo.');
      }
    } finally {
      setIsMobileBooking(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !complex) return;
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
    setExpandedFieldId(null);
    setSlotsMap({});
    setSelectedSlotKey(null);
    setSelectedFieldForSlot(null);
    setSelectedTimeSlot(null);
    setBookingDone(false);
    fetchFields(complex.id);
    return () => {
      abortRef.current?.();
      Object.values(slotsAbortRef.current).forEach((cancel) => cancel());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, complex?.id]);

  if (!complex) return null;

  const activeCount = fields.filter((f) => f.status === 'active').length;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="md">
      {/* â”€â”€ Custom header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="sticky top-0 z-10 px-5 pt-5 pb-4 border-b border-[var(--color-border)] bg-[var(--color-surf2)]">
        {/* Complex banner */}
        <div
          className="rounded-[var(--radius-xl)] overflow-hidden mb-4"
          style={{ background: 'linear-gradient(145deg, #1a3810, #2d5a1a)' }}
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-10 h-10 rounded-full bg-white/15 flex-shrink-0 flex items-center justify-center">
              <i className="fa-solid fa-building text-white text-sm" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-extrabold text-sm font-[var(--font-display)] leading-tight truncate">
                {complex.name}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                <MapPin className="w-2.5 h-2.5 text-white/60 flex-shrink-0" />
                <p className="text-white/70 text-[11px] font-medium truncate">{complex.address}</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              {complex.distanceLabel && (
                <span className="font-[var(--font-pixel)] text-[7px] text-white/80 tracking-widest bg-black/30 px-2 py-0.5 rounded-full">
                  {complex.distanceLabel}
                </span>
              )}
              <span className="text-[10px] text-white/60 font-medium">
                {complex.fieldsCount} {complex.fieldsCount === 1 ? 'cancha' : 'canchas'}
              </span>
            </div>
          </div>
        </div>

        {/* Title row */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-[var(--color-text)] font-[var(--font-display)]">
              Canchas del complejo
            </h2>
            <p className="text-[12px] text-[var(--color-text-3)] mt-0.5">
              Precios desde{' '}
              <span className="font-bold text-[var(--color-primary-dark)]">
                {formatPriceFull(complex.minPrice)}
              </span>{' '}
              hasta{' '}
              <span className="font-semibold text-[var(--color-text-2)]">
                {formatPriceFull(complex.maxPrice)}
              </span>{' '}
              / hora
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full
              hover:bg-[var(--color-border)] transition-colors text-[var(--color-text-3)]"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* â”€â”€ Date selector â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="px-5 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div
          className="flex gap-2 overflow-x-auto pb-0.5"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
        >
          {dates.map((d) => (
            <button
              key={d.iso}
              onClick={() => handleDateChange(d.iso)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-bold transition-all ${
                selectedDate === d.iso
                  ? 'bg-[var(--color-primary)] text-white shadow-sm'
                  : 'bg-[var(--color-border)] text-[var(--color-text-2)] hover:bg-[var(--color-primary)]/20'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* â”€â”€ Content â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="p-5 space-y-2.5">
        {/* Loading skeletons */}
        {isLoading && (
          <div className="space-y-2.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-[70px] bg-[var(--color-border)] rounded-[var(--radius-xl)] animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Error state */}
        {!isLoading && error && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center">
              <i className="fa-solid fa-circle-exclamation text-red-400 text-xl" />
            </div>
            <p className="text-[13px] text-[var(--color-text-3)] font-medium">{error}</p>
            <button
              onClick={() => fetchFields(complex.id)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-lg)]
                border border-[var(--color-border)] text-[12px] font-bold text-[var(--color-text-2)]
                hover:bg-[var(--color-border)] transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reintentar
            </button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && fields.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <div className="w-14 h-14 rounded-full bg-[var(--color-border)] flex items-center justify-center">
              <i className="fa-solid fa-futbol text-[var(--color-text-3)] text-2xl" />
            </div>
            <p className="text-[13px] text-[var(--color-text-3)] font-medium mt-1">
              Este complejo no tiene canchas registradas a\u00fan.
            </p>
          </div>
        )}

        {/* Fields list */}
        {!isLoading && !error && fields.length > 0 && (
          <>
            {/* Summary pill */}
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold text-[var(--color-text-3)] uppercase tracking-wide">
                {fields.length} {fields.length === 1 ? 'cancha' : 'canchas'}
              </span>
              {activeCount > 0 && (
                <span className="inline-flex items-center gap-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {activeCount} activa{activeCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {fields.map((field) => {
              const typeLabel = FIELD_TYPE_LABELS[field.type] ?? field.type;
              const statusCfg = STATUS_CONFIG[field.status] ?? STATUS_CONFIG.inactive;
              const dimensions =
                field.length && field.width ? `${field.length}m \u00d7 ${field.width}m` : null;
              const canExpand = field.status === 'active';
              const isExpanded = expandedFieldId === field.fieldId;
              const sState = slotsMap[field.fieldId];
              const availableSlots = sState?.slots.filter(
                (s) => s.status !== 'taken' && !isSlotPast(s, isToday),
              );

              return (
                <div
                  key={field.fieldId}
                  className={`bg-[var(--color-surf2)] border rounded-[var(--radius-xl)] overflow-hidden transition-all ${
                    isExpanded
                      ? 'border-[var(--color-primary)]/60 shadow-sm'
                      : 'border-[var(--color-border)]'
                  }`}
                >
                  {/* Field row header */}
                  <button
                    className={`w-full text-left flex items-center justify-between gap-3 px-4 py-3.5 transition-colors ${
                      canExpand
                        ? 'cursor-pointer hover:bg-[var(--color-border)]/30 active:bg-[var(--color-border)]/50'
                        : 'cursor-default'
                    }`}
                    onClick={() => handleFieldClick(field)}
                    disabled={!canExpand}
                  >
                    {/* Left: icon + info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #1a3810, #2d5a1a)' }}
                      >
                        <i className="fa-solid fa-futbol text-white text-xs" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-[13px] text-[var(--color-text)] truncate leading-tight">
                          {field.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="primary" className="!text-[8px] !py-0 !px-1.5">
                            {typeLabel}
                          </Badge>
                          {dimensions && (
                            <span className="text-[10px] text-[var(--color-text-3)] font-medium">
                              {dimensions}
                            </span>
                          )}
                          {/* Quick availability hint once data is loaded */}
                          {sState && !sState.loading && availableSlots !== undefined && (
                            <span
                              className={`text-[10px] font-bold ${
                                availableSlots.length > 0
                                  ? 'text-emerald-400'
                                  : 'text-[var(--color-text-3)]'
                              }`}
                            >
                              {availableSlots.length > 0
                                ? `${availableSlots.length} horario${availableSlots.length !== 1 ? 's' : ''} libre${availableSlots.length !== 1 ? 's' : ''}`
                                : 'Sin disponibilidad hoy'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: status + chevron */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${statusCfg.badge}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                        {statusCfg.label}
                      </span>
                      {canExpand && (
                        <ChevronDown
                          className={`w-4 h-4 text-[var(--color-text-3)] transition-transform duration-200 ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                        />
                      )}
                    </div>
                  </button>

                  {/* Expanded: slots panel */}
                  {isExpanded && (
                    <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
                      {/* Loading */}
                      {sState?.loading && (
                        <div className="grid grid-cols-4 gap-1.5">
                          {Array.from({ length: 8 }).map((_, i) => (
                            <div
                              key={i}
                              className="h-[40px] rounded-[var(--radius-lg)] bg-[var(--color-border)] animate-pulse"
                            />
                          ))}
                        </div>
                      )}

                      {/* Error */}
                      {!sState?.loading && sState?.error && (
                        <div className="flex items-center gap-2 text-[11px] text-red-400 font-medium py-1">
                          <i className="fa-solid fa-circle-exclamation" />
                          {sState.error}
                          <button
                            onClick={(e) => { e.stopPropagation(); loadSlots(field.fieldId, selectedDate); }}
                            className="ml-1 underline hover:no-underline"
                          >
                            Reintentar
                          </button>
                        </div>
                      )}

                      {/* Empty for this date */}
                      {!sState?.loading && !sState?.error && sState && sState.slots.length === 0 && (
                        <p className="text-[11px] text-[var(--color-text-3)] font-medium text-center py-3">
                          No hay horarios disponibles para este d\u00eda.
                        </p>
                      )}

                      {/* Slots grid */}
                      {!sState?.loading && !sState?.error && sState && sState.slots.length > 0 && (
                        <>
                          {/* Legend */}
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold text-[var(--color-text-3)] uppercase tracking-wide">
                              Horarios
                            </span>
                            <div className="flex items-center gap-3 text-[9px] font-bold text-[var(--color-text-3)]">
                              <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                                Disponible
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-[var(--color-border)] inline-block" />
                                Ocupado
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-4 gap-1.5">
                            {sState.slots.map((slot) => {
                              const past = isSlotPast(slot, isToday);
                              const taken = slot.status === 'taken';
                              const available = !taken && !past;
                              const isSelected = selectedSlotKey === `${field.fieldId}:${slot.id}`;
                              return (
                                <button
                                  key={slot.id}
                                  disabled={!available}
                                  onClick={() => available && handleSlotClick(field, slot)}
                                  title={`${formatPriceFull(slot.price)}/hr`}
                                  className={`flex flex-col items-center justify-center px-1 py-1.5 rounded-[var(--radius-lg)] transition-all ${
                                    isSelected
                                      ? 'bg-[var(--color-primary)] text-white ring-2 ring-[var(--color-primary)] ring-offset-1 ring-offset-[var(--color-surface)] scale-105 shadow-md'
                                      : available
                                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 cursor-pointer hover:bg-emerald-500/30 hover:scale-105 active:scale-95'
                                      : past
                                      ? 'bg-transparent border border-[var(--color-border)] text-[var(--color-text-3)] opacity-40 cursor-not-allowed'
                                      : 'bg-[var(--color-border)] text-[var(--color-text-3)] opacity-60 cursor-not-allowed'
                                  }`}
                                >
                                  <span className="text-[10px] font-extrabold leading-none">{slot.time}</span>
                                  <span className="text-[7px] font-bold leading-none mt-0.5 opacity-80">
                                    {slot.period}
                                  </span>
                                </button>
                              );
                            })}
                          </div>

                          {isToday && (
                            <p className="mt-2 text-[9px] text-[var(--color-text-3)] font-medium opacity-70">
                              * Los horarios pasados aparecen atenuados
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* â”€â”€ Footer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {/* Booking action bar — appears when a slot is highlighted */}
      <div className="sticky bottom-0 z-10 border-t border-[var(--color-border)] bg-[var(--color-surf2)]">

        {selectedTimeSlot && selectedFieldForSlot && !bookingDone && (
          <div className="px-5 py-3 border-b border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10">
            <div className="flex items-center justify-between gap-3">
              {/* Selection summary */}
              <div className="min-w-0">
                <p className="text-[11px] font-extrabold text-[var(--color-text)] truncate">
                  {selectedFieldForSlot.name}
                </p>
                <p className="text-[10px] font-bold text-[var(--color-primary-dark)]">
                  {selectedTimeSlot.time} {selectedTimeSlot.period}
                  {' · '}
                  {formatPriceFull(selectedTimeSlot.price)}/hr
                </p>
              </div>

              {/* Desktop CTA — opens in the right panel */}
              <button
                onClick={() => onSlotSelected?.(selectedFieldForSlot, selectedTimeSlot, selectedDate, slotsMap[selectedFieldForSlot.fieldId]?.slots ?? [selectedTimeSlot])}
                className="hidden lg:inline-flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-lg)]
                  bg-[var(--color-primary)] text-white text-[12px] font-extrabold
                  hover:opacity-90 active:scale-95 transition-all flex-shrink-0 shadow-sm"
              >
                Ir al panel
                <ArrowRight className="w-3.5 h-3.5 animate-bounce" />
              </button>

              {/* Mobile CTA — books inline */}
              <button
                onClick={handleMobileBook}
                disabled={isMobileBooking}
                className="lg:hidden inline-flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-lg)]
                  bg-[var(--color-primary)] text-white text-[12px] font-extrabold
                  hover:opacity-90 active:scale-95 transition-all flex-shrink-0 shadow-sm
                  disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isMobileBooking ? (
                  <><i className="fa-solid fa-spinner animate-spin" /> Reservando…</>
                ) : (
                  <><i className="fa-solid fa-calendar-check" /> Reservar</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Mobile booking success */}
        {bookingDone && (
          <div className="px-5 py-3 border-b border-emerald-500/30 bg-emerald-500/10 flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <i className="fa-solid fa-check text-emerald-400 text-xs" />
            </div>
            <div>
              <p className="text-[12px] font-extrabold text-emerald-400">¡Reserva confirmada!</p>
              <p className="text-[10px] font-medium text-[var(--color-text-3)]">Cerrando automáticamente…</p>
            </div>
          </div>
        )}

        {/* Close row — always visible */}
        <div className="px-5 py-3 flex items-center justify-between">
          {selectedTimeSlot && !bookingDone ? (
            <p className="hidden lg:block text-[10px] font-medium text-[var(--color-text-3)]">
              <i className="fa-solid fa-arrow-right text-[var(--color-primary)] mr-1" />
              Confirma la reserva en el panel derecho
            </p>
          ) : <span />}
          <button
            onClick={onClose}
            className="ml-auto px-5 py-2 rounded-[var(--radius-lg)] border border-[var(--color-border)]
              text-[13px] font-bold text-[var(--color-text-2)]
              hover:bg-[var(--color-border)] transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </Dialog>
  );
}
