import express, { Router, Request, Response } from 'express';
import jwt from 'jwt-simple';
import bcrypt from 'bcryptjs';
import Joi from 'joi';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../config/index.js';
import { supabase } from '../services/supabase.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
const router: Router = express.Router();
const googleClient = new OAuth2Client(config.google.clientId);

const SALT_ROUNDS = 10;
// Main auth JWT: 7 days
const JWT_EXP_SEC = config.jwt.expiresInDays * 24 * 60 * 60;
// Registration session token: 24 hours
const REG_SESSION_EXP_SEC = 24 * 60 * 60;
// ─── Token helpers ────────────────────────────────────────────────────────────

/** Sign the final auth JWT returned to the client after full registration / login. */
function encodeAuthToken(payload: { sub: string; email: string; role: string }): string {
  const now = Math.floor(Date.now() / 1000);
  return jwt.encode(
    { ...payload, iat: now, exp: now + JWT_EXP_SEC },
    config.jwt.secret,
  );
}

/**
 * Sign a short-lived registration-session token.
 * This token accumulates verified state across the multi-step registration flow:
 *  email, phone, phoneVerified, emailVerified, passwordHash, personal info, address.
 * It is signed with REGISTRATION_SECRET (separate from the main JWT secret).
 */
function encodeRegSession(data: Record<string, unknown>): string {
  const now = Math.floor(Date.now() / 1000);
  return jwt.encode(
    { ...data, iat: now, exp: now + REG_SESSION_EXP_SEC },
    config.registrationSecret,
  );
}

/** Decode and verify a registration session token. Throws on invalid/expired. */
function decodeRegSession(token: string): Record<string, unknown> {
  return jwt.decode(token, config.registrationSecret) as Record<string, unknown>;
}



// ─── Validation schemas ───────────────────────────────────────────────────────

const startSchema = Joi.object({
  email: Joi.string().email().required(),
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{6,14}$/)
    .required()
    .messages({ 'string.pattern.base': 'Phone must be a valid international number (e.g. +2348012345678)' }),
  role: Joi.string().valid('rider', 'driver').default('rider'),
});

const verifyPhoneSchema = Joi.object({
  sessionToken: Joi.string().required(),
  otp: Joi.string().length(6).required(),
});

const setPasswordSchema = Joi.object({
  sessionToken: Joi.string().required(),
  password: Joi.string()
    .min(8)
    .pattern(/[A-Z]/, 'uppercase letter')
    .pattern(/[a-z]/, 'lowercase letter')
    .pattern(/[0-9]/, 'number')
    .pattern(/[^A-Za-z0-9]/, 'special character')
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters',
      'string.pattern.name': 'Password must contain at least one {#name}',
    }),
});

const personalInfoSchema = Joi.object({
  sessionToken: Joi.string().required(),
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  surname: Joi.string().required(),
  dateOfBirth: Joi.string()
    .pattern(/^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/)
    .required()
    .messages({ 'string.pattern.base': 'Date of birth must be in MM/DD/YYYY format' }),
  gender: Joi.string().valid('male', 'female', 'other').required(),
});

const addressSchema = Joi.object({
  sessionToken: Joi.string().required(),
  state: Joi.string().required(),
  localGovt: Joi.string().required(),
  ward: Joi.string().required(),
  street: Joi.string().required(),
  houseNumber: Joi.string().required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const preferencesSchema = Joi.object({
  ac: Joi.boolean(),
  music: Joi.boolean(),
  pets: Joi.boolean(),
  smoking: Joi.boolean(),
  autoAccept: Joi.boolean(),
});

const roleSchema = Joi.object({
  role: Joi.string().valid('rider', 'driver').required(),
});

// Fields the user can self-edit from the Edit Profile screen.
// Name, email, and phone are intentionally excluded for regular users — contact support to change those.
// Admins can change them.
const editProfileSchema = Joi.object({
  firstName: Joi.string().max(100),
  lastName: Joi.string().max(100),
  phone: Joi.string().max(20),
  // Address fields (matches Registered Address section in UI)
  street: Joi.string().max(200),
  city: Joi.string().max(100),
  state: Joi.string().max(100),
  localGovt: Joi.string().max(100),
  ward: Joi.string().max(100),
  houseNumber: Joi.string().max(50),
  // Optional profile picture URL (after uploading to storage)
  profilePicture: Joi.string().uri().allow('', null),
}).min(1).messages({
  'object.min': 'At least one field must be provided to update',
});

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1 — Start registration: collect email + phone
// POST /api/auth/register/start
// ─────────────────────────────────────────────────────────────────────────────
router.post('/register/start', async (req: Request, res: Response) => {
  try {
    const { error, value } = startSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { email, phone, role } = value;

    // Check for duplicate email
    const { data: existingEmail } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    if (existingEmail) return res.status(409).json({ error: 'An account with this email already exists' });

    // Check for duplicate phone
    const { data: existingPhone } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone', phone)
      .maybeSingle();
    if (existingPhone) return res.status(409).json({ error: 'An account with this phone number already exists' });

    // Issue a session token directly advancing to set_password (phone verification is optional)
    const sessionToken = encodeRegSession({
      email,
      phone,
      role,
      phoneVerified: false,
      step: 'set_password',
    });

    return res.status(200).json({
      message: 'Account started. Please set your password.',
      sessionToken,
      nextStep: 'set-password',
    });
  } catch (err) {
    console.error('Register start error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2 — Phone verification via OTP
// POST /api/auth/register/verify-phone
// ─────────────────────────────────────────────────────────────────────────────
router.post('/register/verify-phone', async (req: Request, res: Response) => {
  try {
    const { error, value } = verifyPhoneSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { sessionToken, otp } = value;

    // Decode and validate the session token from step 1
    let session: Record<string, unknown>;
    try {
      session = decodeRegSession(sessionToken);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired session token. Please restart registration.' });
    }
    if (session.step !== 'phone_verification') {
      return res.status(400).json({ error: 'Invalid step. Expected phone_verification.' });
    }

    if (session.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP. Please try again.' });
    }

    // Advance the session directly to set_password, skipping email verification
    const newToken = encodeRegSession({
      ...session,
      phoneVerified: true,
      step: 'set_password',
    });

    return res.status(200).json({
      message: 'Phone verified successfully. Please set your password.',
      sessionToken: newToken,
      nextStep: 'set-password',
    });
  } catch (err) {
    console.error('Verify phone error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});



// ─────────────────────────────────────────────────────────────────────────────
// STEP 4 — Set password
// POST /api/auth/register/set-password
// Password rules: min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
// ─────────────────────────────────────────────────────────────────────────────
router.post('/register/set-password', async (req: Request, res: Response) => {
  try {
    const { error, value } = setPasswordSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    let session: Record<string, unknown>;
    try {
      session = decodeRegSession(value.sessionToken);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired session token. Please restart registration.' });
    }
    if (session.step !== 'set_password') {
      return res.status(400).json({ error: 'Invalid step. Expected set_password.' });
    }

    const passwordHash = await bcrypt.hash(value.password, SALT_ROUNDS);

    const sessionToken = encodeRegSession({
      ...session,
      passwordHash,
      step: 'personal_info',
    });

    return res.status(200).json({
      message: 'Password set successfully. Please provide your personal information.',
      sessionToken,
      nextStep: 'personal-info',
    });
  } catch (err) {
    console.error('Set password error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// STEP 5 — Personal information
// POST /api/auth/register/personal-info
// Fields: firstName, lastName, surname, dateOfBirth (MM/DD/YYYY), gender
// ─────────────────────────────────────────────────────────────────────────────
router.post('/register/personal-info', async (req: Request, res: Response) => {
  try {
    const { error, value } = personalInfoSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    let session: Record<string, unknown>;
    try {
      session = decodeRegSession(value.sessionToken);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired session token. Please restart registration.' });
    }
    if (session.step !== 'personal_info') {
      return res.status(400).json({ error: 'Invalid step. Expected personal_info.' });
    }

    const { firstName, lastName, surname, dateOfBirth, gender } = value;

    const sessionToken = encodeRegSession({
      ...session,
      firstName,
      lastName,
      surname,
      dateOfBirth,
      gender,
      step: 'address',
    });

    return res.status(200).json({
      message: 'Personal information saved. Please provide your registered address.',
      sessionToken,
      nextStep: 'address',
    });
  } catch (err) {
    console.error('Personal info error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// STEP 6 — Registered address (final step — creates the account)
// POST /api/auth/register/address
// Fields: state, localGovt, ward, street, houseNumber
// ─────────────────────────────────────────────────────────────────────────────
router.post('/register/address', async (req: Request, res: Response) => {
  try {
    const { error, value } = addressSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    let session: Record<string, unknown>;
    try {
      session = decodeRegSession(value.sessionToken);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired session token. Please restart registration.' });
    }
    if (session.step !== 'address') {
      return res.status(400).json({ error: 'Invalid step. Expected address.' });
    }

    // Final guard: password must have been set
    if (!session.passwordHash) {
      return res.status(400).json({ error: 'Registration session is incomplete. Please restart.' });
    }

    const { state, localGovt, ward, street, houseNumber } = value;

    // Create the profile row in Supabase
    const { data: newUser, error: dbError } = await supabase
      .from('profiles')
      .insert([{
        email: session.email,
        password_hash: session.passwordHash,
        phone: session.phone,
        first_name: session.firstName,
        last_name: session.lastName,
        surname: session.surname,
        date_of_birth: session.dateOfBirth,
        gender: session.gender,
        role: session.role,
        kyc_status: 'unverified',
        phone_verified: true,
        email_verified: false,
        address: { state, localGovt, ward, street, houseNumber },
      }])
      .select()
      .single();

    if (dbError) {
      console.error('DB insert error:', dbError);
      // Handle race-condition duplicate
      if (dbError.code === '23505') {
        return res.status(409).json({ error: 'An account with this email or phone already exists.' });
      }
      return res.status(500).json({ error: 'Failed to create user profile' });
    }

    // Create the wallet for the new user
    await supabase.from('wallets').insert([{
      user_id: newUser.id,
      balance: 0,
      total_earnings: 0,
      total_withdrawn: 0,
      held_amount: 0,
    }]);

    // Issue the final authentication token
    const token = encodeAuthToken({
      sub: newUser.id,
      email: newUser.email,
      role: newUser.role,
    });

    return res.status(201).json({
      message: 'Registration complete! Welcome to TravelMate.',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        phone: newUser.phone,
        firstName: newUser.first_name,
        lastName: newUser.last_name,
        surname: newUser.surname,
        role: newUser.role,
        kycStatus: newUser.kyc_status,
      },
    });
  } catch (err) {
    console.error('Address/final registration error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN — existing users
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────────────────────
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { email, password } = value;
    const { data: user, error: dbError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();
    if (dbError || !user) return res.status(401).json({ error: 'Invalid email or password' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid email or password' });

    const token = encodeAuthToken({ sub: user.id, email: user.email, role: user.role });
    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        kycStatus: user.kyc_status,
        profilePicture: user.profile_picture,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GOOGLE OAUTH — register or login via Google (access_token or ID token)
// POST /api/auth/google
// Body: { credential: string, googleUserInfo?: object, role?: 'rider' | 'driver' }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/google', async (req: Request, res: Response) => {
  try {
    const { credential, googleUserInfo, role = 'rider' } = req.body;

    if (!credential && !googleUserInfo) {
      return res.status(400).json({ error: 'Google credential or user info is required' });
    }

    // Validate role
    if (!['rider', 'driver'].includes(role)) {
      return res.status(400).json({ error: 'Role must be rider or driver' });
    }

    // ── Resolve Google user info ──────────────────────────────────────────
    let googleEmail = '';
    let googleName  = '';
    let googlePicture = '';

    if (googleUserInfo && googleUserInfo.email) {
      // Frontend fetched userinfo via the OAuth2 access_token
      googleEmail   = googleUserInfo.email   ?? '';
      googleName    = googleUserInfo.name    ?? '';
      googlePicture = googleUserInfo.picture ?? '';
    } else if (credential) {
      // Fallback: treat credential as a Google ID token and verify it
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: credential,
          audience: config.google.clientId,
        });
        const p = ticket.getPayload();
        if (!p) throw new Error('Empty payload');
        googleEmail   = p['email']   ?? '';
        googleName    = p['name']    ?? '';
        googlePicture = p['picture'] ?? '';
      } catch (verifyErr) {
        console.error('Google token verification failed:', verifyErr);
        return res.status(401).json({ error: 'Invalid Google token. Please try again.' });
      }
    }

    if (!googleEmail) {
      return res.status(400).json({ error: 'Google account does not have an email address' });
    }

    // ── Check if user already exists (by email) ───────────────────────────
    const { data: existingUser, error: lookupError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', googleEmail)
      .maybeSingle();

    if (lookupError) {
      console.error('DB lookup error:', lookupError);
      return res.status(500).json({ error: 'Internal server error' });
    }

    // ── Existing user → return JWT ────────────────────────────────────────
    if (existingUser) {
      // Update picture if Google provides one and we don't have one stored
      if (googlePicture && !existingUser.profile_picture) {
        await supabase
          .from('profiles')
          .update({ profile_picture: googlePicture })
          .eq('id', existingUser.id);
      }

      const token = encodeAuthToken({
        sub: existingUser.id,
        email: existingUser.email,
        role: existingUser.role,
      });

      return res.json({
        message: 'Logged in with Google successfully.',
        token,
        isNewUser: false,
        user: {
          id: existingUser.id,
          email: existingUser.email,
          phone: existingUser.phone,
          firstName: existingUser.first_name,
          lastName: existingUser.last_name,
          role: existingUser.role,
          kycStatus: existingUser.kyc_status,
          profilePicture: existingUser.profile_picture || googlePicture,
        },
      });
    }

    // ── New user → create account ─────────────────────────────────────────
    // Parse name from Google: "First Last" → first + last
    const nameParts = googleName.trim().split(/\s+/);
    const firstName = nameParts[0] ?? 'User';
    const lastName = nameParts.slice(1).join(' ') || '';

    const { data: newUser, error: insertError } = await supabase
      .from('profiles')
      .insert([{
        email: googleEmail,
        first_name: firstName,
        last_name: lastName,
        surname: lastName,          // fallback — user can update later
        profile_picture: googlePicture,
        role,
        kyc_status: 'unverified',
        phone_verified: false,
        email_verified: true,       // Google already verified the email
        // password_hash intentionally null for Google-only accounts
        // phone intentionally null — not provided by Google
      }])
      .select()
      .single();

    if (insertError) {
      console.error('DB insert error (Google):', insertError);
      if (insertError.code === '23505') {
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }
      return res.status(500).json({ error: 'Failed to create user profile' });
    }

    // Create wallet for the new user
    await supabase.from('wallets').insert([{
      user_id: newUser.id,
      balance: 0,
      total_earnings: 0,
      total_withdrawn: 0,
      held_amount: 0,
    }]);

    const token = encodeAuthToken({
      sub: newUser.id,
      email: newUser.email,
      role: newUser.role,
    });

    return res.status(201).json({
      message: 'Account created with Google. Welcome to TravelMate!',
      token,
      isNewUser: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        phone: null,
        firstName: newUser.first_name,
        lastName: newUser.last_name,
        role: newUser.role,
        kycStatus: newUser.kyc_status,
        profilePicture: newUser.profile_picture,
      },
    });
  } catch (err) {
    console.error('Google auth error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET CURRENT USER — protected
// GET /api/auth/me
// ─────────────────────────────────────────────────────────────────────────────
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { data: user, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', req.userId)
      .single();
    if (error || !user) return res.status(404).json({ error: 'User profile not found' });

    // Count completed trips (as rider: confirmed bookings; as driver: completed rides)
    const [{ count: riderTrips }, { count: driverTrips }] = await Promise.all([
      supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('rider_id', req.userId)
        .eq('status', 'confirmed'),
      supabase
        .from('rides')
        .select('id', { count: 'exact', head: true })
        .eq('driver_id', req.userId)
        .eq('status', 'completed'),
    ]);

    return res.json({
      id: user.id,
      email: user.email,
      phone: user.phone,
      firstName: user.first_name,
      lastName: user.last_name,
      surname: user.surname,
      role: user.role,
      kycStatus: user.kyc_status,
      profilePicture: user.profile_picture,
      address: user.address,
      preferences: user.preferences ?? {},
      trips: (riderTrips ?? 0) + (driverTrips ?? 0),
      memberSince: user.created_at,
      rating: user.ratings,
    });
  } catch (err) {
    console.error('Get user error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE PREFERENCES — protected
// PUT /api/auth/preferences
// Body: { ac?, music?, pets?, smoking?, autoAccept? }
// ─────────────────────────────────────────────────────────────────────────────
router.put('/preferences', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { error: validationError, value } = preferencesSchema.validate(req.body);
    if (validationError) return res.status(400).json({ error: validationError.details[0].message });

    // Fetch current preferences and merge
    const { data: user, error: fetchError } = await supabase
      .from('profiles')
      .select('preferences')
      .eq('id', req.userId)
      .single();

    if (fetchError || !user) return res.status(404).json({ error: 'User not found' });

    const merged = { ...(user.preferences ?? {}), ...value };

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ preferences: merged })
      .eq('id', req.userId);

    if (updateError) return res.status(500).json({ error: 'Failed to update preferences' });

    return res.json({ message: 'Preferences updated successfully', preferences: merged });
  } catch (err) {
    console.error('Update preferences error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SWITCH ROLE — protected
// POST /api/auth/role
// Body: { role: 'rider' | 'driver' }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/role', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { error: validationError, value } = roleSchema.validate(req.body);
    if (validationError) return res.status(400).json({ error: validationError.details[0].message });

    const { role } = value;

    // If switching to driver, check KYC status
    if (role === 'driver') {
      const { data: user } = await supabase
        .from('profiles')
        .select('kyc_status')
        .eq('id', req.userId)
        .single();
      if (!user || user.kyc_status !== 'verified') {
        return res.status(403).json({ error: 'KYC verification is required before switching to driver mode' });
      }
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', req.userId);

    if (updateError) return res.status(500).json({ error: 'Failed to update role' });

    return res.json({ message: `Role switched to ${role} successfully`, role });
  } catch (err) {
    console.error('Switch role error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// EDIT PROFILE — protected
// PUT /api/auth/profile
// Editable: address fields + profile picture.
// Locked (contact support): name, email, phone.
// ─────────────────────────────────────────────────────────────────────────────
router.put('/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { error: validationError, value } = editProfileSchema.validate(req.body);
    if (validationError) return res.status(400).json({ error: validationError.details[0].message });

    const { firstName, lastName, phone, street, city, state, localGovt, ward, houseNumber, profilePicture } = value;

    // Fetch current profile to merge address (partial updates supported)
    const { data: user, error: fetchError } = await supabase
      .from('profiles')
      .select('address, profile_picture')
      .eq('id', req.userId)
      .single();

    if (fetchError || !user) return res.status(404).json({ error: 'User not found' });

    // Merge new address fields over the stored address object
    const currentAddress = (user.address as Record<string, string>) ?? {};
    const updatedAddress: Record<string, string> = {
      ...currentAddress,
      ...(street      !== undefined && { street }),
      ...(city        !== undefined && { city }),
      ...(state       !== undefined && { state }),
      ...(localGovt   !== undefined && { localGovt }),
      ...(ward        !== undefined && { ward }),
      ...(houseNumber !== undefined && { houseNumber }),
    };

    const updatePayload: Record<string, unknown> = { address: updatedAddress };
    if (profilePicture !== undefined) updatePayload.profile_picture = profilePicture;
    if (req.user?.role === 'admin') {
      if (firstName !== undefined) updatePayload.first_name = firstName;
      if (lastName !== undefined) updatePayload.last_name = lastName;
      if (phone !== undefined) updatePayload.phone = phone;
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', req.userId);

    if (updateError) return res.status(500).json({ error: 'Failed to update profile' });

    return res.json({
      message: 'Profile updated successfully',
      address: updatedAddress,
      ...(profilePicture !== undefined && { profilePicture }),
      ...(firstName !== undefined && { firstName }),
      ...(lastName !== undefined && { lastName }),
      ...(phone !== undefined && { phone }),
    });
  } catch (err) {
    console.error('Edit profile error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
