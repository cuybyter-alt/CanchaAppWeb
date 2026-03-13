import React, { useEffect, useState } from 'react';
import { ArrowLeft, MapPin, Building2, Ruler } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Typography } from '../components/ui/typography';
import ApiClient from '../services/ApiClient';

// ── Types ──────────────────────────────────────────────────────────────────

interface ComplexField {
  field_id: string;
  name: string;
  status: 'active' | 'inactive' | string;
  type: string; // "futbol_5" | "futbol_7" | "futbol_11" | "microfutbol" | "futsal"
  length?: number;
  width?: number;
}

interface ComplexDetailData {
  complex_id: string;
  name: string;
  address: string;
  city: string;
  status: string;
  min_price: number;
  max_price: number;
  fields: ComplexField[];
  images: string[];
}

interface ApiWrapper {
  success: boolean;
  data: ComplexDetailData;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const SPORT_META: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  futbol_5:    { label: 'Fútbol 5',    icon: 'fa-futbol',     color: '#62bf3b', bg: 'rgba(98,191,59,0.12)' },
  futbol_7:    { label: 'Fútbol 7',    icon: 'fa-futbol',     color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  futbol_11:   { label: 'Fútbol 11',   icon: 'fa-futbol',     color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  microfutbol: { label: 'Microfútbol', icon: 'fa-circle-dot', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  futsal:      { label: 'Futsal',      icon: 'fa-futbol',     color: '#ec4899', bg: 'rgba(236,72,153,0.12)' },
};

const getSportMeta = (type: string) =>
  SPORT_META[type] ?? { label: type, icon: 'fa-futbol', color: '#62bf3b', bg: 'rgba(98,191,59,0.12)' };

const formatPrice = (v: number) =>
  `$${Math.round(v / 1000)}k`;

// ── Component ──────────────────────────────────────────────────────────────

const ComplexDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [complex, setComplex] = useState<ComplexDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let mounted = true;

    const load = async () => {
      setIsLoading(true);
      try {
        const res = await ApiClient.get<ApiWrapper>(`/complexes/${id}/`);
        if (mounted) setComplex(res.data);
      } catch {
        if (mounted) setError('No se pudo cargar el complejo. Intenta de nuevo.');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, [id]);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate(-1)} className="p-2 rounded-[var(--radius-lg)] hover:bg-[var(--color-surf2)] transition-colors">
            <ArrowLeft className="w-5 h-5 text-[var(--color-text-2)]" />
          </button>
          <div className="h-7 w-48 bg-[var(--color-surf2)] rounded-[var(--radius-md)] animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-[var(--color-surf2)] rounded-[var(--radius-2xl)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error || !complex) {
    return (
      <div className="p-4 sm:p-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-[var(--color-text-2)] hover:text-[var(--color-text)] mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-2xl)] p-8 text-center">
          <i className="fa-solid fa-triangle-exclamation text-[var(--color-accent)] text-3xl mb-3" />
          <p className="text-sm font-bold text-[var(--color-text-3)]">{error ?? 'Complejo no encontrado'}</p>
        </div>
      </div>
    );
  }

  const priceLabel =
    complex.min_price === complex.max_price
      ? `${formatPrice(complex.min_price)}/h`
      : `${formatPrice(complex.min_price)} – ${formatPrice(complex.max_price)}/h`;

  const activeFields = complex.fields.filter((f) => f.status === 'active');

  return (
    <div className="p-4 sm:p-6 space-y-6">

      {/* ── Header ── */}
      <div>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-[13px] font-extrabold text-[var(--color-text-3)] hover:text-[var(--color-text)] mb-4 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>

        <div className="bg-[var(--color-text)] rounded-[var(--radius-2xl)] p-6 relative overflow-hidden">
          {/* Grid background */}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg,transparent,transparent 23px,rgba(98,191,59,.06) 24px),repeating-linear-gradient(90deg,transparent,transparent 23px,rgba(98,191,59,.06) 24px)',
            }}
          />

          <div className="relative z-10">
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className="w-14 h-14 rounded-[var(--radius-xl)] bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/30 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-7 h-7 text-[var(--color-primary)]" />
              </div>

              <div className="min-w-0 flex-1">
                <Typography variant="h2" color="text" className="!text-white mb-1 truncate">
                  {complex.name}
                </Typography>
                <div className="flex flex-wrap gap-3 text-xs text-white/55 font-semibold">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[var(--color-primary-light)]" />
                    {complex.address}
                  </span>
                  <span className="flex items-center gap-1">
                    <i className="fa-solid fa-city text-[var(--color-primary-light)]" />
                    {complex.city}
                  </span>
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div className="mt-5 flex flex-wrap gap-3">
              <div className="bg-white/8 border border-white/10 rounded-[var(--radius-lg)] px-4 py-2.5 flex items-center gap-2">
                <i className="fa-solid fa-futbol text-[var(--color-primary)]" />
                <div>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest leading-none mb-0.5">Canchas</p>
                  <p className="text-lg font-black text-white leading-none">{activeFields.length}</p>
                </div>
              </div>
              <div className="bg-white/8 border border-white/10 rounded-[var(--radius-lg)] px-4 py-2.5 flex items-center gap-2">
                <i className="fa-solid fa-tag text-[var(--color-primary)]" />
                <div>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest leading-none mb-0.5">Precio</p>
                  <p className="text-lg font-black text-white leading-none">{priceLabel}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Field list ── */}
      <div>
        <Typography variant="h3" color="text" className="mb-4">
          <i className="fa-solid fa-futbol text-[var(--color-primary)] mr-2" />
          Canchas disponibles
        </Typography>

        {activeFields.length === 0 ? (
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-2xl)] p-8 text-center">
            <Typography variant="small" color="text-3">Este complejo aún no tiene canchas registradas.</Typography>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {activeFields.map((field) => {
              const meta = getSportMeta(field.type);
              return (
                <div
                  key={field.field_id}
                  className="bg-[var(--color-surface)] border-[1.5px] border-[var(--color-border)] rounded-[var(--radius-2xl)] p-5 flex flex-col gap-3 hover:border-[var(--color-primary)] hover:shadow-[var(--shadow-lg)] transition-all duration-[var(--duration-fast)]"
                >
                  {/* Sport badge */}
                  <div className="flex items-center justify-between">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-extrabold"
                      style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}30` }}
                    >
                      <i className={`fa-solid ${meta.icon} text-[9px]`} />
                      {meta.label}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 rounded-full px-2.5 py-1">
                      <i className="fa-solid fa-circle-check text-[9px]" />
                      Activa
                    </span>
                  </div>

                  {/* Name */}
                  <p className="font-[var(--font-display)] text-[18px] font-black text-[var(--color-text)] leading-tight">
                    {field.name}
                  </p>

                  {/* Dimensions */}
                  {field.length && field.width && (
                    <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[var(--color-text-3)]">
                      <Ruler className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                      {field.length} × {field.width} m
                    </div>
                  )}

                  {/* Price range from complex */}
                  <div className="mt-auto pt-3 border-t border-[var(--color-border)] flex items-center justify-between">
                    <span className="text-[12px] font-bold text-[var(--color-text-3)]">Precio/hora</span>
                    <span className="font-[var(--font-display)] text-[20px] font-black text-[var(--color-primary)] leading-none">
                      {priceLabel}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Inactive fields notice */}
        {complex.fields.length > activeFields.length && (
          <p className="mt-3 text-xs font-bold text-[var(--color-text-3)] text-center">
            {complex.fields.length - activeFields.length} cancha{complex.fields.length - activeFields.length !== 1 ? 's' : ''} inactiva{complex.fields.length - activeFields.length !== 1 ? 's' : ''} no mostrada{complex.fields.length - activeFields.length !== 1 ? 's' : ''}.
          </p>
        )}
      </div>
    </div>
  );
};

export default ComplexDetail;
