import React from 'react';

const filters = [
  { id: 'all',         icon: 'fa-border-all',  label: 'Todas' },
  { id: 'futbol5',     icon: 'fa-futbol',       label: 'Fútbol 5' },
  { id: 'futbol7',     icon: 'fa-futbol',       label: 'Fútbol 7' },
  { id: 'microfutbol', icon: 'fa-circle-dot',   label: 'Microfútbol' },
  { id: 'futbol11',    icon: 'fa-futbol',       label: 'Fútbol 11' },
  { id: 'techada',     icon: 'fa-umbrella',     label: 'Techada' },
  { id: 'airelibre',   icon: 'fa-sun',          label: 'Al aire libre' },
  { id: 'disponible',  icon: 'fa-bolt',         label: 'Disponible ya' },
];

interface FiltersBarProps {
  activeFilter: string;
  onFilterChange: (id: string) => void;
}

export const FiltersBar: React.FC<FiltersBarProps> = ({ activeFilter, onFilterChange }) => {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {filters.map((f) => {
        const isActive = activeFilter === f.id;
        return (
          <button
            key={f.id}
            onClick={() => onFilterChange(f.id)}
            className={`
              inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-extrabold cursor-pointer
              border-2 transition-all duration-[var(--duration-fast)] whitespace-nowrap
              ${isActive
                ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-[var(--shadow-primary)] scale-105'
                : 'bg-[var(--color-surface)] text-[var(--color-text-2)] border-[var(--color-border)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary-dark)] hover:bg-[var(--color-primary-tint)] hover:scale-105'
              }
            `}
          >
            <i className={`fa-solid ${f.icon} text-xs`} />
            {f.label}
          </button>
        );
      })}
    </div>
  );
};
