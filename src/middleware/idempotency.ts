import { Request, Response, NextFunction } from 'express';

interface IdempotencyRecord {
  status: 'pending' | 'completed';
  statusCode?: number;
  body?: any;
  createdAt: number;
}

// In-memory idempotency store with TTL eviction
const idempotencyStore = new Map<string, IdempotencyRecord>();
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000; // 24 Hours TTL

// Evict expired records every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of idempotencyStore.entries()) {
    if (now - record.createdAt > IDEMPOTENCY_TTL_MS) {
      idempotencyStore.delete(key);
    }
  }
}, 10 * 60 * 1000);

export function requireIdempotency(options?: { required?: boolean }) {
  const isRequired = options?.required ?? false;

  return (req: Request, res: Response, next: NextFunction): void => {
    // Only apply to state-modifying requests (POST, PUT, PATCH, DELETE)
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
      return next();
    }

    const idempotencyKey = 
      (req.headers['idempotency-key'] as string) || 
      (req.headers['x-idempotency-key'] as string);

    if (!idempotencyKey) {
      if (isRequired) {
        res.status(400).json({
          error: 'Idempotency-Key header is required for this financial transaction.'
        });
        return;
      }
      return next();
    }

    const userPrefix = (req as any).user?.id || req.ip || 'anonymous';
    const storageKey = `${userPrefix}_${req.path}_${idempotencyKey}`;
    const existing = idempotencyStore.get(storageKey);

    if (existing) {
      if (existing.status === 'pending') {
        res.status(409).json({
          error: 'A concurrent transaction with this Idempotency-Key is currently processing. Please wait.'
        });
        return;
      }

      if (existing.status === 'completed') {
        res.setHeader('X-Cache-Lookup', 'IDEMPOTENCY_HIT');
        res.setHeader('X-Idempotency-Key', idempotencyKey);
        res.status(existing.statusCode || 200).json(existing.body);
        return;
      }
    }

    // Set pending status
    idempotencyStore.set(storageKey, {
      status: 'pending',
      createdAt: Date.now()
    });

    // Intercept response res.json to cache response payload upon completion
    const originalJson = res.json.bind(res);
    res.json = (body: any): Response => {
      // Cache response payload for successfully processed requests
      if (res.statusCode >= 200 && res.statusCode < 400) {
        idempotencyStore.set(storageKey, {
          status: 'completed',
          statusCode: res.statusCode,
          body,
          createdAt: Date.now()
        });
      } else {
        // If error response, delete pending record so user can retry safely
        idempotencyStore.delete(storageKey);
      }
      return originalJson(body);
    };

    next();
  };
}
