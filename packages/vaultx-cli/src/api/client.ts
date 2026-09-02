import { createClient } from '@supabase/supabase-js';
import { CLIError } from '../utils/errors';

// Provide your Supabase URL and Anon Key here, or via environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || "https://your-project.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "your-anon-key";

// Only create the client if we have real variables (or at least syntactically valid URLs to prevent crashes)
const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

export async function loginWithEmailAndPassword(email: string, password: string) {
  if (SUPABASE_URL.includes('your-project')) {
    throw new CLIError('Supabase is not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY.');
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new CLIError(error.message || 'Authentication failed.');
  }

  if (!data.session) {
    throw new CLIError('No session returned from Supabase.');
  }

  const expiresInMs = data.session.expires_in * 1000;
  
  return {
    token: data.session.access_token,
    email: data.user.email || email,
    expiresAt: Date.now() + expiresInMs
  };
}

export async function validatePluginToken(token: string) {
  if (SUPABASE_URL.includes('your-project')) {
    throw new CLIError('Supabase is not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY.');
  }

  if (!token || token.length < 16) {
    throw new CLIError('Invalid plugin token format.');
  }
  
  // Verify it's a valid Supabase access token by looking up the user
  const info = await checkStatus(token);
  
  // Assuming a 30-day validity for long-lived CLI tokens
  const expiresInMs = 30 * 24 * 60 * 60 * 1000;
  
  return {
    token: token,
    email: info.account,
    expiresAt: Date.now() + expiresInMs
  };
}

export async function checkStatus(token: string) {
  if (SUPABASE_URL.includes('your-project')) {
    throw new CLIError('Supabase is not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY.');
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    throw new CLIError(error?.message || 'Failed to verify token status. Token may be invalid or expired.');
  }

  return { valid: true, account: data.user.email || 'unknown' };
}
