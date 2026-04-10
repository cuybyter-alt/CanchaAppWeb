import React from 'react';
import { Building2, Plus } from 'lucide-react';

const AdminComplexes: React.FC = () => {
  return (
    <div className="p-5 sm:p-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[var(--color-text)]">Mis Complejos</h1>
          <p className="text-sm text-[var(--color-text-3)] mt-1">
            Administra los complejos deportivos registrados bajo tu cuenta.
          </p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-lg)]
          bg-[var(--color-primary)] text-white font-extrabold text-sm shadow-[var(--shadow-primary)]
          hover:bg-[var(--color-primary-dark)] transition-all active:scale-95">
          <Plus className="w-4 h-4" />
          Nuevo Complejo
        </button>
      </div>

      <div className="bg-[var(--color-surface)] border-[1.5px] border-[var(--color-border)] rounded-[var(--radius-2xl)] p-10 flex flex-col items-center gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-[var(--color-primary-tint)] flex items-center justify-center">
          <Building2 className="w-8 h-8 text-[var(--color-primary)]" />
        </div>
        <div>
          <p className="font-extrabold text-[var(--color-text)] text-lg">Gestión de complejos</p>
          <p className="text-sm text-[var(--color-text-3)] mt-1 max-w-sm">
            Aquí verás la lista de tus complejos deportivos. Esta sección se completará con la integración del backend.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminComplexes;
