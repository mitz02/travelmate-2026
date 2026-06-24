import { Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { AuthenticatedRequest } from '../types';
import type { CreateStatusBody, AddCommentBody, ReactBody } from '../validators/routeFeed';

export async function createStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const body = req.body as CreateStatusBody;
    const { data: status, error } = await supabaseAdmin
      .from('route_feed_statuses')
      .insert({
        user_id: req.user.id,
        route: body.route,
        content: body.content ?? null,
        image: body.image ?? null,
        type: body.type ?? 'text',
      })
      .select()
      .single();
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(201).json({ status });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getFeed(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { route, page } = req.query;
    const pageNum = Math.max(1, Number(page) || 1);
    const pageSize = 20;
    const from = (pageNum - 1) * pageSize;
    const to = from + pageSize - 1;
    let q = supabaseAdmin
      .from('route_feed_statuses')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to);
    if (route) q = q.eq('route', String(route));
    const { data: statuses, error } = await q;
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.json({ statuses: statuses ?? [] });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const statusId = req.params.statusId;
    const { data: status, error } = await supabaseAdmin
      .from('route_feed_statuses')
      .select('*')
      .eq('id', statusId)
      .single();
    if (error || !status) {
      res.status(404).json({ error: 'Status not found' });
      return;
    }
    const { data: comments } = await supabaseAdmin
      .from('route_feed_comments')
      .select('*')
      .eq('status_id', statusId)
      .order('created_at', { ascending: true });
    res.json({ status, comments: comments ?? [] });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function addComment(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const statusId = req.params.statusId;
    const body = req.body as AddCommentBody;
    const { data: comment, error } = await supabaseAdmin
      .from('route_feed_comments')
      .insert({
        status_id: statusId,
        user_id: req.user.id,
        content: body.content,
      })
      .select()
      .single();
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(201).json({ comment });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function react(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const statusId = req.params.statusId;
    const body = req.body as ReactBody;
    const { data: existing } = await supabaseAdmin
      .from('route_feed_reactions')
      .select('id')
      .eq('status_id', statusId)
      .eq('user_id', req.user.id)
      .single();
    if (existing) {
      await supabaseAdmin
        .from('route_feed_reactions')
        .update({ type: body.type, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      await supabaseAdmin.from('route_feed_reactions').insert({
        status_id: statusId,
        user_id: req.user.id,
        type: body.type,
      });
    }
    const { data: reactions } = await supabaseAdmin
      .from('route_feed_reactions')
      .select('type')
      .eq('status_id', statusId);
    const counts = (reactions ?? []).reduce((acc: Record<string, number>, r: { type: string }) => {
      acc[r.type] = (acc[r.type] ?? 0) + 1;
      return acc;
    }, {});
    res.json({ reactions: counts });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getRouteStatuses(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const routeId = req.params.routeId;
    const { data: statuses, error } = await supabaseAdmin
      .from('route_feed_statuses')
      .select('*')
      .eq('route', routeId)
      .order('created_at', { ascending: false });
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.json({ statuses: statuses ?? [] });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const statusId = req.params.statusId;
    const { data: status, error: fetchError } = await supabaseAdmin
      .from('route_feed_statuses')
      .select('user_id')
      .eq('id', statusId)
      .single();
    if (fetchError || !status) {
      res.status(404).json({ error: 'Status not found' });
      return;
    }
    if (status.user_id !== req.user.id) {
      res.status(403).json({ error: 'Only the author can delete' });
      return;
    }
    const { error } = await supabaseAdmin.from('route_feed_statuses').delete().eq('id', statusId);
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
