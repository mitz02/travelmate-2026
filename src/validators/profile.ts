import { z } from 'zod';

export const updateProfileSchema = z.object({
  phone: z.string().min(10).optional(),
  avatar: z.string().url().optional(),
  // extend with more profile fields as needed
}).strict();

export type UpdateProfileBody = z.infer<typeof updateProfileSchema>;
