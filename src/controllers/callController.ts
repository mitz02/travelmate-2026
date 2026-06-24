import { Response } from 'express';
import { query, queryOne } from '../config/database';
import { config } from '../config';
import { AuthenticatedRequest } from '../types';
import AgoraToken from 'agora-token';

const { RtcRole, RtcTokenBuilder } = AgoraToken;

function generateAgoraToken(channel: string, uid: number): { token: string; appId: string } {
  const appId = config.agora?.appId;
  const appCertificate = config.agora?.appCertificate;
  if (!appId || !appCertificate) {
    throw new Error('Agora credentials not configured');
  }
  const token = RtcTokenBuilder.buildTokenWithUid(
    appId, appCertificate, channel, uid, RtcRole.PUBLISHER, 3600, 3600
  );
  return { token, appId };
}

export async function initiateCall(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }
    const { rideId } = req.body;
    if (!rideId) { res.status(400).json({ error: 'rideId is required' }); return; }

    const ride = await queryOne('SELECT * FROM rides WHERE id = $1', [rideId]);
    if (!ride) { res.status(404).json({ error: 'Ride not found' }); return; }

    const userId = req.user.id;
    let callerName: string, calleeId: string, calleeName: string;

    if (ride.driver_id === userId) {
      const booking = await queryOne(
        `SELECT b.rider_id, p.first_name, p.last_name
         FROM bookings b
         JOIN profiles p ON p.id = b.rider_id
         WHERE b.ride_id = $1 AND b.status IN ('confirmed', 'in_progress')
         ORDER BY b.created_at ASC LIMIT 1`,
        [rideId]
      );
      if (!booking) { res.status(400).json({ error: 'No riders on this ride' }); return; }
      calleeId = booking.rider_id;
      calleeName = `${booking.first_name || ''} ${booking.last_name || ''}`.trim() || 'Rider';
      const caller = await queryOne('SELECT first_name, last_name FROM profiles WHERE id = $1', [userId]);
      callerName = caller ? `${caller.first_name || ''} ${caller.last_name || ''}`.trim() || 'Driver' : 'Driver';
    } else {
      calleeId = ride.driver_id;
      const caller = await queryOne('SELECT first_name, last_name FROM profiles WHERE id = $1', [userId]);
      callerName = caller ? `${caller.first_name || ''} ${caller.last_name || ''}`.trim() || 'Rider' : 'Rider';
      const callee = await queryOne('SELECT first_name, last_name FROM profiles WHERE id = $1', [calleeId]);
      calleeName = callee ? `${callee.first_name || ''} ${callee.last_name || ''}`.trim() || 'Driver' : 'Driver';
    }

    const channel = `ride_${rideId}`;
    const uid = Math.floor(Math.random() * 2147483647) + 1;

    const call = await queryOne(
      `INSERT INTO calls (caller_id, callee_id, ride_id, channel, status)
       VALUES ($1, $2, $3, $4, 'initiated') RETURNING *`,
      [userId, calleeId, rideId, channel]
    );

    let token, appId;
    try {
      const t = generateAgoraToken(channel, uid);
      token = t.token;
      appId = t.appId;
    } catch (err: any) {
      token = null;
      appId = config.agora?.appId || null;
    }

    res.json({ call, token, appId, uid, callerName, calleeName });
  } catch (e) {
    console.error('Failed to initiate call', e);
    res.status(500).json({ error: 'Failed to initiate call' });
  }
}

export async function getIncomingCalls(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }
    const calls = await query(
      `SELECT c.*, p.first_name, p.last_name
       FROM calls c
       JOIN profiles p ON p.id = c.caller_id
       WHERE c.callee_id = $1 AND c.status = 'initiated'
       ORDER BY c.created_at DESC LIMIT 10`,
      [req.user.id]
    );
    res.json({ calls: calls ?? [] });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function acceptCall(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }
    const callId = req.params.id;
    const call = await queryOne(
      `UPDATE calls SET status = 'connected', started_at = NOW()
       WHERE id = $1 AND callee_id = $2 AND status = 'initiated'
       RETURNING *`,
      [callId, req.user.id]
    );
    if (!call) { res.status(404).json({ error: 'Call not found or already handled' }); return; }
    res.json({ call });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function rejectCall(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }
    const callId = req.params.id;
    const call = await queryOne(
      `UPDATE calls SET status = 'rejected'
       WHERE id = $1 AND callee_id = $2 AND status = 'initiated'
       RETURNING *`,
      [callId, req.user.id]
    );
    if (!call) { res.status(404).json({ error: 'Call not found or already handled' }); return; }
    res.json({ call });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function endCall(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }
    const callId = req.params.id;
    const call = await queryOne(
      `UPDATE calls SET status = 'ended', ended_at = NOW()
       WHERE id = $1 AND (caller_id = $2 OR callee_id = $2) AND status IN ('initiated', 'ringing', 'connected')
       RETURNING *`,
      [callId, req.user.id]
    );
    if (!call) { res.status(404).json({ error: 'Call not found or already ended' }); return; }
    res.json({ call });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getCallHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }
    const calls = await query(
      `SELECT c.*,
              caller.first_name AS caller_first, caller.last_name AS caller_last,
              callee.first_name AS callee_first, callee.last_name AS callee_last
       FROM calls c
       JOIN profiles caller ON caller.id = c.caller_id
       JOIN profiles callee ON callee.id = c.callee_id
       WHERE c.caller_id = $1 OR c.callee_id = $1
       ORDER BY c.created_at DESC LIMIT 50`,
      [req.user.id]
    );
    res.json({ calls: calls ?? [] });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
