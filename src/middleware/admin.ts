import { Response, NextFunction } from 'express';
import { queryOne } from '../config/database';
import { AuthRequest } from './auth';

export async function adminMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
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
  } catch (err) {
    console.error('Admin middleware error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
