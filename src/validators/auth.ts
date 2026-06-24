import { z } from 'zod';

const roleEnum = z.enum(['rider', 'driver', 'admin']);

export const signupSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().min(10).optional(),
  password: z.string().min(6),
  role: roleEnum.default('rider'),
  fullName: z.string().min(1).optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
}).refine((data) => data.email || data.phone, {
  message: 'Either email or phone is required',
});

export const signinSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().min(10).optional(),
  password: z.string().min(1),
}).refine((data) => data.email || data.phone, {
  message: 'Either email or phone is required',
});

export const signoutSchema = z.object({
  token: z.string().optional(),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const verifyOtpSchema = z.object({
  phone: z.string().min(10),
  firebaseIdToken: z.string().min(1),
});

export const resetPasswordSchema = z.object({
  email: z.string().email(),
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

export const switchRoleSchema = z.object({
  role: roleEnum,
});

export const googleAuthSchema = z.object({
  credential: z.string().min(1),
  googleUserInfo: z.object({
    sub: z.string().optional(),
    email: z.string().email().optional(),
    name: z.string().optional(),
    given_name: z.string().optional(),
    family_name: z.string().optional(),
    picture: z.string().optional(),
  }),
  role: roleEnum.optional(),
});

export type SignupBody = z.infer<typeof signupSchema>;
export type SigninBody = z.infer<typeof signinSchema>;
export type RefreshBody = z.infer<typeof refreshSchema>;
export type VerifyOtpBody = z.infer<typeof verifyOtpSchema>;
export type ResetPasswordBody = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordBody = z.infer<typeof changePasswordSchema>;
export type SwitchRoleBody = z.infer<typeof switchRoleSchema>;
export type GoogleAuthBody = z.infer<typeof googleAuthSchema>;
