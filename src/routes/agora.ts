import express, { Router, Request, Response } from 'express';
import pkg from 'agora-token';
const { RtcRole, RtcTokenBuilder } = pkg;
import { config } from '../config/index.js';

const router: Router = express.Router();

/**
 * GET /api/agora/token
 * Generates a short‑lived Agora RTC token for a given channel.
 *
 * Query Parameters:
 *   - channel (string) – the Agora channel name (e.g., ride_123)
 *   - uid (number, optional) – user ID; defaults to 0 (anonymous)
 *   - role (string, optional) – "publisher" or "subscriber"; defaults to "publisher"
 *   - expire (number, optional) – token TTL in seconds; defaults to 3600 (1h)
 */
router.get('/token', (req: Request, res: Response) => {
  const appId = config.agora?.appId;
  const appCertificate = config.agora?.appCertificate;

  if (!appId || !appCertificate) {
    res.status(500).json({ error: 'Agora credentials not configured' });
    return;
  }

  const channel = String(req.query.channel ?? 'default');
  const uid = Number(req.query.uid ?? 0);
  const roleStr = String(req.query.role ?? 'publisher');
  const ttl = Number(req.query.expire ?? 3600);

  const role = roleStr.toLowerCase() === 'subscriber' ? RtcRole.SUBSCRIBER : RtcRole.PUBLISHER;
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const expireTimestamp = currentTimestamp + ttl;

  try {
    const token = RtcTokenBuilder.buildTokenWithUid(appId, appCertificate, channel, uid, role, expireTimestamp, expireTimestamp);
    res.json({ token, appId, channel, uid, role: roleStr, expireAt: expireTimestamp });
  } catch (err) {
    console.error('Failed to generate Agora token', err);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

export default router;
