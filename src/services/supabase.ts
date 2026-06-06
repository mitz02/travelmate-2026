import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config';

export const supabase: SupabaseClient = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey
);

export interface UserProfile {
  id: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  role: 'rider' | 'driver' | 'admin';
  kycStatus: 'unverified' | 'pending' | 'verified';
  profilePicture?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  totalEarnings: number;
  totalWithdrawn: number;
  heldAmount: number;
  lastUpdated: string;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'earning' | 'withdrawal' | 'refund' | 'fee' | 'held' | 'released';
  amount: number;
  status: 'completed' | 'pending' | 'failed';
  description: string;
  relatedId?: string;
  createdAt: string;
}

export interface Ride {
  id: string;
  driverId: string;
  from: string;
  to: string;
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
  departureTime: string;
  status: 'open' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  pricePerSeat: number;
  availableSeats: number;
  totalSeats: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  id: string;
  rideId: string;
  riderId: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  seatsBooked: number;
  totalPrice: number;
  escrowId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Escrow {
  id: string;
  bookingId: string;
  amount: number;
  status: 'held' | 'released' | 'refunded';
  holdReason: string;
  createdAt: string;
  releasedAt?: string;
}
