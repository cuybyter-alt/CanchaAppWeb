import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  CircleDot,
  CalendarCheck,
  BarChart2,
  Zap,
  ArrowRight,
} from 'lucide-react';
import { tokenStorage } from '../../services/AuthService';
import statisticsService, {
  countAdminTodayBookings,
  formatCOP,
  getCurrentMonthRange,
  type AdminStats,
} from '../../services/StatisticsService';

interface StatCardProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string | number;
  sub: string;
  loading?: boolean;
  onClick?: () => void;
}

function StatCard({ icon, iconBg, label, value, sub, loading, onClick }: StatCardProps) {
  return (
    <div
      className={`bg-[var(--color-surface)] border-[1.5px] border-[var(--color-border)] rounded-[var(--radius-2xl)] p-5 flex flex-col gap-3 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div className={`w-11 h-11 rounded-[var(--radius-lg)] flex items-center justify-center text-white ${iconBg}`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-extrabold tracking-widest text-[var(--color-text-3)] uppercase mb-1">
          {label}
        </p>
        <p className="text-3xl font-extrabold text-[var(--color-text)] leading-none">
          {loading ? '—' : value}
        </p>
        <p className="text-xs text-[var(--color-text-3)] mt-1">{loading ? 'Cargando...' : sub}</p>
      </div>
    </div>
  );
}

interface QuickActionProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  sub: string;
  loading?: boolean;
  onClick?: () => void;
}

function QuickAction({ icon, iconBg, title, sub, loading, onClick }: QuickActionProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-4 bg-white rounded-[var(--radius-xl)] px-5 py-4 hover:shadow-md transition-all active:scale-95 text-left w-full"
    >
      <div className={`w-12 h-12 rounded-[var(--radius-lg)] flex items-center justify-center text-white flex-shrink-0 ${iconBg}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="font-extrabold text-[var(--color-text)] text-sm truncate">{title}</p>
        <p className="text-xs text-[var(--color-text-3)] truncate">
          {loading ? 'Cargando...' : sub}
        </p>
      </div>
    </button>
  );
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const user = tokenStorage.getUser();
  const firstName = user?.f_name ?? user?.username ?? 'Admin';

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [todayBookings, setTodayBookings] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      setLoading(true);
      setError(null);

      try {
        const adminStats = await statisticsService.getAdminStats();
        if (cancelled) return;

        const complexIds = adminStats.complexes.map((c) => c.complex_id);
        const [bookingsToday, incomeSeries] = await Promise.all([
          countAdminTodayBookings(complexIds),
          (async () => {
            const { start, end } = getCurrentMonthRange();
            const income = await statisticsService.getAdminIncome({
              start_date: start,
              end_date: end,
              interval: 'day',
            });
            return statisticsService.sumIncome(income.total_series);
          })(),
        ]);

        if (cancelled) return;

        setStats(adminStats);
        setTodayBookings(bookingsToday);
        setMonthlyIncome(incomeSeries);
      } catch (err) {
        console.error('Admin dashboard stats error:', err);
        if (!cancelled) {
          setError('No se pudieron cargar las estadísticas.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  const complexesCount = stats?.total_complexes ?? 0;
  const activeFields = stats?.total_active_fields ?? 0;
  const totalFields = stats?.total_fields ?? 0;
  const maintenanceFields = stats?.total_maintenance_fields ?? 0;
  const pendingBookings = stats?.total_pending_bookings ?? 0;
  const todayIncome = stats?.total_today_income ?? 0;

  const complexesSub =
    complexesCount === 1
      ? '1 registrado'
      : `${complexesCount} registrados`;

  const fieldsSub =
    totalFields === 1
      ? '1 activa'
      : `${activeFields} activas`;

  const fieldsDetailSub =
    `${totalFields} total (${maintenanceFields} en mantenimiento)`;

  const pendingSub =
    pendingBookings === 1
      ? '1 pendiente'
      : `${pendingBookings} pendientes`;

  const todayBookingsSub =
    pendingBookings === 1
      ? '1 pendiente de aprobación'
      : `${pendingBookings} pendientes de aprobación`;

  const incomeValue =
    monthlyIncome === null ? '—' : formatCOP(monthlyIncome);

  const incomeSub =
    todayIncome > 0
      ? `Hoy: ${formatCOP(todayIncome)} · Ver reporte completo`
      : 'Ver reporte completo';

  return (
    <div className="p-5 sm:p-8 space-y-8">
      {/* Header */}
      <div>
        <p className="text-[10px] font-extrabold tracking-widest text-[var(--color-primary)] uppercase mb-1 flex items-center gap-1.5">
          <CircleDot className="w-3 h-3" />
          Panel de Administración
        </p>
        <h1 className="text-4xl font-extrabold text-[var(--color-text)] leading-tight mt-1">
          ¡Hola, <span className="text-[var(--color-primary)]">{firstName}</span>!
        </h1>
        <p className="text-[var(--color-text-3)] text-sm mt-1">
          Aquí tienes el resumen de tus complejos deportivos.
        </p>
      </div>

      {error && (
        <div className="rounded-[var(--radius-xl)] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
          {error}
        </div>
      )}

      {/* Panel de Control */}
      <div className="bg-[var(--color-primary)] rounded-[var(--radius-2xl)] p-6">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-5 h-5 text-white fill-white" />
          <h2 className="text-white font-extrabold text-xl">Panel de Control</h2>
        </div>
        <p className="text-white/70 text-sm mb-5">Acciones rápidas para gestionar tu negocio</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <QuickAction
            icon={<Building2 className="w-6 h-6" />}
            iconBg="bg-[var(--color-primary-dark)]"
            title="Mis Complejos"
            sub={complexesSub}
            loading={loading}
            onClick={() => navigate('/admin/complexes')}
          />
          <QuickAction
            icon={<CircleDot className="w-6 h-6" />}
            iconBg="bg-rose-500"
            title="Canchas"
            sub={fieldsSub}
            loading={loading}
            onClick={() => navigate('/admin/fields')}
          />
          <QuickAction
            icon={<CalendarCheck className="w-6 h-6" />}
            iconBg="bg-amber-500"
            title="Reservas"
            sub={pendingSub}
            loading={loading}
            onClick={() => navigate('/admin/bookings')}
          />
          <QuickAction
            icon={<BarChart2 className="w-6 h-6" />}
            iconBg="bg-[var(--color-text)]"
            title="Reportes"
            sub="Ver completos"
            onClick={() => navigate('/admin/reports')}
          />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={<Building2 className="w-5 h-5" />}
          iconBg="bg-[var(--color-primary)]"
          label="Complejos"
          value={complexesCount}
          sub={`${complexesCount} total registrados`}
          loading={loading}
          onClick={() => navigate('/admin/complexes')}
        />
        <StatCard
          icon={<CircleDot className="w-5 h-5" />}
          iconBg="bg-[var(--color-primary)]"
          label="Canchas activas"
          value={activeFields}
          sub={fieldsDetailSub}
          loading={loading}
          onClick={() => navigate('/admin/fields')}
        />
        <StatCard
          icon={<CalendarCheck className="w-5 h-5" />}
          iconBg="bg-amber-500"
          label="Reservas hoy"
          value={todayBookings}
          sub={todayBookingsSub}
          loading={loading}
          onClick={() => navigate('/admin/bookings')}
        />
        <StatCard
          icon={<BarChart2 className="w-5 h-5" />}
          iconBg="bg-[var(--color-text)]"
          label="Ingresos del mes"
          value={incomeValue}
          sub={incomeSub}
          loading={loading}
          onClick={() => navigate('/admin/reports')}
        />
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-[var(--color-surface)] border-[1.5px] border-[var(--color-border)] rounded-[var(--radius-2xl)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-[var(--color-text)]">Reservas recientes</h3>
            <button
              onClick={() => navigate('/admin/bookings')}
              className="flex items-center gap-1 text-xs font-extrabold text-[var(--color-primary-dark)] hover:underline"
            >
              Ver todas <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <p className="text-sm text-[var(--color-text-3)]">
            {loading
              ? 'Cargando resumen...'
              : `${todayBookings} reserva(s) hoy · ${pendingBookings} pendiente(s) de aprobación.`}
          </p>
          <button
            onClick={() => navigate('/admin/bookings')}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-lg)]
              bg-[var(--color-primary-tint)] text-[var(--color-primary-dark)] font-extrabold text-sm
              hover:bg-[var(--color-primary)] hover:text-white transition-all"
          >
            <CalendarCheck className="w-4 h-4" />
            Gestionar Reservas
          </button>
        </div>

        <div className="bg-[var(--color-surface)] border-[1.5px] border-[var(--color-border)] rounded-[var(--radius-2xl)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-[var(--color-text)]">Mis Complejos</h3>
            <button
              onClick={() => navigate('/admin/complexes')}
              className="flex items-center gap-1 text-xs font-extrabold text-[var(--color-primary-dark)] hover:underline"
            >
              Ver todos <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <p className="text-sm text-[var(--color-text-3)]">
            {loading
              ? 'Cargando resumen...'
              : `${complexesCount} complejo(s) · ${activeFields} cancha(s) activa(s).`}
          </p>
          <button
            onClick={() => navigate('/admin/complexes')}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-lg)]
              bg-[var(--color-primary-tint)] text-[var(--color-primary-dark)] font-extrabold text-sm
              hover:bg-[var(--color-primary)] hover:text-white transition-all"
          >
            <Building2 className="w-4 h-4" />
            Ver Complejos
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
