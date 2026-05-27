import React, { useCallback, useEffect, useState } from 'react';
import {
  BarChart2,
  Trophy,
  Calendar,
  Clock,
  TrendingUp,
  ChevronDown,
  RefreshCw,
  Building2,
  CircleDot,
} from 'lucide-react';
import statisticsService, {
  type ComplexUsage,
  type FieldUsage,
  type UsageInterval,
  type UsageOrder,
  type UsageDataPoint,
} from '../../services/StatisticsService';
import complexesService from '../../services/ComplexesService';
import type { ComplexField } from '../../types/field';
 
// ── Types ────────────────────────────────────────────────────────────────────
 
type Mode = 'hour' | 'week' | 'month';
type Scope = 'complex' | 'field';
 
interface ComplexOption {
  id: string;
  name: string;
}
 
interface FieldOption {
  fieldId: string;
  name: string;
}
 
// ── Helpers ──────────────────────────────────────────────────────────────────
 
function modeToInterval(mode: Mode): UsageInterval {
  if (mode === 'hour') return 'hour';
  if (mode === 'week') return 'day';
  return 'month';
}
 
function getDefaultDates(mode: Mode): { start: string; end: string } {
  const today = new Date();
  const fmt = (d: Date) => d.toLocaleDateString('en-CA');
  if (mode === 'month') {
    return {
      start: fmt(new Date(today.getFullYear(), 0, 1)),
      end: fmt(new Date(today.getFullYear(), 11, 31)),
    };
  }
  return {
    start: fmt(new Date(today.getFullYear(), today.getMonth(), 1)),
    end: fmt(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
  };
}
 
const DAY_LABELS: Record<string, string> = {
  sunday: 'Domingo', monday: 'Lunes', tuesday: 'Martes',
  wednesday: 'Miércoles', thursday: 'Jueves', friday: 'Viernes', saturday: 'Sábado',
};
 
const MONTH_LABELS: Record<string, string> = {
  january: 'Enero', february: 'Febrero', march: 'Marzo',
  april: 'Abril', may: 'Mayo', june: 'Junio',
  july: 'Julio', august: 'Agosto', september: 'Septiembre',
  october: 'Octubre', november: 'Noviembre', december: 'Diciembre',
};
 
function translateLabel(label: string, mode: Mode): string {
  const low = label.toLowerCase();
  if (mode === 'week' && DAY_LABELS[low]) return DAY_LABELS[low];
  if (mode === 'month' && MONTH_LABELS[low]) return MONTH_LABELS[low];
  return label;
}
 
// ── Sub-components ────────────────────────────────────────────────────────────
 
function ModeButton({ active, icon, label, onClick }: {
  active: boolean; icon: React.ReactNode; label: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-lg)] text-sm font-extrabold transition-all ${
        active
          ? 'bg-[var(--color-primary)] text-white shadow-sm'
          : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-3)] hover:text-[var(--color-text)]'
      }`}
    >
      {icon}{label}
    </button>
  );
}
 
function Select({ value, onChange, options, disabled, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`appearance-none w-full border border-[var(--color-border)] rounded-[var(--radius-lg)] px-3 py-2 pr-8 text-sm font-semibold text-[var(--color-text)] bg-[var(--color-surface)] focus:outline-none focus:border-[var(--color-primary)] transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-3)]" />
    </div>
  );
}
 
function UsageBarChart({ usage, mode, title, subtitle }: {
  usage: UsageDataPoint[]; mode: Mode; title: string; subtitle?: string;
}) {
  if (!usage.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-[var(--color-text-3)] text-sm">
        <BarChart2 className="w-8 h-8 mb-2 opacity-30" />
        Sin datos para este período
      </div>
    );
  }
  const max = Math.max(...usage.map((u) => u.bookings), 1);
  return (
    <div>
      <p className="font-extrabold text-[var(--color-text)] mb-0.5">{title}</p>
      {subtitle && <p className="text-xs text-[var(--color-text-3)] mb-4">{subtitle}</p>}
      <div className="space-y-2.5 mt-3">
        {usage.map((point, i) => {
          const pct = (point.bookings / max) * 100;
          const isTop = i === 0;
          return (
            <div key={point.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-[var(--color-text)]">
                  {translateLabel(point.label, mode)}
                </span>
                <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${
                  isTop
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-[var(--color-primary-tint)] text-[var(--color-primary-dark)]'
                }`}>
                  {point.bookings} {point.bookings === 1 ? 'reserva' : 'reservas'}
                </span>
              </div>
              <div className="h-7 bg-[var(--color-surf2)] rounded-[var(--radius-sm)] overflow-hidden">
                <div
                  className="h-full rounded-[var(--radius-sm)] flex items-center justify-end pr-2 transition-all duration-500"
                  style={{
                    width: `${Math.max(pct, 2)}%`,
                    background: 'linear-gradient(90deg, #62bf3b, #83d45f)',
                    opacity: 0.5 + 0.5 * (pct / 100),
                  }}
                >
                  {pct > 20 && (
                    <span className="text-[10px] font-extrabold text-white">
                      {Math.round(point.percentage)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
 
function TopSlots({ fields }: { fields: { name: string; bookings: number }[] }) {
  const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
  if (!fields.length) return <p className="text-sm text-[var(--color-text-3)]">Sin datos disponibles.</p>;
  return (
    <div className="space-y-3">
      {fields.map((f, i) => (
        <div key={f.name} className="flex items-center gap-3 bg-[var(--color-surf2)] rounded-[var(--radius-lg)] px-4 py-3">
          <span className="text-xl w-7 text-center flex-shrink-0">{medals[i]}</span>
          <div className="min-w-0 flex-1">
            <p className="font-extrabold text-[var(--color-text)] text-sm truncate">{f.name}</p>
            <p className="text-xs text-[var(--color-text-3)]">{f.bookings} {f.bookings === 1 ? 'reserva' : 'reservas'}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
 
function StatChip({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className={`rounded-[var(--radius-xl)] p-5 text-white ${color}`}>
      <p className="text-[10px] font-extrabold tracking-widest uppercase opacity-80 mb-1">{label}</p>
      <p className="text-4xl font-extrabold leading-none">{value}</p>
    </div>
  );
}
 
// ── Main Component ────────────────────────────────────────────────────────────
 
const AdminReports: React.FC = () => {
  const [mode, setMode] = useState<Mode>('week');
  const [scope, setScope] = useState<Scope>('complex');
  const [selectedComplexId, setSelectedComplexId] = useState('');
  const [selectedFieldId, setSelectedFieldId] = useState('');
 
  const defaultDates = getDefaultDates('week');
  const [startDate, setStartDate] = useState(defaultDates.start);
  const [endDate, setEndDate] = useState(defaultDates.end);
 
  const [complexOptions, setComplexOptions] = useState<ComplexOption[]>([]);
  const [fieldOptions, setFieldOptions] = useState<FieldOption[]>([]);
  const [complexUsage, setComplexUsage] = useState<ComplexUsage | null>(null);
  const [fieldUsage, setFieldUsage] = useState<FieldUsage | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingComplexes, setLoadingComplexes] = useState(true);
  const [error, setError] = useState<string | null>(null);
 
  // ── Load admin's complexes, then immediately fetch data for the first one ──
  useEffect(() => {
    setLoadingComplexes(true);
    statisticsService
      .getAdminStats()
      .then((stats) => {
        const opts = stats.complexes.map((c) => ({ id: c.complex_id, name: c.complex_name }));
        setComplexOptions(opts);
 
        if (opts.length === 0) return;
 
        const firstId = opts[0].id;
        setSelectedComplexId(firstId);
 
        // ✅ Fetch usage directly here with the known complexId,
        //    instead of relying on the state update to trigger fetchData.
        const params = {
          start_date: startDate,
          end_date: endDate,
          interval: modeToInterval(mode),
          order: 'desc' as UsageOrder,
        };
        setLoading(true);
        setError(null);
        statisticsService
          .getComplexUsage(firstId, params)
          .then((data) => setComplexUsage(data))
          .catch(() => setError('No se pudieron cargar las estadísticas. Verifica el rango de fechas e intenta de nuevo.'))
          .finally(() => setLoading(false));
      })
      .catch(() => setError('No se pudieron cargar los complejos.'))
      .finally(() => setLoadingComplexes(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
 
  // ── Load fields when complex changes ─────────────────────────────────────
  useEffect(() => {
    if (!selectedComplexId) { setFieldOptions([]); return; }
    setSelectedFieldId('');
    setScope('complex');
    complexesService
      .getComplexFields(selectedComplexId)
      .then((fields: ComplexField[]) =>
        setFieldOptions(fields.map((f) => ({ fieldId: f.fieldId, name: f.name })))
      )
      .catch(() => setFieldOptions([]));
  }, [selectedComplexId]);
 
  // ── Fetch when filters change (but NOT on initial mount — handled above) ──
  const fetchData = useCallback(async (complexId: string, fieldId: string, currentScope: Scope) => {
    if (!complexId) return;
    setLoading(true);
    setError(null);
    setComplexUsage(null);
    setFieldUsage(null);
 
    const params = {
      start_date: startDate,
      end_date: endDate,
      interval: modeToInterval(mode),
      order: 'desc' as UsageOrder,
    };
 
    try {
      if (currentScope === 'field' && fieldId) {
        setFieldUsage(await statisticsService.getFieldUsage(fieldId, params));
      } else {
        setComplexUsage(await statisticsService.getComplexUsage(complexId, params));
      }
    } catch (err) {
      console.error(err);
      setError('No se pudieron cargar las estadísticas. Verifica el rango de fechas e intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, mode]);
 
  // ── Handlers that trigger fetch explicitly ────────────────────────────────
 
  const handleComplexChange = (id: string) => {
    setSelectedComplexId(id);
    setSelectedFieldId('');
    setScope('complex');
    void fetchData(id, '', 'complex');
  };
 
  const handleFieldChange = (fieldId: string) => {
    if (!fieldId) {
      setScope('complex');
      setSelectedFieldId('');
      void fetchData(selectedComplexId, '', 'complex');
    } else {
      setScope('field');
      setSelectedFieldId(fieldId);
      void fetchData(selectedComplexId, fieldId, 'field');
    }
  };
 
  const handleModeChange = (m: Mode) => {
    const d = getDefaultDates(m);
    setMode(m);
    setStartDate(d.start);
    setEndDate(d.end);
    // fetchData will be called by the Apply button or date change
  };
 
  // Apply button: re-fetch with current state
  const handleApply = () => {
    void fetchData(selectedComplexId, selectedFieldId, scope);
  };
 
  // ── Derived values ────────────────────────────────────────────────────────
  const activeData = fieldUsage ?? complexUsage;
  const totalBookings = activeData?.total_bookings ?? 0;
  const usagePoints: UsageDataPoint[] = activeData?.usage ?? [];
  const average = usagePoints.length
    ? Math.round(usagePoints.reduce((s, p) => s + p.bookings, 0) / usagePoints.length)
    : 0;
 
  const selectedComplexName = complexOptions.find((c) => c.id === selectedComplexId)?.name ?? '—';
  const selectedFieldName = fieldOptions.find((f) => f.fieldId === selectedFieldId)?.name;
 
  const modeLabel = mode === 'hour' ? 'Por Hora' : mode === 'week' ? 'Semanal' : 'Mensual';
  const chartTitle =
    mode === 'hour' ? 'Reservas por Hora'
    : mode === 'week' ? 'Reservas por Día de la Semana'
    : 'Reservas por Mes';
  const chartSubtitle =
    scope === 'field' && selectedFieldName
      ? `Cancha: ${selectedFieldName}`
      : `Complejo: ${selectedComplexName}`;
 
  const topSlots = usagePoints.slice(0, 5).map((p) => ({
    name: translateLabel(p.label, mode),
    bookings: p.bookings,
  }));
 
  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-5 sm:p-8 space-y-6">
      {/* Header */}
      <div>
        <p className="text-[10px] font-extrabold tracking-widest text-[var(--color-primary)] uppercase mb-1 flex items-center gap-1.5">
          <BarChart2 className="w-3 h-3" />
          Panel de administración
        </p>
        <h1 className="text-3xl font-extrabold text-[var(--color-text)]">Reportes</h1>
        <p className="text-sm text-[var(--color-text-3)] mt-1">
          Estadísticas de uso de tus complejos deportivos.
        </p>
      </div>
 
      {/* Filters */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-2xl)] p-5 space-y-4">
        <p className="text-xs font-extrabold tracking-widest text-[var(--color-text-3)] uppercase">Filtros</p>
 
        {/* Fila 1: Complejo · Cancha · Fechas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-[var(--color-text-3)] mb-1.5">Complejo</label>
            {loadingComplexes ? (
              <div className="h-9 bg-[var(--color-surf2)] rounded-[var(--radius-lg)] animate-pulse" />
            ) : (
              <Select
                value={selectedComplexId}
                onChange={handleComplexChange}
                placeholder={complexOptions.length === 0 ? 'Sin complejos' : undefined}
                options={complexOptions.map((c) => ({ value: c.id, label: c.name }))}
              />
            )}
          </div>
 
          <div>
            <label className="block text-xs font-bold text-[var(--color-text-3)] mb-1.5">Cancha</label>
            <Select
              value={scope === 'field' ? selectedFieldId : ''}
              disabled={fieldOptions.length === 0}
              onChange={handleFieldChange}
              placeholder="Todas las canchas"
              options={fieldOptions.map((f) => ({ value: f.fieldId, label: f.name }))}
            />
          </div>
 
          <div>
            <label className="block text-xs font-bold text-[var(--color-text-3)] mb-1.5">Rango de fechas</label>
            <div className="flex gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="flex-1 min-w-0 border border-[var(--color-border)] rounded-[var(--radius-lg)] px-2 py-2 text-sm font-semibold text-[var(--color-text)] bg-[var(--color-surface)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="flex-1 min-w-0 border border-[var(--color-border)] rounded-[var(--radius-lg)] px-2 py-2 text-sm font-semibold text-[var(--color-text)] bg-[var(--color-surface)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              />
            </div>
          </div>
        </div>
 
        {/* Fila 2: Modo de análisis + botón aplicar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-[var(--color-text-3)] mr-1">Modo de análisis:</span>
            <ModeButton active={mode === 'hour'} icon={<Clock className="w-3.5 h-3.5" />} label="Por Hora" onClick={() => handleModeChange('hour')} />
            <ModeButton active={mode === 'week'} icon={<Calendar className="w-3.5 h-3.5" />} label="Semanal" onClick={() => handleModeChange('week')} />
            <ModeButton active={mode === 'month'} icon={<TrendingUp className="w-3.5 h-3.5" />} label="Mensual" onClick={() => handleModeChange('month')} />
          </div>
          <button
            onClick={handleApply}
            disabled={loading || !selectedComplexId}
            className="flex items-center gap-2 px-5 py-2 rounded-[var(--radius-lg)] bg-[var(--color-primary)] text-white font-extrabold text-sm hover:bg-[var(--color-primary-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {loading
              ? <><RefreshCw className="w-4 h-4 animate-spin" /> Cargando…</>
              : <><BarChart2 className="w-4 h-4" /> Ver estadísticas</>
            }
          </button>
        </div>
      </div>
 
      {/* Error */}
      {error && (
        <div className="rounded-[var(--radius-xl)] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 flex items-center gap-2">
          <span>{error}</span>
          <button
            onClick={handleApply}
            className="ml-auto flex items-center gap-1 text-amber-700 hover:text-amber-900 font-extrabold text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reintentar
          </button>
        </div>
      )}
 
      {/* Empty: no complexes */}
      {!loadingComplexes && complexOptions.length === 0 && (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-2xl)] p-10 flex flex-col items-center gap-3 text-center">
          <Building2 className="w-10 h-10 text-[var(--color-muted)]" />
          <p className="font-extrabold text-[var(--color-text)]">Sin complejos registrados</p>
          <p className="text-sm text-[var(--color-text-3)] max-w-xs">
            Registra al menos un complejo para ver sus estadísticas de uso.
          </p>
        </div>
      )}
 
      {complexOptions.length > 0 && (
        <>
          {/* Stat chips */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatChip label="Total Reservas" value={loading ? '—' : totalBookings} color="bg-[var(--color-primary)]" />
            <StatChip label={`Promedio (${modeLabel})`} value={loading ? '—' : average} color="bg-gradient-to-br from-blue-500 to-blue-400" />
            <StatChip label="Canchas Top" value={loading ? '—' : (scope === 'complex' ? fieldOptions.length : 0)} color="bg-gradient-to-br from-purple-500 to-purple-400" />
          </div>
 
          {/* Chart + side panel */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-2xl)] p-6">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <RefreshCw className="w-6 h-6 text-[var(--color-primary)] animate-spin" />
                  <p className="text-sm text-[var(--color-text-3)] font-semibold">Cargando estadísticas…</p>
                </div>
              ) : (
                <UsageBarChart usage={usagePoints} mode={mode} title={chartTitle} subtitle={chartSubtitle} />
              )}
            </div>
 
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-2xl)] p-6 space-y-4">
              {scope === 'field' ? (
                <>
                  <div className="flex items-center gap-2">
                    <CircleDot className="w-4 h-4 text-[var(--color-primary)]" />
                    <p className="font-extrabold text-[var(--color-text)]">Análisis Individual</p>
                  </div>
                  <div className="bg-[var(--color-surf2)] rounded-[var(--radius-lg)] px-4 py-3">
                    <p className="text-xs text-[var(--color-text-3)] font-bold mb-0.5">Cancha Seleccionada</p>
                    <p className="font-extrabold text-[var(--color-primary)]">{selectedFieldName ?? '—'}</p>
                  </div>
                  <div className="bg-[var(--color-primary)] rounded-[var(--radius-xl)] p-4">
                    <p className="text-[10px] font-extrabold tracking-widest text-white/70 uppercase mb-1">Total Reservas</p>
                    <p className="text-4xl font-extrabold text-white leading-none">{loading ? '—' : totalBookings}</p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-500 to-blue-400 rounded-[var(--radius-xl)] p-4">
                    <p className="text-[10px] font-extrabold tracking-widest text-white/70 uppercase mb-1">Promedio</p>
                    <p className="text-4xl font-extrabold text-white leading-none">{loading ? '—' : average}</p>
                  </div>
                  <p className="text-xs text-[var(--color-text-3)] bg-[var(--color-surf2)] rounded-[var(--radius-lg)] px-3 py-2">
                    Estás viendo estadísticas de una cancha individual. Cambia a "Todas las canchas" para ver el ranking.
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-[var(--color-primary)]" />
                    <p className="font-extrabold text-[var(--color-text)]">Top Canchas</p>
                  </div>
                  {loading ? (
                    <div className="flex items-center justify-center py-10">
                      <RefreshCw className="w-5 h-5 text-[var(--color-primary)] animate-spin" />
                    </div>
                  ) : (
                    <TopSlots fields={topSlots} />
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
 
export default AdminReports;
 