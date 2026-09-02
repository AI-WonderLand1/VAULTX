import fs from 'fs';
import { CONFIG_DIR, SESSION_FILE } from '../config/paths';

export interface SessionData {
  token: string;
  email: string;
  expiresAt: number;
}

export function saveSession(data: SessionData): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  
  // Secure permissions for session file if creating new
  const exists = fs.existsSync(SESSION_FILE);
  fs.writeFileSync(SESSION_FILE, JSON.stringify(data, null, 2), { mode: 0o600, encoding: 'utf-8' });
}

export function getSession(): SessionData | null {
  if (!fs.existsSync(SESSION_FILE)) return null;
  
  try {
    const data = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
    
    // Check expiration (simple timestamp validation)
    if (data.expiresAt && Date.now() > data.expiresAt) {
      clearSession();
      return null;
    }
    
    return data;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  if (fs.existsSync(SESSION_FILE)) {
    fs.unlinkSync(SESSION_FILE);
  }
}
