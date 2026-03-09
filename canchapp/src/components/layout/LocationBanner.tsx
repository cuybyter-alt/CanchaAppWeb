import { useEffect, useState } from 'react';
import { X, MapPin, RefreshCw } from 'lucide-react';

type PermState = 'denied' | 'prompt';

export function LocationBanner() {
  const [permState, setPermState] = useState<PermState | null>(null);
  const [dismissed, setDismissed] = useState(
    () => !!sessionStorage.getItem('loc-banner-dismissed')
  );

  useEffect(() => {
    if (dismissed) return;
    if (!('geolocation' in navigator) || !('permissions' in navigator)) return;

    navigator.permissions
      .query({ name: 'geolocation' as PermissionName })
      .then((result) => {
        if (result.state === 'prompt' || result.state === 'denied') {
          setPermState(result.state as PermState);
        }
        // Live-update if the user changes the permission in browser settings
        result.addEventListener('change', () => {
          if (result.state === 'granted') setPermState(null);
          else setPermState(result.state as PermState);
        });
      })
      .catch(() => {});
  }, [dismissed]);

  const handleDismiss = () => {
    sessionStorage.setItem('loc-banner-dismissed', '1');
    setDismissed(true);
  };

  if (dismissed || !permState) return null;

  const isDenied = permState === 'denied';

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-[var(--color-primary-tint)] border-b border-[var(--color-primary)]/25">

      {/* Cuy mascot — bouncing gently */}
      <img
        src="/cuypequeniologo.png"
        alt="Cuy"
        className="w-9 h-9 object-contain flex-shrink-0 animate-bounce"
        style={{ animationDuration: '1.8s' }}
      />

      {/* Message */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-extrabold text-[var(--color-primary-dark)] leading-snug">
          <MapPin className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
          {isDenied
            ? '¡Oye! Tienes la ubicación bloqueada — habilítala para ver canchas cerca de ti'
            : '¡Activa tu ubicación y te mostramos las canchas más cercanas!'}
        </p>
        <p className="text-xs text-[var(--color-text-2)] mt-0.5">
          {isDenied
            ? 'Ve a Configuración del navegador → Privacidad → Ubicación → Permitir para este sitio.'
            : 'Cuando el mapa te pida permiso, toca "Permitir" para una mejor experiencia.'}
        </p>
      </div>

      {/* Reload button — most useful after the user fixes a denied permission */}
      {isDenied && (
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-primary-dark)] bg-[var(--color-primary)]/20 hover:bg-[var(--color-primary)]/35 px-3 py-1.5 rounded-full transition-colors whitespace-nowrap flex-shrink-0"
        >
          <RefreshCw className="w-3 h-3" />
          Recargar
        </button>
      )}

      {/* Dismiss */}
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 p-1.5 rounded-full text-[var(--color-text-2)] hover:text-[var(--color-primary-dark)] hover:bg-[var(--color-primary)]/15 transition-colors"
        aria-label="Cerrar aviso"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
