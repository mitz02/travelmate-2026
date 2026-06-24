import { z } from 'zod';

export const sosSchema = z.object({
  userId: z.string().min(1),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
    address: z.string().optional(),
  }),
  bookingId: z.string().optional(),
});

export const addContactSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(10),
  relationship: z.string().optional(),
});

export const updateContactSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().min(10).optional(),
  relationship: z.string().optional(),
});

export type SosBody = z.infer<typeof sosSchema>;
export type AddContactBody = z.infer<typeof addContactSchema>;
export type UpdateContactBody = z.infer<typeof updateContactSchema>;
