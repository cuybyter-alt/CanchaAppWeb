export type Sport = 'futbol5' | 'futbol7' | 'microfutbol' | 'futbol11';

export type FieldType = 'indoor' | 'outdoor' | 'turf' | 'premium';

export interface Amenity {
  icon: string;
  label: string;
}

export interface TimeSlotData {
  id: string;
  time: string;
  period: 'AM' | 'PM';
  price: number;
  status: 'available' | 'taken' | 'almost-full';
  spotsLeft?: number;
}

export interface Field {
  id: string;
  name: string;
  sport: Sport;
  sportLabel: string;
  location: string;
  distance: string;
  price: number;
  priceLabel: string;
  rating: number;
  reviewCount: number;
  image: string;
  tags: FieldType[];
  amenities: Amenity[];
  availability: TimeSlotData[];
  isFavorite: boolean;
  capacity: number;
  description?: string;
}

export interface Booking {
  id: string;
  fieldId: string;
  fieldName: string;
  sport: Sport;
  sportLabel: string;
  date: string;
  time: string;
  duration: string;
  players: number;
  status: 'confirmed' | 'pending' | 'cancelled';
  price: number;
}
