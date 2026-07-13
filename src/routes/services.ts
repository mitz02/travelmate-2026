import express, { Router, Response } from 'express';
import Joi from 'joi';
import { supabase } from '../services/supabase';
import { AuthRequest } from '../middleware/auth';
import {
  buyAirtime,
  purchaseBardetechData,
  purchaseCableTv,
  payElectricityBill,
  verifyCableTv,
  verifyElectricityMeter,
  getBardetechPlans,
  BARDETECH_NETWORKS,
  BARDETECH_CABLE_IDS,
  BARDETECH_ELECTRICITY_IDS,
} from '../services/bardetech';
import { NotificationService } from '../services/notification';
import { loadAllSavedPlans } from './bardetechAdmin';

// Helper to fetch admin-configured plan from Supabase app_settings
async function getAdminPlan(variationCode: string): Promise<any | null> {
  const allPlans = await loadAllSavedPlans();
  return allPlans.find(p => p.variation_code === variationCode) || null;
}

const router: Router = express.Router();

// ─── Validation Schemas ───────────────────────────────────────────────────────

const airtimeSchema = Joi.object({
  network: Joi.string().valid('mtn', 'airtel', 'glo', '9mobile', 'etisalat').required(),
  phone: Joi.string().pattern(/^\+?[0-9]{10,14}$/).required().messages({
    'string.pattern.base': 'Phone must be a valid Nigerian number (e.g. 08012345678)',
  }),
  amount: Joi.number().positive().min(50).max(50000).required(),
});

const dataSchema = Joi.object({
  network: Joi.string().valid('mtn', 'airtel', 'glo', '9mobile', 'etisalat').required(),
  phone: Joi.string().pattern(/^\+?[0-9]{10,14}$/).required(),
  variationCode: Joi.string().required(),
  amount: Joi.number().positive().required(),
});

const cableTvSchema = Joi.object({
  provider: Joi.string().valid('dstv', 'gotv', 'startimes').required(),
  iucnumber: Joi.string().required(),
  plan: Joi.string().required(),
  subscriptionType: Joi.string().valid('change', 'renew').optional(),
  phone: Joi.string().pattern(/^\+?[0-9]{10,14}$/).required(),
});

const electricitySchema = Joi.object({
  provider: Joi.string().required(),
  meterNumber: Joi.string().required(),
  amount: Joi.number().positive().required(),
  meterType: Joi.string().valid('prepaid', 'postpaid').optional().default('prepaid'),
  phone: Joi.string().pattern(/^\+?[0-9]{10,14}$/).required(),
  variationCode: Joi.string().optional(),
});

const verifyCableTvSchema = Joi.object({
  provider: Joi.string().valid('dstv', 'gotv', 'startimes').required(),
  iucnumber: Joi.string().required(),
});

const verifyMeterSchema = Joi.object({
  provider: Joi.string().required(),
  meterNumber: Joi.string().required(),
  meterType: Joi.string().valid('prepaid', 'postpaid').optional().default('prepaid'),
});

// ─── Helper: deduct from wallet & record transaction ─────────────────────────

async function deductWalletAndRecord(userId: string, amount: number, description: string, metadata: Record<string, unknown>) {
  const { data: wallet } = await supabase
    .from('wallets')
    .select('balance, held_amount')
    .eq('user_id', userId)
    .single();

  if (!wallet) throw new Error('Wallet not found');

  const available = wallet.balance - wallet.held_amount;
  if (available < amount) throw new Error('Insufficient wallet balance');

  await supabase
    .from('wallets')
    .update({ balance: wallet.balance - amount })
    .eq('user_id', userId);

  const { data: tx } = await supabase
    .from('transactions')
    .insert([{
      user_id: userId,
      type: 'vtu',
      amount,
      status: 'completed',
      description,
      metadata,
    }])
    .select()
    .single();

  return tx;
}

// ─── Refund helper ────────────────────────────────────────────────────────────

async function refundWallet(userId: string, amount: number, description: string) {
  const { data: wallet } = await supabase
    .from('wallets')
    .select('balance')
    .eq('user_id', userId)
    .single();

  if (wallet) {
    await supabase
      .from('wallets')
      .update({ balance: wallet.balance + amount })
      .eq('user_id', userId);

    await supabase.from('transactions').insert([{
      user_id: userId,
      type: 'refund',
      amount,
      status: 'completed',
      description,
    }]);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/services/airtime/networks — List available networks
// ─────────────────────────────────────────────────────────────────────────────
router.get('/airtime/networks', (_req: AuthRequest, res: Response) => {
  return res.json({
    networks: [
      { id: 'mtn', name: 'MTN', serviceId: 'mtn' },
      { id: 'airtel', name: 'Airtel', serviceId: 'airtel' },
      { id: 'glo', name: 'Glo', serviceId: 'glo' },
      { id: '9mobile', name: '9mobile', serviceId: 'etisalat' },
    ],
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/services/airtime — Buy airtime
// Body: { network, phone, amount }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/airtime', async (req: AuthRequest, res: Response) => {
  try {
    const { error: validationError, value } = airtimeSchema.validate(req.body);
    if (validationError) return res.status(400).json({ error: validationError.details[0].message });

    const { network, phone, amount } = value;
    const requestId = generateRequestId();

    // Deduct from wallet first
    let tx;
    try {
      tx = await deductWalletAndRecord(
        req.userId!,
        amount,
        `₦${amount} airtime for ${phone} (${network.toUpperCase()})`,
        { network, phone, amount, requestId },
      );
    } catch (walletErr: unknown) {
      const msg = walletErr instanceof Error ? walletErr.message : 'Wallet error';
      return res.status(400).json({ error: msg });
    }

    // Call Bardetech
    let result;
    try {
      result = await buyAirtime({ network, phone, amount });
    } catch (err) {
      await refundWallet(req.userId!, amount, `Refund: airtime purchase failed for ${phone}`);
      console.error('Bardetech airtime error:', err);
      return res.status(502).json({ error: 'Airtime service temporarily unavailable. Your wallet has been refunded.' });
    }

    // Check response
    const isSuccess = result.status === 'success' || result.Status === 'successful';
    if (!isSuccess) {
      await refundWallet(req.userId!, amount, `Refund: airtime failed — ${result.message || result.msg}`);
      return res.status(400).json({
        error: result.message || result.msg || 'Airtime purchase failed. Your wallet has been refunded.',
        code: result.code,
      });
    }

    // Notify User
    await NotificationService.sendNotification(
      req.userId!,
      'Airtime Purchase Successful',
      `You have successfully purchased ₦${amount} airtime for ${phone} on ${network.toUpperCase()}.`,
      'service_purchase',
      { transactionId: tx?.id || '', requestId }
    );

    return res.status(201).json({
      message: `₦${amount} airtime sent successfully to ${phone}`,
      requestId,
      transactionId: tx?.id,
      providerRef: result.request_id || requestId,
      status: 'delivered',
    });
  } catch (err) {
    console.error('Airtime error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/services/data/plans/:network — List data plans for a network
// ─────────────────────────────────────────────────────────────────────────────
router.get('/data/plans/:network', async (req: AuthRequest, res: Response) => {
  try {
    const { network } = req.params;
    if (!BARDETECH_NETWORKS[network.toLowerCase()]) {
      return res.status(400).json({ error: `Unknown network: ${network}` });
    }

    const plans = await getBardetechPlans();
    const filteredPlans = plans.filter(p => {
      const svc = (p.service || '').toLowerCase();
      const net = network.toLowerCase();
      if (net === '9mobile') return svc === 'etisalat-data';
      return svc === `${net}-data`;
    });
    return res.json({ network, plans: filteredPlans });
  } catch (err) {
    console.error('Get data plans error:', err);
    return res.status(500).json({ error: 'Failed to fetch data plans' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/services/data — Buy data bundle
// Body: { network, phone, variationCode, amount }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/data', async (req: AuthRequest, res: Response) => {
  try {
    const { error: validationError, value } = dataSchema.validate(req.body);
    if (validationError) return res.status(400).json({ error: validationError.details[0].message });

    const { network, phone, variationCode, amount: clientAmount } = value;
    const requestId = generateRequestId();

    // Enforce admin selling price if available
    const adminConfiguredPlan = await getAdminPlan(variationCode);
    const amount = adminConfiguredPlan ? adminConfiguredPlan.price : clientAmount;

    let tx;
    try {
      tx = await deductWalletAndRecord(
        req.userId!,
        amount,
        `Data bundle for ${phone} (${network.toUpperCase()})`,
        { network, phone, variationCode, amount, requestId },
      );
    } catch (walletErr: unknown) {
      const msg = walletErr instanceof Error ? walletErr.message : 'Wallet error';
      return res.status(400).json({ error: msg });
    }

    // Call Bardetech
    const networkId = BARDETECH_NETWORKS[network.toLowerCase()];
    let result;
    try {
      result = await purchaseBardetechData({
        networkId,
        planId: variationCode,
        mobileNumber: phone,
        requestId,
      });
    } catch (err: any) {
      await refundWallet(req.userId!, amount, `Refund: data purchase failed for ${phone}`);
      console.error('Bardetech data error:', err.response?.data || err);
      return res.status(502).json({ error: 'Data service temporarily unavailable. Your wallet has been refunded.' });
    }

    // Check response
    const isSuccess = result.status === 'success' || result.Status === 'successful';
    if (!isSuccess) {
      await refundWallet(req.userId!, amount, `Refund: data failed — ${result.message || result.msg}`);
      return res.status(400).json({
        error: result.message || result.msg || 'Data purchase failed. Your wallet has been refunded.',
        code: result.code,
      });
    }

    // Award cashback if configured
    if (adminConfiguredPlan && adminConfiguredPlan.cashback_value && adminConfiguredPlan.cashback_value > 0) {
      const cashbackAmount = adminConfiguredPlan.cashback_type === 'percentage' 
        ? (amount * adminConfiguredPlan.cashback_value) / 100 
        : adminConfiguredPlan.cashback_value;

      if (cashbackAmount > 0) {
        const { data: wallet } = await supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', req.userId!)
          .single();
        if (wallet) {
          await supabase
            .from('wallets')
            .update({ balance: wallet.balance + cashbackAmount })
            .eq('user_id', req.userId!);
          
          await supabase.from('transactions').insert([{
            user_id: req.userId!,
            type: 'cashback',
            amount: cashbackAmount,
            status: 'completed',
            description: `Cashback for ${phone} data bundle`,
            metadata: { providerRef: result.request_id || requestId }
          }]);
        }
      }
    }

    // Notify User
    await NotificationService.sendNotification(
      req.userId!,
      'Data Purchase Successful',
      `You have successfully purchased data for ${phone} on ${network.toUpperCase()}.`,
      'service_purchase',
      { transactionId: tx?.id || '', requestId }
    );

    return res.status(201).json({
      message: `Data bundle purchased successfully for ${phone}`,
      requestId,
      transactionId: tx?.id,
      providerRef: result.request_id || requestId,
      status: 'delivered',
    });
  } catch (err) {
    console.error('Data purchase error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/services/bills/categories — List available bill categories
// ─────────────────────────────────────────────────────────────────────────────
router.get('/bills/categories', (_req: AuthRequest, res: Response) => {
  return res.json({
    categories: [
      { id: 'electricity', name: 'Electricity', services: Object.keys(BARDETECH_ELECTRICITY_IDS) },
      { id: 'cable-tv', name: 'Cable TV', services: Object.keys(BARDETECH_CABLE_IDS) },
    ],
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/services/electricity/providers — List electricity providers
// ─────────────────────────────────────────────────────────────────────────────
router.get('/electricity/providers', async (_req: AuthRequest, res: Response) => {
  try {
    const seen = new Set<number>();
    const providers: { id: string; name: string; discoId: number }[] = [];
    for (const [name, id] of Object.entries(BARDETECH_ELECTRICITY_IDS)) {
      if (seen.has(id)) continue;
      seen.add(id);
      providers.push({
        id: name,
        name: name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        discoId: id,
      });
    }
    return res.json({ providers });
  } catch (err) {
    console.error('Electricity providers error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/services/electricity/meter-types — List electricity meter types
// ─────────────────────────────────────────────────────────────────────────────
router.get('/electricity/meter-types', (_req: AuthRequest, res: Response) => {
  return res.json({
    meterTypes: [
      { id: 'prepaid', name: 'Prepaid' },
      { id: 'postpaid', name: 'Postpaid' },
    ]
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/services/cabletv/providers — List cable TV providers
// ─────────────────────────────────────────────────────────────────────────────
router.get('/cabletv/providers', (_req: AuthRequest, res: Response) => {
  return res.json({
    providers: [
      { id: 'dstv', name: 'DStv', bardetechId: 2 },
      { id: 'gotv', name: 'GOtv', bardetechId: 1 },
      { id: 'startimes', name: 'Startimes', bardetechId: 3 },
    ]
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/services/cabletv/plans — Get admin-saved cable TV plans
// Query: ?provider=dstv (optional filter)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/cabletv/plans', async (req: AuthRequest, res: Response) => {
  try {
    const { provider } = req.query;
    const tvServiceNames = ['dstv', 'gotv', 'startimes'];
    const allPlans = await loadAllSavedPlans();
    
    let plans = allPlans.filter(p => {
      const svc = (p.service ?? '').toString().toLowerCase();
      return tvServiceNames.includes(svc);
    });
    
    if (provider) {
      const providerLower = provider.toString().toLowerCase();
      plans = plans.filter(p => {
        const svc = (p.service ?? '').toString().toLowerCase();
        return svc === providerLower || svc.includes(providerLower);
      });
    }
    
    const mapped = plans.map(p => ({
      id: p.id,
      name: p.name,
      price: p.price,
      service: p.service,
      variation_code: p.variation_code,
      cashback_type: p.cashbackType,
      cashback_value: p.cashbackValue,
    }));
    
    return res.json({ plans: mapped });
  } catch (err) {
    console.error('Get cable TV plans error:', err);
    return res.status(500).json({ error: 'Failed to fetch cable TV plans' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/services/cabletv/verify — Verify cable TV subscription
// Body: { provider, iucnumber }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/cabletv/verify', async (req: AuthRequest, res: Response) => {
  try {
    const { error: validationError, value } = verifyCableTvSchema.validate(req.body);
    if (validationError) return res.status(400).json({ error: validationError.details[0].message });

    const result = await verifyCableTv(value);

    if (!result || (result.status !== 'success' && result.Status !== 'successful')) {
      return res.status(400).json({ error: 'Could not verify cable TV subscription. Please check and try again.' });
    }

    return res.json({ 
      valid: true, 
      customerName: result.Customer_Name || result.msg,
      ...result 
    });
  } catch (err: any) {
    console.error('Verify cable TV error:', err);
    const message = err?.message || 'Cable TV verification failed. Please check your details.';
    return res.status(400).json({ error: message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/services/cabletv — Pay cable TV subscription
// Body: { provider, iucnumber, plan, subscriptionType, phone }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/cabletv', async (req: AuthRequest, res: Response) => {
  try {
    const { error: validationError, value } = cableTvSchema.validate(req.body);
    if (validationError) return res.status(400).json({ error: validationError.details[0].message });

    const { provider, iucnumber, plan, subscriptionType, phone } = value;
    const requestId = generateRequestId();

    // Get plan price from admin config
    const adminPlan = await getAdminPlan(plan);
    const amount = adminPlan ? adminPlan.price : 0;

    let tx;
    try {
      tx = await deductWalletAndRecord(
        req.userId!,
        amount,
        `Cable TV subscription: ${provider.toUpperCase()} — ${iucnumber}`,
        { provider, iucnumber, plan, amount, requestId },
      );
    } catch (walletErr: unknown) {
      const msg = walletErr instanceof Error ? walletErr.message : 'Wallet error';
      return res.status(400).json({ error: msg });
    }

    // Call Bardetech
    let result;
    try {
      result = await purchaseCableTv({
        provider,
        iucnumber,
        plan,
        requestId,
        subscriptionType,
        phone,
      });
    } catch (err) {
      await refundWallet(req.userId!, amount, `Refund: cable TV subscription failed — ${provider}`);
      console.error('Bardetech cable TV error:', err);
      return res.status(502).json({ error: 'Cable TV service temporarily unavailable. Your wallet has been refunded.' });
    }

    // Check response
    const isSuccess = result.status === 'success' || result.Status === 'successful';
    if (!isSuccess) {
      await refundWallet(req.userId!, amount, `Refund: cable TV failed — ${result.message || result.msg}`);
      return res.status(400).json({
        error: result.message || result.msg || 'Cable TV subscription failed. Your wallet has been refunded.',
        code: result.code,
      });
    }

    // Notify User
    await NotificationService.sendNotification(
      req.userId!,
      'Cable TV Subscription Successful',
      `Your ${provider.toUpperCase()} subscription for ${iucnumber} was successful.`,
      'service_purchase',
      { transactionId: tx?.id || '', requestId }
    );

    return res.status(201).json({
      message: `Cable TV subscription of ${provider.toUpperCase()} processed successfully`,
      requestId,
      transactionId: tx?.id,
      providerRef: result.request_id || requestId,
      status: 'delivered',
    });
  } catch (err) {
    console.error('Cable TV subscription error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/services/electricity/verify — Verify electricity meter
// Body: { provider, meterNumber, meterType }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/electricity/verify', async (req: AuthRequest, res: Response) => {
  try {
    const { error: validationError, value } = verifyMeterSchema.validate(req.body);
    if (validationError) return res.status(400).json({ error: validationError.details[0].message });

    const result = await verifyElectricityMeter({
      provider: value.provider,
      meternumber: value.meterNumber,
      metertype: value.meterType,
    });

    if (!result || (result.status !== 'success' && result.Status !== 'successful')) {
      return res.status(400).json({ error: 'Could not verify meter number. Please check and try again.' });
    }

    return res.json({ 
      valid: true, 
      customerName: result.Customer_Name || result.msg,
      ...result 
    });
  } catch (err) {
    console.error('Verify meter error:', err);
    return res.status(400).json({ error: 'Meter verification failed. Please check your details.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/services/electricity — Pay electricity bill
// Body: { provider, meterNumber, amount, meterType, phone }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/electricity', async (req: AuthRequest, res: Response) => {
  try {
    const { error: validationError, value } = electricitySchema.validate(req.body);
    if (validationError) return res.status(400).json({ error: validationError.details[0].message });

    const { provider, meterNumber, amount: clientAmount, meterType, phone, variationCode } = value;
    const requestId = generateRequestId();

    // Enforce admin selling price if available
    const adminConfiguredPlan = variationCode ? await getAdminPlan(variationCode) : null;
    const amount = adminConfiguredPlan ? adminConfiguredPlan.price : clientAmount;

    let tx;
    try {
      tx = await deductWalletAndRecord(
        req.userId!,
        amount,
        `Electricity bill payment: ${provider} — ${meterNumber}`,
        { provider, meterNumber, amount, meterType, requestId },
      );
    } catch (walletErr: unknown) {
      const msg = walletErr instanceof Error ? walletErr.message : 'Wallet error';
      return res.status(400).json({ error: msg });
    }

    // Call Bardetech
    let result;
    try {
      result = await payElectricityBill({
        provider,
        meternumber: meterNumber,
        amount,
        metertype: meterType,
      });
    } catch (err) {
      await refundWallet(req.userId!, amount, `Refund: electricity bill payment failed — ${provider}`);
      console.error('Bardetech electricity error:', err);
      return res.status(502).json({ error: 'Electricity service temporarily unavailable. Your wallet has been refunded.' });
    }

    // Check response
    const isSuccess = result.status === 'success' || result.Status === 'successful';
    if (!isSuccess) {
      await refundWallet(req.userId!, amount, `Refund: electricity failed — ${result.message || result.msg}`);
      return res.status(400).json({
        error: result.message || result.msg || 'Electricity bill payment failed. Your wallet has been refunded.',
        code: result.code,
      });
    }

    // Award cashback if configured
    if (adminConfiguredPlan && adminConfiguredPlan.cashbackValue && adminConfiguredPlan.cashbackValue > 0) {
      const cashbackAmount = adminConfiguredPlan.cashbackType === 'percentage'
        ? (amount * adminConfiguredPlan.cashbackValue) / 100
        : adminConfiguredPlan.cashbackValue;

      if (cashbackAmount > 0) {
        const { data: wallet } = await supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', req.userId!)
          .single();
        if (wallet) {
          await supabase
            .from('wallets')
            .update({ balance: wallet.balance + cashbackAmount })
            .eq('user_id', req.userId!);

          await supabase.from('transactions').insert([{
            user_id: req.userId!,
            type: 'cashback',
            amount: cashbackAmount,
            status: 'completed',
            description: `Cashback for electricity bill payment (${provider})`,
            metadata: { providerRef: result.request_id || requestId }
          }]);
        }
      }
    }

    // Notify User
    await NotificationService.sendNotification(
      req.userId!,
      'Electricity Bill Payment Successful',
      `Your electricity bill payment of ₦${amount} for ${provider} was successful.`,
      'service_purchase',
      { transactionId: tx?.id || '', requestId, token: result.token || '' }
    );

    return res.status(201).json({
      message: `Electricity bill payment of ₦${amount} processed successfully`,
      requestId,
      transactionId: tx?.id,
      providerRef: result.request_id || requestId,
      token: result.token || '',
      status: 'delivered',
    });
  } catch (err) {
    console.error('Electricity bill payment error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/services/saved-plans/:service — Public: fetch admin-saved plans by service
// ─────────────────────────────────────────────────────────────────────────────
router.get('/saved-plans/:service', async (req: AuthRequest, res: Response) => {
  try {
  const { service } = req.params;
  const allPlans = await loadAllSavedPlans();
  const tvServices = ['dstv', 'gotv', 'startimes'];
  
  const filtered = allPlans.filter((p: any) => {
    const svc = (p.service ?? "").toString().toLowerCase();
    const reqSvc = service.toString().toLowerCase();
    
    if (reqSvc === 'tv') {
      return tvServices.includes(svc);
    }
    
    return svc === reqSvc || svc.includes(reqSvc);
  });
  return res.json({ plans: filtered });
  } catch (err) {
    console.error('Get saved plans error:', err);
    return res.status(500).json({ error: 'Failed to fetch saved plans' });
  }
});

// ─── Helper: Generate unique request ID ─────────────────────────────────────

function generateRequestId(): string {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Africa/Lagos' }));
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const datePrefix = `${year}${month}${day}${hour}${min}`;
  const suffix = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `${datePrefix}${suffix}`;
}

export default router;
