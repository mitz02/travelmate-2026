import { Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { AuthenticatedRequest } from '../types';

export async function getUserActivity(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const userId = req.user.id;

    const { data: bookingStats, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .select('total_amount')
      .eq('rider_id', userId)
      .eq('status', 'completed');

    if (bookingError) {
      res.status(400).json({ error: bookingError.message });
      return;
    }

    const completedBookings = bookingStats?.length ?? 0;
    const totalSpent = (bookingStats ?? []).reduce((sum: number, b: any) => sum + (Number(b.total_amount) || 0), 0);

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('rating')
      .eq('user_id', userId)
      .single();

    const averageRating = profile?.rating ?? 0;

    res.json({ completedBookings, totalSpent, averageRating });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getUserActivityFeed(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const userId = req.user.id;

    const { data: rides, error: ridesError } = await supabaseAdmin
      .from('rides')
      .select('*')
      .eq('driver_id', userId);

    if (ridesError) {
      res.status(400).json({ error: ridesError.message });
      return;
    }

    if (!rides || rides.length === 0) {
      res.json({ feed: [] });
      return;
    }

    const rideIds = (rides as any[]).map(r => r.id);

    const { data: bookings, error: bookingsError } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .in('ride_id', rideIds)
      .order('updated_at', { ascending: false })
      .limit(30);

    if (bookingsError) {
      res.status(400).json({ error: bookingsError.message });
      return;
    }

    const feed: ActivityFeedItem[] = [];
    const rideMap = new Map((rides as any[]).map(r => [r.id, r]));

    if (bookings) {
      for (const bRaw of bookings as any[]) {
        const ride = rideMap.get(bRaw.ride_id);
        const route = ride ? `${ride.from} → ${ride.to}` : 'a trip';

        feed.push({
          id: `booking-created-${bRaw.id}`,
          kind: 'booking_created',
          text: `New booking for ${route}`,
          time: bRaw.created_at,
          icon: 'users',
          color: '#4F46E5',
        });

        if (bRaw.status === 'confirmed' || bRaw.status === 'paid') {
          feed.push({
            id: `booking-paid-${bRaw.id}`,
            kind: 'booking_paid',
            text: `Payment confirmed for ${route} - N${Number(bRaw.total_amount).toLocaleString()}`,
            time: bRaw.updated_at || bRaw.created_at,
            icon: 'credit-card',
            color: '#059669',
          });
        }

        if (bRaw.status === 'in_progress') {
          feed.push({
            id: `booking-pickup-${bRaw.id}`,
            kind: 'booking_pickup',
            text: `Rider picked up for ${route}`,
            time: bRaw.pickup_confirmed_at || bRaw.updated_at,
            icon: 'check',
            color: '#D97706',
          });
        }

        if (bRaw.status === 'completed') {
          feed.push({
            id: `booking-dropoff-${bRaw.id}`,
            kind: 'booking_dropoff',
            text: `Rider dropped off - N${Number(bRaw.total_amount).toLocaleString()} earned for ${route}`,
            time: bRaw.dropoff_confirmed_at || bRaw.updated_at,
            icon: 'check',
            color: '#10B981',
          });
        } else if (bRaw.status === 'cancelled') {
          feed.push({
            id: `booking-cancelled-${bRaw.id}`,
            kind: 'booking_cancelled',
            text: `Booking cancelled for ${route}`,
            time: bRaw.updated_at,
            icon: 'x',
            color: '#EF4444',
          });
        }
      }
    }

    // Fetch recent reviews (ratings) from the reviews table
    const { data: reviews } = await supabaseAdmin
      .from('reviews')
      .select('*')
      .eq('reviewee_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)
      .catch(() => ({ data: null }));

    if (reviews) {
      for (const rRaw of reviews as any[]) {
        feed.push({
          id: `rating-${rRaw.id}`,
          kind: 'rating_received',
          text: `Received ${rRaw.rating}★ rating${rRaw.comment ? ': "' + rRaw.comment.substring(0, 60) + '"' : ''}`,
          time: rRaw.created_at,
          icon: 'trending-up',
          color: '#8B5CF6',
        });
      }
    }

    feed.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    res.json({ feed: feed.slice(0, 20) });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

interface ActivityFeedItem {
  id: string;
  kind: string;
  text: string;
  time: string;
  icon: string;
  color: string;
}
