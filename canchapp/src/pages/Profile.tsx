import React, { useMemo, useState } from 'react';
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
import { tokenStorage } from '../services/AuthService';
import demoFavoritesService from '../services/DemoFavoritesService';
import demoReservationService from '../services/DemoReservationService';
import notify from '../services/toast';
import authService from '../services/AuthService';

interface ProfileData {
  fullName: string;
  email: string;
  phone: string;
  location: string;
}

const PROFILE_KEY = 'canchapp-user-profile';

const defaultProfile = (): ProfileData => {
  const currentUser = tokenStorage.getUser();
  return {
    fullName: currentUser ? `${currentUser.f_name} ${currentUser.l_name}`.trim() : '',
    email: currentUser?.email ?? '',
    phone: '',
    location: '',
  };
};

const readProfile = (): ProfileData => {
  if (typeof window === 'undefined') return defaultProfile();
  const raw = localStorage.getItem(PROFILE_KEY);
  if (!raw) return defaultProfile();
  try {
    const parsed = JSON.parse(raw) as Partial<ProfileData>;
    return {
      ...defaultProfile(),
      ...parsed,
    };
  } catch {
    return defaultProfile();
  }
};

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<ProfileData>(readProfile);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const stats = useMemo(() => ({
    reservations: demoReservationService.getBookings().length,
    favorites: demoFavoritesService.getFavoriteIds().length,
  }), []);

  const currentUser = tokenStorage.getUser();

  if (!currentUser) {
    navigate('/login');
    return null;
  }

  const roleLabel = (() => {
    switch (currentUser.role_name) {
      case 'Owner':
        return 'Dueño';
      case 'Manager':
        return 'Administrador';
      case 'Player':
        return 'Jugador';
      default:
        return currentUser.role_name;
    }
  })();

  const handleEditToggle = () => {
    setIsEditing((prev) => !prev);
  };

  const handleCancelEdit = () => {
    setProfile(readProfile());
    setIsEditing(false);
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

  const saveProfile = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    }
    setIsEditing(false);
    notify.success('Perfil actualizado', 'Tu información fue guardada correctamente.');
  };

  const handlePasswordChange = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      notify.error('Campos incompletos', 'Debes completar todos los campos de contraseña.');
      return;
    }
    if (newPassword.length < 8) {
      notify.error('Contraseña inválida', 'La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      notify.error('No coinciden', 'La confirmación de contraseña no coincide.');
      return;
    }

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    notify.success('Contraseña actualizada', 'Tu contraseña fue cambiada exitosamente.');
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
            Administra tu cuenta, actualiza tus datos y revisa tu actividad desde una interfaz más visual y ordenada.
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
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[var(--color-primary)] text-white font-extrabold shadow-[var(--shadow-primary)] hover:-translate-y-0.5 transition-all"
              >
                <Save className="w-4 h-4" />
                Guardar cambios
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
                  {currentUser.avatar_url ? (
                    <img src={currentUser.avatar_url} alt={profile.fullName || 'Perfil'} className="w-full h-full object-cover" />
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
                  {currentUser.email}
                </span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight mb-2">
                {profile.fullName || 'Usuario'}
              </h2>

              <p className="text-white/70 font-semibold max-w-2xl">
                Mantén actualizada tu información personal y seguridad. Esta vista sigue la misma línea visual del panel principal: bloques claros, contraste fuerte y jerarquía marcada.
              </p>

              <div className="mt-5 flex flex-wrap justify-center lg:justify-start gap-2">
                <span className="px-3 py-1.5 rounded-full bg-white/10 text-white text-sm font-extrabold inline-flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  {profile.phone || 'Sin teléfono'}
                </span>
                <span className="px-3 py-1.5 rounded-full bg-white/10 text-white text-sm font-extrabold inline-flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {profile.location || 'Sin ubicación'}
                </span>
              </div>
            </div>
          </div>
        </div>

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
                    Nombre completo
                  </label>
                  <input
                    value={profile.fullName}
                    onChange={(e) => setProfile((p) => ({ ...p, fullName: e.target.value }))}
                    disabled={!isEditing}
                    className="w-full h-12 px-4 rounded-[var(--radius-lg)] border-[1.5px] border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] font-semibold outline-none transition-all disabled:opacity-70 disabled:cursor-not-allowed focus:border-[var(--color-primary)] focus:shadow-[var(--shadow-primary)]"
                  />
                </div>

                <div className="animate-fade-in">
                  <label className="block text-xs font-extrabold text-[var(--color-text-3)] uppercase tracking-[0.2em] mb-2">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                    disabled={!isEditing}
                    className="w-full h-12 px-4 rounded-[var(--radius-lg)] border-[1.5px] border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] font-semibold outline-none transition-all disabled:opacity-70 disabled:cursor-not-allowed focus:border-[var(--color-primary)] focus:shadow-[var(--shadow-primary)]"
                  />
                </div>

                <div className="animate-fade-in">
                  <label className="block text-xs font-extrabold text-[var(--color-text-3)] uppercase tracking-[0.2em] mb-2">
                    Teléfono
                  </label>
                  <input
                    value={profile.phone}
                    onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
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
                    placeholder="Bogotá, Colombia"
                    className="w-full h-12 px-4 rounded-[var(--radius-lg)] border-[1.5px] border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] font-semibold outline-none transition-all disabled:opacity-70 disabled:cursor-not-allowed focus:border-[var(--color-primary)] focus:shadow-[var(--shadow-primary)]"
                  />
                </div>
              </div>

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
                      className="px-4 py-2.5 rounded-full bg-[var(--color-primary)] text-white font-extrabold shadow-[var(--shadow-primary)] hover:-translate-y-0.5 transition-all inline-flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      Guardar cambios
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
                    <h3 className="text-xl font-black text-[var(--color-text)]">Cambiar contraseña</h3>
                  </div>
                </div>

                <div className="space-y-3">
                  <input
                    type="password"
                    placeholder="Contraseña actual"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full h-11 px-4 rounded-[var(--radius-lg)] border-[1.5px] border-[var(--color-border)] bg-[var(--color-surf2)] font-semibold outline-none transition-all focus:border-[var(--color-primary)] focus:shadow-[var(--shadow-primary)]"
                  />
                  <input
                    type="password"
                    placeholder="Nueva contraseña"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full h-11 px-4 rounded-[var(--radius-lg)] border-[1.5px] border-[var(--color-border)] bg-[var(--color-surf2)] font-semibold outline-none transition-all focus:border-[var(--color-primary)] focus:shadow-[var(--shadow-primary)]"
                  />
                  <input
                    type="password"
                    placeholder="Confirmar nueva contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full h-11 px-4 rounded-[var(--radius-lg)] border-[1.5px] border-[var(--color-border)] bg-[var(--color-surf2)] font-semibold outline-none transition-all focus:border-[var(--color-primary)] focus:shadow-[var(--shadow-primary)]"
                  />
                </div>

                <button
                  onClick={handlePasswordChange}
                  className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-[var(--color-text)] text-white font-extrabold shadow-[var(--shadow-lg)] hover:-translate-y-0.5 transition-all"
                >
                  <Lock className="w-4 h-4" />
                  Actualizar contraseña
                </button>
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
                    <p className="text-3xl font-black text-[var(--color-primary-dark)] leading-none">{stats.reservations}</p>
                  </div>
                  <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] p-4 bg-[var(--color-surf2)]">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-[var(--color-text-3)] mb-1">
                      Favoritas
                    </p>
                    <p className="text-3xl font-black text-[var(--color-primary-dark)] leading-none">{stats.favorites}</p>
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
