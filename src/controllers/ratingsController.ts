import { Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { query, queryOne } from '../config/database';
import { AuthenticatedRequest } from '../types';
import type { CreateRatingBody, UpdateRatingBody } from '../validators/ratings';

export async function createRating(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const body = req.body as CreateRatingBody;
    if (body.fromUserId !== req.user.id) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    const { data: rating, error } = await supabaseAdmin
      .from('ratings')
      .insert({
        to_user_id: body.toUserId,
        from_user_id: body.fromUserId,
        booking_id: body.bookingId,
        rating: body.rating,
        comment: body.comment ?? null,
        role: body.role,
      })
      .select()
      .single();
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(201).json({ rating });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getUserRatings(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.params.userId === 'me' ? req.user?.id : req.params.userId;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const { role, page } = req.query;
    const pageNum = Math.max(1, Number(page) || 1);
    const pageSize = 20;
    const from = (pageNum - 1) * pageSize;
    const to = from + pageSize - 1;
    const params: any[] = [userId];
    let sql = 'SELECT * FROM ratings WHERE to_user_id = $1';
    if (role) {
      sql += ' AND role = $' + (params.length + 1);
      params.push(String(role));
    }
    sql += ' ORDER BY created_at DESC OFFSET $' + (params.length + 1) + ' LIMIT $' + (params.length + 2);
    params.push(from, pageSize);
    const ratings = await query(sql, params);
    const avgRows = await query('SELECT rating FROM ratings WHERE to_user_id = $1', [userId]);
    const sum = avgRows.reduce((s: number, r: { rating: number }) => s + r.rating, 0);
    const count = avgRows.length;
    const average = count ? sum / count : 0;
    res.json({ ratings: ratings ?? [], average: Math.round(average * 100) / 100 });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getBookingRatings(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const bookingId = req.params.bookingId;
    const ratings = await query('SELECT * FROM ratings WHERE booking_id = $1', [bookingId]);
    const list = ratings ?? [];
    const driverRating = list.find((r: { role: string }) => r.role === 'driver') ?? null;
    const riderRating = list.find((r: { role: string }) => r.role === 'rider') ?? null;
    res.json({ driverRating, riderRating });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateRating(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const ratingId = req.params.ratingId;
    const body = req.body as UpdateRatingBody;
    const existing = await queryOne('SELECT from_user_id FROM ratings WHERE id = $1', [ratingId]);
    if (!existing) {
      res.status(404).json({ error: 'Rating not found' });
      return;
    }
    if (existing.from_user_id !== req.user.id) {
      res.status(403).json({ error: 'Only the author can update' });
      return;
    }
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.rating !== undefined) updates.rating = body.rating;
    if (body.comment !== undefined) updates.comment = body.comment;
    const { data: rating, error } = await supabaseAdmin
      .from('ratings')
      .update(updates)
      .eq('id', ratingId)
      .select()
      .single();
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.json({ rating });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteRating(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const ratingId = req.params.ratingId;
    const existing = await queryOne('SELECT from_user_id FROM ratings WHERE id = $1', [ratingId]);
    if (!existing) {
      res.status(404).json({ error: 'Rating not found' });
      return;
    }
    if (existing.from_user_id !== req.user.id) {
      res.status(403).json({ error: 'Only the author can delete' });
      return;
    }
    const { error } = await supabaseAdmin.from('ratings').delete().eq('id', ratingId);
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getRatingSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.params.userId === 'me' ? req.user?.id : req.params.userId;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const ratings = await query('SELECT rating FROM ratings WHERE to_user_id = $1', [userId]);
    const list = ratings ?? [];
    const sum = list.reduce((s: number, r: { rating: number }) => s + r.rating, 0);
    const count = list.length;
    const average = count ? sum / count : 0;
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of list) {
      const star = Math.min(5, Math.max(1, Math.round(r.rating)));
      distribution[star as keyof typeof distribution]++;
    }
    res.json({
      average: Math.round(average * 100) / 100,
      counts: { total: count },
      distribution,
    });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
