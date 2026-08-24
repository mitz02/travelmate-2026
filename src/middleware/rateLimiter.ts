import { Request, Response, NextFunction } from 'express';

interface RateLimitOptions {
  windowMs: number;       // Window duration in ms
  max: number;            // Max allowed requests per window
  message?: string;       // Custom error message
  keyGenerator?: (req: Request) => string; // Custom key builder
}

interface RequestRecord {
  count: number;
  resetTime: number;
}

const store = new Map<string, RequestRecord>();

// Cleanup expired keys periodically to prevent memory bloat
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of store.entries()) {
    if (now > record.resetTime) {
      store.delete(key);
    }
  }
}, 60000);

export function createRateLimiter(options: RateLimitOptions) {
  const {
    windowMs,
    max,
    message = 'Too many requests. Please try again later.',
    keyGenerator = (req) => {
      const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown-ip';
      return `${req.path}_${Array.isArray(clientIp) ? clientIp[0] : clientIp}`;
    }
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = keyGenerator(req);
    const now = Date.now();

    let record = store.get(key);

    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs
      };
      store.set(key, record);
    } else {
      record.count += 1;
    }

    const ttl = Math.ceil((record.resetTime - now) / 1000);

    // Set standard rate limit headers
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - record.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));

    if (record.count > max) {
      res.setHeader('Retry-After', ttl);
      res.status(429).json({
        error: message,
        retryAfterSeconds: ttl
      });
      return;
    }

    next();
  };
}

// ── Specialized Rate Limiters for Sensitive Operations ──

// Auth Rate Limiter (Login, Registration, Password Reset) — 10 attempts per 15 min
export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many authentication attempts. Account temporarily throttled for 15 minutes.'
});

// OTP Rate Limiter (Send / Verify OTP) — 5 attempts per 10 min
export const otpLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: 'Too many OTP requests. Please wait 10 minutes before requesting again.'
});

// Financial & Payment Rate Limiter — 15 requests per 10 min
export const paymentLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 15,
  message: 'Payment requests throttled to protect your account. Please wait a few minutes.'
});

// General API Rate Limiter — 120 requests per 1 min
export const apiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 120,
  message: 'API rate limit exceeded. Please slow down your requests.'
});
