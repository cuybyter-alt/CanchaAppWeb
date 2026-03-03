import { Zap } from 'lucide-react';
import { Button } from '../ui/button';
import { Typography } from '../ui/typography';

export function PromoBanner() {
  return (
    <div className="bg-[var(--color-text)] rounded-[var(--radius-2xl)] p-6 md:p-8 flex items-center gap-8 overflow-hidden relative shadow-[var(--shadow-xl)]">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 11px, rgba(98,191,59,.04) 12px), repeating-linear-gradient(90deg, transparent, transparent 11px, rgba(98,191,59,.04) 12px)',
        }}
      />

      <div className="relative z-10 flex-1">
        <Typography variant="pixel" className="!text-[var(--color-score)] mb-2">
          <i className="fa-solid fa-star mr-1" />
          ESPECIAL FIN DE SEMANA
        </Typography>
        <Typography
          variant="h1"
          color="white"
          className="!text-[28px] md:!text-[36px] mb-3"
        >
          RESERVA TU
          <br />
          <span className="text-[var(--color-primary)]">CANCHA</span>
          <br />
          HOY
        </Typography>
        <Typography variant="small" className="!text-white/55 max-w-[340px]">
          Reserva tu cancha en segundos. Más de 50 canchas disponibles en tu ciudad ahora mismo.
        </Typography>
        <Button size="md" className="mt-4">
          <Zap className="w-4 h-4" />
          Explorar Ahora
        </Button>
      </div>

      <div className="relative z-10 flex-shrink-0 hidden md:block">
        <img 
          src="/cuypequeniologo.png" 
          alt="CanchApp Mascot" 
          width={160} 
          height={180} 
          className="animate-mascot-idle drop-shadow-[0_8px_20px_rgba(98,191,59,.3)]" 
        />
      </div>
    </div>
  );
}
