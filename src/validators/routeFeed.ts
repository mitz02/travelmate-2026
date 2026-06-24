import { z } from 'zod';

export const createStatusSchema = z.object({
  route: z.string().min(1),
  content: z.string().optional(),
  image: z.string().url().optional(),
  type: z.enum(['text', 'image', 'update']).default('text'),
});

export const addCommentSchema = z.object({
  content: z.string().min(1),
});

export const reactSchema = z.object({
  type: z.string().min(1),
});

export type CreateStatusBody = z.infer<typeof createStatusSchema>;
export type AddCommentBody = z.infer<typeof addCommentSchema>;
export type ReactBody = z.infer<typeof reactSchema>;
