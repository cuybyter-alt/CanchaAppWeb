import React, { useEffect, useState, useRef } from 'react';
import { Plus, Building2, MapPin, Phone, Target, Users, X, Loader2, AlertCircle, CheckCircle, Mail, Send, Trash2 } from 'lucide-react';
import invitationService from '../../services/InvitationService';
import type { ComplexInvitation } from '../../types/invitation';
import { useNavigate } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import ApiClient from '../../services/ApiClient';
import { tokenStorage } from '../../services/AuthService';
import { toast } from 'sonner';
import { setupGeocoder, initializeMapbox, createMap, getUserLocation, addComplexMarkers } from '../../services/mapboxService';
import type { ComplexMarker } from '../../types/map';
import type MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
 
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
  latitude?: number | null;
  longitude?: number | null;
}
 
interface ApiResponse<T> { data: T; message?: string; }
interface PaginatedData { items: ComplexItem[]; total: number; }
interface CreateComplexForm { name: string; city: string; address: string; telephones: string; latitude: string; longitude: string; }
const FORM_EMPTY: CreateComplexForm = { name: '', city: '', address: '', telephones: '', latitude: '', longitude: '' };
 
// ─── Admins Modal ─────────────────────────────────────────────────────────────
 
interface Manager { user_id: string; status: string; user?: { f_name: string; l_name: string; email: string; avatar_url?: string | null }; }

const INVITATION_STATUS_CFG = {
  pending:   { label: 'Pendiente',  cls: 'bg-yellow-50 text-yellow-700 border border-yellow-200' },
  accepted:  { label: 'Aceptada',   cls: 'bg-[var(--color-primary-tint)] text-[var(--color-primary-dark)]' },
  cancelled: { label: 'Cancelada',  cls: 'bg-[var(--color-surf2)] text-[var(--color-text-3)]' },
} as const;
 
function AdminsModal({ complex, onClose }: { complex: ComplexItem; onClose: () => void }) {
  const [tab, setTab] = useState<'managers' | 'invitations'>('managers');

  // ── Managers state ──
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loadingManagers, setLoadingManagers] = useState(true);

  // ── Invitations state ──
  const [invitations, setInvitations] = useState<ComplexInvitation[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const invitationsFetchedRef = useRef(false);
 
  useEffect(() => {
    let cancelled = false;
    ApiClient.get<ApiResponse<Manager[]>>(`/complexes/${complex.complex_id}/managers/`, { withAuth: true })
      .then((res) => { if (!cancelled) setManagers(Array.isArray(res.data) ? res.data : []); })
      .catch(() => { if (!cancelled) setManagers([]); })
      .finally(() => { if (!cancelled) setLoadingManagers(false); });
    return () => { cancelled = true; };
  }, [complex.complex_id]);

  const loadInvitations = async () => {
    setLoadingInvitations(true);
    try {
      const data = await invitationService.listInvitations(complex.complex_id);
      setInvitations(data);
    } catch {
      setInvitations([]);
    } finally {
      setLoadingInvitations(false);
    }
  };

  useEffect(() => {
    if (tab === 'invitations' && !invitationsFetchedRef.current) {
      invitationsFetchedRef.current = true;
      loadInvitations();
    }
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) { setInviteError('Ingresa un email'); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail.trim())) { setInviteError('Email inválido'); return; }
    setInviteError(null);
    setInviteLoading(true);
    try {
      await invitationService.sendInvitation(complex.complex_id, inviteEmail.trim());
      toast.success('Invitación enviada exitosamente');
      setInviteEmail('');
      loadInvitations();
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      if (err.code === 'PENDING_INVITATION_ALREADY_EXISTS') {
        setInviteError('Ya existe una invitación pendiente para este email');
      } else {
        setInviteError(err.message ?? 'Error al enviar la invitación');
      }
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!window.confirm('¿Cancelar esta invitación?')) return;
    setCancellingId(invitationId);
    try {
      await invitationService.cancelInvitation(complex.complex_id, invitationId);
      toast.success('Invitación cancelada');
      setInvitations(prev => prev.filter(i => i.invitation_id !== invitationId));
    } catch (e: unknown) {
      toast.error((e as { message?: string }).message ?? 'Error al cancelar');
    } finally {
      setCancellingId(null);
    }
  };

  const inviteInputCls = (err: string | null) =>
    `flex-1 px-3 py-2 rounded-[var(--radius-lg)] border text-sm font-bold text-[var(--color-text)] bg-white outline-none transition-all placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_var(--color-primary-glow)] ${err ? 'border-[var(--color-accent)]' : 'border-[var(--color-border)]'}`;
 
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-[var(--radius-2xl)] shadow-[var(--shadow-2xl)] w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="bg-[var(--color-text)] px-6 py-5 flex items-center justify-between flex-shrink-0">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--color-text-3)] mb-0.5">Administradores</p>
            <h3 className="text-white font-extrabold text-lg leading-tight">{complex.name}</h3>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-[var(--color-border)] flex flex-shrink-0">
          <button
            onClick={() => setTab('managers')}
            className={`flex-1 py-3 text-sm font-extrabold transition-colors flex items-center justify-center gap-1.5 ${
              tab === 'managers'
                ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'text-[var(--color-text-3)] hover:text-[var(--color-text-2)]'
            }`}
          >
            <Users className="w-4 h-4" /> Managers
          </button>
          <button
            onClick={() => setTab('invitations')}
            className={`flex-1 py-3 text-sm font-extrabold transition-colors flex items-center justify-center gap-1.5 ${
              tab === 'invitations'
                ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'text-[var(--color-text-3)] hover:text-[var(--color-text-2)]'
            }`}
          >
            <Mail className="w-4 h-4" /> Invitaciones
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* ── Managers tab ── */}
          {tab === 'managers' && (
            loadingManagers ? (
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
            )
          )}

          {/* ── Invitations tab ── */}
          {tab === 'invitations' && (
            <div className="space-y-4">
              {/* Send invite form */}
              <div>
                <label className="block text-[11px] font-extrabold text-[var(--color-text-2)] mb-2 uppercase tracking-wide">
                  Invitar por email
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => { setInviteEmail(e.target.value); if (inviteError) setInviteError(null); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSendInvite(); }}
                    placeholder="persona@ejemplo.com"
                    className={inviteInputCls(inviteError)}
                  />
                  <button
                    onClick={handleSendInvite}
                    disabled={inviteLoading}
                    className="px-4 py-2 rounded-[var(--radius-lg)] bg-[var(--color-primary)] text-white text-sm font-extrabold shadow-[var(--shadow-primary)] hover:bg-[var(--color-primary-dark)] transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5 flex-shrink-0"
                  >
                    {inviteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Enviar
                  </button>
                </div>
                {inviteError && (
                  <p className="text-xs text-[var(--color-accent)] mt-1.5 font-bold">{inviteError}</p>
                )}
              </div>

              <div className="h-px bg-[var(--color-border)]" />

              {/* Invitations list */}
              {loadingInvitations ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--color-primary)]" />
                </div>
              ) : invitations.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-full bg-[var(--color-surf2)] flex items-center justify-center mx-auto mb-3">
                    <Mail className="w-5 h-5 text-[var(--color-muted)]" />
                  </div>
                  <p className="text-sm font-extrabold text-[var(--color-text-2)]">Sin invitaciones</p>
                  <p className="text-xs text-[var(--color-text-3)] mt-1">Envía la primera invitación arriba</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {invitations.map((inv) => {
                    const cfg = INVITATION_STATUS_CFG[inv.status] ?? INVITATION_STATUS_CFG.cancelled;
                    const exp = new Date(inv.expires_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
                    return (
                      <li key={inv.invitation_id} className="flex items-center gap-3 p-3 rounded-[var(--radius-lg)] bg-[var(--color-bg)] border border-[var(--color-border)]">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-extrabold text-[var(--color-text)] truncate">{inv.invitee_email}</p>
                          <p className="text-[10px] text-[var(--color-text-3)] mt-0.5">Expira: {exp}</p>
                        </div>
                        <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase flex-shrink-0 ${cfg.cls}`}>
                          {cfg.label}
                        </span>
                        {inv.status === 'pending' && (
                          <button
                            onClick={() => handleCancelInvitation(inv.invitation_id)}
                            disabled={cancellingId === inv.invitation_id}
                            className="w-8 h-8 rounded-full bg-[var(--color-surf2)] hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-colors flex-shrink-0 text-[var(--color-text-3)] disabled:opacity-50"
                            title="Cancelar invitación"
                          >
                            {cancellingId === inv.invitation_id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <Trash2 className="w-3.5 h-3.5" />
                            }
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-3 flex-shrink-0 border-t border-[var(--color-border)]">
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
  const geocoderContainerRef = useRef<HTMLDivElement>(null);
  const geocoderInstanceRef = useRef<MapboxGeocoder | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const complexMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const complexesRef = useRef<ComplexItem[]>(complexes);
  useEffect(() => { complexesRef.current = complexes; }, [complexes]);

  // Mount / unmount the geocoder + map when the form toggles
  useEffect(() => {
    if (!showForm) {
      if (geocoderInstanceRef.current) {
        try { geocoderInstanceRef.current.onRemove(); } catch { /* noop */ }
        geocoderInstanceRef.current = null;
      }
      if (markerRef.current) { markerRef.current.remove(); markerRef.current = null; }
      complexMarkersRef.current.forEach(m => m.remove());
      complexMarkersRef.current = [];
      if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; }
      return;
    }

    const timer = setTimeout(async () => {
      initializeMapbox();

      // ── Visual map (created first so we can pass it to geocoder.onAdd) ──
      if (mapContainerRef.current && !mapInstanceRef.current) {
        const userLoc = await getUserLocation();
        const center: [number, number] = userLoc
          ? [userLoc.longitude, userLoc.latitude]
          : [-74.0721, 4.711]; // Bogotá fallback
        const map = createMap(mapContainerRef.current, {
          style: 'mapbox://styles/mapbox/dark-v11',
          center,
          zoom: userLoc ? 13 : 11,
          pitch: 0,
        });
        if (!map) return;
        mapInstanceRef.current = map;

        // Click on map to place / move marker
        map.on('click', (ev) => {
          const { lng, lat } = ev.lngLat;
          placeMarker(lng, lat);
          setForm(prev => ({ ...prev, latitude: lat.toFixed(6), longitude: lng.toFixed(6) }));
          setFormErrors(prev => ({ ...prev, latitude: undefined, longitude: undefined }));
        });

        // Show existing complexes as markers
        map.once('load', () => {
          const validMarkers: ComplexMarker[] = complexesRef.current
            .filter(c => c.latitude != null && c.longitude != null)
            .map(c => ({
              id: c.complex_id,
              name: c.name,
              address: c.address ?? '',
              city: c.city ?? '',
              latitude: c.latitude as number,
              longitude: c.longitude as number,
              minPrice: c.min_price ?? 0,
              maxPrice: c.max_price ?? 0,
              fieldsCount: c.fields_count,
            }));
          if (validMarkers.length > 0) {
            complexMarkersRef.current = addComplexMarkers(
              map,
              validMarkers,
              (m) => navigate(`/admin/complexes/${m.id}/fields`),
            );
          }
        });
      }

      // ── Standalone geocoder input (above the map, no clipping issues) ──
      if (geocoderContainerRef.current && !geocoderInstanceRef.current && mapInstanceRef.current) {
        const geocoder = setupGeocoder({ placeholder: 'Buscar dirección del complejo…' });
        geocoderInstanceRef.current = geocoder;
        geocoderContainerRef.current.innerHTML = '';
        // Pass the map to onAdd — satisfies IControl signature; geocoder stays in our custom container
        geocoderContainerRef.current.appendChild(geocoder.onAdd(mapInstanceRef.current));

        geocoder.on('result', (e: { result: { geometry: { coordinates: [number, number] }; place_name?: string } }) => {
          const [lng, lat] = e.result.geometry.coordinates;
          setForm(prev => ({
            ...prev,
            latitude: lat.toFixed(6),
            longitude: lng.toFixed(6),
            address: prev.address || e.result.place_name || '',
          }));
          setFormErrors(prev => ({ ...prev, latitude: undefined, longitude: undefined }));
          mapInstanceRef.current!.flyTo({ center: [lng, lat], zoom: 15, speed: 1.4, essential: true });
          placeMarker(lng, lat);
        });

        geocoder.on('clear', () => {
          setForm(prev => ({ ...prev, latitude: '', longitude: '' }));
          if (markerRef.current) { markerRef.current.remove(); markerRef.current = null; }
        });
      }
    }, 80);

    function placeMarker(lng: number, lat: number) {
      if (!mapInstanceRef.current) return;
      if (markerRef.current) {
        markerRef.current.setLngLat([lng, lat]);
      } else {
        const m = new mapboxgl.Marker({ color: '#62bf3b', draggable: true })
          .setLngLat([lng, lat])
          .addTo(mapInstanceRef.current);
        m.on('dragend', () => {
          const pos = m.getLngLat();
          setForm(prev => ({ ...prev, latitude: pos.lat.toFixed(6), longitude: pos.lng.toFixed(6) }));
        });
        markerRef.current = m;
      }
    }

    return () => {
      clearTimeout(timer);
      if (geocoderInstanceRef.current) {
        try { geocoderInstanceRef.current.onRemove(); } catch { /* noop */ }
        geocoderInstanceRef.current = null;
      }
      if (markerRef.current) { markerRef.current.remove(); markerRef.current = null; }
      complexMarkersRef.current.forEach(m => m.remove());
      complexMarkersRef.current = [];
      if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; }
    };
  }, [showForm]); // eslint-disable-line react-hooks/exhaustive-deps
 
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
            ] as { key: keyof CreateComplexForm; label: string; placeholder: string; type: string; hint?: string }[]).map(({ key, label, placeholder, hint }) => (
              <div key={key}>
                <label className="block text-[11px] font-extrabold text-[var(--color-text-2)] mb-1.5 uppercase tracking-wide">{label}</label>
                <input
                  type="text"
                  value={form[key]}
                  onChange={e => setField(key, e.target.value)}
                  placeholder={placeholder}
                  className={inputCls(formErrors[key])}
                />
                {hint && <p className="text-[10px] text-[var(--color-text-3)] mt-1">{hint}</p>}
                {formErrors[key] && <p className="text-xs text-[var(--color-accent)] mt-1 font-bold">{formErrors[key]}</p>}
              </div>
            ))}

            {/* Location picker — full width: geocoder input + visual map */}
            <div className="sm:col-span-2 space-y-2">
              <label className="block text-[11px] font-extrabold text-[var(--color-text-2)] mb-1.5 uppercase tracking-wide">
                Ubicación en el mapa
              </label>
              <p className="text-[10px] text-[var(--color-text-3)] -mt-1">
                Busca la dirección o haz clic directamente en el mapa. Arrastra el marcador verde para ajustar.
              </p>
              {/* Standalone geocoder input (outside the map to avoid dropdown clipping) */}
              <div ref={geocoderContainerRef} className="geocoder-admin" />
              {/* Visual map */}
              <div
                ref={mapContainerRef}
                className="w-full rounded-[var(--radius-lg)] border border-[var(--color-border)]"
                style={{ height: '260px' }}
              />
              {(form.latitude || form.longitude) && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-lg)] bg-[var(--color-primary-tint)] border border-[var(--color-primary)]/30">
                  <MapPin className="w-3.5 h-3.5 text-[var(--color-primary)] flex-shrink-0" />
                  <span className="text-xs font-bold text-[var(--color-primary-dark)] flex-1">
                    {Number(form.latitude).toFixed(5)}, {Number(form.longitude).toFixed(5)}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setForm(p => ({ ...p, latitude: '', longitude: '' }));
                      geocoderInstanceRef.current?.clear();
                      if (markerRef.current) { markerRef.current.remove(); markerRef.current = null; }
                    }}
                    className="text-[10px] font-extrabold text-[var(--color-accent)] hover:underline"
                  >
                    Limpiar
                  </button>
                </div>
              )}
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