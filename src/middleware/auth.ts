import { Request, Response, NextFunction } from 'express';
import jwt from 'jwt-simple';
import { config } from '../config';

export interface AuthRequest extends Request {
  userId?: string;
  user?: { id: string; email: string; role: string; isAdmin?: boolean };
}

export function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization header' });
      return;
    }
    const token = authHeader.slice(7);
    const decoded = jwt.decode(token, config.jwt.secret);
    const id = decoded.sub ?? decoded.id;
    req.userId = id;
    req.user = {
      id,
      email: decoded.email,
      role: decoded.role ?? 'rider',
    };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}
