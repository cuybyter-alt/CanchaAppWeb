import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  CircleDot,
  CalendarCheck,
  BarChart2,
  Globe,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { tokenStorage } from '../services/AuthService';
import authService from '../services/AuthService';
import { Topbar } from '../components/layout/topbar';

const ROLE_LABEL: Record<string, string> = {
  Owner: 'Dueño',
  Manager: 'Gerente',
};

function AdminSidebar({ onClose }: { onClose?: () => void }) {
  const navigate = useNavigate();
  const user = tokenStorage.getUser();
  const roleLabel = ROLE_LABEL[user?.role_name ?? ''] ?? user?.role_name ?? 'Admin';

  const handleLogout = async () => {
    await authService.logout().catch(() => tokenStorage.clear());
    navigate('/login');
  };

  const navItem =
    'flex items-center gap-3 px-3 py-3 rounded-[var(--radius-lg)] cursor-pointer text-sm font-extrabold transition-all duration-[var(--duration-fast)] relative no-underline';
  const activeClass =
    'bg-[var(--color-primary-tint)] text-[var(--color-primary-dark)] before:absolute before:left-0 before:top-[20%] before:bottom-[20%] before:w-[3px] before:rounded-r-[var(--radius-xs)] before:bg-[var(--color-primary)]';
  const inactiveClass =
    'text-[var(--color-text-2)] hover:bg-[var(--color-surf2)] hover:text-[var(--color-primary-dark)]';

  return (
    <aside className="h-full bg-[var(--color-surface)] border-r-[1.5px] border-[var(--color-border)] p-5 flex flex-col gap-1 overflow-y-auto">
      {/* Mobile close */}
      {onClose && (
        <div className="flex justify-end mb-2 lg:hidden">
          <button onClick={onClose} className="p-1 text-[var(--color-text-2)]">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* User profile */}
      <div className="flex items-center gap-3 mb-4 px-1">
        <div className="w-12 h-12 rounded-full border-2 border-[var(--color-primary)] bg-[var(--color-text)] overflow-hidden flex-shrink-0 shadow-[var(--shadow-primary)]">
          <img src="/cuypequeniologo.png" alt="avatar" className="w-full h-full object-cover" />
        </div>
        <div className="min-w-0">
          <p className="font-extrabold text-sm text-[var(--color-text)] truncate">
            {user ? `${user.f_name} ${user.l_name}` : 'Admin'}
          </p>
          <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full bg-[var(--color-primary)] text-white text-[10px] font-extrabold uppercase tracking-wide">
            {roleLabel}
          </span>
        </div>
      </div>

      <div className="h-[1.5px] bg-[var(--color-border)] rounded-sm mb-3" />

      {/* Panel Admin section */}
      <p className="px-3 pb-1 text-[10px] font-extrabold tracking-widest text-[var(--color-text-3)] uppercase">
        Panel Admin
      </p>

      <NavLink
        to="/admin"
        end
        className={({ isActive }) => `${navItem} ${isActive ? activeClass : inactiveClass}`}
        onClick={onClose}
      >
        <LayoutDashboard className="w-[18px] h-[18px] flex-shrink-0" />
        Dashboard
      </NavLink>

      <NavLink
        to="/admin/complexes"
        className={({ isActive }) => `${navItem} ${isActive ? activeClass : inactiveClass}`}
        onClick={onClose}
      >
        <Building2 className="w-[18px] h-[18px] flex-shrink-0" />
        Mis Complejos
      </NavLink>

      <NavLink
        to="/admin/fields"
        className={({ isActive }) => `${navItem} ${isActive ? activeClass : inactiveClass}`}
        onClick={onClose}
      >
        <CircleDot className="w-[18px] h-[18px] flex-shrink-0" />
        Canchas
      </NavLink>

      <NavLink
        to="/admin/bookings"
        className={({ isActive }) => `${navItem} ${isActive ? activeClass : inactiveClass}`}
        onClick={onClose}
      >
        <CalendarCheck className="w-[18px] h-[18px] flex-shrink-0" />
        Reservas
        <AdminBookingsBadge />
      </NavLink>

      <NavLink
        to="/admin/reports"
        className={({ isActive }) => `${navItem} ${isActive ? activeClass : inactiveClass}`}
        onClick={onClose}
      >
        <BarChart2 className="w-[18px] h-[18px] flex-shrink-0" />
        Reportes
      </NavLink>

      <div className="h-[1.5px] bg-[var(--color-border)] rounded-sm my-3" />

      {/* Accesos section */}
      <p className="px-3 pb-1 text-[10px] font-extrabold tracking-widest text-[var(--color-text-3)] uppercase">
        Accesos
      </p>

      <NavLink
        to="/"
        className={`${navItem} ${inactiveClass}`}
        onClick={onClose}
      >
        <Globe className="w-[18px] h-[18px] flex-shrink-0" />
        Ver como Jugador
      </NavLink>

      <div className="h-[1.5px] bg-[var(--color-border)] rounded-sm my-3" />

      {/* Today's stats widget */}
      <TodayWidget />

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="mt-auto flex items-center gap-3 px-3 py-3 rounded-[var(--radius-lg)] cursor-pointer text-sm font-extrabold text-[var(--color-accent)] transition-all hover:bg-red-50"
      >
        <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
        Cerrar Sesión
      </button>
    </aside>
  );
}

function AdminBookingsBadge() {
  // Static badge for now — wire up to real count later
  return (
    <span className="ml-auto px-1.5 py-0.5 min-w-[20px] text-center rounded-full bg-[var(--color-accent)] text-white text-[10px] font-extrabold">
      1
    </span>
  );
}

function TodayWidget() {
  return (
    <div className="bg-[var(--color-text)] rounded-[var(--radius-xl)] p-4 mt-2 relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 11px, rgba(98,191,59,.05) 12px), repeating-linear-gradient(90deg, transparent, transparent 11px, rgba(98,191,59,.05) 12px)',
        }}
      />
      <div className="relative z-10">
        <p className="font-[var(--font-pixel)] text-[9px] text-[var(--color-primary)] mb-3 tracking-widest">
          ⚡ HOY
        </p>
        <div className="flex gap-6">
          <div>
            <p className="text-white font-extrabold text-xl leading-none">3</p>
            <p className="text-white/50 text-[10px] font-bold uppercase tracking-wide mt-0.5">Reservas</p>
          </div>
          <div>
            <p className="text-[var(--color-primary)] font-extrabold text-xl leading-none">1</p>
            <p className="text-white/50 text-[10px] font-bold uppercase tracking-wide mt-0.5">Pendientes</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen relative z-[1]">
      <Topbar />

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr]">
        {/* Desktop sidebar */}
        <div className="hidden lg:block sticky top-16 h-[calc(100vh-64px)]">
          <AdminSidebar />
        </div>

        {/* Mobile sidebar overlay */}
        {mobileSidebarOpen && (
          <>
            <div
              className="fixed inset-0 z-[200] bg-black/50 lg:hidden"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <div className="fixed left-0 top-0 bottom-0 z-[210] w-72 lg:hidden">
              <AdminSidebar onClose={() => setMobileSidebarOpen(false)} />
            </div>
          </>
        )}

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileSidebarOpen(true)}
          className="lg:hidden fixed bottom-4 right-4 z-[150] w-12 h-12 rounded-full bg-[var(--color-primary)] shadow-[var(--shadow-primary)] text-white flex items-center justify-center"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Main content */}
        <main className="min-h-[calc(100vh-64px)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
