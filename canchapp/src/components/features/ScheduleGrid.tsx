import React, { useEffect, useMemo, useCallback, useState } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  GripVertical,
  Columns,
  Maximize2,
} from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { useScheduleGrid } from '../../hooks/useScheduleGrid';
import { MoveConfirmationModal } from './MoveConfirmationModal';
import type { GridSlot, GridField } from '../../types/grid';

interface ScheduleGridProps {
  complexId: string;
}

const SLOT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  available: { bg: 'bg-white', text: 'text-gray-500', border: 'border-gray-200' },
  booked_pending: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-300' },
  booked_part_paid: { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-300' },
  booked_confirmed: { bg: 'bg-green-50', text: 'text-green-800', border: 'border-green-300' },
  blocked: { bg: 'bg-gray-200', text: 'text-gray-600', border: 'border-gray-400' },
};

function getSlotColor(slot: GridSlot): string {
  if (slot.status === 'blocked') return 'blocked';
  if (slot.status === 'booked') return `booked_${slot.booking_status ?? 'pending'}`;
  return 'available';
}

function getSlotDate(slot: GridSlot): string {
  if (slot.slot_date) return slot.slot_date;
  return slot.start_datetime.slice(0, 10);
}

function groupSlotsByDate(fields: GridField[]): Map<string, GridSlot[]> {
  const map = new Map<string, GridSlot[]>();
  for (const field of fields) {
    for (const slot of field.slots) {
      const d = getSlotDate(slot);
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(slot);
    }
  }
  return map;
}

export const ScheduleGrid: React.FC<ScheduleGridProps> = ({ complexId }) => {
  const {
    gridData,
    weekData,
    isLoading,
    error,
    viewMode,
    date,
    weekStart,
    weekEnd,
    draggedBooking,
    showConfirmModal,
    isMoving,
    setDate,
    setViewMode,
    loadGrid,
    goToDay,
    goToNextWeek,
    goToPrevWeek,
    goToToday,
    startDrag,
    handleDrop,
    confirmMove,
    closeConfirmModal,
    formatTime,
  } = useScheduleGrid();

  const [overSlotId, setOverSlotId] = useState<string | null>(null);
  const [pendingTargetSlot, setPendingTargetSlot] = useState<GridSlot | null>(null);
  const [pendingTargetField, setPendingTargetField] = useState<GridField | null>(null);
  const [pendingSourceField, setPendingSourceField] = useState<GridField | null>(null);

  useEffect(() => {
    void loadGrid(complexId);
  }, [complexId, loadGrid]);

  const activeData = viewMode === 'week' ? weekData : gridData;

  const handleDragStart = useCallback(
    (e: React.DragEvent, slot: GridSlot, field: GridField) => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', slot.time_slot_id);
      setPendingSourceField(field);
      startDrag(slot);
    },
    [startDrag],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, slot: GridSlot) => {
      if (slot.status !== 'available') return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setOverSlotId(slot.time_slot_id);
    },
    [],
  );

  const handleDragLeave = useCallback(() => {
    setOverSlotId(null);
  }, []);

  const handleDropEvent = useCallback(
    (e: React.DragEvent, slot: GridSlot) => {
      e.preventDefault();
      setOverSlotId(null);
      if (slot.status !== 'available') return;

      const field = activeData?.fields.find((f) => f.field_id === slot.field_id) ?? null;
      setPendingTargetSlot(slot);
      setPendingTargetField(field);
      handleDrop(slot);
    },
    [handleDrop, activeData],
  );

  const handleDragEnd = useCallback(() => {
    setOverSlotId(null);
  }, []);

  const weekDays = useMemo(() => {
    const days: string[] = [];
    let current = new Date(weekStart + 'T12:00:00');
    const end = new Date(weekEnd + 'T12:00:00');
    while (current <= end) {
      days.push(format(current, 'yyyy-MM-dd'));
      current = addDays(current, 1);
    }
    return days;
  }, [weekStart, weekEnd]);

  const weekLabel = useMemo(() => {
    const start = new Date(weekStart + 'T12:00:00');
    const end = new Date(weekEnd + 'T12:00:00');
    return `${format(start, "d MMM", { locale: es })} — ${format(end, "d MMM yyyy", { locale: es })}`;
  }, [weekStart, weekEnd]);

  const dayLabel = useMemo(() => {
    const d = new Date(date + 'T12:00:00');
    return format(d, "EEEE d 'de' MMMM", { locale: es });
  }, [date]);

  const slotsByDate = useMemo(() => {
    if (!weekData) return new Map();
    return groupSlotsByDate(weekData.fields);
  }, [weekData]);

  const renderSlot = (slot: GridSlot, field: GridField, compact?: boolean) => {
    const colorKey = getSlotColor(slot);
    const colors = SLOT_COLORS[colorKey] ?? SLOT_COLORS.available;
    const canDrag = slot.status === 'booked';
    const isDragged = draggedBooking?.time_slot_id === slot.time_slot_id;
    const isOver = overSlotId === slot.time_slot_id && slot.status === 'available';

    if (slot.status === 'available') {
      return (
        <div
          key={slot.time_slot_id}
          onDragOver={(e) => handleDragOver(e, slot)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDropEvent(e, slot)}
          className={`
            relative rounded-[var(--radius-md)] border ${colors.border} ${colors.bg}
            transition-all duration-150
            ${compact ? 'p-1.5 min-h-[44px]' : 'p-2 min-h-[60px]'}
            cursor-pointer select-none
            ${isOver ? 'ring-2 ring-[var(--color-primary)] border-[var(--color-primary)] bg-[var(--color-primary-tint)]' : ''}
          `}
        >
          <p className={`${compact ? 'text-[10px]' : 'text-xs'} font-extrabold ${colors.text}`}>
            {formatTime(slot.start_datetime)}
          </p>
          {!compact && (
            <p className={`text-[10px] font-bold ${isOver ? 'text-[var(--color-primary)]' : 'text-gray-400'} mt-1`}>
              ${slot.price.toLocaleString('es-CO')}
            </p>
          )}
        </div>
      );
    }

    return (
      <div
        key={slot.time_slot_id}
        draggable={canDrag}
        onDragStart={canDrag ? (e) => handleDragStart(e, slot, field) : undefined}
        onDragEnd={canDrag ? handleDragEnd : undefined}
        className={`
          relative rounded-[var(--radius-md)] border ${colors.border} ${colors.bg}
          transition-all duration-150 select-none
          ${compact ? 'p-1.5 min-h-[44px]' : 'p-2 min-h-[60px]'}
          ${canDrag ? 'cursor-grab active:cursor-grabbing hover:shadow-md hover:-translate-y-0.5' : 'cursor-default'}
          ${isDragged ? 'opacity-50 scale-95' : ''}
        `}
      >
        {canDrag && (
          <div className={`absolute ${compact ? 'top-0.5 right-0.5' : 'top-1 right-1'}`}>
            <GripVertical className={`${compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} text-gray-400`} />
          </div>
        )}
        <p className={`${compact ? 'text-[10px]' : 'text-xs'} font-extrabold ${colors.text}`}>
          {formatTime(slot.start_datetime)}
        </p>
        {slot.status === 'booked' && slot.user_name && (
          <p className={`${compact ? 'text-[8px]' : 'text-[10px]'} font-bold ${colors.text} truncate mt-0.5`}>
            {slot.user_name}
          </p>
        )}
        {!compact && (
          <p className="text-[10px] font-bold text-gray-400 mt-0.5">
            ${slot.price.toLocaleString('es-CO')}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={viewMode === 'week' ? goToPrevWeek : () => setDate(format(subDays(new Date(date + 'T12:00:00'), 1), 'yyyy-MM-dd'))}
            className="w-8 h-8 rounded-full border border-[var(--color-border)] bg-white flex items-center justify-center hover:bg-[var(--color-surf2)] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={goToToday}
            className="px-3 py-1.5 rounded-full border border-[var(--color-border)] bg-white text-xs font-extrabold text-[var(--color-text-2)] hover:bg-[var(--color-surf2)] transition-colors"
          >
            Hoy
          </button>
          <button
            onClick={viewMode === 'week' ? goToNextWeek : () => setDate(format(addDays(new Date(date + 'T12:00:00'), 1), 'yyyy-MM-dd'))}
            className="w-8 h-8 rounded-full border border-[var(--color-border)] bg-white flex items-center justify-center hover:bg-[var(--color-surf2)] transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="text-sm font-extrabold text-[var(--color-text)] capitalize ml-2">
            {viewMode === 'week' ? weekLabel : dayLabel}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex gap-1 p-1 bg-[var(--color-surf2)] rounded-[var(--radius-lg)] border border-[var(--color-border)]">
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                viewMode === 'week'
                  ? 'bg-[var(--color-surface)] text-[var(--color-primary-dark)] shadow-[var(--shadow-sm)]'
                  : 'text-[var(--color-text-3)] hover:text-[var(--color-text-2)]'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              Semana
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                viewMode === 'day'
                  ? 'bg-[var(--color-surface)] text-[var(--color-primary-dark)] shadow-[var(--shadow-sm)]'
                  : 'text-[var(--color-text-3)] hover:text-[var(--color-text-2)]'
              }`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
              Día
            </button>
          </div>
          <Calendar className="w-4 h-4 text-[var(--color-primary)]" />
          <input
            type="date"
            value={viewMode === 'week' ? weekStart : date}
            onChange={(e) => { if (viewMode === 'day') setDate(e.target.value); }}
            className="h-8 px-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white text-sm font-bold text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
          />
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
          <p className="text-sm font-extrabold text-[var(--color-text-3)]">Cargando grilla...</p>
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <div className="flex items-start gap-3 p-4 rounded-[var(--radius-xl)] bg-red-50 border border-red-200">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-extrabold text-red-900">Error</p>
            <p className="text-xs text-red-700 mt-0.5">{error}</p>
          </div>
          <button onClick={() => loadGrid(complexId)} className="text-xs font-extrabold text-red-600 underline underline-offset-2">
            Reintentar
          </button>
        </div>
      )}

      {/* Legend */}
      {!isLoading && !error && (
        <div className="flex items-center gap-4 text-xs font-bold text-[var(--color-text-3)] flex-wrap">
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-white border border-gray-200" /> Disponible</div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-50 border border-amber-300" /> Pendiente</div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-50 border border-blue-300" /> Abono</div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-50 border border-green-300" /> Confirmada</div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-gray-200 border border-gray-400" /> Bloqueado</div>
        </div>
      )}

      {/* Week View */}
      {!isLoading && !error && viewMode === 'week' && weekData && (
        <div className="overflow-x-auto">
          <div className="grid grid-cols-7 gap-2 min-w-[700px]">
            {weekDays.map((dayISO) => {
              const dayDate = new Date(dayISO + 'T12:00:00');
              const daySlots = slotsByDate.get(dayISO) ?? [];
              const isToday = dayISO === new Date().toISOString().slice(0, 10);

              return (
                <div key={dayISO} className="min-w-[100px]">
                  <button
                    onClick={() => goToDay(dayISO)}
                    className={`w-full rounded-t-[var(--radius-lg)] px-2 py-2 text-center transition-colors ${
                      isToday
                        ? 'bg-[var(--color-primary)] text-white'
                        : 'bg-[var(--color-text)] text-white hover:bg-[var(--color-primary-dark)]'
                    }`}
                  >
                    <p className="text-[10px] font-extrabold uppercase">
                      {format(dayDate, 'EEE', { locale: es })}
                    </p>
                    <p className="text-lg font-extrabold">{format(dayDate, 'd')}</p>
                  </button>
                  <div className="bg-[var(--color-surface)] border border-t-0 border-[var(--color-border)] rounded-b-[var(--radius-lg)] p-1.5 space-y-1 max-h-[500px] overflow-y-auto">
                    {daySlots.length === 0 && (
                      <p className="text-[9px] text-[var(--color-text-3)] text-center py-2">Sin slots</p>
                    )}
                    {daySlots.map((slot: GridSlot) => {
                      const field = weekData.fields.find((f) => f.field_id === slot.field_id);
                      if (!field) return null;
                      return renderSlot(slot, field, true);
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Day View */}
      {!isLoading && !error && viewMode === 'day' && gridData && (
        <div className="overflow-x-auto">
          <div className="inline-flex gap-2 min-w-full">
            {gridData.fields.map((field) => (
              <div key={field.field_id} className="flex-1 min-w-[140px]">
                <div className="bg-[var(--color-text)] rounded-t-[var(--radius-lg)] px-3 py-2">
                  <p className="text-white font-extrabold text-sm truncate">{field.field_name}</p>
                  <p className="text-[var(--color-text-3)] text-[10px] font-bold">
                    {field.field_type} · {field.slot_duration_minutes}min
                  </p>
                </div>
                <div className="bg-[var(--color-surface)] border border-t-0 border-[var(--color-border)] rounded-b-[var(--radius-lg)] p-2 space-y-1.5">
                  {field.slots.map((slot) => renderSlot(slot, field))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && activeData && activeData.fields.length === 0 && (
        <div className="bg-[var(--color-surface)] border-[1.5px] border-dashed border-[var(--color-border)] rounded-[var(--radius-2xl)] p-10 text-center">
          <Calendar className="w-10 h-10 text-[var(--color-muted)] mx-auto mb-3" />
          <p className="font-extrabold text-[var(--color-text)] text-lg">Sin horarios configurados</p>
          <p className="text-sm text-[var(--color-text-3)] mt-1">Configura los horarios de las canchas para ver la grilla.</p>
        </div>
      )}

      {/* Confirm Modal */}
      {showConfirmModal && draggedBooking && pendingSourceField && pendingTargetSlot && pendingTargetField && (
        <MoveConfirmationModal
          draggedBooking={draggedBooking}
          targetSlot={pendingTargetSlot}
          targetField={pendingTargetField}
          sourceField={pendingSourceField}
          isMoving={isMoving}
          onConfirm={confirmMove}
          onCancel={closeConfirmModal}
          formatTime={formatTime}
        />
      )}
    </div>
  );
};