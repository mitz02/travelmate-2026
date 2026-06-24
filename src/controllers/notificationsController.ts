import { Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { AuthenticatedRequest } from '../types';
import type { SendNotificationBody, RegisterTokenBody, UnregisterTokenBody } from '../validators/notifications';

export async function getNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.params.userId === 'me' || !req.params.userId ? req.user?.id : req.params.userId;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const { page, limit } = req.query;
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(50, Math.max(1, Number(limit) || 20));
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;
    const { data: notifications, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(from, to);
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.json({ notifications: notifications ?? [] });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function markNotificationRead(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const notificationId = req.params.notificationId;
    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ read_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', notificationId);
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function markAllRead(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.params.userId === 'me' || !req.params.userId ? req.user?.id : req.params.userId;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ read_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('read_at', null);
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteNotification(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const notificationId = req.params.notificationId;
    const { error } = await supabaseAdmin.from('notifications').delete().eq('id', notificationId);
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function sendNotification(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const body = req.body as SendNotificationBody;
    const { data: notification, error } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: body.userId,
        title: body.title,
        body: body.body ?? null,
        data: body.data ?? {},
      })
      .select()
      .single();
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(201).json({ notification });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function registerPushToken(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const body = req.body as RegisterTokenBody;
    await supabaseAdmin.from('user_fcm_tokens').upsert(
      {
        user_id: req.user.id,
        token: body.token,
        device_type: body.device ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,token' }
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function unregisterPushToken(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const body = req.body as UnregisterTokenBody;
    await supabaseAdmin.from('user_fcm_tokens').delete().eq('user_id', req.user.id).eq('token', body.token);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
