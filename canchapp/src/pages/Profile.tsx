import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Edit3,
  LogOut,
  Lock,
  Mail,
  MapPin,
  Phone,
  Save,
  Shield,
  Sparkles,
  User,
} from 'lucide-react';
import type { ApiError } from '../services/ApiClient';
import { tokenStorage, type UpdateProfilePayload, type UserOutput } from '../services/AuthService';
import bookingService from '../services/BookingService';
import favoritesService from '../services/FavoritesService';
import notify from '../services/toast';
import authService from '../services/AuthService';
import { useAuth } from '../context/AuthContext';

interface ProfileData {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string;
  location: string;
  phoneNumber: string;
}

const buildProfile = (user = tokenStorage.getUser()): ProfileData => ({
  username: user?.username ?? '',
  firstName: user?.f_name ?? '',
  lastName: user?.l_name ?? '',
  email: user?.email ?? '',
  avatarUrl: user?.avatar_url ?? '',
  location: user?.location ?? '',
  phoneNumber: user?.phone_number ?? '',
});

const normalizeValue = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser, loading: authLoading, refreshUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData>(() => buildProfile());
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileUser, setProfileUser] = useState<UserOutput | null>(null);
  const accessToken = tokenStorage.getAccess();
  const visibleUser = currentUser ?? tokenStorage.getUser();
  const resolvedUser = profileUser ?? visibleUser;
  const activeLoadKey = visibleUser?.user_id ?? (accessToken ? 'token' : null);
  const [stats, setStats] = useState({ reservations: 0, favorites: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const profileLoadGen = useRef(0);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!activeLoadKey) {
      setStats({ reservations: 0, favorites: 0 });
      setStatsLoading(false);
      return;
    }

    let cancelled = false;
    setStatsLoading(true);

    const loadStats = async () => {
      try {
        const [reservations, favoriteIds] = await Promise.all([
          bookingService.getMyBookingsCount(),
          favoritesService.getFavoriteIds(),
        ]);
        if (cancelled) return;
        setStats({
          reservations,
          favorites: favoriteIds.size,
        });
      } catch (error) {
        console.error('Profile stats error:', error);
        if (!cancelled) {
          setStats({ reservations: 0, favorites: 0 });
        }
      } finally {
        if (!cancelled) {
          setStatsLoading(false);
        }
      }
    };

    void loadStats();

    return () => {
      cancelled = true;
    };
  }, [activeLoadKey, authLoading]);

  useEffect(() => {
    if (!authLoading && !resolvedUser && !accessToken) {
      navigate('/login');
    }
  }, [authLoading, resolvedUser, accessToken, navigate]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!activeLoadKey) {
      setIsLoadingProfile(false);
      return;
    }

    let cancelled = false;
    const loadId = ++profileLoadGen.current;

    const loadProfile = async () => {
      setIsLoadingProfile(true);
      setProfileError(null);

      try {
        const backendProfile = await authService.getCurrentUserProfile();
        if (cancelled || loadId !== profileLoadGen.current) return;

        tokenStorage.saveUser(backendProfile);
        refreshUser();
        setProfileUser(backendProfile);
        setProfile(buildProfile(backendProfile));
      } catch (error) {
        console.error('Profile load error:', error);
        if (cancelled || loadId !== profileLoadGen.current) return;

        const cachedUser = tokenStorage.getUser();
        setProfile(buildProfile(cachedUser ?? undefined));
        setProfileUser(cachedUser);
        setProfileError('No se pudo sincronizar el perfil con el backend.');
      } finally {
        if (!cancelled && loadId === profileLoadGen.current) {
          setIsLoadingProfile(false);
        }
      }
    };

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [activeLoadKey, authLoading, refreshUser]);

  if (authLoading || isLoadingProfile) {
    return (
      <main className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
        <section className="rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-lg)] p-8 animate-pulse">
          <p className="text-sm font-semibold text-[var(--color-text-3)] mb-4">
            Cargando perfil...
          </p>
          <div className="h-6 w-40 rounded-full bg-[var(--color-surf2)] mb-4" />
          <div className="h-12 w-72 rounded-[var(--radius-xl)] bg-[var(--color-surf2)] mb-6" />
          <div className="h-64 rounded-[var(--radius-2xl)] bg-[var(--color-surf2)]" />
        </section>
      </main>
    );
  }

  if (!resolvedUser) {
    return (
      <main className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
        <section className="rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-lg)] p-8">
          <h2 className="text-2xl font-black text-[var(--color-text)] mb-2">
            No se pudo cargar el perfil
          </h2>
          <p className="text-sm font-semibold text-[var(--color-text-3)] mb-6">
            Inicia sesion de nuevo para recuperar tu informacion.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[var(--color-primary)] text-white font-extrabold shadow-[var(--shadow-primary)] hover:-translate-y-0.5 transition-all"
          >
            Ir a login
          </button>
        </section>
      </main>
    );
  }

  const roleLabel = (() => {
    switch (resolvedUser.role_name) {
      case 'Owner':
        return 'Dueño';
      case 'Manager':
        return 'Administrador';
      case 'Player':
        return 'Jugador';
      default:
        return resolvedUser.role_name;
    }
  })();

  const handleEditToggle = () => {
    setIsEditing((prev) => !prev);
  };

  const handleCancelEdit = () => {
    setProfile(buildProfile(resolvedUser));
    setIsEditing(false);
  };

  const handleChangePassword = async () => {
    setPasswordError(null);

    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordError('Completa todos los campos de contraseña.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('La confirmación no coincide con la nueva contraseña.');
      return;
    }

    setIsChangingPassword(true);
    try {
      await authService.changePassword({
        old_password: oldPassword,
        new_password: newPassword,
      });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);
      notify.success('Contraseña actualizada', 'Tu contraseña se cambió correctamente.');
    } catch (error) {
      const err = error as ApiError;
      const msg =
        err.code === 'INVALID_OLD_PASSWORD'
          ? 'La contraseña actual es incorrecta.'
          : err.message ?? 'No se pudo cambiar la contraseña.';
      setPasswordError(msg);
      notify.error('Error al cambiar contraseña', msg);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      notify.success('Sesión cerrada', 'Has salido de tu cuenta correctamente.');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      notify.error('No se pudo cerrar la sesión');
    }
  };

  const saveProfile = async () => {
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    profileLoadGen.current += 1;

    try {
      const payload: UpdateProfilePayload = {
        username: normalizeValue(profile.username) ?? resolvedUser.username ?? null,
        f_name: normalizeValue(profile.firstName),
        l_name: normalizeValue(profile.lastName),
        avatar_url: normalizeValue(profile.avatarUrl),
        location: normalizeValue(profile.location),
        phone_number: normalizeValue(profile.phoneNumber),
      };

      const updatedUser = await authService.updateCurrentUserProfile(payload);
      tokenStorage.saveUser(updatedUser);
      refreshUser();
      setProfileUser(updatedUser);
      setProfile({
        username: updatedUser.username ?? '',
        firstName: updatedUser.f_name ?? '',
        lastName: updatedUser.l_name ?? '',
        email: updatedUser.email ?? '',
        avatarUrl: updatedUser.avatar_url ?? '',
        location: updatedUser.location ?? profile.location,
        phoneNumber: updatedUser.phone_number ?? profile.phoneNumber,
      });
      setIsEditing(false);
      notify.success('Perfil actualizado', 'Los cambios se guardaron en el backend.');
    } catch (error) {
      console.error('Profile save error:', error);
      notify.error('No se pudo guardar el perfil', 'Verifica los datos e intenta de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <header className="flex items-end justify-between flex-wrap gap-4 animate-fade-in">
        <div>
          <p className="text-[10px] font-extrabold tracking-[0.24em] text-[var(--color-primary)] uppercase mb-2 inline-flex items-center gap-2">
            <User className="w-3 h-3" />
            Mi perfil
          </p>
          <h1 className="text-4xl sm:text-5xl font-black text-[var(--color-text)] leading-[0.95]">
            Configuración de <span className="text-[var(--color-primary)]">Perfil</span>
          </h1>
          <p className="mt-3 text-sm sm:text-base text-[var(--color-text-3)] font-semibold max-w-2xl">
            Administra tu cuenta desde una interfaz más visual y ordenada. Esta pantalla ya usa los endpoints reales del backend.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-2)] font-extrabold shadow-[var(--shadow-sm)] hover:-translate-y-0.5 hover:border-[var(--color-accent)] hover:text-[var(--color-accent-dark)] transition-all active:scale-95"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
          {!isEditing ? (
            <button
              onClick={handleEditToggle}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[var(--color-primary)] text-white font-extrabold shadow-[var(--shadow-primary)] hover:-translate-y-0.5 hover:brightness-95 transition-all active:scale-95"
            >
              <Edit3 className="w-4 h-4" />
              Editar perfil
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleCancelEdit}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-[var(--color-border)] bg-white text-[var(--color-text-2)] font-extrabold hover:border-[var(--color-primary)] transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={saveProfile}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[var(--color-primary)] text-white font-extrabold shadow-[var(--shadow-primary)] hover:-translate-y-0.5 transition-all"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          )}
        </div>
      </header>

      <section className="bg-[var(--color-surface)] rounded-[var(--radius-2xl)] border border-[var(--color-border)] shadow-[var(--shadow-lg)] overflow-hidden animate-fade-in">
        <div className="relative overflow-hidden bg-[var(--color-text)] px-6 py-7 sm:px-8 sm:py-8">
          <div
            className="absolute inset-0 opacity-100 pointer-events-none"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg, transparent, transparent 11px, rgba(98,191,59,.05) 12px), repeating-linear-gradient(90deg, transparent, transparent 11px, rgba(98,191,59,.05) 12px)',
            }}
          />
          <div className="absolute -top-12 right-[-30px] w-44 h-44 rounded-full bg-[var(--color-primary)]/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-14 left-[-36px] w-48 h-48 rounded-full bg-white/5 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row items-center lg:items-start gap-6">
            <div className="relative shrink-0 animate-float">
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-[28px] bg-[var(--color-primary)] p-1 shadow-[var(--shadow-primary)]">
                <div className="w-full h-full rounded-[24px] overflow-hidden border-[3px] border-[var(--color-primary-light)] bg-white">
                  {profile.avatarUrl ? (
                    <img src={profile.avatarUrl} alt={profile.firstName || 'Perfil'} className="w-full h-full object-cover" />
                  ) : (
                    <img src="/cuypequeniologo.png" alt="Canchapp" className="w-full h-full object-cover" />
                  )}
                </div>
              </div>
              <div className="absolute -right-1 -bottom-1 w-10 h-10 rounded-full bg-[var(--color-score)] border-4 border-[var(--color-text)] flex items-center justify-center shadow-[var(--shadow-md)]">
                <Sparkles className="w-4 h-4 text-[var(--color-text)]" />
              </div>
            </div>

            <div className="flex-1 text-center lg:text-left">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center lg:justify-start gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-primary)] text-white text-xs font-extrabold tracking-wide uppercase">
                  <Shield className="w-3.5 h-3.5" />
                  {roleLabel}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-score)] text-[var(--color-text)] text-xs font-extrabold tracking-wide uppercase">
                  <Mail className="w-3.5 h-3.5" />
                  {resolvedUser.email}
                </span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight mb-2">
                {`${profile.firstName} ${profile.lastName}`.trim() || profile.username || 'Usuario'}
              </h2>

              <p className="text-white/70 font-semibold max-w-2xl">
                Mantén actualizados los datos que realmente acepta la API de identidad: usuario, nombres y avatar.
              </p>

              <div className="mt-5 flex flex-wrap justify-center lg:justify-start gap-2">
                <span className="px-3 py-1.5 rounded-full bg-white/10 text-white text-sm font-extrabold inline-flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {profile.username || 'Sin usuario'}
                </span>
                <span className="px-3 py-1.5 rounded-full bg-white/10 text-white text-sm font-extrabold inline-flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {resolvedUser.email}
                </span>
              </div>
            </div>
          </div>
        </div>

        {profileError && (
          <div className="mx-6 mt-6 rounded-[var(--radius-xl)] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
            {profileError}
          </div>
        )}

        <div className="p-6 sm:p-8">
          <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_0.85fr] gap-6">
            <section className="bg-[var(--color-surface)] rounded-[var(--radius-2xl)] border-[1.5px] border-[var(--color-border)] shadow-[var(--shadow-md)] p-5 sm:p-6 animate-fade-in">
              <div className="flex items-center justify-between gap-3 mb-5">
                <div>
                  <p className="text-[10px] font-extrabold tracking-[0.24em] text-[var(--color-primary)] uppercase mb-1">
                    Información personal
                  </p>
                  <h3 className="text-2xl font-black text-[var(--color-text)]">Mi cuenta</h3>
                </div>

                <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-full bg-[var(--color-surf2)] border border-[var(--color-border)] text-xs font-extrabold text-[var(--color-text-2)]">
                  <User className="w-4 h-4 text-[var(--color-primary)]" />
                  Perfil activo
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="animate-fade-in">
                  <label className="block text-xs font-extrabold text-[var(--color-text-3)] uppercase tracking-[0.2em] mb-2">
                    Nombre de usuario
                  </label>
                  <input
                    value={profile.username}
                    onChange={(e) => setProfile((p) => ({ ...p, username: e.target.value }))}
                    disabled={!isEditing}
                    placeholder="usuario.canchapp"
                    className="w-full h-12 px-4 rounded-[var(--radius-lg)] border-[1.5px] border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] font-semibold outline-none transition-all disabled:opacity-70 disabled:cursor-not-allowed focus:border-[var(--color-primary)] focus:shadow-[var(--shadow-primary)]"
                  />
                </div>

                <div className="animate-fade-in">
                  <label className="block text-xs font-extrabold text-[var(--color-text-3)] uppercase tracking-[0.2em] mb-2">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    value={resolvedUser.email}
                    readOnly
                    disabled
                    className="w-full h-12 px-4 rounded-[var(--radius-lg)] border-[1.5px] border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] font-semibold outline-none transition-all disabled:opacity-70 disabled:cursor-not-allowed focus:border-[var(--color-primary)] focus:shadow-[var(--shadow-primary)]"
                  />
                </div>

                <div className="animate-fade-in">
                  <label className="block text-xs font-extrabold text-[var(--color-text-3)] uppercase tracking-[0.2em] mb-2">
                    Nombres
                  </label>
                  <input
                    value={profile.firstName}
                    onChange={(e) => setProfile((p) => ({ ...p, firstName: e.target.value }))}
                    disabled={!isEditing}
                    placeholder="Juan"
                    className="w-full h-12 px-4 rounded-[var(--radius-lg)] border-[1.5px] border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] font-semibold outline-none transition-all disabled:opacity-70 disabled:cursor-not-allowed focus:border-[var(--color-primary)] focus:shadow-[var(--shadow-primary)]"
                  />
                </div>

                <div className="animate-fade-in">
                  <label className="block text-xs font-extrabold text-[var(--color-text-3)] uppercase tracking-[0.2em] mb-2">
                    Apellidos
                  </label>
                  <input
                    value={profile.lastName}
                    onChange={(e) => setProfile((p) => ({ ...p, lastName: e.target.value }))}
                    disabled={!isEditing}
                    placeholder="Pérez"
                    className="w-full h-12 px-4 rounded-[var(--radius-lg)] border-[1.5px] border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] font-semibold outline-none transition-all disabled:opacity-70 disabled:cursor-not-allowed focus:border-[var(--color-primary)] focus:shadow-[var(--shadow-primary)]"
                  />
                </div>

                <div className="animate-fade-in">
                  <label className="block text-xs font-extrabold text-[var(--color-text-3)] uppercase tracking-[0.2em] mb-2">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={profile.phoneNumber}
                    onChange={(e) => setProfile((p) => ({ ...p, phoneNumber: e.target.value }))}
                    disabled={!isEditing}
                    placeholder="+57 300 123 4567"
                    className="w-full h-12 px-4 rounded-[var(--radius-lg)] border-[1.5px] border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] font-semibold outline-none transition-all disabled:opacity-70 disabled:cursor-not-allowed focus:border-[var(--color-primary)] focus:shadow-[var(--shadow-primary)]"
                  />
                </div>

                <div className="animate-fade-in">
                  <label className="block text-xs font-extrabold text-[var(--color-text-3)] uppercase tracking-[0.2em] mb-2">
                    Ubicación
                  </label>
                  <input
                    value={profile.location}
                    onChange={(e) => setProfile((p) => ({ ...p, location: e.target.value }))}
                    disabled={!isEditing}
                    placeholder="Ciudad, barrio o dirección"
                    className="w-full h-12 px-4 rounded-[var(--radius-lg)] border-[1.5px] border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] font-semibold outline-none transition-all disabled:opacity-70 disabled:cursor-not-allowed focus:border-[var(--color-primary)] focus:shadow-[var(--shadow-primary)]"
                  />
                </div>

                <div className="md:col-span-2 animate-fade-in">
                  <label className="block text-xs font-extrabold text-[var(--color-text-3)] uppercase tracking-[0.2em] mb-2">
                    Avatar URL
                  </label>
                  <input
                    value={profile.avatarUrl}
                    onChange={(e) => setProfile((p) => ({ ...p, avatarUrl: e.target.value }))}
                    disabled={!isEditing}
                    placeholder="https://..."
                    className="w-full h-12 px-4 rounded-[var(--radius-lg)] border-[1.5px] border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] font-semibold outline-none transition-all disabled:opacity-70 disabled:cursor-not-allowed focus:border-[var(--color-primary)] focus:shadow-[var(--shadow-primary)]"
                  />
                </div>
              </div>

              {!isEditing && (profile.phoneNumber || profile.location) && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {profile.phoneNumber && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--color-surf2)] text-[var(--color-text-2)] text-xs font-extrabold">
                      <Phone className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                      {profile.phoneNumber}
                    </span>
                  )}
                  {profile.location && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--color-surf2)] text-[var(--color-text-2)] text-xs font-extrabold">
                      <MapPin className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                      {profile.location}
                    </span>
                  )}
                </div>
              )}

              <div className="mt-6 flex flex-wrap gap-3">
                {isEditing ? (
                  <>
                    <button
                      onClick={handleCancelEdit}
                      className="px-4 py-2.5 rounded-full border border-[var(--color-border)] bg-white text-[var(--color-text-2)] font-extrabold hover:border-[var(--color-primary)] transition-all"
                    >
                      Cancelar cambios
                    </button>
                    <button
                      onClick={saveProfile}
                      disabled={isSaving}
                      className="px-4 py-2.5 rounded-full bg-[var(--color-primary)] text-white font-extrabold shadow-[var(--shadow-primary)] hover:-translate-y-0.5 transition-all inline-flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      {isSaving ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleEditToggle}
                    className="px-4 py-2.5 rounded-full bg-[var(--color-primary)] text-white font-extrabold shadow-[var(--shadow-primary)] hover:-translate-y-0.5 transition-all inline-flex items-center gap-2"
                  >
                    <Edit3 className="w-4 h-4" />
                    Editar información
                  </button>
                )}
              </div>
            </section>

            <aside className="space-y-6">
              <section className="bg-[var(--color-surface)] rounded-[var(--radius-2xl)] border-[1.5px] border-[var(--color-border)] shadow-[var(--shadow-md)] p-5 sm:p-6 animate-fade-in">
                <div className="flex items-center gap-2 mb-4">
                  <Lock className="w-5 h-5 text-[var(--color-primary)]" />
                  <div>
                    <p className="text-[10px] font-extrabold tracking-[0.24em] text-[var(--color-primary)] uppercase mb-1">
                      Seguridad
                    </p>
                    <h3 className="text-xl font-black text-[var(--color-text)]">Contraseña</h3>
                  </div>
                </div>

                {resolvedUser.is_guest ? (
                  <p className="text-sm font-semibold text-[var(--color-text-3)] leading-6">
                    Tu cuenta es de invitado. Conviértela a cuenta completa para establecer una contraseña.
                  </p>
                ) : !showPasswordForm ? (
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordForm(true);
                      setPasswordError(null);
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surf2)] text-[var(--color-text-2)] font-extrabold text-sm hover:border-[var(--color-primary)] hover:text-[var(--color-primary-dark)] transition-all"
                  >
                    <Lock className="w-4 h-4" />
                    Cambiar contraseña
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-extrabold text-[var(--color-text-3)] uppercase tracking-[0.2em] mb-2">
                        Contraseña actual
                      </label>
                      <input
                        type="password"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        className="w-full h-11 px-4 rounded-[var(--radius-lg)] border-[1.5px] border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] font-semibold outline-none focus:border-[var(--color-primary)]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-extrabold text-[var(--color-text-3)] uppercase tracking-[0.2em] mb-2">
                        Nueva contraseña
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full h-11 px-4 rounded-[var(--radius-lg)] border-[1.5px] border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] font-semibold outline-none focus:border-[var(--color-primary)]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-extrabold text-[var(--color-text-3)] uppercase tracking-[0.2em] mb-2">
                        Confirmar nueva contraseña
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleChangePassword()}
                        className="w-full h-11 px-4 rounded-[var(--radius-lg)] border-[1.5px] border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] font-semibold outline-none focus:border-[var(--color-primary)]"
                      />
                    </div>
                    {passwordError && (
                      <p className="text-sm font-semibold text-[var(--color-accent)]">{passwordError}</p>
                    )}
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setShowPasswordForm(false);
                          setOldPassword('');
                          setNewPassword('');
                          setConfirmPassword('');
                          setPasswordError(null);
                        }}
                        className="flex-1 px-3 py-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] text-[var(--color-text-2)] font-extrabold text-sm"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleChangePassword}
                        disabled={isChangingPassword}
                        className="flex-1 px-3 py-2 rounded-[var(--radius-lg)] bg-[var(--color-primary)] text-white font-extrabold text-sm shadow-[var(--shadow-primary)] disabled:opacity-60"
                      >
                        {isChangingPassword ? 'Guardando...' : 'Actualizar'}
                      </button>
                    </div>
                  </div>
                )}
              </section>

              <section className="bg-[var(--color-surface)] rounded-[var(--radius-2xl)] border-[1.5px] border-[var(--color-border)] shadow-[var(--shadow-md)] p-5 sm:p-6 animate-fade-in">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="w-5 h-5 text-[var(--color-primary)]" />
                  <div>
                    <p className="text-[10px] font-extrabold tracking-[0.24em] text-[var(--color-primary)] uppercase mb-1">
                      Actividad
                    </p>
                    <h3 className="text-xl font-black text-[var(--color-text)]">Estadísticas</h3>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] p-4 bg-[var(--color-surf2)]">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-[var(--color-text-3)] mb-1">
                      Reservas
                    </p>
                    <p className="text-3xl font-black text-[var(--color-primary-dark)] leading-none">
                      {statsLoading ? '—' : stats.reservations}
                    </p>
                  </div>
                  <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] p-4 bg-[var(--color-surf2)]">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-[var(--color-text-3)] mb-1">
                      Favoritas
                    </p>
                    <p className="text-3xl font-black text-[var(--color-primary-dark)] leading-none">
                      {statsLoading ? '—' : stats.favorites}
                    </p>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Profile;
