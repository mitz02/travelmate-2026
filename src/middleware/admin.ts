import { Response, NextFunction } from 'express';
import { supabase } from '../services/supabase';
import { AuthRequest } from './auth';

/**
 * Middleware to ensure the authenticated user is an admin.
 * Must be used AFTER authMiddleware.
 */
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

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', req.userId)
      .single();

    if (error || !profile?.is_admin) {
      res.status(403).json({ error: 'Forbidden: Admin access required' });
      return;
    }

    // Attach to request for convenience in downstream handlers
    req.user = { ...req.user!, ...profile, isAdmin: true };
    
    next();
  } catch (err) {
    console.error('Admin middleware error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
