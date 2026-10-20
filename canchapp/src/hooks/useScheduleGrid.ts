import { useState, useCallback, useRef } from 'react';
import { format, addDays, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import schedulingService from '../services/SchedulingService';
import { notify } from '../services/toast';
import type { GridData, GridSlot, DraggedBooking, MoveResult } from '../types/grid';
import type { ApiError } from '../services/ApiClient';

const TIMEZONE = 'America/Bogota';

function localTodayISO(): string {
  const now = toZonedTime(new Date(), TIMEZONE);
  return format(now, 'yyyy-MM-dd');
}

function utcToLocal(utcISO: string): Date {
  return toZonedTime(new Date(utcISO), TIMEZONE);
}

function formatTimeLocal(utcISO: string): string {
  const local = utcToLocal(utcISO);
  return format(local, 'h:mm a');
}

function formatDateLocal(utcISO: string): string {
  const local = utcToLocal(utcISO);
  return format(local, 'd MMM yyyy');
}

function getWeekRange(dateISO: string): { start: string; end: string } {
  const d = new Date(dateISO + 'T12:00:00');
  const weekStart = startOfWeek(d, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(d, { weekStartsOn: 1 });
  return {
    start: format(weekStart, 'yyyy-MM-dd'),
    end: format(weekEnd, 'yyyy-MM-dd'),
  };
}

export type ViewMode = 'week' | 'day';

interface UseScheduleGridReturn {
  gridData: GridData | null;
  weekData: GridData | null;
  isLoading: boolean;
  error: string | null;
  viewMode: ViewMode;
  date: string;
  weekStart: string;
  weekEnd: string;
  draggedBooking: DraggedBooking | null;
  showConfirmModal: boolean;
  moveResult: MoveResult | null;
  isMoving: boolean;
  setDate: (date: string) => void;
  setViewMode: (mode: ViewMode) => void;
  loadGrid: (complexId: string) => Promise<void>;
  goToDay: (dateISO: string) => void;
  goToNextWeek: () => void;
  goToPrevWeek: () => void;
  goToToday: () => void;
  startDrag: (slot: GridSlot) => void;
  cancelDrag: () => void;
  handleDrop: (targetSlot: GridSlot) => void;
  confirmMove: () => Promise<void>;
  closeConfirmModal: () => void;
  formatTime: typeof formatTimeLocal;
  formatDate: typeof formatDateLocal;
}

export function useScheduleGrid(): UseScheduleGridReturn {
  const [gridData, setGridData] = useState<GridData | null>(null);
  const [weekData, setWeekData] = useState<GridData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [date, setDate] = useState(localTodayISO);
  const [weekStart, setWeekStart] = useState(() => getWeekRange(localTodayISO()).start);
  const [weekEnd, setWeekEnd] = useState(() => getWeekRange(localTodayISO()).end);
  const [draggedBooking, setDraggedBooking] = useState<DraggedBooking | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [moveResult, setMoveResult] = useState<MoveResult | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const [targetSlotId, setTargetSlotId] = useState<string | null>(null);

  // Refs to read current state inside stable callbacks
  const viewModeRef = useRef(viewMode);
  const dateRef = useRef(date);
  const weekStartRef = useRef(weekStart);
  const weekEndRef = useRef(weekEnd);
  const draggedBookingRef = useRef<DraggedBooking | null>(null);

  // Keep refs in sync
  viewModeRef.current = viewMode;
  dateRef.current = date;
  weekStartRef.current = weekStart;
  weekEndRef.current = weekEnd;

  const loadGrid = useCallback(async (complexId: string) => {
    setCurrentComplexId(complexId);
    setIsLoading(true);
    setError(null);
    try {
      if (viewModeRef.current === 'week') {
        const data = await schedulingService.getGrid(complexId, {
          startDate: weekStartRef.current,
          endDate: weekEndRef.current,
        });
        setWeekData(data);
      } else {
        const data = await schedulingService.getGrid(complexId, { date: dateRef.current });
        setGridData(data);
      }
    } catch (err) {
      const apiError = err as ApiError;
      const message = apiError?.message ?? 'Error al cargar la grilla';
      setError(message);
      notify.error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const goToDay = useCallback((dateISO: string) => {
    setDate(dateISO);
    setViewMode('day');
  }, []);

  const goToNextWeek = useCallback(() => {
    setWeekStart((prev) => format(addDays(new Date(prev + 'T12:00:00'), 7), 'yyyy-MM-dd'));
    setWeekEnd((prev) => format(addDays(new Date(prev + 'T12:00:00'), 7), 'yyyy-MM-dd'));
  }, []);

  const goToPrevWeek = useCallback(() => {
    setWeekStart((prev) => format(subDays(new Date(prev + 'T12:00:00'), 7), 'yyyy-MM-dd'));
    setWeekEnd((prev) => format(subDays(new Date(prev + 'T12:00:00'), 7), 'yyyy-MM-dd'));
  }, []);

  const goToToday = useCallback(() => {
    const today = localTodayISO();
    const range = getWeekRange(today);
    setDate(today);
    setWeekStart(range.start);
    setWeekEnd(range.end);
  }, []);

  const startDrag = useCallback((slot: GridSlot) => {
    if (!slot.booking_id || slot.status !== 'booked') {
      notify.warning('Solo se pueden mover reservas activas');
      return;
    }
    const booking: DraggedBooking = {
      booking_id: slot.booking_id,
      field_id: slot.field_id,
      time_slot_id: slot.time_slot_id,
      user_name: slot.user_name ?? 'Sin nombre',
      price: slot.price,
      start_datetime: slot.start_datetime,
      end_datetime: slot.end_datetime,
    };
    setDraggedBooking(booking);
    draggedBookingRef.current = booking;
    notify.info('Arrastra la reserva a un slot disponible');
  }, []);

  const cancelDrag = useCallback(() => {
    setDraggedBooking(null);
    draggedBookingRef.current = null;
  }, []);

  const handleDrop = useCallback((targetSlot: GridSlot) => {
    const currentDragged = draggedBookingRef.current;
    
    if (!currentDragged) {
      notify.error('No hay reserva seleccionada para mover');
      return;
    }
    
    if (targetSlot.status !== 'available') {
      notify.warning('El slot destino debe estar disponible');
      setDraggedBooking(null);
      draggedBookingRef.current = null;
      return;
    }
    
    if (targetSlot.time_slot_id === currentDragged.time_slot_id) {
      setDraggedBooking(null);
      draggedBookingRef.current = null;
      return;
    }
    
    setTargetSlotId(targetSlot.time_slot_id);
    setShowConfirmModal(true);
  }, []);

  const currentComplexIdRef = useRef<string | null>(null);
  // Keep ref in sync
  currentComplexIdRef.current = currentComplexId;

  const confirmMove = useCallback(async () => {
    const currentDragged = draggedBookingRef.current;
    const complexId = currentComplexIdRef.current;
    if (!currentDragged || !targetSlotId || !complexId) {
      notify.error('Error: faltan datos para confirmar el movimiento');
      return;
    }
    
    setIsMoving(true);
    try {
      const result = await schedulingService.moveBooking(
        currentDragged.booking_id,
        targetSlotId,
      );
      setMoveResult(result);
      setShowConfirmModal(false);
      setDraggedBooking(null);
      draggedBookingRef.current = null;
      setTargetSlotId(null);
      notify.success('Reserva movida exitosamente');
      await loadGrid(complexId);
    } catch (err) {
      const apiError = err as ApiError;
      if (apiError?.status === 409) {
        notify.error('El slot destino ya no está disponible');
      } else if (apiError?.status === 403) {
        notify.error('No tienes permisos para realizar esta acción');
      } else {
        notify.error(apiError?.message ?? 'Error al mover la reserva');
      }
    } finally {
      setIsMoving(false);
    }
  }, [targetSlotId, loadGrid]);

  const closeConfirmModal = useCallback(() => {
    setShowConfirmModal(false);
    setTargetSlotId(null);
  }, []);

  return {
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
    moveResult,
    isMoving,
    setDate,
    setViewMode,
    loadGrid,
    goToDay,
    goToNextWeek,
    goToPrevWeek,
    goToToday,
    startDrag,
    cancelDrag,
    handleDrop,
    confirmMove,
    closeConfirmModal,
    formatTime: formatTimeLocal,
    formatDate: formatDateLocal,
  };
}