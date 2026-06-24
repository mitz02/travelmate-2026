import { z } from 'zod';

export const createRequestSchema = z.object({
  origin: z.string().min(1),
  destination: z.string().min(1),
  date: z.string().min(1),
  seats: z.number().int().min(1),
  maxPrice: z.number().min(0).optional(),
});

export const makeOfferSchema = z.object({
  price: z.number().min(0),
  departureTime: z.string().min(1),
  vehicleId: z.string().min(1),
});

export type CreateRequestBody = z.infer<typeof createRequestSchema>;
export type MakeOfferBody = z.infer<typeof makeOfferSchema>;
