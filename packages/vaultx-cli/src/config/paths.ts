import os from 'os';
import path from 'path';

export const CONFIG_DIR = path.join(os.homedir(), '.vaultx');
export const SESSION_FILE = path.join(CONFIG_DIR, 'session.json');
