import express, { Router, Response } from 'express';
import Joi from 'joi';
import { supabase } from '../services/supabase';
import { AuthRequest } from '../middleware/auth';
import { NotificationService } from '../services/notification';

const router: Router = express.Router();

const bookingSchema = Joi.object({
  rideId: Joi.string().required(),
  seatsBooked: Joi.number().positive().integer().required(),
  paymentMethod: Joi.string().valid('wallet', 'paystack').required(),
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { error: validationError, value } = bookingSchema.validate(req.body);
    if (validationError) return res.status(400).json({ error: validationError.details[0].message });
    const { rideId, seatsBooked, paymentMethod } = value;

    // 1. Verify Ride
    const { data: ride, error: rideError } = await supabase.from('rides').select('*').eq('id', rideId).single();
    if (rideError || !ride) return res.status(404).json({ error: 'Ride not found' });
    if (ride.available_seats < seatsBooked) return res.status(400).json({ error: 'Not enough seats available' });

    // 2. Prevent exact duplicate bookings
    const { data: conflictingBookings } = await supabase
      .from('bookings')
      .select('id')
      .eq('rider_id', req.userId)
      .eq('ride_id', rideId)
      .in('status', ['pending', 'confirmed']);
    if (conflictingBookings?.length) return res.status(409).json({ error: 'You have already booked a seat on this exact ride.' });

    const totalPrice = ride.price_per_seat * seatsBooked;

    // 3. Payment Processing
    if (paymentMethod === 'wallet') {
      const { data: wallet } = await supabase.from('wallets').select('balance').eq('user_id', req.userId).single();
      if (!wallet || wallet.balance < totalPrice) return res.status(400).json({ error: 'Insufficient wallet balance' });

      // Deduct wallet balance
      await supabase.from('wallets').update({ balance: wallet.balance - totalPrice }).eq('user_id', req.userId);
      
      // Record transaction
      await supabase.from('transactions').insert([{
        user_id: req.userId,
        type: 'payment',
        amount: totalPrice,
        status: 'completed',
        description: `Ride booking payment: ${ride.from} to ${ride.to}`,
      }]);

      // Create confirmed booking
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert([{ ride_id: rideId, rider_id: req.userId, status: 'confirmed', seats_booked: seatsBooked, total_price: totalPrice, payment_status: 'completed' }])
        .select()
        .single();
        
      if (bookingError) return res.status(500).json({ error: 'Failed to create booking' });
      
      // Reduce available seats
      await supabase.from('rides').update({ available_seats: ride.available_seats - seatsBooked }).eq('id', rideId);

      // Send notifications
      const passengerProfile = await supabase.from('profiles').select('first_name, last_name').eq('id', req.userId).single();
      const passengerName = passengerProfile.data ? `${passengerProfile.data.first_name} ${passengerProfile.data.last_name}` : 'A passenger';

      await NotificationService.sendNotification(
        ride.driver_id,
        'New Ride Booking',
        `${passengerName} booked ${seatsBooked} seat(s) for your ride from ${ride.from} to ${ride.to}.`,
        'booking',
        { bookingId: booking.id, rideId }
      );

      await NotificationService.notifyAdmins(
        'New Ride Booking',
        `A new booking was made for ride ${rideId} by user ${req.userId}.`,
        'admin_alert',
        { bookingId: booking.id, rideId }
      );

      return res.status(201).json({ id: booking.id, rideId: booking.ride_id, seatsBooked: booking.seats_booked, totalPrice: booking.total_price, status: booking.status });
    } else {
      // Paystack initialization: create a pending booking
      const reference = `bk_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert([{ ride_id: rideId, rider_id: req.userId, status: 'pending', seats_booked: seatsBooked, total_price: totalPrice, payment_reference: reference, payment_status: 'pending' }])
        .select()
        .single();
        
      if (bookingError) return res.status(500).json({ error: 'Failed to create pending booking' });
      return res.status(201).json({ id: booking.id, rideId: booking.ride_id, seatsBooked: booking.seats_booked, totalPrice: booking.total_price, status: booking.status, reference, email: req.user?.email || 'user@example.com' });
    }
  } catch (err) {
    console.error('Create booking error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/accept', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    // First, verify the user is the driver for this booking's ride
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*, rides!inner(driver_id)')
      .eq('id', id)
      .single();

    if (bookingError || !booking) return res.status(404).json({ error: 'Booking not found' });
    
    const rides = Array.isArray(booking.rides) ? booking.rides[0] : booking.rides;
    const isDriver = (rides as any)?.driver_id === req.userId;
    
    if (!isDriver) return res.status(403).json({ error: 'Only the driver can accept this booking' });
    if (booking.status !== 'pending') return res.status(400).json({ error: 'Only pending bookings can be accepted' });

    await supabase.from('bookings').update({ status: 'accepted' }).eq('id', id);

    return res.json({ message: 'Booking accepted successfully', status: 'accepted' });
  } catch (err) {
    console.error('Accept booking error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { status, role = 'rider' } = req.query;
    let query = supabase
      .from('bookings')
      .select('*, rides!inner(from, to, departure_time, price_per_seat, driver_id, driver:driver_id(first_name, last_name, profile_picture, ratings), available_seats)')
      .order('created_at', { ascending: false });
    if (role === 'driver') query = query.eq('rides.driver_id', req.userId);
    else query = query.eq('rider_id', req.userId);
    if (status && status !== 'all') query = query.eq('status', status);
    const { data: bookings, error } = await query;
    if (error) return res.status(500).json({ error: 'Failed to fetch bookings' });
    return res.json({
      bookings: (bookings || []).map((b: Record<string, unknown>) => {
        const rides = Array.isArray(b.rides) ? b.rides[0] : b.rides;
        return {
          id: b.id,
          rideId: b.ride_id,
          from: (rides as Record<string, unknown>)?.from,
          to: (rides as Record<string, unknown>)?.to,
          departureTime: (rides as Record<string, unknown>)?.departure_time,
          driver: (rides as Record<string, unknown>)?.driver,
          seatsBooked: b.seats_booked,
          totalPrice: b.total_price,
          status: b.status,
          createdAt: b.created_at,
          availableSeats: (rides as Record<string, unknown>)?.available_seats,
        };
      }),
    });
  } catch (err) {
    console.error('Get bookings error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { data: booking, error } = await supabase
      .from('bookings')
      .select('*, rides!inner(from, to, departure_time, price_per_seat, driver_id, available_seats, total_seats)')
      .eq('id', id)
      .single();
    if (error || !booking) return res.status(404).json({ error: 'Booking not found' });
    const rides = Array.isArray(booking.rides) ? booking.rides[0] : booking.rides;
    const isRider = booking.rider_id === req.userId;
    const isDriver = rides?.driver_id === req.userId;
    if (!isRider && !isDriver) return res.status(403).json({ error: 'Unauthorized' });
    return res.json({
      id: booking.id,
      rideId: booking.ride_id,
      riderId: booking.rider_id,
      from: rides?.from,
      to: rides?.to,
      departureTime: rides?.departure_time,
      seatsBooked: booking.seats_booked,
      totalPrice: booking.total_price,
      status: booking.status,
      paymentReference: booking.payment_reference,
      createdAt: booking.created_at,
    });
  } catch (err) {
    console.error('Get booking error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/cancel', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const { data: booking, error: bookingError } = await supabase.from('bookings').select('*').eq('id', id).eq('rider_id', req.userId).single();
    if (bookingError || !booking) return res.status(404).json({ error: 'Booking not found' });
    if (!['pending', 'confirmed'].includes(booking.status)) return res.status(400).json({ error: 'Cannot cancel this booking' });
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id);

    if (booking.payment_status === 'completed') {
      await supabase.from('transactions').insert([{
        user_id: req.userId,
        type: 'refund',
        amount: booking.total_price,
        status: 'completed',
        description: `Booking cancellation refund: ${reason ?? 'No reason provided'}`,
      }]);
      const { data: wallet } = await supabase.from('wallets').select('balance, held_amount').eq('user_id', req.userId).single();
      if (wallet) await supabase.from('wallets').update({ balance: wallet.balance + booking.total_price, held_amount: wallet.held_amount - booking.total_price }).eq('user_id', req.userId);
    }

    if (booking.status === 'confirmed') {
      const { data: ride } = await supabase.from('rides').select('available_seats').eq('id', booking.ride_id).single();
      if (ride) await supabase.from('rides').update({ available_seats: ride.available_seats + booking.seats_booked }).eq('id', booking.ride_id);
    }

    return res.json({ message: 'Booking cancelled successfully', refundAmount: booking.payment_status === 'completed' ? booking.total_price : 0 });
  } catch (err) {
    console.error('Cancel booking error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
