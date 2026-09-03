import { createHmac, randomUUID } from 'node:crypto';
import type { Request } from 'express';

export type SecurityEvent =
  | 'rate_limit'
  | 'origin_rejected'
  | 'auth_failed'
  | 'authorization_denied'
  | 'invalid_input'
  | 'secret_access'
  | 'secret_mutation';

export interface SecurityEventPayload {
  id: string;
  type: 'vaultx.security';
  event: SecurityEvent;
  at: string;
  requestId?: string;
  method: string;
  path: string;
  metadata: Record<string, string | number | boolean>;
}

function sanitizeMetadata(
  metadata: Record<string, string | number | boolean | undefined>,
): Record<string, string | number | boolean> {
  const blocked = /secret|token|password|authorization|cookie|key|value|payload|body/i;

  return Object.fromEntries(
    Object.entries(metadata)
      .filter(([name, value]) => value !== undefined && !blocked.test(name))
      .map(([name, value]) => [
        name.slice(0, 64),
        typeof value === 'string' ? value.slice(0, 160) : value,
      ]),
  ) as Record<string, string | number | boolean>;
}

function safeRequestId(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value.replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 80);
}

async function sendToSentinel(payload: SecurityEventPayload) {
  const url = process.env.VAULTX_SENTINEL_WEBHOOK_URL;
  const signingSecret = process.env.VAULTX_SENTINEL_WEBHOOK_SECRET;

  if (!url) return;

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
      console.warn('VAULTX Sentinel webhook rejected: production webhook must use HTTPS.');
      return;
    }

    const body = JSON.stringify(payload);
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      'user-agent': 'vaultx-sentinel/1.0',
    };

    if (signingSecret) {
      headers['x-vaultx-signature'] =
        'sha256=' +
        createHmac('sha256', signingSecret).update(body).digest('hex');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    try {
      await fetch(url, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.warn(
      'VAULTX Sentinel delivery failed:',
      error instanceof Error ? error.message : 'unknown error',
    );
  }
}

export function recordSecurityEvent(
  event: SecurityEvent,
  req: Request,
  metadata: Record<string, string | number | boolean | undefined> = {},
) {
  const payload: SecurityEventPayload = {
    id: randomUUID(),
    type: 'vaultx.security',
    event,
    at: new Date().toISOString(),
    requestId: safeRequestId(req.header('x-request-id')),
    method: req.method,
    path: req.path.slice(0, 200),
    metadata: sanitizeMetadata(metadata),
  };

  console.warn(JSON.stringify(payload));

  // Do not block the request path on an external AI/automation service.
  void sendToSentinel(payload);
}
