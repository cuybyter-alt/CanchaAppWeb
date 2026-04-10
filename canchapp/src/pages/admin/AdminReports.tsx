import React from 'react';
import { BarChart2 } from 'lucide-react';

const AdminReports: React.FC = () => {
  return (
    <div className="p-5 sm:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-[var(--color-text)]">Reportes</h1>
        <p className="text-sm text-[var(--color-text-3)] mt-1">
          Estadísticas e ingresos de tus complejos deportivos.
        </p>
      </div>

      <div className="bg-[var(--color-surface)] border-[1.5px] border-[var(--color-border)] rounded-[var(--radius-2xl)] p-10 flex flex-col items-center gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-[var(--color-primary-tint)] flex items-center justify-center">
          <BarChart2 className="w-8 h-8 text-[var(--color-primary)]" />
        </div>
        <div>
          <p className="font-extrabold text-[var(--color-text)] text-lg">Reportes y estadísticas</p>
          <p className="text-sm text-[var(--color-text-3)] mt-1 max-w-sm">
            Próximamente: ingresos, ocupación por cancha, reservas por mes y más métricas.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminReports;
