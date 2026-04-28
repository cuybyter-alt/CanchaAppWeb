import React, { useEffect, useState, useRef } from 'react';
import { Plus, Building2, MapPin, Phone, Target, Users, X, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ApiClient from '../../services/ApiClient';
import { tokenStorage } from '../../services/AuthService';
import { toast } from 'sonner';
 
// ─── Types ────────────────────────────────────────────────────────────────────
 
interface ComplexItem {
  complex_id: string;
  name: string;
  address: string | null;
  city: string | null;
  status: string;
  fields_count: number;
  min_price: number | null;
  max_price: number | null;
  telephones?: string[];
}
 
interface ApiResponse<T> { data: T; message?: string; }
interface PaginatedData { items: ComplexItem[]; total: number; }
interface CreateComplexForm { name: string; city: string; address: string; telephones: string; latitude: string; longitude: string; }
const FORM_EMPTY: CreateComplexForm = { name: '', city: '', address: '', telephones: '', latitude: '', longitude: '' };
 
// ─── Admins Modal ─────────────────────────────────────────────────────────────
 
interface Manager { user_id: string; status: string; user?: { f_name: string; l_name: string; email: string; avatar_url?: string | null }; }
 
function AdminsModal({ complex, onClose }: { complex: ComplexItem; onClose: () => void }) {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);
 
  useEffect(() => {
    let cancelled = false;
    ApiClient.get<ApiResponse<Manager[]>>(`/complexes/${complex.complex_id}/managers/`)
      .then((res) => { if (!cancelled) setManagers(Array.isArray(res.data) ? res.data : []); })
      .catch(() => { if (!cancelled) setManagers([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [complex.complex_id]);
 
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-[var(--radius-2xl)] shadow-[var(--shadow-2xl)] w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-[var(--color-text)] px-6 py-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--color-text-3)] mb-0.5">Administradores</p>
            <h3 className="text-white font-extrabold text-lg leading-tight">{complex.name}</h3>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
        <div className="p-5">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-7 h-7 animate-spin text-[var(--color-primary)]" />
            </div>
          ) : managers.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-14 h-14 rounded-full bg-[var(--color-surf2)] flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6 text-[var(--color-muted)]" />
              </div>
              <p className="font-extrabold text-[var(--color-text-2)]">Sin administradores asignados</p>
              <p className="text-sm text-[var(--color-text-3)] mt-1">Aún no hay managers para este complejo</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {managers.map((m) => {
                const name = m.user ? `${m.user.f_name} ${m.user.l_name}`.trim() : 'Usuario';
                const email = m.user?.email;
                const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
                return (
                  <li key={m.user_id} className="flex items-center gap-3 p-3 rounded-[var(--radius-lg)] bg-[var(--color-bg)] border border-[var(--color-border)]">
                    <div className="w-10 h-10 rounded-full bg-[var(--color-primary)] flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-extrabold">{initials}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-extrabold text-[var(--color-text)] truncate">{name}</p>
                      {email && <p className="text-xs text-[var(--color-text-3)] truncate">{email}</p>}
                    </div>
                    <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase flex-shrink-0 ${m.status === 'active' ? 'bg-[var(--color-primary-tint)] text-[var(--color-primary-dark)]' : 'bg-[var(--color-surf2)] text-[var(--color-text-3)]'}`}>
                      {m.status === 'active' ? 'Activo' : 'Inactivo'}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="px-5 pb-5">
          <button onClick={onClose} className="w-full py-2.5 rounded-[var(--radius-lg)] bg-[var(--color-surf2)] text-[var(--color-text-2)] text-sm font-extrabold hover:bg-[var(--color-border)] transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
 
// ─── Complex Card ─────────────────────────────────────────────────────────────
 
function ComplexCard({ c, onViewFields, onViewAdmins }: {
  c: ComplexItem;
  onViewFields: () => void;
  onViewAdmins: () => void;
}) {
  const isActive = c.status === 'active';
  const phone = c.telephones?.[0] ?? null;
 
  return (
    <div className="bg-white rounded-[var(--radius-2xl)] border border-[var(--color-border)] overflow-hidden shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-all duration-200 hover:-translate-y-0.5">
      {/* Dark header */}
      <div className="bg-[var(--color-text)] px-5 pt-4 pb-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[var(--color-primary)] flex items-center justify-center flex-shrink-0 shadow-[var(--shadow-primary)]">
          <Building2 className="w-4 h-4 text-white" />
        </div>
        <h3 className="text-white font-extrabold text-[15px] flex-1 min-w-0 truncate leading-tight">{c.name}</h3>
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider flex-shrink-0 ${
          isActive ? 'bg-[var(--color-primary)] text-white' : 'bg-white/10 text-white/50'
        }`}>
          {isActive ? 'Activo' : 'Inactivo'}
        </span>
      </div>
 
      {/* Address & phone */}
      <div className="px-5 pt-3 pb-2 space-y-1.5">
        {(c.address || c.city) && (
          <div className="flex items-start gap-2">
            <MapPin className="w-3.5 h-3.5 text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
            <span className="text-sm text-[var(--color-text-2)] font-semibold leading-snug">
              {[c.address, c.city].filter(Boolean).join(', ')}
            </span>
          </div>
        )}
        {phone && (
          <div className="flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 text-[var(--color-primary)] flex-shrink-0" />
            <span className="text-sm text-[var(--color-text-2)] font-semibold">{phone}</span>
          </div>
        )}
      </div>
 
      {/* Divider */}
      <div className="mx-5 h-[1px] bg-[var(--color-border)] my-3" />
 
      {/* Stats row */}
      <div className="px-5 pb-4 flex items-center justify-around">
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[22px] font-extrabold text-[var(--color-primary)] leading-none">{c.fields_count}</span>
          <span className="text-[9px] font-extrabold uppercase tracking-widest text-[var(--color-text-3)]">Canchas</span>
        </div>
        <div className="w-px h-8 bg-[var(--color-border)]" />
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[22px] font-extrabold text-[var(--color-primary)] leading-none">{c.fields_count}</span>
          <span className="text-[9px] font-extrabold uppercase tracking-widest text-[var(--color-text-3)]">Activas</span>
        </div>
        <div className="w-px h-8 bg-[var(--color-border)]" />
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[22px] font-extrabold text-[var(--color-accent)] leading-none">—</span>
          <span className="text-[9px] font-extrabold uppercase tracking-widest text-[var(--color-text-3)]">Admins</span>
        </div>
      </div>
 
      {/* Action buttons */}
      <div className="px-4 pb-4 flex gap-2">
        <button
          onClick={onViewFields}
          className="flex-1 py-2.5 rounded-[var(--radius-full)] bg-[var(--color-primary)] text-white text-sm font-extrabold shadow-[var(--shadow-primary)] hover:bg-[var(--color-primary-dark)] transition-all active:scale-95 flex items-center justify-center gap-1.5"
        >
          <Target className="w-4 h-4" />
          Ver Canchas
        </button>
        <button
          onClick={onViewAdmins}
          className="flex-1 py-2.5 rounded-[var(--radius-full)] bg-white text-[var(--color-text-2)] text-sm font-extrabold border border-[var(--color-border)] hover:bg-[var(--color-surf2)] transition-all active:scale-95 flex items-center justify-center gap-1.5"
        >
          <Users className="w-4 h-4" />
          Admins
        </button>
      </div>
    </div>
  );
}
 
// ─── Main Page ────────────────────────────────────────────────────────────────
 
const AdminComplexes: React.FC = () => {
  const navigate = useNavigate();
  const [complexes, setComplexes] = useState<ComplexItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateComplexForm>(FORM_EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Partial<CreateComplexForm>>({});
  const [adminsModal, setAdminsModal] = useState<ComplexItem | null>(null);
 
  const fetchedRef = useRef(false);
  const user = tokenStorage.getUser();
 
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    loadComplexes();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
 
  const loadComplexes = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await ApiClient.get<ApiResponse<PaginatedData>>(
        `/complexes/?owner_id=${user.user_id}&page_size=50`,
        { withAuth: true }
      );
      const items: ComplexItem[] = Array.isArray(res.data)
        ? res.data
        : (res.data as PaginatedData)?.items ?? [];
      setComplexes(items);
    } catch (e: unknown) {
      setError((e as { message?: string }).message ?? 'Error al cargar los complejos');
    } finally {
      setLoading(false);
    }
  };
 
  const handleRetry = () => { fetchedRef.current = false; loadComplexes(); fetchedRef.current = true; };
 
  const validateForm = (): boolean => {
    const errors: Partial<CreateComplexForm> = {};
    if (!form.name.trim()) errors.name = 'Requerido';
    if (!form.city.trim()) errors.city = 'Requerido';
    if (!form.address.trim()) errors.address = 'Requerido';
    if (form.latitude && isNaN(parseFloat(form.latitude))) errors.latitude = 'Número inválido';
    if (form.longitude && isNaN(parseFloat(form.longitude))) errors.longitude = 'Número inválido';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
 
  const handleCreate = async () => {
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      const phones = form.telephones.split(',').map(p => p.trim()).filter(Boolean);
      await ApiClient.post('/complexes/create/', {
        name: form.name.trim(),
        city: form.city.trim(),
        address: form.address.trim(),
        telephones: phones,
        latitude: form.latitude ? parseFloat(form.latitude) : 0,
        longitude: form.longitude ? parseFloat(form.longitude) : 0,
      }, { withAuth: true });
      toast.success('¡Complejo creado exitosamente!');
      setForm(FORM_EMPTY);
      setShowForm(false);
      fetchedRef.current = false;
      await loadComplexes();
      fetchedRef.current = true;
    } catch (e: unknown) {
      toast.error((e as { message?: string }).message ?? 'Error al crear el complejo');
    } finally {
      setSubmitting(false);
    }
  };
 
  const setField = (f: keyof CreateComplexForm, v: string) => {
    setForm(p => ({ ...p, [f]: v }));
    if (formErrors[f]) setFormErrors(p => ({ ...p, [f]: undefined }));
  };
 
  const inputCls = (err?: string) =>
    `w-full px-4 py-2.5 rounded-[var(--radius-lg)] border text-sm font-bold text-[var(--color-text)] bg-white outline-none transition-all placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_var(--color-primary-glow)] ${err ? 'border-[var(--color-accent)]' : 'border-[var(--color-border)]'}`;
 
  return (
    <div className="p-6 sm:p-8 space-y-6 min-h-full">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-extrabold tracking-[0.15em] uppercase text-[var(--color-text-3)] mb-1 flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-[var(--color-primary)]" />
            Complejos Deportivos
          </p>
          <h1 className="text-[32px] font-extrabold text-[var(--color-text)] leading-none">
            Mis <span className="text-[var(--color-primary)]">Complejos</span>
          </h1>
        </div>
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-full)] bg-[var(--color-primary)] text-white font-extrabold text-sm shadow-[var(--shadow-primary)] hover:bg-[var(--color-primary-dark)] transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" /> Nuevo Complejo
          </button>
        ) : (
          <button
            onClick={() => { setShowForm(false); setForm(FORM_EMPTY); setFormErrors({}); }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-full)] bg-white text-[var(--color-text-2)] font-extrabold text-sm border border-[var(--color-border)] hover:bg-[var(--color-surf2)] transition-all active:scale-95"
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
            <h2 className="text-base font-extrabold text-[var(--color-text)]">Registrar Nuevo Complejo</h2>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {([
              { key: 'name', label: 'Nombre del complejo *', placeholder: 'Ej: Complejo Deportivo Los Andes', type: 'text' },
              { key: 'city', label: 'Ciudad *', placeholder: 'Ej: Bogotá', type: 'text' },
              { key: 'address', label: 'Dirección *', placeholder: 'Ej: Cra 15 #80-45', type: 'text' },
              { key: 'telephones', label: 'Teléfono(s)', placeholder: 'Ej: +57 300 123 4567', type: 'text', hint: 'Separa múltiples con comas' },
              { key: 'latitude', label: 'Latitud', placeholder: 'Ej: 4.7110', type: 'number' },
              { key: 'longitude', label: 'Longitud', placeholder: 'Ej: -74.0721', type: 'number' },
            ] as { key: keyof CreateComplexForm; label: string; placeholder: string; type: string; hint?: string }[]).map(({ key, label, placeholder, type, hint }) => (
              <div key={key}>
                <label className="block text-[11px] font-extrabold text-[var(--color-text-2)] mb-1.5 uppercase tracking-wide">{label}</label>
                <input
                  type={type}
                  step={type === 'number' ? 'any' : undefined}
                  value={form[key]}
                  onChange={e => setField(key, e.target.value)}
                  placeholder={placeholder}
                  className={inputCls(formErrors[key])}
                />
                {hint && <p className="text-[10px] text-[var(--color-text-3)] mt-1">{hint}</p>}
                {formErrors[key] && <p className="text-xs text-[var(--color-accent)] mt-1 font-bold">{formErrors[key]}</p>}
              </div>
            ))}
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
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-[var(--radius-lg)] bg-[var(--color-primary)] text-white text-sm font-extrabold shadow-[var(--shadow-primary)] hover:bg-[var(--color-primary-dark)] transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Crear Complejo
            </button>
          </div>
        </div>
      )}
 
      {/* ── Loading ── */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="w-9 h-9 animate-spin text-[var(--color-primary)]" />
          <p className="text-sm font-extrabold text-[var(--color-text-3)]">Cargando complejos…</p>
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
          <button onClick={handleRetry} className="text-xs font-extrabold text-[var(--color-primary)] underline underline-offset-2">
            Reintentar
          </button>
        </div>
      )}
 
      {/* ── Empty ── */}
      {!loading && !error && complexes.length === 0 && (
        <div className="bg-white rounded-[var(--radius-2xl)] border border-dashed border-[var(--color-border)] p-16 flex flex-col items-center gap-5 text-center">
          <div className="w-18 h-18 w-[72px] h-[72px] rounded-full bg-[var(--color-primary-tint)] flex items-center justify-center">
            <Building2 className="w-9 h-9 text-[var(--color-primary)]" />
          </div>
          <div>
            <p className="font-extrabold text-[var(--color-text)] text-xl">Sin complejos registrados</p>
            <p className="text-sm text-[var(--color-text-3)] mt-1.5 max-w-xs">
              Registra tu primer complejo deportivo para empezar a gestionar canchas y reservas.
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-[var(--radius-full)] bg-[var(--color-primary)] text-white font-extrabold shadow-[var(--shadow-primary)] hover:bg-[var(--color-primary-dark)] transition-all"
          >
            <Plus className="w-4 h-4" /> Crear Primer Complejo
          </button>
        </div>
      )}
 
      {/* ── Grid ── */}
      {!loading && !error && complexes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {complexes.map(c => (
            <ComplexCard
              key={c.complex_id}
              c={c}
              onViewFields={() => navigate(`/admin/complexes/${c.complex_id}/fields`)}
              onViewAdmins={() => setAdminsModal(c)}
            />
          ))}
        </div>
      )}
 
      {adminsModal && <AdminsModal complex={adminsModal} onClose={() => setAdminsModal(null)} />}
    </div>
  );
};
 
export default AdminComplexes;