import { z } from 'zod';

export const createBookingSchema = z.object({
  rideId: z.string().min(1),
  seats: z.number().int().min(1),
  paymentMethod: z.string().min(1),
});

export const cancelBookingSchema = z.object({
  reason: z.string().optional(),
});

export const payBookingSchema = z.object({
  paymentMethod: z.string().min(1),
  amount: z.number().min(0).optional(),
});

export const rateBookingSchema = z.object({
  rating: z.number().min(1).max(5),
  review: z.string().optional(),
  role: z.enum(['rider', 'driver']),
});

export type CreateBookingBody = z.infer<typeof createBookingSchema>;
export type CancelBookingBody = z.infer<typeof cancelBookingSchema>;
export type PayBookingBody = z.infer<typeof payBookingSchema>;
export type RateBookingBody = z.infer<typeof rateBookingSchema>;
