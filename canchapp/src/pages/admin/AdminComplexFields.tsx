import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Plus, Target, Building2, ChevronRight, X, Loader2, AlertCircle,
  Ruler, Users, Wrench, Trash2, Edit3, CheckCircle, MapPin,
  UserX, RefreshCw, Save, ShieldOff,
} from 'lucide-react';
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
  created_at: string;
  updated_at: string;
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

interface ManagerUser {
  user_id: string;
  username: string | null;
  email: string;
  f_name: string;
  l_name: string;
  role_name: string;
  avatar_url: string | null;
}

interface Manager {
  complex_id: string;
  user_id: string;
  assigned_at: string;
  status: string;
  user: ManagerUser | null;
}

interface ApiResponse<T> { data: T; }

// ─── Constants ────────────────────────────────────────────────────────────────

const FIELD_TYPES = [
  { value: 'futbol_5',    label: 'Fútbol 5' },
  { value: 'futbol_7',    label: 'Fútbol 7' },
  { value: 'futbol_11',   label: 'Fútbol 11' },
  { value: 'microfutbol', label: 'Microfútbol' },
  { value: 'futsal',      label: 'Futsal' },
];

const TYPE_MAP: Record<string, string> = {
  futbol_5: 'Fútbol 5', futbol_7: 'Fútbol 7', futbol_11: 'Fútbol 11',
  microfutbol: 'Microfútbol', futsal: 'Futsal',
};

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  active:      { label: 'Activa',        cls: 'bg-[var(--color-primary)] text-white' },
  maintenance: { label: 'Mantenimiento', cls: 'bg-amber-100 text-amber-700' },
  inactive:    { label: 'Inactiva',      cls: 'bg-gray-100 text-gray-500' },
};

const AMENITIES_OPTIONS = [
  'Iluminación', 'Duchas', 'Parqueadero', 'Petos',
  'Bar', 'Casilleros', 'Agua', 'Video', 'A/C',
];

// UI-only data stored in sessionStorage (amenities, capacity, price — not in backend model)
function getFieldUI(fieldId: string) {
  try {
    const raw = sessionStorage.getItem(`field_ui_${fieldId}`);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}
function setFieldUI(fieldId: string, data: object) {
  sessionStorage.setItem(`field_ui_${fieldId}`, JSON.stringify(data));
}

function fmtPrice(n: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0,
  }).format(n);
}

function userInitials(user: ManagerUser | null) {
  if (!user) return '?';
  return `${user.f_name?.[0] ?? ''}${user.l_name?.[0] ?? ''}`.toUpperCase();
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────

function ConfirmModal({
  title, description, confirmLabel, onConfirm, onCancel, loading,
}: {
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-[var(--radius-2xl)] shadow-[var(--shadow-2xl)] w-full max-w-sm p-6 space-y-4">
        <div>
          <h3 className="font-extrabold text-[var(--color-text)]">{title}</h3>
          <p className="text-sm text-[var(--color-text-2)] mt-1">{description}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-[var(--radius-lg)] text-sm font-extrabold border border-[var(--color-border)] text-[var(--color-text-2)] hover:bg-[var(--color-surf2)] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-[var(--radius-lg)] text-sm font-extrabold bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-dark)] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Managers Modal ───────────────────────────────────────────────────────────
// Soportado por el backend:
//   GET  /complexes/<id>/managers/      → lista con datos de usuario enriquecidos
//   POST /complexes/<id>/managers/add/  → asignar por user_id (el owner ingresa el UUID manualmente)
//   DELETE /complexes/<id>/managers/<user_id>/ → eliminar (hard delete)

function ManagersModal({
  complexId, complexName, onClose,
}: {
  complexId: string;
  complexName: string;
  onClose: () => void;
}) {
  const [managers, setManagers]       = useState<Manager[]>([]);
  const [loading, setLoading]         = useState(true);
  const [userId, setUserId]           = useState('');
  const [assigning, setAssigning]     = useState(false);
  const [removing, setRemoving]       = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<Manager | null>(null);
  const [activeTab, setActiveTab]     = useState<'list' | 'assign'>('list');

  const loadManagers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ApiClient.get<ApiResponse<Manager[]>>(
        `/complexes/${complexId}/managers/`,
        { withAuth: true },
      );
      setManagers(Array.isArray(res.data) ? res.data : []);
    } catch {
      setManagers([]);
    } finally {
      setLoading(false);
    }
  }, [complexId]);

  useEffect(() => { loadManagers(); }, [loadManagers]);

  const handleAssign = async () => {
    const trimmed = userId.trim();
    if (!trimmed) { toast.error('Ingresa el UUID del usuario'); return; }
    // Basic UUID format check
    const uuidReg = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidReg.test(trimmed)) { toast.error('Formato de UUID inválido'); return; }

    setAssigning(true);
    try {
      await ApiClient.post(
        `/complexes/${complexId}/managers/add/`,
        { user_id: trimmed },
        { withAuth: true },
      );
      toast.success('Administrador asignado exitosamente');
      setUserId('');
      setActiveTab('list');
      await loadManagers();
    } catch (e: unknown) {
      toast.error((e as { message?: string }).message ?? 'Error al asignar');
    } finally {
      setAssigning(false);
    }
  };

  const handleRemove = async () => {
    if (!confirmRemove) return;
    setRemoving(confirmRemove.user_id);
    try {
      await ApiClient.delete(
        `/complexes/${complexId}/managers/${confirmRemove.user_id}/`,
        { withAuth: true },
      );
      const name = confirmRemove.user
        ? `${confirmRemove.user.f_name} ${confirmRemove.user.l_name}`
        : 'Administrador';
      toast.success(`${name} removido`);
      setConfirmRemove(null);
      await loadManagers();
    } catch (e: unknown) {
      toast.error((e as { message?: string }).message ?? 'Error al remover');
    } finally {
      setRemoving(null);
    }
  };

  const activeManagers = managers.filter(m => m.status === 'active');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-[var(--radius-2xl)] shadow-[var(--shadow-2xl)] w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="bg-[var(--color-text)] px-6 py-5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[var(--color-primary)] flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--color-text-3)] mb-0.5">
                Administradores
              </p>
              <h3 className="text-white font-extrabold text-base leading-tight truncate max-w-[280px]">
                {complexName}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--color-border)] flex-shrink-0">
          {[
            { id: 'list',   label: `Asignados (${activeManagers.length})`, icon: Users },
            { id: 'assign', label: 'Asignar nuevo',                        icon: Plus },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as 'list' | 'assign')}
              className={`flex-1 py-3 text-xs font-extrabold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
                activeTab === id
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'border-transparent text-[var(--color-text-3)] hover:text-[var(--color-text-2)]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* List Tab */}
          {activeTab === 'list' && (
            <div className="p-5 space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-7 h-7 animate-spin text-[var(--color-primary)]" />
                </div>
              ) : managers.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-10 h-10 text-[var(--color-muted)] mx-auto mb-3" />
                  <p className="font-extrabold text-[var(--color-text-2)]">Sin administradores</p>
                  <p className="text-sm text-[var(--color-text-3)] mt-1">
                    Usa "Asignar nuevo" para agregar uno.
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {managers.map(m => (
                    <li
                      key={m.user_id}
                      className="flex items-center gap-3 p-3 rounded-[var(--radius-lg)] bg-[var(--color-bg)] border border-[var(--color-border)]"
                    >
                      <div className="w-10 h-10 rounded-full bg-[var(--color-primary)] flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-extrabold">
                          {userInitials(m.user)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-extrabold text-[var(--color-text)] truncate">
                          {m.user ? `${m.user.f_name} ${m.user.l_name}` : 'Usuario desconocido'}
                        </p>
                        <p className="text-xs text-[var(--color-text-3)] truncate">
                          {m.user?.email ?? m.user_id}
                        </p>
                      </div>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full flex-shrink-0 ${
                        m.status === 'active'
                          ? 'bg-[var(--color-primary-tint)] text-[var(--color-primary-dark)]'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {m.status === 'active' ? 'Activo' : m.status}
                      </span>
                      <button
                        onClick={() => setConfirmRemove(m)}
                        className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[var(--radius-md)] text-[10px] font-extrabold text-[var(--color-accent)] border border-[var(--color-accent)]/30 hover:bg-[var(--color-accent-tint)] transition-colors"
                      >
                        <UserX className="w-3 h-3" /> Remover
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Assign Tab */}
          {activeTab === 'assign' && (
            <div className="p-5 space-y-4">
              <div className="p-4 rounded-[var(--radius-xl)] bg-blue-50 border border-blue-200">
                <p className="text-xs font-bold text-blue-700">
                  Para asignar un administrador necesitas su <strong>UUID de usuario</strong>.
                  Puedes encontrarlo en el perfil del usuario o desde el panel de administración del sistema.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-[var(--color-text-2)] mb-1.5 uppercase tracking-wide">
                  UUID del usuario *
                </label>
                <input
                  type="text"
                  value={userId}
                  onChange={e => setUserId(e.target.value)}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="w-full px-4 py-2.5 rounded-[var(--radius-lg)] border border-[var(--color-border)] text-sm font-mono text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_var(--color-primary-glow)] transition-all"
                />
              </div>

              <button
                onClick={handleAssign}
                disabled={assigning || !userId.trim()}
                className="w-full py-2.5 rounded-[var(--radius-lg)] bg-[var(--color-primary)] text-white text-sm font-extrabold shadow-[var(--shadow-primary)] hover:bg-[var(--color-primary-dark)] transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {assigning
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Plus className="w-4 h-4" />
                }
                Asignar Administrador
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[var(--color-border)] flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-[var(--radius-lg)] bg-[var(--color-surf2)] text-[var(--color-text-2)] text-sm font-extrabold hover:bg-[var(--color-border)] transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>

      {confirmRemove && (
        <ConfirmModal
          title="Remover administrador"
          description={
            <>
              ¿Remover a{' '}
              <strong>
                {confirmRemove.user
                  ? `${confirmRemove.user.f_name} ${confirmRemove.user.l_name}`
                  : 'este usuario'}
              </strong>{' '}
              de los administradores? Esta acción no se puede deshacer.
            </>
          }
          confirmLabel="Remover"
          onConfirm={handleRemove}
          onCancel={() => setConfirmRemove(null)}
          loading={removing === confirmRemove.user_id}
        />
      )}
    </div>
  );
}

// ─── Edit Field Form (inline) ─────────────────────────────────────────────────
// Llama PUT /complexes/<complex_id>/fields/<field_id>/
// Campos soportados por el backend: name, type, length, width, status

function EditFieldForm({
  field,
  complexId,
  onSaved,
  onCancel,
}: {
  field: FieldItem;
  complexId: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const ui = getFieldUI(field.field_id);
  const [form, setForm] = useState({
    name:      field.name,
    type:      field.type,
    length:    String(field.length ?? ''),
    width:     String(field.width ?? ''),
    status:    field.status,
    // UI-only (not sent to backend)
    amenities: (ui.amenities ?? []) as string[],
    price:     String(ui.price ?? ''),
  });
  const [saving, setSaving] = useState(false);

  const inputCls = `w-full px-4 py-2.5 rounded-[var(--radius-lg)] border border-[var(--color-border)] text-sm font-bold text-[var(--color-text)] bg-white outline-none transition-all placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_var(--color-primary-glow)]`;

  const toggleAmenity = (a: string) =>
    setForm(p => ({
      ...p,
      amenities: p.amenities.includes(a)
        ? p.amenities.filter(x => x !== a)
        : [...p.amenities, a],
    }));

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('El nombre es requerido'); return; }
    setSaving(true);
    try {
      // PUT to backend — only the fields the backend understands
      await ApiClient.put(
        `/complexes/${complexId}/fields/${field.field_id}/`,
        {
          name:   form.name.trim(),
          type:   form.type,
          length: form.length ? parseFloat(form.length) : null,
          width:  form.width  ? parseFloat(form.width)  : null,
          status: form.status,
        },
        { withAuth: true },
      );
      // Save UI-only data locally
      setFieldUI(field.field_id, {
        amenities: form.amenities,
        price:     form.price ? parseFloat(form.price) : null,
      });
      toast.success('¡Cancha actualizada!');
      onSaved();
    } catch (e: unknown) {
      toast.error((e as { message?: string }).message ?? 'Error al actualizar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-[var(--radius-2xl)] border border-[var(--color-primary)] shadow-[var(--shadow-primary)] overflow-hidden">
      <div className="px-6 pt-5 pb-1 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-full bg-[var(--color-primary)] flex items-center justify-center flex-shrink-0">
          <Edit3 className="w-3.5 h-3.5 text-white" />
        </div>
        <h3 className="text-base font-extrabold text-[var(--color-text)]">Editar Cancha</h3>
      </div>

      <div className="p-6 space-y-4">
        {/* Row 1 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-extrabold text-[var(--color-text-2)] mb-1.5 uppercase tracking-wide">
              Nombre *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-[11px] font-extrabold text-[var(--color-text-2)] mb-1.5 uppercase tracking-wide">
              Tipo *
            </label>
            <select
              value={form.type}
              onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
              className={inputCls}
            >
              {FIELD_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-extrabold text-[var(--color-text-2)] mb-1.5 uppercase tracking-wide">
              Estado
            </label>
            <select
              value={form.status}
              onChange={e => setForm(p => ({ ...p, status: e.target.value as FieldItem['status'] }))}
              className={inputCls}
            >
              <option value="active">Activa</option>
              <option value="maintenance">Mantenimiento</option>
              <option value="inactive">Inactiva</option>
            </select>
          </div>
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-extrabold text-[var(--color-text-2)] mb-1.5 uppercase tracking-wide">
              Largo × Ancho (m)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number" step="any" value={form.length}
                onChange={e => setForm(p => ({ ...p, length: e.target.value }))}
                placeholder="40" className={inputCls}
              />
              <span className="text-[var(--color-text-3)] font-extrabold flex-shrink-0">×</span>
              <input
                type="number" step="any" value={form.width}
                onChange={e => setForm(p => ({ ...p, width: e.target.value }))}
                placeholder="20" className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-extrabold text-[var(--color-text-2)] mb-1.5 uppercase tracking-wide">
              Precio/hora (COP) <span className="normal-case text-[var(--color-muted)]">— guardado localmente</span>
            </label>
            <input
              type="number" value={form.price}
              onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
              placeholder="80000" className={inputCls}
            />
          </div>
        </div>

        {/* Amenities */}
        <div>
          <label className="block text-[11px] font-extrabold text-[var(--color-text-2)] mb-2 uppercase tracking-wide">
            Comodidades <span className="normal-case text-[var(--color-muted)]">— guardado localmente</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {AMENITIES_OPTIONS.map(a => {
              const sel = form.amenities.includes(a);
              return (
                <button
                  key={a} type="button" onClick={() => toggleAmenity(a)}
                  className={`px-3 py-1.5 rounded-full text-xs font-extrabold border transition-all active:scale-95 ${
                    sel
                      ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white'
                      : 'bg-white border-[var(--color-border)] text-[var(--color-text-2)] hover:border-[var(--color-primary)]'
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
          onClick={onCancel}
          className="px-5 py-2.5 rounded-[var(--radius-lg)] text-sm font-extrabold text-[var(--color-text-2)] border border-[var(--color-border)] hover:bg-[var(--color-surf2)] transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-[var(--radius-lg)] bg-[var(--color-primary)] text-white text-sm font-extrabold shadow-[var(--shadow-primary)] hover:bg-[var(--color-primary-dark)] transition-all active:scale-95 disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Guardar Cambios
        </button>
      </div>
    </div>
  );
}

// ─── Field Card ───────────────────────────────────────────────────────────────

function FieldCard({
  f, onDeactivate, onEdit, onSchedules,
}: {
  f: FieldItem;
  onDeactivate: () => void;
  onEdit: () => void;
  onSchedules: () => void;
}) {
  const cfg   = STATUS_CFG[f.status] ?? STATUS_CFG.inactive;
  const ui    = getFieldUI(f.field_id);
  const amenities: string[] = ui.amenities ?? [];
  const price: number | null = ui.price ?? null;

  return (
    <div className={`bg-white rounded-[var(--radius-2xl)] border border-[var(--color-border)] overflow-hidden shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-all duration-200 hover:-translate-y-0.5 ${
      f.status === 'inactive' ? 'opacity-60' : ''
    }`}>
      {/* Top */}
      <div className="px-5 pt-4 pb-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[var(--color-primary-tint)] flex items-center justify-center flex-shrink-0">
          <Target className="w-5 h-5 text-[var(--color-primary)]" />
        </div>
        <h3 className="font-extrabold text-[var(--color-text)] text-[15px] flex-1 min-w-0 truncate">
          {f.name}
        </h3>
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider flex-shrink-0 ${cfg.cls}`}>
          {cfg.label}
        </span>
      </div>

      {/* Chips */}
      <div className="px-5 pb-2 flex flex-wrap gap-1.5">
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--color-surf2)] text-[var(--color-text-2)] text-xs font-bold">
          🏷 {TYPE_MAP[f.type] ?? f.type}
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
            <span
              key={a}
              className="px-2 py-0.5 rounded-full bg-[var(--color-primary-tint)] text-[var(--color-primary-dark)] text-[10px] font-extrabold uppercase tracking-wide"
            >
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
            <span className="text-[var(--color-primary)] font-extrabold text-lg">
              {fmtPrice(price)}
            </span>
            <span className="text-[var(--color-text-3)] text-xs font-bold">/hora</span>
          </div>
        </>
      )}

      {/* Divider */}
      <div className="mx-5 h-[1px] bg-[var(--color-border)] mt-2" />

      {/* Actions */}
      <div className="px-3 py-2.5 flex gap-0.5">
        <button
          onClick={onSchedules}
          className="flex-1 py-1.5 rounded-[var(--radius-lg)] text-xs font-extrabold text-[var(--color-primary)] hover:bg-[var(--color-primary-tint)] transition-colors flex items-center justify-center gap-1"
        >
          <Target className="w-3 h-3" /> Horarios
        </button>
        <button
          onClick={onEdit}
          className="flex-1 py-1.5 rounded-[var(--radius-lg)] text-xs font-extrabold text-[var(--color-text-2)] hover:bg-[var(--color-surf2)] transition-colors flex items-center justify-center gap-1"
        >
          <Edit3 className="w-3 h-3" /> Editar
        </button>
        <button
          onClick={() => {
            // Mantenimiento: cambiar status via PUT
            toast.info('Cambia el estado desde Editar → "Mantenimiento"');
          }}
          className="flex-1 py-1.5 rounded-[var(--radius-lg)] text-xs font-extrabold text-[var(--color-text-2)] hover:bg-[var(--color-surf2)] transition-colors flex items-center justify-center gap-1"
        >
          <Wrench className="w-3 h-3" /> Mantenim.
        </button>
        {f.status !== 'inactive' ? (
          <button
            onClick={onDeactivate}
            className="flex-1 py-1.5 rounded-[var(--radius-lg)] text-xs font-extrabold text-[var(--color-accent)] hover:bg-[var(--color-accent-tint)] transition-colors flex items-center justify-center gap-1"
          >
            <Trash2 className="w-3 h-3" /> Desactivar
          </button>
        ) : (
          <span className="flex-1 py-1.5 rounded-[var(--radius-lg)] text-xs font-extrabold text-[var(--color-muted)] flex items-center justify-center gap-1">
            <ShieldOff className="w-3 h-3" /> Inactiva
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Create Field Form ────────────────────────────────────────────────────────
// POST /complexes/<id>/fields/create/
// Backend acepta: name, type, length, width  (status no, siempre empieza en active)

interface CreateFieldForm {
  name: string; type: string;
  length: string; width: string;
  // UI-only
  price: string; amenities: string[];
}

const FORM_EMPTY: CreateFieldForm = {
  name: '', type: 'futbol_5', length: '40', width: '20', price: '', amenities: [],
};

function CreateFieldForm({
  complexId, onCreated, onCancel,
}: {
  complexId: string;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [form, setForm]       = useState<CreateFieldForm>(FORM_EMPTY);
  const [errors, setErrors]   = useState<Partial<CreateFieldForm>>({});
  const [submitting, setSub]  = useState(false);

  const inputCls = (err?: string) =>
    `w-full px-4 py-2.5 rounded-[var(--radius-lg)] border text-sm font-bold text-[var(--color-text)] bg-white outline-none transition-all placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_var(--color-primary-glow)] ${
      err ? 'border-[var(--color-accent)]' : 'border-[var(--color-border)]'
    }`;

  const validate = () => {
    const e: Partial<CreateFieldForm> = {};
    if (!form.name.trim()) e.name = 'Requerido';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const toggleAmenity = (a: string) =>
    setForm(p => ({
      ...p,
      amenities: p.amenities.includes(a)
        ? p.amenities.filter(x => x !== a)
        : [...p.amenities, a],
    }));

  const handleCreate = async () => {
    if (!validate()) return;
    setSub(true);
    try {
      const res = await ApiClient.post<ApiResponse<FieldItem>>(
        `/complexes/${complexId}/fields/create/`,
        {
          name:   form.name.trim(),
          type:   form.type,
          length: form.length ? parseFloat(form.length) : null,
          width:  form.width  ? parseFloat(form.width)  : null,
        },
        { withAuth: true },
      );
      const newField = res.data as FieldItem;
      if (newField?.field_id) {
        setFieldUI(newField.field_id, {
          amenities: form.amenities,
          price: form.price ? parseFloat(form.price) : null,
        });
      }
      toast.success('¡Cancha creada exitosamente!');
      onCreated();
    } catch (e: unknown) {
      toast.error((e as { message?: string }).message ?? 'Error al crear');
    } finally {
      setSub(false);
    }
  };

  return (
    <div className="bg-white rounded-[var(--radius-2xl)] border border-[var(--color-primary)] shadow-[var(--shadow-primary)] overflow-hidden">
      <div className="px-6 pt-5 pb-1 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-full bg-[var(--color-primary)] flex items-center justify-center flex-shrink-0">
          <Plus className="w-3.5 h-3.5 text-white" />
        </div>
        <h3 className="text-base font-extrabold text-[var(--color-text)]">Registrar Nueva Cancha</h3>
      </div>

      <div className="p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-extrabold text-[var(--color-text-2)] mb-1.5 uppercase tracking-wide">
              Nombre *
            </label>
            <input
              type="text" value={form.name}
              onChange={e => { setForm(p => ({ ...p, name: e.target.value })); setErrors(p => ({ ...p, name: '' })); }}
              placeholder="Ej: Cancha Principal"
              className={inputCls(errors.name)}
            />
            {errors.name && <p className="text-xs text-[var(--color-accent)] mt-1 font-bold">{errors.name}</p>}
          </div>
          <div>
            <label className="block text-[11px] font-extrabold text-[var(--color-text-2)] mb-1.5 uppercase tracking-wide">
              Tipo *
            </label>
            <select
              value={form.type}
              onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
              className={inputCls()}
            >
              {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-extrabold text-[var(--color-text-2)] mb-1.5 uppercase tracking-wide">
              Largo × Ancho (m)
            </label>
            <div className="flex items-center gap-2">
              <input type="number" step="any" value={form.length}
                onChange={e => setForm(p => ({ ...p, length: e.target.value }))}
                placeholder="40" className={inputCls()} />
              <span className="text-[var(--color-text-3)] font-extrabold flex-shrink-0">×</span>
              <input type="number" step="any" value={form.width}
                onChange={e => setForm(p => ({ ...p, width: e.target.value }))}
                placeholder="20" className={inputCls()} />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-extrabold text-[var(--color-text-2)] mb-1.5 uppercase tracking-wide">
              Precio/hora (COP) <span className="normal-case text-[var(--color-muted)]">— local</span>
            </label>
            <input type="number" value={form.price}
              onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
              placeholder="80000" className={inputCls()} />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-extrabold text-[var(--color-text-2)] mb-2 uppercase tracking-wide">
            Comodidades <span className="normal-case text-[var(--color-muted)]">— local</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {AMENITIES_OPTIONS.map(a => {
              const sel = form.amenities.includes(a);
              return (
                <button key={a} type="button" onClick={() => toggleAmenity(a)}
                  className={`px-3 py-1.5 rounded-full text-xs font-extrabold border transition-all active:scale-95 ${
                    sel
                      ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white'
                      : 'bg-white border-[var(--color-border)] text-[var(--color-text-2)] hover:border-[var(--color-primary)]'
                  }`}>
                  {a}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="px-6 pb-5 flex items-center justify-end gap-3">
        <button onClick={onCancel}
          className="px-5 py-2.5 rounded-[var(--radius-lg)] text-sm font-extrabold text-[var(--color-text-2)] border border-[var(--color-border)] hover:bg-[var(--color-surf2)] transition-colors">
          Cancelar
        </button>
        <button onClick={handleCreate} disabled={submitting}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-[var(--radius-lg)] bg-[var(--color-primary)] text-white text-sm font-extrabold shadow-[var(--shadow-primary)] hover:bg-[var(--color-primary-dark)] transition-all active:scale-95 disabled:opacity-60">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
          Crear Cancha
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const AdminComplexFields: React.FC = () => {
  const { complexId } = useParams<{ complexId: string }>();
  const navigate      = useNavigate();

  const [complex, setComplex]       = useState<ComplexDetail | null>(null);
  const [fields, setFields]         = useState<FieldItem[]>([]);
  const [managersCount, setMgCount] = useState(0);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingField, setEditing]  = useState<FieldItem | null>(null);
  const [deactivateTarget, setDTgt] = useState<FieldItem | null>(null);
  const [deactivating, setDeact]    = useState(false);
  const [showManagers, setShowMgr]  = useState(false);
  const fetchedRef = useRef(false);

  const fetchData = useCallback(async () => {
    if (!complexId) return;
    setLoading(true); setError(null);
    try {
      const [detailRes, fieldsRes, managersRes] = await Promise.all([
        ApiClient.get<ApiResponse<ComplexDetail>>(`/complexes/${complexId}/`),
        ApiClient.get<ApiResponse<FieldItem[]>>(`/complexes/${complexId}/fields/`),
        ApiClient.get<ApiResponse<Manager[]>>(`/complexes/${complexId}/managers/`, { withAuth: true })
          .catch(() => ({ data: [] as Manager[] })),
      ]);
      setComplex(detailRes.data as ComplexDetail);
      setFields(Array.isArray(fieldsRes.data) ? fieldsRes.data : []);
      const mgrs = Array.isArray(managersRes.data) ? managersRes.data : [];
      setMgCount(mgrs.filter((m: Manager) => m.status === 'active').length);
    } catch (e: unknown) {
      setError((e as { message?: string }).message ?? 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, [complexId]);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetchData();
  }, [fetchData]);

  const refresh = async () => {
    fetchedRef.current = false;
    await fetchData();
    fetchedRef.current = true;
  };

  // Desactivar cancha: PUT con status="inactive"
  const handleDeactivate = async () => {
    if (!deactivateTarget || !complexId) return;
    setDeact(true);
    try {
      await ApiClient.put(
        `/complexes/${complexId}/fields/${deactivateTarget.field_id}/`,
        {
          name:   deactivateTarget.name,
          type:   deactivateTarget.type,
          length: deactivateTarget.length,
          width:  deactivateTarget.width,
          status: 'inactive',
        },
        { withAuth: true },
      );
      toast.success(`"${deactivateTarget.name}" desactivada`);
      setDTgt(null);
      await refresh();
    } catch (e: unknown) {
      toast.error((e as { message?: string }).message ?? 'Error al desactivar');
    } finally {
      setDeact(false);
    }
  };

  const totalFields  = fields.length;
  const activeFields = fields.filter(f => f.status === 'active').length;
  const showingForm  = showCreate || !!editingField;

  return (
    <div className="p-6 sm:p-8 space-y-6 min-h-full">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-[var(--color-text-3)]">
        <button
          onClick={() => navigate('/admin/complexes')}
          className="font-extrabold hover:text-[var(--color-primary)] transition-colors"
        >
          Complejos
        </button>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="font-extrabold text-[var(--color-text-2)] truncate max-w-[200px]">
          {complex?.name ?? '…'}
        </span>
      </nav>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="w-9 h-9 animate-spin text-[var(--color-primary)]" />
          <p className="text-sm font-extrabold text-[var(--color-text-3)]">Cargando…</p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="flex items-start gap-3 p-4 rounded-[var(--radius-xl)] bg-[var(--color-accent-tint)] border border-[var(--color-accent)]">
          <AlertCircle className="w-5 h-5 text-[var(--color-accent)] flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-extrabold text-[var(--color-accent)]">Error al cargar</p>
            <p className="text-xs text-[var(--color-text-2)] mt-0.5">{error}</p>
          </div>
          <button onClick={refresh} className="text-xs font-extrabold text-[var(--color-primary)] underline">
            Reintentar
          </button>
        </div>
      )}

      {!loading && !error && complex && (
        <>
          {/* Complex hero */}
          <div className="bg-[var(--color-text)] rounded-[var(--radius-2xl)] px-6 py-5 flex items-center justify-between gap-4 shadow-[var(--shadow-lg)]">
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
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={refresh}
                className="w-9 h-9 rounded-[var(--radius-lg)] border border-white/20 text-white flex items-center justify-center hover:bg-white/10 transition-colors"
                title="Recargar"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowMgr(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-lg)] border border-white/20 text-white text-xs font-extrabold hover:bg-white/10 transition-colors"
              >
                <Users className="w-3.5 h-3.5" /> Administradores ({managersCount})
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border)] px-6 py-4 flex items-center gap-8 shadow-[var(--shadow-sm)]">
            {[
              { value: totalFields,  label: 'Canchas Totales',  color: 'text-[var(--color-primary)]' },
              { value: activeFields, label: 'Activas',          color: 'text-[var(--color-primary)]' },
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

          {/* Section header */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-extrabold tracking-[0.15em] uppercase text-[var(--color-text-3)] mb-1 flex items-center gap-1.5">
                <Target className="w-3 h-3 text-[var(--color-primary)]" /> Gestión de Canchas
              </p>
              <h2 className="text-2xl font-extrabold text-[var(--color-text)] leading-tight">
                Canchas de <span className="text-[var(--color-primary)]">{complex.name}</span>
              </h2>
            </div>
            {!showingForm ? (
              <button
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-full)] bg-[var(--color-primary)] text-white font-extrabold text-sm shadow-[var(--shadow-primary)] hover:bg-[var(--color-primary-dark)] transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" /> Nueva Cancha
              </button>
            ) : (
              <button
                onClick={() => { setShowCreate(false); setEditing(null); }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-full)] bg-white text-[var(--color-text-2)] font-extrabold text-sm border border-[var(--color-border)] hover:bg-[var(--color-surf2)] transition-all"
              >
                <X className="w-4 h-4" /> Cancelar
              </button>
            )}
          </div>

          {/* Edit Form */}
          {editingField && (
            <EditFieldForm
              field={editingField}
              complexId={complexId!}
              onSaved={async () => { setEditing(null); await refresh(); }}
              onCancel={() => setEditing(null)}
            />
          )}

          {/* Create Form */}
          {showCreate && !editingField && (
            <CreateFieldForm
              complexId={complexId!}
              onCreated={async () => { setShowCreate(false); await refresh(); }}
              onCancel={() => setShowCreate(false)}
            />
          )}

          {/* Empty state */}
          {fields.length === 0 && !showingForm && (
            <div className="bg-white rounded-[var(--radius-2xl)] border border-dashed border-[var(--color-border)] p-14 flex flex-col items-center gap-4 text-center">
              <div className="w-[68px] h-[68px] rounded-full bg-[var(--color-primary-tint)] flex items-center justify-center">
                <Target className="w-9 h-9 text-[var(--color-primary)]" />
              </div>
              <div>
                <p className="font-extrabold text-[var(--color-text)] text-xl">Sin canchas registradas</p>
                <p className="text-sm text-[var(--color-text-3)] mt-1.5">
                  Agrega la primera cancha para este complejo.
                </p>
              </div>
              <button
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-[var(--radius-full)] bg-[var(--color-primary)] text-white font-extrabold shadow-[var(--shadow-primary)] hover:bg-[var(--color-primary-dark)] transition-all"
              >
                <Plus className="w-4 h-4" /> Nueva Cancha
              </button>
            </div>
          )}

          {/* Fields grid */}
          {fields.length > 0 && !editingField && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {fields.map(f => (
                <FieldCard
                  key={f.field_id}
                  f={f}
                  onDeactivate={() => setDTgt(f)}
                  onEdit={() => { setShowCreate(false); setEditing(f); }}
                  onSchedules={() => navigate(
                    `/admin/complexes/${complexId}/fields/${f.field_id}/schedule`,
                    { state: { fieldName: f.name, complexName: complex?.name ?? '' } },
                  )}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Deactivate confirm */}
      {deactivateTarget && (
        <ConfirmModal
          title="Desactivar cancha"
          description={
            <>
              <strong>"{deactivateTarget.name}"</strong> quedará inactiva y no aparecerá
              a los jugadores. Puedes reactivarla desde Editar → Estado.
            </>
          }
          confirmLabel="Desactivar"
          onConfirm={handleDeactivate}
          onCancel={() => setDTgt(null)}
          loading={deactivating}
        />
      )}

      {/* Managers modal */}
      {showManagers && complex && (
        <ManagersModal
          complexId={complex.complex_id}
          complexName={complex.name}
          onClose={() => { setShowMgr(false); refresh(); }}
        />
      )}
    </div>
  );
};

export default AdminComplexFields;