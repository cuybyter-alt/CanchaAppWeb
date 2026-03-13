import { MapCard } from '../sections/MapCard';
import { Dialog } from '../ui/dialog';

interface MapDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MapDialog({ isOpen, onClose }: MapDialogProps) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="🗺️ Mapa de Canchas Cercanas" size="full">
      <div className="w-full h-[75vh] p-0 relative">
        <div className="absolute inset-0 m-4">
          <MapCard showMiniMap={false} />
        </div>
      </div>

      {/* Info panel */}
      <div className="px-6 py-4 bg-[var(--color-surf2)] border-t border-[var(--color-border)]">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[var(--color-primary)]"></div>
              <span className="text-[var(--color-text-2)]">Disponible</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[var(--color-accent)]"></div>
              <span className="text-[var(--color-text-2)]">Ocupada</span>
            </div>
          </div>

          <div className="text-sm text-[var(--color-text-2)]">
            💡 <strong>Tip:</strong> Haz clic en los marcadores para ver más detalles
          </div>
        </div>
      </div>
    </Dialog>
  );
}
