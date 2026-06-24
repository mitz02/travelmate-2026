import { z } from 'zod';

export const holdEscrowSchema = z.object({
  bookingId: z.string().min(1),
  amount: z.number().min(0),
  fromUserId: z.string().min(1),
  toUserId: z.string().min(1),
});

export const releaseEscrowSchema = z.object({
  releasedBy: z.string().min(1),
});

export const refundEscrowSchema = z.object({
  reason: z.string().optional(),
});

export const disputeEscrowSchema = z.object({
  reason: z.string().min(1),
  details: z.string().optional(),
});

export const resolveEscrowSchema = z.object({
  resolution: z.string().min(1),
  releasedTo: z.enum(['from', 'to']),
});

export type HoldEscrowBody = z.infer<typeof holdEscrowSchema>;
export type ReleaseEscrowBody = z.infer<typeof releaseEscrowSchema>;
export type RefundEscrowBody = z.infer<typeof refundEscrowSchema>;
export type DisputeEscrowBody = z.infer<typeof disputeEscrowSchema>;
export type ResolveEscrowBody = z.infer<typeof resolveEscrowSchema>;
