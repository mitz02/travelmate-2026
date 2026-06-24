import { Router, Request, Response } from 'express';
import AgoraToken from 'agora-token';
import { config } from '../config';

const { RtcRole, RtcTokenBuilder } = AgoraToken;

const router = Router();

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

  try {
    const token = RtcTokenBuilder.buildTokenWithUid(
      appId, appCertificate, channel, uid, role, ttl, ttl
    );
    res.json({ token, appId, channel, uid, role: roleStr, expireAt: Math.floor(Date.now() / 1000) + ttl });
  } catch (err) {
    console.error('Failed to generate Agora token', err);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

export default router;
