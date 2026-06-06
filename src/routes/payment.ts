import express, { Router, Response, Request } from 'express';
import axios from 'axios';
import crypto from 'crypto';
import Joi from 'joi';
import { config } from '../config';
import { supabase } from '../services/supabase';
import { AuthRequest } from '../middleware/auth';
import { NotificationService } from '../services/notification';

const router: Router = express.Router();

const initiatePaymentSchema = Joi.object({
  bookingId: Joi.string().required(),
  email: Joi.string().email().required(),
  amount: Joi.number().positive().required(),
});

router.post('/initiate', async (req: AuthRequest, res: Response) => {
  try {
    const { error: validationError, value } = initiatePaymentSchema.validate(req.body);
    if (validationError) return res.status(400).json({ error: validationError.details[0].message });
    const { bookingId, email, amount } = value;
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .eq('rider_id', req.userId)
      .single();
    if (bookingError || !booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.total_price !== amount) return res.status(400).json({ error: 'Amount mismatch' });
    if (booking.status !== 'accepted') return res.status(400).json({ error: 'Booking must be accepted by the driver before payment' });
    try {
      const response = await axios.post(
        `${config.paystack.baseUrl}/transaction/initialize`,
        { email, amount: Math.round(amount * 100), metadata: { bookingId, userId: req.userId } },
        { headers: { Authorization: `Bearer ${config.paystack.secretKey}` } }
      );
      const { authorization_url, access_code, reference } = response.data.data;
      await supabase.from('bookings').update({ payment_reference: reference, payment_status: 'initiated' }).eq('id', bookingId);
      return res.json({ authorizationUrl: authorization_url, reference, accessCode: access_code });
    } catch (paystackError: unknown) {
      const err = paystackError as { response?: { data?: { message?: string } } };
      console.error('Paystack error:', err.response?.data);
      return res.status(500).json({ error: 'Payment initiation failed', details: err.response?.data?.message });
    }
  } catch (err) {
    console.error('Payment initiation error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/verify/:reference', async (req: AuthRequest, res: Response) => {
  try {
    const { reference } = req.params;
    try {
      const response = await axios.get(
        `${config.paystack.baseUrl}/transaction/verify/${reference}`,
        { headers: { Authorization: `Bearer ${config.paystack.secretKey}` } }
      );
      const paymentData = response.data.data;
      if (paymentData.status !== 'success') return res.status(400).json({ error: 'Payment verification failed' });
      const { bookingId } = paymentData.metadata;
      const { data: booking, error: bookingError } = await supabase.from('bookings').select('*').eq('id', bookingId).single();
      if (bookingError || !booking) return res.status(404).json({ error: 'Booking not found' });
      const { data: escrow, error: escrowError } = await supabase
        .from('escrows')
        .insert([{ booking_id: bookingId, amount: booking.total_price, status: 'held', hold_reason: `Payment for booking: ${bookingId}` }])
        .select()
        .single();
      if (escrowError) return res.status(500).json({ error: 'Failed to create escrow' });
      await supabase.from('bookings').update({ status: 'confirmed', escrow_id: escrow.id, payment_status: 'completed' }).eq('id', bookingId);
      await supabase.from('transactions').insert([{
        user_id: req.userId,
        type: 'held',
        amount: booking.total_price,
        status: 'completed',
        description: `Payment held in escrow for booking: ${bookingId}`,
        related_id: escrow.id,
      }]);
      const { data: wallet } = await supabase.from('wallets').select('held_amount').eq('user_id', req.userId).single();
      if (wallet) await supabase.from('wallets').update({ held_amount: wallet.held_amount + booking.total_price }).eq('user_id', req.userId);
      
      const { data: ride } = await supabase.from('rides').select('available_seats, from, to, driver_id').eq('id', booking.ride_id).single();
      if (ride) await supabase.from('rides').update({ available_seats: ride.available_seats - booking.seats_booked }).eq('id', booking.ride_id);

      // Notify rider about confirmed booking
      await NotificationService.sendNotification(
        req.userId!,
        'Booking Confirmed!',
        `Your booking from ${ride?.from} to ${ride?.to} is confirmed. Payment of ₦${booking.total_price} received.`,
        'booking',
        { bookingId, escrowId: escrow.id }
      );

      // Notify driver about new booking
      if (ride?.driver_id) {
        await NotificationService.sendNotification(
          ride.driver_id,
          'New Ride Booking',
          `A passenger has booked a seat on your ride from ${ride.from} to ${ride.to}.`,
          'booking',
          { bookingId }
        );
      }

      // Notify admins
      await NotificationService.notifyAdmins(
        'New Booking (Card Payment)',
        `A booking (ID: ${bookingId}) was confirmed via Paystack by user ${req.userId}.`,
        'admin_alert',
        { bookingId }
      );

      return res.json({ message: 'Payment verified successfully', bookingId, escrowId: escrow.id, status: 'confirmed' });
    } catch (paystackError: unknown) {
      const err = paystackError as { response?: { data?: { message?: string } } };
      console.error('Paystack verification error:', err.response?.data);
      return res.status(500).json({ error: 'Payment verification failed', details: err.response?.data?.message });
    }
  } catch (err) {
    console.error('Verify payment error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export async function paystackWebhookHandler(req: Request, res: Response): Promise<void> {
  try {
    const hash = crypto.createHmac('sha512', config.paystack.secretKey).update(JSON.stringify(req.body)).digest('hex');
    if (hash !== req.headers['x-paystack-signature']) {
      res.status(403).json({ error: 'Invalid signature' });
      return;
    }

    const event = req.body;

    if (event.event === 'charge.success') {
      const { reference, metadata, amount } = event.data;
      const bookingId: string | undefined = metadata?.bookingId;
      const userId: string | undefined = metadata?.userId;

      if (!bookingId || !userId) {
        console.warn('Webhook charge.success: missing bookingId or userId in metadata', metadata);
        res.json({ status: 'ok' });
        return;
      }

      // Fetch booking — skip if already confirmed (idempotency guard)
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single();

      if (bookingError || !booking) {
        console.error('Webhook: booking not found', bookingId);
        res.json({ status: 'ok' });
        return;
      }

      if (booking.status === 'confirmed') {
        // Already processed — safe to acknowledge
        res.json({ status: 'ok' });
        return;
      }

      // Create escrow record
      const { data: escrow, error: escrowError } = await supabase
        .from('escrows')
        .insert([{
          booking_id: bookingId,
          amount: booking.total_price,
          status: 'held',
          hold_reason: `Payment for booking: ${bookingId}`,
        }])
        .select()
        .single();

      if (escrowError || !escrow) {
        console.error('Webhook: failed to create escrow', escrowError);
        res.status(500).json({ error: 'Escrow creation failed' });
        return;
      }

      // Confirm the booking
      await supabase
        .from('bookings')
        .update({ status: 'confirmed', escrow_id: escrow.id, payment_status: 'completed', payment_reference: reference })
        .eq('id', bookingId);

      // Record transaction
      await supabase.from('transactions').insert([{
        user_id: userId,
        type: 'held',
        amount: booking.total_price,
        status: 'completed',
        description: `Payment held in escrow for booking: ${bookingId}`,
        related_id: escrow.id,
      }]);

      // Update rider's held_amount in wallet
      const { data: wallet } = await supabase
        .from('wallets')
        .select('held_amount')
        .eq('user_id', userId)
        .single();

      if (wallet) {
        await supabase
          .from('wallets')
          .update({ held_amount: wallet.held_amount + booking.total_price })
          .eq('user_id', userId);
      }

      // Decrement available seats on the ride
      const { data: ride } = await supabase
        .from('rides')
        .select('available_seats, from, to, driver_id')
        .eq('id', booking.ride_id)
        .single();

      if (ride) {
        await supabase
          .from('rides')
          .update({ available_seats: Math.max(0, ride.available_seats - booking.seats_booked) })
          .eq('id', booking.ride_id);
      }

      // Notify rider about confirmed booking
      await NotificationService.sendNotification(
        userId,
        'Booking Confirmed!',
        `Your booking from ${ride?.from} to ${ride?.to} is confirmed. Payment of ₦${booking.total_price} received.`,
        'booking',
        { bookingId, reference }
      );

      // Notify driver about new booking
      if (ride?.driver_id) {
        await NotificationService.sendNotification(
          ride.driver_id,
          'New Ride Booking',
          `A passenger has booked a seat on your ride from ${ride.from} to ${ride.to}.`,
          'booking',
          { bookingId }
        );
      }

      // Notify admins
      await NotificationService.notifyAdmins(
        'New Booking (Webhook)',
        `A booking (ID: ${bookingId}) was confirmed via Paystack webhook.`,
        'admin_alert',
        { bookingId, reference }
      );

      console.log(`Webhook: booking ${bookingId} confirmed via Paystack ref ${reference}. Amount: ${amount / 100}`);
    }

    res.json({ status: 'ok' });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}


export default router;
