import { z } from 'zod';

export const buyAirtimeSchema = z.object({
  phone: z.string().min(10),
  network: z.string().min(1),
  amount: z.number().min(1),
});

export const buyDataSchema = z.object({
  phone: z.string().min(10),
  network: z.string().min(1),
  plan: z.string().min(1),
  amount: z.number().min(1),
});

export const payElectricitySchema = z.object({
  meterNumber: z.string().min(1),
  provider: z.string().min(1),
  amount: z.number().min(1),
  meterType: z.string().optional(),
});

export const verifyMeterSchema = z.object({
  meterNumber: z.string().min(1),
  provider: z.string().min(1),
});

export type BuyAirtimeBody = z.infer<typeof buyAirtimeSchema>;
export type BuyDataBody = z.infer<typeof buyDataSchema>;
export type PayElectricityBody = z.infer<typeof payElectricitySchema>;
export type VerifyMeterBody = z.infer<typeof verifyMeterSchema>;
