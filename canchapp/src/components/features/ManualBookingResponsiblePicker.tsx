import { useState } from 'react';
import { Loader2, Search, User, UserCheck, UserPlus, X } from 'lucide-react';
import authService from '../../services/AuthService';

export type ManualResponsible =
  | { kind: 'self' }
  | { kind: 'registered'; userId: string; label: string }
  | {
      kind: 'guest';
      guest: {
        name: string;
        phone_number: string;
        email: string;
      };
    };

interface ManualBookingResponsiblePickerProps {
  value: ManualResponsible;
  onChange: (value: ManualResponsible) => void;
  disabled?: boolean;
}

const inputClass =
  'w-full h-10 px-3 rounded-[var(--radius-md)] border-[1.5px] border-[var(--color-border)] bg-white font-semibold text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] disabled:opacity-60';

const labelClass = 'block mb-1.5 font-extrabold text-sm text-[var(--color-text-2)]';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function ManualBookingResponsiblePicker({
  value,
  onChange,
  disabled = false,
}: ManualBookingResponsiblePickerProps) {
  const [identifier, setIdentifier] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const setMode = (mode: ManualResponsible['kind']) => {
    setLookupError(null);
    if (mode === 'self') {
      onChange({ kind: 'self' });
    } else if (mode === 'registered') {
      onChange({ kind: 'registered', userId: '', label: '' });
    } else {
      onChange({
        kind: 'guest',
        guest: { name: '', phone_number: '', email: '' },
      });
    }
  };

  const handleLookup = async () => {
    const term = identifier.trim();
    if (!term || disabled) return;

    setLookingUp(true);
    setLookupError(null);

    try {
      if (UUID_PATTERN.test(term)) {
        const user = await authService.getUserProfile(term);
        onChange({
          kind: 'registered',
          userId: user.user_id,
          label: `${user.f_name} ${user.l_name}`.trim() || user.email,
        });
      } else {
        const user = await authService.lookupUser(term);
        onChange({
          kind: 'registered',
          userId: user.user_id,
          label: `${user.f_name} ${user.l_name}`.trim() || user.email,
        });
      }
      setIdentifier('');
    } catch (error) {
      const err = error as { message?: string; status?: number };
      setLookupError(
        err.status === 404
          ? 'No se encontró un jugador con ese correo o usuario.'
          : err.message ?? 'No se pudo buscar el jugador.',
      );
    } finally {
      setLookingUp(false);
    }
  };

  const updateGuest = (field: 'name' | 'phone_number' | 'email', text: string) => {
    if (value.kind !== 'guest') return;
    onChange({
      kind: 'guest',
      guest: { ...value.guest, [field]: text },
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-1 rounded-[var(--radius-lg)] bg-[var(--color-surf2)] p-1">
        <button
          type="button"
          onClick={() => setMode('registered')}
          disabled={disabled}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-md)] px-2 py-2 text-xs font-extrabold transition-all ${
            value.kind === 'registered'
              ? 'bg-white text-[var(--color-primary-dark)] shadow-sm'
              : 'text-[var(--color-text-3)] hover:text-[var(--color-text-2)]'
          }`}
        >
          <User className="h-3.5 w-3.5" />
          Registrado
        </button>
        <button
          type="button"
          onClick={() => setMode('guest')}
          disabled={disabled}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-md)] px-2 py-2 text-xs font-extrabold transition-all ${
            value.kind === 'guest'
              ? 'bg-white text-[var(--color-primary-dark)] shadow-sm'
              : 'text-[var(--color-text-3)] hover:text-[var(--color-text-2)]'
          }`}
        >
          <UserPlus className="h-3.5 w-3.5" />
          Invitado
        </button>
        <button
          type="button"
          onClick={() => setMode('self')}
          disabled={disabled}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-md)] px-2 py-2 text-xs font-extrabold transition-all ${
            value.kind === 'self'
              ? 'bg-white text-[var(--color-primary-dark)] shadow-sm'
              : 'text-[var(--color-text-3)] hover:text-[var(--color-text-2)]'
          }`}
        >
          <UserCheck className="h-3.5 w-3.5" />
          A mi nombre
        </button>
      </div>

      {value.kind === 'registered' && (
        <div>
          {value.userId ? (
            <div className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-primary)]/30 bg-[var(--color-primary-tint)] px-3 py-2.5">
              <UserCheck className="h-4 w-4 flex-shrink-0 text-[var(--color-primary)]" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-extrabold text-[var(--color-text)]">
                  {value.label || 'Jugador seleccionado'}
                </p>
                <p className="text-[10px] font-semibold text-[var(--color-text-3)]">
                  Responsable registrado
                </p>
              </div>
              <button
                type="button"
                onClick={() => onChange({ kind: 'registered', userId: '', label: '' })}
                disabled={disabled}
                className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--color-text-3)] hover:bg-white"
                aria-label="Cambiar jugador"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <>
              <label className={labelClass}>Correo o usuario del jugador</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-3)]" />
                  <input
                    value={identifier}
                    onChange={(event) => {
                      setIdentifier(event.target.value);
                      if (lookupError) setLookupError(null);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        void handleLookup();
                      }
                    }}
                    className={`${inputClass} pl-9`}
                    placeholder="correo@ejemplo.com o username"
                    disabled={disabled || lookingUp}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void handleLookup()}
                  disabled={disabled || lookingUp || !identifier.trim()}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-xs font-extrabold text-white disabled:opacity-60"
                >
                  {lookingUp ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Search className="h-3.5 w-3.5" />
                  )}
                  Buscar
                </button>
              </div>
              {lookupError && (
                <p className="mt-1 text-xs font-bold text-red-600">{lookupError}</p>
              )}
            </>
          )}
        </div>
      )}

      {value.kind === 'guest' && (
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Nombre del invitado *</label>
            <input
              value={value.guest.name}
              onChange={(event) => updateGuest('name', event.target.value)}
              className={inputClass}
              placeholder="Nombre completo"
              disabled={disabled}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Teléfono</label>
              <input
                value={value.guest.phone_number}
                onChange={(event) => updateGuest('phone_number', event.target.value)}
                className={inputClass}
                placeholder="Opcional"
                disabled={disabled}
              />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                value={value.guest.email}
                onChange={(event) => updateGuest('email', event.target.value)}
                className={inputClass}
                placeholder="Opcional"
                disabled={disabled}
              />
            </div>
          </div>
          <p className="rounded-[var(--radius-lg)] border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold leading-relaxed text-amber-800">
            El invitado no recibe notificaciones ni puede consultar el QR. El administrador que crea la reserva podrá mostrarlo.
          </p>
        </div>
      )}

      {value.kind === 'self' && (
        <p className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surf2)] px-3 py-2.5 text-xs font-semibold text-[var(--color-text-3)]">
          La reserva quedará a nombre del administrador autenticado.
        </p>
      )}
    </div>
  );
}

export default ManualBookingResponsiblePicker;
