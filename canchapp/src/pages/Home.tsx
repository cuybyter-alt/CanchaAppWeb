import React, { useState } from 'react';
import { Typography } from '../components/ui/typography';
import { Badge } from '../components/ui/badge';
import { PromoBanner } from '../components/sections/PromoBanner';
import { MapCard } from '../components/sections/MapCard';
import { MapDialog } from '../components/sections/MapDialog';

const Home: React.FC = () => {
  const [isMapDialogOpen, setIsMapDialogOpen] = useState(false);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Promo Banner */}
      <PromoBanner />

      {/* Map Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <Typography variant="h3" color="text">
            Canchas Cerca de Ti
          </Typography>
        </div>
        <MapCard 
          onOpenMap={() => setIsMapDialogOpen(true)}
        />
      </div>

      {/* Map Dialog */}
      <MapDialog 
        isOpen={isMapDialogOpen} 
        onClose={() => setIsMapDialogOpen(false)} 
      />

      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[var(--color-surface)] rounded-[var(--radius-xl)] p-6 border-[1.5px] border-[var(--color-border)] hover:shadow-[var(--shadow-md)] transition-all duration-[var(--duration-mid)]">
          <div className="flex items-center justify-between mb-2">
            <Typography variant="pixel-sm" color="muted">
              RESERVAS
            </Typography>
            <div className="w-10 h-10 bg-[var(--color-primary-tint)] rounded-[var(--radius-md)] flex items-center justify-center text-[var(--color-primary)]">
              <i className="fa-solid fa-calendar-check text-lg" />
            </div>
          </div>
          <Typography variant="h2" color="primary">
            5
          </Typography>
          <Typography variant="small" color="text-3">
            Este mes
          </Typography>
        </div>

        <div className="bg-[var(--color-surface)] rounded-[var(--radius-xl)] p-6 border-[1.5px] border-[var(--color-border)] hover:shadow-[var(--shadow-md)] transition-all duration-[var(--duration-mid)]">
          <div className="flex items-center justify-between mb-2">
            <Typography variant="pixel-sm" color="muted">
              FAVORITOS
            </Typography>
            <div className="w-10 h-10 bg-[var(--color-accent-tint)] rounded-[var(--radius-md)] flex items-center justify-center text-[var(--color-accent)]">
              <i className="fa-solid fa-heart text-lg" />
            </div>
          </div>
          <Typography variant="h2" color="accent">
            8
          </Typography>
          <Typography variant="small" color="text-3">
            Canchas guardadas
          </Typography>
        </div>

        <div className="bg-[var(--color-surface)] rounded-[var(--radius-xl)] p-6 border-[1.5px] border-[var(--color-border)] hover:shadow-[var(--shadow-md)] transition-all duration-[var(--duration-mid)]">
          <div className="flex items-center justify-between mb-2">
            <Typography variant="pixel-sm" color="muted">
              PUNTOS
            </Typography>
            <div className="w-10 h-10 bg-[var(--color-primary-tint)] rounded-[var(--radius-md)] flex items-center justify-center text-[var(--color-score)]">
              <i className="fa-solid fa-star text-lg" />
            </div>
          </div>
          <Typography variant="h2" className="!text-[var(--color-score)]">
            320
          </Typography>
          <Typography variant="small" color="text-3">
            Puntos acumulados
          </Typography>
        </div>

        <div className="bg-[var(--color-surface)] rounded-[var(--radius-xl)] p-6 border-[1.5px] border-[var(--color-border)] hover:shadow-[var(--shadow-md)] transition-all duration-[var(--duration-mid)]">
          <div className="flex items-center justify-between mb-2">
            <Typography variant="pixel-sm" color="muted">
              PARTIDOS
            </Typography>
            <div className="w-10 h-10 bg-[var(--color-primary-tint)] rounded-[var(--radius-md)] flex items-center justify-center text-[var(--color-primary)]">
              <i className="fa-solid fa-futbol text-lg" />
            </div>
          </div>
          <Typography variant="h2" color="primary">
            23
          </Typography>
          <Typography variant="small" color="text-3">
            Partidos jugados
          </Typography>
        </div>
      </div>

      {/* Featured fields */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <Typography variant="h3" color="text">
            Canchas Destacadas
          </Typography>
          <button className="text-[var(--color-primary)] font-extrabold text-sm hover:underline">
            Ver todas
            <i className="fa-solid fa-arrow-right ml-2" />
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((index) => (
            <div
              key={index}
              className="bg-[var(--color-surface)] rounded-[var(--radius-xl)] border-[1.5px] border-[var(--color-border)] overflow-hidden hover:shadow-[var(--shadow-lg)] transition-all duration-[var(--duration-mid)] group cursor-pointer"
            >
              <div className="h-48 bg-gradient-to-br from-[var(--color-primary-light)] to-[var(--color-primary-dark)] relative overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center text-white text-6xl opacity-20">
                  <i className="fa-solid fa-futbol" />
                </div>
                <div className="absolute top-3 right-3">
                  <Badge variant="score">
                    <i className="fa-solid fa-star mr-1" />
                    4.8
                  </Badge>
                </div>
              </div>
              <div className="p-5">
                <Typography variant="h4" className="mb-2">
                  Cancha El Estadio {index}
                </Typography>
                <Typography variant="small" color="text-3" className="mb-3">
                  <i className="fa-solid fa-location-dot mr-1" />
                  San Isidro, Lima
                </Typography>
                <div className="flex items-center justify-between">
                  <Typography variant="small" color="primary">
                    Desde S/ 80/hora
                  </Typography>
                  <button className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-[var(--radius-full)] font-extrabold text-sm hover:bg-[var(--color-primary-dark)] transition-all duration-[var(--duration-fast)]">
                    Reservar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div>
        <Typography variant="h3" color="text" className="mb-4">
          Actividad Reciente
        </Typography>
        
        <div className="bg-[var(--color-surface)] rounded-[var(--radius-xl)] border-[1.5px] border-[var(--color-border)] divide-y divide-[var(--color-border)]">
          {[
            { icon: 'calendar-check', text: 'Reservaste Cancha El Gol', time: 'Hace 2 horas', color: 'primary' },
            { icon: 'heart', text: 'Agregaste Estadio Pro a favoritos', time: 'Hace 5 horas', color: 'accent' },
            { icon: 'star', text: 'Ganaste 50 puntos', time: 'Hace 1 día', color: 'score' },
          ].map((activity, index) => (
            <div key={index} className="flex items-center gap-4 p-4 hover:bg-[var(--color-surf2)] transition-all duration-[var(--duration-fast)]">
              <div className={`w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center ${
                activity.color === 'primary' ? 'bg-[var(--color-primary-tint)] text-[var(--color-primary)]' :
                activity.color === 'accent' ? 'bg-[var(--color-accent-tint)] text-[var(--color-accent)]' :
                'bg-[var(--color-primary-tint)] text-[var(--color-score)]'
              }`}>
                <i className={`fa-solid fa-${activity.icon}`} />
              </div>
              <div className="flex-1">
                <Typography variant="small" color="text">
                  {activity.text}
                </Typography>
                <Typography variant="small" color="text-3" className="text-xs">
                  {activity.time}
                </Typography>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;
