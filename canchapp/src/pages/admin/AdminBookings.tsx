import React from 'react';
import { CalendarCheck } from 'lucide-react';

const AdminBookings: React.FC = () => {
  return (
    <div className="p-5 sm:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-[var(--color-text)]">Reservas</h1>
        <p className="text-sm text-[var(--color-text-3)] mt-1">
          Aprueba, rechaza y monitorea las reservas de tus canchas.
        </p>
      </div>

      {/* Status filter chips */}
      <div className="flex flex-wrap gap-2">
        {['Todas', 'Activas', 'Pendientes', 'Canceladas'].map((label) => (
          <button
            key={label}
            className={`px-4 py-1.5 rounded-full text-xs font-extrabold border transition-all
              ${label === 'Todas'
                ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                : 'bg-[var(--color-surface)] text-[var(--color-text-2)] border-[var(--color-border)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary-dark)]'
              }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="bg-[var(--color-surface)] border-[1.5px] border-[var(--color-border)] rounded-[var(--radius-2xl)] p-10 flex flex-col items-center gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-[var(--color-primary-tint)] flex items-center justify-center">
          <CalendarCheck className="w-8 h-8 text-[var(--color-primary)]" />
        </div>
        <div>
          <p className="font-extrabold text-[var(--color-text)] text-lg">Gestión de reservas</p>
          <p className="text-sm text-[var(--color-text-3)] mt-1 max-w-sm">
            Las reservas de tus complejos aparecerán aquí. Integración con backend próximamente.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminBookings;
