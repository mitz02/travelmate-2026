import express, { Router, Response } from 'express';
import { supabase } from '../services/supabase';
import { AuthRequest } from '../middleware/auth';

const router: Router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/user/activity — Authenticated user's stats for the home dashboard
// Returns: totalBookings, completedBookings, averageRating, totalRides
// ─────────────────────────────────────────────────────────────────────────────
router.get('/activity', async (req: AuthRequest, res: Response) => {
  try {
    const [
      { count: totalBookings, error: bError },
      { count: completedBookings, error: cbError },
      { count: totalRides, error: rError },
      { count: activeDriverRides, error: aError },
      { data: profile, error: pError },
    ] = await Promise.all([
      // All bookings as a rider
      supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('rider_id', req.userId),

      // Completed bookings as a rider
      supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('rider_id', req.userId)
        .eq('status', 'completed'),

      // Rides driven (as driver)
      supabase
        .from('rides')
        .select('*', { count: 'exact', head: true })
        .eq('driver_id', req.userId)
        .eq('status', 'completed'),

      // Profile for rating
      supabase
        .from('profiles')
        .select('ratings')
        .eq('id', req.userId)
        .single(),

      // Active rides as driver
      supabase
        .from('rides')
        .select('*', { count: 'exact', head: true })
        .eq('driver_id', req.userId)
        .in('status', ['open', 'active']),
    ]);

    if (bError) throw bError;
    if (cbError) throw cbError;
    if (rError) throw rError;
    if (aError) throw aError;
    if (pError) throw pError;

    return res.json({
      totalBookings: totalBookings ?? 0,
      completedBookings: completedBookings ?? 0,
      averageRating: (profile as any)?.ratings ?? 5.0,
      totalRides: totalRides ?? 0,
      activeDriverRides: activeDriverRides ?? 0,
    });
  } catch (err) {
    console.error('User activity error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/user/fcm-token — Register or update FCM device token
// ─────────────────────────────────────────────────────────────────────────────
router.post('/fcm-token', async (req: AuthRequest, res: Response) => {
  try {
    const { token, deviceType } = req.body;
    if (!token) return res.status(400).json({ error: 'FCM token is required' });

    // Upsert the token for this user
    const { error } = await supabase
      .from('user_fcm_tokens')
      .upsert(
        { user_id: req.userId, token, device_type: deviceType, updated_at: new Date().toISOString() },
        { onConflict: 'user_id, token' }
      );

    if (error) throw error;
    return res.json({ message: 'Token registered successfully' });
  } catch (err) {
    console.error('FCM token registration error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/user/notifications — Fetch user notification history
// ─────────────────────────────────────────────────────────────────────────────
router.get('/notifications', async (req: AuthRequest, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return res.json({ notifications: data || [] });
  } catch (err) {
    console.error('Fetch notifications error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/user/notifications/read-all — Mark all notifications as read
// ─────────────────────────────────────────────────────────────────────────────
router.put('/notifications/read-all', async (req: AuthRequest, res: Response) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', req.userId)
      .eq('is_read', false);

    if (error) throw error;
    return res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    console.error('Mark all notifications read error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/user/notifications/:id/read — Mark notification as read
// ─────────────────────────────────────────────────────────────────────────────
router.put('/notifications/:id/read', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', req.userId);

    if (error) throw error;
    return res.json({ message: 'Notification marked as read' });
  } catch (err) {
    console.error('Mark notification read error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/user/activity-feed — Real-time activity feed for dashboard
// Returns recent bookings on the driver's rides, transactions, and
// notifications combined and sorted chronologically.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/activity-feed', async (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 30);

    // 1. Recent bookings on the user's rides (as a driver)
    const { data: driverBookings } = await supabase
      .from('bookings')
      .select(`
        id,
        status,
        seats_booked,
        total_price,
        created_at,
        rider:rider_id(first_name, last_name),
        rides!inner(from, to, driver_id)
      `)
      .eq('rides.driver_id', req.userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    // 2. Recent transactions (payments, refunds, withdrawals)
    const { data: transactions } = await supabase
      .from('transactions')
      .select('id, type, amount, status, description, created_at')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    // 3. Recent notifications
    const { data: notifications } = await supabase
      .from('notifications')
      .select('id, title, body, type, created_at')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Build unified feed
    const feed: Array<{
      id: string;
      kind: string;
      text: string;
      time: string;
      icon: string;
      color: string;
    }> = [];

    (driverBookings || []).forEach((b: any) => {
      const rider = Array.isArray(b.rider) ? b.rider[0] : b.rider;
      const ride = Array.isArray(b.rides) ? b.rides[0] : b.rides;
      const riderName = rider
        ? `${rider.first_name} ${rider.last_name}`
        : 'A passenger';
      const route = ride ? `${ride.from} → ${ride.to}` : '';

      if (b.status === 'confirmed' || b.status === 'pending') {
        feed.push({
          id: `booking-${b.id}`,
          kind: 'booking',
          text: `${riderName} booked ${b.seats_booked} seat(s) on ${route}`,
          time: b.created_at,
          icon: 'users',
          color: '#3B82F6',
        });
      } else if (b.status === 'completed') {
        feed.push({
          id: `completed-${b.id}`,
          kind: 'completed',
          text: `Ride completed: ${route}`,
          time: b.created_at,
          icon: 'check',
          color: '#10B981',
        });
      } else if (b.status === 'cancelled') {
        feed.push({
          id: `cancelled-${b.id}`,
          kind: 'cancelled',
          text: `${riderName} cancelled booking on ${route}`,
          time: b.created_at,
          icon: 'x',
          color: '#EF4444',
        });
      }
    });

    (transactions || []).forEach((t: any) => {
      if (t.type === 'payment' && t.status === 'completed') {
        feed.push({
          id: `tx-${t.id}`,
          kind: 'payment',
          text: `Payment received: ₦${t.amount.toLocaleString()}`,
          time: t.created_at,
          icon: 'credit-card',
          color: '#8B5CF6',
        });
      } else if (t.type === 'withdrawal') {
        feed.push({
          id: `tx-${t.id}`,
          kind: 'withdrawal',
          text: `Withdrawal ${t.status}: ₦${t.amount.toLocaleString()}`,
          time: t.created_at,
          icon: 'trending-up',
          color: '#F59E0B',
        });
      }
    });

    (notifications || []).forEach((n: any) => {
      // Avoid duplicating booking notifications we already show
      if (n.type === 'booking') return;
      feed.push({
        id: `notif-${n.id}`,
        kind: 'notification',
        text: n.title || n.body,
        time: n.created_at,
        icon: 'bell',
        color: '#6366F1',
      });
    });

    // Sort by time descending and limit
    feed.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    return res.json({ feed: feed.slice(0, limit) });
  } catch (err) {
    console.error('Activity feed error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
