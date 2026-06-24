import { Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { AuthenticatedRequest } from '../types';
import type {
  HoldEscrowBody,
  ReleaseEscrowBody,
  RefundEscrowBody,
  DisputeEscrowBody,
  ResolveEscrowBody,
} from '../validators/escrow';

export async function holdFunds(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const body = req.body as HoldEscrowBody;
    const { data: escrow, error } = await supabaseAdmin
      .from('escrows')
      .insert({
        booking_id: body.bookingId,
        amount: body.amount,
        from_user_id: body.fromUserId,
        to_user_id: body.toUserId,
        status: 'held',
      })
      .select()
      .single();
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(201).json({ escrowId: escrow.id, status: escrow.status });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function releaseFunds(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const escrowId = req.params.escrowId;
    const body = req.body as ReleaseEscrowBody;
    const { data: escrow, error: fetchError } = await supabaseAdmin
      .from('escrows')
      .select('*')
      .eq('id', escrowId)
      .single();
    if (fetchError || !escrow) {
      res.status(404).json({ error: 'Escrow not found' });
      return;
    }
    const { error } = await supabaseAdmin
      .from('escrows')
      .update({ status: 'released', released_by: body.releasedBy, updated_at: new Date().toISOString() })
      .eq('id', escrowId);
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.json({
      success: true,
      transaction: { id: escrowId, type: 'release', amount: escrow.amount },
    });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function refundFunds(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const escrowId = req.params.escrowId;
    const body = req.body as RefundEscrowBody;
    const { data: escrow, error: fetchError } = await supabaseAdmin
      .from('escrows')
      .select('*')
      .eq('id', escrowId)
      .single();
    if (fetchError || !escrow) {
      res.status(404).json({ error: 'Escrow not found' });
      return;
    }
    const { error } = await supabaseAdmin
      .from('escrows')
      .update({ status: 'refunded', refund_reason: body.reason, updated_at: new Date().toISOString() })
      .eq('id', escrowId);
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.json({
      success: true,
      refund: { id: escrowId, amount: escrow.amount, status: 'refunded' },
    });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getEscrowByBooking(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const bookingId = req.params.bookingId;
    const { data: escrow, error } = await supabaseAdmin
      .from('escrows')
      .select('*')
      .eq('booking_id', bookingId)
      .single();
    if (error || !escrow) {
      res.status(404).json({ error: 'Escrow not found' });
      return;
    }
    res.json({ escrow });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getUserEscrows(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.params.userId === 'me' ? req.user?.id : req.params.userId;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const { status } = req.query;
    let q = supabaseAdmin
      .from('escrows')
      .select('*')
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`);
    if (status) q = q.eq('status', String(status));
    const { data: escrows, error } = await q.order('created_at', { ascending: false });
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    const list = escrows ?? [];
    const active = list.filter((e: { status: string }) => e.status === 'held' || e.status === 'disputed');
    const completed = list.filter((e: { status: string }) => e.status === 'released' || e.status === 'refunded');
    res.json({ active, completed });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getEscrowStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const escrowId = req.params.escrowId;
    const { data: escrow, error } = await supabaseAdmin
      .from('escrows')
      .select('*')
      .eq('id', escrowId)
      .single();
    if (error || !escrow) {
      res.status(404).json({ error: 'Escrow not found' });
      return;
    }
    const { data: history } = await supabaseAdmin
      .from('escrow_history')
      .select('*')
      .eq('escrow_id', escrowId)
      .order('created_at', { ascending: false });
    res.json({
      status: escrow.status,
      history: history ?? [],
    });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function raiseDispute(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const escrowId = req.params.escrowId;
    const body = req.body as DisputeEscrowBody;
    const { data: escrow, error: fetchError } = await supabaseAdmin
      .from('escrows')
      .select('*')
      .eq('id', escrowId)
      .single();
    if (fetchError || !escrow) {
      res.status(404).json({ error: 'Escrow not found' });
      return;
    }
    const { data: dispute, error } = await supabaseAdmin
      .from('escrow_disputes')
      .insert({
        escrow_id: escrowId,
        reason: body.reason,
        details: body.details ?? null,
        status: 'open',
      })
      .select()
      .single();
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    await supabaseAdmin.from('escrows').update({ status: 'disputed', updated_at: new Date().toISOString() }).eq('id', escrowId);
    res.status(201).json({ disputeId: dispute.id, status: dispute.status });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function resolveEscrow(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const escrowId = req.params.escrowId;
    const body = req.body as ResolveEscrowBody;
    const { data: escrow, error: fetchError } = await supabaseAdmin
      .from('escrows')
      .select('*')
      .eq('id', escrowId)
      .single();
    if (fetchError || !escrow) {
      res.status(404).json({ error: 'Escrow not found' });
      return;
    }
    const releasedToUserId = body.releasedTo === 'to' ? escrow.to_user_id : escrow.from_user_id;
    await supabaseAdmin.from('escrows').update({
      status: 'released',
      released_by: 'admin',
      released_to: releasedToUserId,
      resolution: body.resolution,
      updated_at: new Date().toISOString(),
    }).eq('id', escrowId);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function adminListPendingDisputes(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { data: disputes, error } = await supabaseAdmin
      .from('escrow_disputes')
      .select('*, escrows(*)')
      .eq('status', 'open')
      .order('created_at', { ascending: false });
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.json({ disputes: disputes ?? [] });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
