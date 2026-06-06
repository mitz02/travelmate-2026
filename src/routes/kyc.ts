import express, { Router, Response } from 'express';
import axios from 'axios';
import Joi from 'joi';
import { config } from '../config/index.js';
import { supabase } from '../services/supabase.js';
import { AuthRequest } from '../middleware/auth.js';

const router: Router = express.Router();

// ─── Validation Schemas ────────────────────────────────────────────────────────

const step1Schema = Joi.object({
  idType: Joi.string().required(),
  idNumber: Joi.string().required(),
  idDocumentUrl: Joi.string().uri().required(),
});

const step2Schema = Joi.object({
  documentType: Joi.string().required(),
  utilityType: Joi.string().valid('Electricity', 'Water').required(),
  addressDocumentUrl: Joi.string().uri().required(),
});

const step3Schema = Joi.object({
  bankName: Joi.string().required(),
  accountName: Joi.string().required(),
  accountNumber: Joi.string().required(),
});

const step4Schema = Joi.object({
  faceImageUrl: Joi.string().uri().required(),
});

// ─── Endpoints ─────────────────────────────────────────────────────────────────

router.get('/status', async (req: AuthRequest, res: Response) => {
  try {
    const { data: user, error } = await supabase
      .from('profiles')
      .select('kyc_status, kyc_data')
      .eq('id', req.userId)
      .single();
    if (error || !user) return res.status(404).json({ error: 'User not found' });
    return res.json({ status: user.kyc_status, data: user.kyc_data ?? {} });
  } catch (err) {
    console.error('Get KYC status error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// STEP 1: Identity Verification
router.post('/step1-identity', async (req: AuthRequest, res: Response) => {
  try {
    const { error, value } = step1Schema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { data: user } = await supabase
      .from('profiles')
      .select('kyc_data')
      .eq('id', req.userId)
      .single();

    const currentData = (user?.kyc_data as Record<string, unknown>) ?? {};
    const updatedData = { ...currentData, ...value };

    await supabase
      .from('profiles')
      .update({ kyc_data: updatedData })
      .eq('id', req.userId);

    return res.json({ message: 'Identity details saved successfully', data: updatedData });
  } catch (err) {
    console.error('KYC Step 1 error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// STEP 2: Proof of Address
router.post('/step2-address', async (req: AuthRequest, res: Response) => {
  try {
    const { error, value } = step2Schema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { data: user } = await supabase
      .from('profiles')
      .select('kyc_data')
      .eq('id', req.userId)
      .single();

    const currentData = (user?.kyc_data as Record<string, unknown>) ?? {};
    const updatedData = { ...currentData, ...value };

    await supabase
      .from('profiles')
      .update({ kyc_data: updatedData })
      .eq('id', req.userId);

    return res.json({ message: 'Address documents saved successfully', data: updatedData });
  } catch (err) {
    console.error('KYC Step 2 error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// STEP 3: Banking Details (Manual entry)
router.post('/step3-bank', async (req: AuthRequest, res: Response) => {
  try {
    const { error, value } = step3Schema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { bankName, accountName, accountNumber } = value;

    const { data: user } = await supabase
      .from('profiles')
      .select('kyc_data')
      .eq('id', req.userId)
      .single();

    const currentData = (user?.kyc_data as Record<string, unknown>) ?? {};
    const updatedData = { 
      ...currentData, 
      bankName, 
      accountName,
      accountNumber 
    };

    await supabase
      .from('profiles')
      .update({ kyc_data: updatedData })
      .eq('id', req.userId);

    return res.json({ 
      message: 'Banking details saved successfully', 
      data: updatedData 
    });
  } catch (err) {
    console.error('KYC Step 3 error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// STEP 4: Face Verification (Final Submission)
router.post('/step4-face', async (req: AuthRequest, res: Response) => {
  try {
    const { error, value } = step4Schema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { data: user } = await supabase
      .from('profiles')
      .select('kyc_data')
      .eq('id', req.userId)
      .single();

    const currentData = (user?.kyc_data as Record<string, unknown>) ?? {};
    
    // Ensure previous required steps are completed
    if (!currentData.idType || !currentData.idDocumentUrl || !currentData.addressDocumentUrl) {
      return res.status(400).json({ error: 'Please complete all previous KYC steps before final submission' });
    }

    const finalData = { 
      ...currentData, 
      faceImageUrl: value.faceImageUrl,
      submittedAt: new Date().toISOString()
    };

    // Update profile status, data, and profile picture (face selfie)
    await supabase
      .from('profiles')
      .update({
        kyc_status: 'pending',
        kyc_data: finalData,
        profile_picture: value.faceImageUrl,
      })
      .eq('id', req.userId);

    // Create a record in the kyc_submissions table for the admin team
    await supabase
      .from('kyc_submissions')
      .insert([{
        user_id: req.userId,
        status: 'pending',
        submission_data: finalData,
      }]);

    return res.json({
      message: 'KYC submission complete! Your documents are under review.',
      status: 'pending',
    });
  } catch (err) {
    console.error('KYC Step 4 error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Helpers ───────────────────────────────────────────────────────────────────

// Re-expose the real-time bank verification logic for frontend convenience without saving
router.post('/verify-account', async (req: AuthRequest, res: Response) => {
  try {
    const { accountNumber, bankCode } = req.body;
    if (!accountNumber || !bankCode) return res.status(400).json({ error: 'Account number and bank code are required' });
    try {
      const response = await axios.get(
        `${config.paystack.baseUrl}/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
        { headers: { Authorization: `Bearer ${config.paystack.secretKey}` } }
      );
      return res.json({ accountName: response.data.data.account_name, accountNumber, bankCode, valid: true });
    } catch (paystackError: unknown) {
      const err = paystackError as { response?: { data?: { message?: string } } };
      return res.status(400).json({ error: 'Account verification failed', valid: false, details: err.response?.data?.message ?? 'Invalid account details' });
    }
  } catch (err) {
    console.error('Verify account error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/banks', async (_req: AuthRequest, res: Response) => {
  try {
    const response = await axios.get(`${config.paystack.baseUrl}/bank?country=NG`, {
      headers: { Authorization: `Bearer ${config.paystack.secretKey}` },
    });
    return res.json({ banks: response.data.data.map((bank: { id: string; code: string; name: string }) => ({ id: bank.id, code: bank.code, name: bank.name })) });
  } catch (paystackError: unknown) {
    const err = paystackError as Error;
    console.error('Paystack bank list error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch bank list', details: err.message });
  }
});

export default router;
