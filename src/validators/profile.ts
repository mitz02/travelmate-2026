import { z } from 'zod';

export const updateProfileSchema = z.object({
  fullName: z.string().min(1).optional(),
  phone: z.string().min(10).optional(),
  avatar: z.string().url().optional(),
  // extend with more profile fields as needed
}).strict();

export const addVehicleSchema = z.object({
  make: z.string().min(1),
  model: z.string().min(1),
  year: z.number().int().min(1900).max(2100),
  color: z.string().optional(),
  plate: z.string().optional(),
  capacity: z.number().int().min(1).max(20),
});

export const updateVehicleSchema = z.object({
  make: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
  year: z.number().int().min(1900).max(2100).optional(),
  color: z.string().optional(),
  plate: z.string().optional(),
  capacity: z.number().int().min(1).max(20).optional(),
}).strict();

export type UpdateProfileBody = z.infer<typeof updateProfileSchema>;
export type AddVehicleBody = z.infer<typeof addVehicleSchema>;
export type UpdateVehicleBody = z.infer<typeof updateVehicleSchema>;
