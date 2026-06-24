import { Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { query, queryOne } from '../config/database';
import { AuthenticatedRequest } from '../types';
import * as paystack from '../services/paystack';
import type {
  SubmitKycBody,
  VerifyAccountBody,
  FaceVerificationBody,
  VerifyIdBody,
  AdminApproveBody,
  AdminRejectBody,
} from '../validators/kyc';

export async function submitKyc(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const body = req.body as SubmitKycBody;

    // Save KYC documents
    await supabaseAdmin.from('kyc_documents').upsert({
      user_id: req.user.id,
      id_type: body.idType,
      id_number: body.idNumber,
      id_front_url: body.idDocumentUrl || body.idFront || '',
      id_back_url: body.idBack || '',
      selfie_url: body.faceImageUrl || body.selfie || '',
      status: 'pending',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    // Update profile KYC status
    await supabaseAdmin.from('profiles').update({
      kyc_status: 'pending',
      updated_at: new Date().toISOString(),
    }).eq('user_id', req.user.id);

    // Save bank account details
    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM bank_accounts WHERE user_id = $1 AND account_number = $2 AND bank_code = $3`,
      [req.user.id, body.accountNumber, body.bankCode]
    );

    if (!existing) {
      await query(
        `INSERT INTO bank_accounts (user_id, bank_name, bank_code, account_number, account_name, is_default)
         VALUES ($1, $2, $3, $4, $5, true)`,
        [req.user.id, body.bankName, body.bankCode, body.accountNumber, body.accountName]
      );
    }

    res.status(200).json({ status: 'pending' });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getKycStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('kyc_status')
      .eq('user_id', req.user.id)
      .single();
    const { data: docs } = await supabaseAdmin
      .from('kyc_documents')
      .select('*')
      .eq('user_id', req.user.id);
    const status = profile?.kyc_status ?? null;
    res.json({
      status,
      reason: null,
      documents: docs ?? [],
    });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function verifyAccount(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { accountNumber, bankCode } = req.body as VerifyAccountBody;
    const result = await paystack.resolveAccount(accountNumber, bankCode);
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ error: e.message || 'Account verification failed' });
  }
}

export async function listBanks(_req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const banks = await paystack.listBanks();
    res.json({ banks });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to fetch banks' });
  }
}

export async function faceVerification(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const _body = req.body as FaceVerificationBody;
    res.json({ status: 'pending' });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function verifyId(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const _body = req.body as VerifyIdBody;
    res.json({ verified: true });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function adminGetKycDetail(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const docId = req.params.id;
    const doc = await queryOne(
      `SELECT k.id, k.user_id, k.id_type, k.id_number, k.id_front_url, k.id_back_url,
              k.selfie_url, k.status as kyc_status, k.admin_notes, k.rejection_reason,
              k.created_at, k.updated_at,
              p.first_name, p.last_name, p.email, p.phone, p.role, p.profile_picture,
              p.date_of_birth, p.gender, p.address
       FROM kyc_documents k
       LEFT JOIN profiles p ON p.id = k.user_id
       WHERE k.id = $1`,
      [docId]
    );
    if (!doc) {
      res.status(404).json({ error: 'KYC document not found' });
      return;
    }
    const bankAccounts = await query(
      `SELECT id, bank_name, bank_code, account_number, account_name, is_default
       FROM bank_accounts WHERE user_id = $1`,
      [doc.user_id]
    );
    res.json({ submission: doc, bankAccounts: bankAccounts ?? [] });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function adminListPending(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const search = req.query.search ? `%${req.query.search}%` : null;
    const rows = await query(
      `SELECT k.id, k.user_id, k.id_type, k.id_number, k.id_front_url, k.id_back_url,
              k.selfie_url, k.status as kyc_status, k.admin_notes, k.rejection_reason,
              k.created_at, k.updated_at,
              p.first_name, p.last_name, p.email
       FROM kyc_documents k
       LEFT JOIN profiles p ON p.id = k.user_id
       WHERE k.status = 'pending'
         ${search ? `AND (p.first_name ILIKE $1 OR p.last_name ILIKE $1 OR p.email ILIKE $1)` : ''}
       ORDER BY k.created_at DESC`,
      search ? [search] : []
    );
    res.json({ submissions: rows ?? [] });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function adminApprove(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const docId = req.params.id;
    const body = req.body as AdminApproveBody;
    const doc = await queryOne<{ user_id: string }>(
      `SELECT user_id FROM kyc_documents WHERE id = $1`, [docId]
    );
    if (!doc) {
      res.status(404).json({ error: 'KYC document not found' });
      return;
    }
    await query(
      `UPDATE kyc_documents SET status = 'verified', admin_notes = $1, updated_at = NOW() WHERE id = $2`,
      [body.notes || null, docId]
    );
    await query(
      `UPDATE profiles SET kyc_status = 'verified', updated_at = NOW() WHERE id = $1`,
      [doc.user_id]
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function adminReject(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const docId = req.params.id;
    const body = req.body as AdminRejectBody;
    const doc = await queryOne<{ user_id: string }>(
      `SELECT user_id FROM kyc_documents WHERE id = $1`, [docId]
    );
    if (!doc) {
      res.status(404).json({ error: 'KYC document not found' });
      return;
    }
    await query(
      `UPDATE kyc_documents SET status = 'rejected', rejection_reason = $1, updated_at = NOW() WHERE id = $2`,
      [body.reason || null, docId]
    );
    await query(
      `UPDATE profiles SET kyc_status = 'rejected', updated_at = NOW() WHERE id = $1`,
      [doc.user_id]
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
