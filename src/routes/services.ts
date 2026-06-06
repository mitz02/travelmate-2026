import express, { Router, Response } from 'express';
import Joi from 'joi';
import { supabase } from '../services/supabase';
import { AuthRequest } from '../middleware/auth';
import { purchaseBardetechData } from '../services/bardetech';
import { NotificationService } from '../services/notification';
import {
  buyAirtime,
  buyData,
  payBill,
  getServiceVariations,
  verifyBillerCode,
  generateRequestId,
  AIRTIME_SERVICE_IDS,
  DATA_SERVICE_IDS,
} from '../services/vtpass';
import { loadAllSavedPlans } from './vtpassAdmin';

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

const billSchema = Joi.object({
  serviceId: Joi.string().required(),           // e.g. 'ikeja-electric', 'dstv'
  variationCode: Joi.string().allow('').optional(), // Optional for 'renew'
  billersCode: Joi.string().required(),         // meter/smartcard number
  amount: Joi.number().positive().required(),
  phone: Joi.string().pattern(/^\+?[0-9]{10,14}$/).required(),
  subscriptionType: Joi.string().valid('change', 'renew').optional(),
});

const verifyBillerSchema = Joi.object({
  serviceId: Joi.string().required(),
  billersCode: Joi.string().required(),
  type: Joi.string().valid('prepaid', 'postpaid').optional(),
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

// ─── Refund helper (on VTpass failure) ───────────────────────────────────────

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
    const serviceId = AIRTIME_SERVICE_IDS[network];
    const requestId = generateRequestId();

    // Deduct from wallet first (hold the funds)
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

    // Call VTpass
    let vtpassResult;
    try {
      vtpassResult = await buyAirtime({ serviceId, phone, amount, requestId });
    } catch (vtErr) {
      // Refund if VTpass call fails entirely
      await refundWallet(req.userId!, amount, `Refund: airtime purchase failed for ${phone}`);
      console.error('VTpass airtime error:', vtErr);
      return res.status(502).json({ error: 'Airtime service temporarily unavailable. Your wallet has been refunded.' });
    }

    // VTpass error codes: '000' = success, '099' = processing (also OK)
    if (!['000', '099'].includes(vtpassResult.code)) {
      await refundWallet(req.userId!, amount, `Refund: airtime failed — ${vtpassResult.response_description}`);
      return res.status(400).json({
        error: vtpassResult.response_description || 'Airtime purchase failed. Your wallet has been refunded.',
        code: vtpassResult.code,
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
      vtpassRef: vtpassResult.requestId,
      status: vtpassResult.code === '000' ? 'delivered' : 'processing',
    });
  } catch (err) {
    console.error('Airtime error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/services/data/plans/:network — List data plans for a network
// e.g. GET /api/services/data/plans/mtn
// ─────────────────────────────────────────────────────────────────────────────
router.get('/data/plans/:network', async (req: AuthRequest, res: Response) => {
  try {
    const { network } = req.params;
    const serviceId = DATA_SERVICE_IDS[network.toLowerCase()];
    if (!serviceId) return res.status(400).json({ error: `Unknown network: ${network}` });

    const plans = await getServiceVariations(serviceId);
    return res.json({ network, serviceId, plans });
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
    const serviceId = DATA_SERVICE_IDS[network];
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

    // Determine which provider to use based on plan configuration
    let purchaseResult;
    if (adminConfiguredPlan?.api_type === 'bardetech' || adminConfiguredPlan?.apiType === 'bardetech') {
      // Map network to Bardetech network ID
      const BARDETECH_NETWORKS: Record<string, number> = {
        mtn: 1,
        glo: 2,
        '9mobile': 3,
        etisalat: 3,
        airtel: 4
      };
      
      const bardetechNetworkId = BARDETECH_NETWORKS[network.toLowerCase()];

      // Use Bardetech purchase function
      try {
        const bResult = await purchaseBardetechData({
          networkId: bardetechNetworkId,
          planId: variationCode, // The user requested to use variationCode for the plan ID (e.g. 473)
          mobileNumber: phone,
          requestId,
        });

        // Normalize Bardetech response to match VTpass format for the code below
        const isSuccess = bResult?.status === 'success' || bResult?.Status === 'successful' || String(bResult?.status).toLowerCase() === 'success' || String(bResult?.code) === '200' || bResult?.status === 200;
        purchaseResult = {
          code: isSuccess ? '000' : (bResult?.code || 'error'),
          response_description: bResult?.message || bResult?.response_description || 'Unknown error',
          requestId: bResult?.request_id || requestId,
        };
      } catch (err: any) {
        console.error('Bardetech purchase error:', err.response?.data || err);
        purchaseResult = {
          code: 'error',
          response_description: err.response?.data?.message || err.message || 'Bardetech API Error',
        };
      }
    } else {
      // Default to VTpass purchase
      purchaseResult = await buyData({ serviceId, variationCode, phone, amount, requestId });
    }

    // Check response code for both providers (assuming similar structure)
    if (!['000', '099'].includes(purchaseResult.code)) {
      await refundWallet(req.userId!, amount, `Refund: data failed — ${purchaseResult.response_description}`);
      return res.status(400).json({
        error: purchaseResult.response_description || 'Data purchase failed. Your wallet has been refunded.',
        code: purchaseResult.code,
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
            metadata: { vtpassRef: purchaseResult.requestId }
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
      providerRef: purchaseResult.requestId,
      status: purchaseResult.code === '000' ? 'delivered' : 'processing',
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
      { id: 'electricity', name: 'Electricity', services: ['ikeja-electric', 'eko-electric', 'abuja-electric', 'kano-electric', 'phed', 'eedc', 'kedco', 'ibedc'] },
      { id: 'cable-tv', name: 'Cable TV', services: ['dstv', 'gotv', 'startimes'] },
      { id: 'water', name: 'Water', services: ['lagos-water'] },
      { id: 'internet', name: 'Internet', services: ['smile-direct', 'spectranet'] },
      { id: 'jamb', name: 'JAMB', services: ['jamb'] },
      { id: 'waec', name: 'WAEC', services: ['waec'] },
    ],
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/services/electricity/providers — List electricity providers explicitly
// ─────────────────────────────────────────────────────────────────────────────
router.get('/electricity/providers', async (_req: AuthRequest, res: Response) => {
  try {
    const { data: providers, error } = await supabase
      .from('electricity_providers')
      .select('id, service_id, name, status')
      .eq('status', 'active');

    if (error) {
      console.error('Error fetching electricity providers:', error);
      // Fallback to static list if table doesn't exist yet
      return res.json({
        providers: [
          { id: 'ikeja-electric', name: 'Ikeja Electric (IKEDC)' },
          { id: 'eko-electric', name: 'Eko Electric (EKEDC)' },
          { id: 'kano-electric', name: 'Kano Electric (KEDCO)' },
          { id: 'portharcourt-electric', name: 'Port Harcourt Electric (PHED)' },
          { id: 'jos-electric', name: 'Jos Electric (JED)' },
          { id: 'ibadan-electric', name: 'Ibadan Electric (IBEDC)' },
          { id: 'kaduna-electric', name: 'Kaduna Electric (KAEDCO)' },
          { id: 'abuja-electric', name: 'Abuja Electric (AEDC)' },
          { id: 'enugu-electric', name: 'Enugu Electric (EEDC)' },
          { id: 'benin-electric', name: 'Benin Electric (BEDC)' },
          { id: 'aba-electric', name: 'Aba Electric (ABA)' },
        ]
      });
    }

    const formattedProviders = providers.map((p: any) => ({
      id: p.service_id,
      name: p.name,
      uuid: p.id
    }));

    return res.json({
      providers: formattedProviders
    });
  } catch (err) {
    console.error('Electricity providers error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/services/electricity/meter-types — List electricity meter types
// ─────────────────────────────────────────────────────────────────────────────
router.get('/electricity/meter-types', async (_req: AuthRequest, res: Response) => {
  try {
    const { data: types, error } = await supabase
      .from('electricity_meter_types')
      .select('id, type_id, name, status')
      .eq('status', 'active');

    if (error) {
      console.error('Error fetching meter types:', error);
      return res.json({
        meterTypes: [
          { id: 'prepaid', name: 'Prepaid' },
          { id: 'postpaid', name: 'Postpaid' },
        ]
      });
    }

    const formattedTypes = types.map((t: any) => ({
      id: t.type_id,
      name: t.name,
      uuid: t.id
    }));

    return res.json({
      meterTypes: formattedTypes
    });
  } catch (err) {
    console.error('Meter types error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/services/bills/variations/:serviceId — Get bill plans/bouquets
// e.g. GET /api/services/bills/variations/dstv
// ─────────────────────────────────────────────────────────────────────────────
router.get('/bills/variations/:serviceId', async (req: AuthRequest, res: Response) => {
  try {
    const { serviceId } = req.params;
    const variations = await getServiceVariations(serviceId);
    return res.json({ serviceId, variations });
  } catch (err) {
    console.error('Get bill variations error:', err);
    return res.status(500).json({ error: 'Failed to fetch bill variations' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/services/bills/verify — Verify meter/smartcard number before paying
// Body: { serviceId, billersCode, type? }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/bills/verify', async (req: AuthRequest, res: Response) => {
  try {
    const { error: validationError, value } = verifyBillerSchema.validate(req.body);
    if (validationError) return res.status(400).json({ error: validationError.details[0].message });

    const result = await verifyBillerCode(value);

    if (!result || Object.keys(result).length === 0) {
      return res.status(400).json({ error: 'Could not verify biller code. Please check and try again.' });
    }

    return res.json({ valid: true, ...result });
  } catch (err) {
    console.error('Verify biller error:', err);
    return res.status(400).json({ error: 'Biller verification failed. Please check your details.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/services/bills — Pay a bill
// Body: { serviceId, variationCode, billersCode, amount, phone }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/bills', async (req: AuthRequest, res: Response) => {
  try {
    const { error: validationError, value } = billSchema.validate(req.body);
    if (validationError) return res.status(400).json({ error: validationError.details[0].message });

    const { serviceId, variationCode, billersCode, amount, phone, subscriptionType } = value;
    const requestId = generateRequestId();

    let tx;
    try {
      tx = await deductWalletAndRecord(
        req.userId!,
        amount,
        `Bill payment: ${serviceId} — ${billersCode}`,
        { serviceId, variationCode, billersCode, amount, requestId },
      );
    } catch (walletErr: unknown) {
      const msg = walletErr instanceof Error ? walletErr.message : 'Wallet error';
      return res.status(400).json({ error: msg });
    }

    let vtpassResult;
    try {
      vtpassResult = await payBill({ serviceId, variationCode, billersCode, amount, phone, requestId, subscriptionType });
    } catch (vtErr) {
      await refundWallet(req.userId!, amount, `Refund: bill payment failed — ${serviceId}`);
      console.error('VTpass bill error:', vtErr);
      return res.status(502).json({ error: 'Bill payment service temporarily unavailable. Your wallet has been refunded.' });
    }

    if (!['000', '099'].includes(vtpassResult.code)) {
      await refundWallet(req.userId!, amount, `Refund: bill failed — ${vtpassResult.response_description}`);
      return res.status(400).json({
        error: vtpassResult.response_description || 'Bill payment failed. Your wallet has been refunded.',
        code: vtpassResult.code,
      });
    }

    // Notify User
    await NotificationService.sendNotification(
      req.userId!,
      'Bill Payment Successful',
      `Your payment of ₦${amount} for ${serviceId} was successful.`,
      'service_purchase',
      { transactionId: tx?.id || '', requestId, token: (vtpassResult as any).purchased_code || (vtpassResult as any).token || '' }
    );

    return res.status(201).json({
      message: `Bill payment of ₦${amount} processed successfully`,
      requestId,
      transactionId: tx?.id,
      vtpassRef: vtpassResult.requestId,
      token: (vtpassResult as any).purchased_code || (vtpassResult as any).token || (vtpassResult as any).content?.transactions?.extras || '',
      status: vtpassResult.code === '000' ? 'delivered' : 'processing',
    });
  } catch (err) {
    console.error('Bill payment error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/services/saved-plans/:service — Public: fetch admin-saved plans by service
// e.g. GET /api/services/saved-plans/airtime
// ─────────────────────────────────────────────────────────────────────────────
router.get('/saved-plans/:service', async (req: AuthRequest, res: Response) => {
  try {
  const { service } = req.params;
  const allPlans = await loadAllSavedPlans();
  const tvServices = ['dstv', 'gotv', 'startimes', 'showmax'];
  
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

export default router;

