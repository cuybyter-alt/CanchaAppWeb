import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ChevronRight, Clock, Ban, Pencil, Zap, Calendar, X,
  Loader2, AlertCircle, Plus, Trash2, Info, CircleDot,
} from 'lucide-react';
import ApiClient from '../../services/ApiClient';
import schedulingService from '../../services/SchedulingService';
import type { FieldSchedule } from '../../services/SchedulingService';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DayConfig {
  isOpen: boolean;
  openingTime: string;  // "HH:mm"
  closingTime: string;  // "HH:mm"
  slotDuration: number;
  pricings: PricingRow[];
}

interface PricingRow {
  id: string;
  startTime: string;
  endTime: string;
  price: string;
}

interface ApiResponse<T> { data: T; }

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS_SHORT = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
const DAYS_FULL  = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const SLOT_DURATIONS = [30, 45, 60, 90, 120];

const DEFAULT_CONFIG: DayConfig = {
  isOpen: true,
  openingTime: '06:00',
  closingTime: '22:00',
  slotDuration: 60,
  pricings: [],
};

const QUICK_PRESETS = [
  { label: 'Toda la semana', days: [0, 1, 2, 3, 4, 5, 6] },
  { label: 'Lunes a Jueves', days: [0, 1, 2, 3] },
  { label: 'Viernes', days: [4] },
  { label: 'Fin de semana', days: [5, 6] },
  { label: 'Lunes a Viernes', days: [0, 1, 2, 3, 4] },
];

const SHORTCUT_PRESETS = [
  { label: 'Lun-Jue', days: [0, 1, 2, 3] },
  { label: 'Viernes', days: [4] },
  { label: 'Fin de Semana', days: [5, 6] },
  { label: 'Toda la Semana', days: [0, 1, 2, 3, 4, 5, 6] },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function to12h(hhmm: string): string {
  const parts = hhmm.split(':');
  const h = parseInt(parts[0], 10);
  const m = parts[1] ?? '00';
  const period = h >= 12 ? 'p.m.' : 'a.m.';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m} ${period}`;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
}

function timeOptions(): { value: string; label: string }[] {
  const opts: { value: string; label: string }[] = [];
  for (let h = 0; h < 24; h++) {
    for (const minVal of [0, 30]) {
      const hStr = String(h).padStart(2, '0');
      const mStr = String(minVal).padStart(2, '0');
      const value = `${hStr}:${mStr}`;
      opts.push({ value, label: to12h(value) });
    }
  }
  return opts;
}

const TIME_OPTIONS = timeOptions();

function scheduleToConfig(s: FieldSchedule): DayConfig {
  return {
    isOpen: true,
    openingTime: s.opening_time.slice(0, 5),
    closingTime: s.closing_time.slice(0, 5),
    slotDuration: s.slot_duration_minutes,
    pricings: s.pricings.map(p => ({
      id: p.pricing_id,
      startTime: p.start_time.slice(0, 5),
      endTime: p.end_time.slice(0, 5),
      price: String(p.price),
    })),
  };
}

// ─── Shared select class ──────────────────────────────────────────────────────

const selectCls = 'w-full px-3 py-2.5 rounded-[var(--radius-lg)] border border-[var(--color-border)] text-sm font-bold text-[var(--color-text)] bg-white outline-none focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_var(--color-primary-glow)]';

// ─── PricingSection ──────────────────────────────────────────────────────────

function PricingSection({ pricings, onChange, scheduleStart, scheduleEnd }: {
  pricings: PricingRow[];
  onChange: (rows: PricingRow[]) => void;
  scheduleStart: string;
  scheduleEnd: string;
}) {
  const schedStartMin = toMinutes(scheduleStart);
  const schedEndMin = toMinutes(scheduleEnd);

  // Times within the operating window
  const rangeOptions = TIME_OPTIONS.filter(o => {
    const t = toMinutes(o.value);
    return t >= schedStartMin && t <= schedEndMin;
  });

  // Start times for a row: within range, not inside any OTHER row's [start, end)
  const startOptionsForRow = (rowId: string) => {
    const others = pricings.filter(r => r.id !== rowId);
    return rangeOptions.filter(o => {
      const t = toMinutes(o.value);
      if (t >= schedEndMin) return false;
      return !others.some(r => toMinutes(r.startTime) <= t && t < toMinutes(r.endTime));
    });
  };

  // End times for a row: after its own start, up to the next other row's start (or scheduleEnd)
  const endOptionsForRow = (rowId: string, startTime: string) => {
    const startMin = toMinutes(startTime);
    const others = pricings.filter(r => r.id !== rowId);
    const nextBarrier = others
      .map(r => toMinutes(r.startTime))
      .filter(t => t > startMin)
      .reduce((min, t) => Math.min(min, t), schedEndMin);
    return rangeOptions.filter(o => {
      const t = toMinutes(o.value);
      return t > startMin && t <= nextBarrier;
    });
  };

  // First free 30-min slot within the schedule range
  const firstFreeStart = (): string | null => {
    for (const opt of rangeOptions) {
      const t = toMinutes(opt.value);
      if (t >= schedEndMin) break;
      if (!pricings.some(r => toMinutes(r.startTime) <= t && t < toMinutes(r.endTime))) return opt.value;
    }
    return null;
  };

  const schedDuration = Math.max(1, schedEndMin - schedStartMin);
  const totalMin = pricings.reduce((acc, row) => acc + Math.max(0, toMinutes(row.endTime) - toMinutes(row.startTime)), 0);
  const covered = Math.min(100, Math.round((totalMin / schedDuration) * 100));

  const addRow = () => {
    const freeStart = firstFreeStart();
    if (!freeStart) return;
    const freeStartMin = toMinutes(freeStart);
    const nextBarrier = pricings
      .map(r => toMinutes(r.startTime))
      .filter(t => t > freeStartMin)
      .reduce((min, t) => Math.min(min, t), schedEndMin);
    const freeEnd = rangeOptions.find(o => toMinutes(o.value) === nextBarrier)?.value ?? scheduleEnd;
    onChange([...pricings, { id: `new-${Date.now()}`, startTime: freeStart, endTime: freeEnd, price: '' }]);
  };

  const hasRoom = firstFreeStart() !== null;

  const removeRow = (id: string) => onChange(pricings.filter(r => r.id !== id));

  const updateRow = (id: string, key: keyof PricingRow, value: string) =>
    onChange(pricings.map(r => r.id === id ? { ...r, [key]: value } : r));

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-extrabold text-[var(--color-text)] flex items-center gap-1.5">
          <span className="text-[var(--color-primary)]">$</span> Tarifas por Horario
        </p>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
            covered >= 100 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
          }`}>
            {covered}% CUBIERTO
          </span>
        </div>
      </div>
      <p className="text-[10px] text-[var(--color-text-3)] -mt-2">Configura precios distintos según la hora del día</p>

      {pricings.map(row => (
        <div key={row.id} className="flex items-center gap-2">
          <select
            value={row.startTime}
            onChange={e => updateRow(row.id, 'startTime', e.target.value)}
            className="flex-1 px-2.5 py-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] text-xs font-bold text-[var(--color-text)] bg-white outline-none focus:border-[var(--color-primary)]"
          >
            {startOptionsForRow(row.id).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <span className="text-[var(--color-text-3)] font-extrabold text-xs flex-shrink-0">—</span>
          <select
            value={row.endTime}
            onChange={e => updateRow(row.id, 'endTime', e.target.value)}
            className="flex-1 px-2.5 py-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] text-xs font-bold text-[var(--color-text)] bg-white outline-none focus:border-[var(--color-primary)]"
          >
            {endOptionsForRow(row.id, row.startTime).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <input
            type="number"
            min="0"
            value={row.price}
            onChange={e => updateRow(row.id, 'price', e.target.value)}
            placeholder="Precio"
            className="w-24 px-2.5 py-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] text-xs font-bold text-[var(--color-text)] bg-white outline-none focus:border-[var(--color-primary)]"
          />
          <button
            type="button"
            onClick={() => removeRow(row.id)}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[var(--color-accent-tint)] transition-colors flex-shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5 text-[var(--color-accent)]" />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addRow}
        disabled={!hasRoom}
        className="w-full py-2.5 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] text-xs font-extrabold text-[var(--color-text-3)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-[var(--color-border)] disabled:hover:text-[var(--color-text-3)]"
      >
        <Plus className="w-3.5 h-3.5" /> {hasRoom ? 'Agregar Rango de Precio' : 'Horario completo'}
      </button>
    </div>
  );
}

// ─── DayCard ─────────────────────────────────────────────────────────────────

function DayCard({ dayLabel, schedule, onEdit }: {
  dayLabel: string;
  schedule?: FieldSchedule;
  onEdit: () => void;
}) {
  const isOpen = !!schedule;
  return (
    <div className="relative bg-white rounded-[var(--radius-xl)] border border-[var(--color-border)] p-3 flex flex-col items-center gap-1.5 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-all min-h-[110px]">
      <button
        onClick={onEdit}
        className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center hover:bg-[var(--color-primary-tint)] transition-colors"
        title="Configurar"
      >
        <Pencil className="w-3 h-3 text-[var(--color-primary)]" />
      </button>
      <span className="text-[9px] font-extrabold uppercase tracking-widest text-[var(--color-text-3)] mt-1">{dayLabel}</span>

      {isOpen ? (
        <>
          <div className="w-8 h-8 rounded-full bg-[var(--color-primary-tint)] flex items-center justify-center">
            <Clock className="w-4 h-4 text-[var(--color-primary)]" />
          </div>
          <div className="text-center leading-tight">
            <p className="text-[9px] font-extrabold text-[var(--color-primary)]">{to12h(schedule.opening_time.slice(0, 5))}</p>
            <p className="text-[9px] text-[var(--color-text-3)]">—</p>
            <p className="text-[9px] font-extrabold text-[var(--color-primary)]">{to12h(schedule.closing_time.slice(0, 5))}</p>
          </div>
        </>
      ) : (
        <>
          <div className="w-8 h-8 rounded-full bg-[var(--color-surf2)] flex items-center justify-center">
            <Ban className="w-4 h-4 text-[var(--color-muted)]" />
          </div>
          <span className="text-[9px] font-extrabold uppercase tracking-widest text-[var(--color-muted)]">CERRADO</span>
        </>
      )}
    </div>
  );
}

// ─── DayConfigDialog ─────────────────────────────────────────────────────────

function DayConfigDialog({ dayLabel, initialConfig, onSave, onCancel, onApplyAll, onDelete, saving }: {
  dayLabel: string;
  initialConfig: DayConfig;
  onSave: (cfg: DayConfig) => void;
  onCancel: () => void;
  onApplyAll: (cfg: DayConfig) => void;
  onDelete?: () => void;
  saving: boolean;
}) {
  const [cfg, setCfg] = useState<DayConfig>(initialConfig);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const startPct = (toMinutes(cfg.openingTime) / 1440) * 100;
  const widthPct = Math.max(0, ((toMinutes(cfg.closingTime) - toMinutes(cfg.openingTime)) / 1440) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-[var(--radius-2xl)] shadow-[var(--shadow-2xl)] w-full max-w-md overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[var(--color-text)] px-6 py-5 flex items-center justify-between flex-shrink-0">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--color-text-3)] mb-0.5">Configurar Día</p>
            <h3 className="text-white font-extrabold text-xl leading-tight">{dayLabel}</h3>
          </div>
          <button onClick={onCancel} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Toggle */}
          <div className="flex items-center justify-between p-4 rounded-[var(--radius-xl)] bg-[var(--color-primary-tint)] border border-[var(--color-primary)]/20">
            <div>
              <p className="font-extrabold text-[var(--color-text)] text-sm">Día disponible</p>
              <p className="text-xs text-[var(--color-text-3)]">La cancha estará disponible este día</p>
            </div>
            <button
              type="button"
              onClick={() => setCfg(p => ({ ...p, isOpen: !p.isOpen }))}
              className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${cfg.isOpen ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${cfg.isOpen ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {!cfg.isOpen && onDelete && (
            <div className="flex items-center gap-2 p-3 rounded-[var(--radius-lg)] bg-amber-50 border border-amber-200">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <p className="text-xs font-bold text-amber-700">Al guardar se eliminará el horario existente de este día.</p>
            </div>
          )}

          {cfg.isOpen && (
            <>
              {/* Horario de Operación */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-[var(--color-text)] text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[var(--color-primary)]" /> Horario de Operación
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-[var(--color-text-3)] mb-1 uppercase tracking-wide">Apertura</label>
                    <select value={cfg.openingTime} onChange={e => setCfg(p => ({ ...p, openingTime: e.target.value }))} className={selectCls}>
                      {TIME_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-[var(--color-text-3)] mb-1 uppercase tracking-wide">Cierre</label>
                    <select value={cfg.closingTime} onChange={e => setCfg(p => ({ ...p, closingTime: e.target.value }))} className={selectCls}>
                      {TIME_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>
                {/* Range bar */}
                <div className="space-y-1.5 p-3 rounded-[var(--radius-lg)] bg-[var(--color-surf2)]">
                  <p className="text-[10px] font-bold text-[var(--color-text-3)] text-center">
                    Rango de {cfg.openingTime} a {cfg.closingTime}
                  </p>
                  <div className="relative h-2 bg-[var(--color-border)] rounded-full overflow-hidden">
                    <div
                      className="absolute top-0 h-full bg-[var(--color-primary)] rounded-full transition-all duration-300"
                      style={{ left: `${startPct}%`, width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Duración de Bloques */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-[var(--color-text)] text-sm flex items-center gap-2">
                  <span className="text-[var(--color-primary)] text-base">⏱</span> Duración de Bloques
                </h4>
                <div className="flex flex-wrap gap-2">
                  {SLOT_DURATIONS.map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setCfg(p => ({ ...p, slotDuration: d }))}
                      className={`px-4 py-2 rounded-full text-sm font-extrabold border transition-all active:scale-95 ${
                        cfg.slotDuration === d
                          ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-[var(--shadow-primary)]'
                          : 'bg-white border-[var(--color-border)] text-[var(--color-text-2)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]'
                      }`}
                    >
                      {d} min
                    </button>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="h-[1px] bg-[var(--color-border)]" />

              {/* Pricing */}
              <PricingSection
                pricings={cfg.pricings}
                onChange={rows => setCfg(p => ({ ...p, pricings: rows }))}
                scheduleStart={cfg.openingTime}
                scheduleEnd={cfg.closingTime}
              />
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-5 border-t border-[var(--color-border)] space-y-2.5">
          <button
            type="button"
            onClick={() => onApplyAll(cfg)}
            className="w-full py-2.5 rounded-[var(--radius-lg)] border border-[var(--color-border)] text-sm font-extrabold text-[var(--color-text-2)] hover:bg-[var(--color-surf2)] transition-colors flex items-center justify-center gap-2"
          >
            <Calendar className="w-4 h-4" /> Aplicar a Todos los Días
          </button>
          {onDelete && (
            confirmDelete ? (
              <div className="flex items-center gap-2 p-3 rounded-[var(--radius-lg)] bg-red-50 border border-red-200">
                <p className="text-xs font-bold text-red-700 flex-1">¿Confirmar eliminación?</p>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-1.5 rounded-[var(--radius-lg)] border border-[var(--color-border)] text-xs font-extrabold text-[var(--color-text-2)] hover:bg-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={onDelete}
                  className="px-3 py-1.5 rounded-[var(--radius-lg)] bg-red-600 text-white text-xs font-extrabold hover:bg-red-700 transition-colors"
                >
                  Sí, eliminar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="w-full py-2.5 rounded-[var(--radius-lg)] border border-red-300 text-sm font-extrabold text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Eliminar Horario
              </button>
            )
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-[var(--radius-lg)] border border-[var(--color-border)] text-sm font-extrabold text-[var(--color-text-2)] hover:bg-[var(--color-surf2)] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                if (cfg.isOpen && toMinutes(cfg.openingTime) >= toMinutes(cfg.closingTime)) {
                  toast.error('La hora de cierre debe ser posterior a la de apertura.');
                  return;
                }
                const invalidPricing = cfg.pricings.find(
                  p => p.price.trim() !== '' && toMinutes(p.startTime) >= toMinutes(p.endTime),
                );
                if (invalidPricing) {
                  toast.error('En las tarifas, el fin debe ser posterior al inicio.');
                  return;
                }
                const sortedP = [...cfg.pricings.filter(p => p.price.trim() !== '')]
                  .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
                for (let i = 0; i < sortedP.length - 1; i++) {
                  if (toMinutes(sortedP[i].endTime) > toMinutes(sortedP[i + 1].startTime)) {
                    toast.error('No es posible tener 2 precios en la misma zona horaria.');
                    return;
                  }
                }
                onSave(cfg);
              }}
              disabled={saving}
              className="flex-1 py-2.5 rounded-[var(--radius-lg)] bg-[var(--color-primary)] text-white text-sm font-extrabold shadow-[var(--shadow-primary)] hover:bg-[var(--color-primary-dark)] transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── QuickConfigModal ─────────────────────────────────────────────────────────

function QuickConfigModal({ initialDays, initialConfig, onApply, onCancel, applying }: {
  initialDays?: number[];
  initialConfig?: Partial<DayConfig>;
  onApply: (days: number[], cfg: DayConfig) => void;
  onCancel: () => void;
  applying: boolean;
}) {
  const [selectedDays, setSelectedDays] = useState<number[]>(initialDays ?? []);
  const [cfg, setCfg] = useState<DayConfig>({ ...DEFAULT_CONFIG, ...initialConfig });
  const [priceMode, setPriceMode] = useState<'single' | 'range'>('single');
  const [singlePrice, setSinglePrice] = useState('');

  const sortedSel = [...selectedDays].sort((a, b) => a - b);

  const isPresetActive = (days: number[]) =>
    JSON.stringify(sortedSel) === JSON.stringify([...days].sort((a, b) => a - b));

  const startPct = (toMinutes(cfg.openingTime) / 1440) * 100;
  const widthPct = Math.max(0, ((toMinutes(cfg.closingTime) - toMinutes(cfg.openingTime)) / 1440) * 100);

  const toggleDay = (d: number) =>
    setSelectedDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-[var(--radius-2xl)] shadow-[var(--shadow-2xl)] w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[var(--color-text)] px-6 py-5 flex items-center justify-between flex-shrink-0">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--color-text-3)] mb-0.5">Configuración Rápida</p>
            <h3 className="text-white font-extrabold text-xl leading-tight">Aplicar a Múltiples Días</h3>
          </div>
          <button onClick={onCancel} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Days selector */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-[var(--color-text)] text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[var(--color-primary)]" /> Días a Configurar
            </h4>
            <div className="flex flex-wrap gap-2">
              {QUICK_PRESETS.map(p => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setSelectedDays(p.days)}
                  className={`px-3 py-1.5 rounded-[var(--radius-full)] text-xs font-extrabold border transition-all active:scale-95 ${
                    isPresetActive(p.days)
                      ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white'
                      : 'bg-white border-[var(--color-border)] text-[var(--color-text-2)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5">
              {DAYS_SHORT.map((d, i) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(i)}
                  className={`flex-1 py-2.5 rounded-[var(--radius-lg)] text-[10px] font-extrabold uppercase tracking-wide transition-all active:scale-95 ${
                    selectedDays.includes(i)
                      ? 'bg-[var(--color-primary)] text-white shadow-[var(--shadow-primary)]'
                      : 'bg-[var(--color-surf2)] text-[var(--color-text-3)] hover:bg-[var(--color-primary-tint)] hover:text-[var(--color-primary)]'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Horario de Operación */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-[var(--color-text)] text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-[var(--color-primary)]" /> Horario de Operación
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-extrabold text-[var(--color-text-3)] mb-1 uppercase tracking-wide">Apertura</label>
                <select value={cfg.openingTime} onChange={e => setCfg(p => ({ ...p, openingTime: e.target.value }))} className={selectCls}>
                  {TIME_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-extrabold text-[var(--color-text-3)] mb-1 uppercase tracking-wide">Cierre</label>
                <select value={cfg.closingTime} onChange={e => setCfg(p => ({ ...p, closingTime: e.target.value }))} className={selectCls}>
                  {TIME_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1.5 p-3 rounded-[var(--radius-lg)] bg-[var(--color-surf2)]">
              <p className="text-[10px] font-bold text-[var(--color-text-3)] text-center">
                Rango de {cfg.openingTime} a {cfg.closingTime}
              </p>
              <div className="relative h-2 bg-[var(--color-border)] rounded-full overflow-hidden">
                <div
                  className="absolute top-0 h-full bg-[var(--color-primary)] rounded-full transition-all duration-300"
                  style={{ left: `${startPct}%`, width: `${widthPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Duración de Bloques */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-[var(--color-text)] text-sm flex items-center gap-2">
              <span className="text-[var(--color-primary)] text-base">⏱</span> Duración de Bloques
            </h4>
            <div className="flex flex-wrap gap-2">
              {SLOT_DURATIONS.map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setCfg(p => ({ ...p, slotDuration: d }))}
                  className={`px-4 py-2 rounded-full text-sm font-extrabold border transition-all active:scale-95 ${
                    cfg.slotDuration === d
                      ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-[var(--shadow-primary)]'
                      : 'bg-white border-[var(--color-border)] text-[var(--color-text-2)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]'
                  }`}
                >
                  {d} min
                </button>
              ))}
            </div>
          </div>

          {/* Configuración de Precios */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-[var(--color-text)] text-sm flex items-center gap-2">
              <span className="text-[var(--color-primary)]">$</span> Configuración de Precios
            </h4>
            <div className="flex rounded-[var(--radius-lg)] overflow-hidden border border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => setPriceMode('single')}
                className={`flex-1 py-2.5 text-sm font-extrabold transition-colors ${priceMode === 'single' ? 'bg-[var(--color-primary)] text-white' : 'bg-white text-[var(--color-text-2)] hover:bg-[var(--color-surf2)]'}`}
              >
                Precio Único
              </button>
              <button
                type="button"
                onClick={() => setPriceMode('range')}
                className={`flex-1 py-2.5 text-sm font-extrabold transition-colors ${priceMode === 'range' ? 'bg-[var(--color-primary)] text-white' : 'bg-white text-[var(--color-text-2)] hover:bg-[var(--color-surf2)]'}`}
              >
                Por Horario
              </button>
            </div>
            {priceMode === 'single' && (
              <div>
                <label className="block text-[10px] font-extrabold text-[var(--color-text-3)] mb-1 uppercase tracking-wide">Precio por Hora (COP)</label>
                <input
                  type="number"
                  min="0"
                  value={singlePrice}
                  onChange={e => setSinglePrice(e.target.value)}
                  placeholder="80000"
                  className="w-full px-4 py-2.5 rounded-[var(--radius-lg)] border border-[var(--color-border)] text-sm font-bold text-[var(--color-text)] bg-white outline-none focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_var(--color-primary-glow)] placeholder:text-[var(--color-muted)]"
                />
              </div>
            )}
            {priceMode === 'range' && (
              <PricingSection
                pricings={cfg.pricings}
                onChange={rows => setCfg(p => ({ ...p, pricings: rows }))}
                scheduleStart={cfg.openingTime}
                scheduleEnd={cfg.closingTime}
              />
            )}
          </div>

          {/* Resumen */}
          <div className="flex items-start gap-2.5 p-3 rounded-[var(--radius-xl)] bg-[var(--color-primary-tint)] border border-[var(--color-primary)]/20">
            <Info className="w-4 h-4 text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
            <p className="text-xs font-bold text-[var(--color-primary-dark)]">
              Se configurarán{' '}
              <strong>{selectedDays.length} día{selectedDays.length !== 1 ? 's' : ''}</strong>{' '}
              con horario de <strong>{cfg.openingTime}</strong> a <strong>{cfg.closingTime}</strong>,{' '}
              bloques de <strong>{cfg.slotDuration} minutos</strong>.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-5 pb-5 pt-4 border-t border-[var(--color-border)] flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-[var(--radius-lg)] border border-[var(--color-border)] text-sm font-extrabold text-[var(--color-text-2)] hover:bg-[var(--color-surf2)] transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              if (toMinutes(cfg.openingTime) >= toMinutes(cfg.closingTime)) {
                toast.error('La hora de cierre debe ser posterior a la de apertura.');
                return;
              }
              const finalCfg = { ...cfg };
              if (priceMode === 'single' && singlePrice.trim()) {
                finalCfg.pricings = [{
                  id: `single-${Date.now()}`,
                  startTime: cfg.openingTime,
                  endTime: cfg.closingTime,
                  price: singlePrice,
                }];
              }
              if (priceMode === 'range') {
                const sortedP = [...finalCfg.pricings.filter(p => p.price.trim() !== '')]
                  .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
                for (let i = 0; i < sortedP.length - 1; i++) {
                  if (toMinutes(sortedP[i].endTime) > toMinutes(sortedP[i + 1].startTime)) {
                    toast.error('No es posible tener 2 precios en la misma zona horaria.');
                    return;
                  }
                }
              }
              onApply(selectedDays, finalCfg);
            }}
            disabled={applying || selectedDays.length === 0}
            className="flex-1 py-2.5 rounded-[var(--radius-lg)] bg-[var(--color-primary)] text-white text-sm font-extrabold shadow-[var(--shadow-primary)] hover:bg-[var(--color-primary-dark)] transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Aplicar a {selectedDays.length} Día{selectedDays.length !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const AdminFieldSchedule: React.FC = () => {
  const { complexId, fieldId } = useParams<{ complexId: string; fieldId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const stateNames = location.state as { fieldName?: string; complexName?: string } | null;

  const [fieldName, setFieldName] = useState(stateNames?.fieldName ?? '');
  const [complexName, setComplexName] = useState(stateNames?.complexName ?? '');
  const [schedules, setSchedules] = useState<FieldSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [showQuick, setShowQuick] = useState(false);
  const [quickInitialDays, setQuickInitialDays] = useState<number[]>([]);
  const [quickInitialConfig, setQuickInitialConfig] = useState<Partial<DayConfig> | undefined>(undefined);
  const [applying, setApplying] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fetchedRef = useRef(false);

  // Fetch names if not passed via location.state
  useEffect(() => {
    if (!complexId || (fieldName && complexName)) return;
    ApiClient.get<ApiResponse<{ name: string; fields?: { field_id: string; name: string }[] }>>(`/complexes/${complexId}/`)
      .then(res => {
        const d = res.data as { name: string; fields?: { field_id: string; name: string }[] };
        if (!complexName) setComplexName(d.name ?? '');
        if (!fieldName && fieldId && d.fields) {
          const f = d.fields.find(x => x.field_id === fieldId);
          if (f) setFieldName(f.name);
        }
      })
      .catch(() => {}); // best effort
  }, [complexId, fieldId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadSchedules = useCallback(async () => {
    if (!complexId || !fieldId) return;
    setLoading(true);
    setError(null);
    try {
      const all = await schedulingService.getComplexSchedules(complexId);
      setSchedules(all.filter(s => s.field_id === fieldId));
    } catch {
      setError('Ocurrió un error inesperado. Intenta de nuevo más tarde.');
    } finally {
      setLoading(false);
    }
  }, [complexId, fieldId]);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    loadSchedules();
  }, [loadSchedules]);

  const scheduleByDay = (dayIdx: number): FieldSchedule | undefined =>
    schedules.find(s => s.day_of_week === dayIdx);

  // Reconcile pricings: delete removed, update changed, create new
  const reconcilePricings = async (scheduleId: string, originalPricings: FieldSchedule['pricings'], newRows: PricingRow[]) => {
    const originalIds = new Set(originalPricings.map(p => p.pricing_id));
    const keptIds = new Set(newRows.filter(r => originalIds.has(r.id)).map(r => r.id));

    const toDelete = originalPricings.filter(p => !keptIds.has(p.pricing_id));
    const toUpdate = newRows.filter(r => originalIds.has(r.id) && r.price.trim() !== '');
    const toCreate = newRows.filter(r => !originalIds.has(r.id) && r.price.trim() !== '');

    const pricingResults = await Promise.allSettled([
      ...toDelete.map(p => schedulingService.deleteSchedulePricing(p.pricing_id)),
      ...toUpdate.map(r => schedulingService.updateSchedulePricing(r.id, { start_time: r.startTime, end_time: r.endTime, price: r.price })),
      ...toCreate.map(r => schedulingService.createSchedulePricing(scheduleId, { start_time: r.startTime, end_time: r.endTime, price: r.price })),
    ]);
    const pricingFailed = pricingResults.filter(r => r.status === 'rejected').length;
    if (pricingFailed > 0) {
      toast.warning(`El horario se guardó, pero ${pricingFailed} tarifa${pricingFailed !== 1 ? 's' : ''} no se pudo${pricingFailed !== 1 ? 'ieron' : ''} actualizar.`);
    }
  };

  const handleSaveDay = async (dayIdx: number, cfg: DayConfig) => {
    if (!complexId || !fieldId) return;
    setSaving(true);
    try {
      const existing = scheduleByDay(dayIdx);

      if (!cfg.isOpen) {
        if (existing) {
          await schedulingService.deleteSchedule(existing.schedule_id);
          toast.success(`Horario del ${DAYS_FULL[dayIdx]} eliminado`);
          fetchedRef.current = false;
          await loadSchedules();
          fetchedRef.current = true;
        }
        setEditingDay(null);
        return;
      }

      let scheduleId: string;

      if (existing) {
        await schedulingService.updateSchedule(existing.schedule_id, {
          opening_time: `${cfg.openingTime}:00`,
          closing_time: `${cfg.closingTime}:00`,
          slot_duration_minutes: cfg.slotDuration,
        });
        scheduleId = existing.schedule_id;
        await reconcilePricings(scheduleId, existing.pricings, cfg.pricings);
      } else {
        const created = await schedulingService.createSchedule(complexId, {
          field_id: fieldId,
          day_of_week: dayIdx,
          opening_time: `${cfg.openingTime}:00`,
          closing_time: `${cfg.closingTime}:00`,
          slot_duration_minutes: cfg.slotDuration,
        });
        scheduleId = created.schedule_id;
        const validPricings = cfg.pricings.filter(p => p.price.trim() !== '');
        if (validPricings.length > 0) {
          await Promise.allSettled(
            validPricings.map(p =>
              schedulingService.createSchedulePricing(scheduleId, { start_time: p.startTime, end_time: p.endTime, price: p.price }),
            ),
          );
        }
      }

      toast.success(`Horario del ${DAYS_FULL[dayIdx]} guardado`);
      setEditingDay(null);
      fetchedRef.current = false;
      await loadSchedules();
      fetchedRef.current = true;
    } catch {
      toast.error('No se pudo guardar el horario. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const handleApplyQuick = async (days: number[], cfg: DayConfig) => {
    if (!complexId || !fieldId || days.length === 0) return;
    setApplying(true);
    const validPricings = cfg.pricings.filter(p => p.price.trim() !== '');
    const results = await Promise.allSettled(
      days.map(async day => {
        const existing = scheduleByDay(day);
        if (existing) {
          await schedulingService.updateSchedule(existing.schedule_id, {
            opening_time: `${cfg.openingTime}:00`,
            closing_time: `${cfg.closingTime}:00`,
            slot_duration_minutes: cfg.slotDuration,
          });
          await reconcilePricings(existing.schedule_id, existing.pricings, cfg.pricings);
        } else {
          const created = await schedulingService.createSchedule(complexId, {
            field_id: fieldId,
            day_of_week: day,
            opening_time: `${cfg.openingTime}:00`,
            closing_time: `${cfg.closingTime}:00`,
            slot_duration_minutes: cfg.slotDuration,
          });
          if (validPricings.length > 0) {
            await Promise.allSettled(
              validPricings.map(p =>
                schedulingService.createSchedulePricing(created.schedule_id, { start_time: p.startTime, end_time: p.endTime, price: p.price }),
              ),
            );
          }
        }
      }),
    );
    const failedDayNames = results
      .map((r, i) => r.status === 'rejected' ? DAYS_SHORT[days[i]] : null)
      .filter((d): d is string => d !== null);
    if (failedDayNames.length > 0) {
      toast.warning(`Error en: ${failedDayNames.join(', ')}. El resto se configuró correctamente.`);
    } else {
      toast.success(`${days.length} día${days.length !== 1 ? 's' : ''} configurado${days.length !== 1 ? 's' : ''} exitosamente`);
    }
    setShowQuick(false);
    setApplying(false);
    fetchedRef.current = false;
    await loadSchedules();
    fetchedRef.current = true;
  };

  const handleDeleteDay = async (dayIdx: number) => {
    const existing = scheduleByDay(dayIdx);
    if (!existing) return;
    setDeleting(true);
    try {
      await schedulingService.deleteSchedule(existing.schedule_id);
      toast.success(`Horario del ${DAYS_FULL[dayIdx]} eliminado`);
      setEditingDay(null);
      fetchedRef.current = false;
      await loadSchedules();
      fetchedRef.current = true;
    } catch {
      toast.error('No se pudo eliminar el horario. Intenta de nuevo.');
    } finally {
      setDeleting(false);
    }
  };

  const openQuickWithPreset = (days: number[]) => {
    setQuickInitialDays(days);
    setQuickInitialConfig(undefined);
    setShowQuick(true);
  };

  const openApplyAll = (cfg: DayConfig) => {
    setEditingDay(null);
    setQuickInitialDays([0, 1, 2, 3, 4, 5, 6]);
    setQuickInitialConfig(cfg);
    setShowQuick(true);
  };

  const configuredDays = schedules.length;

  return (
    <div className="p-6 sm:p-8 space-y-6 min-h-full">
      {/* ── Breadcrumb ── */}
      <nav className="flex items-center gap-1.5 text-sm text-[var(--color-text-3)] flex-wrap">
        <button onClick={() => navigate('/admin/complexes')} className="font-extrabold hover:text-[var(--color-primary)] transition-colors">
          Complejos
        </button>
        <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
        <button
          onClick={() => navigate(`/admin/complexes/${complexId}/fields`)}
          className="font-extrabold hover:text-[var(--color-primary)] transition-colors truncate max-w-[160px]"
        >
          {complexName || '…'}
        </button>
        <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="font-extrabold text-[var(--color-text-2)] truncate max-w-[160px]">{fieldName || '…'}</span>
      </nav>

      {/* ── Loading ── */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="w-9 h-9 animate-spin text-[var(--color-primary)]" />
          <p className="text-sm font-extrabold text-[var(--color-text-3)]">Cargando horarios…</p>
        </div>
      )}

      {/* ── Error ── */}
      {!loading && error && (
        <div className="flex items-start gap-3 p-4 rounded-[var(--radius-xl)] bg-[var(--color-accent-tint)] border border-[var(--color-accent)]">
          <AlertCircle className="w-5 h-5 text-[var(--color-accent)] flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-extrabold text-[var(--color-accent)]">Error inesperado</p>
            <p className="text-xs text-[var(--color-text-2)] mt-0.5">{error}</p>
          </div>
          <button
            onClick={() => { fetchedRef.current = false; loadSchedules(); fetchedRef.current = true; }}
            className="text-xs font-extrabold text-[var(--color-primary)] underline underline-offset-2"
          >
            Reintentar
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* ── Field hero card ── */}
          <div className="bg-[var(--color-text)] rounded-[var(--radius-2xl)] px-6 py-5 flex items-center justify-between gap-4 shadow-[var(--shadow-lg)]">
            <div className="flex items-center gap-4">
              <div className="w-[52px] h-[52px] rounded-[var(--radius-xl)] bg-[var(--color-primary)] flex items-center justify-center flex-shrink-0 shadow-[var(--shadow-primary)]">
                <CircleDot className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--color-text-3)] mb-0.5">Configuración de Horarios</p>
                <h1 className="text-white font-extrabold text-xl leading-tight">{fieldName || 'Cancha'}</h1>
                {complexName && <p className="text-[var(--color-text-3)] text-sm mt-0.5">{complexName}</p>}
              </div>
            </div>
            <span className="flex-shrink-0 px-3 py-1.5 rounded-full bg-[var(--color-primary)] text-white text-[10px] font-extrabold uppercase tracking-wider">
              {configuredDays} días configurados
            </span>
          </div>

          {/* ── Quick config button ── */}
          <button
            onClick={() => openQuickWithPreset([])}
            className="w-full py-4 rounded-[var(--radius-2xl)] bg-[var(--color-primary)] text-white font-extrabold text-base shadow-[var(--shadow-primary)] hover:bg-[var(--color-primary-dark)] transition-all active:scale-[0.99] flex items-center justify-center gap-2"
          >
            <Zap className="w-5 h-5" /> Configuración Rápida
          </button>

          {/* ── Quick access shortcuts ── */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-extrabold text-[var(--color-text-3)] flex items-center gap-1.5 flex-shrink-0">
              <Zap className="w-3.5 h-3.5" /> Accesos Rápidos:
            </span>
            {SHORTCUT_PRESETS.map(p => (
              <button
                key={p.label}
                onClick={() => openQuickWithPreset(p.days)}
                className="px-3 py-1.5 rounded-[var(--radius-full)] border border-[var(--color-border)] bg-white text-xs font-extrabold text-[var(--color-text-2)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-all active:scale-95"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* ── Weekly schedule card ── */}
          <div className="bg-white rounded-[var(--radius-2xl)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] p-5 space-y-4">
            <h2 className="font-extrabold text-[var(--color-text)] flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[var(--color-primary)]" /> Horarios de la Semana
            </h2>
            <div className="grid grid-cols-7 gap-2">
              {DAYS_SHORT.map((day, idx) => (
                <DayCard
                  key={day}
                  dayLabel={day}
                  schedule={scheduleByDay(idx)}
                  onEdit={() => setEditingDay(idx)}
                />
              ))}
            </div>
            {/* Legend */}
            <div className="flex items-center gap-5 pt-1">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full border-2 border-[var(--color-primary)] bg-white inline-block" />
                <span className="text-xs font-bold text-[var(--color-text-3)]">Disponible</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full border-2 border-[var(--color-muted)] bg-white inline-block" />
                <span className="text-xs font-bold text-[var(--color-text-3)]">Cerrado</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Day config dialog ── */}
      {editingDay !== null && (
        <DayConfigDialog
          dayLabel={DAYS_FULL[editingDay]}
          initialConfig={scheduleByDay(editingDay) ? scheduleToConfig(scheduleByDay(editingDay)!) : DEFAULT_CONFIG}
          onSave={cfg => handleSaveDay(editingDay, cfg)}
          onCancel={() => setEditingDay(null)}
          onApplyAll={openApplyAll}
          onDelete={scheduleByDay(editingDay) ? () => handleDeleteDay(editingDay) : undefined}
          saving={saving || deleting}
        />
      )}

      {/* ── Quick config modal ── */}
      {showQuick && (
        <QuickConfigModal
          initialDays={quickInitialDays}
          initialConfig={quickInitialConfig}
          onApply={handleApplyQuick}
          onCancel={() => setShowQuick(false)}
          applying={applying}
        />
      )}

      {/* ── Help button ── */}
      <button
        className="fixed bottom-6 right-6 w-10 h-10 rounded-full bg-[var(--color-text)] text-white flex items-center justify-center shadow-[var(--shadow-lg)] hover:bg-[var(--color-primary)] transition-colors z-40"
        title="Ayuda"
        onClick={() => toast.info('Configura los horarios de disponibilidad de esta cancha para cada día de la semana.')}
      >
        <span className="font-extrabold text-sm">?</span>
      </button>
    </div>
  );
};

export default AdminFieldSchedule;
