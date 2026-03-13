import type { Booking, Field } from '../types/field';
import { mockBookings } from '../mock/fields';

const BOOKINGS_KEY = 'canchapp-demo-bookings';
const LOCKED_SLOTS_KEY = 'canchapp-demo-locked-slots';

type LockedSlotsMap = Record<string, string[]>;

const isBrowser = () => typeof window !== 'undefined' && typeof localStorage !== 'undefined';

function readJson<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  if (!isBrowser()) return;
  localStorage.setItem(key, JSON.stringify(value));
}

export const demoReservationService = {
  getBookings(): Booking[] {
    const existing = readJson<Booking[] | null>(BOOKINGS_KEY, null);
    if (existing && existing.length > 0) return existing;

    writeJson(BOOKINGS_KEY, mockBookings);
    return mockBookings;
  },

  addBooking(booking: Booking): Booking[] {
    const current = this.getBookings();
    const updated = [booking, ...current];
    writeJson(BOOKINGS_KEY, updated);
    return updated;
  },

  getLockedSlotsMap(): LockedSlotsMap {
    return readJson<LockedSlotsMap>(LOCKED_SLOTS_KEY, {});
  },

  lockSlot(fieldId: string, slotId: string): LockedSlotsMap {
    const current = this.getLockedSlotsMap();
    const list = new Set(current[fieldId] ?? []);
    list.add(slotId);

    const updated: LockedSlotsMap = {
      ...current,
      [fieldId]: [...list],
    };

    writeJson(LOCKED_SLOTS_KEY, updated);
    return updated;
  },

  applyLockedSlots(field: Field): Field {
    const map = this.getLockedSlotsMap();
    const locked = new Set(map[field.id] ?? []);

    if (locked.size === 0) return field;

    return {
      ...field,
      availability: field.availability.map((slot) =>
        locked.has(slot.id)
          ? { ...slot, status: 'taken', spotsLeft: undefined }
          : slot,
      ),
    };
  },
};

export default demoReservationService;
