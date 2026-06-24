import { Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { query, queryOne } from '../config/database';
import { AuthenticatedRequest } from '../types';
import { getIO } from '../socket';
import { NotificationService } from '../services/notification';
import type {
  CreateBookingBody,
  CancelBookingBody,
  PayBookingBody,
  RateBookingBody,
} from '../validators/bookings';

async function emitToAdmins(event: string, payload: any) {
  try {
    const admins = await query<{ user_id: string }>(
      "SELECT user_id FROM profiles WHERE role = 'admin'"
    );
    const io = getIO();
    if (io) {
      for (const admin of admins) {
        io.to(`user:${admin.user_id}`).emit(event, payload);
      }
    }
  } catch { /* ignore */ }
}

export async function createBooking(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const body = req.body as CreateBookingBody;
    const riderId = req.user.id;

    // Look up ride (allow upcoming/open status)
    const ride = await queryOne<{ id: string; driver_id: string; price_per_seat: number; available_seats: number; status: string; from: string; to: string }>(
      `SELECT id, driver_id, price_per_seat, available_seats, status, "from", "to" FROM rides WHERE id = $1`,
      [body.rideId]
    );
    if (!ride) {
      res.status(404).json({ error: 'Ride not found' });
      return;
    }
    if (ride.status === 'cancelled' || ride.status === 'expired' || ride.status === 'completed') {
      res.status(400).json({ error: 'Ride is no longer available' });
      return;
    }

    // Prevent double-booking: rider cannot book the same ride twice
    const existing = await queryOne(
      `SELECT id FROM bookings WHERE ride_id = $1 AND rider_id = $2 AND status NOT IN ('cancelled', 'completed')`,
      [body.rideId, riderId]
    );
    if (existing) {
      res.status(400).json({ error: 'You already have a booking on this ride.' });
      return;
    }

    // Prevent overlapping dates: check if rider has other active bookings on rides departing within 3 hours
    const rideInfo = await queryOne<{ departure_time: string }>('SELECT departure_time FROM rides WHERE id = $1', [body.rideId]);
    if (rideInfo?.departure_time) {
      const overlap = await queryOne(
        `SELECT b.id FROM bookings b
         JOIN rides r ON r.id = b.ride_id
         WHERE b.rider_id = $1
           AND b.status NOT IN ('cancelled', 'completed')
           AND r.departure_time BETWEEN $2::timestamptz - interval '3 hours' AND $2::timestamptz + interval '3 hours'`,
        [riderId, rideInfo.departure_time]
      );
      if (overlap) {
        res.status(400).json({ error: 'You already have a booking around this time. Please cancel it first.' });
        return;
      }
    }

    // Atomically check and decrement available seats — prevents race conditions
    const seatResult = await queryOne<{ price_per_seat: number }>(
      `UPDATE rides
       SET available_seats = available_seats - $1
       WHERE id = $2
         AND status NOT IN ('cancelled', 'expired', 'completed')
         AND available_seats >= $1
       RETURNING price_per_seat`,
      [body.seats, body.rideId]
    );
    if (!seatResult) {
      res.status(400).json({ error: 'Not enough seats available or ride not found' });
      return;
    }

    const total_amount = (Number(seatResult.price_per_seat) || 0) * body.seats;
    const profile = await queryOne<{ email: string }>('SELECT email FROM profiles WHERE user_id = $1', [req.user.id]);

    // Helper to restore seats on failure
    const restoreSeats = async () => {
      await query('UPDATE rides SET available_seats = available_seats + $1 WHERE id = $2', [body.seats, body.rideId]);
    };

    // ─── WALLET: create + pay in one atomic operation ───────────────────────
    if (body.paymentMethod === 'wallet') {
      // Auto-create wallet if missing (lazy init)
      await query(
        `INSERT INTO wallets (user_id, balance, status) VALUES ($1, 0, 'active') ON CONFLICT (user_id) DO NOTHING`,
        [riderId]
      );
      const wallet = await queryOne<{ balance: number; status: string }>(
        'SELECT balance, status FROM wallets WHERE user_id = $1', [riderId]
      );
      if (!wallet) {
        await restoreSeats();
        res.status(400).json({ error: 'Failed to initialize wallet.' });
        return;
      }
      if (wallet.status === 'frozen') {
        await restoreSeats();
        res.status(400).json({ error: 'Wallet is frozen. Please contact support.' });
        return;
      }
      if (wallet.balance < total_amount) {
        await restoreSeats();
        res.status(400).json({ error: `Insufficient wallet balance. You need ₦${total_amount.toLocaleString()} but you have ₦${wallet.balance.toLocaleString()}.` });
        return;
      }

      // Deduct wallet atomically and move amount to held
      const deducted = await queryOne<{ balance: number }>(
        `UPDATE wallets SET balance = balance - $1, held_amount = held_amount + $1 WHERE user_id = $2 AND balance >= $3 RETURNING balance`,
        [total_amount, riderId, total_amount]
      );
      if (!deducted) {
        await restoreSeats();
        res.status(400).json({ error: 'Insufficient wallet balance.' });
        return;
      }

      // Create booking first (escrow_id will be set below)
      const { data: booking, error: bookingError } = await supabaseAdmin
        .from('bookings')
        .insert({
          ride_id: body.rideId,
          rider_id: req.user.id,
          seats: body.seats,
          payment_method: 'wallet',
          status: 'pending',
          total_amount,
          payment_status: 'completed',
        })
        .select()
        .single();
      if (bookingError) {
        await query('UPDATE wallets SET balance = balance + $1, held_amount = held_amount - $1 WHERE user_id = $2', [total_amount, riderId]);
        await restoreSeats();
        res.status(400).json({ error: bookingError.message });
        return;
      }

      // Create escrow linked to the real booking
      const { data: escrow, error: escrowError } = await supabaseAdmin
        .from('escrows')
        .insert({
          booking_id: booking.id,
          amount: total_amount,
          status: 'held',
          created_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (escrowError) {
        await supabaseAdmin.from('bookings').delete().eq('id', booking.id);
        await query('UPDATE wallets SET balance = balance + $1, held_amount = held_amount - $1 WHERE user_id = $2', [total_amount, riderId]);
        await restoreSeats();
        res.status(500).json({ error: 'Failed to create escrow. Payment reversed.' });
        return;
      }

      // Link booking back to escrow
      await supabaseAdmin.from('bookings').update({ escrow_id: escrow.id, updated_at: new Date().toISOString() }).eq('id', booking.id);

      // Record wallet transaction
      await query(
        `INSERT INTO wallet_transactions (user_id, type, amount, status, metadata, created_at)
         VALUES ($1, 'booking_payment', $2, 'completed', $3::jsonb, NOW())`,
        [riderId, total_amount, JSON.stringify({ booking_id: booking.id, escrow_id: escrow.id })]
      );

      // Notify driver
      if (ride.driver_id) {
        const io = getIO();
        if (io) io.to(`user:${ride.driver_id}`).emit('booking_created', { bookingId: booking.id, amount: total_amount });
        await NotificationService.sendNotification(
          ride.driver_id,
          'New Booking Received',
          `A rider paid ₦${Number(total_amount).toLocaleString()} via wallet for their booking. Please accept or reject it.`,
          'booking',
          { bookingId: booking.id, amount: String(total_amount) }
        );
      }

      // Notify admins
      await NotificationService.notifyAdmins(
        'New Booking Received',
        `A rider paid ₦${Number(total_amount).toLocaleString()} via wallet.`,
        'admin_alert',
        { bookingId: booking.id, amount: String(total_amount) }
      );
      await emitToAdmins('admin_notification', {
        title: 'New Booking Received',
        body: `A rider paid ₦${Number(total_amount).toLocaleString()} via wallet.`,
        data: { bookingId: booking.id, amount: total_amount },
      });

      res.status(201).json({
        booking,
        escrow: { id: escrow.id, status: 'held', amount: total_amount },
      });
      return;
    }

    // ─── PAYSTACK: create pending booking with reference ────────────────────
    const reference = `pay_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    const { data: booking, error } = await supabaseAdmin
      .from('bookings')
      .insert({
        ride_id: body.rideId,
        rider_id: req.user.id,
        seats: body.seats,
        payment_method: 'paystack',
        status: 'pending',
        total_amount,
        payment_reference: reference,
      })
      .select()
      .single();
    if (error) {
      await restoreSeats();
      res.status(400).json({ error: error.message });
      return;
    }

    if (reference) {
      await query(
        `INSERT INTO payments (reference, amount, customer, status, created_at)
         VALUES ($1, $2, $3::jsonb, 'pending', NOW())`,
        [reference, total_amount, JSON.stringify({ email: profile?.email || 'user@example.com', booking_id: booking.id, user_id: req.user.id })]
      );
    }

    // Prepare rider info for notifications
    const riderProfile = await queryOne<{ first_name: string; last_name: string }>('SELECT first_name, last_name FROM profiles WHERE user_id = $1', [req.user.id]);
    const riderName = riderProfile
      ? `${riderProfile.first_name || ''} ${riderProfile.last_name || ''}`.trim() || 'A rider'
      : 'A rider';
    const notificationData = {
      bookingId: booking.id,
      rideId: body.rideId,
      riderName,
      seats: body.seats,
      totalAmount: total_amount,
    };

    const notifPayload: Record<string, string> = {
      bookingId: String(booking.id),
      rideId: String(body.rideId),
      riderName,
      seats: String(body.seats),
      totalAmount: String(total_amount),
    };

    // Notify driver of new booking via Socket.io and push notification
    if (ride.driver_id) {
      const io = getIO();
      if (io) {
        io.to(`user:${ride.driver_id}`).emit('booking_created', notificationData);
      }
      await NotificationService.sendNotification(
        ride.driver_id,
        'New Booking Received',
        `${riderName} booked ${body.seats} seat(s) on your route. Total: ₦${Number(total_amount).toLocaleString()}`,
        'booking',
        notifPayload
      );
    }

    // Notify all admins of new booking
    await NotificationService.notifyAdmins(
      'New Booking Received',
      `${riderName} booked ${body.seats} seat(s) for ₦${Number(total_amount).toLocaleString()}`,
      'admin_alert',
      notifPayload
    );
    await emitToAdmins('admin_notification', {
      title: 'New Booking Received',
      body: `${riderName} booked ${body.seats} seat(s) for ₦${Number(total_amount).toLocaleString()}`,
      data: notificationData,
    });

    res.status(201).json({
      booking,
      reference,
      email: profile?.email || 'user@example.com',
      escrow: { status: 'pending', amount: booking.total_amount },
    });
  } catch (e: any) {
    console.error('Error in createBooking:', e);
    res.status(500).json({ error: e.message || 'Internal server error' });
  }
}

export async function getBooking(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const bookingId = req.params.bookingId;
    const booking = await queryOne('SELECT * FROM bookings WHERE id = $1', [bookingId]);
    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }
    const ride = await queryOne('SELECT * FROM rides WHERE id = $1', [booking.ride_id]);
    const driverId = ride?.driver_id;
    const driver = driverId ? await queryOne('SELECT * FROM profiles WHERE user_id = $1', [driverId]) : null;
    res.json({ booking, ride: ride ?? null, driver: driver ?? null });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getUserBookings(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.params.userId === 'me' ? req.user?.id : req.params.userId;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const { status, role, page } = req.query;
    const pageNum = Math.max(1, Number(page) || 1);
    const pageSize = 20;
    const offset = (pageNum - 1) * pageSize;

    let whereClause: string;
    const params: any[] = [];

    if (role === 'driver') {
      whereClause = 'r.driver_id = $1';
      params.push(userId);
    } else {
      whereClause = 'b.rider_id = $1';
      params.push(userId);
    }

    if (status) {
      if (status === 'upcoming') {
        whereClause += ` AND b.status IN ('pending', 'confirmed')`;
      } else {
        params.push(String(status));
        whereClause += ` AND b.status = $${params.length}`;
      }
    }

    params.push(pageSize, offset);

    const bookings = await query(
      `SELECT b.*,
              jsonb_build_object(
                'id', r.id,
                'from', r.from,
                'to', r.to,
                'departure_time', r.departure_time,
                'driver_id', r.driver_id,
                'price_per_seat', r.price_per_seat,
                'available_seats', r.available_seats
              ) AS ride,
              jsonb_build_object(
                'first_name', p.first_name,
                'last_name', p.last_name,
                'profile_picture', p.profile_picture
              ) AS driver,
              (SELECT COUNT(*) FROM reviews rv WHERE rv.booking_id = b.id AND rv.reviewer_id = b.rider_id) > 0 AS has_rated
       FROM bookings b
       JOIN rides r ON r.id = b.ride_id
       LEFT JOIN profiles p ON p.user_id = r.driver_id
       WHERE ${whereClause}
       ORDER BY b.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({ bookings: bookings ?? [] });
  } catch (e) {
    console.error('Error in getUserBookings:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function cancelBooking(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const bookingId = req.params.bookingId;
    const booking = await queryOne<{ id: string; rider_id: string; ride_id: string; seats: number; status: string }>(
      'SELECT id, rider_id, ride_id, seats, status FROM bookings WHERE id = $1', [bookingId]
    );
    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }
    if (booking.rider_id !== req.user.id) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    if (booking.status === 'completed' || booking.status === 'cancelled') {
      res.status(400).json({ error: 'Booking cannot be cancelled' });
      return;
    }

    // Restore seats
    await query('UPDATE rides SET available_seats = available_seats + $1 WHERE id = $2', [booking.seats, booking.ride_id]);

    // Refund escrow if held
    const escrow = await queryOne('SELECT id, amount FROM escrows WHERE booking_id = $1 AND status = $2', [bookingId, 'held']);
    if (escrow) {
      await query('UPDATE escrows SET status = $1, released_at = NOW() WHERE id = $2', ['refunded', escrow.id]);
      // Find rider wallet and refund
      const wallet = await queryOne<{ balance: number }>('SELECT balance FROM wallets WHERE user_id = $1', [req.user.id]);
      if (wallet) {
        await query('UPDATE wallets SET balance = balance + $1 WHERE user_id = $2', [escrow.amount, req.user.id]);
        await query(
          `INSERT INTO wallet_transactions (user_id, type, amount, status, metadata, created_at)
           VALUES ($1, 'refund', $2, 'completed', $3::jsonb, NOW())`,
          [req.user.id, escrow.amount, JSON.stringify({ booking_id: bookingId, reason: 'cancellation' })]
        );
      }
    }

    await supabaseAdmin.from('bookings').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', bookingId);

    res.json({ booking: { ...booking, status: 'cancelled' }, refund: { status: escrow ? 'refunded' : 'none' } });
  } catch (e: any) {
    console.error('Error in cancelBooking:', e);
    res.status(500).json({ error: e.message || 'Internal server error' });
  }
}

export async function payBooking(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const bookingId = req.params.bookingId;
    const body = req.body as PayBookingBody;
    const userId = req.user.id;

    const booking = await queryOne<{ id: string; rider_id: string; ride_id: string; total_amount: number; status: string; seats: number }>(
      'SELECT id, rider_id, ride_id, total_amount, status, seats FROM bookings WHERE id = $1', [bookingId]
    );
    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }
    if (booking.rider_id !== userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    // Idempotent: already confirmed — return success
    if (booking.status === 'confirmed') {
      res.json({ status: 'already_confirmed', bookingId });
      return;
    }
    if (booking.status !== 'pending') {
      res.status(400).json({ error: 'Booking cannot be paid in its current state' });
      return;
    }

    const amount = booking.total_amount;

    // Helper: cancel pending booking + restore seats
    const cancelBookingAndRestore = async () => {
      await query('UPDATE rides SET available_seats = available_seats + $1 WHERE id = $2', [booking.seats, booking.ride_id]);
      await supabaseAdmin.from('bookings').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', bookingId);
    };

    // Check wallet balance
    const wallet = await queryOne<{ balance: number; status: string }>(
      'SELECT balance, status FROM wallets WHERE user_id = $1', [userId]
    );
    if (!wallet) {
      await cancelBookingAndRestore();
      res.status(400).json({ error: 'Wallet not found' });
      return;
    }
    if (wallet.status === 'frozen') {
      await cancelBookingAndRestore();
      res.status(400).json({ error: 'Wallet is frozen' });
      return;
    }
    if (wallet.balance < amount) {
      await cancelBookingAndRestore();
      res.status(400).json({ error: 'Insufficient wallet balance' });
      return;
    }

    // Deduct from wallet atomically and move to held
    const updated = await queryOne<{ balance: number }>(
      `UPDATE wallets SET balance = balance - $1, held_amount = held_amount + $1 WHERE user_id = $2 AND balance >= $3 RETURNING balance`,
      [amount, userId, amount]
    );
    if (!updated) {
      await cancelBookingAndRestore();
      res.status(400).json({ error: 'Insufficient wallet balance' });
      return;
    }

    // Create escrow record
    const { data: escrow, error: escrowError } = await supabaseAdmin
      .from('escrows')
      .insert({
        booking_id: bookingId,
        amount,
        status: 'held',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (escrowError) {
      // Rollback wallet deduction + cancel booking
      await query('UPDATE wallets SET balance = balance + $1, held_amount = held_amount - $1 WHERE user_id = $2', [amount, userId]);
      await cancelBookingAndRestore();
      res.status(500).json({ error: 'Failed to create escrow. Payment reversed.' });
      return;
    }

    // Record wallet transaction
    await query(
      `INSERT INTO wallet_transactions (user_id, type, amount, status, metadata, created_at)
       VALUES ($1, 'booking_payment', $2, 'completed', $3::jsonb, NOW())`,
      [userId, amount, JSON.stringify({ booking_id: bookingId, escrow_id: escrow.id })]
    );

    // Update booking
    await supabaseAdmin
      .from('bookings')
      .update({
        status: 'confirmed',
        payment_status: 'completed',
        escrow_id: escrow.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    // Notify driver
    const ride = await queryOne<{ driver_id: string }>('SELECT driver_id FROM rides WHERE id = $1', [booking.ride_id]);
    if (ride?.driver_id) {
      const riderProfile = await queryOne<{ first_name: string; last_name: string }>('SELECT first_name, last_name FROM profiles WHERE user_id = $1', [userId]);
      const riderName = riderProfile
        ? `${riderProfile.first_name || ''} ${riderProfile.last_name || ''}`.trim() || 'A rider'
        : 'A rider';
      const io = getIO();
      if (io) {
        io.to(`user:${ride.driver_id}`).emit('booking_paid', { bookingId, riderName, amount });
      }
      await NotificationService.sendNotification(
        ride.driver_id,
        'Booking Payment Confirmed',
        `${riderName} paid ₦${Number(amount).toLocaleString()} for their booking.`,
        'booking',
        { bookingId, amount: String(amount) }
      );
    }

    res.json({
      payment: { id: bookingId, amount, method: body.paymentMethod || 'wallet', status: 'completed' },
      escrow: { id: escrow.id, status: 'held', amount },
    });
  } catch (e: any) {
    console.error('Error in payBooking:', e);
    res.status(500).json({ error: e.message || 'Internal server error' });
  }
}

export async function confirmPaystackBooking(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const bookingId = req.params.bookingId;

    const booking = await queryOne<{ id: string; rider_id: string; ride_id: string; total_amount: number; status: string; payment_reference: string }>(
      'SELECT id, rider_id, ride_id, total_amount, status, payment_reference FROM bookings WHERE id = $1', [bookingId]
    );
    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }
    if (booking.rider_id !== req.user.id) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    // Idempotent: if already confirmed, return success
    if (booking.status === 'confirmed') {
      res.json({ status: 'already_confirmed', bookingId });
      return;
    }
    if (booking.status !== 'pending' && booking.status !== 'accepted') {
      res.status(400).json({ error: 'Booking cannot be confirmed in its current state' });
      return;
    }

    // Verify the payment record exists
    if (!booking.payment_reference) {
      res.status(400).json({ error: 'No payment reference found for this booking' });
      return;
    }

    const payment = await queryOne(
      'SELECT * FROM payments WHERE reference = $1 AND status = $2',
      [booking.payment_reference, 'pending']
    );
    if (!payment) {
      res.status(400).json({ error: 'Payment record not found or already processed' });
      return;
    }

    // Create escrow
    const { data: escrow, error: escrowError } = await supabaseAdmin
      .from('escrows')
      .insert({
        booking_id: bookingId,
        amount: booking.total_amount,
        status: 'held',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (escrowError) {
      res.status(500).json({ error: 'Failed to create escrow' });
      return;
    }

    // Update booking
    await supabaseAdmin
      .from('bookings')
      .update({
        status: 'confirmed',
        payment_status: 'completed',
        escrow_id: escrow.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    // Notify driver
    const ride = await queryOne<{ driver_id: string; from: string; to: string }>('SELECT driver_id, "from", "to" FROM rides WHERE id = $1', [booking.ride_id]);
    if (ride?.driver_id) {
      const io = getIO();
      if (io) {
        io.to(`user:${ride.driver_id}`).emit('booking_confirmed', { bookingId, amount: booking.total_amount });
      }
      await NotificationService.sendNotification(
        ride.driver_id,
        'Booking Payment Confirmed',
        `A rider paid ₦${Number(booking.total_amount).toLocaleString()} via card for their booking.`,
        'booking',
        { bookingId, amount: String(booking.total_amount) }
      );
    }

    res.json({ status: 'confirmed', bookingId, escrow: { id: escrow.id, status: 'held', amount: booking.total_amount } });
  } catch (e: any) {
    console.error('Error in confirmPaystackBooking:', e);
    res.status(500).json({ error: e.message || 'Internal server error' });
  }
}

export async function completeBooking(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const bookingId = req.params.bookingId;
    const booking = await queryOne<{ id: string; rider_id: string; ride_id: string; status: string; total_amount: number }>(
      'SELECT id, rider_id, ride_id, status, total_amount FROM bookings WHERE id = $1', [bookingId]
    );
    if (!booking) { res.status(404).json({ error: 'Booking not found' }); return; }
    if (booking.rider_id !== req.user.id) { res.status(403).json({ error: 'Forbidden' }); return; }
    if (booking.status !== 'in_progress') { res.status(400).json({ error: 'Booking must be in progress to complete' }); return; }

    await supabaseAdmin
      .from('bookings')
      .update({
        status: 'completed',
        dropoff_confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    // Notify driver
    const ride = await queryOne<{ driver_id: string; from: string; to: string }>('SELECT driver_id, "from", "to" FROM rides WHERE id = $1', [booking.ride_id]);
    if (ride?.driver_id) {
      const io = getIO();
      if (io) io.to(`user:${ride.driver_id}`).emit('booking_completed', { bookingId, amount: booking.total_amount });
      await NotificationService.sendNotification(
        ride.driver_id,
        'Rider Completed Booking',
        'A rider marked their booking as completed. The payment is held in escrow pending admin approval.',
        'booking',
        { bookingId, amount: String(booking.total_amount), escrow: 'held_for_admin' }
      );
    }
    // Notify admins
    await NotificationService.notifyAdmins(
      'Booking Completed - Pending Approval',
      `A booking (₦${Number(booking.total_amount).toLocaleString()}) is pending admin approval for escrow release.`,
      'admin_alert',
      { bookingId, amount: String(booking.total_amount) }
    );
    await emitToAdmins('admin_notification', {
      title: 'Booking Completed - Pending Approval',
      body: `A booking (₦${Number(booking.total_amount).toLocaleString()}) is pending admin approval for escrow release.`,
      data: { bookingId, amount: booking.total_amount },
    });

    res.json({ success: true, release: { status: 'escrow_held_for_admin' } });
  } catch (e) {
    console.error('Error in completeBooking:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function rateBooking(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const bookingId = req.params.bookingId;
    const body = req.body as RateBookingBody;

    const booking = await queryOne<{ id: string; ride_id: string; rider_id: string }>(
      'SELECT id, ride_id, rider_id FROM bookings WHERE id = $1', [bookingId]
    );
    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    // Determine from/to based on role
    const ride = await queryOne<{ driver_id: string }>('SELECT driver_id FROM rides WHERE id = $1', [booking.ride_id]);
    if (!ride) {
      res.status(404).json({ error: 'Ride not found' });
      return;
    }

    if (body.role === 'driver') {
      res.status(400).json({ error: 'Only riders can rate drivers.' });
      return;
    }

    const fromUserId = booking.rider_id;
    const toUserId = ride.driver_id;

    const { data: rating, error } = await supabaseAdmin
      .from('reviews')
      .insert({
        booking_id: bookingId,
        ride_id: booking.ride_id,
        reviewer_id: fromUserId,
        reviewee_id: toUserId,
        rating: body.rating,
        comment: body.review ?? null,
        role: body.role,
      })
      .select()
      .single();
    if (error) {
      if (error.message?.includes('unique constraint') || error.message?.includes('duplicate key')) {
        res.status(400).json({ error: 'You have already rated this ride.' });
        return;
      }
      res.status(400).json({ error: error.message });
      return;
    }
    res.json({ rating });
  } catch (e: any) {
    console.error('Error in rateBooking:', e);
    res.status(500).json({ error: e.message || 'Internal server error' });
  }
}

export async function getReceipt(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const bookingId = req.params.bookingId;
    const booking = await queryOne('SELECT * FROM bookings WHERE id = $1', [bookingId]);
    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }
    res.json({
      receipt: {
        bookingId,
        amount: booking.total_amount,
        seats: booking.seats,
        status: booking.status,
      },
      transaction: { id: bookingId, type: 'booking', amount: booking.total_amount },
    });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function confirmPickup(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const bookingId = req.params.bookingId;
    await supabaseAdmin
      .from('bookings')
      .update({
        pickup_confirmed_at: new Date().toISOString(),
        status: 'in_progress',
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId);
    res.json({ status: 'pickup_confirmed' });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function confirmDropoff(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const bookingId = req.params.bookingId;
    await supabaseAdmin
      .from('bookings')
      .update({
        dropoff_confirmed_at: new Date().toISOString(),
        status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId);
    res.json({ status: 'dropoff_confirmed', escrow: { held_for_admin: true } });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getDriverPendingBookings(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }
    const bookings = await query(
      `SELECT b.*, r.from, r.to, r.departure_time, p.first_name AS rider_first_name, p.last_name AS rider_last_name
       FROM bookings b
       JOIN rides r ON r.id = b.ride_id
       LEFT JOIN profiles p ON p.user_id = b.rider_id
       WHERE r.driver_id = $1 AND b.status = 'pending'
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );
    res.json({ bookings: bookings ?? [] });
  } catch (e) {
    console.error('Error in getDriverPendingBookings:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function acceptBooking(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }
    const bookingId = req.params.bookingId;
    const booking = await queryOne<{ id: string; ride_id: string; status: string; payment_status: string; rider_id: string; total_amount: number }>(
      `SELECT b.id, b.ride_id, b.status, b.payment_status, b.rider_id, b.total_amount
       FROM bookings b JOIN rides r ON r.id = b.ride_id WHERE b.id = $1 AND r.driver_id = $2`,
      [bookingId, req.user.id]
    );
    if (!booking) { res.status(404).json({ error: 'Booking not found' }); return; }
    if (booking.status !== 'pending') { res.status(400).json({ error: 'Booking is not pending' }); return; }
    const newStatus = booking.payment_status === 'completed' ? 'confirmed' : 'accepted';
    await supabaseAdmin.from('bookings').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', bookingId);
    // Notify rider
    const ride = await queryOne<{ driver_id: string; from: string; to: string }>('SELECT driver_id, "from", "to" FROM rides WHERE id = $1', [booking.ride_id]);
    const io = getIO();
    if (io) io.to(`user:${booking.rider_id}`).emit('booking_accepted', { bookingId, status: newStatus });
    await NotificationService.sendNotification(
      booking.rider_id,
      'Booking Accepted',
      `Your booking has been ${newStatus === 'confirmed' ? 'confirmed' : 'accepted'} by the driver.`,
      'booking',
      { bookingId, status: newStatus }
    );
    res.json({ status: newStatus, bookingId });
  } catch (e) {
    console.error('Error in acceptBooking:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function rejectBooking(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }
    const bookingId = req.params.bookingId;
    const booking = await queryOne<{ id: string; ride_id: string; status: string }>(
      `SELECT b.id, b.ride_id, b.status FROM bookings b JOIN rides r ON r.id = b.ride_id WHERE b.id = $1 AND r.driver_id = $2`,
      [bookingId, req.user.id]
    );
    if (!booking) { res.status(404).json({ error: 'Booking not found' }); return; }
    if (booking.status !== 'pending') { res.status(400).json({ error: 'Booking is not pending' }); return; }
    await supabaseAdmin.from('bookings').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', bookingId);
    const bk = await queryOne<{ seats: number }>('SELECT seats FROM bookings WHERE id = $1', [bookingId]);
    if (bk) await query('UPDATE rides SET available_seats = available_seats + $1 WHERE id = $2', [bk.seats, booking.ride_id]);
    res.json({ status: 'cancelled', bookingId });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
