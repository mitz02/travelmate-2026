import { z } from 'zod';

export const updateUserStatusSchema = z.object({
  status: z.enum(['active', 'suspended', 'banned']),
});

export const updateFeesSchema = z.object({
  bookingFeePercent: z.number().min(0).max(100).optional(),
  platformFeePercent: z.number().min(0).max(100).optional(),
});

export const updateReferralSettingsSchema = z.object({
  refereeBonus: z.number().min(0).max(1000000).optional(),
  referrerReward: z.number().min(0).max(1000000).optional(),
});

export type UpdateUserStatusBody = z.infer<typeof updateUserStatusSchema>;
export type UpdateFeesBody = z.infer<typeof updateFeesSchema>;
export type UpdateReferralSettingsBody = z.infer<typeof updateReferralSettingsSchema>;
