import { Calendar, Heart, Home, MapPin, Search, Settings, Users, Wallet, User } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { Typography } from '../ui/typography';
import { Badge } from '../ui/badge';
import { useEffect, useState } from 'react';
import { useMapContext } from '../../context/MapContext';

interface SidebarProps {
  upcomingBooking?: {
    name: string;
    date: string;
    time: string;
    players: string;
  };
}

export function Sidebar({ upcomingBooking }: SidebarProps) {
  const [countdown, setCountdown] = useState('02:14:33 remaining');
  const { openMap } = useMapContext();

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const target = new Date();
      target.setHours(19, 0, 0, 0);
      const diff = target.getTime() - now.getTime();

      if (diff > 0) {
        const hrs = Math.floor(diff / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setCountdown(
          `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')} restante`
        );
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <aside className="sticky top-16 h-[calc(100vh-64px)] bg-[var(--color-surface)] border-r-[1.5px] border-[var(--color-border)] p-6 flex flex-col gap-1 overflow-y-auto">
      {/* Menu Section */}
      <Typography variant="pixel-sm" color="muted" className="px-3 pt-2 pb-1 mt-2">
        MENÚ
      </Typography>

      <NavLink
        to="/"
        end
        className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-3 rounded-[var(--radius-lg)] cursor-pointer text-sm font-extrabold
          transition-all duration-[var(--duration-fast)] relative no-underline
          ${
            isActive
              ? 'bg-[var(--color-primary-tint)] text-[var(--color-primary-dark)] before:absolute before:left-0 before:top-[20%] before:bottom-[20%] before:w-[3px] before:rounded-r-[var(--radius-xs)] before:bg-[var(--color-primary)]'
              : 'text-[var(--color-text-2)] hover:bg-[var(--color-surf2)] hover:text-[var(--color-primary-dark)]'
          }`
        }
      >
        <Home className="w-[18px] h-[18px] flex-shrink-0" />
        Inicio
      </NavLink>

      <NavLink
        to="/fields"
        className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-3 rounded-[var(--radius-lg)] cursor-pointer text-sm font-extrabold
          transition-all duration-[var(--duration-fast)] relative no-underline
          ${
            isActive
              ? 'bg-[var(--color-primary-tint)] text-[var(--color-primary-dark)] before:absolute before:left-0 before:top-[20%] before:bottom-[20%] before:w-[3px] before:rounded-r-[var(--radius-xs)] before:bg-[var(--color-primary)]'
              : 'text-[var(--color-text-2)] hover:bg-[var(--color-surf2)] hover:text-[var(--color-primary-dark)]'
          }`
        }
      >
        <Search className="w-[18px] h-[18px] flex-shrink-0" />
        Buscar Canchas
      </NavLink>

      <NavLink
        to="/bookings"
        className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-3 rounded-[var(--radius-lg)] cursor-pointer text-sm font-extrabold
          transition-all duration-[var(--duration-fast)] relative no-underline
          ${
            isActive
              ? 'bg-[var(--color-primary-tint)] text-[var(--color-primary-dark)] before:absolute before:left-0 before:top-[20%] before:bottom-[20%] before:w-[3px] before:rounded-r-[var(--radius-xs)] before:bg-[var(--color-primary)]'
              : 'text-[var(--color-text-2)] hover:bg-[var(--color-surf2)] hover:text-[var(--color-primary-dark)]'
          }`
        }
      >
        <Calendar className="w-[18px] h-[18px] flex-shrink-0" />
        Mis Reservas
        <Badge variant="primary" className="ml-auto">
          3
        </Badge>
      </NavLink>

      <NavLink
        to="/favorites"
        className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-3 rounded-[var(--radius-lg)] cursor-pointer text-sm font-extrabold
          transition-all duration-[var(--duration-fast)] relative no-underline
          ${
            isActive
              ? 'bg-[var(--color-primary-tint)] text-[var(--color-primary-dark)] before:absolute before:left-0 before:top-[20%] before:bottom-[20%] before:w-[3px] before:rounded-r-[var(--radius-xs)] before:bg-[var(--color-primary)]'
              : 'text-[var(--color-text-2)] hover:bg-[var(--color-surf2)] hover:text-[var(--color-primary-dark)]'
          }`
        }
      >
        <Heart className="w-[18px] h-[18px] flex-shrink-0" />
        Favoritos
      </NavLink>

      <button
        className="flex items-center gap-3 px-3 py-3 rounded-[var(--radius-lg)] cursor-pointer text-sm font-extrabold text-[var(--color-text-2)] transition-all duration-[var(--duration-fast)] hover:bg-[var(--color-surf2)] hover:text-[var(--color-primary-dark)]"
        onClick={openMap}
      >
        <MapPin className="w-[18px] h-[18px] flex-shrink-0" />
        Mapa Cercano
      </button>

      {/* Divider */}
      <div className="h-[1.5px] bg-[var(--color-border)] rounded-sm my-2" />

      {/* Account Section */}
      <Typography variant="pixel-sm" color="muted" className="px-3 pt-2 pb-1">
        CUENTA
      </Typography>

      <NavLink
        to="/profile"
        className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-3 rounded-[var(--radius-lg)] cursor-pointer text-sm font-extrabold
          transition-all duration-[var(--duration-fast)] relative no-underline
          ${
            isActive
              ? 'bg-[var(--color-primary-tint)] text-[var(--color-primary-dark)] before:absolute before:left-0 before:top-[20%] before:bottom-[20%] before:w-[3px] before:rounded-r-[var(--radius-xs)] before:bg-[var(--color-primary)]'
              : 'text-[var(--color-text-2)] hover:bg-[var(--color-surf2)] hover:text-[var(--color-primary-dark)]'
          }`
        }
      >
        <User className="w-[18px] h-[18px] flex-shrink-0" />
        Perfil
      </NavLink>

      <NavLink
        to="/payments"
        className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-3 rounded-[var(--radius-lg)] cursor-pointer text-sm font-extrabold
          transition-all duration-[var(--duration-fast)] relative no-underline
          ${
            isActive
              ? 'bg-[var(--color-primary-tint)] text-[var(--color-primary-dark)] before:absolute before:left-0 before:top-[20%] before:bottom-[20%] before:w-[3px] before:rounded-r-[var(--radius-xs)] before:bg-[var(--color-primary)]'
              : 'text-[var(--color-text-2)] hover:bg-[var(--color-surf2)] hover:text-[var(--color-primary-dark)]'
          }`
        }
      >
        <Wallet className="w-[18px] h-[18px] flex-shrink-0" />
        Pagos
        <Badge variant="accent" className="ml-auto">
          !
        </Badge>
      </NavLink>

      <NavLink
        to="/settings"
        className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-3 rounded-[var(--radius-lg)] cursor-pointer text-sm font-extrabold
          transition-all duration-[var(--duration-fast)] relative no-underline
          ${
            isActive
              ? 'bg-[var(--color-primary-tint)] text-[var(--color-primary-dark)] before:absolute before:left-0 before:top-[20%] before:bottom-[20%] before:w-[3px] before:rounded-r-[var(--radius-xs)] before:bg-[var(--color-primary)]'
              : 'text-[var(--color-text-2)] hover:bg-[var(--color-surf2)] hover:text-[var(--color-primary-dark)]'
          }`
        }
      >
        <Settings className="w-[18px] h-[18px] flex-shrink-0" />
        Configuración
      </NavLink>

      <div className="h-[1.5px] bg-[var(--color-border)] rounded-sm my-2" />

      {/* Upcoming Booking Widget */}
      {upcomingBooking && (
        <div className="bg-[var(--color-text)] rounded-[var(--radius-xl)] p-4 mt-auto relative overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg, transparent, transparent 11px, rgba(98,191,59,.05) 12px), repeating-linear-gradient(90deg, transparent, transparent 11px, rgba(98,191,59,.05) 12px)',
            }}
          />
          <div className="relative z-10">
            <Typography variant="pixel-sm" color="primary" className="mb-2">
              <i className="fa-solid fa-bolt mr-1" />
              PRÓXIMA RESERVA
            </Typography>
            <Typography variant="h5" color="white" className="mb-2">
              {upcomingBooking.name}
            </Typography>
            <div className="flex gap-3 text-xs text-white/50 font-semibold flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {upcomingBooking.time}
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {upcomingBooking.players}
              </span>
            </div>
            <Typography variant="pixel" className="!text-[10px] !text-[var(--color-score)] mt-3">
              {countdown}
            </Typography>
          </div>
        </div>
      )}
    </aside>
  );
}
