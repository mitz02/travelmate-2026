import { Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { query, queryOne } from '../config/database';
import { AuthenticatedRequest } from '../types';
import type { UpdateProfileBody, AddVehicleBody, UpdateVehicleBody } from '../validators/profile';

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
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.fullName !== undefined) updates.full_name = body.fullName;
    if (body.phone !== undefined) updates.phone = body.phone;
    if (body.avatar !== undefined) updates.avatar_url = body.avatar;

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) {
      res.status(400).json({ error: error.message });
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

export async function getVehicles(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.params.userId === 'me' ? req.user?.id : req.params.userId;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const vehicles = await query('SELECT * FROM vehicles WHERE user_id = $1 ORDER BY is_primary DESC', [userId]);
    res.json({ vehicles: vehicles ?? [] });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function addVehicle(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.params.userId === 'me' ? req.user?.id : req.params.userId;
    if (!req.user || req.user.id !== userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    const body = req.body as AddVehicleBody;
    const vehicles = await query('SELECT id FROM vehicles WHERE user_id = $1', [userId]);
    const isFirst = !vehicles?.length;
    const { data: vehicle, error } = await supabaseAdmin
      .from('vehicles')
      .insert({
        user_id: userId,
        make: body.make,
        model: body.model,
        year: body.year,
        color: body.color ?? null,
        plate: body.plate ?? null,
        capacity: body.capacity,
        is_primary: isFirst,
      })
      .select()
      .single();
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(201).json({ vehicle });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateVehicle(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.params.userId === 'me' ? req.user?.id : req.params.userId;
    const vehicleId = req.params.vehicleId;
    if (!req.user || req.user.id !== userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    const body = req.body as UpdateVehicleBody;
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.make !== undefined) updates.make = body.make;
    if (body.model !== undefined) updates.model = body.model;
    if (body.year !== undefined) updates.year = body.year;
    if (body.color !== undefined) updates.color = body.color;
    if (body.plate !== undefined) updates.plate = body.plate;
    if (body.capacity !== undefined) updates.capacity = body.capacity;

    const { data: vehicle, error } = await supabaseAdmin
      .from('vehicles')
      .update(updates)
      .eq('id', vehicleId)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    if (!vehicle) {
      res.status(404).json({ error: 'Vehicle not found' });
      return;
    }
    res.json({ vehicle });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteVehicle(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.params.userId === 'me' ? req.user?.id : req.params.userId;
    const vehicleId = req.params.vehicleId;
    if (!req.user || req.user.id !== userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    const { error } = await supabaseAdmin
      .from('vehicles')
      .delete()
      .eq('id', vehicleId)
      .eq('user_id', userId);
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function setPrimaryVehicle(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.params.userId === 'me' ? req.user?.id : req.params.userId;
    const vehicleId = req.params.vehicleId;
    if (!req.user || req.user.id !== userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    await supabaseAdmin.from('vehicles').update({ is_primary: false }).eq('user_id', userId);
    const { data: vehicle, error } = await supabaseAdmin
      .from('vehicles')
      .update({ is_primary: true, updated_at: new Date().toISOString() })
      .eq('id', vehicleId)
      .eq('user_id', userId)
      .select()
      .single();
    if (error || !vehicle) {
      res.status(404).json({ error: 'Vehicle not found' });
      return;
    }
    res.json({ success: true });
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
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .update({ notification_settings: newSettings, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .select('notification_settings')
      .single();
      
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.json({ settings: profile.notification_settings });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
