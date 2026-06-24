import { Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { AuthenticatedRequest } from '../types';
import type { StartTrackingBody, UpdateLocationBody, DeviationBody } from '../validators/tracking';

export async function startTracking(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const bookingId = req.params.bookingId;
    const body = req.body as StartTrackingBody;
    const { data: tracking, error } = await supabaseAdmin
      .from('tracking_sessions')
      .insert({
        booking_id: bookingId,
        driver_id: req.user.id,
        status: 'active',
        last_lat: body.driverLocation.lat,
        last_lng: body.driverLocation.lng,
        last_updated_at: body.driverLocation.timestamp ?? new Date().toISOString(),
      })
      .select()
      .single();
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    await supabaseAdmin.from('tracking_locations').insert({
      tracking_id: tracking.id,
      lat: body.driverLocation.lat,
      lng: body.driverLocation.lng,
      timestamp: body.driverLocation.timestamp ?? new Date().toISOString(),
    });
    res.status(201).json({ trackingId: tracking.id, status: tracking.status });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateLocation(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const trackingId = req.params.trackingId;
    const body = req.body as UpdateLocationBody;
    const ts = body.timestamp ?? new Date().toISOString();
    await supabaseAdmin.from('tracking_locations').insert({
      tracking_id: trackingId,
      lat: body.lat,
      lng: body.lng,
      timestamp: ts,
    });
    await supabaseAdmin
      .from('tracking_sessions')
      .update({
        last_lat: body.lat,
        last_lng: body.lng,
        last_updated_at: ts,
        updated_at: new Date().toISOString(),
      })
      .eq('id', trackingId)
      .eq('driver_id', req.user.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getLiveLocation(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const bookingId = req.params.bookingId;
    const { data: session, error } = await supabaseAdmin
      .from('tracking_sessions')
      .select('*')
      .eq('booking_id', bookingId)
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();
    if (error || !session) {
      res.status(404).json({ error: 'No active tracking' });
      return;
    }
    res.json({
      driverLocation: {
        lat: session.last_lat,
        lng: session.last_lng,
        timestamp: session.last_updated_at,
      },
      eta: null,
      route: null,
    });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getLocationHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const bookingId = req.params.bookingId;
    const { data: session } = await supabaseAdmin
      .from('tracking_sessions')
      .select('id')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    if (!session) {
      res.json({ locations: [] });
      return;
    }
    const { data: locations, error } = await supabaseAdmin
      .from('tracking_locations')
      .select('lat, lng, timestamp')
      .eq('tracking_id', session.id)
      .order('timestamp', { ascending: true });
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.json({ locations: locations ?? [] });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function endTracking(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const bookingId = req.params.bookingId;
    const { data: session, error: fetchError } = await supabaseAdmin
      .from('tracking_sessions')
      .select('*')
      .eq('booking_id', bookingId)
      .eq('driver_id', req.user.id)
      .eq('status', 'active')
      .single();
    if (fetchError || !session) {
      res.status(404).json({ error: 'No active tracking' });
      return;
    }
    await supabaseAdmin
      .from('tracking_sessions')
      .update({ status: 'ended', updated_at: new Date().toISOString() })
      .eq('id', session.id);
    res.json({
      summary: { status: 'ended' },
      distance: null,
    });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function reportDeviation(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const body = req.body as DeviationBody;
    const { data: alert, error } = await supabaseAdmin
      .from('tracking_deviations')
      .insert({
        booking_id: body.bookingId,
        reason: body.reason,
        status: 'reported',
      })
      .select()
      .single();
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(201).json({ alert });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function calculateEta(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { origin, destination } = req.query;
    if (!origin || !destination) {
      res.status(400).json({ error: 'origin and destination required' });
      return;
    }
    // Placeholder: integrate with maps API (Google, Mapbox, etc.)
    res.json({
      duration: 0,
      distance: 0,
    });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
