import { Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { AuthenticatedRequest } from '../types';
import type { CreateChatBody, SendMessageBody, TypingBody } from '../validators/chats';

export async function getUserChats(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.params.userId === 'me' ? req.user?.id : req.params.userId;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const { data: participants } = await supabaseAdmin
      .from('chat_participants')
      .select('chat_id')
      .eq('user_id', userId);
    const chatIds = [...new Set((participants ?? []).map((p: { chat_id: string }) => p.chat_id))];
    if (chatIds.length === 0) {
      res.json({ chats: [] });
      return;
    }
    const { data: chats, error } = await supabaseAdmin
      .from('chats')
      .select('*')
      .in('id', chatIds)
      .order('updated_at', { ascending: false });
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.json({ chats: chats ?? [] });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getMessages(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const chatId = req.params.chatId;
    const { before, limit } = req.query;
    const limitNum = Math.min(50, Math.max(1, Number(limit) || 20));
    let q = supabaseAdmin
      .from('chat_messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: false })
      .limit(limitNum + 1);
    if (before) q = q.lt('created_at', String(before));
    const { data: messages, error } = await q;
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    const list = messages ?? [];
    const hasMore = list.length > limitNum;
    const slice = hasMore ? list.slice(0, limitNum) : list;
    res.json({ messages: slice.reverse(), hasMore });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function sendMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const chatId = req.params.chatId;
    const body = req.body as SendMessageBody;
    const { data: message, error } = await supabaseAdmin
      .from('chat_messages')
      .insert({
        chat_id: chatId,
        sender_id: req.user.id,
        content: body.content,
        type: body.type ?? 'text',
        media_url: body.mediaUrl ?? null,
      })
      .select()
      .single();
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    await supabaseAdmin.from('chats').update({ updated_at: new Date().toISOString() }).eq('id', chatId);
    res.status(201).json({ message });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function markAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const chatId = req.params.chatId;
    await supabaseAdmin
      .from('chat_participants')
      .update({ last_read_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('chat_id', chatId)
      .eq('user_id', req.user.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createChat(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const body = req.body as CreateChatBody;
    const allParticipantIds = [req.user.id, ...body.participantIds];
    const { data: chat, error } = await supabaseAdmin
      .from('chats')
      .insert({ booking_id: body.bookingId ?? null })
      .select()
      .single();
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    await supabaseAdmin.from('chat_participants').insert(
      allParticipantIds.map((user_id) => ({ chat_id: chat.id, user_id }))
    );
    res.status(201).json({ chat });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteChat(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const chatId = req.params.chatId;
    const { error } = await supabaseAdmin.from('chats').delete().eq('id', chatId);
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function typingIndicator(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const chatId = req.params.chatId;
    const _body = req.body as TypingBody;
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getUnreadCount(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.params.userId === 'me' ? req.user?.id : req.params.userId;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const { data: participants } = await supabaseAdmin
      .from('chat_participants')
      .select('chat_id, last_read_at')
      .eq('user_id', userId);
    const chatIds = (participants ?? []).map((p: { chat_id: string }) => p.chat_id);
    if (chatIds.length === 0) {
      res.json({ total: 0, byChat: {} });
      return;
    }
    const { data: messages } = await supabaseAdmin
      .from('chat_messages')
      .select('chat_id, created_at')
      .in('chat_id', chatIds)
      .neq('sender_id', userId)
      .order('created_at', { ascending: false });
    const byChat: Record<string, number> = {};
    let total = 0;
    for (const p of participants ?? []) {
      const after = p.last_read_at ?? '1970-01-01';
      const count = (messages ?? []).filter(
        (m: { chat_id: string; created_at: string }) => m.chat_id === p.chat_id && m.created_at > after
      ).length;
      byChat[p.chat_id] = count;
      total += count;
    }
    res.json({ total, byChat });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
