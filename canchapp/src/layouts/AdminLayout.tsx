import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
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
import { useAuth } from '../context/AuthContext';
import { NotificationsProvider } from '../context/NotificationsContext';
import { useAdminTodayStats } from '../hooks/useAdminTodayStats';

const ROLE_LABEL: Record<string, string> = {
  Owner: 'Dueño',
  Manager: 'Gerente',
};

function AdminSidebar({ onClose, collapsed = false }: { onClose?: () => void; collapsed?: boolean }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const todayStats = useAdminTodayStats();
  const roleLabel = ROLE_LABEL[user?.role_name ?? ''] ?? user?.role_name ?? 'Admin';

  const handleLogout = async () => {
    await authService.logout().catch(() => tokenStorage.clear());
    navigate('/login');
  };

  const navItem = `flex items-center rounded-[var(--radius-lg)] cursor-pointer text-sm font-extrabold transition-all duration-[var(--duration-fast)] relative no-underline ${
    collapsed ? 'justify-center px-0 py-3' : 'gap-3 px-3 py-3'
  }`;
  const activeClass =
    'bg-[var(--color-primary-tint)] text-[var(--color-primary-dark)] before:absolute before:left-0 before:top-[20%] before:bottom-[20%] before:w-[3px] before:rounded-r-[var(--radius-xs)] before:bg-[var(--color-primary)]';
  const inactiveClass =
    'text-[var(--color-text-2)] hover:bg-[var(--color-surf2)] hover:text-[var(--color-primary-dark)]';

  return (
    <aside
      className={`flex h-full flex-col gap-1 overflow-y-auto border-r-[1.5px] border-[var(--color-border)] bg-[var(--color-surface)] transition-all duration-300 ${
        collapsed ? 'p-2' : 'p-5'
      }`}
    >
      {/* Mobile close */}
      {onClose && (
        <div className="flex justify-end mb-2 lg:hidden">
          <button onClick={onClose} className="p-1 text-[var(--color-text-2)]">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* User profile */}
      <div className={`mb-4 flex items-center ${collapsed ? 'justify-center px-0' : 'gap-3 px-1'}`}>
        <div className={`rounded-full border-2 border-[var(--color-primary)] bg-[var(--color-text)] overflow-hidden flex-shrink-0 shadow-[var(--shadow-primary)] transition-all duration-300 ${
          collapsed ? 'h-10 w-10' : 'h-12 w-12'
        }`}>
          <img src="/cuypequeniologo.png" alt="avatar" className="w-full h-full object-cover" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="font-extrabold text-sm text-[var(--color-text)] truncate">
              {user ? `${user.f_name} ${user.l_name}` : 'Admin'}
            </p>
            <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full bg-[var(--color-primary)] text-white text-[10px] font-extrabold uppercase tracking-wide">
              {roleLabel}
            </span>
          </div>
        )}
      </div>

      <div className="h-[1.5px] bg-[var(--color-border)] rounded-sm mb-3" />

      {/* Panel Admin section */}
      {!collapsed ? (
        <p className="px-3 pb-1 text-[10px] font-extrabold tracking-widest text-[var(--color-text-3)] uppercase">
          Panel Admin
        </p>
      ) : (
        <div className="mx-2 my-1 h-px bg-[var(--color-border)]" />
      )}

      <NavLink
        to="/admin"
        end
        title={collapsed ? 'Dashboard' : undefined}
        aria-label="Dashboard"
        className={({ isActive }) => `${navItem} ${isActive ? activeClass : inactiveClass}`}
        onClick={onClose}
      >
        <LayoutDashboard className="w-[18px] h-[18px] flex-shrink-0" />
        <span className={`overflow-hidden whitespace-nowrap transition-all duration-200 ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
          Dashboard
        </span>
      </NavLink>

      <NavLink
        to="/admin/complexes"
        title={collapsed ? 'Mis Complejos' : undefined}
        aria-label="Mis Complejos"
        className={({ isActive }) => `${navItem} ${isActive ? activeClass : inactiveClass}`}
        onClick={onClose}
      >
        <Building2 className="w-[18px] h-[18px] flex-shrink-0" />
        <span className={`overflow-hidden whitespace-nowrap transition-all duration-200 ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
          Mis Complejos
        </span>
      </NavLink>

      <NavLink
        to="/admin/bookings"
        title={collapsed ? 'Reservas' : undefined}
        aria-label="Reservas"
        className={({ isActive }) => `${navItem} ${isActive ? activeClass : inactiveClass}`}
        onClick={onClose}
      >
        <CalendarCheck className="w-[18px] h-[18px] flex-shrink-0" />
        <span className={`overflow-hidden whitespace-nowrap transition-all duration-200 ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
          Reservas
        </span>
        <AdminBookingsBadge
          pending={todayStats.pendingBookings}
          loading={todayStats.loading}
          collapsed={collapsed}
        />
      </NavLink>

      <NavLink
        to="/admin/reports"
        title={collapsed ? 'Reportes' : undefined}
        aria-label="Reportes"
        className={({ isActive }) => `${navItem} ${isActive ? activeClass : inactiveClass}`}
        onClick={onClose}
      >
        <BarChart2 className="w-[18px] h-[18px] flex-shrink-0" />
        <span className={`overflow-hidden whitespace-nowrap transition-all duration-200 ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
          Reportes
        </span>
      </NavLink>

      <div className="h-[1.5px] bg-[var(--color-border)] rounded-sm my-3" />

      {/* Accesos section */}
      {!collapsed ? (
        <p className="px-3 pb-1 text-[10px] font-extrabold tracking-widest text-[var(--color-text-3)] uppercase">
          Accesos
        </p>
      ) : (
        <div className="mx-2 my-1 h-px bg-[var(--color-border)]" />
      )}

      <NavLink
        to="/"
        title={collapsed ? 'Ver como Jugador' : undefined}
        aria-label="Ver como Jugador"
        className={`${navItem} ${inactiveClass}`}
        onClick={onClose}
      >
        <Globe className="w-[18px] h-[18px] flex-shrink-0" />
        <span className={`overflow-hidden whitespace-nowrap transition-all duration-200 ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
          Ver como Jugador
        </span>
      </NavLink>

      <div className="h-[1.5px] bg-[var(--color-border)] rounded-sm my-3" />

      {/* Today's stats widget */}
      {!collapsed && (
        <TodayWidget
          todayBookings={todayStats.todayBookings}
          pendingBookings={todayStats.pendingBookings}
          loading={todayStats.loading}
        />
      )}

      {/* Logout */}
      <button
        onClick={handleLogout}
        title={collapsed ? 'Cerrar Sesión' : undefined}
        aria-label="Cerrar Sesión"
        className={`mt-auto flex items-center rounded-[var(--radius-lg)] cursor-pointer text-sm font-extrabold text-[var(--color-accent)] transition-all hover:bg-red-50 ${
          collapsed ? 'justify-center px-0 py-3' : 'gap-3 px-3 py-3'
        }`}
      >
        <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
        <span className={`overflow-hidden whitespace-nowrap transition-all duration-200 ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
          Cerrar Sesión
        </span>
      </button>
    </aside>
  );
}

function AdminBookingsBadge({
  pending,
  loading,
  collapsed,
}: {
  pending: number;
  loading: boolean;
  collapsed: boolean;
}) {
  if (loading || pending <= 0) return null;

  if (collapsed) {
    return (
      <span className="absolute right-1 top-1 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-[var(--color-accent)] px-1 text-[8px] font-black text-white shadow-sm">
        {pending}
      </span>
    );
  }

  return (
    <span className="ml-auto px-1.5 py-0.5 min-w-[20px] text-center rounded-full bg-[var(--color-accent)] text-white text-[10px] font-extrabold">
      {pending}
    </span>
  );
}

function TodayWidget({
  todayBookings,
  pendingBookings,
  loading,
}: {
  todayBookings: number;
  pendingBookings: number;
  loading: boolean;
}) {
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
            <p className="text-white font-extrabold text-xl leading-none">
              {loading ? '—' : todayBookings}
            </p>
            <p className="text-white/50 text-[10px] font-bold uppercase tracking-wide mt-0.5">Reservas</p>
          </div>
          <div>
            <p className="text-[var(--color-primary)] font-extrabold text-xl leading-none">
              {loading ? '—' : pendingBookings}
            </p>
            <p className="text-white/50 text-[10px] font-bold uppercase tracking-wide mt-0.5">Pendientes</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <NotificationsProvider>
      <div className="min-h-screen relative z-[1]">
        <Topbar
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((open) => !open)}
          layout="admin"
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
        />

        <div
          className={`grid grid-cols-1 transition-[grid-template-columns] duration-300 ease-out ${
            sidebarOpen
              ? 'lg:grid-cols-[260px_minmax(0,1fr)]'
              : 'lg:grid-cols-[80px_minmax(0,1fr)]'
          }`}
        >
        {/* Desktop sidebar */}
        <div className="hidden lg:block sticky top-16 h-[calc(100vh-64px)]">
          <AdminSidebar collapsed={!sidebarOpen} />
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
        <main className="min-h-[calc(100vh-64px)] min-w-0">
          <Outlet />
        </main>
        </div>
      </div>
    </NotificationsProvider>
  );
}
