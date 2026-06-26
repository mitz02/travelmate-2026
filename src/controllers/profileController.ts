import { Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { query, queryOne } from '../config/database';
import { AuthenticatedRequest } from '../types';
import type { UpdateProfileBody } from '../validators/profile';

export async function getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.params.userId === 'me' ? req.user?.id : req.params.userId;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const profile = await queryOne('SELECT * FROM profiles WHERE user_id = $1', [userId]);
    if (!profile) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }
    res.json({ profile });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.params.userId === 'me' ? req.user?.id : req.params.userId;
    if (!req.user || req.user.id !== userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    const body = req.body as UpdateProfileBody;
    const sets: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (body.phone !== undefined) { sets.push(`phone = $${idx++}`); params.push(body.phone); }
    if (body.avatar !== undefined) { sets.push(`avatar_url = $${idx++}`); params.push(body.avatar); }

    if (sets.length === 0) {
      const profile = await queryOne('SELECT * FROM profiles WHERE user_id = $1', [userId]);
      res.json({ profile });
      return;
    }

    sets.push(`updated_at = NOW()`);
    params.push(userId);
    const profile = await queryOne(
      `UPDATE profiles SET ${sets.join(', ')} WHERE user_id = $${idx} RETURNING *`,
      params,
    );
    if (!profile) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }
    res.json({ profile });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function uploadAvatar(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.params.userId === 'me' ? req.user?.id : req.params.userId;
    if (!req.user || req.user.id !== userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'No image file provided' });
      return;
    }
    const ext = file.originalname.split('.').pop() || 'jpg';
    const path = `avatars/${userId}/${Date.now()}.${ext}`;
    const { data: upload, error: uploadError } = await supabaseAdmin.storage
      .from('avatars')
      .upload(path, file.buffer, { contentType: file.mimetype, upsert: true });
    if (uploadError) {
      res.status(400).json({ error: uploadError.message });
      return;
    }
    const { data: urlData } = supabaseAdmin.storage.from('avatars').getPublicUrl(upload.path);
    const avatarUrl = urlData.publicUrl;
    await supabaseAdmin.from('profiles').update({
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    }).eq('user_id', userId);
    res.json({ avatarUrl });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getRating(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.params.userId === 'me' ? req.user?.id : req.params.userId;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const profile = await queryOne('SELECT rating, total_ratings FROM profiles WHERE user_id = $1', [userId]);
    const rating = profile?.rating ?? 0;
    const totalRatings = profile?.total_ratings ?? 0;
    res.json({ rating, totalRatings });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getStats(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.params.userId === 'me' ? req.user?.id : req.params.userId;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const profile = await queryOne('SELECT trips_count, earnings_total, rating FROM profiles WHERE user_id = $1', [userId]);
    if (!profile) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    const activeRides = await query('SELECT id FROM rides WHERE driver_id = $1 AND status = $2', [userId, 'active']);

    let pendingRequests = 0;
    if (activeRides && activeRides.length > 0) {
      const rideIds = activeRides.map((r: any) => r.id);
      const pendingBookings = await query('SELECT id FROM bookings WHERE ride_id = ANY($1::uuid[]) AND status = $2', [rideIds, 'pending']);
      pendingRequests = pendingBookings?.length ?? 0;
    }

    res.json({
      trips: profile.trips_count ?? 0,
      earnings: profile.earnings_total ?? 0,
      rating: profile.rating ?? 0,
      pendingRequests,
    });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getNotificationSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.params.userId === 'me' ? req.user?.id : req.params.userId;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const profile = await queryOne('SELECT notification_settings FROM profiles WHERE user_id = $1', [userId]);
      
    if (!profile) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }
    
    const defaultSettings = {
      push: true, email: true, sms: false,
      paymentReceived: true, paymentRefunded: true, walletUpdates: true, withdrawalStatus: true,
      newMessages: true, missedCalls: true,
      driverArrival: true, tripStarted: true, tripCompleted: true,
      bookingRequests: true, bookingConfirmed: true, bookingCancelled: true, riderNoShow: true,
      tripReminders: true, tripUpdates: true
    };
    
    const settings = profile?.notification_settings || defaultSettings;
    res.json({ settings });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateNotificationSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.params.userId === 'me' ? req.user?.id : req.params.userId;
    if (!req.user || req.user.id !== userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    
    const newSettings = req.body.settings;
    const profile = await queryOne(
      `UPDATE profiles SET notification_settings = $1::jsonb, updated_at = NOW() WHERE user_id = $2 RETURNING notification_settings`,
      [JSON.stringify(newSettings), userId],
    );
    if (!profile) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }
    res.json({ settings: profile.notification_settings });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
