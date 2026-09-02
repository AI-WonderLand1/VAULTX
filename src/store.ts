import { useState, useEffect, useCallback } from 'react';
import { supabase } from './lib/supabase';
import { Secret, AuditLog, Role } from './types';
import { useAuth } from './contexts/AuthContext';
import CryptoJS from 'crypto-js';

// Use the custom wondrland secret key from the environment, fallback to default for dev
const ENCRYPTION_KEY = import.meta.env.VITE_WONDRLAND || 'vaultx-master-key-secure-2024'; 

const encryptValue = (value: string) => {
  return CryptoJS.AES.encrypt(value, ENCRYPTION_KEY).toString();
};

const decryptValue = (encrypted: string) => {
  try {
    const bytes = CryptoJS.AES.decrypt(encrypted, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch {
    return 'Decryption Failed';
  }
};

export function useSecretsManager() {
  const { currentUser } = useAuth();
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Read Secrets
  useEffect(() => {
    if (!currentUser) return;
    
    const fetchSecrets = async () => {
      const { data } = await supabase
        .from('secrets')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (data) {
        const fetchedSecrets = data.map(doc => {
          return {
            id: doc.id,
            ...doc,
            value: decryptValue(doc.value),
            fields: (() => {
              const decrypted = decryptValue(doc.value);
              try {
                const parsed = JSON.parse(decrypted);
                if (typeof parsed === 'object' && parsed !== null) {
                  return parsed;
                }
              } catch {
                // Legacy secret with single value
              }
              return { value: decrypted };
            })(),
            createdAt: doc.created_at,
            lastRotatedAt: doc.last_rotated_at,
            ownerId: doc.owner_id
          } as Secret;
        });
        setSecrets(fetchedSecrets);
      }
    };
    
    fetchSecrets();

    // Supabase Realtime Subscription
    const channel = supabase.channel('secrets_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'secrets' }, () => {
        fetchSecrets();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUser]);

  // Read Logs
  useEffect(() => {
    if (!currentUser) return;
    
    const fetchLogs = async () => {
      const { data } = await supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false });
        
      if (data) {
        const mappedLogs = data.map(log => ({
          ...log,
          secretId: log.secretId,
          secretKey: log.secretKey,
          userRole: log.userRole,
          userId: log.userId
        }));
        setLogs(mappedLogs as AuditLog[]);
      }
      setIsLoaded(true);
    };

    fetchLogs();

    const channel = supabase.channel('logs_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_logs' }, () => {
        fetchLogs();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUser]);

  const addLog = useCallback(async (log: Omit<AuditLog, 'id' | 'timestamp' | 'userRole'>) => {
    if (!currentUser) return;
    try {
      await supabase.from('audit_logs').insert([{
        action: log.action,
        secretId: log.secretId,
        secretKey: log.secretKey,
        details: log.details,
        userRole: currentUser.role,
        userId: currentUser.uid
      }]);
    } catch (e) {
      console.error("Failed to add log", e);
    }
  }, [currentUser]);

  const addSecret = async (secretData: Omit<Secret, 'id' | 'createdAt' | 'lastRotatedAt'>) => {
    if (!currentUser) return;
    
    const payloadToEncrypt = secretData.fields 
       ? JSON.stringify(secretData.fields) 
       : secretData.value || '';
       
    const encryptedValue = encryptValue(payloadToEncrypt);
    
    try {
      const { data, error } = await supabase.from('secrets').insert([{
        key: secretData.key,
        environment: secretData.environment,
        description: secretData.description,
        value: encryptedValue,
        owner_id: currentUser.uid
      }]).select().single();
      
      if (error) throw error;

      await addLog({
        action: 'CREATED',
        secretId: data.id,
        secretKey: secretData.key,
        details: `Created new secret ${secretData.key} in ${secretData.environment}`,
      });
    } catch (e) {
      console.error("Failed to add secret", e);
    }
  };

  const updateSecret = async (id: string, updates: Partial<Secret>) => {
    const secret = secrets.find(s => s.id === id);
    if (!secret || !currentUser) return;
    
    const { fields, value, ...restUpdates } = updates;
    const dataToUpdate: any = { ...restUpdates };
    
    if (fields) {
      dataToUpdate.value = encryptValue(JSON.stringify(fields));
    } else if (value) {
      dataToUpdate.value = encryptValue(value);
    }

    try {
      await supabase.from('secrets').update(dataToUpdate).eq('id', id);
      await addLog({
        action: 'UPDATED',
        secretId: id,
        secretKey: secret.key,
        details: `Updated secret ${secret.key}`,
      });
    } catch (e) {
      console.error("Failed to update secret", e);
    }
  };

  const rotateSecret = async (id: string, newFields: Record<string, string>) => {
    const secret = secrets.find(s => s.id === id);
    if (!secret || !currentUser) return;
    try {
      await supabase.from('secrets').update({
        value: encryptValue(JSON.stringify(newFields)),
        last_rotated_at: new Date().toISOString()
      }).eq('id', id);
      
      await addLog({
        action: 'ROTATED',
        secretId: id,
        secretKey: secret.key,
        details: `Rotated secret ${secret.key} (Encrypted hash updated)`,
      });
    } catch (e) {
      console.error("Failed to rotate secret", e);
    }
  };

  const deleteSecret = async (id: string) => {
    const secret = secrets.find(s => s.id === id);
    if (!secret || !currentUser) return;
    try {
      await supabase.from('secrets').delete().eq('id', id);
      await addLog({
        action: 'DELETED',
        secretId: id,
        secretKey: secret.key,
        details: `Deleted secret ${secret.key}`,
      });
    } catch (e) {
      console.error("Failed to delete secret", e);
    }
  };

  const logAccess = async (id: string) => {
    const secret = secrets.find(s => s.id === id);
    if (!secret || !currentUser) return;
    
    await addLog({
      action: 'ACCESSED',
      secretId: id,
      secretKey: secret.key,
      details: `Viewed decrypted value of ${secret.key}`,
    });
  };

  return {
    secrets,
    logs,
    currentRole: currentUser?.role || 'Viewer',
    currentUser,
    isLoaded,
    addSecret,
    updateSecret,
    rotateSecret,
    deleteSecret,
    logAccess,
  };
}
