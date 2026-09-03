export type Environment = 'Global' | 'Development' | 'Staging' | 'Production';
export type Role = 'Admin' | 'Developer' | 'Viewer';

export type CredentialType =
  | 'api_key'
  | 'token'
  | 'oauth'
  | 'username_password'
  | 'cloud_credentials'
  | 'database'
  | 'ssh_key'
  | 'webhook_secret'
  | 'custom';

export interface Secret {
  id: string;
  key: string;
  provider?: string;
  type?: CredentialType;
  fields?: Record<string, string>;
  fieldCount?: number;
  fieldNames?: string[];
  decryptionError?: string;
  environment: Environment;
  description: string;
  createdAt: string;
  lastRotatedAt: string;
  tags: string[];
  ownerId?: string;
}

export interface AuditLog {
  id: string;
  secretId?: string;
  secretKey?: string;
  action:
    | 'CREATED'
    | 'UPDATED'
    | 'ROTATED'
    | 'DELETED'
    | 'ACCESSED'
    | 'ROLE_CHANGED'
    | 'SYSTEM_INIT';
  details: string;
  timestamp: string;
  userRole: Role;
}
