import { z } from 'zod';

export const submitKycSchema = z.object({
  idType: z.string().min(1),
  idNumber: z.string().min(1),
  idFront: z.string().min(1).optional(),
  idBack: z.string().min(1).optional(),
  selfie: z.string().min(1).optional(),
  idDocumentUrl: z.string().optional(),
  documentType: z.string().optional(),
  utilityType: z.string().optional(),
  addressDocumentUrl: z.string().optional(),
  bankName: z.string().min(1),
  bankCode: z.string().min(1),
  accountNumber: z.string().min(10),
  accountName: z.string().min(1),
  faceImageUrl: z.string().optional(),
});

export const verifyAccountSchema = z.object({
  accountNumber: z.string().min(1),
  bankCode: z.string().min(1),
});

export const faceVerificationSchema = z.object({
  selfie: z.string().min(1),
  livenessData: z.record(z.string(), z.unknown()).optional(),
});

export const verifyIdSchema = z.object({
  documentType: z.string().min(1),
  documentUrl: z.string().url(),
});

export const adminApproveSchema = z.object({
  notes: z.string().optional(),
});

export const adminRejectSchema = z.object({
  reason: z.string().min(1),
});

export type SubmitKycBody = z.infer<typeof submitKycSchema>;
export type VerifyAccountBody = z.infer<typeof verifyAccountSchema>;
export type FaceVerificationBody = z.infer<typeof faceVerificationSchema>;
export type VerifyIdBody = z.infer<typeof verifyIdSchema>;
export type AdminApproveBody = z.infer<typeof adminApproveSchema>;
export type AdminRejectBody = z.infer<typeof adminRejectSchema>;
