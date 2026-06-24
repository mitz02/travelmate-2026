import { Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { query, queryOne } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import type { UpdateUserStatusBody, UpdateFeesBody } from '../validators/admin';

export async function fundAllRiders(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { amount: amountStr } = req.body;
    const amount = Math.max(0, Number(amountStr) || 5000);
    const riders = await query('SELECT user_id FROM profiles WHERE role = $1', ['rider']);
    let funded = 0;
    for (const rider of riders) {
      await query(
        `INSERT INTO wallets (user_id, balance, status) VALUES ($1, $2, 'active')
         ON CONFLICT (user_id) DO UPDATE SET balance = wallets.balance + $2`,
        [rider.user_id, amount]
      );
      funded++;
    }
    res.json({ success: true, funded, amountPerRider: amount, totalDisbursed: funded * amount });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function listUsers(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { search, role, limit: limitStr } = req.query;
    const limit = Math.min(Number(limitStr) || 100, 500);
    const params: any[] = [];
    let sql = 'SELECT * FROM profiles WHERE 1=1';
    if (role && typeof role === 'string') {
      sql += ' AND role = $' + (params.length + 1);
      params.push(role);
    }
    if (search && typeof search === 'string') {
      const p = '%' + search + '%';
      sql += ' AND (first_name ILIKE $' + (params.length + 1) + ' OR last_name ILIKE $' + (params.length + 2) + ' OR email ILIKE $' + (params.length + 3) + ')';
      params.push(p, p, p);
    }
    sql += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1);
    params.push(limit);
    const users = await query(sql, params);
    res.json({ users: users ?? [] });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getUserDetails(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.params.userId;
    const profile = await queryOne('SELECT * FROM profiles WHERE id = $1', [userId]);
    if (!profile) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ user: profile });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateUserStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.params.userId;
    const body = req.body as UpdateUserStatusBody;
    const { data: user, error } = await supabaseAdmin
      .from('profiles')
      .update({ account_status: body.status, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.json({ user });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.params.userId;
    const { error } = await supabaseAdmin.from('profiles').delete().eq('id', userId);
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function listRides(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { search, limit: limitStr } = req.query;
    const limit = Math.min(Number(limitStr) || 100, 500);
    const params: any[] = [];
    let sql = 'SELECT * FROM rides WHERE 1=1';
    if (search && typeof search === 'string') {
      const p = '%' + search + '%';
      sql += ' AND (from ILIKE $' + (params.length + 1) + ' OR to ILIKE $' + (params.length + 2) + ')';
      params.push(p, p);
    }
    sql += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1);
    params.push(limit);
    const rides = await query(sql, params);
    res.json({ rides: rides ?? [] });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function adminUpdateRide(req: AuthRequest, res: Response): Promise<void> {
  try {
    const rideId = req.params.rideId;
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    const allowed = ['from','to','from_lat','from_lng','to_lat','to_lng','departure_time','price_per_seat','available_seats','total_seats','description','status','vehicle_make','vehicle_model','vehicle_color','amenities','pickup_point','dropoff_point'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    const { data: ride, error } = await supabaseAdmin
      .from('rides')
      .update(updates)
      .eq('id', rideId)
      .select()
      .single();
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.json({ ride });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function listBookings(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { search, limit: limitStr } = req.query;
    const limit = Math.min(Number(limitStr) || 100, 500);
    const params: any[] = [];
    let sql = `
      SELECT b.*,
        ROW_TO_JSON(r.*) AS ride,
        ROW_TO_JSON(rider.*) AS rider_profile,
        ROW_TO_JSON(driver.*) AS driver_profile
      FROM bookings b
      LEFT JOIN rides r ON r.id = b.ride_id
      LEFT JOIN profiles rider ON rider.user_id = b.rider_id
      LEFT JOIN profiles driver ON driver.user_id = r.driver_id
      WHERE 1=1`;
    if (search && typeof search === 'string') {
      const p = '%' + search + '%';
      sql += ' AND (b.id::text ILIKE $' + (params.length + 1) + ' OR rider.first_name ILIKE $' + (params.length + 2) + ' OR rider.last_name ILIKE $' + (params.length + 3) + ' OR rider.email ILIKE $' + (params.length + 4) + ')';
      params.push(p, p, p, p);
    }
    sql += ' ORDER BY b.created_at DESC LIMIT $' + (params.length + 1);
    params.push(limit);
    const bookings = await query(sql, params);
    res.json({ bookings: bookings ?? [] });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getBookingDetails(req: AuthRequest, res: Response): Promise<void> {
  try {
    const bookingId = req.params.bookingId;
    const booking = await queryOne(`
      SELECT b.*,
        ROW_TO_JSON(r.*) AS ride,
        ROW_TO_JSON(rider.*) AS rider_profile,
        ROW_TO_JSON(driver.*) AS driver_profile
      FROM bookings b
      LEFT JOIN rides r ON r.id = b.ride_id
      LEFT JOIN profiles rider ON rider.user_id = b.rider_id
      LEFT JOIN profiles driver ON driver.user_id = r.driver_id
      WHERE b.id = $1`, [bookingId]);
    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }
    res.json({ booking });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function listTransactions(req: AuthRequest, res: Response): Promise<void> {
  try {
    const transactions = await query('SELECT * FROM transactions ORDER BY created_at DESC');
    res.json({ transactions: transactions ?? [] });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function listEscrowIssues(req: AuthRequest, res: Response): Promise<void> {
  try {
    const disputes = await query(
      `SELECT e.*,
              CASE WHEN b.id IS NOT NULL THEN row_to_json(b.*) ELSE NULL END as booking
       FROM escrows e
       LEFT JOIN bookings b ON b.id = e.booking_id
       WHERE e.status = ANY($1::text[])
       ORDER BY e.created_at DESC`,
      [['open', 'disputed']]
    );
    res.json({ escrow: disputes ?? [] });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function listPendingKyc(req: AuthRequest, res: Response): Promise<void> {
  try {
    const search = req.query.search ? `%${req.query.search}%` : null;
    const rows = await query(
      `SELECT k.id, k.user_id, k.id_type, k.id_number, k.id_front_url, k.id_back_url,
              k.selfie_url, k.status as kyc_status, k.admin_notes, k.rejection_reason,
              k.created_at, k.updated_at,
              p.first_name, p.last_name, p.email
       FROM kyc_documents k
       LEFT JOIN profiles p ON p.id = k.user_id
       WHERE k.status = 'pending'
         ${search ? `AND (p.first_name ILIKE $1 OR p.last_name ILIKE $1 OR p.email ILIKE $1)` : ''}
       ORDER BY k.created_at DESC`,
      search ? [search] : []
    );
    res.json({ submissions: rows ?? [] });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getStatistics(req: AuthRequest, res: Response): Promise<void> {
  try {
    const [[totalUsers], [drivers], [riders], [totalRides], [activeRides], [completedRides], [totalBookings], [completedBookings], [pendingKyc]] = await Promise.all([
      query('SELECT COUNT(*)::int AS count FROM profiles'),
      query('SELECT COUNT(*)::int AS count FROM profiles WHERE role = $1', ['driver']),
      query('SELECT COUNT(*)::int AS count FROM profiles WHERE role = $1', ['rider']),
      query('SELECT COUNT(*)::int AS count FROM rides'),
      query('SELECT COUNT(*)::int AS count FROM rides WHERE status = $1', ['open']),
      query('SELECT COUNT(*)::int AS count FROM rides WHERE status = $1', ['completed']),
      query('SELECT COUNT(*)::int AS count FROM bookings'),
      query('SELECT COUNT(*)::int AS count FROM bookings WHERE status = $1', ['completed']),
      query('SELECT COUNT(*)::int AS count FROM kyc_documents WHERE status = $1', ['pending']),
    ]);

    const revenueResult = await query('SELECT COALESCE(SUM(total_amount), 0) as total FROM bookings WHERE status = $1', ['completed']);
    const estimatedRevenue = Number((revenueResult as any[])?.[0]?.total) || 0;

    const weeklyResult = await query<{ day: string; count: number }[]>(
      `SELECT DATE(created_at) as day, COUNT(*) as count FROM bookings WHERE created_at >= NOW() - INTERVAL '7 days' GROUP BY DATE(created_at) ORDER BY day`
    );
    const weeklyBookings = weeklyResult ?? [];

    const revenueWeeklyResult = await query<{ day: string; total: number }[]>(
      `SELECT DATE(created_at) as day, COALESCE(SUM(total_amount), 0) as total FROM bookings WHERE created_at >= NOW() - INTERVAL '7 days' AND status = 'completed' GROUP BY DATE(created_at) ORDER BY day`
    );
    const weeklyRevenue = revenueWeeklyResult ?? [];

    const signupsWeeklyResult = await query<{ day: string; count: number }[]>(
      `SELECT DATE(created_at) as day, COUNT(*) as count FROM profiles WHERE created_at >= NOW() - INTERVAL '7 days' GROUP BY DATE(created_at) ORDER BY day`
    );
    const weeklySignups = signupsWeeklyResult ?? [];

    res.json({
      totalUsers: totalUsers.count ?? 0,
      drivers: drivers.count ?? 0,
      riders: riders.count ?? 0,
      totalRides: totalRides.count ?? 0,
      activeRides: activeRides.count ?? 0,
      completedRides: completedRides.count ?? 0,
      totalBookings: totalBookings.count ?? 0,
      completedBookings: completedBookings.count ?? 0,
      pendingKyc: pendingKyc.count ?? 0,
      estimatedRevenue,
      weeklyBookings,
      weeklyRevenue,
      weeklySignups,
    });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateFees(req: AuthRequest, res: Response): Promise<void> {
  try {
    const body = req.body as UpdateFeesBody;
    await supabaseAdmin.from('app_settings').upsert(
      {
        key: 'fees',
        value: { bookingFeePercent: body.bookingFeePercent, platformFeePercent: body.platformFeePercent },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function adminCompleteBooking(req: AuthRequest, res: Response): Promise<void> {
  try {
    const bookingId = req.params.bookingId;

    const booking = await queryOne('SELECT * FROM bookings WHERE id = $1', [bookingId]);
    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }
    const [ride, escrow] = await Promise.all([
      queryOne('SELECT driver_id FROM rides WHERE id = $1', [booking.ride_id]),
      queryOne('SELECT * FROM escrows WHERE booking_id = $1', [bookingId]),
    ]);
    (booking as any).ride = ride;
    (booking as any).escrow = escrow;
    if (escrow && escrow.status === 'held') {
      const driverId = (booking as any).ride?.driver_id;
      const amount = Number(escrow.amount);

      await supabaseAdmin.from('escrows').update({ status: 'released', released_at: new Date().toISOString() }).eq('id', escrow.id);

      if (driverId) {
        await query(
          `INSERT INTO wallets (user_id, balance, status) VALUES ($1, 0, 'active') ON CONFLICT (user_id) DO NOTHING`,
          [driverId]
        );
        await query('UPDATE wallets SET balance = balance + $1 WHERE user_id = $2', [amount, driverId]);
      }
    }

    await supabaseAdmin
      .from('bookings')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', bookingId);

    res.json({ success: true, status: 'completed' });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function adminReleaseEscrow(req: AuthRequest, res: Response): Promise<void> {
  try {
    const escrowId = req.params.escrowId;

    const escrow = await queryOne('SELECT * FROM escrows WHERE id = $1', [escrowId]);
    if (!escrow) {
      res.status(404).json({ error: 'Escrow not found' });
      return;
    }
    if (escrow.status !== 'held') {
      res.status(400).json({ error: 'Escrow is not in held status' });
      return;
    }

    const amount = Number(escrow.amount);
    const bookingRecord = await queryOne('SELECT ride_id FROM bookings WHERE id = $1', [escrow.booking_id]);
    let driverId = null;
    if (bookingRecord) {
      const ride = await queryOne('SELECT driver_id FROM rides WHERE id = $1', [bookingRecord.ride_id]);
      driverId = ride?.driver_id ?? null;
    }

    await supabaseAdmin.from('escrows').update({ status: 'released', released_at: new Date().toISOString() }).eq('id', escrowId);

    if (driverId) {
      await query(
        `INSERT INTO wallets (user_id, balance, status) VALUES ($1, 0, 'active') ON CONFLICT (user_id) DO NOTHING`,
        [driverId]
      );
      await query('UPDATE wallets SET balance = balance + $1 WHERE user_id = $2', [amount, driverId]);
    }

    res.json({ success: true, status: 'released', amount });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function listPendingCompletions(req: AuthRequest, res: Response): Promise<void> {
  try {
    const rows = await query(
      `SELECT b.id AS booking_id, b.total_amount, b.seats, b.created_at,
              r.id AS ride_id, r.from, r.to, r.departure_time,
              driver.user_id AS driver_id,
              driver.first_name AS driver_first_name, driver.last_name AS driver_last_name,
              rider.first_name AS rider_first_name, rider.last_name AS rider_last_name,
              e.id AS escrow_id, e.amount AS escrow_amount, e.status AS escrow_status
       FROM bookings b
       JOIN rides r ON r.id = b.ride_id
       JOIN profiles driver ON driver.user_id = r.driver_id
       JOIN profiles rider ON rider.user_id = b.rider_id
       JOIN escrows e ON e.booking_id = b.id
       WHERE b.status = 'completed'
         AND e.status = 'held'
       ORDER BY b.updated_at DESC`
    );
    res.json({ completions: rows ?? [] });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function releaseBookingEscrow(bookingId: string): Promise<{ driverId: string; amount: number } | null> {
  const booking = await queryOne('SELECT * FROM bookings WHERE id = $1', [bookingId]);
  if (!booking) return null;

  const escrow = await queryOne('SELECT * FROM escrows WHERE booking_id = $1 AND status = $2', [bookingId, 'held']);
  if (!escrow) return null;

  const ride = await queryOne('SELECT driver_id FROM rides WHERE id = $1', [booking.ride_id]);
  if (!ride) return null;

  const driverId = ride.driver_id;
  const amount = Number(escrow.amount);

  await supabaseAdmin.from('escrows').update({ status: 'released', released_at: new Date().toISOString() }).eq('id', escrow.id);

  await query(
    `INSERT INTO wallets (user_id, balance, status) VALUES ($1, 0, 'active') ON CONFLICT (user_id) DO NOTHING`,
    [driverId]
  );
  await query('UPDATE wallets SET balance = balance + $1 WHERE user_id = $2', [amount, driverId]);

  await supabaseAdmin
    .from('wallet_transactions')
    .insert({
      user_id: driverId,
      type: 'booking_earnings',
      amount,
      status: 'completed',
      metadata: { bookingId, escrowId: escrow.id, approvedBy: 'admin' },
    })
    .select()
    .single();

  return { driverId, amount };
}

async function refundBookingEscrow(bookingId: string): Promise<{ riderId: string; amount: number } | null> {
  const booking = await queryOne('SELECT * FROM bookings WHERE id = $1', [bookingId]);
  if (!booking) return null;

  const escrow = await queryOne('SELECT * FROM escrows WHERE booking_id = $1 AND status = $2', [bookingId, 'held']);
  if (!escrow) return null;

  const riderId = booking.rider_id;
  const amount = Number(escrow.amount);

  await supabaseAdmin.from('escrows').update({ status: 'refunded', refunded_at: new Date().toISOString() }).eq('id', escrow.id);

  await query(
    `INSERT INTO wallets (user_id, balance, status) VALUES ($1, 0, 'active') ON CONFLICT (user_id) DO NOTHING`,
    [riderId]
  );
  await query('UPDATE wallets SET balance = balance + $1 WHERE user_id = $2', [amount, riderId]);

  await supabaseAdmin
    .from('wallet_transactions')
    .insert({
      user_id: riderId,
      type: 'refund',
      amount,
      status: 'completed',
      metadata: { bookingId, escrowId: escrow.id, approvedBy: 'admin' },
    })
    .select()
    .single();

  return { riderId, amount };
}

export async function approveCompletion(req: AuthRequest, res: Response): Promise<void> {
  try {
    const bookingId = req.params.bookingId;

    const result = await releaseBookingEscrow(bookingId);
    if (!result) {
      res.status(400).json({ error: 'Booking not found or escrow not available' });
      return;
    }

    res.json({ success: true, message: 'Payment released to driver', driverId: result.driverId, amount: result.amount });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function denyCompletion(req: AuthRequest, res: Response): Promise<void> {
  try {
    const bookingId = req.params.bookingId;

    const result = await refundBookingEscrow(bookingId);
    if (!result) {
      res.status(400).json({ error: 'Booking not found or escrow not available' });
      return;
    }

    res.json({ success: true, message: 'Payment refunded to rider', riderId: result.riderId, amount: result.amount });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function listWallets(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { search, limit: limitStr } = req.query;
    const limit = Math.min(Number(limitStr) || 100, 500);
    const params: any[] = [];
    let sql = `
      SELECT p.id, p.user_id, p.first_name, p.last_name, p.email, p.phone, p.role,
             p.account_status, p.created_at,
             COALESCE(w.balance, 0) AS balance,
             COALESCE(w.held_amount, 0) AS held_amount,
             COALESCE(w.total_earnings, 0) AS total_earnings,
             COALESCE(w.total_withdrawn, 0) AS total_withdrawn,
             w.status AS wallet_status
      FROM profiles p
      LEFT JOIN wallets w ON w.user_id = p.user_id
      WHERE 1=1`;
    if (search && typeof search === 'string') {
      const p = '%' + search + '%';
      sql += ' AND (p.first_name ILIKE $' + (params.length + 1) + ' OR p.last_name ILIKE $' + (params.length + 2) + ' OR p.email ILIKE $' + (params.length + 3) + ' OR p.phone ILIKE $' + (params.length + 4) + ')';
      params.push(p, p, p, p);
    }
    sql += ' ORDER BY (COALESCE(w.balance, 0) + COALESCE(w.held_amount, 0)) DESC LIMIT $' + (params.length + 1);
    params.push(limit);
    const wallets = await query(sql, params);
    res.json({ wallets: wallets ?? [] });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function listWalletTransactions(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.params.userId;
    const transactions = await query(
      `SELECT wt.*,
              p.first_name, p.last_name
       FROM wallet_transactions wt
       LEFT JOIN profiles p ON p.user_id = wt.user_id
       WHERE wt.user_id = $1
       ORDER BY wt.created_at DESC
       LIMIT 200`,
      [userId]
    );
    res.json({ transactions: transactions ?? [] });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function creditWallet(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.params.userId;
    const { amount, reason } = req.body;
    const numAmount = Math.max(0, Number(amount) || 0);
    if (numAmount <= 0) {
      res.status(400).json({ error: 'Amount must be greater than 0' });
      return;
    }

    // Ensure wallet exists
    await query(
      `INSERT INTO wallets (user_id, balance, status) VALUES ($1, 0, 'active') ON CONFLICT (user_id) DO NOTHING`,
      [userId]
    );

    await query('UPDATE wallets SET balance = balance + $1 WHERE user_id = $2', [numAmount, userId]);

    await query(
      `INSERT INTO wallet_transactions (user_id, type, amount, status, metadata, created_at)
       VALUES ($1, 'admin_credit', $2, 'completed', $3::jsonb, NOW())`,
      [userId, numAmount, JSON.stringify({ reason: reason || 'Admin credit', creditedBy: req.user?.id })]
    );

    const wallet = await queryOne('SELECT balance, held_amount, status FROM wallets WHERE user_id = $1', [userId]);
    res.json({ success: true, amount: numAmount, wallet });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function debitWallet(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.params.userId;
    const { amount, reason } = req.body;
    const numAmount = Math.max(0, Number(amount) || 0);
    if (numAmount <= 0) {
      res.status(400).json({ error: 'Amount must be greater than 0' });
      return;
    }

    const wallet = await queryOne<{ balance: number }>('SELECT balance FROM wallets WHERE user_id = $1', [userId]);
    if (!wallet) {
      res.status(400).json({ error: 'Wallet not found' });
      return;
    }
    if (wallet.balance < numAmount) {
      res.status(400).json({ error: `Insufficient balance. User has ₦${wallet.balance.toLocaleString()}` });
      return;
    }

    await query('UPDATE wallets SET balance = balance - $1 WHERE user_id = $2 AND balance >= $3', [numAmount, userId, numAmount]);

    await query(
      `INSERT INTO wallet_transactions (user_id, type, amount, status, metadata, created_at)
       VALUES ($1, 'admin_debit', $2, 'completed', $3::jsonb, NOW())`,
      [userId, numAmount, JSON.stringify({ reason: reason || 'Admin debit', debitedBy: req.user?.id })]
    );

    const updated = await queryOne('SELECT balance, held_amount, status FROM wallets WHERE user_id = $1', [userId]);
    res.json({ success: true, amount: numAmount, wallet: updated });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
