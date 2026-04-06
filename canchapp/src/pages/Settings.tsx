import React, { useEffect, useState } from 'react';
import { Bell, Globe, Moon, Settings as SettingsIcon, Sun } from 'lucide-react';
import notify from '../services/toast';

type Theme = 'light' | 'dark';
type Language = 'es' | 'en';

const SETTINGS_KEY = 'canchapp-user-settings';

interface SettingsState {
  pushNotifications: boolean;
  emailNotifications: boolean;
  reservationReminders: boolean;
  language: Language;
  theme: Theme;
}

const defaultSettings: SettingsState = {
  pushNotifications: true,
  emailNotifications: true,
  reservationReminders: true,
  language: 'es',
  theme: 'light',
};

const readSettings = (): SettingsState => {
  if (typeof window === 'undefined') return defaultSettings;
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (!raw) return defaultSettings;
  try {
    const parsed = JSON.parse(raw) as Partial<SettingsState>;
    return { ...defaultSettings, ...parsed };
  } catch {
    return defaultSettings;
  }
};

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<SettingsState>(readSettings);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    document.documentElement.setAttribute('data-theme', settings.theme);
  }, [settings]);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-extrabold text-[var(--color-text)]">Configuración</h2>
        <p className="text-sm text-[var(--color-text-3)] font-semibold mt-1">Controla notificaciones y preferencias de la app</p>
      </div>

      <section className="bg-[var(--color-surface)] border-[1.5px] border-[var(--color-border)] rounded-[var(--radius-2xl)] p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-[var(--color-primary)]" />
          <h3 className="text-xl font-extrabold text-[var(--color-text)]">Notificaciones</h3>
        </div>

        <div className="space-y-3">
          {[
            { key: 'pushNotifications', label: 'Notificaciones push' },
            { key: 'emailNotifications', label: 'Notificaciones por correo' },
            { key: 'reservationReminders', label: 'Recordatorios de reserva' },
          ].map((opt) => (
            <label key={opt.key} className="flex items-center justify-between p-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surf2)]">
              <span className="font-bold text-[var(--color-text-2)]">{opt.label}</span>
              <input
                type="checkbox"
                checked={settings[opt.key as keyof SettingsState] as boolean}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    [opt.key]: e.target.checked,
                  }))
                }
                className="w-4 h-4"
              />
            </label>
          ))}
        </div>
      </section>

      <section className="bg-[var(--color-surface)] border-[1.5px] border-[var(--color-border)] rounded-[var(--radius-2xl)] p-5 space-y-4">
        <div className="flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-[var(--color-primary)]" />
          <h3 className="text-xl font-extrabold text-[var(--color-text)]">Preferencias</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] p-3 bg-[var(--color-surf2)]">
            <label className="text-xs font-extrabold uppercase tracking-wide text-[var(--color-text-3)] inline-flex items-center gap-1">
              <Globe className="w-3.5 h-3.5" />
              Idioma
            </label>
            <select
              value={settings.language}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  language: e.target.value as Language,
                }))
              }
              className="mt-2 w-full h-10 px-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]"
            >
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </div>

          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] p-3 bg-[var(--color-surf2)]">
            <label className="text-xs font-extrabold uppercase tracking-wide text-[var(--color-text-3)]">Tema</label>
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => setSettings((prev) => ({ ...prev, theme: 'light' }))}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] border font-extrabold text-sm ${
                  settings.theme === 'light'
                    ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                    : 'border-[var(--color-border)] text-[var(--color-text-2)]'
                }`}
              >
                <Sun className="w-4 h-4" /> Claro
              </button>
              <button
                onClick={() => setSettings((prev) => ({ ...prev, theme: 'dark' }))}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] border font-extrabold text-sm ${
                  settings.theme === 'dark'
                    ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                    : 'border-[var(--color-border)] text-[var(--color-text-2)]'
                }`}
              >
                <Moon className="w-4 h-4" /> Oscuro
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={() => notify.success('Configuración guardada', 'Tus preferencias se actualizaron correctamente.')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-lg)] bg-[var(--color-primary)] text-white font-extrabold hover:bg-[var(--color-primary-dark)]"
        >
          <SettingsIcon className="w-4 h-4" />
          Guardar preferencias
        </button>
      </section>
    </div>
  );
};

export default Settings;
