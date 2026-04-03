import React, { useMemo, useState } from 'react';
import { BarChart3, Edit3, Lock, Save, User } from 'lucide-react';
import { tokenStorage } from '../services/AuthService';
import demoFavoritesService from '../services/DemoFavoritesService';
import demoReservationService from '../services/DemoReservationService';
import notify from '../services/toast';

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
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<ProfileData>(readProfile);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const stats = useMemo(() => ({
    reservations: demoReservationService.getBookings().length,
    favorites: demoFavoritesService.getFavoriteIds().length,
  }), []);

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
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-extrabold text-[var(--color-text)]">Perfil</h2>
        <p className="text-sm text-[var(--color-text-3)] font-semibold mt-1">Administra tu cuenta y seguridad</p>
      </div>

      <section className="bg-[var(--color-surface)] border-[1.5px] border-[var(--color-border)] rounded-[var(--radius-2xl)] p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-[var(--color-primary)]" />
            <h3 className="text-xl font-extrabold text-[var(--color-text)]">Mi Cuenta</h3>
          </div>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] text-[var(--color-text-2)] font-extrabold hover:border-[var(--color-primary)] hover:text-[var(--color-primary-dark)]"
            >
              <Edit3 className="w-4 h-4" />
              Editar información
            </button>
          ) : (
            <button
              onClick={saveProfile}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-lg)] bg-[var(--color-primary)] text-white font-extrabold hover:bg-[var(--color-primary-dark)]"
            >
              <Save className="w-4 h-4" />
              Guardar cambios
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-extrabold text-[var(--color-text-3)] uppercase tracking-wide">Nombre completo</label>
            <input
              value={profile.fullName}
              onChange={(e) => setProfile((p) => ({ ...p, fullName: e.target.value }))}
              disabled={!isEditing}
              className="mt-1 w-full h-11 px-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] disabled:opacity-70"
            />
          </div>

          <div>
            <label className="text-xs font-extrabold text-[var(--color-text-3)] uppercase tracking-wide">Correo electrónico</label>
            <input
              type="email"
              value={profile.email}
              onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
              disabled={!isEditing}
              className="mt-1 w-full h-11 px-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] disabled:opacity-70"
            />
          </div>

          <div>
            <label className="text-xs font-extrabold text-[var(--color-text-3)] uppercase tracking-wide">Teléfono</label>
            <input
              value={profile.phone}
              onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
              disabled={!isEditing}
              className="mt-1 w-full h-11 px-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] disabled:opacity-70"
            />
          </div>

          <div>
            <label className="text-xs font-extrabold text-[var(--color-text-3)] uppercase tracking-wide">Ubicación</label>
            <input
              value={profile.location}
              onChange={(e) => setProfile((p) => ({ ...p, location: e.target.value }))}
              disabled={!isEditing}
              className="mt-1 w-full h-11 px-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] disabled:opacity-70"
            />
          </div>
        </div>
      </section>

      <section className="bg-[var(--color-surface)] border-[1.5px] border-[var(--color-border)] rounded-[var(--radius-2xl)] p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Lock className="w-5 h-5 text-[var(--color-primary)]" />
          <h3 className="text-xl font-extrabold text-[var(--color-text)]">Cambiar Contraseña</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="password"
            placeholder="Contraseña actual"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="h-11 px-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]"
          />
          <input
            type="password"
            placeholder="Nueva contraseña"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="h-11 px-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]"
          />
          <input
            type="password"
            placeholder="Confirmar nueva contraseña"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="h-11 px-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]"
          />
        </div>

        <button
          onClick={handlePasswordChange}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-lg)] bg-[var(--color-primary)] text-white font-extrabold hover:bg-[var(--color-primary-dark)]"
        >
          <Lock className="w-4 h-4" />
          Actualizar contraseña
        </button>
      </section>

      <section className="bg-[var(--color-surface)] border-[1.5px] border-[var(--color-border)] rounded-[var(--radius-2xl)] p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-[var(--color-primary)]" />
          <h3 className="text-xl font-extrabold text-[var(--color-text)]">Estadísticas</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] p-4 bg-[var(--color-surf2)]">
            <p className="text-xs font-extrabold uppercase tracking-wide text-[var(--color-text-3)]">Reservas hechas</p>
            <p className="text-3xl font-black text-[var(--color-primary-dark)] mt-1">{stats.reservations}</p>
          </div>
          <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] p-4 bg-[var(--color-surf2)]">
            <p className="text-xs font-extrabold uppercase tracking-wide text-[var(--color-text-3)]">Canchas favoritas</p>
            <p className="text-3xl font-black text-[var(--color-primary-dark)] mt-1">{stats.favorites}</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Profile;
