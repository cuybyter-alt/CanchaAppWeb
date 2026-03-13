import ApiClient from './ApiClient';

interface ApiResponse<T> {
  data: T;
  success?: boolean;
  message: string;
  meta?: Record<string, string | number | boolean>;
}

export interface BookingOutput {
  booking_id: string;
  time_slot_id: string;
  status?: string;
  is_approved?: boolean;
  total_price?: number;
}

const bookingService = {
  createBooking: async (timeSlotId: string): Promise<BookingOutput> => {
    const res = await ApiClient.post<ApiResponse<BookingOutput>>('/bookings/', {
      time_slot_id: timeSlotId,
    }, {
      withAuth: true,
    });

    return res.data;
  },
};

export default bookingService;
