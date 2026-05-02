import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Plus, Target, Building2, ChevronRight, X, Loader2, AlertCircle, Ruler, Users, Wrench, Trash2, Edit3, CheckCircle, MapPin, Calendar } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import ApiClient from '../../services/ApiClient';
import { toast } from 'sonner';
 
// ─── Types ────────────────────────────────────────────────────────────────────
 
interface FieldItem {
  field_id: string;
  complex_id: string;
  name: string;
  status: 'active' | 'maintenance' | 'inactive';
  type: string;
  length: number | null;
  width: number | null;
}
 
interface ComplexDetail {
  complex_id: string;
  name: string;
  address: string | null;
  city: string | null;
  status: string;
  fields: FieldItem[];
  min_price: number | null;
  max_price: number | null;
}
 
interface ApiResponse<T> { data: T; }
 
interface CreateFieldForm { name: string; type: string; capacity: string; length: string; width: string; price: string; amenities: string[]; }
const FORM_EMPTY: CreateFieldForm = { name: '', type: 'futbol_5', capacity: '10', length: '40', width: '20', price: '', amenities: [] };
 
const FIELD_TYPES = [
  { value: 'futbol_5', label: 'Fútbol 5', defaultPlayers: 10 },
  { value: 'futbol_7', label: 'Fútbol 7', defaultPlayers: 14 },
  { value: 'futbol_11', label: 'Fútbol 11', defaultPlayers: 22 },
  { value: 'microfutbol', label: 'Microfútbol', defaultPlayers: 6 },
  { value: 'futsal', label: 'Futsal', defaultPlayers: 10 },
];
 
const TYPE_MAP: Record<string, string> = {
  futbol_5: 'Fútbol 5', futbol_7: 'Fútbol 7', futbol_11: 'Fútbol 11',
  microfutbol: 'Microfútbol', futsal: 'Futsal',
};
 
const TYPE_PLAYERS: Record<string, number> = {
  futbol_5: 10, futbol_7: 14, futbol_11: 22, microfutbol: 6, futsal: 10,
};
 
const AMENITIES_OPTIONS = ['Iluminación', 'Duchas', 'Parqueadero', 'Petos', 'Bar', 'Casilleros', 'Agua', 'Video', 'A/C'];
 
const STATUS_CFG = {
  active:      { label: 'Activa',         cls: 'bg-[var(--color-primary)] text-white' },
  maintenance: { label: 'Mantenimiento',  cls: 'bg-amber-100 text-amber-700' },
  inactive:    { label: 'Inactiva',       cls: 'bg-[var(--color-muted)] text-[var(--color-text-2)]' },
};
 
function fmtPrice(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
}
 
// ─── Confirm Delete ───────────────────────────────────────────────────────────
 
function ConfirmModal({ name, onConfirm, onCancel, deleting }: { name: string; onConfirm: () => void; onCancel: () => void; deleting: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-[var(--radius-2xl)] shadow-[var(--shadow-2xl)] w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-[var(--color-accent-tint)] flex items-center justify-center flex-shrink-0">
            <Trash2 className="w-5 h-5 text-[var(--color-accent)]" />
          </div>
          <div>
            <h3 className="font-extrabold text-[var(--color-text)]">Eliminar cancha</h3>
            <p className="text-xs text-[var(--color-text-3)]">Esta acción no se puede deshacer</p>
          </div>
        </div>
        <p className="text-sm text-[var(--color-text-2)]">
          ¿Seguro que deseas eliminar <strong className="text-[var(--color-text)]">"{name}"</strong>?
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-[var(--radius-lg)] text-sm font-extrabold border border-[var(--color-border)] text-[var(--color-text-2)] hover:bg-[var(--color-surf2)] transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={deleting} className="flex-1 py-2.5 rounded-[var(--radius-lg)] text-sm font-extrabold bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-dark)] transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}
 
// ─── Field Card ───────────────────────────────────────────────────────────────
 
function FieldCard({ f, onDelete, onSchedule }: { f: FieldItem & { _amenities?: string[]; _capacity?: number; _price?: number }; onDelete: () => void; onSchedule: () => void }) {
  const cfg = STATUS_CFG[f.status] ?? STATUS_CFG.inactive;
  const amenities = f._amenities ?? [];
  const capacity = f._capacity ?? TYPE_PLAYERS[f.type] ?? 10;
  const price = f._price ?? null;
 
  return (
    <div className="bg-white rounded-[var(--radius-2xl)] border border-[var(--color-border)] overflow-hidden shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-all duration-200 hover:-translate-y-0.5">
      {/* Card top */}
      <div className="px-5 pt-4 pb-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[var(--color-primary-tint)] flex items-center justify-center flex-shrink-0">
          <Target className="w-5 h-5 text-[var(--color-primary)]" />
        </div>
        <h3 className="font-extrabold text-[var(--color-text)] text-[15px] flex-1 min-w-0 truncate">{f.name}</h3>
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider flex-shrink-0 ${cfg.cls}`}>
          {cfg.label}
        </span>
      </div>
 
      {/* Chips row */}
      <div className="px-5 pb-2 flex flex-wrap gap-1.5">
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--color-surf2)] text-[var(--color-text-2)] text-xs font-bold">
          🏷 {TYPE_MAP[f.type] ?? f.type}
        </span>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--color-surf2)] text-[var(--color-text-2)] text-xs font-bold">
          👥 {capacity} jugadores
        </span>
        {f.length && f.width && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--color-surf2)] text-[var(--color-text-2)] text-xs font-bold">
            <Ruler className="w-3 h-3" /> {f.length}×{f.width}m
          </span>
        )}
      </div>
 
      {/* Amenities */}
      {amenities.length > 0 && (
        <div className="px-5 pb-2 flex flex-wrap gap-1">
          {amenities.map(a => (
            <span key={a} className="px-2 py-0.5 rounded-full bg-[var(--color-primary-tint)] text-[var(--color-primary-dark)] text-[10px] font-extrabold uppercase tracking-wide">
              {a}
            </span>
          ))}
        </div>
      )}
 
      {/* Price */}
      {price != null && (
        <>
          <div className="mx-5 h-[1px] bg-[var(--color-border)] my-2" />
          <div className="px-5 pb-2">
            <span className="text-[var(--color-primary)] font-extrabold text-lg">{fmtPrice(price)}</span>
            <span className="text-[var(--color-text-3)] text-xs font-bold">/hora</span>
          </div>
        </>
      )}
 
      {/* Divider */}
      <div className="mx-5 h-[1px] bg-[var(--color-border)] mt-2" />
 
      {/* Action bar */}
      <div className="px-3 py-2.5 flex gap-0.5">
        <button onClick={onSchedule} className="flex-1 py-1.5 rounded-[var(--radius-lg)] text-xs font-extrabold text-[var(--color-primary)] hover:bg-[var(--color-primary-tint)] transition-colors flex items-center justify-center gap-1">
          <Calendar className="w-3 h-3" /> Horarios
        </button>
        <button className="flex-1 py-1.5 rounded-[var(--radius-lg)] text-xs font-extrabold text-[var(--color-text-2)] hover:bg-[var(--color-surf2)] transition-colors flex items-center justify-center gap-1">
          <Edit3 className="w-3 h-3" /> Editar
        </button>
        <button className="flex-1 py-1.5 rounded-[var(--radius-lg)] text-xs font-extrabold text-[var(--color-text-2)] hover:bg-[var(--color-surf2)] transition-colors flex items-center justify-center gap-1">
          <Wrench className="w-3 h-3" /> Mantenim.
        </button>
        <button
          onClick={onDelete}
          className="flex-1 py-1.5 rounded-[var(--radius-lg)] text-xs font-extrabold text-[var(--color-accent)] hover:bg-[var(--color-accent-tint)] transition-colors flex items-center justify-center gap-1"
        >
          <Trash2 className="w-3 h-3" /> Eliminar
        </button>
      </div>
    </div>
  );
}
 
// ─── Main Page ────────────────────────────────────────────────────────────────
 
type RichField = FieldItem & { _amenities?: string[]; _capacity?: number; _price?: number };
 
const AdminComplexFields: React.FC = () => {
  const { complexId } = useParams<{ complexId: string }>();
  const navigate = useNavigate();
  const [complex, setComplex] = useState<ComplexDetail | null>(null);
  const [fields, setFields] = useState<RichField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [managersCount, setManagersCount] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateFieldForm>(FORM_EMPTY);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof CreateFieldForm, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RichField | null>(null);
  const [deleting, setDeleting] = useState(false);
  const fetchedRef = useRef(false);
 
  const fetchData = useCallback(async () => {
    if (!complexId) return;
    setLoading(true);
    setError(null);
    try {
      const [detailRes, fieldsRes, managersRes] = await Promise.all([
        ApiClient.get<ApiResponse<ComplexDetail>>(`/complexes/${complexId}/`),
        ApiClient.get<ApiResponse<FieldItem[]>>(`/complexes/${complexId}/fields/`),
        ApiClient.get<ApiResponse<unknown[]>>(`/complexes/${complexId}/managers/`).catch(() => ({ data: [] })),
      ]);
      setComplex(detailRes.data as ComplexDetail);
      const rawFields: FieldItem[] = Array.isArray(fieldsRes.data) ? fieldsRes.data : [];
      // Enrich fields with UI data stored in sessionStorage (persists during the session)
      const enriched: RichField[] = rawFields.map(f => {
        const stored = sessionStorage.getItem(`field_ui_${f.field_id}`);
        const ui = stored ? JSON.parse(stored) : {};
        return { ...f, _amenities: ui.amenities ?? [], _capacity: ui.capacity ?? TYPE_PLAYERS[f.type] ?? 10, _price: ui.price ?? null };
      });
      setFields(enriched);
      setManagersCount(Array.isArray(managersRes.data) ? managersRes.data.length : 0);
    } catch (e: unknown) {
      setError((e as { message?: string }).message ?? 'Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  }, [complexId]);
 
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetchData();
  }, [fetchData]);
 
  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof CreateFieldForm, string>> = {};
    if (!form.name.trim()) errors.name = 'Requerido';
    if (!form.type) errors.type = 'Requerido';
    if (form.price && isNaN(parseFloat(form.price))) errors.price = 'Número inválido';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
 
  const handleCreate = async () => {
    if (!validateForm() || !complexId) return;
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = { name: form.name.trim(), type: form.type };
      if (form.length) payload.length = parseFloat(form.length);
      if (form.width) payload.width = parseFloat(form.width);
 
      const res = await ApiClient.post<ApiResponse<FieldItem>>(`/complexes/${complexId}/fields/create/`, payload, { withAuth: true });
      const newField = res.data as FieldItem;
 
      // Save UI data locally
      if (newField?.field_id) {
        const uiData = {
          amenities: form.amenities,
          capacity: parseInt(form.capacity) || TYPE_PLAYERS[form.type] || 10,
          price: form.price ? parseFloat(form.price) : null,
        };
        sessionStorage.setItem(`field_ui_${newField.field_id}`, JSON.stringify(uiData));
      }
 
      toast.success('¡Cancha creada exitosamente!');
      setForm(FORM_EMPTY);
      setShowForm(false);
      fetchedRef.current = false;
      await fetchData();
      fetchedRef.current = true;
    } catch (e: unknown) {
      toast.error((e as { message?: string }).message ?? 'Error al crear la cancha');
    } finally {
      setSubmitting(false);
    }
  };
 
  const handleDelete = async () => {
    if (!deleteTarget || !complexId) return;
    setDeleting(true);
    try {
      await ApiClient.delete(`/complexes/${complexId}/fields/${deleteTarget.field_id}/`, { withAuth: true });
      sessionStorage.removeItem(`field_ui_${deleteTarget.field_id}`);
      toast.success('Cancha eliminada');
      setDeleteTarget(null);
      fetchedRef.current = false;
      await fetchData();
      fetchedRef.current = true;
    } catch (e: unknown) {
      toast.error((e as { message?: string }).message ?? 'Error al eliminar la cancha');
    } finally {
      setDeleting(false);
    }
  };
 
  const toggleAmenity = (a: string) => {
    setForm(p => ({
      ...p,
      amenities: p.amenities.includes(a) ? p.amenities.filter(x => x !== a) : [...p.amenities, a],
    }));
  };
 
  const setField = (f: keyof CreateFieldForm, v: string) => {
    setForm(p => ({ ...p, [f]: v }));
    if (formErrors[f]) setFormErrors(p => ({ ...p, [f]: undefined }));
  };
 
  const inputCls = (err?: string) =>
    `w-full px-4 py-2.5 rounded-[var(--radius-lg)] border text-sm font-bold text-[var(--color-text)] bg-white outline-none transition-all placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_var(--color-primary-glow)] ${err ? 'border-[var(--color-accent)]' : 'border-[var(--color-border)]'}`;
 
  const totalFields = fields.length;
  const activeFields = fields.filter(f => f.status === 'active').length;
 
  return (
    <div className="p-6 sm:p-8 space-y-6 min-h-full">
      {/* ── Breadcrumb ── */}
      <nav className="flex items-center gap-1.5 text-sm text-[var(--color-text-3)]">
        <button onClick={() => navigate('/admin/complexes')} className="font-extrabold hover:text-[var(--color-primary)] transition-colors">
          Complejos
        </button>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="font-extrabold text-[var(--color-text-2)] truncate max-w-[200px]">{complex?.name ?? '…'}</span>
      </nav>
 
      {/* ── Loading ── */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="w-9 h-9 animate-spin text-[var(--color-primary)]" />
          <p className="text-sm font-extrabold text-[var(--color-text-3)]">Cargando canchas…</p>
        </div>
      )}
 
      {/* ── Error ── */}
      {!loading && error && (
        <div className="flex items-start gap-3 p-4 rounded-[var(--radius-xl)] bg-[var(--color-accent-tint)] border border-[var(--color-accent)]">
          <AlertCircle className="w-5 h-5 text-[var(--color-accent)] flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-extrabold text-[var(--color-accent)]">Error al cargar</p>
            <p className="text-xs text-[var(--color-text-2)] mt-0.5">{error}</p>
          </div>
          <button onClick={() => { fetchedRef.current = false; fetchData(); fetchedRef.current = true; }} className="text-xs font-extrabold text-[var(--color-primary)] underline">
            Reintentar
          </button>
        </div>
      )}
 
      {!loading && !error && complex && (
        <>
          {/* ── Complex hero card ── */}
          <div className="bg-[var(--color-text)] rounded-[var(--radius-2xl)] px-6 py-5 flex items-start justify-between gap-4 shadow-[var(--shadow-lg)]">
            <div className="flex items-center gap-4">
              <div className="w-[52px] h-[52px] rounded-[var(--radius-xl)] bg-[var(--color-primary)] flex items-center justify-center flex-shrink-0 shadow-[var(--shadow-primary)]">
                <Building2 className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-white font-extrabold text-xl leading-tight">{complex.name}</h1>
                {complex.address && (
                  <p className="text-[var(--color-text-3)] text-sm mt-0.5 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                    {[complex.address, complex.city].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => toast.info('Gestiona los admins desde Mis Complejos')}
              className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-lg)] border border-white/20 text-white text-xs font-extrabold hover:bg-white/10 transition-colors"
            >
              <Users className="w-3.5 h-3.5" /> Administradores ({managersCount})
            </button>
          </div>
 
          {/* ── Stats bar ── */}
          <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border)] px-6 py-4 flex items-center gap-8 shadow-[var(--shadow-sm)]">
            {[
              { value: totalFields, label: 'Canchas Totales', color: 'text-[var(--color-primary)]' },
              { value: activeFields, label: 'Activas', color: 'text-[var(--color-primary)]' },
              { value: managersCount, label: 'Administradores', color: 'text-[var(--color-accent)]' },
            ].map(({ value, label, color }, i) => (
              <React.Fragment key={label}>
                {i > 0 && <div className="w-px h-8 bg-[var(--color-border)]" />}
                <div className="flex flex-col gap-0.5">
                  <span className={`text-2xl font-extrabold leading-none ${color}`}>{value}</span>
                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-[var(--color-text-3)]">{label}</span>
                </div>
              </React.Fragment>
            ))}
          </div>
 
          {/* ── Section header ── */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-extrabold tracking-[0.15em] uppercase text-[var(--color-text-3)] mb-1 flex items-center gap-1.5">
                <Target className="w-3 h-3 text-[var(--color-primary)]" />
                Gestión de Canchas
              </p>
              <h2 className="text-2xl font-extrabold text-[var(--color-text)] leading-tight">
                Canchas de <span className="text-[var(--color-primary)]">{complex.name}</span>
              </h2>
            </div>
            {!showForm ? (
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-full)] bg-[var(--color-primary)] text-white font-extrabold text-sm shadow-[var(--shadow-primary)] hover:bg-[var(--color-primary-dark)] transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" /> Nueva Cancha
              </button>
            ) : (
              <button
                onClick={() => { setShowForm(false); setForm(FORM_EMPTY); setFormErrors({}); }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-full)] bg-white text-[var(--color-text-2)] font-extrabold text-sm border border-[var(--color-border)] hover:bg-[var(--color-surf2)] transition-all"
              >
                <X className="w-4 h-4" /> Cancelar
              </button>
            )}
          </div>
 
          {/* ── Create Form ── */}
          {showForm && (
            <div className="bg-white rounded-[var(--radius-2xl)] border border-[var(--color-primary)] shadow-[var(--shadow-primary)] overflow-hidden">
              <div className="px-6 pt-5 pb-1 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-[var(--color-primary)] flex items-center justify-center flex-shrink-0">
                  <Plus className="w-3.5 h-3.5 text-white" />
                </div>
                <h3 className="text-base font-extrabold text-[var(--color-text)]">Registrar Nueva Cancha</h3>
              </div>
 
              <div className="p-6 space-y-4">
                {/* Row 1 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-extrabold text-[var(--color-text-2)] mb-1.5 uppercase tracking-wide">Nombre de la cancha *</label>
                    <input type="text" value={form.name} onChange={e => setField('name', e.target.value)} placeholder="Ej: Cancha Sintética Norte" className={inputCls(formErrors.name)} />
                    {formErrors.name && <p className="text-xs text-[var(--color-accent)] mt-1 font-bold">{formErrors.name}</p>}
                  </div>
                  <div>
                    <label className="block text-[11px] font-extrabold text-[var(--color-text-2)] mb-1.5 uppercase tracking-wide">Tipo de cancha *</label>
                    <select value={form.type} onChange={e => { setField('type', e.target.value); setForm(p => ({ ...p, capacity: String(TYPE_PLAYERS[e.target.value] ?? 10) })); }} className={inputCls(formErrors.type)}>
                      {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-extrabold text-[var(--color-text-2)] mb-1.5 uppercase tracking-wide">Precio por hora (COP) *</label>
                    <input type="number" value={form.price} onChange={e => setField('price', e.target.value)} placeholder="Ej: 80000" className={inputCls(formErrors.price)} />
                    {formErrors.price && <p className="text-xs text-[var(--color-accent)] mt-1 font-bold">{formErrors.price}</p>}
                  </div>
                </div>
 
                {/* Row 2 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-extrabold text-[var(--color-text-2)] mb-1.5 uppercase tracking-wide">Capacidad (jugadores)</label>
                    <input type="number" value={form.capacity} onChange={e => setField('capacity', e.target.value)} className={inputCls()} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-extrabold text-[var(--color-text-2)] mb-1.5 uppercase tracking-wide">Largo × Ancho (m)</label>
                    <div className="flex items-center gap-2">
                      <input type="number" step="any" value={form.length} onChange={e => setField('length', e.target.value)} placeholder="40" className={inputCls()} />
                      <span className="text-[var(--color-text-3)] font-extrabold text-sm flex-shrink-0">×</span>
                      <input type="number" step="any" value={form.width} onChange={e => setField('width', e.target.value)} placeholder="20" className={inputCls()} />
                    </div>
                  </div>
                </div>
 
                {/* Amenities */}
                <div>
                  <label className="block text-[11px] font-extrabold text-[var(--color-text-2)] mb-2 uppercase tracking-wide">Comodidades</label>
                  <div className="flex flex-wrap gap-2">
                    {AMENITIES_OPTIONS.map(a => {
                      const selected = form.amenities.includes(a);
                      return (
                        <button
                          key={a}
                          type="button"
                          onClick={() => toggleAmenity(a)}
                          className={`px-3 py-1.5 rounded-full text-xs font-extrabold border transition-all active:scale-95 ${
                            selected
                              ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-[var(--shadow-primary)]'
                              : 'bg-white border-[var(--color-border)] text-[var(--color-text-2)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]'
                          }`}
                        >
                          {a}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
 
              <div className="px-6 pb-5 flex items-center justify-end gap-3">
                <button
                  onClick={() => { setShowForm(false); setForm(FORM_EMPTY); setFormErrors({}); }}
                  className="px-5 py-2.5 rounded-[var(--radius-lg)] text-sm font-extrabold text-[var(--color-text-2)] border border-[var(--color-border)] hover:bg-[var(--color-surf2)] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreate}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-[var(--radius-lg)] bg-[var(--color-primary)] text-white text-sm font-extrabold shadow-[var(--shadow-primary)] hover:bg-[var(--color-primary-dark)] transition-all active:scale-95 disabled:opacity-60"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Crear Cancha
                </button>
              </div>
            </div>
          )}
 
          {/* ── Empty state ── */}
          {fields.length === 0 && !showForm && (
            <div className="bg-white rounded-[var(--radius-2xl)] border border-dashed border-[var(--color-border)] p-14 flex flex-col items-center gap-4 text-center">
              <div className="w-[68px] h-[68px] rounded-full bg-[var(--color-primary-tint)] flex items-center justify-center">
                <Target className="w-9 h-9 text-[var(--color-primary)]" />
              </div>
              <div>
                <p className="font-extrabold text-[var(--color-text)] text-xl">Sin canchas registradas</p>
                <p className="text-sm text-[var(--color-text-3)] mt-1.5">Agrega la primera cancha para este complejo.</p>
              </div>
              <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 px-6 py-3 rounded-[var(--radius-full)] bg-[var(--color-primary)] text-white font-extrabold shadow-[var(--shadow-primary)] hover:bg-[var(--color-primary-dark)] transition-all">
                <Plus className="w-4 h-4" /> Nueva Cancha
              </button>
            </div>
          )}
 
          {/* ── Fields grid ── */}
          {fields.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {fields.map(f => (
                <FieldCard
                  key={f.field_id}
                  f={f}
                  onDelete={() => setDeleteTarget(f)}
                  onSchedule={() => navigate(`/admin/complexes/${complexId}/fields/${f.field_id}/schedule`, { state: { fieldName: f.name, complexName: complex?.name ?? '' } })}
                />
              ))}
            </div>
          )}
        </>
      )}
 
      {deleteTarget && (
        <ConfirmModal
          name={deleteTarget.name}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          deleting={deleting}
        />
      )}
    </div>
  );
};
 
export default AdminComplexFields;