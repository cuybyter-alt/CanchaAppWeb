import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Building2,
  CalendarCheck,
  CircleDot,
  Clock3,
  Hand,
  History,
  MapPin,
  Shield,
  Smartphone,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { tokenStorage } from '../../services/AuthService';
import bookingService, { type AdminBookingRow } from '../../services/BookingService';
import ComplexesService from '../../services/ComplexesService';
import statisticsService, {
  countAdminTodayBookings,
  formatCOP,
  type AdminStats,
  type ComplexStats,
  type IncomeDataPoint,
} from '../../services/StatisticsService';
import type { ComplexField, ComplexFieldType, ComplexListItem } from '../../types/field';

const FIELD_TYPE_LABELS: Record<ComplexFieldType, string> = {
  futbol_5: 'Fútbol 5',
  futbol_7: 'Fútbol 7',
  futbol_11: 'Fútbol 11',
  microfutbol: 'Microfútbol',
  futsal: 'Futsal',
};

const SPORT_COLORS = [
  'var(--color-primary)',
  'var(--color-accent)',
  'var(--color-score)',
  '#8b5cf6',
  '#06b6d4',
];

const DAY_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function getDateRange(daysBack: number, span: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (span - 1) - daysBack);
  const endPrev = new Date(start);
  endPrev.setDate(start.getDate() - 1);
  const startPrev = new Date(endPrev);
  startPrev.setDate(endPrev.getDate() - (span - 1));
  const fmt = (d: Date) => d.toLocaleDateString('en-CA');
  return {
    current: { start: fmt(start), end: fmt(end) },
    previous: { start: fmt(startPrev), end: fmt(endPrev) },
  };
}

function chartDayLabel(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`);
  return DAY_SHORT[d.getDay()] ?? isoDate;
}

interface FieldOverviewRow {
  id: string;
  name: string;
  complexName: string;
  sportLabel: string;
  status: string;
}

interface SportSlice {
  name: string;
  count: number;
  percent: number;
  color: string;
}

interface HourlyOccupancyPoint {
  hour: string;
  percentage: number;
}

function formatUsageHourLabel(label: string): string {
  if (/^\d{2}:\d{2}$/.test(label)) {
    const hour = parseInt(label.slice(0, 2), 10);
    return `${hour}h`;
  }
  return label;
}

interface ComplexCardData {
  id: string;
  name: string;
  address: string;
  activeFields: number;
  stats?: ComplexStats;
}

function PrototypeStatCard({
  icon,
  faIcon,
  label,
  value,
  subtext,
  variant = 'primary',
  loading,
  onClick,
}: {
  icon?: React.ReactNode;
  faIcon?: string;
  label: string;
  value: string | number;
  subtext?: string;
  variant?: 'primary' | 'accent' | 'score';
  loading?: boolean;
  onClick?: () => void;
}) {
  const gradient =
    variant === 'accent'
      ? 'from-[var(--color-accent-light)] to-[var(--color-accent-dark)]'
      : variant === 'score'
        ? 'from-[var(--color-score)] to-[#ca8a04]'
        : 'from-[var(--color-primary-light)] to-[var(--color-primary-dark)]';

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      className={`bg-[var(--color-surface)] rounded-[var(--radius-2xl)] border-[1.5px] border-[var(--color-border)] shadow-[var(--shadow-md)] p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-lg)] ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
    >
      <div className={`inline-flex items-center justify-center w-12 h-12 rounded-[var(--radius-xl)] bg-gradient-to-br ${gradient} shadow-[inset_0_2px_8px_rgba(0,0,0,0.12)] mb-4`}>
        {faIcon ? <i className={`fa-solid ${faIcon} text-white text-lg`} /> : icon}
      </div>
      <p className="text-[10px] font-extrabold tracking-widest text-[var(--color-text-3)] uppercase mb-2">
        {label}
      </p>
      <p className="text-3xl font-extrabold text-[var(--color-text)] leading-none">
        {loading ? '—' : value}
      </p>
      {subtext && (
        <p className="text-xs text-[var(--color-text-3)] mt-1 font-semibold">{loading ? 'Cargando...' : subtext}</p>
      )}
    </div>
  );
}

function QuickPanelButton({
  icon,
  iconClass,
  title,
  sub,
  loading,
  onClick,
}: {
  icon: React.ReactNode;
  iconClass: string;
  title: string;
  sub: string;
  loading?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 bg-white rounded-[var(--radius-xl)] px-5 py-4 hover:shadow-md transition-all active:scale-[0.98] text-left"
    >
      <div className={`w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center text-white flex-shrink-0 ${iconClass}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-extrabold text-[var(--color-text)] text-sm">{title}</p>
        <p className="text-[11px] text-[var(--color-text-3)] font-semibold truncate">
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
  const userId = user?.user_id ?? '';

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [todayBookings, setTodayBookings] = useState(0);
  const [weekChart, setWeekChart] = useState<{ day: string; revenue: number }[]>([]);
  const [weekTotal, setWeekTotal] = useState(0);
  const [weekChange, setWeekChange] = useState<number | null>(null);
  const [complexList, setComplexList] = useState<ComplexListItem[]>([]);
  const [recentBookings, setRecentBookings] = useState<AdminBookingRow[]>([]);
  const [fieldsOverview, setFieldsOverview] = useState<FieldOverviewRow[]>([]);
  const [sportDistribution, setSportDistribution] = useState<SportSlice[]>([]);
  const [occupancyHourly, setOccupancyHourly] = useState<HourlyOccupancyPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const ranges = getDateRange(0, 7);
        const prevRanges = ranges.previous;

        const [adminStats, weekIncome, prevWeekIncome, complexes] = await Promise.all([
          statisticsService.getAdminStats(),
          statisticsService.getAdminIncome({
            start_date: ranges.current.start,
            end_date: ranges.current.end,
            interval: 'day',
          }),
          statisticsService.getAdminIncome({
            start_date: prevRanges.start,
            end_date: prevRanges.end,
            interval: 'day',
          }),
          userId
            ? ComplexesService.getComplexes({ ownerId: userId, pageSize: 50 })
            : Promise.resolve([] as ComplexListItem[]),
        ]);

        if (cancelled) return;

        const complexIds = adminStats.complexes.map((c) => c.complex_id);
        const todayIso = new Date().toLocaleDateString('en-CA');

        const [bookingsToday, usageToday] = await Promise.all([
          countAdminTodayBookings(complexIds),
          statisticsService
            .getAdminUsage({
              start_date: todayIso,
              end_date: todayIso,
              interval: 'hour',
              order: 'asc',
            })
            .catch(() => null),
        ]);

        const bookingsSettled = await Promise.allSettled(
          complexIds.map((id) => bookingService.getComplexBookings(id)),
        );
        const allBookings = bookingsSettled
          .flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
          .sort((a, b) => {
            const ta = a.startIso ? new Date(a.startIso).getTime() : 0;
            const tb = b.startIso ? new Date(b.startIso).getTime() : 0;
            return tb - ta;
          });

        const fieldsSettled = await Promise.allSettled(
          complexIds.map((id) => ComplexesService.getComplexFields(id)),
        );
        const allFields: { field: ComplexField; complexName: string }[] = [];
        fieldsSettled.forEach((result, idx) => {
          if (result.status !== 'fulfilled') return;
          const complexName =
            adminStats.complexes[idx]?.complex_name ??
            complexes.find((c) => c.id === complexIds[idx])?.name ??
            'Complejo';
          result.value.forEach((field) => {
            allFields.push({ field, complexName });
          });
        });

        const typeCounts = new Map<string, number>();
        allFields.forEach(({ field }) => {
          const label = FIELD_TYPE_LABELS[field.type] ?? field.type;
          typeCounts.set(label, (typeCounts.get(label) ?? 0) + 1);
        });
        const totalTyped = [...typeCounts.values()].reduce((s, n) => s + n, 0);
        const sportSlices: SportSlice[] = [...typeCounts.entries()].map(([name, count], i) => ({
          name,
          count,
          percent: totalTyped > 0 ? Math.round((count / totalTyped) * 100) : 0,
          color: SPORT_COLORS[i % SPORT_COLORS.length],
        }));

        const hourlyChart: HourlyOccupancyPoint[] =
          usageToday?.usage?.map((p) => ({
            hour: formatUsageHourLabel(p.label),
            percentage: Math.round(p.percentage ?? 0),
          })) ?? [];

        const overview: FieldOverviewRow[] = allFields
          .filter(({ field }) => field.status !== 'inactive')
          .slice(0, 5)
          .map(({ field, complexName }) => ({
            id: field.fieldId,
            name: field.name,
            complexName,
            sportLabel: FIELD_TYPE_LABELS[field.type] ?? field.type,
            status: field.status,
          }));

        const currentWeekTotal = statisticsService.sumIncome(weekIncome.total_series);
        const prevWeekTotal = statisticsService.sumIncome(prevWeekIncome.total_series);
        const changePct =
          prevWeekTotal > 0
            ? Math.round(((currentWeekTotal - prevWeekTotal) / prevWeekTotal) * 1000) / 10
            : null;

        const chartData = weekIncome.total_series.map((p: IncomeDataPoint) => ({
          day: chartDayLabel(p.date),
          revenue: p.income,
        }));

        if (!cancelled) {
          setStats(adminStats);
          setTodayBookings(bookingsToday);
          setWeekChart(chartData);
          setWeekTotal(currentWeekTotal);
          setWeekChange(changePct);
          setComplexList(complexes);
          setRecentBookings(allBookings.slice(0, 5));
          setFieldsOverview(overview);
          setSportDistribution(sportSlices);
          setOccupancyHourly(hourlyChart);
        }
      } catch (err) {
        console.error('Admin dashboard load error:', err);
        if (!cancelled) setError('No se pudieron cargar las estadísticas del panel.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const pendingBookings = stats?.total_pending_bookings ?? 0;
  const todayIncome = stats?.total_today_income ?? 0;
  const occupancy = stats?.total_today_occupancy ?? 0;

  const complexCards: ComplexCardData[] = useMemo(() => {
    if (!stats) return [];
    return stats.complexes.slice(0, 4).map((c) => {
      const meta = complexList.find((x) => x.id === c.complex_id);
      return {
        id: c.complex_id,
        name: c.complex_name,
        address: meta?.address ?? meta?.city ?? '—',
        activeFields: c.active_fields,
        stats: c,
      };
    });
  }, [stats, complexList]);

  const sportTotal = sportDistribution.reduce((s, x) => s + x.count, 0);

  return (
    <main className="p-5 sm:p-8 flex flex-col gap-6">
      <div className="animate-fade-in">
        <p className="text-[10px] font-extrabold tracking-widest text-[var(--color-primary)] uppercase mb-2 flex items-center gap-1.5">
          <Shield className="w-3 h-3" />
          Panel de Administración
        </p>
        <h1 className="text-4xl font-extrabold text-[var(--color-text)] leading-tight">
          ¡Hola, <span className="text-[var(--color-primary)]">{firstName}</span>!
        </h1>
        <p className="text-sm text-[var(--color-text-3)] font-semibold mt-1">
          Aquí tienes el resumen de tus complejos deportivos.
        </p>
      </div>

      {error && (
        <div className="rounded-[var(--radius-xl)] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
          {error}
        </div>
      )}

      {/* Panel de control */}
      <div className="bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] rounded-[var(--radius-2xl)] border border-[var(--color-primary-dark)] shadow-[var(--shadow-lg)] p-6 animate-fade-in">
        <div className="mb-5">
          <h2 className="text-white font-extrabold text-xl flex items-center gap-2">
            <Zap className="w-5 h-5 fill-white" />
            Panel de Control
          </h2>
          <p className="text-white/80 text-sm font-semibold mt-1">
            Acciones rápidas para gestionar tu negocio
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickPanelButton
            icon={<Building2 className="w-4 h-4" />}
            iconClass="bg-[var(--color-primary-dark)]"
            title="Mis Complejos"
            sub={`${stats?.total_complexes ?? 0} registrados`}
            loading={loading}
            onClick={() => navigate('/admin/complexes')}
          />
          <QuickPanelButton
            icon={<CircleDot className="w-4 h-4" />}
            iconClass="bg-rose-500"
            title="Canchas"
            sub={`${stats?.total_active_fields ?? 0} activas`}
            loading={loading}
            onClick={() => navigate('/admin/fields')}
          />
          <QuickPanelButton
            icon={<CalendarCheck className="w-4 h-4" />}
            iconClass="bg-amber-500"
            title="Reservas"
            sub={`${pendingBookings} pendientes`}
            loading={loading}
            onClick={() => navigate('/admin/bookings')}
          />
          <QuickPanelButton
            icon={<TrendingUp className="w-4 h-4" />}
            iconClass="bg-purple-600"
            title="Estadísticas"
            sub="Análisis y reportes"
            onClick={() => navigate('/admin/reports')}
          />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 animate-fade-in">
        <PrototypeStatCard
          faIcon="fa-building"
          label="Complejos"
          value={stats?.total_complexes ?? 0}
          subtext={`${stats?.total_complexes ?? 0} total registrados`}
          loading={loading}
          onClick={() => navigate('/admin/complexes')}
        />
        <PrototypeStatCard
          faIcon="fa-futbol"
          label="Canchas activas"
          value={stats?.total_active_fields ?? 0}
          subtext={`${stats?.total_fields ?? 0} total (${stats?.total_maintenance_fields ?? 0} en mantenimiento)`}
          loading={loading}
          onClick={() => navigate('/admin/fields')}
        />
        <PrototypeStatCard
          faIcon="fa-calendar-check"
          label="Reservas hoy"
          value={todayBookings}
          subtext={`${pendingBookings} pendientes de aprobar`}
          variant="accent"
          loading={loading}
          onClick={() => navigate('/admin/bookings')}
        />
        <PrototypeStatCard
          faIcon="fa-coins"
          label="Ingresos hoy"
          value={loading ? '—' : formatCOP(todayIncome)}
          subtext={`${occupancy}% de ocupación`}
          variant="score"
          loading={loading}
          onClick={() => navigate('/admin/reports')}
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-fade-in">
        <div className="bg-[var(--color-surface)] rounded-[var(--radius-2xl)] border-[1.5px] border-[var(--color-border)] shadow-[var(--shadow-md)] p-6">
          <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
            <div>
              <h3 className="text-lg font-extrabold text-[var(--color-text)] flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[var(--color-primary)]" />
                Ingresos semanales
              </h3>
              <p className="text-xs text-[var(--color-text-3)] font-semibold mt-1">Últimos 7 días</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-extrabold text-[var(--color-primary-dark)]">
                {loading ? '—' : formatCOP(weekTotal)}
              </p>
              {weekChange !== null && !loading && (
                <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-[var(--color-primary-tint)] text-[var(--color-primary-dark)] text-[10px] font-extrabold">
                  {weekChange >= 0 ? '+' : ''}
                  {weekChange}% vs semana anterior
                </span>
              )}
            </div>
          </div>
          {loading ? (
            <div className="h-[240px] flex items-center justify-center text-sm text-[var(--color-text-3)]">
              Cargando gráfico...
            </div>
          ) : weekChart.length === 0 ? (
            <div className="h-[240px] flex flex-col items-center justify-center text-center px-4 gap-1">
              <p className="text-sm font-extrabold text-[var(--color-text-2)]">Sin ingresos en los últimos 7 días</p>
              <p className="text-xs text-[var(--color-text-3)] font-semibold max-w-xs">
                Aparecerá cuando haya reservas confirmadas con pago en esa semana. No necesitas “muchos” datos: basta con algunas reservas aceptadas.
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={weekChart}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--color-text-3)' }} />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--color-text-3)' }}
                  tickFormatter={(v) => `$${Math.round(Number(v) / 1000)}k`}
                />
                <Tooltip
                  formatter={(value) => [formatCOP(Number(value ?? 0)), 'Ingresos']}
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1.5px solid var(--color-border)',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--color-primary)"
                  strokeWidth={3}
                  fill="url(#revenueGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-[var(--color-surface)] rounded-[var(--radius-2xl)] border-[1.5px] border-[var(--color-border)] shadow-[var(--shadow-md)] p-6">
          <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
            <div>
              <h3 className="text-lg font-extrabold text-[var(--color-text)] flex items-center gap-2">
                <Clock3 className="w-5 h-5 text-[var(--color-accent)]" />
                Ocupación por hora
              </h3>
              <p className="text-xs text-[var(--color-text-3)] font-semibold mt-1">Hoy — reservas vs capacidad</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-[var(--color-accent-tint)] text-[var(--color-accent-dark)] text-xs font-extrabold">
              {loading ? '—' : `${occupancy}% promedio`}
            </span>
          </div>
          {loading ? (
            <div className="h-[240px] flex items-center justify-center text-sm text-[var(--color-text-3)]">
              Cargando...
            </div>
          ) : occupancyHourly.length === 0 ? (
            <div className="h-[240px] flex flex-col items-center justify-center text-center px-4 gap-1">
              <p className="text-sm font-extrabold text-[var(--color-text-2)]">Sin ocupación registrada hoy</p>
              <p className="text-xs text-[var(--color-text-3)] font-semibold max-w-xs">
                Se calcula con reservas del día y horarios con tarifa. Configura horarios + precios en la cancha y crea reservas para ver barras por hora.
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={occupancyHourly}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: 'var(--color-text-3)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-3)' }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  formatter={(value, _name, item) => {
                    const row = item?.payload as HourlyOccupancyPoint | undefined;
                    return [`${Number(value ?? 0)}%`, `Ocupación ${row?.hour ?? ''}`];
                  }}
                />
                <Bar dataKey="percentage" fill="var(--color-accent)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Deporte + complejos */}
      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 animate-fade-in">
        <div className="bg-[var(--color-surface)] rounded-[var(--radius-2xl)] border-[1.5px] border-[var(--color-border)] shadow-[var(--shadow-md)] p-6">
          <h3 className="text-lg font-extrabold text-[var(--color-text)] mb-5 flex items-center gap-2">
            <CircleDot className="w-5 h-5 text-[var(--color-score)]" />
            Canchas por deporte
          </h3>
          {loading ? (
            <p className="text-sm text-[var(--color-text-3)]">Cargando...</p>
          ) : sportDistribution.length === 0 ? (
            <p className="text-sm text-[var(--color-text-3)]">No hay canchas registradas</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={sportDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="count"
                  >
                    {sportDistribution.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, _n, item) => {
                      const row = item?.payload as SportSlice | undefined;
                      return [`${Number(value ?? 0)} canchas (${row?.percent ?? 0}%)`, row?.name ?? ''];
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-2 mt-4">
                {sportDistribution.map((sport) => (
                  <div key={sport.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: sport.color }} />
                      <span className="text-xs font-semibold text-[var(--color-text-2)]">{sport.name}</span>
                    </div>
                    <span className="text-xs font-extrabold text-[var(--color-text)]">
                      {sport.count} · {sport.percent}%
                    </span>
                  </div>
                ))}
                {sportTotal > 0 && (
                  <p className="text-[10px] font-bold text-[var(--color-text-3)] uppercase tracking-wider pt-1">
                    {sportTotal} canchas en total
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        <div className="bg-[var(--color-surface)] rounded-[var(--radius-2xl)] border-[1.5px] border-[var(--color-border)] shadow-[var(--shadow-md)] p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-extrabold text-[var(--color-text)] flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[var(--color-primary)]" />
              Mis complejos deportivos
            </h3>
            <button
              type="button"
              onClick={() => navigate('/admin/complexes')}
              className="text-xs font-extrabold text-[var(--color-primary-dark)] hover:underline"
            >
              Ver todos
            </button>
          </div>
          {loading ? (
            <p className="text-sm text-[var(--color-text-3)]">Cargando complejos...</p>
          ) : complexCards.length === 0 ? (
            <p className="text-sm text-[var(--color-text-3)]">Aún no tienes complejos registrados</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {complexCards.map((complex) => (
                <button
                  key={complex.id}
                  type="button"
                  onClick={() => navigate(`/admin/complexes/${complex.id}/fields`)}
                  className="bg-[var(--color-bg)] rounded-[var(--radius-xl)] border border-[var(--color-border)] p-4 text-left hover:border-[var(--color-primary)] hover:-translate-y-1 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-12 h-12 rounded-[var(--radius-md)] bg-gradient-to-br from-[var(--color-primary-light)] to-[var(--color-primary-dark)] flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-white" />
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        complex.stats && complex.stats.maintenance_fields > 0 && complex.activeFields === 0
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-[var(--color-primary-tint)] text-[var(--color-primary-dark)]'
                      }`}
                    >
                      {complex.stats && complex.stats.maintenance_fields > 0 && complex.activeFields === 0
                        ? 'Mantenimiento'
                        : 'Activo'}
                    </span>
                  </div>
                  <p className="font-extrabold text-[var(--color-text)] truncate">{complex.name}</p>
                  <p className="text-xs text-[var(--color-text-3)] font-semibold mt-1 line-clamp-2 flex items-start gap-1">
                    <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5" />
                    {complex.address}
                  </p>
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--color-border)]">
                    <CircleDot className="w-4 h-4 text-[var(--color-primary)]" />
                    <span className="text-sm font-extrabold text-[var(--color-primary-dark)]">
                      {complex.activeFields}
                    </span>
                    <span className="text-[10px] font-extrabold text-[var(--color-text-3)] uppercase">
                      canchas activas
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reservas + canchas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
        <div className="bg-[var(--color-surface)] rounded-[var(--radius-2xl)] border-[1.5px] border-[var(--color-border)] shadow-[var(--shadow-md)] p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-extrabold text-[var(--color-text)] flex items-center gap-2">
              <History className="w-5 h-5 text-[var(--color-primary)]" />
              Reservas recientes
            </h3>
            <span
              className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                pendingBookings > 0
                  ? 'bg-[var(--color-accent-tint)] text-[var(--color-accent-dark)]'
                  : 'bg-[var(--color-surf2)] text-[var(--color-text-3)]'
              }`}
            >
              {pendingBookings > 0 ? `${pendingBookings} pendientes` : 'Al día'}
            </span>
          </div>
          {loading ? (
            <p className="text-sm text-[var(--color-text-3)]">Cargando reservas...</p>
          ) : recentBookings.length === 0 ? (
            <p className="text-sm text-[var(--color-text-3)]">No hay reservas recientes</p>
          ) : (
            <div className="flex flex-col gap-3">
              {recentBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center gap-4 p-3 rounded-[var(--radius-md)] bg-[var(--color-bg)] border border-[var(--color-border)]"
                >
                  <div
                    className={`w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center text-white flex-shrink-0 ${
                      booking.status === 'canceled'
                        ? 'bg-[var(--color-accent)]'
                        : 'bg-gradient-to-br from-[var(--color-primary-light)] to-[var(--color-primary-dark)]'
                    }`}
                  >
                    {booking.isManual ? (
                      <Hand className="w-4 h-4" />
                    ) : (
                      <Smartphone className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-extrabold text-[var(--color-text)] truncate">
                      {booking.customerName}
                    </p>
                    <p className="text-xs text-[var(--color-text-3)] font-semibold truncate">
                      {booking.fieldName} · {booking.timeRange}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-extrabold text-[var(--color-primary-dark)]">
                      {booking.totalLabel}
                    </p>
                    {booking.approval !== 'approved' && booking.status !== 'canceled' && (
                      <span className="text-[10px] font-extrabold text-[var(--color-accent)] uppercase">
                        Pendiente
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[var(--color-surface)] rounded-[var(--radius-2xl)] border-[1.5px] border-[var(--color-border)] shadow-[var(--shadow-md)] p-6">
          <h3 className="text-lg font-extrabold text-[var(--color-text)] mb-5 flex items-center gap-2">
            <CircleDot className="w-5 h-5 text-[var(--color-primary)]" />
            Estado de canchas
          </h3>
          {loading ? (
            <p className="text-sm text-[var(--color-text-3)]">Cargando canchas...</p>
          ) : fieldsOverview.length === 0 ? (
            <p className="text-sm text-[var(--color-text-3)]">No hay canchas activas</p>
          ) : (
            <div className="flex flex-col gap-3">
              {fieldsOverview.map((field) => (
                <div
                  key={field.id}
                  className="flex items-center gap-4 p-3 rounded-[var(--radius-md)] bg-[var(--color-bg)] border border-[var(--color-border)]"
                >
                  <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--color-surf2)] flex items-center justify-center flex-shrink-0">
                    <CircleDot className="w-4 h-4 text-[var(--color-primary)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-extrabold text-[var(--color-text)] truncate">{field.name}</p>
                    <p className="text-xs text-[var(--color-text-3)] font-semibold truncate">
                      {field.complexName} · {field.sportLabel}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase flex-shrink-0 ${
                      field.status === 'active'
                        ? 'bg-[var(--color-primary-tint)] text-[var(--color-primary-dark)]'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {field.status === 'active' ? 'Activa' : 'Mantenimiento'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default AdminDashboard;
