import { Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { AuthRequest } from '../middleware/auth';
import type { InitializePaymentBody, ChargeCardBody, SaveCardBody } from '../validators/payments';

export async function initializePayment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const body = req.body as InitializePaymentBody;
    const reference = `pay_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    res.status(200).json({
      authorizationUrl: `https://checkout.paystack.com/?amount=${body.amount * 100}&email=${encodeURIComponent(body.email)}&reference=${reference}`,
      reference,
    });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function verifyPayment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const reference = req.params.reference;
    const { data: payment, error } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('reference', reference)
      .single();
    if (error || !payment) {
      res.status(404).json({ error: 'Payment not found' });
      return;
    }
    res.json({
      status: payment.status ?? 'success',
      amount: payment.amount,
      customer: payment.customer ?? {},
    });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function chargeCard(req: AuthRequest, res: Response): Promise<void> {
  try {
    const body = req.body as ChargeCardBody;
    const reference = `charge_${Date.now()}`;
    res.json({
      status: 'success',
      transaction: { id: reference, amount: body.amount, email: body.email },
    });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getSavedMethods(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.params.userId === 'me' ? req.user?.id : req.params.userId;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const { data: methods } = await supabaseAdmin
      .from('payment_methods')
      .select('*')
      .eq('user_id', userId);
    const cards = (methods ?? []).filter((m: { type: string }) => m.type === 'card');
    const banks = (methods ?? []).filter((m: { type: string }) => m.type === 'bank');
    res.json({ cards, banks });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function saveCard(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const body = req.body as SaveCardBody;
    const { data: method, error } = await supabaseAdmin
      .from('payment_methods')
      .insert({
        user_id: req.user.id,
        type: 'card',
        authorization_code: body.authorizationCode,
        last4: body.last4,
        exp: body.exp,
      })
      .select()
      .single();
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(201).json({ method });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteMethod(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const methodId = req.params.methodId;
    const { error } = await supabaseAdmin
      .from('payment_methods')
      .delete()
      .eq('id', methodId)
      .eq('user_id', req.user.id);
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
