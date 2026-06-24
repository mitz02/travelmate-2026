import { Request, Response } from 'express';
import crypto from 'crypto';
import { config } from '../config';
import { supabase } from '../services/supabase';
import { NotificationService } from '../services/notification';

export async function paystackWebhook(req: Request, res: Response): Promise<void> {
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
        res.json({ status: 'ok' });
        return;
      }

      const { data: escrow, error: escrowError } = await supabase
        .from('escrows')
        .insert([{
          booking_id: bookingId,
          amount: booking.total_amount,
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

      await supabase
        .from('bookings')
        .update({ status: 'confirmed', escrow_id: escrow.id, payment_status: 'completed', payment_reference: reference })
        .eq('id', bookingId);

      await supabase.from('transactions').insert([{
        user_id: userId,
        type: 'held',
        amount: booking.total_amount,
        status: 'completed',
        description: `Payment held in escrow for booking: ${bookingId}`,
        related_id: escrow.id,
      }]);

      const { data: wallet } = await supabase
        .from('wallets')
        .select('held_amount')
        .eq('user_id', userId)
        .single();

      if (wallet) {
        await supabase
          .from('wallets')
          .update({ held_amount: wallet.held_amount + booking.total_amount })
          .eq('user_id', userId);
      }

      const { data: ride } = await supabase
        .from('rides')
        .select('from, to, driver_id')
        .eq('id', booking.ride_id)
        .single();

      await NotificationService.sendNotification(
        userId,
        'Booking Confirmed!',
        `Your booking from ${ride?.from} to ${ride?.to} is confirmed. Payment of ₦${booking.total_amount} received.`,
        'booking',
        { bookingId, reference }
      );

      if (ride?.driver_id) {
        await NotificationService.sendNotification(
          ride.driver_id,
          'New Ride Booking',
          `A passenger has booked a seat on your ride from ${ride.from} to ${ride.to}.`,
          'booking',
          { bookingId }
        );
      }

      await NotificationService.notifyAdmins(
        'New Booking (Webhook)',
        `A booking (ID: ${bookingId}) was confirmed via Paystack webhook.`,
        'admin_alert',
        { bookingId, reference }
      );

      console.log(`Webhook: booking ${bookingId} confirmed via Paystack ref ${reference}. Amount: ${amount / 100}`);
    }

    if (event.event === 'transfer.success') {
      const transfer = event.data;
      const transferCode = transfer.transfer_code;

      const { data: tx } = await supabase
        .from('wallet_transactions')
        .select('id, user_id, metadata')
        .filter('metadata->>transferCode', 'eq', transferCode)
        .single();

      if (tx) {
        await supabase
          .from('wallet_transactions')
          .update({ status: 'completed', metadata: { ...(tx.metadata || {}), transferStatus: 'success' } })
          .eq('id', tx.id);

        console.log(`Webhook: withdrawal ${transferCode} completed for user ${tx.user_id}. Amount: ${transfer.amount / 100}`);
      }
    }

    if (event.event === 'transfer.failed' || event.event === 'transfer.reversed') {
      const transfer = event.data;
      const transferCode = transfer.transfer_code;

      const { data: tx } = await supabase
        .from('wallet_transactions')
        .select('id, user_id, amount, metadata')
        .filter('metadata->>transferCode', 'eq', transferCode)
        .single();

      if (tx) {
        const reversedAmount = Math.abs(tx.amount);
        const { data: wallet } = await supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', tx.user_id)
          .single();
        if (wallet) {
          await supabase
            .from('wallets')
            .update({ balance: wallet.balance + reversedAmount })
            .eq('user_id', tx.user_id);
        }

        await supabase
          .from('wallet_transactions')
          .update({ status: 'failed', metadata: { ...(tx.metadata || {}), transferStatus: transfer.status, failReason: transfer.fail_reason } })
          .eq('id', tx.id);

        await supabase
          .from('wallet_transactions')
          .insert({
            user_id: tx.user_id,
            type: 'withdrawal_reversal',
            amount: reversedAmount,
            status: 'completed',
            metadata: { originalTransferCode: transferCode, reason: transfer.fail_reason },
          });

        console.log(`Webhook: withdrawal ${transferCode} failed for user ${tx.user_id}. Reason: ${transfer.fail_reason}`);
      }
    }

    res.json({ status: 'ok' });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

export async function vtpassWebhook(req: Request, res: Response): Promise<void> {
  try {
    const body = req.body as Record<string, unknown>;
    console.log('VTPass webhook received:', body);
    res.status(200).send();
  } catch (e) {
    res.status(500).send();
  }
}

export async function termiiWebhook(req: Request, res: Response): Promise<void> {
  try {
    const body = req.body as Record<string, unknown>;
    console.log('Termii webhook received:', body);
    res.status(200).send();
  } catch (e) {
    res.status(500).send();
  }
}
