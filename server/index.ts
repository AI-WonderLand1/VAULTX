import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';
import {
  createClient,
  type SupabaseClient,
  type User,
} from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });
dotenv.config();

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const ENCRYPTION_SECRET = process.env.VAULTX_ENCRYPTION_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing Supabase configuration. Set SUPABASE_URL/SUPABASE_ANON_KEY or the VITE_ equivalents.',
  );
}

if (!ENCRYPTION_SECRET) {
  throw new Error(
    'Missing VAULTX_ENCRYPTION_KEY. This key must exist only in the server environment.',
  );
}

const encryptionKey = /^[0-9a-fA-F]{64}$/.test(ENCRYPTION_SECRET)
  ? Buffer.from(ENCRYPTION_SECRET, 'hex')
  : createHash('sha256').update(ENCRYPTION_SECRET, 'utf8').digest();

function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    'v1',
    iv.toString('base64url'),
    tag.toString('base64url'),
    ciphertext.toString('base64url'),
  ].join('.');
}

function decrypt(payload: string): string {
  const [version, ivEncoded, tagEncoded, ciphertextEncoded] = payload.split('.');

  if (
    version !== 'v1' ||
    !ivEncoded ||
    !tagEncoded ||
    !ciphertextEncoded
  ) {
    throw new Error('legacy-ciphertext');
  }

  const decipher = createDecipheriv(
    'aes-256-gcm',
    encryptionKey,
    Buffer.from(ivEncoded, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(tagEncoded, 'base64url'));

  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextEncoded, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

function decodeFields(value: string | null | undefined) {
  if (!value) return { fields: {} as Record<string, string> };

  try {
    const plaintext = decrypt(value);
    try {
      const parsed = JSON.parse(plaintext);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return { fields: parsed as Record<string, string> };
      }
    } catch {
      // Legacy single-value plaintext inside the new envelope.
    }
    return { fields: { value: plaintext } };
  } catch (error) {
    if (error instanceof Error && error.message === 'legacy-ciphertext') {
      return {
        fields: {} as Record<string, string>,
        decryptionError:
          'This value was encrypted by the old browser-side implementation. Rotate or recreate it.',
      };
    }

    return {
      fields: {} as Record<string, string>,
      decryptionError: 'Unable to decrypt this secret.',
    };
  }
}

function isFieldMap(value: unknown): value is Record<string, string> {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.values(value as Record<string, unknown>).every(
      (entry) => typeof entry === 'string',
    )
  );
}

async function authenticate(
  req: Request,
  res: Response,
): Promise<{ client: SupabaseClient; user: User } | null> {
  const header = req.header('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';

  if (!token) {
    res.status(401).json({ error: 'Missing authentication token.' });
    return null;
  }

  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const {
    data: { user },
    error,
  } = await client.auth.getUser(token);

  if (error || !user) {
    res.status(401).json({ error: 'Invalid or expired session.' });
    return null;
  }

  return { client, user };
}

async function getUserRole(client: SupabaseClient, userId: string) {
  const { data } = await client
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  return data?.role || 'Viewer';
}

async function writeAudit(
  client: SupabaseClient,
  user: User,
  action: string,
  secretId: string | null,
  secretKey: string,
  details: string,
) {
  const role = await getUserRole(client, user.id);
  const auditRow: Record<string, unknown> = {
    action,
    secret_key: secretKey,
    details,
    user_role: role,
    owner_id: user.id,
  };

  if (secretId) {
    auditRow.secret_id = secretId;
  }

  const { error } = await client.from('audit_logs').insert([auditRow]);

  if (error) {
    console.warn('VAULTX audit write failed:', error.message);
  }
}

function serializeSecretMetadata(row: Record<string, any>) {
  const decoded = decodeFields(row.value);
  const fieldNames = decoded.decryptionError ? [] : Object.keys(decoded.fields);

  return {
    id: row.id,
    key: row.key,
    provider: row.provider,
    type: row.type,
    environment: row.environment,
    description: row.description || '',
    createdAt: row.created_at,
    lastRotatedAt: row.last_rotated_at || row.created_at,
    tags: row.tags || [],
    ownerId: row.owner_id,
    fieldCount: fieldNames.length,
    fieldNames,
    decryptionError: decoded.decryptionError,
  };
}

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '256kb' }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many API requests. Try again later.' },
});

const revealLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many reveal requests. Try again in a minute.' },
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'vaultx-api' });
});

app.get('/api/secrets', apiLimiter, async (req, res) => {
  try {
    const auth = await authenticate(req, res);
    if (!auth) return;

    const { data, error } = await auth.client
      .from('secrets')
      .select('*')
      .eq('owner_id', auth.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json((data || []).map(serializeSecretMetadata));
  } catch {
    res.status(500).json({ error: 'Failed to load secrets.' });
  }
});

app.post('/api/secrets', apiLimiter, async (req, res) => {
  try {
    const auth = await authenticate(req, res);
    if (!auth) return;

    const { key, provider, type, environment, description = '', tags = [], fields } = req.body || {};

    if (
      typeof key !== 'string' ||
      !key.trim() ||
      typeof environment !== 'string' ||
      !isFieldMap(fields)
    ) {
      res.status(400).json({ error: 'Invalid secret payload.' });
      return;
    }

    const encryptedValue = encrypt(JSON.stringify(fields));

    const { data, error } = await auth.client
      .from('secrets')
      .insert([
        {
          key: key.trim(),
          provider: typeof provider === 'string' && provider.trim() ? provider.trim() : null,
          type: typeof type === 'string' && type.trim() ? type.trim() : null,
          environment,
          description,
          tags: Array.isArray(tags)
            ? tags.filter((tag) => typeof tag === 'string').slice(0, 20)
            : [],
          value: encryptedValue,
          owner_id: auth.user.id,
        },
      ])
      .select()
      .single();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    await writeAudit(
      auth.client,
      auth.user,
      'CREATED',
      data.id,
      data.key,
      `Created new secret ${data.key} in ${data.environment}`,
    );

    res.status(201).json(serializeSecretMetadata(data));
  } catch {
    res.status(500).json({ error: 'Failed to create secret.' });
  }
});

app.get('/api/secrets/:id/reveal', revealLimiter, async (req, res) => {
  try {
    const auth = await authenticate(req, res);
    if (!auth) return;

    const role = await getUserRole(auth.client, auth.user.id);
    if (role === 'Viewer') {
      res.status(403).json({ error: 'You do not have permission to reveal secrets.' });
      return;
    }

    const { data, error } = await auth.client
      .from('secrets')
      .select('id,key,value')
      .eq('id', req.params.id)
      .eq('owner_id', auth.user.id)
      .maybeSingle();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    if (!data) {
      res.status(404).json({ error: 'Secret not found.' });
      return;
    }

    const decoded = decodeFields(data.value);
    if (decoded.decryptionError) {
      res.status(422).json({ error: decoded.decryptionError });
      return;
    }

    await writeAudit(
      auth.client,
      auth.user,
      'ACCESSED',
      data.id,
      data.key,
      `Revealed decrypted value of ${data.key}`,
    );

    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.json({ fields: decoded.fields });
  } catch {
    res.status(500).json({ error: 'Failed to reveal secret.' });
  }
});

app.patch('/api/secrets/:id', apiLimiter, async (req, res) => {
  try {
    const auth = await authenticate(req, res);
    if (!auth) return;

    const { data: existing, error: existingError } = await auth.client
      .from('secrets')
      .select('*')
      .eq('id', req.params.id)
      .eq('owner_id', auth.user.id)
      .maybeSingle();

    if (existingError) {
      res.status(400).json({ error: existingError.message });
      return;
    }
    if (!existing) {
      res.status(404).json({ error: 'Secret not found.' });
      return;
    }

    const updates: Record<string, unknown> = {};
    const { key, provider, type, environment, description, tags, fields, rotate } = req.body || {};

    if (key !== undefined) {
      if (typeof key !== 'string' || !key.trim()) {
        res.status(400).json({ error: 'Invalid secret name.' });
        return;
      }
      updates.key = key.trim();
    }
    if (provider !== undefined) {
      if (provider !== null && typeof provider !== 'string') {
        res.status(400).json({ error: 'Invalid provider.' });
        return;
      }
      updates.provider =
        typeof provider === 'string' && provider.trim() ? provider.trim() : null;
    }
    if (type !== undefined) {
      if (type !== null && typeof type !== 'string') {
        res.status(400).json({ error: 'Invalid credential type.' });
        return;
      }
      updates.type = typeof type === 'string' && type.trim() ? type.trim() : null;
    }
    if (tags !== undefined) {
      if (!Array.isArray(tags) || !tags.every((tag) => typeof tag === 'string')) {
        res.status(400).json({ error: 'Invalid tags.' });
        return;
      }
      updates.tags = tags.slice(0, 20);
    }
    if (environment !== undefined) {
      if (typeof environment !== 'string') {
        res.status(400).json({ error: 'Invalid environment.' });
        return;
      }
      updates.environment = environment;
    }
    if (description !== undefined) {
      if (typeof description !== 'string') {
        res.status(400).json({ error: 'Invalid description.' });
        return;
      }
      updates.description = description;
    }
    if (fields !== undefined) {
      if (!isFieldMap(fields)) {
        res.status(400).json({ error: 'Invalid secret fields.' });
        return;
      }
      updates.value = encrypt(JSON.stringify(fields));
    }
    if (rotate === true) {
      updates.last_rotated_at = new Date().toISOString();
    }

    const { data, error } = await auth.client
      .from('secrets')
      .update(updates)
      .eq('id', req.params.id)
      .eq('owner_id', auth.user.id)
      .select()
      .single();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    await writeAudit(
      auth.client,
      auth.user,
      rotate === true ? 'ROTATED' : 'UPDATED',
      data.id,
      data.key,
      rotate === true
        ? `Rotated secret ${data.key}`
        : `Updated secret ${data.key}`,
    );

    res.json(serializeSecretMetadata(data));
  } catch {
    res.status(500).json({ error: 'Failed to update secret.' });
  }
});

app.delete('/api/secrets/:id', apiLimiter, async (req, res) => {
  try {
    const auth = await authenticate(req, res);
    if (!auth) return;

    const { data: existing, error: existingError } = await auth.client
      .from('secrets')
      .select('id,key')
      .eq('id', req.params.id)
      .eq('owner_id', auth.user.id)
      .maybeSingle();

    if (existingError) {
      res.status(400).json({ error: existingError.message });
      return;
    }
    if (!existing) {
      res.status(404).json({ error: 'Secret not found.' });
      return;
    }

    const { error } = await auth.client
      .from('secrets')
      .delete()
      .eq('id', req.params.id)
      .eq('owner_id', auth.user.id);

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    await writeAudit(
      auth.client,
      auth.user,
      'DELETED',
      null,
      existing.key,
      `Deleted secret ${existing.key}`,
    );

    res.status(204).end();
  } catch {
    res.status(500).json({ error: 'Failed to delete secret.' });
  }
});

app.get('/api/audit-logs', apiLimiter, async (req, res) => {
  try {
    const auth = await authenticate(req, res);
    if (!auth) return;

    const { data, error } = await auth.client
      .from('audit_logs')
      .select('*')
      .eq('owner_id', auth.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json(
      (data || []).map((row) => ({
        id: row.id,
        secretId: row.secret_id || undefined,
        secretKey: row.secret_key || undefined,
        action: row.action,
        details: row.details,
        timestamp: row.created_at,
        userRole: row.user_role,
      })),
    );
  } catch {
    res.status(500).json({ error: 'Failed to load audit logs.' });
  }
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../dist');

app.use(express.static(distDir));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    next();
    return;
  }
  res.sendFile(path.join(distDir, 'index.html'));
});

const port = Number(process.env.PORT || 8787);
app.listen(port, '0.0.0.0', () => {
  console.log(`VAULTX server listening on http://localhost:${port}`);
});
