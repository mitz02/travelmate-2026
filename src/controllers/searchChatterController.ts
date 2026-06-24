import { Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { AuthenticatedRequest } from '../types';
import type { CreateRequestBody, MakeOfferBody } from '../validators/searchChatter';

export async function createRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const body = req.body as CreateRequestBody;
    const { data: request, error } = await supabaseAdmin
      .from('search_chatter_requests')
      .insert({
        user_id: req.user.id,
        origin: body.origin,
        destination: body.destination,
        date: body.date,
        seats: body.seats,
        max_price: body.maxPrice ?? null,
        status: 'active',
      })
      .select()
      .single();
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(201).json({ request });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getActiveRequests(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { origin, dest } = req.query;
    let q = supabaseAdmin
      .from('search_chatter_requests')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    if (origin) q = q.ilike('origin', String(origin));
    if (dest) q = q.ilike('destination', String(dest));
    const { data: requests, error } = await q;
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.json({ requests: requests ?? [] });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function makeOffer(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const requestId = req.params.requestId;
    const body = req.body as MakeOfferBody;
    const { data: request, error: reqError } = await supabaseAdmin
      .from('search_chatter_requests')
      .select('*')
      .eq('id', requestId)
      .eq('status', 'active')
      .single();
    if (reqError || !request) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }
    if (request.user_id === req.user.id) {
      res.status(400).json({ error: 'Cannot offer on your own request' });
      return;
    }
    const { data: offer, error } = await supabaseAdmin
      .from('search_chatter_offers')
      .insert({
        request_id: requestId,
        driver_id: req.user.id,
        price: body.price,
        departure_time: body.departureTime,
        vehicle_id: body.vehicleId,
        status: 'pending',
      })
      .select()
      .single();
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(201).json({ offer });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getOffers(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const requestId = req.params.requestId;
    const { data: offers, error } = await supabaseAdmin
      .from('search_chatter_offers')
      .select('*')
      .eq('request_id', requestId)
      .order('created_at', { ascending: false });
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.json({ offers: offers ?? [] });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function acceptOffer(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const offerId = req.params.offerId;
    const { data: offer, error: offerError } = await supabaseAdmin
      .from('search_chatter_offers')
      .select('*')
      .eq('id', offerId)
      .eq('status', 'pending')
      .single();
    if (offerError || !offer) {
      res.status(404).json({ error: 'Offer not found' });
      return;
    }
    const { data: request, error: reqError } = await supabaseAdmin
      .from('search_chatter_requests')
      .select('*')
      .eq('id', offer.request_id)
      .single();
    if (reqError || !request) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }
    if (request.user_id !== req.user.id) {
      res.status(403).json({ error: 'Only the request owner can accept' });
      return;
    }
    const { data: ride, error: rideError } = await supabaseAdmin
      .from('rides')
      .insert({
        driver_id: offer.driver_id,
        from: request.origin,
        to: request.destination,
        departure_time: offer.departure_time,
        available_seats: request.seats,
        price_per_seat: offer.price,
        vehicle_id: offer.vehicle_id,
        status: 'active',
        preferences: {},
      })
      .select()
      .single();
    if (rideError || !ride) {
      res.status(400).json({ error: 'Failed to create ride' });
      return;
    }
    const { data: booking } = await supabaseAdmin
      .from('bookings')
      .insert({
        ride_id: ride.id,
        rider_id: req.user.id,
        seats: request.seats,
        payment_method: 'pending',
        status: 'confirmed',
        total_amount: offer.price * request.seats,
      })
      .select()
      .single();
    await supabaseAdmin
      .from('search_chatter_offers')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', offerId);
    await supabaseAdmin
      .from('search_chatter_requests')
      .update({ status: 'fulfilled', updated_at: new Date().toISOString() })
      .eq('id', offer.request_id);
    res.json({ booking: booking ?? { ride, seats: request.seats } });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function rejectOffer(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const offerId = req.params.offerId;
    const { data: offer, error: offerError } = await supabaseAdmin
      .from('search_chatter_offers')
      .select('*')
      .eq('id', offerId)
      .eq('status', 'pending')
      .single();
    if (offerError || !offer) {
      res.status(404).json({ error: 'Offer not found' });
      return;
    }
    const { data: request } = await supabaseAdmin
      .from('search_chatter_requests')
      .select('user_id')
      .eq('id', offer.request_id)
      .single();
    if (!request || request.user_id !== req.user.id) {
      res.status(403).json({ error: 'Only the request owner can reject' });
      return;
    }
    const { error } = await supabaseAdmin
      .from('search_chatter_offers')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', offerId);
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const requestId = req.params.requestId;
    const { data: request, error: fetchError } = await supabaseAdmin
      .from('search_chatter_requests')
      .select('user_id')
      .eq('id', requestId)
      .single();
    if (fetchError || !request) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }
    if (request.user_id !== req.user.id) {
      res.status(403).json({ error: 'Only the request owner can delete' });
      return;
    }
    const { error } = await supabaseAdmin.from('search_chatter_requests').delete().eq('id', requestId);
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
