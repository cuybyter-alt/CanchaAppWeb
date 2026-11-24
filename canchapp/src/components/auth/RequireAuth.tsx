import { Home, Loader2, LockKeyhole, LogIn } from 'lucide-react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { tokenStorage } from '../../services/AuthService';

const FEATURE_LABELS: Record<string, string> = {
  '/bookings': 'tus reservas',
  '/notifications': 'tus notificaciones',
  '/profile': 'tu perfil',
  '/payments': 'tus pagos',
};

export default function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const hasSession = Boolean(
    user &&
      tokenStorage.getAccess() &&
      tokenStorage.getRefresh(),
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
          <p className="text-sm font-extrabold text-[var(--color-text-3)]">
            Verificando sesión...
          </p>
        </div>
      </div>
    );
  }

  if (hasSession) return <Outlet />;

  const feature = FEATURE_LABELS[location.pathname] ?? 'esta sección';

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <section className="relative w-full max-w-md overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center shadow-[var(--shadow-xl)]">
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[var(--color-primary)]/10 blur-3xl" />

        <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-primary-tint)] text-[var(--color-primary)]">
          <LockKeyhole className="h-7 w-7" />
        </div>

        <h1 className="text-2xl font-extrabold leading-tight text-[var(--color-text)]">
          Inicia sesión para continuar
        </h1>
        <p className="mt-2 text-sm font-semibold leading-relaxed text-[var(--color-text-3)]">
          Necesitas iniciar sesión para acceder a {feature}.
        </p>

        <button
          type="button"
          onClick={() =>
            navigate('/login', {
              state: { redirect: `${location.pathname}${location.search}` },
            })
          }
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] px-5 py-3 text-sm font-extrabold text-white shadow-[var(--shadow-primary)] transition-all hover:-translate-y-0.5 hover:bg-[var(--color-primary-dark)] active:scale-95"
        >
          <LogIn className="h-4 w-4" />
          Iniciar sesión
        </button>

        <Link
          to="/"
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-[var(--color-border)] bg-white px-5 py-2.5 text-sm font-extrabold text-[var(--color-text-2)] no-underline transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary-dark)]"
        >
          <Home className="h-4 w-4" />
          Volver al inicio
        </Link>
      </section>
    </div>
  );
}
