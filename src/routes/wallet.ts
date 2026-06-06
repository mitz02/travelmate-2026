import express, { Router, Response } from 'express';
import axios from 'axios';
import Joi from 'joi';
import { config } from '../config';
import { supabase } from '../services/supabase';
import { AuthRequest } from '../middleware/auth';

const router: Router = express.Router();

const withdrawalSchema = Joi.object({
  amount: Joi.number().positive().required(),
  bankCode: Joi.string().required(),
  accountNumber: Joi.string().required(),
});

const depositSchema = Joi.object({
  amount: Joi.number().positive().required(),
  paymentMethod: Joi.string().valid('card', 'bank_transfer').required(),
});

router.get('/balance', async (req: AuthRequest, res: Response) => {
  try {
    const { data: wallet, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', req.userId)
      .single();
      
    if (error || !wallet) return res.status(404).json({ error: 'Wallet not found' });

    // Calculate pending withdrawals
    const { data: pendingTxs } = await supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', req.userId)
      .eq('type', 'withdrawal')
      .eq('status', 'pending');
      
    const pendingAmount = pendingTxs?.reduce((sum, tx) => sum + tx.amount, 0) || 0;

    return res.json({
      totalBalance: wallet.balance,
      availableBalance: wallet.balance - wallet.held_amount,
      heldAmount: wallet.held_amount,
      pending: pendingAmount,
      totalEarnings: wallet.total_earnings,
      totalWithdrawn: wallet.total_withdrawn,
    });
  } catch (err) {
    console.error('Get wallet error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/transactions', async (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 100);
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
    const { type, status } = req.query;
    let query = supabase
      .from('transactions')
      .select('*')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false });
    if (type && type !== 'all') query = query.eq('type', type);
    if (status && status !== 'all') query = query.eq('status', status);
    const { data: transactions, error } = await query.range(offset, offset + limit - 1);
    if (error) return res.status(500).json({ error: 'Failed to fetch transactions' });
    return res.json({
      transactions: (transactions || []).map((t: Record<string, unknown>) => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        status: t.status,
        description: t.description,
        createdAt: t.created_at,
      })),
      total: (transactions || []).length,
    });
  } catch (err) {
    console.error('Get transactions error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/withdraw', async (req: AuthRequest, res: Response) => {
  try {
    const { error: validationError, value } = withdrawalSchema.validate(req.body);
    if (validationError) return res.status(400).json({ error: validationError.details[0].message });

    const { amount, bankCode, accountNumber } = value;

    // 1. Check available balance
    const { data: wallet } = await supabase
      .from('wallets')
      .select('balance, held_amount')
      .eq('user_id', req.userId)
      .single();

    if (!wallet) return res.status(404).json({ error: 'Wallet not found' });

    const available = wallet.balance - wallet.held_amount;
    if (available < amount) {
      return res.status(400).json({
        error: 'Insufficient available balance',
        available,
        requested: amount,
      });
    }

    // 2. Create a Paystack transfer recipient
    let recipientCode: string;
    try {
      const recipientRes = await axios.post(
        `${config.paystack.baseUrl}/transferrecipient`,
        {
          type: 'nuban',
          currency: 'NGN',
          bank_code: bankCode,
          account_number: accountNumber,
        },
        { headers: { Authorization: `Bearer ${config.paystack.secretKey}` } },
      );
      recipientCode = recipientRes.data.data.recipient_code;
    } catch (paystackErr: unknown) {
      const err = paystackErr as { response?: { data?: { message?: string } } };
      console.error('Paystack create recipient error:', err.response?.data);
      return res.status(400).json({
        error: 'Could not create transfer recipient. Please verify your bank details.',
        details: err.response?.data?.message,
      });
    }

    // 3. Initiate the transfer (amount in kobo)
    let transferCode: string;
    let transferStatus: string;
    try {
      const transferRes = await axios.post(
        `${config.paystack.baseUrl}/transfer`,
        {
          source: 'balance',
          amount: Math.round(amount * 100),   // kobo
          recipient: recipientCode,
          reason: `TravelMate wallet withdrawal — user ${req.userId}`,
          currency: 'NGN',
        },
        { headers: { Authorization: `Bearer ${config.paystack.secretKey}` } },
      );
      transferCode = transferRes.data.data.transfer_code;
      transferStatus = transferRes.data.data.status; // 'pending' | 'success' | 'failed'
    } catch (paystackErr: unknown) {
      const err = paystackErr as { response?: { data?: { message?: string } } };
      console.error('Paystack initiate transfer error:', err.response?.data);
      return res.status(502).json({
        error: 'Transfer initiation failed. Please try again later.',
        details: err.response?.data?.message,
      });
    }

    // 4. Deduct from wallet and record transaction
    await supabase
      .from('wallets')
      .update({
        balance: wallet.balance - amount,
        total_withdrawn: (wallet as unknown as Record<string, number>).total_withdrawn + amount,
      })
      .eq('user_id', req.userId);

    const { data: transaction } = await supabase
      .from('transactions')
      .insert([{
        user_id: req.userId,
        type: 'withdrawal',
        amount,
        status: transferStatus === 'success' ? 'completed' : 'pending',
        description: `Withdrawal to ${bankCode} — ${accountNumber}`,
        metadata: {
          bankCode,
          accountNumber,
          recipientCode,
          transferCode,
          paystackStatus: transferStatus,
        },
      }])
      .select()
      .single();

    return res.status(201).json({
      id: transaction?.id,
      amount,
      status: transferStatus === 'success' ? 'completed' : 'pending',
      transferCode,
      message: transferStatus === 'success'
        ? 'Withdrawal successful! Funds have been sent to your account.'
        : 'Withdrawal initiated. Funds will arrive within a few minutes.',
    });
  } catch (err) {
    console.error('Withdrawal error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/deposit', async (req: AuthRequest, res: Response) => {
  try {
    const { error: validationError, value } = depositSchema.validate(req.body);
    if (validationError) return res.status(400).json({ error: validationError.details[0].message });
    const { amount } = value;
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert([{
        user_id: req.userId,
        type: 'wallet_funding',
        amount,
        status: 'pending',
        description: 'Deposit funds to wallet',
      }])
      .select()
      .single();
    if (txError) {
      console.error('TX Error', txError);
      return res.status(500).json({ error: 'Failed to create deposit request', details: txError });
    }
    return res.status(201).json({
      id: transaction.id,
      amount,
      status: 'pending',
      message: 'Proceed to payment page to complete deposit',
    });
  } catch (err) {
    console.error('Deposit error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

const verifySchema = Joi.object({
  reference: Joi.string().required(),
});

router.post('/deposit/verify', async (req: AuthRequest, res: Response) => {
  try {
    const { error: validationError, value } = verifySchema.validate(req.body);
    if (validationError) return res.status(400).json({ error: validationError.details[0].message });
    
    const { reference } = value;

    // 1. Verify transaction with Paystack
    let paystackData;
    try {
      const verifyRes = await axios.get(
        `${config.paystack.baseUrl}/transaction/verify/${reference}`,
        { headers: { Authorization: `Bearer ${config.paystack.secretKey}` } }
      );
      paystackData = verifyRes.data.data;
    } catch (paystackErr: any) {
      console.error('Paystack verification error:', paystackErr.response?.data || paystackErr.message);
      return res.status(400).json({ error: 'Failed to verify transaction with Paystack.' });
    }

    if (paystackData.status !== 'success') {
      return res.status(400).json({ error: `Transaction is ${paystackData.status}.` });
    }

    // 2. The reference should be our transaction ID, or we check metadata. 
    // In our flow, the frontend will pass the transaction ID as the reference.
    const transactionId = reference;

    const { data: transaction } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (!transaction) return res.status(404).json({ error: 'Transaction not found in our records.' });
    
    if (transaction.status === 'completed') {
      return res.status(400).json({ error: 'Transaction has already been processed.' });
    }

    // Amount from Paystack is in kobo, convert to NGN
    const paystackAmountNGN = paystackData.amount / 100;
    
    // Ensure amount matches (optional, but good practice)
    if (paystackAmountNGN < transaction.amount) {
      console.warn(`Amount mismatch: expected ${transaction.amount}, got ${paystackAmountNGN}`);
    }

    // 3. Mark transaction as completed
    await supabase
      .from('transactions')
      .update({ 
        status: 'completed',
        metadata: { ...transaction.metadata, paystackResponse: paystackData }
      })
      .eq('id', transactionId);

    // 4. Credit user wallet
    const { data: wallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', transaction.user_id)
      .single();

    if (wallet) {
      await supabase
        .from('wallets')
        .update({ balance: wallet.balance + paystackAmountNGN })
        .eq('user_id', transaction.user_id);
    } else {
      // Create wallet if it doesn't exist
      await supabase
        .from('wallets')
        .insert([{ user_id: transaction.user_id, balance: paystackAmountNGN }]);
    }

    return res.json({ message: 'Deposit successful', amount: paystackAmountNGN });
  } catch (err) {
    console.error('Deposit verify error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
