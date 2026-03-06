import React, { useState } from 'react';

const filters = [
  { id: 'all',       icon: 'fa-border-all',                    label: 'Todas' },
  { id: 'futbol',    icon: 'fa-futbol',                        label: 'Fútbol' },
  { id: 'basket',    icon: 'fa-basketball',                    label: 'Baloncesto' },
  { id: 'padel',     icon: 'fa-table-tennis-paddle-ball',      label: 'Pádel' },
  { id: 'voleibol',  icon: 'fa-volleyball',                    label: 'Voleibol' },
  { id: 'techada',   icon: 'fa-umbrella',                      label: 'Techada' },
  { id: 'airelibre', icon: 'fa-sun',                           label: 'Al aire libre' },
  { id: 'disponible',icon: 'fa-bolt',                          label: 'Disponible ya' },
  { id: 'fecha',     icon: 'fa-calendar',                      label: 'Sáb, 29 Feb' },
];

export const FiltersBar: React.FC = () => {
  const [active, setActive] = useState('all');

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {filters.map((f) => {
        const isActive = active === f.id;
        return (
          <button
            key={f.id}
            onClick={() => setActive(f.id)}
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
