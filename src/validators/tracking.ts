import { z } from 'zod';

export const startTrackingSchema = z.object({
  driverLocation: z.object({
    lat: z.number(),
    lng: z.number(),
    timestamp: z.string().optional(),
  }),
});

export const updateLocationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  timestamp: z.string().optional(),
});

export const deviationSchema = z.object({
  bookingId: z.string().min(1),
  reason: z.string().min(1),
});

export type StartTrackingBody = z.infer<typeof startTrackingSchema>;
export type UpdateLocationBody = z.infer<typeof updateLocationSchema>;
export type DeviationBody = z.infer<typeof deviationSchema>;
