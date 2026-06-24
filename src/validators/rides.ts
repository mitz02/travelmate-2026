import { z } from 'zod';

export const createRideSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  fromLat: z.number().optional(),
  fromLng: z.number().optional(),
  toLat: z.number().optional(),
  toLng: z.number().optional(),
  departureTime: z.string().min(1),
  pricePerSeat: z.number().min(0),
  availableSeats: z.number().int().min(1),
  totalSeats: z.number().int().min(1),
  description: z.string().optional(),
  vehicleMake: z.string().optional(),
  vehicleModel: z.string().optional(),
  vehicleColor: z.string().optional(),
  ac: z.boolean().optional(),
  music: z.boolean().optional(),
  pets: z.boolean().optional(),
  smoking: z.boolean().optional(),
  pickupPoints: z.string().optional(),
  dropoffPoints: z.string().optional(),
});

export const updateRideSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  fromLat: z.number().optional(),
  fromLng: z.number().optional(),
  toLat: z.number().optional(),
  toLng: z.number().optional(),
  departureTime: z.string().optional(),
  pricePerSeat: z.number().min(0).optional(),
  availableSeats: z.number().int().min(1).optional(),
  totalSeats: z.number().int().min(1).optional(),
  description: z.string().optional(),
  vehicleMake: z.string().optional(),
  vehicleModel: z.string().optional(),
  vehicleColor: z.string().optional(),
  ac: z.boolean().optional(),
  music: z.boolean().optional(),
  pets: z.boolean().optional(),
  smoking: z.boolean().optional(),
  pickupPoints: z.string().optional(),
  dropoffPoints: z.string().optional(),
});

export const cancelRideSchema = z.object({
  reason: z.string().optional(),
});

export type CreateRideBody = z.infer<typeof createRideSchema>;
export type UpdateRideBody = z.infer<typeof updateRideSchema>;
export type CancelRideBody = z.infer<typeof cancelRideSchema>;
