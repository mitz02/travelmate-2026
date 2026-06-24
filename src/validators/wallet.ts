import { z } from 'zod';

export const fundWalletSchema = z.object({
  amount: z.number().min(1),
  paymentMethod: z.string().min(1),
});

export const verifyPaymentSchema = z.object({
  reference: z.string().min(1),
});

export const withdrawWalletSchema = z.object({
  amount: z.number().min(100, 'Minimum withdrawal is ₦100'),
  bankCode: z.string().min(1, 'Bank code is required'),
  bankName: z.string().min(1, 'Bank name is required'),
  accountNumber: z.string().length(10, 'Account number must be 10 digits'),
  accountName: z.string().min(1, 'Account name is required'),
});

export const resolveAccountSchema = z.object({
  bankCode: z.string().min(1),
  accountNumber: z.string().length(10),
});

export const transferWalletSchema = z.object({
  toUserId: z.string().min(1),
  amount: z.number().min(0.01),
  note: z.string().optional(),
});

export const freezeWalletSchema = z.object({
  reason: z.string().optional(),
});

export type FundWalletBody = z.infer<typeof fundWalletSchema>;
export type VerifyPaymentBody = z.infer<typeof verifyPaymentSchema>;
export type WithdrawWalletBody = z.infer<typeof withdrawWalletSchema>;
export type ResolveAccountBody = z.infer<typeof resolveAccountSchema>;
export type TransferWalletBody = z.infer<typeof transferWalletSchema>;
export type FreezeWalletBody = z.infer<typeof freezeWalletSchema>;
