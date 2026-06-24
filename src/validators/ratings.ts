import { z } from 'zod';

export const createRatingSchema = z.object({
  toUserId: z.string().min(1),
  fromUserId: z.string().min(1),
  bookingId: z.string().min(1),
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
  role: z.enum(['rider', 'driver']),
});

export const updateRatingSchema = z.object({
  rating: z.number().min(1).max(5).optional(),
  comment: z.string().optional(),
});

export type CreateRatingBody = z.infer<typeof createRatingSchema>;
export type UpdateRatingBody = z.infer<typeof updateRatingSchema>;
