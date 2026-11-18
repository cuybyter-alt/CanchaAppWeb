import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Loader2,
  MapPin,
  Phone,
  Save,
} from 'lucide-react';
import { toast } from 'sonner';
import ApiClient from '../../services/ApiClient';
import { ComplexImageCover } from '../../components/features/ComplexImageThumb';
import { ComplexLocationPicker } from '../../components/features/ComplexLocationPicker';

interface ManagedComplex {
  complex_id: string;
  name: string;
  address: string | null;
  city: string | null;
  latitude?: number | null;
  longitude?: number | null;
  telephones?: string[];
  last_image?: { r2_key: string; image_url: string } | null;
  complex_image?: { r2_key: string; image_url: string } | null;
  images_count?: number;
}

interface PaginatedComplexes {
  items: ManagedComplex[];
  total: number;
}

interface ApiResponse<T> {
  data: T;
  message?: string;
}

interface EditComplexForm {
  name: string;
  city: string;
  address: string;
  telephones: string;
  latitude: string;
  longitude: string;
}

const emptyForm: EditComplexForm = {
  name: '',
  city: '',
  address: '',
  telephones: '',
  latitude: '',
  longitude: '',
};

const inputClass =
  'w-full rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--color-text)] outline-none transition-all placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_var(--color-primary-glow)]';

const labelClass =
  'mb-1.5 block text-[11px] font-extrabold uppercase tracking-[0.12em] text-[var(--color-text-2)]';

export default function AdminComplexEdit() {
  const { complexId } = useParams<{ complexId: string }>();
  const navigate = useNavigate();

  const [complex, setComplex] = useState<ManagedComplex | null>(null);
  const [form, setForm] = useState<EditComplexForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof EditComplexForm, string>>>({});

  useEffect(() => {
    if (!complexId) {
      setError('No se indicó el complejo a editar.');
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadComplex = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await ApiClient.get<ApiResponse<PaginatedComplexes>>(
          '/complexes/manager/list/?page_size=100&include_complex_image=true',
          { withAuth: true },
        );

        const items = Array.isArray(res.data)
          ? res.data
          : (res.data as PaginatedComplexes)?.items ?? [];
        const found = items.find((item) => item.complex_id === complexId);

        if (!found) {
          throw new Error('No se encontró el complejo o no tienes permisos para editarlo.');
        }

        if (cancelled) return;

        const image = found.last_image ?? found.complex_image ?? null;
        const normalized: ManagedComplex = {
          ...found,
          last_image: image,
          images_count: found.images_count ?? (image ? 1 : 0),
        };

        setComplex(normalized);
        setForm({
          name: found.name ?? '',
          city: found.city ?? '',
          address: found.address ?? '',
          telephones: (found.telephones ?? []).join(', '),
          latitude:
            found.latitude !== null && found.latitude !== undefined
              ? String(found.latitude)
              : '',
          longitude:
            found.longitude !== null && found.longitude !== undefined
              ? String(found.longitude)
              : '',
        });
      } catch (err) {
        if (!cancelled) {
          setError(
            (err as { message?: string })?.message ?? 'No se pudo cargar el complejo.',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadComplex();

    return () => {
      cancelled = true;
    };
  }, [complexId]);

  const setField = (field: keyof EditComplexForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): boolean => {
    const errors: Partial<Record<keyof EditComplexForm, string>> = {};

    if (!form.name.trim()) errors.name = 'El nombre es obligatorio.';
    if (!form.city.trim()) errors.city = 'La ciudad es obligatoria.';
    if (!form.address.trim()) errors.address = 'La dirección es obligatoria.';
    if ((form.latitude && !form.longitude) || (!form.latitude && form.longitude)) {
      errors.latitude = 'Selecciona la ubicación completa en el mapa.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!complexId || !complex || saving || !validate()) return;

    setSaving(true);

    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        city: form.city.trim(),
        address: form.address.trim(),
        telephones: form.telephones
          .split(',')
          .map((phone) => phone.trim())
          .filter(Boolean),
      };

      if (form.latitude && form.longitude) {
        payload.latitude = Number(form.latitude);
        payload.longitude = Number(form.longitude);
      }

      await ApiClient.put(`/complexes/${complexId}/`, payload, { withAuth: true });
      toast.success('Complejo actualizado', 'La información y ubicación se guardaron correctamente.');
      navigate('/admin/complexes');
    } catch (err) {
      toast.error(
        'No se pudo guardar',
        (err as { message?: string })?.message ?? 'Verifica los datos e intenta de nuevo.',
      );
    } finally {
      setSaving(false);
    }
  };

  const imageUrl = complex?.last_image?.image_url ?? complex?.complex_image?.image_url ?? null;

  if (loading) {
    return (
      <div className="min-h-full bg-[var(--color-bg)] p-5 sm:p-8">
        <div className="mx-auto max-w-6xl space-y-6 animate-pulse">
          <div className="h-8 w-56 rounded-full bg-[var(--color-surf2)]" />
          <div className="h-48 rounded-[var(--radius-2xl)] bg-[var(--color-surf2)]" />
          <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
            <div className="h-80 rounded-[var(--radius-2xl)] bg-[var(--color-surf2)]" />
            <div className="h-80 rounded-[var(--radius-2xl)] bg-[var(--color-surf2)]" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !complex) {
    return (
      <div className="min-h-full bg-[var(--color-bg)] p-5 sm:p-8">
        <div className="mx-auto max-w-xl rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-white p-8 text-center shadow-[var(--shadow-md)]">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
            <AlertCircle className="h-7 w-7 text-red-600" />
          </div>
          <h1 className="text-xl font-extrabold text-[var(--color-text)]">
            No se pudo cargar el complejo
          </h1>
          <p className="mt-2 text-sm font-semibold text-[var(--color-text-3)]">
            {error ?? 'Complejo no encontrado.'}
          </p>
          <button
            type="button"
            onClick={() => navigate('/admin/complexes')}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-extrabold text-white shadow-[var(--shadow-primary)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a Mis Complejos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[var(--color-bg)] p-5 sm:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/complexes')}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-border)] bg-white text-[var(--color-text-2)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            aria-label="Volver a Mis Complejos"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[var(--color-primary)]">
              Gestión de complejo
            </p>
            <h1 className="text-2xl font-extrabold leading-tight text-[var(--color-text)] sm:text-3xl">
              Editar complejo
            </h1>
          </div>
        </header>

        <ComplexImageCover
          src={imageUrl}
          alt={complex.name}
          className="h-44 rounded-[var(--radius-2xl)] border border-[var(--color-border)] shadow-[var(--shadow-lg)] sm:h-52"
        >
          <div className="relative z-10 flex h-full flex-col justify-end p-6 sm:p-8">
            <p className="font-[var(--font-pixel)] text-[8px] uppercase tracking-[0.2em] text-[var(--color-primary-light)]">
              {complex.images_count ?? 0} foto{(complex.images_count ?? 0) === 1 ? '' : 's'} del complejo
            </p>
            <h2 className="mt-2 text-3xl font-extrabold leading-tight text-white sm:text-4xl">
              {complex.name}
            </h2>
            <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-white/70">
              <MapPin className="h-4 w-4 flex-shrink-0 text-[var(--color-primary-light)]" />
              {[complex.address, complex.city].filter(Boolean).join(', ')}
            </p>
          </div>
        </ComplexImageCover>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_440px]">
            <section className="rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-md)]">
              <div className="mb-5 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-primary-tint)]">
                  <Building2 className="h-4 w-4 text-[var(--color-primary)]" />
                </div>
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[var(--color-text-3)]">
                    Información
                  </p>
                  <h2 className="text-lg font-extrabold text-[var(--color-text)]">
                    Datos del complejo
                  </h2>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={labelClass}>Nombre del complejo</label>
                  <input
                    value={form.name}
                    onChange={(event) => setField('name', event.target.value)}
                    className={inputClass}
                    placeholder="Ej: Complejo Norte"
                  />
                  {formErrors.name && (
                    <p className="mt-1 text-xs font-bold text-red-600">{formErrors.name}</p>
                  )}
                </div>

                <div>
                  <label className={labelClass}>Ciudad</label>
                  <input
                    value={form.city}
                    onChange={(event) => setField('city', event.target.value)}
                    className={inputClass}
                    placeholder="Ej: Popayán"
                  />
                  {formErrors.city && (
                    <p className="mt-1 text-xs font-bold text-red-600">{formErrors.city}</p>
                  )}
                </div>

                <div>
                  <label className={labelClass}>Teléfonos</label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-3)]" />
                    <input
                      value={form.telephones}
                      onChange={(event) => setField('telephones', event.target.value)}
                      className={`${inputClass} pl-11`}
                      placeholder="+57 300 123 4567, +57 310 456 7890"
                    />
                  </div>
                  <p className="mt-1 text-[10px] font-semibold text-[var(--color-text-3)]">
                    Separa varios teléfonos con comas.
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <label className={labelClass}>Dirección</label>
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-3)]" />
                    <input
                      value={form.address}
                      onChange={(event) => setField('address', event.target.value)}
                      className={`${inputClass} pl-11`}
                      placeholder="Calle, carrera, barrio o dirección"
                    />
                  </div>
                  {formErrors.address && (
                    <p className="mt-1 text-xs font-bold text-red-600">{formErrors.address}</p>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-md)]">
              <div className="mb-5 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-primary-tint)]">
                  <MapPin className="h-4 w-4 text-[var(--color-primary)]" />
                </div>
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[var(--color-text-3)]">
                    Ubicación
                  </p>
                  <h2 className="text-lg font-extrabold text-[var(--color-text)]">
                    Ubicación geográfica
                  </h2>
                </div>
              </div>

              <p className="mb-3 text-xs font-semibold leading-relaxed text-[var(--color-text-3)]">
                Busca una dirección o haz clic en el mapa para mover el marcador. También puedes
                arrastrarlo para ajustar la ubicación.
              </p>

              <ComplexLocationPicker
                key={complexId}
                latitude={form.latitude}
                longitude={form.longitude}
                onChange={(latitude, longitude) => {
                  setForm((prev) => ({ ...prev, latitude, longitude }));
                  if (formErrors.latitude) {
                    setFormErrors((prev) => ({ ...prev, latitude: undefined }));
                  }
                }}
              />

              {form.latitude && form.longitude ? (
                <div className="mt-3 flex items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--color-primary)]/30 bg-[var(--color-primary-tint)] px-3 py-2">
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-[var(--color-primary)]" />
                  <span className="text-xs font-bold text-[var(--color-primary-dark)]">
                    {Number(form.latitude).toFixed(6)}, {Number(form.longitude).toFixed(6)}
                  </span>
                </div>
              ) : (
                <p className="mt-3 text-xs font-bold text-amber-700">
                  Selecciona la ubicación para actualizar las coordenadas del complejo.
                </p>
              )}

              {formErrors.latitude && (
                <p className="mt-1 text-xs font-bold text-red-600">{formErrors.latitude}</p>
              )}
            </section>
          </div>

          <div className="flex flex-col-reverse gap-3 rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-md)] sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={() => navigate('/admin/complexes')}
              disabled={saving}
              className="rounded-full border border-[var(--color-border)] px-5 py-2.5 text-sm font-extrabold text-[var(--color-text-2)] transition-colors hover:bg-[var(--color-surf2)] disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] px-6 py-2.5 text-sm font-extrabold text-white shadow-[var(--shadow-primary)] transition-all hover:-translate-y-0.5 hover:bg-[var(--color-primary-dark)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
