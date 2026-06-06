import express, { Router, Response } from 'express';
import Joi from 'joi';
import { supabase } from '../services/supabase';
import { AuthRequest } from '../middleware/auth';
import { NotificationService } from '../services/notification';

const router: Router = express.Router();

const statusSchema = Joi.object({
  status: Joi.string().valid('active', 'suspended', 'banned').required(),
});

const kycResolveSchema = Joi.object({
  action: Joi.string().valid('approve', 'reject').required(),
  reason: Joi.string().when('action', { is: 'reject', then: Joi.required(), otherwise: Joi.optional() }),
});

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD STATS
// ─────────────────────────────────────────────────────────────────────────────
router.get('/stats', async (_req: AuthRequest, res: Response) => {
  try {
    const [
      { count: usersCount },
      { count: activeRidesCount },
      { count: pendingKycCount },
      { data: transactions }
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('rides').select('*', { count: 'exact', head: true }).eq('status', 'open'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('kyc_status', 'pending'),
      supabase.from('transactions').select('amount').eq('type', 'payout').eq('status', 'completed')
    ]);

    const totalEarnings = transactions?.reduce((acc, tx) => acc + Number(tx.amount), 0) || 0;
    // Assuming platform takes a 10% fee (example logic, adjust based on actual business rules)
    const platformRevenue = totalEarnings * 0.10;

    return res.json({
      totalUsers: usersCount || 0,
      activeRides: activeRidesCount || 0,
      pendingKyc: pendingKycCount || 0,
      totalPayouts: totalEarnings,
      estimatedRevenue: platformRevenue,
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────────────────────────────────────
router.get('/users', async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 50, search } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabase
      .from('profiles')
      .select('id, email, first_name, last_name, role, kyc_status, account_status, created_at', { count: 'exact' });

    if (search) {
      query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
    }

    const { data: users, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (error) throw error;

    return res.json({
      users,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count,
        totalPages: count ? Math.ceil(count / Number(limit)) : 0
      }
    });
  } catch (err) {
    console.error('Admin list users error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/users/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const [
      { data: profile, error: profileError },
      { data: wallet },
      { data: recentRides },
      { data: recentTransactions }
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', id).single(),
      supabase.from('wallets').select('*').eq('user_id', id).single(),
      supabase.from('rides').select('*').eq('driver_id', id).order('created_at', { ascending: false }).limit(5),
      supabase.from('transactions').select('*').eq('user_id', id).order('created_at', { ascending: false }).limit(10)
    ]);

    if (profileError || !profile) return res.status(404).json({ error: 'User not found' });

    return res.json({
      profile,
      wallet,
      recentRides: recentRides || [],
      recentTransactions: recentTransactions || []
    });
  } catch (err) {
    console.error('Admin get user error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/users/:id/status', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { error: validationError, value } = statusSchema.validate(req.body);
    if (validationError) return res.status(400).json({ error: validationError.details[0].message });

    // Prevent suspending self
    if (id === req.userId) {
      return res.status(400).json({ error: 'You cannot change your own account status' });
    }

    const { error } = await supabase
      .from('profiles')
      .update({ account_status: value.status })
      .eq('id', id);

    if (error) throw error;

    return res.json({ message: `User account status updated to ${value.status}` });
  } catch (err) {
    console.error('Admin user status error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// KYC MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────
router.get('/kyc', async (req: AuthRequest, res: Response) => {
  try {
    const { search } = req.query;
    let query = supabase
      .from('profiles')
      .select('id, first_name, last_name, email, kyc_status, kyc_data, created_at')
      .eq('kyc_status', 'pending');

    if (search) {
      query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
    }

    const { data: submissions, error } = await query
      .order('created_at', { ascending: true });

    if (error) throw error;
    return res.json({ submissions });
  } catch (err) {
    console.error('Admin list KYC error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/kyc/:id/resolve', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { error: validationError, value } = kycResolveSchema.validate(req.body);
    if (validationError) return res.status(400).json({ error: validationError.details[0].message });

    const newStatus = value.action === 'approve' ? 'verified' : 'rejected';

    const { error } = await supabase
      .from('profiles')
      .update({ 
        kyc_status: newStatus,
        kyc_data: value.action === 'reject' 
          ? { reason: value.reason, rejectedAt: new Date().toISOString() } 
          // If approved, keep existing data but mark as approved
          : undefined 
      })
      .eq('id', id);

    if (error) throw error;

    return res.json({ message: `KYC submission ${newStatus}` });
  } catch (err) {
    console.error('Admin resolve KYC error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// RIDES & BOOKINGS
// ─────────────────────────────────────────────────────────────────────────────
router.get('/rides', async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 50, status, search } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabase
      .from('rides')
      .select('*, driver:driver_id(first_name, last_name, email)', { count: 'exact' });

    if (status) query = query.eq('status', status);
    if (search) {
      query = query.or(`from.ilike.%${search}%,to.ilike.%${search}%`);
    }

    const { data: rides, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (error) throw error;

    // If there's a search term, also filter by driver name client-side
    // (Supabase doesn't support cross-table ilike in .or())
    let filteredRides = rides || [];
    if (search) {
      const s = String(search).toLowerCase();
      filteredRides = filteredRides.filter((r: any) => {
        const driver = Array.isArray(r.driver) ? r.driver[0] : r.driver;
        const driverName = driver ? `${driver.first_name} ${driver.last_name} ${driver.email}`.toLowerCase() : '';
        const route = `${r.from} ${r.to}`.toLowerCase();
        return driverName.includes(s) || route.includes(s);
      });
    }

    return res.json({
      rides: filteredRides,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count,
        totalPages: count ? Math.ceil(count / Number(limit)) : 0
      }
    });
  } catch (err) {
    console.error('Admin list rides error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/rides/:id/cancel', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const { data: ride, error: rideError } = await supabase.from('rides').select('status').eq('id', id).single();
    if (rideError || !ride) return res.status(404).json({ error: 'Ride not found' });
    if (ride.status !== 'open') return res.status(400).json({ error: 'Only open rides can be cancelled' });

    await supabase.from('rides').update({ status: 'cancelled' }).eq('id', id);

    // Refund confirmed bookings
    const { data: bookings } = await supabase
      .from('bookings')
      .select('id, rider_id, total_price, escrow_id')
      .eq('ride_id', id)
      .eq('status', 'confirmed');

    if (bookings?.length) {
      for (const b of bookings) {
        await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', b.id);
        if (b.escrow_id) {
          await supabase.from('escrows').update({ status: 'refunded', resolution_notes: `Admin cancellation: ${reason || 'No reason provided'}` }).eq('id', b.escrow_id);
        }

        await supabase.from('transactions').insert([{
          user_id: b.rider_id,
          type: 'refund',
          amount: b.total_price,
          status: 'completed',
          description: `Admin refunded cancelled ride: ${reason ?? 'No reason provided'}`,
        }]);

        const { data: wallet } = await supabase.from('wallets').select('balance, held_amount').eq('user_id', b.rider_id).single();
        if (wallet) {
          await supabase.from('wallets').update({ 
            balance: wallet.balance + b.total_price, 
            held_amount: wallet.held_amount - b.total_price 
          }).eq('user_id', b.rider_id);
        }
      }
    }

    return res.json({ message: 'Ride forcefully cancelled and users refunded', refundedCount: bookings?.length ?? 0 });
  } catch (err) {
    console.error('Admin cancel ride error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// BOOKINGS
// ─────────────────────────────────────────────────────────────────────────────
router.get('/bookings', async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 50, status, search } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabase
      .from('bookings')
      .select('*, passenger:rider_id(first_name, last_name, email), ride:ride_id(from, to, departure_time, price_per_seat, driver:driver_id(first_name, last_name, email))', { count: 'exact' });

    if (status) query = query.eq('status', status);

    const { data: bookings, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (error) throw error;

    // Filter by search term across passenger name, email, and route
    let filteredBookings = bookings || [];
    if (search) {
      const s = String(search).toLowerCase();
      filteredBookings = filteredBookings.filter((b: any) => {
        const passenger = Array.isArray(b.passenger) ? b.passenger[0] : b.passenger;
        const ride = Array.isArray(b.ride) ? b.ride[0] : b.ride;
        const passengerStr = passenger ? `${passenger.first_name} ${passenger.last_name} ${passenger.email}`.toLowerCase() : '';
        const routeStr = ride ? `${ride.from} ${ride.to}`.toLowerCase() : '';
        const idStr = b.id?.toLowerCase() || '';
        return passengerStr.includes(s) || routeStr.includes(s) || idStr.includes(s);
      });
    }

    return res.json({
      bookings: filteredBookings,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count,
        totalPages: count ? Math.ceil(count / Number(limit)) : 0
      }
    });
  } catch (err) {
    console.error('Admin list bookings error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// TRANSACTIONS
// ─────────────────────────────────────────────────────────────────────────────
router.get('/transactions', async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 50, type } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabase
      .from('transactions')
      .select('*, user:user_id(first_name, last_name, email)', { count: 'exact' });

    if (type) query = query.eq('type', type);

    const { data: transactions, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (error) throw error;

    return res.json({
      transactions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count,
        totalPages: count ? Math.ceil(count / Number(limit)) : 0
      }
    });
  } catch (err) {
    console.error('Admin list transactions error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS
// ─────────────────────────────────────────────────────────────────────────────
router.get('/settings', async (_req: AuthRequest, res: Response) => {
  try {
    const { data: settings, error } = await supabase
      .from('app_settings')
      .select('*')
      .order('key');

    if (error) {
      if (error.code === '42P01') {
        return res.status(404).json({ error: 'Settings table not found. Please run the SQL migration.' });
      }
      throw error;
    }

    return res.json({ settings });
  } catch (err) {
    console.error('Admin list settings error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/settings', async (req: AuthRequest, res: Response) => {
  try {
    const updates = req.body; // e.g. { MAPBOX_ACCESS_TOKEN: 'sk_123', PAYSTACK_SECRET_KEY: 'sk_test' }
    
    // Convert object to array of updates
    const promises = Object.entries(updates).map(async ([key, value]) => {
      return supabase
        .from('app_settings')
        .update({ value: String(value), updated_at: new Date().toISOString() })
        .eq('key', key);
    });

    await Promise.all(promises);

    return res.json({ message: 'Settings updated successfully' });
  } catch (err) {
    console.error('Admin update settings error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// BROADCAST NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────
router.post('/broadcast-notification', async (req: AuthRequest, res: Response) => {
  try {
    const { target, userId, title, body } = req.body;
    if (!target || !title || !body) {
      return res.status(400).json({ error: 'target, title, and body are required' });
    }

    if (target === 'individual') {
      if (!userId) return res.status(400).json({ error: 'userId is required for individual target' });
      await NotificationService.sendNotification(userId, title, body, 'system');
      return res.json({ message: 'Notification sent to user' });
    }

    // Fetch users based on target
    let query = supabase.from('profiles').select('id');
    if (target === 'drivers') {
      query = query.eq('role', 'driver');
    } else if (target === 'riders') {
      query = query.eq('role', 'rider');
    }

    const { data: users, error } = await query;
    if (error) throw error;

    if (users && users.length > 0) {
      // Send notifications concurrently
      await Promise.all(
        users.map(u => NotificationService.sendNotification(u.id, title, body, 'system'))
      );
    }

    return res.json({ message: `Notification broadcasted to ${users?.length || 0} user(s)` });
  } catch (err) {
    console.error('Admin broadcast notification error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
