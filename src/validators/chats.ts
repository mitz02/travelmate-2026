import { z } from 'zod';

export const createChatSchema = z.object({
  participantIds: z.array(z.string().min(1)).min(1),
  bookingId: z.string().min(1).optional(),
});

export const sendMessageSchema = z.object({
  content: z.string().min(1),
  type: z.enum(['text', 'image', 'file']).default('text'),
  mediaUrl: z.string().url().optional(),
});

export const typingSchema = z.object({
  isTyping: z.boolean(),
});

export type CreateChatBody = z.infer<typeof createChatSchema>;
export type SendMessageBody = z.infer<typeof sendMessageSchema>;
export type TypingBody = z.infer<typeof typingSchema>;
