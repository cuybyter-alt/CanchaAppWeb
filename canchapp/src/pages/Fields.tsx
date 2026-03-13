import React, { useEffect, useState } from 'react';
import { ArrowLeft, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FieldCard } from '../components/features/FieldCard';
import { Typography } from '../components/ui/typography';
import { mockFields } from '../mock/fields';
import type { Field } from '../types/field';
import demoReservationService from '../services/DemoReservationService';
import demoFavoritesService from '../services/DemoFavoritesService';
import complexesService from '../services/ComplexesService';

const Fields: React.FC = () => {
  const navigate = useNavigate();

  const initialCachedFields = complexesService.getCachedFieldsSync();
  const initialFields = demoFavoritesService.applyFavorites(
    initialCachedFields.map((field) => demoReservationService.applyLockedSlots(field)),
  );

  const [fields, setFields] = useState<Field[]>(initialFields);
  const [selectedFieldId, setSelectedFieldId] = useState<string>(initialFields[0]?.id ?? '');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadFields = async () => {
      setIsLoading(true);
      let receivedAnyBatch = false;

      try {
        const apiFields = await complexesService.getAllFieldsFromAllComplexes({
          onBatch: (batchFields) => {
            if (!mounted || batchFields.length === 0) return;
            receivedAnyBatch = true;

            const preparedBatch = demoFavoritesService.applyFavorites(
              batchFields.map((field) => demoReservationService.applyLockedSlots(field)),
            );

            setFields(preparedBatch);
            setSelectedFieldId((current) => {
              if (preparedBatch.some((field) => field.id === current)) return current;
              return preparedBatch[0]?.id ?? '';
            });
          },
        });
        if (!mounted || apiFields.length === 0) return;

        const preparedFields = demoFavoritesService.applyFavorites(
          apiFields.map((field) => demoReservationService.applyLockedSlots(field)),
        );

        setFields(preparedFields);
        setSelectedFieldId((current) => {
          if (preparedFields.some((field) => field.id === current)) return current;
          return preparedFields[0]?.id ?? '';
        });
      } catch (error) {
        console.error('No se pudieron cargar todas las canchas. Usando mock.', error);
        if (!receivedAnyBatch) {
          const fallbackFields = demoFavoritesService.applyFavorites(
            mockFields.map((field) => demoReservationService.applyLockedSlots(field)),
          );
          setFields(fallbackFields);
          setSelectedFieldId(fallbackFields[0]?.id ?? '');
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    loadFields();

    return () => {
      mounted = false;
    };
  }, []);

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
          <Star className="inline w-5 h-5 text-[var(--color-primary)] mr-2" />
          Todas las Canchas
        </Typography>
      </div>

      {isLoading && (
        <p className="text-xs font-bold text-[var(--color-text-3)]">
          Cargando canchas desde complejos...
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {fields.map((field) => (
          <FieldCard
            key={field.id}
            field={field}
            isSelected={selectedFieldId === field.id}
            onSelect={(next) => setSelectedFieldId(next.id)}
            onToggleFavorite={handleToggleFavorite}
          />
        ))}
      </div>
    </div>
  );
};

export default Fields;
