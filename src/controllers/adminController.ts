import { Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { supabaseAdmin } from '../config/supabase';
import { query, queryOne } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import type { UpdateUserStatusBody, UpdateFeesBody, UpdateReferralSettingsBody } from '../validators/admin';
import { applyRuntimeSettings, getApiKeysState, maskSecret, setAppSetting, type ApiKeyName } from '../services/appSettings';

/** Record an admin action in the audit_logs table. Never throws. */
export async function logAudit(
  req: AuthRequest,
  action: string,
  entityType: string | null,
  entityId: string | null,
  oldValues: unknown = null,
  newValues: unknown = null
): Promise<void> {
  try {
    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::inet, $8)`,
      [
        req.user?.id || null,
        action,
        entityType,
        entityId,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        req.ip || null,
        req.headers['user-agent'] ? String(req.headers['user-agent']).slice(0, 500) : null,
      ]
    );
  } catch (e) {
    console.error('audit log write failed:', e);
  }
}

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
    await logAudit(req, 'wallet.fund_all_riders', 'wallet', null, null, { amountPerRider: amount, ridersFunded: funded });
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
    const profile = await queryOne(
      `SELECT p.*,
              COALESCE(w.balance, 0) AS balance,
              COALESCE(w.held_amount, 0) AS held_amount,
              COALESCE(w.total_earnings, 0) AS total_earnings,
              COALESCE(w.total_withdrawn, 0) AS total_withdrawn
       FROM profiles p
       LEFT JOIN wallets w ON w.user_id = p.user_id
       WHERE p.id = $1 OR p.user_id = $1`,
      [userId]
    );

    if (!profile) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const [ridesCount, bookingsCount, kycDocs] = await Promise.all([
      queryOne('SELECT COUNT(*)::int as count FROM rides WHERE driver_id = $1', [profile.user_id]),
      queryOne('SELECT COUNT(*)::int as count FROM bookings WHERE rider_id = $1', [profile.user_id]),
      query('SELECT * FROM kyc_documents WHERE user_id = $1 ORDER BY created_at DESC', [profile.user_id]).catch(() => []),
    ]);

    res.json({
      user: {
        ...profile,
        rides_count: ridesCount?.count || 0,
        bookings_count: bookingsCount?.count || 0,
        kyc_documents: kycDocs || [],
      }
    });
  } catch (e) {
    console.error('getUserDetails error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { firstName, lastName, email, phone, role, password, accountStatus, kycStatus, initialBalance } = req.body;

    if (!email && !phone) {
      res.status(400).json({ error: 'Email or phone number is required' });
      return;
    }

    if (email) {
      const existing = await queryOne('SELECT id FROM profiles WHERE email = $1', [email]);
      if (existing) {
        res.status(409).json({ error: 'Email is already registered' });
        return;
      }
    }

    if (phone) {
      const existing = await queryOne('SELECT id FROM profiles WHERE phone = $1', [phone]);
      if (existing) {
        res.status(409).json({ error: 'Phone number is already registered' });
        return;
      }
    }

    const passwordHash = password ? await bcrypt.hash(password, 10) : await bcrypt.hash('TravelMate123!', 10);
    const userId = crypto.randomUUID();

    const profile = await queryOne(
      `INSERT INTO profiles (id, user_id, email, password_hash, first_name, last_name, phone, phone_verified, role, account_status, kyc_status, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, $9, $10, NOW()) RETURNING *`,
      [
        userId,
        userId,
        email || null,
        passwordHash,
        firstName || '',
        lastName || '',
        phone || null,
        role || 'rider',
        accountStatus || 'active',
        kycStatus || 'none',
      ]
    );

    const balance = Math.max(0, Number(initialBalance) || 0);
    await query(
      `INSERT INTO wallets (user_id, balance, status) VALUES ($1, $2, 'active')
       ON CONFLICT (user_id) DO UPDATE SET balance = $2`,
      [userId, balance]
    );

    res.json({ success: true, user: profile });
    await logAudit(req, 'user.created', 'user', userId, null, { email, phone, role, accountStatus, kycStatus, initialBalance: balance });
  } catch (e) {
    console.error('createUser error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.params.userId;
    const { firstName, lastName, email, phone, role, accountStatus, kycStatus } = req.body;

    const profile = await queryOne('SELECT * FROM profiles WHERE id = $1 OR user_id = $1', [userId]);
    if (!profile) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const updated = await queryOne(
      `UPDATE profiles
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           email = COALESCE($3, email),
           phone = COALESCE($4, phone),
           role = COALESCE($5, role),
           account_status = COALESCE($6, account_status),
           kyc_status = COALESCE($7, kyc_status),
           updated_at = NOW()
       WHERE id = $8 OR user_id = $8
       RETURNING *`,
      [firstName || null, lastName || null, email || null, phone || null, role || null, accountStatus || null, kycStatus || null, userId]
    );

    res.json({ success: true, user: updated });
    await logAudit(req, 'user.updated', 'user', userId,
      { firstName: profile.first_name, lastName: profile.last_name, email: profile.email, phone: profile.phone, role: profile.role, accountStatus: profile.account_status, kycStatus: profile.kyc_status },
      { firstName, lastName, email, phone, role, accountStatus, kycStatus });
  } catch (e) {
    console.error('updateUser error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateUserStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.params.userId;
    const body = req.body as UpdateUserStatusBody;
    const existing = await queryOne('SELECT account_status FROM profiles WHERE id = $1 OR user_id = $1', [userId]);
    await query('UPDATE profiles SET account_status = $1, updated_at = NOW() WHERE id = $2 OR user_id = $2', [body.status, userId]);
    res.json({ success: true, status: body.status });
    await logAudit(req, `user.${body.status === 'suspended' ? 'suspended' : 'activated'}`, 'user', userId,
      { account_status: existing?.account_status ?? null }, { account_status: body.status });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.params.userId;
    const deleted = await queryOne('SELECT id, user_id, first_name, last_name, email FROM profiles WHERE id = $1 OR user_id = $1', [userId]);
    await query('DELETE FROM wallets WHERE user_id = $1', [userId]);
    await query('DELETE FROM profiles WHERE id = $1 OR user_id = $1', [userId]);
    res.json({ success: true });
    if (deleted) {
      await logAudit(req, 'user.deleted', 'user', userId,
        { first_name: deleted.first_name, last_name: deleted.last_name, email: deleted.email }, null);
    }
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
    const { search, limit: limitStr } = req.query;
    const limit = Math.min(Number(limitStr) || 200, 500);
    const params: any[] = [];
    let sql = `
      SELECT t.*, p.first_name, p.last_name, p.email
      FROM transactions t
      LEFT JOIN profiles p ON p.user_id = t.user_id
      WHERE 1=1`;
    if (search && typeof search === 'string') {
      const s = '%' + search + '%';
      sql += ` AND (t.reference ILIKE $${params.length + 1}
                 OR t.description ILIKE $${params.length + 2}
                 OR t.type ILIKE $${params.length + 3}
                 OR p.first_name ILIKE $${params.length + 4}
                 OR p.last_name ILIKE $${params.length + 5}
                 OR p.email ILIKE $${params.length + 6})`;
      params.push(s, s, s, s, s, s);
    }
    sql += ' ORDER BY t.created_at DESC LIMIT $' + (params.length + 1);
    params.push(limit);
    const transactions = await query(sql, params);
    res.json({ transactions: transactions ?? [] });
  } catch (e) {
    console.error('listTransactions error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function listAuditLogs(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { search, limit: limitStr } = req.query;
    const limit = Math.min(Number(limitStr) || 200, 500);
    const params: any[] = [];
    let sql = `
      SELECT a.*, p.first_name, p.last_name, p.email, p.role AS actor_role
      FROM audit_logs a
      LEFT JOIN profiles p ON p.user_id = a.user_id
      WHERE 1=1`;
    if (search && typeof search === 'string') {
      const s = '%' + search + '%';
      sql += ` AND (a.action ILIKE $${params.length + 1}
                 OR a.entity_type ILIKE $${params.length + 2}
                 OR a.entity_id::text ILIKE $${params.length + 3}
                 OR p.first_name ILIKE $${params.length + 4}
                 OR p.last_name ILIKE $${params.length + 5}
                 OR p.email ILIKE $${params.length + 6})`;
      params.push(s, s, s, s, s, s);
    }
    sql += ' ORDER BY a.created_at DESC LIMIT $' + (params.length + 1);
    params.push(limit);
    const logs = await query(sql, params);
    res.json({ logs: logs ?? [] });
  } catch (e) {
    console.error('listAuditLogs error:', e);
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
       LEFT JOIN profiles p ON p.user_id = k.user_id
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

export async function getAnalyticsOverview(req: AuthRequest, res: Response): Promise<void> {
  try {
    const period = (req.query.period as string) || '30d';
    let days = 30;
    if (period === '7d') days = 7;
    else if (period === '90d') days = 90;
    else if (period === '1y') days = 365;
    else if (period === 'all') days = 10000;

    const intervalSql = days === 10000 ? "INTERVAL '100 years'" : `INTERVAL '${days} days'`;

    const [
      [userStats],
      [bookingStats],
      statusCountsResult,
      topRoutesResult,
      monthlyResult,
      vtuResult,
    ] = await Promise.all([
      query(`
        SELECT 
          COUNT(*)::int as total_users,
          COUNT(CASE WHEN role = 'driver' THEN 1 END)::int as drivers,
          COUNT(CASE WHEN role = 'rider' THEN 1 END)::int as riders,
          COUNT(CASE WHEN created_at >= NOW() - ${intervalSql} THEN 1 END)::int as new_users
        FROM profiles
      `),
      query(`
        SELECT 
          COUNT(*)::int as total_bookings,
          COUNT(CASE WHEN status = 'completed' THEN 1 END)::int as completed_bookings,
          COUNT(CASE WHEN status = 'confirmed' OR status = 'active' THEN 1 END)::int as active_bookings,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END)::int as cancelled_bookings,
          COALESCE(SUM(CASE WHEN status = 'completed' THEN total_amount ELSE 0 END), 0)::float as gross_revenue,
          COALESCE(SUM(CASE WHEN status IN ('confirmed', 'active') THEN total_amount ELSE 0 END), 0)::float as escrow_in_hold,
          COALESCE(AVG(CASE WHEN status = 'completed' THEN total_amount END), 0)::float as avg_booking_value,
          COALESCE(SUM(seats), 0)::int as total_seats_booked
        FROM bookings
        WHERE created_at >= NOW() - ${intervalSql}
      `),
      query(`
        SELECT status, COUNT(*)::int as count 
        FROM bookings 
        WHERE created_at >= NOW() - ${intervalSql} 
        GROUP BY status
      `),
      query(`
        SELECT 
          COALESCE(r.from_location, r.from_city, 'Lagos') as from_city,
          COALESCE(r.to_location, r.to_city, 'Abuja') as to_city,
          COUNT(b.id)::int as booking_count,
          COALESCE(SUM(b.seats), 0)::int as seats_booked,
          COALESCE(SUM(b.total_amount), 0)::float as total_revenue
        FROM bookings b
        JOIN rides r ON b.ride_id = r.id
        WHERE b.created_at >= NOW() - ${intervalSql}
        GROUP BY 1, 2
        ORDER BY booking_count DESC
        LIMIT 5
      `).catch(() => []),
      query(`
        SELECT 
          TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YY') as month_label,
          DATE_TRUNC('month', created_at) as month_date,
          COUNT(*)::int as total_bookings,
          COALESCE(SUM(CASE WHEN status = 'completed' THEN total_amount ELSE 0 END), 0)::float as revenue
        FROM bookings
        WHERE created_at >= NOW() - INTERVAL '12 months'
        GROUP BY 1, 2
        ORDER BY month_date ASC
      `).catch(() => []),
      query(`
        SELECT 
          type as service_type,
          COUNT(*)::int as count,
          COALESCE(SUM(amount), 0)::float as total_amount
        FROM service_purchases
        WHERE created_at >= NOW() - ${intervalSql}
        GROUP BY type
      `).catch(() => []),
    ]);

    const u = userStats || { total_users: 0, drivers: 0, riders: 0, new_users: 0 };
    const b = bookingStats || {
      total_bookings: 0, completed_bookings: 0, active_bookings: 0, cancelled_bookings: 0,
      gross_revenue: 0, escrow_in_hold: 0, avg_booking_value: 0, total_seats_booked: 0
    };

    const platformFeePercentage = 0.10;
    const platformNetRevenue = (b.gross_revenue || 0) * platformFeePercentage;

    res.json({
      period,
      periodDays: days,
      users: {
        total: u.total_users || 0,
        drivers: u.drivers || 0,
        riders: u.riders || 0,
        newSignups: u.new_users || 0,
      },
      financials: {
        grossVolume: b.gross_revenue || 0,
        platformNetRevenue,
        avgBookingValue: Math.round(b.avg_booking_value || 0),
        escrowInHold: b.escrow_in_hold || 0,
      },
      bookings: {
        total: b.total_bookings || 0,
        completed: b.completed_bookings || 0,
        active: b.active_bookings || 0,
        cancelled: b.cancelled_bookings || 0,
        totalSeatsBooked: b.total_seats_booked || 0,
        completionRate: b.total_bookings > 0 ? Math.round((b.completed_bookings / b.total_bookings) * 100) : 0,
      },
      statusDistribution: statusCountsResult || [],
      topRoutes: topRoutesResult || [],
      monthlyTrends: monthlyResult || [],
      vtuAnalytics: vtuResult || [],
    });
  } catch (e) {
    console.error('Failed to get analytics overview:', e);
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
    const { search, limit: limitStr, role } = req.query;
    const limit = Math.min(Number(limitStr) || 100, 500);
    const params: any[] = [];
    let sql = `
      SELECT p.id, p.user_id, p.first_name, p.last_name, p.email, p.phone, p.role,
             p.account_status, p.kyc_status, p.created_at,
             COALESCE(w.balance, 0) AS balance,
             COALESCE(w.held_amount, 0) AS held_amount,
             COALESCE(w.total_earnings, 0) AS total_earnings,
             COALESCE(w.total_withdrawn, 0) AS total_withdrawn,
             w.status AS wallet_status
      FROM profiles p
      LEFT JOIN wallets w ON w.user_id = p.user_id
      WHERE 1=1`;
    if (role && typeof role === 'string' && ['rider', 'driver', 'admin'].includes(role)) {
      sql += ' AND p.role = $' + (params.length + 1);
      params.push(role);
    }
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
    await logAudit(req, 'wallet.credited', 'wallet', userId, null, { amount: numAmount, reason: reason || 'Admin credit' });
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
    await logAudit(req, 'wallet.debited', 'wallet', userId, null, { amount: numAmount, reason: reason || 'Admin debit' });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function listReferrals(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { search } = req.query;
    const searchParam = search ? `%${search}%` : null;
    const rows = await query(
      `SELECT r.id, r.referrer_id, r.referee_id, r.status, r.reward_amount, r.created_at,
              p_ref.first_name AS referrer_first_name, p_ref.last_name AS referrer_last_name, p_ref.email AS referrer_email,
              p_ref.referral_code AS referrer_code,
              p_refee.first_name AS referee_first_name, p_refee.last_name AS referee_last_name, p_refee.email AS referee_email
       FROM referrals r
       LEFT JOIN profiles p_ref ON p_ref.id = r.referrer_id
       LEFT JOIN profiles p_refee ON p_refee.id = r.referee_id
       ${searchParam ? `WHERE (p_ref.first_name ILIKE $1 OR p_ref.last_name ILIKE $1 OR p_ref.email ILIKE $1 OR p_refee.first_name ILIKE $1 OR p_refee.email ILIKE $1)` : ''}
       ORDER BY r.created_at DESC
       LIMIT 100`,
      searchParam ? [searchParam] : []
    );
    res.json({ referrals: rows ?? [] });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getReferralStats(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const totalReferrals = await queryOne<{ count: number }>('SELECT COUNT(*)::int AS count FROM referrals');
    const completedReferrals = await queryOne<{ count: number }>("SELECT COUNT(*)::int AS count FROM referrals WHERE status = 'completed'");
    const pendingReferrals = await queryOne<{ count: number }>("SELECT COUNT(*)::int AS count FROM referrals WHERE status = 'pending'");
    const totalRewards = await queryOne<{ total: number }>("SELECT COALESCE(SUM(reward_amount), 0)::int AS total FROM referrals WHERE status = 'completed'");

    const topReferrers = await query(
      `SELECT p.id, p.first_name, p.last_name, p.email, p.referral_code,
              COUNT(r.id)::int AS total_referrals,
              COUNT(r.id) FILTER (WHERE r.status = 'completed')::int AS completed_referrals,
              COALESCE(SUM(r.reward_amount) FILTER (WHERE r.status = 'completed'), 0)::int AS total_earned
       FROM profiles p
       LEFT JOIN referrals r ON r.referrer_id = p.id
       WHERE p.referral_code IS NOT NULL
       GROUP BY p.id
       HAVING COUNT(r.id) > 0
       ORDER BY total_referrals DESC
       LIMIT 10`
    );

    res.json({
      totalReferrals: totalReferrals?.count ?? 0,
      completedReferrals: completedReferrals?.count ?? 0,
      pendingReferrals: pendingReferrals?.count ?? 0,
      totalRewardsPaid: totalRewards?.total ?? 0,
      topReferrers: topReferrers ?? [],
    });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getReferralSettings(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const { data } = await supabaseAdmin
      .from('app_settings')
      .select('value')
      .eq('key', 'referral_rewards')
      .single();
    const defaults = { refereeBonus: 500, referrerReward: 500 };
    if (!data?.value) {
      res.json(defaults);
      return;
    }
    const raw = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
    res.json({ refereeBonus: raw.refereeBonus ?? defaults.refereeBonus, referrerReward: raw.referrerReward ?? defaults.referrerReward });
  } catch (e) {
    res.json({ refereeBonus: 500, referrerReward: 500 });
  }
}

export async function updateReferralSettings(req: AuthRequest, res: Response): Promise<void> {
  try {
    const body = req.body as UpdateReferralSettingsBody;
    const defaults = { refereeBonus: 500, referrerReward: 500 };
    const { data: existing } = await supabaseAdmin
      .from('app_settings')
      .select('value')
      .eq('key', 'referral_rewards')
      .single();
    let current = defaults;
    if (existing?.value) {
      current = typeof existing.value === 'string' ? JSON.parse(existing.value) : existing.value;
    }
    const updated = {
      refereeBonus: body.refereeBonus ?? current.refereeBonus,
      referrerReward: body.referrerReward ?? current.referrerReward,
    };
    await supabaseAdmin.from('app_settings').upsert(
      {
        key: 'referral_rewards',
        value: updated,
        is_public: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    );
    res.json({ success: true, settings: updated });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function completeReferral(req: AuthRequest, res: Response): Promise<void> {
  try {
    const referralId = req.params.referralId;
    const referral = await queryOne<{ id: string; referrer_id: string; reward_amount: number; status: string }>(
      `SELECT id, referrer_id, reward_amount, status FROM referrals WHERE id = $1`, [referralId]
    );
    if (!referral) {
      res.status(404).json({ error: 'Referral not found' });
      return;
    }
    if (referral.status === 'completed') {
      res.status(400).json({ error: 'Referral already completed' });
      return;
    }

    await query(`UPDATE referrals SET status = 'completed', updated_at = NOW() WHERE id = $1`, [referralId]);

    const wallet = await queryOne<{ balance: number }>(
      'SELECT balance FROM wallets WHERE user_id = $1', [referral.referrer_id]
    );
    if (wallet) {
      await supabaseAdmin.from('wallets').update({ balance: wallet.balance + referral.reward_amount }).eq('user_id', referral.referrer_id);
      await query(
        `INSERT INTO wallet_transactions (user_id, type, amount, status, metadata, created_at)
         VALUES ($1, 'referral_reward', $2, 'completed', $3::jsonb, NOW())`,
        [referral.referrer_id, referral.reward_amount, JSON.stringify({ referralId })]
      );
    }

    res.json({ success: true, rewardPaid: referral.reward_amount });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function refundReferral(req: AuthRequest, res: Response): Promise<void> {
  try {
    const referralId = req.params.referralId;
    const referral = await queryOne<{ id: string; status: string }>(
      `SELECT id, status FROM referrals WHERE id = $1`, [referralId]
    );
    if (!referral) {
      res.status(404).json({ error: 'Referral not found' });
      return;
    }
    if (referral.status === 'refunded') {
      res.status(400).json({ error: 'Referral already refunded' });
      return;
    }

    await query(`UPDATE referrals SET status = 'refunded', updated_at = NOW() WHERE id = $1`, [referralId]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── API key settings (admin settings page) ─────────────────────────────────

const API_KEY_VALIDATORS: Record<string, { pattern?: RegExp; message: string }> = {
  MAPBOX_ACCESS_TOKEN: {
    pattern: /^(pk\.|sk\.|ey)/,
    message: 'Mapbox tokens start with "pk." or "sk.".',
  },
  BARDETECH_API_KEY: {
    pattern: /^[a-f0-9]{16,128}$/i,
    message: 'Bardetech API keys are hexadecimal strings.',
  },
  PAYSTACK_SECRET_KEY: {
    pattern: /^sk_[A-Za-z0-9]+/,
    message: 'Paystack secret keys start with "sk_".',
  },
  DOJAH_APP_ID: {
    pattern: /^[A-Za-z0-9]{8,64}$/,
    message: 'Dojah app IDs are alphanumeric strings (8-64 characters).',
  },
  DOJAH_SECRET_KEY: {
    pattern: /^[A-Za-z0-9_-]{8,}$/,
    message: 'Dojah secret keys look like "test_sk_..." or "prod_sk_...".',
  },
  DOJAH_BASE_URL: {
    pattern: /^https:\/\/[a-z0-9.-]+(:\d+)?(\/.*)?$/i,
    message: 'Base URL must be an https URL, e.g. https://sandbox.dojah.io.',
  },
  AGORA_APP_ID: {
    pattern: /^[a-f0-9]{8,64}$/i,
    message: 'Agora app IDs are hexadecimal strings.',
  },
  AGORA_APP_CERTIFICATE: {
    pattern: /^[a-f0-9]{8,64}$/i,
    message: 'Agora app certificates are hexadecimal strings.',
  },
  TWILIO_ACCOUNT_SID: {
    pattern: /^(SK|AC)[a-zA-Z0-9]{16,}$/,
    message: 'Twilio SIDs start with "AC" or "SK".',
  },
  TWILIO_AUTH_TOKEN: {
    pattern: /^[a-f0-9]{16,64}$/i,
    message: 'Twilio auth tokens are hexadecimal strings.',
  },
  FLW_CLIENT_ID: {
    pattern: /^[A-Za-z0-9_-]{8,}$/,
    message: 'Flutterwave client IDs are at least 8 alphanumeric characters.',
  },
  FLW_SECRET_KEY: {
    pattern: /^[A-Za-z0-9_-]{8,}$/,
    message: 'Flutterwave client secrets are at least 8 alphanumeric characters.',
  },
  FLW_ENCRYPTION_KEY: {
    pattern: /^[A-Za-z0-9+/=_-]{16,}$/,
    message: 'Flutterwave encryption keys are at least 16 characters.',
  },
  FIREBASE_PROJECT_ID: {
    pattern: /^[a-z0-9-]{4,30}$/,
    message: 'Firebase project IDs are lowercase letters, numbers and dashes.',
  },
  FIREBASE_CLIENT_EMAIL: {
    pattern: /^[^@\s]+@[^@\s]+\.[^@\s]+$/,
    message: 'Enter the Firebase service account email (firebase-adminsdk@...).',
  },
  FIREBASE_PRIVATE_KEY: {
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
    message: 'Paste the full PEM private key starting with "-----BEGIN PRIVATE KEY-----".',
  },
};

export async function getApiKeys(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const keys = await getApiKeysState();
    res.json({ keys });
  } catch (e) {
    console.error('getApiKeys failed:', e);
    res.status(500).json({ error: 'Failed to load API settings' });
  }
}

export async function updateApiKeys(req: AuthRequest, res: Response): Promise<void> {
  try {
    const body = req.body as Record<string, string | null | undefined>;
    const updates: Array<{ name: ApiKeyName; value: string }> = [];

    for (const [name, rawValue] of Object.entries(body)) {
      if (!(name in API_KEY_VALIDATORS)) continue;
      const value = typeof rawValue === 'string' ? rawValue.trim() : '';
      if (value === '') continue; // empty means "leave unchanged"
      const validator = API_KEY_VALIDATORS[name];
      if (validator.pattern && !validator.pattern.test(value)) {
        res.status(400).json({ error: `${name}: ${validator.message}` });
        return;
      }
      updates.push({ name: name as ApiKeyName, value });
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'No changes provided. Enter at least one key to save.' });
      return;
    }

    for (const u of updates) {
      await setAppSetting(u.name, u.value);
    }
    // Make the new keys effective immediately, without a restart.
    await applyRuntimeSettings();

    await logAudit(
      req,
      'settings.api_keys_updated',
      'app_settings',
      null,
      null,
      { updated: updates.map(u => u.name), values: updates.map(u => ({ name: u.name, masked: maskSecret(u.value) })) }
    );

    const keys = await getApiKeysState();
    res.json({ success: true, keys });
  } catch (e: any) {
    console.error('updateApiKeys failed:', e);
    res.status(500).json({ error: e?.message || 'Failed to save API settings' });
  }
}
