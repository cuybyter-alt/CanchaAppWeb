import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Building2, Mail, CheckCircle, XCircle, Clock, Loader2, AlertCircle,
  Eye, EyeOff,
} from 'lucide-react';
import invitationService from '../services/InvitationService';
import { tokenStorage } from '../services/AuthService';
import type { UserOutput } from '../services/AuthService';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import type { ComplexInvitation, RegisterAndAcceptInput } from '../types/invitation';
import type { ApiError } from '../services/ApiClient';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fieldCls = (err?: string) =>
  `w-full px-4 py-2.5 rounded-xl border text-sm font-bold text-gray-900 bg-white outline-none transition-all placeholder:text-gray-400 focus:border-[#62bf3b] focus:shadow-[0_0_0_3px_rgba(98,191,59,0.15)] ${err ? 'border-red-400' : 'border-gray-200'}`;

// ─── Component ────────────────────────────────────────────────────────────────

const InvitationAccept: React.FC = () => {
  // Support both /invitaciones?token= (deep link from email) and /invitations/:token
  const { token: pathToken } = useParams<{ token?: string }>();
  const [searchParams] = useSearchParams();
  const token = pathToken ?? searchParams.get('token') ?? '';
  const navigate = useNavigate();

  const [invitation, setInvitation] = useState<ComplexInvitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Accept (logged-in flow)
  const [accepting, setAccepting] = useState(false);

  // Auth mode for non-logged-in users
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Register-and-accept form
  const [regForm, setRegForm] = useState<RegisterAndAcceptInput>({
    f_name: '', l_name: '', username: '', password: '',
  });
  const [regErrors, setRegErrors] = useState<Partial<RegisterAndAcceptInput>>({});
  const [regLoading, setRegLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { refreshUser } = useAuth();
  const isLoggedIn = !!tokenStorage.getAccess();

  // ── Load invitation ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) { setError('Token inválido o faltante.'); setLoading(false); return; }
    invitationService.getByToken(token)
      .then(setInvitation)
      .catch((e: ApiError) => {
        setError(e.status === 404
          ? 'La invitación no existe o fue cancelada.'
          : (e.message ?? 'Error al cargar la invitación.'),
        );
      })
      .finally(() => setLoading(false));
  }, [token]);

  // ── Accept (existing account, logged in) ────────────────────────────────
  const handleAccept = async () => {
    if (!token) return;
    setAccepting(true);
    try {
      await invitationService.acceptInvitation(token);
      toast.success('¡Invitación aceptada! Ya eres Manager de este complejo.');
      navigate('/admin');
    } catch (e: unknown) {
      const err = e as ApiError & { code?: string };
      if (err.status === 409 || err.code === 'INVITATION_ALREADY_ACCEPTED') {
        toast.error('Esta invitación ya fue aceptada.');
      } else if (err.status === 422 || err.code === 'INVITATION_EXPIRED') {
        toast.error('La invitación expiró. Pide al propietario que envíe una nueva.');
      } else if (err.status === 403 || err.code === 'INVITATION_EMAIL_MISMATCH') {
        toast.error('Esta invitación no corresponde a tu cuenta.');
      } else {
        toast.error(err.message ?? 'Error al aceptar la invitación.');
      }
      setAccepting(false);
    }
  };

  // ── Register-and-accept (new user) ───────────────────────────────────────
  const validateReg = (): boolean => {
    const errors: Partial<RegisterAndAcceptInput> = {};
    if (!regForm.f_name.trim()) errors.f_name = 'Requerido';
    if (!regForm.l_name.trim()) errors.l_name = 'Requerido';
    if (!regForm.username.trim()) errors.username = 'Requerido';
    if (regForm.password.length < 8) errors.password = 'Mínimo 8 caracteres';
    setRegErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const setRegField = (k: keyof RegisterAndAcceptInput, v: string) => {
    setRegForm(p => ({ ...p, [k]: v }));
    if (regErrors[k]) setRegErrors(p => ({ ...p, [k]: undefined }));
  };

  const handleRegisterAndAccept = async () => {
    if (!validateReg() || !token) return;
    setRegLoading(true);
    try {
      const data = await invitationService.registerAndAccept(token, regForm);
      tokenStorage.save({ access: data.access, refresh: data.refresh });
      tokenStorage.saveUser(data.user as UserOutput);
      refreshUser();
      toast.success(`¡Bienvenido, ${data.user.f_name}! Ya eres Manager de ${data.invitation.complex_name}.`);
      navigate('/admin');
    } catch (e: unknown) {
      const err = e as ApiError & { code?: string };
      if (err.status === 409 || err.code === 'USER_ALREADY_EXISTS') {
        setRegErrors(p => ({ ...p, username: 'El usuario o email ya está registrado' }));
      } else if (err.status === 422 || err.code === 'INVITATION_EXPIRED') {
        toast.error('La invitación expiró. Pide al propietario que envíe una nueva.');
      } else if (err.details) {
        setRegErrors(err.details as Partial<RegisterAndAcceptInput>);
      } else {
        toast.error(err.message ?? 'Error al crear la cuenta.');
      }
      setRegLoading(false);
    }
  };

  const loginRedirect = `/invitaciones?token=${token}`;

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f4f0]">
        <Loader2 className="w-9 h-9 animate-spin text-[#62bf3b]" />
      </div>
    );
  }

  // ── Error / not found ────────────────────────────────────────────────────
  if (error || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f4f0] p-4">
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-sm px-8 py-10 text-center">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-extrabold text-gray-900 mb-2">Invitación no válida</h2>
          <p className="text-sm text-gray-500">{error ?? 'Esta invitación no existe.'}</p>
          <Link to="/" className="mt-6 inline-block px-6 py-2.5 rounded-full bg-[#62bf3b] text-white text-sm font-extrabold hover:bg-[#4fa32e] transition-colors">
            Ir al inicio
          </Link>
        </div>
      </div>
    );
  }

  // ── Cancelled ────────────────────────────────────────────────────────────
  if (invitation.status === 'cancelled') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f4f0] p-4">
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-sm px-8 py-10 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-5">
            <XCircle className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-extrabold text-gray-900 mb-2">Invitación cancelada</h2>
          <p className="text-sm text-gray-500">El propietario canceló esta invitación.</p>
        </div>
      </div>
    );
  }

  // ── Already accepted ─────────────────────────────────────────────────────
  if (invitation.status === 'accepted') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f4f0] p-4">
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-sm px-8 py-10 text-center">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-8 h-8 text-[#62bf3b]" />
          </div>
          <h2 className="text-xl font-extrabold text-gray-900 mb-2">Invitación ya aceptada</h2>
          <p className="text-sm text-gray-500">Esta invitación ya fue procesada.</p>
          <Link
            to={isLoggedIn ? '/admin' : '/login'}
            className="mt-6 inline-block px-6 py-2.5 rounded-full bg-[#62bf3b] text-white text-sm font-extrabold hover:bg-[#4fa32e] transition-colors"
          >
            {isLoggedIn ? 'Ir al panel' : 'Iniciar sesión'}
          </Link>
        </div>
      </div>
    );
  }

  // ── Expiry info ───────────────────────────────────────────────────────────
  const expiresDate = new Date(invitation.expires_at);
  const isExpired = expiresDate < new Date();
  const expiresStr = expiresDate.toLocaleDateString('es-CO', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  // ── Main pending view ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f4f0] p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-sm px-8 py-10">

        {/* Logo */}
        <div className="flex flex-col items-center mb-7">
          <div className="w-16 h-16 rounded-2xl bg-black border-2 border-[#62bf3b] flex items-center justify-center shadow-lg shadow-green-500/20 mb-4">
            <img src="/cuypequeniologo.png" alt="Canchapp" className="w-12 h-12 object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Invitación de Manager</h1>
          <p className="text-sm text-gray-500 mt-1 text-center">Te invitaron a administrar un complejo</p>
        </div>

        {/* Invitation details card */}
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 mb-6 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#62bf3b] flex items-center justify-center flex-shrink-0">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Complejo</p>
              <p className="text-sm font-extrabold text-gray-900 truncate">{invitation.complex_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
              <Mail className="w-5 h-5 text-gray-500" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Para</p>
              <p className="text-sm font-extrabold text-gray-900 truncate">{invitation.invitee_email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isExpired ? 'bg-red-50' : 'bg-yellow-50'}`}>
              {isExpired
                ? <AlertCircle className="w-5 h-5 text-red-500" />
                : <Clock className="w-5 h-5 text-yellow-600" />
              }
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">
                {isExpired ? 'Expiró' : 'Válida hasta'}
              </p>
              <p className={`text-sm font-extrabold truncate ${isExpired ? 'text-red-600' : 'text-gray-900'}`}>
                {expiresStr}
              </p>
            </div>
          </div>
        </div>

        {/* Expired */}
        {isExpired && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-center">
            <p className="text-sm font-bold text-red-700">
              Esta invitación expiró. Pide al propietario que envíe una nueva.
            </p>
          </div>
        )}

        {/* Logged in: accept button */}
        {!isExpired && isLoggedIn && (
          <div className="space-y-3">
            <button
              onClick={handleAccept}
              disabled={accepting}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-[#62bf3b] text-white text-sm font-extrabold hover:bg-[#4fa32e] transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {accepting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              {accepting ? 'Aceptando…' : 'Aceptar invitación'}
            </button>
            <button onClick={() => navigate(-1)} className="w-full py-2.5 text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors">
              Cancelar
            </button>
          </div>
        )}

        {/* Not logged in: toggle login / register */}
        {!isExpired && !isLoggedIn && (
          <div className="space-y-4">
            {/* Toggle */}
            <div className="flex rounded-xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => setAuthMode('login')}
                className={`flex-1 py-2.5 text-sm font-extrabold transition-colors ${authMode === 'login' ? 'bg-[#62bf3b] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
              >
                Ya tengo cuenta
              </button>
              <button
                onClick={() => setAuthMode('register')}
                className={`flex-1 py-2.5 text-sm font-extrabold transition-colors ${authMode === 'register' ? 'bg-[#62bf3b] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
              >
                Soy nuevo
              </button>
            </div>

            {/* Login panel */}
            {authMode === 'login' && (
              <div className="space-y-3">
                <p className="text-sm text-gray-500 text-center">
                  Inicia sesión con la cuenta de{' '}
                  <span className="font-bold text-gray-700">{invitation.invitee_email}</span>.
                </p>
                <Link
                  to="/login"
                  state={{ redirect: loginRedirect }}
                  className="w-full flex items-center justify-center py-3 rounded-full bg-[#62bf3b] text-white text-sm font-extrabold hover:bg-[#4fa32e] transition-colors shadow-sm"
                >
                  Iniciar sesión
                </Link>
              </div>
            )}

            {/* Register-and-accept panel */}
            {authMode === 'register' && (
              <div className="space-y-3">
                {/* Email read-only */}
                <div>
                  <label className="block text-[11px] font-extrabold text-gray-500 mb-1.5 uppercase tracking-wide">Email</label>
                  <input
                    type="email"
                    value={invitation.invitee_email}
                    readOnly
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-400 bg-gray-50 cursor-not-allowed outline-none"
                  />
                </div>
                {/* Name row */}
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-[11px] font-extrabold text-gray-500 mb-1.5 uppercase tracking-wide">Nombre *</label>
                    <input type="text" value={regForm.f_name} onChange={e => setRegField('f_name', e.target.value)} placeholder="María" className={fieldCls(regErrors.f_name)} />
                    {regErrors.f_name && <p className="text-xs text-red-600 mt-1 font-bold">{regErrors.f_name}</p>}
                  </div>
                  <div className="flex-1">
                    <label className="block text-[11px] font-extrabold text-gray-500 mb-1.5 uppercase tracking-wide">Apellido *</label>
                    <input type="text" value={regForm.l_name} onChange={e => setRegField('l_name', e.target.value)} placeholder="López" className={fieldCls(regErrors.l_name)} />
                    {regErrors.l_name && <p className="text-xs text-red-600 mt-1 font-bold">{regErrors.l_name}</p>}
                  </div>
                </div>
                {/* Username */}
                <div>
                  <label className="block text-[11px] font-extrabold text-gray-500 mb-1.5 uppercase tracking-wide">Usuario *</label>
                  <input type="text" value={regForm.username} onChange={e => setRegField('username', e.target.value)} placeholder="mlopez" className={fieldCls(regErrors.username)} />
                  {regErrors.username && <p className="text-xs text-red-600 mt-1 font-bold">{regErrors.username}</p>}
                </div>
                {/* Password */}
                <div>
                  <label className="block text-[11px] font-extrabold text-gray-500 mb-1.5 uppercase tracking-wide">Contraseña *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={regForm.password}
                      onChange={e => setRegField('password', e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleRegisterAndAccept(); }}
                      placeholder="Mínimo 8 caracteres"
                      className={fieldCls(regErrors.password)}
                    />
                    <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {regErrors.password && <p className="text-xs text-red-600 mt-1 font-bold">{regErrors.password}</p>}
                </div>
                <button
                  onClick={handleRegisterAndAccept}
                  disabled={regLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-[#62bf3b] text-white text-sm font-extrabold hover:bg-[#4fa32e] transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {regLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  {regLoading ? 'Creando cuenta…' : 'Crear cuenta y aceptar'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default InvitationAccept;
