import { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import * as otplib from 'otplib';
import QRCode from 'qrcode';
import { query, queryOne } from '../config/database';
import { config } from '../config';
import { signToken, verifyToken } from '../utils/jwt';
import { AuthenticatedRequest } from '../types';
import { normalizePhoneNumber } from '../utils/phone';
import { verifyFirebaseIdToken } from '../services/firebase';
import type {
  SignupBody,
  SigninBody,
  RefreshBody,
  VerifyOtpBody,
  ResetPasswordBody,
  ChangePasswordBody,
  SwitchRoleBody,
  GoogleAuthBody,
} from '../validators/auth';

const ROLES = ['rider', 'driver', 'admin'] as const;
const SALT_ROUNDS = 10;

async function getProfile(userId: string) {
  return queryOne('SELECT * FROM profiles WHERE user_id = $1', [userId]);
}

async function ensureProfile(
  userId: string,
  email?: string,
  phone?: string,
  fullName?: string,
  role?: string,
  firstName?: string,
  lastName?: string,
) {
  let profile = await getProfile(userId);
  if (!profile) {
    const names = splitFullName(fullName, firstName, lastName);
    const inserted = await queryOne(
      `INSERT INTO profiles (user_id, email, full_name, first_name, last_name, phone, role, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING *`,
      [userId, email ?? null, fullName ?? null, names.firstName, names.lastName, phone ?? null, role ?? 'rider'],
    );
    profile = inserted;
  }
  return profile;
}

function splitFullName(fullName?: string, firstName?: string, lastName?: string) {
  if (firstName && lastName) return { firstName, lastName };
  if (firstName) return { firstName, lastName: '' };
  if (lastName) return { firstName: '', lastName };
  if (fullName) {
    const parts = fullName.trim().split(/\s+/);
    return { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') || '' };
  }
  return { firstName: '', lastName: '' };
}

function formatUser(profile: Record<string, any>) {
  return {
    id: profile.user_id,
    email: profile.email ?? null,
    phone: profile.phone ?? null,
    role: profile.role,
    fullName: profile.full_name ?? null,
    first_name: profile.first_name ?? null,
    last_name: profile.last_name ?? null,
    kyc_status: profile.kyc_status ?? null,
    profile_picture: profile.profile_picture ?? profile.avatar_url ?? null,
  };
}

export async function signup(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { email, password, role, fullName, firstName, lastName } = req.body as SignupBody;
    let phone: string | undefined;

    if ((req.body as SignupBody).phone) {
      try {
        phone = normalizePhoneNumber((req.body as SignupBody).phone!);
      } catch (e: any) {
        res.status(400).json({ error: e.message || 'Invalid phone number' });
        return;
      }

      if (!isPhoneVerified(phone)) {
        res.status(400).json({ error: 'Phone number is not verified. Please complete OTP verification.' });
        return;
      }
    }

    if (email) {
      const existing = await queryOne('SELECT id FROM profiles WHERE email = $1', [email]);
      if (existing) {
        res.status(409).json({ error: 'Email already registered' });
        return;
      }
    }

    if (phone) {
      const existing = await queryOne('SELECT id FROM profiles WHERE phone = $1', [phone]);
      if (existing) {
        res.status(409).json({ error: 'Phone already registered' });
        return;
      }
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const names = splitFullName(fullName, firstName, lastName);
    const userId = crypto.randomUUID();

    const profile = await queryOne(
      `INSERT INTO profiles (id, user_id, email, password_hash, full_name, first_name, last_name, phone, phone_verified, role, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()) RETURNING *`,
      [userId, userId, email ?? null, passwordHash, fullName ?? null, names.firstName, names.lastName, phone ?? null, phone ? true : false, role ?? 'rider'],
    );

    if (!profile) {
      res.status(500).json({ error: 'Failed to create profile' });
      return;
    }

    if (phone) {
      verifiedPhones.delete(phone);
    }

    const token = signToken({ userId: profile.user_id, email, role: profile.role });

    res.status(201).json({
      user: formatUser(profile),
      token,
      refreshToken: token,
      profile,
    });
  } catch (e) {
    console.error('Signup error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function signin(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { email, phone, password } = req.body as SigninBody;

    let profile: Record<string, any> | null = null;
    if (email) {
      profile = await queryOne('SELECT * FROM profiles WHERE email = $1', [email]);
    } else if (phone) {
      try {
        profile = await queryOne('SELECT * FROM profiles WHERE phone = $1', [normalizePhoneNumber(phone)]);
      } catch {
        res.status(400).json({ error: 'Invalid phone number' });
        return;
      }
    }

    if (!profile || !profile.password_hash) {
      res.status(401).json({ error: 'Invalid email/phone or password' });
      return;
    }

    const valid = await bcrypt.compare(password, profile.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid email/phone or password' });
      return;
    }

    if (profile.two_factor_enabled) {
      const tempToken = jwt.sign(
        { type: '2fa_temp', userId: profile.user_id },
        config.jwt.secret,
        { expiresIn: '5m' }
      );
      res.json({
        requiresTwoFactor: true,
        tempToken,
      });
      return;
    }

    const token = signToken({ userId: profile.user_id, email: profile.email, role: profile.role });

    res.json({
      user: formatUser(profile),
      token,
      refreshToken: token,
      profile,
    });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

/* ------------------------------------------------------------------ */
/*  Two-Factor Authentication (2FA)                                    */
/* ------------------------------------------------------------------ */

export async function setup2FA(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const profile = await queryOne<{ email: string; two_factor_secret: string | null; two_factor_enabled: boolean }>(
      'SELECT email, two_factor_secret, two_factor_enabled FROM profiles WHERE user_id = $1',
      [userId]
    );

    if (!profile) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    if (profile.two_factor_enabled) {
      res.status(400).json({ error: '2FA is already enabled' });
      return;
    }

    const secret = profile.two_factor_secret || otplib.generateSecret();
    const serviceName = 'TravelMate';
    const otpauth = await otplib.generateURI({ label: profile.email, issuer: serviceName, secret });

    if (!profile.two_factor_secret) {
      await query('UPDATE profiles SET two_factor_secret = $1 WHERE user_id = $2', [secret, userId]);
    }

    const qrCode = await QRCode.toDataURL(otpauth);

    res.json({ secret, qrCode });
  } catch (e: any) {
    console.error('Error in setup2FA:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function verify2FA(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const { token } = req.body as { token: string };

    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (!token) {
      res.status(400).json({ error: 'Token is required' });
      return;
    }

    const profile = await queryOne<{ two_factor_secret: string }>(
      'SELECT two_factor_secret FROM profiles WHERE user_id = $1',
      [userId]
    );

    if (!profile || !profile.two_factor_secret) {
      res.status(400).json({ error: '2FA not set up. Run setup first.' });
      return;
    }

    const isValid = await otplib.verify({ token, secret: profile.two_factor_secret });
    if (!isValid) {
      res.status(400).json({ error: 'Invalid verification code' });
      return;
    }

    await query('UPDATE profiles SET two_factor_enabled = true WHERE user_id = $1', [userId]);

    res.json({ success: true, message: '2FA enabled successfully' });
  } catch (e: any) {
    console.error('Error in verify2FA:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function disable2FA(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const { password } = req.body as { password: string };

    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const profile = await queryOne<{ password_hash: string }>(
      'SELECT password_hash FROM profiles WHERE user_id = $1',
      [userId]
    );

    if (!profile) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    if (password) {
      const valid = await bcrypt.compare(password, profile.password_hash);
      if (!valid) {
        res.status(403).json({ error: 'Invalid password' });
        return;
      }
    }

    await query(
      'UPDATE profiles SET two_factor_secret = NULL, two_factor_enabled = false WHERE user_id = $1',
      [userId]
    );

    res.json({ success: true, message: '2FA disabled successfully' });
  } catch (e: any) {
    console.error('Error in disable2FA:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function authenticate2FA(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { tempToken, token } = req.body as { tempToken: string; token: string };

    if (!tempToken || !token) {
      res.status(400).json({ error: 'tempToken and token are required' });
      return;
    }

    let payload: any;
    try {
      payload = jwt.verify(tempToken, config.jwt.secret);
    } catch {
      res.status(401).json({ error: 'Invalid or expired temporary token. Please log in again.' });
      return;
    }

    if (payload.type !== '2fa_temp') {
      res.status(401).json({ error: 'Invalid token type' });
      return;
    }

    const userId = payload.userId;
    const profile = await queryOne<any>('SELECT * FROM profiles WHERE user_id = $1', [userId]);

    if (!profile) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    if (!profile.two_factor_secret) {
      res.status(400).json({ error: '2FA not configured' });
      return;
    }

    const isValid = await otplib.verify({ token, secret: profile.two_factor_secret });
    if (!isValid) {
      res.status(401).json({ error: 'Invalid verification code' });
      return;
    }

    const jwtToken = signToken({ userId: profile.user_id, email: profile.email, role: profile.role });

    res.json({
      user: formatUser(profile),
      token: jwtToken,
      refreshToken: jwtToken,
      profile,
    });
  } catch (e: any) {
    console.error('Error in authenticate2FA:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function get2FAStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const profile = await queryOne<{ two_factor_enabled: boolean }>(
      'SELECT two_factor_enabled FROM profiles WHERE user_id = $1',
      [userId]
    );

    res.json({
      enabled: profile?.two_factor_enabled || false,
    });
  } catch (e: any) {
    console.error('Error in get2FAStatus:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function google(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { googleUserInfo, role } = req.body as GoogleAuthBody;
    const { email, name, given_name, family_name, picture } = googleUserInfo;

    if (!email) {
      res.status(400).json({ error: 'Google account must have an email' });
      return;
    }

    let profile = await queryOne('SELECT * FROM profiles WHERE email = $1', [email]);
    let isNew = false;

    if (!profile) {
      isNew = true;
      const userId = crypto.randomUUID();
      const names = splitFullName(name, given_name, family_name);
      profile = await queryOne(
        `INSERT INTO profiles (id, user_id, email, full_name, first_name, last_name, avatar_url, role, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) RETURNING *`,
        [userId, userId, email, name ?? null, names.firstName, names.lastName, picture ?? null, role ?? 'rider'],
      );
    }

    if (!profile) {
      res.status(500).json({ error: 'Failed to process Google auth' });
      return;
    }

    const token = signToken({ userId: profile.user_id, email, role: profile.role });

    res.status(isNew ? 201 : 200).json({
      user: {
        id: profile.user_id,
        email,
        role: profile.role,
        first_name: profile.first_name ?? given_name ?? null,
        last_name: profile.last_name ?? family_name ?? null,
        kyc_status: profile.kyc_status ?? null,
        profile_picture: profile.avatar_url ?? picture ?? null,
      },
      token,
      refreshToken: token,
      profile,
    });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function signout(req: AuthenticatedRequest, res: Response): Promise<void> {
  res.json({ success: true });
}

export async function refresh(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { refreshToken } = req.body as RefreshBody;
    const decoded = verifyToken(refreshToken);
    const token = signToken({ userId: decoded.userId, email: decoded.email, role: decoded.role });
    res.json({ token, refreshToken: token });
  } catch (e) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export async function me(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId ?? req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const profile = await getProfile(userId);
    const kycStatus = profile?.kyc_status ?? 'pending';

    res.json({
      id: userId,
      email: profile?.email ?? null,
      phone: profile?.phone ?? null,
      role: profile?.role ?? null,
      firstName: profile?.first_name ?? null,
      lastName: profile?.last_name ?? null,
      fullName: profile?.full_name ?? null,
      kycStatus,
      profilePicture: profile?.profile_picture ?? profile?.avatar_url ?? null,
      profile: profile ?? null,
    });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Phones verified via Firebase during registration (use Redis/DB in production)
const verifiedPhones = new Map<string, number>();
const VERIFIED_PHONE_TTL_MS = 30 * 60 * 1000;

function isPhoneVerified(phone: string): boolean {
  const expires = verifiedPhones.get(phone);
  return !!expires && expires > Date.now();
}

/**
 * Verify a phone number using a Firebase ID token from client-side Phone Auth.
 * The client sends the OTP via Firebase; this endpoint validates the resulting token.
 */
export async function verifyFirebasePhone(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    let phone: string;
    try {
      phone = normalizePhoneNumber((req.body as VerifyOtpBody).phone);
    } catch (e: any) {
      res.status(400).json({ error: e.message || 'Invalid phone number' });
      return;
    }

    const { firebaseIdToken } = req.body as VerifyOtpBody;
    if (!firebaseIdToken) {
      res.status(400).json({ error: 'firebaseIdToken is required' });
      return;
    }

    let decoded;
    try {
      decoded = await verifyFirebaseIdToken(firebaseIdToken);
    } catch (e: any) {
      console.error('[ERROR] Firebase token verification failed:', e.message || e);
      res.status(401).json({ error: 'Invalid or expired verification. Please try again.' });
      return;
    }

    if (!decoded.phone_number) {
      res.status(400).json({ error: 'Firebase token is not a phone authentication token' });
      return;
    }

    let tokenPhone: string;
    try {
      tokenPhone = normalizePhoneNumber(decoded.phone_number);
    } catch {
      tokenPhone = decoded.phone_number;
    }

    if (tokenPhone !== phone) {
      res.status(400).json({ error: 'Phone number does not match verified token' });
      return;
    }

    verifiedPhones.set(phone, Date.now() + VERIFIED_PHONE_TTL_MS);

    try {
      await query(
        'UPDATE profiles SET phone_verified = true, updated_at = NOW() WHERE phone = $1',
        [phone],
      );
    } catch (updateErr) {
      console.warn('[WARN] Could not update phone_verified on profile:', updateErr);
    }

    res.json({ verified: true });
  } catch (e) {
    console.error('verifyFirebasePhone error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function resetPassword(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { email } = req.body as ResetPasswordBody;
    const password = (req.body as any).password;

    if (!password) {
      res.status(400).json({ error: 'Password is required' });
      return;
    }

    const profile = await queryOne('SELECT * FROM profiles WHERE email = $1', [email]);
    if (!profile) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await query('UPDATE profiles SET password_hash = $1, updated_at = NOW() WHERE id = $2', [passwordHash, profile.id]);

    res.json({ message: 'Password reset successfully' });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId ?? req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { oldPassword, newPassword } = req.body as ChangePasswordBody;

    const profile = await queryOne('SELECT * FROM profiles WHERE user_id = $1', [userId]);
    if (!profile || !profile.password_hash) {
      res.status(400).json({ error: 'Current password is incorrect' });
      return;
    }

    const valid = await bcrypt.compare(oldPassword, profile.password_hash);
    if (!valid) {
      res.status(400).json({ error: 'Current password is incorrect' });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await query('UPDATE profiles SET password_hash = $1, updated_at = NOW() WHERE user_id = $2', [passwordHash, userId]);

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function switchRole(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId ?? req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { role } = req.body as SwitchRoleBody;
    if (!ROLES.includes(role)) {
      res.status(400).json({ error: 'Invalid role' });
      return;
    }

    const profile = await queryOne(
      'UPDATE profiles SET role = $1, updated_at = NOW() WHERE user_id = $2 RETURNING *',
      [role, userId],
    );

    if (!profile) {
      res.status(400).json({ error: 'Profile not found' });
      return;
    }

    res.json({
      user: {
        id: userId,
        email: profile.email ?? null,
        phone: profile.phone ?? null,
        role,
        fullName: profile.full_name ?? null,
      },
      profile,
    });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
