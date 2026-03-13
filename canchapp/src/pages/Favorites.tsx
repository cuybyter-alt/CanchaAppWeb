import React, { useMemo, useState } from 'react';
import { ArrowLeft, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FieldCard } from '../components/features/FieldCard';
import { Typography } from '../components/ui/typography';
import { mockFields } from '../mock/fields';
import type { Field } from '../types/field';
import demoReservationService from '../services/DemoReservationService';
import demoFavoritesService from '../services/DemoFavoritesService';

const Favorites: React.FC = () => {
  const navigate = useNavigate();

  const initialFields = useMemo<Field[]>(() => {
    const withLockedSlots = mockFields.map((f) => demoReservationService.applyLockedSlots(f));
    return demoFavoritesService.applyFavorites(withLockedSlots);
  }, []);

  const [fields, setFields] = useState<Field[]>(initialFields);
  const [selectedFieldId, setSelectedFieldId] = useState<string>(initialFields[0]?.id ?? '');

  const favoriteFields = fields.filter((f) => f.isFavorite);

  const handleToggleFavorite = (fieldId: string) => {
    const favoriteIds = new Set(demoFavoritesService.toggleFavorite(fieldId));
    setFields((prev) =>
      prev.map((field) => ({
        ...field,
        isFavorite: favoriteIds.has(field.id),
      })),
    );
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surf2)] transition-all duration-[var(--duration-fast)]"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>

        <Typography variant="h3" color="text" className="text-right">
          <Heart className="inline w-5 h-5 text-red-500 mr-2" />
          Mis Favoritos
        </Typography>
      </div>

      {favoriteFields.length === 0 ? (
        <div className="bg-[var(--color-surface)] border-[1.5px] border-[var(--color-border)] rounded-[var(--radius-2xl)] p-8 text-center">
          <Typography variant="h4" color="text" className="mb-2">
            Aún no tienes complejos favoritos
          </Typography>
          <Typography variant="small" color="text-3">
            Marca con el corazón los complejos que quieras guardar.
          </Typography>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {favoriteFields.map((field) => (
            <FieldCard
              key={field.id}
              field={field}
              isSelected={selectedFieldId === field.id}
              onSelect={(next) => setSelectedFieldId(next.id)}
              onToggleFavorite={handleToggleFavorite}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Favorites;
