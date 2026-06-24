import { z } from 'zod';

export const sendNotificationSchema = z.object({
  userId: z.string().min(1),
  title: z.string().min(1),
  body: z.string().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
});

export const registerTokenSchema = z.object({
  token: z.string().min(1),
  device: z.string().optional(),
});

export const unregisterTokenSchema = z.object({
  token: z.string().min(1),
});

export type SendNotificationBody = z.infer<typeof sendNotificationSchema>;
export type RegisterTokenBody = z.infer<typeof registerTokenSchema>;
export type UnregisterTokenBody = z.infer<typeof unregisterTokenSchema>;
