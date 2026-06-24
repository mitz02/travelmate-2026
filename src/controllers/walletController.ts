import { Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { config } from '../config';
import { query, queryOne } from '../config/database';
import { AuthenticatedRequest } from '../types';
import * as paystack from '../services/paystack';
import type {
  FundWalletBody,
  VerifyPaymentBody,
  WithdrawWalletBody,
  TransferWalletBody,
  FreezeWalletBody,
  ResolveAccountBody,
} from '../validators/wallet';

async function ensureWallet(userId: string): Promise<void> {
  const existing = await queryOne('SELECT id FROM wallets WHERE user_id = $1', [userId]);
  if (!existing) {
    await query(
      `INSERT INTO wallets (user_id, balance, status)
       VALUES ($1, 0, 'active')`,
      [userId]
    );
  }
}

async function deductWalletAtomic(userId: string, amount: number): Promise<number> {
  if (amount <= 0) throw new Error('Invalid amount');

  const row = await queryOne<{ balance: number }>(
    `UPDATE wallets SET balance = balance - $1 WHERE user_id = $2 AND balance >= $1 RETURNING balance`,
    [amount, userId]
  );

  if (!row) {
    const existing = await queryOne<{ balance: number }>(
      `SELECT balance FROM wallets WHERE user_id = $1`, [userId]
    );
    if (!existing) throw new Error('Wallet not found');
    throw new Error('Insufficient balance');
  }

  return Number(row.balance);
}

async function creditWalletAtomic(userId: string, amount: number): Promise<number> {
  if (amount <= 0) throw new Error('Invalid amount');

  const row = await queryOne<{ balance: number }>(
    `UPDATE wallets SET balance = balance + $1 WHERE user_id = $2 RETURNING balance`,
    [amount, userId]
  );

  if (!row) throw new Error('Wallet not found');
  return Number(row.balance);
}

export async function getWallet(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.params.userId === 'me' || !req.params.userId ? req.user?.id : req.params.userId;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const wallet = await queryOne<{ balance: number; status: string }>(
      'SELECT balance, status FROM wallets WHERE user_id = $1',
      [userId]
    );
    const balance = wallet?.balance ?? 0;

    const profile = await queryOne<{ total_ratings: number; ratings: number }>(
      `SELECT total_ratings, ratings FROM profiles WHERE user_id = $1`,
      [userId]
    );

    const tripCount = await queryOne<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM bookings b
       JOIN rides r ON r.id = b.ride_id
       WHERE (b.rider_id = $1 OR r.driver_id = $1) AND b.status = 'completed'`,
      [userId]
    );

    res.json({
      balance,
      currency: 'NGN',
      status: wallet?.status ?? 'active',
      totalTrips: parseInt(tripCount?.count || '0', 10),
      averageRating: profile?.ratings ?? 0,
      totalRatings: profile?.total_ratings ?? 0,
    });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getTransactions(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.params.userId === 'me' ? req.user?.id : req.params.userId;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const { type, status, from, to, page } = req.query;
    const pageNum = Math.max(1, Number(page) || 1);
    const pageSize = 20;
    const offset = (pageNum - 1) * pageSize;

    let sql = 'SELECT * FROM wallet_transactions WHERE user_id = $1';
    const params: any[] = [userId];
    let paramIndex = 2;
    if (type) {
      sql += ` AND type = $${paramIndex++}`;
      params.push(String(type));
    }
    if (status) {
      sql += ` AND status = $${paramIndex++}`;
      params.push(String(status));
    }
    if (from) {
      sql += ` AND created_at >= $${paramIndex++}`;
      params.push(String(from));
    }
    if (to) {
      sql += ` AND created_at <= $${paramIndex++}`;
      params.push(String(to));
    }
    sql += ' ORDER BY created_at DESC LIMIT $' + paramIndex++ + ' OFFSET $' + paramIndex++;
    params.push(pageSize, offset);

    const [transactions, countResult] = await Promise.all([
      query(sql, params),
      queryOne<{ cnt: string }>('SELECT COUNT(*) as cnt FROM wallet_transactions WHERE user_id = $1', [userId]),
    ]);
    res.json({ transactions: transactions ?? [], total: parseInt(countResult?.cnt || '0', 10) });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function fundWallet(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const body = req.body as FundWalletBody;
    const email = req.user.email;
    if (!email) {
      res.status(400).json({ error: 'Email is required for payment' });
      return;
    }

    await ensureWallet(req.user.id);

    const init = await paystack.initializeTransaction(
      email,
      Math.round(body.amount * 100),
      `${config.appUrl}/wallet/callback`,
    );

    await supabaseAdmin
      .from('wallet_transactions')
      .insert({
        user_id: req.user.id,
        type: 'funding',
        amount: body.amount,
        status: 'pending',
        metadata: { reference: init.reference, paystackAccessCode: init.access_code },
      })
      .select()
      .single();

    res.json({
      authorizationUrl: init.authorization_url,
      reference: init.reference,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to initialize payment' });
  }
}

export async function verifyPayment(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const body = req.body as VerifyPaymentBody;

    const verification = await paystack.verifyTransaction(body.reference);

    if (verification.status !== 'success') {
      res.status(400).json({ error: 'Payment not successful', status: verification.status });
      return;
    }

    const amountNaira = verification.amount / 100;

    await ensureWallet(req.user.id);
    const newBalance = await creditWalletAtomic(req.user.id, amountNaira);

    await query(
      `UPDATE wallet_transactions SET status = 'completed', metadata = metadata || $1::jsonb WHERE user_id = $2 AND metadata @> $3::jsonb`,
      [JSON.stringify({ paystackData: verification }), req.user.id, JSON.stringify({ reference: body.reference })]
    );

    res.json({
      success: true,
      amount: amountNaira,
      balance: newBalance,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Payment verification failed' });
  }
}

export async function getBankAccount(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const account = await queryOne<{
      id: string;
      bank_name: string;
      bank_code: string;
      account_number: string;
      account_name: string;
      recipient_code: string | null;
    }>(
      `SELECT id, bank_name, bank_code, account_number, account_name, recipient_code
       FROM bank_accounts WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC LIMIT 1`,
      [req.user.id]
    );
    res.json({ account: account || null });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function listBanks(_req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const banks = await paystack.listBanks();
    res.json({ banks });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch banks from Paystack' });
  }
}

export async function resolveAccount(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { bankCode, accountNumber } = req.body as ResolveAccountBody;
    const result = await paystack.resolveAccount(accountNumber, bankCode);
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ error: e.message || 'Account verification failed' });
  }
}

export async function withdrawWallet(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const body = req.body as WithdrawWalletBody;

    // 1. Create Paystack transfer recipient
    let recipient;
    try {
      recipient = await paystack.createRecipient(
        body.accountName,
        body.bankCode,
        body.accountNumber
      );
    } catch (e: any) {
      res.status(400).json({ error: `Failed to create transfer recipient: ${e.message}` });
      return;
    }

    // 2. Atomically deduct from wallet (balance check + deduction in one DB op)
    let newBalance: number;
    try {
      newBalance = await deductWalletAtomic(req.user.id, body.amount);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
      return;
    }

    // 3. Initiate Paystack transfer
    let transfer;
    try {
      transfer = await paystack.initiateTransfer(
        Math.round(body.amount * 100),
        recipient.recipient_code,
        `Withdrawal to ${body.bankName} ${body.accountNumber}`
      );
    } catch (e: any) {
      // Reverse deduction if transfer fails to initiate
      try {
        await query('UPDATE wallets SET balance = $1 WHERE user_id = $2', [newBalance + body.amount, req.user.id]);
      } catch (_) { /* best effort */ }
      res.status(400).json({ error: `Transfer initiation failed: ${e.message}` });
      return;
    }

    // 4. Record transaction
    const { data: transaction, error: txError } = await supabaseAdmin
      .from('wallet_transactions')
      .insert({
        user_id: req.user.id,
        type: 'withdrawal',
        amount: -body.amount,
        status: 'pending',
        metadata: {
          bankCode: body.bankCode,
          bankName: body.bankName,
          accountNumber: body.accountNumber,
          accountName: body.accountName,
          recipientCode: recipient.recipient_code,
          transferCode: transfer.transfer_code,
          transferReference: transfer.reference,
        },
      })
      .select()
      .single();
    if (txError) {
      console.error('Failed to record withdrawal transaction', txError);
    }

    res.json({
      transaction,
      status: 'pending',
      message: 'Withdrawal initiated. Funds will be sent to your bank account.',
    });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function transferWallet(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const body = req.body as TransferWalletBody;

    // Atomically deduct from sender's wallet
    try {
      await deductWalletAtomic(req.user.id, body.amount);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
      return;
    }

    const { data: transaction, error } = await supabaseAdmin
      .from('wallet_transactions')
      .insert({
        user_id: req.user.id,
        type: 'transfer_out',
        amount: -body.amount,
        status: 'completed',
        metadata: { toUserId: body.toUserId, note: body.note },
      })
      .select()
      .single();
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.json({ transaction });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getStatistics(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.params.userId === 'me' ? req.user?.id : req.params.userId;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const { period } = req.query;
    
    const now = new Date();
    let startDate = new Date();
    let previousStartDate = new Date();
    let previousEndDate = new Date();
    
    if (period === 'year') {
      startDate.setFullYear(now.getFullYear() - 1);
      previousStartDate.setFullYear(now.getFullYear() - 2);
      previousEndDate.setFullYear(now.getFullYear() - 1);
    } else if (period === 'week') {
      startDate.setDate(now.getDate() - 7);
      previousStartDate.setDate(now.getDate() - 14);
      previousEndDate.setDate(now.getDate() - 7);
    } else {
      startDate.setMonth(now.getMonth() - 1);
      previousStartDate.setMonth(now.getMonth() - 2);
      previousEndDate.setMonth(now.getMonth() - 1);
    }
    
    const transactions = await query<{ amount: number; created_at: string }>(
      'SELECT amount, created_at FROM wallet_transactions WHERE user_id = $1 AND created_at >= $2 AND status = $3',
      [userId, previousStartDate.toISOString(), 'completed']
    );
    
    let currentIncome = 0;
    let currentExpenses = 0;
    let previousIncome = 0;
    
    for (const t of (transactions || [])) {
      const txDate = new Date(t.created_at);
      if (txDate >= startDate) {
        if (t.amount > 0) currentIncome += t.amount;
        else currentExpenses += Math.abs(t.amount);
      } else if (txDate >= previousStartDate && txDate < previousEndDate) {
        if (t.amount > 0) previousIncome += t.amount;
      }
    }
    
    let percentageChange = 0;
    if (previousIncome > 0) {
      percentageChange = ((currentIncome - previousIncome) / previousIncome) * 100;
    } else if (currentIncome > 0) {
      percentageChange = 100;
    }
    
    res.json({
      income: currentIncome,
      expenses: currentExpenses,
      percentageChange: Number(percentageChange.toFixed(2)),
      chart: [],
      period: period ?? 'month',
    });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function freezeWallet(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.params.userId === 'me' ? req.user?.id : req.params.userId;
    if (!req.user || req.user.id !== userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    const _body = req.body as FreezeWalletBody;
    await query('UPDATE wallets SET status = $1, last_updated = NOW() WHERE user_id = $2', ['frozen', userId]);
    res.json({ status: 'frozen' });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function unfreezeWallet(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.params.userId === 'me' ? req.user?.id : req.params.userId;
    if (!req.user || req.user.id !== userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    await query('UPDATE wallets SET status = $1, last_updated = NOW() WHERE user_id = $2', ['active', userId]);
    res.json({ status: 'active' });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
