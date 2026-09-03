import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { recordSecurityEvent } from './sentinel';

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function clientKey(req: Request) {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

function prune(now: number) {
  if (buckets.size < 5000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function securityHeaders(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const requestId = randomUUID();
  req.headers['x-request-id'] = requestId;

  res.setHeader('X-Request-ID', requestId);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  );
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    ].join('; '),
  );

  if (process.env.NODE_ENV === 'production') {
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload',
    );
  }

  next();
}

export function noStoreApi(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  next();
}

export function originGuard(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const origin = req.header('origin');
  if (!origin) {
    next();
    return;
  }

  const configured = process.env.APP_URL?.replace(/\/$/, '');
  const allowed = new Set([
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    ...(configured ? [configured] : []),
  ]);

  if (!allowed.has(origin.replace(/\/$/, ''))) {
    recordSecurityEvent('origin_rejected', req);
    res.status(403).json({ error: 'Origin not allowed.' });
    return;
  }

  next();
}

export function createRateLimiter(options: {
  name: string;
  windowMs: number;
  max: number;
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    prune(now);

    const key = `${options.name}:${clientKey(req)}`;
    const current = buckets.get(key);

    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      next();
      return;
    }

    current.count += 1;

    if (current.count > options.max) {
      const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfter));
      recordSecurityEvent('rate_limit', req, { limiter: options.name });
      res.status(429).json({ error: 'Too many requests.' });
      return;
    }

    next();
  };
}
