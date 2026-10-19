import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, CalendarSearch, Clock3, Loader, RefreshCw, Search } from 'lucide-react';
import AvailabilityFieldCard from './AvailabilityFieldCard';
import QuickBookingDialog from './QuickBookingDialog';
import availabilitySearchService from '../../services/AvailabilitySearchService';
import { localTodayISO } from '../../services/SchedulingService';
import {
  FIELD_TYPE_LABELS,
  FIELD_TYPE_OPTIONS,
  compareFieldResults,
  extractErrorMessage,
  formatLongDate,
  validateAvailabilityQuery,
} from '../../lib/availability';
import { formatPriceFull } from '../../lib/utils';
import type { ComplexFieldType } from '../../types/field';
import type {
  AdminComplexOption,
  AlternativeTimeBlock,
  AvailabilityFieldResult,
  AvailabilityFormErrors,
  AvailabilityQuery,
  AvailabilitySearchResult,
} from '../../types/availability';

interface AvailabilitySearchProps {
  /** Se invoca tras crear una reserva rápida para que el contenedor refresque sus datos. */
  onBookingCreated?: () => void;
}

const inputClass =
  'w-full h-11 px-3 rounded-[var(--radius-md)] border-[1.5px] border-[var(--color-border)] bg-white font-semibold text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] disabled:opacity-60';

const labelClass = 'block mb-1.5 font-extrabold text-xs uppercase tracking-wider text-[var(--color-text-2)]';

/** Próxima hora en punto (HH:00) como valor inicial; vacío si ya no queda hora en el día. */
const getDefaultTime = (): string => {
  const nextHour = new Date().getHours() + 1;
  return nextHour <= 23 ? `${String(nextHour).padStart(2, '0')}:00` : '';
};

const AvailabilitySearch: React.FC<AvailabilitySearchProps> = ({ onBookingCreated }) => {
  const [complexes, setComplexes] = useState<AdminComplexOption[]>([]);
  const [complexesLoading, setComplexesLoading] = useState(true);
  const [complexesError, setComplexesError] = useState<string | null>(null);

  const [complexId, setComplexId] = useState('');
  const [date, setDate] = useState(localTodayISO);
  const [time, setTime] = useState(getDefaultTime);
  const [fieldType, setFieldType] = useState<ComplexFieldType | ''>('');
  const [formErrors, setFormErrors] = useState<AvailabilityFormErrors>({});

  const isToday = date === localTodayISO();
  const now = new Date();
  const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const minTime = isToday ? currentHHMM : undefined;

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    if (newDate === localTodayISO()) {
      const currentMinutes = new Date().getHours() * 60 + new Date().getMinutes();
      const parts = time.split(':');
      const inputMinutes = parts.length === 2 ? parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10) : null;
      if (inputMinutes === null || inputMinutes <= currentMinutes) {
        setTime(getDefaultTime());
      }
    }
  };

  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [result, setResult] = useState<AvailabilitySearchResult | null>(null);
  const [bookingTarget, setBookingTarget] = useState<AvailabilityFieldResult | null>(null);

  const latestRequest = useRef(0);
  const showComplexSelector = complexes.length > 1;

  const loadComplexes = useCallback(async () => {
    setComplexesLoading(true);
    setComplexesError(null);
    try {
      const options = await availabilitySearchService.getAdminComplexes();
      setComplexes(options);
      setComplexId((current) => {
        if (options.length === 1) return options[0].id;
        return options.some((option) => option.id === current) ? current : '';
      });
    } catch (err) {
      setComplexesError(extractErrorMessage(err, 'No se pudieron cargar tus complejos.'));
    } finally {
      setComplexesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadComplexes();
  }, [loadComplexes]);

  const executeSearch = useCallback(
    async (query: AvailabilityQuery) => {
      const validation = validateAvailabilityQuery(query, localTodayISO());
      setFormErrors(validation);
      if (Object.keys(validation).length > 0) return;

      const complexName = complexes.find((complex) => complex.id === query.complexId)?.name ?? '';
      const requestId = ++latestRequest.current;

      setSearching(true);
      setSearchError(null);
      try {
        const searchResult = await availabilitySearchService.search(query, complexName);
        if (requestId !== latestRequest.current) return;
        setResult(searchResult);
      } catch (err) {
        if (requestId !== latestRequest.current) return;
        setResult(null);
        setSearchError(extractErrorMessage(err, 'No se pudo consultar la disponibilidad.'));
      } finally {
        if (requestId === latestRequest.current) setSearching(false);
      }
    },
    [complexes],
  );

  const currentQuery = (): AvailabilityQuery => ({
    complexId,
    date,
    time,
    fieldType: fieldType || undefined,
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (searching) return;
    void executeSearch(currentQuery());
  };

  const handleSelectAlternative = (block: AlternativeTimeBlock) => {
    if (!result || searching) return;
    setTime(block.time);
    void executeSearch({ ...result.query, time: block.time });
  };

  const handleBooked = () => {
    setBookingTarget(null);
    onBookingCreated?.();
    if (result) void executeSearch(result.query);
  };

  const handleBackToSearch = (target: AvailabilityFieldResult) => {
    setBookingTarget(null);
    if (!result) return;

    const updatedFields = result.fields
      .map((item) =>
        item.fieldId === target.fieldId ? { ...item, status: 'occupied' as const } : item,
      )
      .sort(compareFieldResults);
    const availableCount = updatedFields.filter((item) => item.status === 'available').length;

    if (availableCount === 0) {
      void executeSearch(result.query);
      return;
    }
    setResult({ ...result, fields: updatedFields, availableCount });
  };

  const handleShowAlternatives = () => {
    setBookingTarget(null);
    if (result) void executeSearch(result.query);
  };

  const renderResults = () => {
    if (searching) {
      return (
        <div className="flex items-center justify-center gap-3 py-10 text-[var(--color-text-2)]">
          <Loader className="w-6 h-6 text-[var(--color-primary)] animate-spin" />
          <p className="font-semibold text-sm">Consultando disponibilidad en tiempo real...</p>
        </div>
      );
    }

    if (searchError) {
      return (
        <div
          id="availability-error"
          role="alert"
          className="rounded-[var(--radius-xl)] border border-red-300 bg-red-50 px-4 py-4 flex flex-wrap items-center justify-between gap-3"
        >
          <p className="text-sm font-extrabold text-red-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {searchError}
          </p>
          <button
            type="button"
            onClick={() => void executeSearch(currentQuery())}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-red-300 text-red-800 font-extrabold text-xs hover:bg-red-100"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reintentar
          </button>
        </div>
      );
    }

    if (!result) {
      return (
        <p className="text-sm font-semibold text-[var(--color-text-3)] text-center py-6">
          Elige fecha y hora para ver qué canchas están libres.
        </p>
      );
    }

    const typeLabel = result.query.fieldType ? FIELD_TYPE_LABELS[result.query.fieldType] : null;

    if (result.fieldsConsulted === 0) {
      return (
        <div id="availability-empty" className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-6 text-center">
          <p className="text-sm font-extrabold text-[var(--color-text-2)]">
            Este complejo no tiene canchas activas{typeLabel ? ` de ${typeLabel}` : ''}.
          </p>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-4">
        {result.failedFields > 0 && (
          <div className="rounded-[var(--radius-xl)] border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-900">
            No se pudo consultar la agenda de {result.failedFields}{' '}
            {result.failedFields === 1 ? 'cancha' : 'canchas'}. Los resultados pueden estar incompletos.
          </div>
        )}

        {result.availableCount > 0 ? (
          <p id="availability-summary" className="text-sm font-extrabold text-[var(--color-text)]">
            {result.availableCount} {result.availableCount === 1 ? 'cancha libre' : 'canchas libres'} a las{' '}
            {result.requestedTimeLabel}
            <span className="text-[var(--color-text-3)] font-semibold">
              {' '}
              · {formatLongDate(result.query.date)}
              {typeLabel ? ` · ${typeLabel}` : ''}
            </span>
          </p>
        ) : (
          <div
            id="availability-none"
            className="rounded-[var(--radius-xl)] border border-red-200 bg-red-50 px-4 py-4"
          >
            <p className="text-sm font-extrabold text-red-800">
              No hay canchas libres a las {result.requestedTimeLabel}
            </p>
            <p className="text-xs font-semibold text-red-700 mt-0.5">
              {formatLongDate(result.query.date)}
              {typeLabel ? ` · ${typeLabel}` : ''}
            </p>
          </div>
        )}

        {result.fields.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {result.fields.map((item) => (
              <AvailabilityFieldCard key={item.fieldId} result={item} onQuickBook={setBookingTarget} />
            ))}
          </div>
        )}

        {result.availableCount === 0 && (
          <div id="availability-alternatives" className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
            <p className="text-sm font-extrabold text-[var(--color-text)] flex items-center gap-2 mb-3">
              <Clock3 className="w-4 h-4 text-[var(--color-primary)]" />
              Bloques disponibles más cercanos
            </p>
            {result.alternatives.length === 0 ? (
              <p className="text-xs font-semibold text-[var(--color-text-3)]">
                No hay otros bloques libres para esta fecha, sede y tipo de cancha.
              </p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {result.alternatives.map((block) => {
                  const minRate = Math.min(...block.fields.map((field) => field.hourlyRate));
                  return (
                    <button
                      key={block.minutes}
                      type="button"
                      onClick={() => handleSelectAlternative(block)}
                      className="text-left px-4 py-3 rounded-[var(--radius-xl)] border-[1.5px] border-emerald-300 bg-emerald-50 hover:-translate-y-0.5 hover:shadow-md transition-all"
                    >
                      <span className="block text-sm font-extrabold text-emerald-800">{block.timeLabel}</span>
                      <span className="block text-[11px] font-bold text-emerald-700 mt-0.5">
                        {block.fields.length} {block.fields.length === 1 ? 'cancha' : 'canchas'} · desde{' '}
                        {formatPriceFull(minRate)}/h
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <section
      id="availability-search"
      aria-labelledby="availability-search-title"
      className="bg-[var(--color-surface)] rounded-[var(--radius-2xl)] border-[1.5px] border-[var(--color-primary)] shadow-[var(--shadow-primary)] p-5 sm:p-6 animate-fade-in"
    >
      <div className="mb-4">
        <h2
          id="availability-search-title"
          className="text-xl font-extrabold text-[var(--color-text)] flex items-center gap-2"
        >
          <CalendarSearch className="w-5 h-5 text-[var(--color-primary)]" />
          Buscar disponibilidad
        </h2>
        <p className="text-xs font-semibold text-[var(--color-text-3)] mt-1">
          Responde al instante a una consulta presencial o telefónica y reserva sin revisar calendarios.
        </p>
      </div>

      {complexesError ? (
        <div
          role="alert"
          className="rounded-[var(--radius-xl)] border border-red-300 bg-red-50 px-4 py-3 flex flex-wrap items-center justify-between gap-3"
        >
          <p className="text-sm font-extrabold text-red-800">{complexesError}</p>
          <button
            type="button"
            onClick={() => void loadComplexes()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-red-300 text-red-800 font-extrabold text-xs hover:bg-red-100"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reintentar
          </button>
        </div>
      ) : !complexesLoading && complexes.length === 0 ? (
        <p className="text-sm font-semibold text-[var(--color-text-3)]">
          Aún no tienes complejos asociados para consultar disponibilidad.
        </p>
      ) : (
        <form
          onSubmit={handleSubmit}
          noValidate
          className={`grid grid-cols-1 sm:grid-cols-2 gap-3 items-start ${
            showComplexSelector ? 'lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto]' : 'lg:grid-cols-[1fr_1fr_1fr_auto]'
          }`}
        >
          {showComplexSelector && (
            <div>
              <label htmlFor="availability-complex" className={labelClass}>
                Sede *
              </label>
              <select
                id="availability-complex"
                value={complexId}
                onChange={(e) => setComplexId(e.target.value)}
                className={inputClass}
                disabled={searching || complexesLoading}
              >
                <option value="">Seleccionar sede</option>
                {complexes.map((complex) => (
                  <option key={complex.id} value={complex.id}>
                    {complex.name}
                  </option>
                ))}
              </select>
              {formErrors.complexId && (
                <p className="mt-1 text-xs font-bold text-red-600">{formErrors.complexId}</p>
              )}
            </div>
          )}

          <div>
            <label htmlFor="availability-date" className={labelClass}>
              Fecha *
            </label>
            <input
              id="availability-date"
              type="date"
              value={date}
              min={localTodayISO()}
              onChange={(e) => handleDateChange(e.target.value)}
              className={inputClass}
              disabled={searching}
            />
            {formErrors.date && <p className="mt-1 text-xs font-bold text-red-600">{formErrors.date}</p>}
          </div>

          <div>
            <label htmlFor="availability-time" className={labelClass}>
              Hora de inicio *
            </label>
            <input
              id="availability-time"
              type="time"
              value={time}
              min={minTime}
              onChange={(e) => setTime(e.target.value)}
              className={inputClass}
              disabled={searching}
            />
            {formErrors.time && <p className="mt-1 text-xs font-bold text-red-600">{formErrors.time}</p>}
          </div>

          <div>
            <label htmlFor="availability-type" className={labelClass}>
              Tipo de cancha
            </label>
            <select
              id="availability-type"
              value={fieldType}
              onChange={(e) => setFieldType(e.target.value as ComplexFieldType | '')}
              className={inputClass}
              disabled={searching}
            >
              <option value="">Todos los tipos</option>
              {FIELD_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2 lg:col-span-1 lg:pt-[26px]">
            <button
              id="availability-search-button"
              type="submit"
              disabled={searching || complexesLoading}
              className="w-full h-11 px-5 rounded-full bg-[var(--color-primary)] text-white font-extrabold text-sm inline-flex items-center justify-center gap-2 shadow-[var(--shadow-primary)] hover:-translate-y-0.5 hover:brightness-95 transition-all active:scale-95 disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {searching ? <Loader className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Buscar disponibilidad
            </button>
          </div>
        </form>
      )}

      <div className="mt-5" aria-live="polite">
        {renderResults()}
      </div>

      <QuickBookingDialog
        key={bookingTarget?.slotId ?? 'closed'}
        target={bookingTarget}
        date={result?.query.date ?? date}
        onClose={() => setBookingTarget(null)}
        onBooked={handleBooked}
        onBackToSearch={handleBackToSearch}
        onShowAlternatives={handleShowAlternatives}
      />
    </section>
  );
};

export default AvailabilitySearch;
