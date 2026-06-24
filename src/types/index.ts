import { Request } from 'express';

export type UserRole = 'rider' | 'driver' | 'admin';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  kyc_status: 'pending' | 'verified' | 'rejected' | null;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface Vehicle {
  id: string;
  user_id: string;
  make: string;
  model: string;
  year: number;
  color: string | null;
  plate: string | null;
  capacity: number;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface LocalUser {
  id: string;
  email?: string;
  phone?: string;
  role?: string;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  profile_picture?: string | null;
  avatar_url?: string | null;
}

export interface AuthUser {
  id: string;
  email?: string;
  phone?: string;
  role?: string;
}

export interface AuthenticatedRequest extends Request {
  userId?: string;
  user?: LocalUser;
}

export interface KycStatus {
  status: 'pending' | 'verified' | 'rejected';
  verifiedAt?: string;
}
