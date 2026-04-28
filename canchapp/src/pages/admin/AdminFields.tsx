import React, { useEffect, useState, useCallback } from 'react';
import { CircleDot, Building2, ChevronRight, Loader2, AlertCircle, Ruler } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ApiClient from '../../services/ApiClient';
import { tokenStorage } from '../../services/AuthService';
 
interface FieldItem {
  field_id: string;
  complex_id: string;
  name: string;
  status: 'active' | 'maintenance' | 'inactive';
  type: string;
  length: number | null;
  width: number | null;
}
 
interface ComplexWithFields {
  complex_id: string;
  name: string;
  city: string | null;
  status: string;
  fields: FieldItem[];
}
 
interface ApiResponse<T> { data: T; success?: boolean; message?: string; }
interface PaginatedResponse { items: ComplexWithFields[]; }
 
const TYPE_LABELS: Record<string, string> = {
  futbol_5: 'Fútbol 5', futbol_7: 'Fútbol 7', futbol_11: 'Fútbol 11',
  microfutbol: 'Microfútbol', futsal: 'Futsal',
};
 
const STATUS_CONFIG = {
  active: { label: 'Activa', cls: 'bg-[var(--color-primary)] text-white' },
  maintenance: { label: 'Mantenimiento', cls: 'bg-amber-100 text-amber-700' },
  inactive: { label: 'Inactiva', cls: 'bg-[var(--color-muted)] text-[var(--color-text-2)]' },
};
 
const AdminFields: React.FC = () => {
  const navigate = useNavigate();
  const [complexes, setComplexes] = useState<ComplexWithFields[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const user = tokenStorage.getUser();
 
  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await ApiClient.get<ApiResponse<PaginatedResponse>>(
        `/complexes/?owner_id=${user.user_id}&page_size=50`,
        { withAuth: true }
      );
      const items: ComplexWithFields[] = Array.isArray(res.data) ? res.data : (res.data as PaginatedResponse)?.items ?? [];
      const enriched = await Promise.all(
        items.map(async (c) => {
          try {
            const fieldsRes = await ApiClient.get<ApiResponse<FieldItem[]>>(`/complexes/${c.complex_id}/fields/`);
            const fields: FieldItem[] = Array.isArray(fieldsRes.data) ? fieldsRes.data : [];
            return { ...c, fields };
          } catch {
            return { ...c, fields: [] };
          }
        })
      );
      setComplexes(enriched);
    } catch (e: unknown) {
      setError((e as { message?: string }).message ?? 'Error al cargar las canchas');
    } finally {
      setLoading(false);
    }
  }, [user]);
 
  useEffect(() => { fetchAll(); }, [fetchAll]);
 
  const allFields = complexes.flatMap((c) => c.fields.map((f) => ({ ...f, complexName: c.name })));
  const activeCount = allFields.filter((f) => f.status === 'active').length;
  const maintenanceCount = allFields.filter((f) => f.status === 'maintenance').length;
 
  return (
    <div className="p-5 sm:p-8 space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs font-extrabold tracking-widest uppercase text-[var(--color-text-3)] mb-1">Gestión de Canchas</p>
        <h1 className="text-3xl font-extrabold text-[var(--color-text)]">
          Mis <span className="text-[var(--color-primary)]">Canchas</span>
        </h1>
      </div>
 
      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
          <p className="text-sm font-extrabold text-[var(--color-text-3)]">Cargando canchas…</p>
        </div>
      )}
 
      {/* Error */}
      {!loading && error && (
        <div className="flex items-start gap-3 p-4 rounded-[var(--radius-xl)] bg-[var(--color-accent-tint)] border-[1.5px] border-[var(--color-accent)]">
          <AlertCircle className="w-5 h-5 text-[var(--color-accent)] flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-extrabold text-[var(--color-accent)]">Error al cargar</p>
            <p className="text-xs text-[var(--color-text-2)] mt-0.5">{error}</p>
          </div>
          <button onClick={fetchAll} className="text-xs font-extrabold text-[var(--color-primary)] underline">Reintentar</button>
        </div>
      )}
 
      {!loading && !error && (
        <>
          {/* Summary stats */}
          {allFields.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: allFields.length, label: 'Total canchas', color: 'text-[var(--color-primary)]' },
                { value: activeCount, label: 'Activas', color: 'text-[var(--color-primary)]' },
                { value: maintenanceCount, label: 'Mantenimiento', color: 'text-amber-600' },
              ].map(({ value, label, color }) => (
                <div key={label} className="bg-white rounded-[var(--radius-xl)] border-[1.5px] border-[var(--color-border)] p-4 text-center shadow-[var(--shadow-sm)]">
                  <span className={`text-2xl font-extrabold ${color}`}>{value}</span>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--color-text-3)] mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          )}
 
          {/* Empty state */}
          {complexes.length === 0 && (
            <div className="bg-white rounded-[var(--radius-2xl)] border-[1.5px] border-[var(--color-border)] p-12 flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-[var(--color-primary-tint)] flex items-center justify-center">
                <CircleDot className="w-8 h-8 text-[var(--color-primary)]" />
              </div>
              <div>
                <p className="font-extrabold text-[var(--color-text)] text-lg">Sin complejos registrados</p>
                <p className="text-sm text-[var(--color-text-3)] mt-1 max-w-sm">Crea un complejo primero para poder agregar canchas.</p>
              </div>
              <button onClick={() => navigate('/admin/complexes')} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-lg)] bg-[var(--color-primary)] text-white font-extrabold text-sm shadow-[var(--shadow-primary)] hover:bg-[var(--color-primary-dark)] transition-all">
                <Building2 className="w-4 h-4" /> Ir a Mis Complejos
              </button>
            </div>
          )}
 
          {/* Per-complex sections */}
          {complexes.map((c) => (
            <div key={c.complex_id} className="space-y-3">
              {/* Complex header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--color-text)] flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className="font-extrabold text-[var(--color-text)] text-base">{c.name}</h2>
                    {c.city && <p className="text-xs text-[var(--color-text-3)]">{c.city}</p>}
                  </div>
                  <span className="ml-2 text-xs font-extrabold text-[var(--color-text-3)]">({c.fields.length} canchas)</span>
                </div>
                <button
                  onClick={() => navigate(`/admin/complexes/${c.complex_id}/fields`)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-lg)] text-xs font-extrabold text-[var(--color-primary)] border-[1.5px] border-[var(--color-primary)] hover:bg-[var(--color-primary-tint)] transition-colors"
                >
                  Gestionar <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
 
              {c.fields.length === 0 ? (
                <div className="bg-white rounded-[var(--radius-xl)] border-[1.5px] border-dashed border-[var(--color-border)] p-6 text-center">
                  <p className="text-sm text-[var(--color-text-3)] font-extrabold">Sin canchas — haz clic en "Gestionar" para agregar</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {c.fields.map((f) => {
                    const statusConf = STATUS_CONFIG[f.status] ?? STATUS_CONFIG.inactive;
                    return (
                      <div key={f.field_id} className="bg-white rounded-[var(--radius-xl)] border-[1.5px] border-[var(--color-border)] px-4 py-3 flex items-center gap-3 shadow-[var(--shadow-sm)]">
                        <div className="w-9 h-9 rounded-[var(--radius-lg)] bg-[var(--color-primary-tint)] flex items-center justify-center flex-shrink-0">
                          <CircleDot className="w-5 h-5 text-[var(--color-primary)]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-extrabold text-sm text-[var(--color-text)] truncate">{f.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-[var(--color-text-3)]">{TYPE_LABELS[f.type] ?? f.type}</span>
                            {f.length && f.width && (
                              <span className="text-xs text-[var(--color-text-3)] flex items-center gap-0.5">
                                <Ruler className="w-3 h-3" /> {f.length}×{f.width}m
                              </span>
                            )}
                          </div>
                        </div>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase flex-shrink-0 ${statusConf.cls}`}>
                          {statusConf.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
};

export default AdminFields;