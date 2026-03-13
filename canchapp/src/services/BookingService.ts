import ApiClient from './ApiClient';
import authService from './AuthService';
import type { ApiError } from './ApiClient';

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
    try {
      const res = await ApiClient.post<ApiResponse<BookingOutput>>('/bookings/', {
        time_slot_id: timeSlotId,
      }, {
        withAuth: true,
      });

      return res.data;
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError?.status === 401) {
        await authService.refreshToken();
        const retry = await ApiClient.post<ApiResponse<BookingOutput>>('/bookings/', {
          time_slot_id: timeSlotId,
        }, {
          withAuth: true,
        });
        return retry.data;
      }

      throw error;
    }
  },
};

export default bookingService;
