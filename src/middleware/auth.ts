import { Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/jwt';
import { queryOne } from '../config/database';
import { AuthenticatedRequest, LocalUser } from '../types';

export interface AuthRequest extends AuthenticatedRequest {}

export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid token' });
    return;
  }

  const token = header.slice(7);
  let payload: JwtPayload;
  try {
    payload = verifyToken(token);
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  req.userId = payload.userId;
  req.user = {
    id: payload.userId,
    email: payload.email,
    role: payload.role,
  };
  next();
}

export const requireAuth = authMiddleware;

export async function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const profile = await queryOne<{ is_admin: boolean; role: string }>(
    'SELECT is_admin, role FROM profiles WHERE user_id = $1 OR id = $1',
    [req.userId]
  );
  if (!profile || (!profile.is_admin && profile.role !== 'admin')) {
    res.status(403).json({ error: 'Forbidden: Admin access required' });
    return;
  }
  next();
}
