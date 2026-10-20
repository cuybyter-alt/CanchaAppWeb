export type SlotStatus = 'available' | 'booked' | 'blocked';
export type BookingStatus = 'pending' | 'part_paid' | 'confirmed';
export type BalanceType = 'pending_payment' | 'credit' | 'no_change';

export interface GridSlot {
  time_slot_id: string;
  field_id: string;
  start_datetime: string;
  end_datetime: string;
  price: number;
  status: SlotStatus;
  booking_id: string | null;
  user_id: string | null;
  user_name: string | null;
  booking_status: BookingStatus | null;
  slot_date: string | null;
}

export interface GridField {
  field_id: string;
  field_name: string;
  field_type: string;
  slot_duration_minutes: number;
  slots: GridSlot[];
}

export interface GridData {
  complex_id: string;
  complex_name: string;
  start_date: string;
  end_date: string;
  fields: GridField[];
}

export interface DraggedBooking {
  booking_id: string;
  field_id: string;
  time_slot_id: string;
  user_name: string;
  price: number;
  start_datetime: string;
  end_datetime: string;
}

export interface MoveResult {
  booking_id: string;
  old_time_slot_id: string;
  new_time_slot_id: string;
  old_field_name: string;
  new_field_name: string;
  old_price: number;
  new_price: number;
  price_difference: number;
  balance_type: BalanceType;
  old_start_datetime: string;
  new_start_datetime: string;
  old_end_datetime: string;
  new_end_datetime: string;
}