import { Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { AuthenticatedRequest } from '../types';
import type { SosBody, AddContactBody, UpdateContactBody } from '../validators/emergency';

export async function triggerSos(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const body = req.body as SosBody;
    const { data: alert, error } = await supabaseAdmin
      .from('emergency_alerts')
      .insert({
        user_id: body.userId,
        location: body.location,
        booking_id: body.bookingId ?? null,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    const { data: contacts } = await supabaseAdmin
      .from('emergency_contacts')
      .select('id, name, phone, relationship')
      .eq('user_id', body.userId)
      .order('created_at', { ascending: true });
    res.status(201).json({ alertId: alert.id, contacts: contacts ?? [] });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getEmergencyContacts(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.params.userId === 'me' ? req.user?.id : req.params.userId;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const { data: contacts, error } = await supabaseAdmin
      .from('emergency_contacts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.json({ contacts: contacts ?? [] });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function addContact(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const body = req.body as AddContactBody;
    const { data: contact, error } = await supabaseAdmin
      .from('emergency_contacts')
      .insert({
        user_id: req.user.id,
        name: body.name,
        phone: body.phone,
        relationship: body.relationship ?? null,
      })
      .select()
      .single();
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(201).json({ contact });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateContact(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const contactId = req.params.contactId;
    const body = req.body as UpdateContactBody;
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.name !== undefined) updates.name = body.name;
    if (body.phone !== undefined) updates.phone = body.phone;
    if (body.relationship !== undefined) updates.relationship = body.relationship;
    const { data: contact, error } = await supabaseAdmin
      .from('emergency_contacts')
      .update(updates)
      .eq('id', contactId)
      .eq('user_id', req.user.id)
      .select()
      .single();
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.json({ contact });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteContact(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const contactId = req.params.contactId;
    const { error } = await supabaseAdmin
      .from('emergency_contacts')
      .delete()
      .eq('id', contactId)
      .eq('user_id', req.user.id);
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function cancelSos(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const alertId = req.params.alertId;
    const { data: alert, error: fetchError } = await supabaseAdmin
      .from('emergency_alerts')
      .select('user_id, status')
      .eq('id', alertId)
      .single();
    if (fetchError || !alert) {
      res.status(404).json({ error: 'Alert not found' });
      return;
    }
    if (alert.user_id !== req.user.id) {
      res.status(403).json({ error: 'Only the alert owner can cancel' });
      return;
    }
    if (alert.status !== 'active') {
      res.status(400).json({ error: 'Alert is not active' });
      return;
    }
    const { error } = await supabaseAdmin
      .from('emergency_alerts')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', alertId);
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getAlertStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const alertId = req.params.alertId;
    const { data: alert, error } = await supabaseAdmin
      .from('emergency_alerts')
      .select('id, user_id, status, location, booking_id, created_at, updated_at')
      .eq('id', alertId)
      .single();
    if (error || !alert) {
      res.status(404).json({ error: 'Alert not found' });
      return;
    }
    const { data: responders } = await supabaseAdmin
      .from('emergency_responders')
      .select('id, contact_id, contacted_at, acknowledged_at')
      .eq('alert_id', alertId)
      .order('contacted_at', { ascending: false });
    res.json({
      status: alert.status,
      responders: responders ?? [],
    });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
