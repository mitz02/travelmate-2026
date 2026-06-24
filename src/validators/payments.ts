import { z } from 'zod';

export const initializePaymentSchema = z.object({
  amount: z.number().min(1),
  email: z.string().email(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const chargeCardSchema = z.object({
  card: z.string().min(1),
  amount: z.number().min(1),
  email: z.string().email(),
});

export const saveCardSchema = z.object({
  authorizationCode: z.string().min(1),
  last4: z.string().length(4),
  exp: z.string().min(1),
});

export type InitializePaymentBody = z.infer<typeof initializePaymentSchema>;
export type ChargeCardBody = z.infer<typeof chargeCardSchema>;
export type SaveCardBody = z.infer<typeof saveCardSchema>;
