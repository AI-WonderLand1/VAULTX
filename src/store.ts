import { useState, useEffect, useCallback } from 'react';
import { Secret, AuditLog } from './types';
import { useAuth } from './contexts/AuthContext';
import { vaultxApi } from './lib/vaultxApi';

export function useSecretsManager() {
  const { currentUser } = useAuth();
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const fetchSecrets = useCallback(async () => {
    if (!currentUser) return;
    const data = await vaultxApi<Secret[]>('/api/secrets');
    setSecrets(data);
  }, [currentUser]);

  const fetchLogs = useCallback(async () => {
    if (!currentUser) return;
    const data = await vaultxApi<AuditLog[]>('/api/audit-logs');
    setLogs(data);
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) {
      setSecrets([]);
      setLogs([]);
      setIsLoaded(true);
      return;
    }

    let active = true;

    Promise.all([fetchSecrets(), fetchLogs()])
      .catch((error) => {
        console.error('Failed to load VAULTX data:', error);
      })
      .finally(() => {
        if (active) setIsLoaded(true);
      });

    return () => {
      active = false;
    };
  }, [currentUser, fetchSecrets, fetchLogs]);

  const refresh = async () => {
    await Promise.all([fetchSecrets(), fetchLogs()]);
  };

  const addSecret = async (
    secretData: Omit<Secret, 'id' | 'createdAt' | 'lastRotatedAt'>,
  ) => {
    if (!currentUser) return;

    await vaultxApi('/api/secrets', {
      method: 'POST',
      body: JSON.stringify({
        key: secretData.key,
        provider: secretData.provider,
        type: secretData.type,
        environment: secretData.environment,
        description: secretData.description,
        tags: secretData.tags || [],
        fields: secretData.fields || {},
      }),
    });

    await refresh();
  };

  const updateSecret = async (id: string, updates: Partial<Secret>) => {
    if (!currentUser) return;

    await vaultxApi(`/api/secrets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        key: updates.key,
        provider: updates.provider,
        type: updates.type,
        environment: updates.environment,
        description: updates.description,
        tags: updates.tags,
        fields: updates.fields,
      }),
    });

    await refresh();
  };

  const rotateSecret = async (
    id: string,
    newFields: Record<string, string>,
  ) => {
    if (!currentUser) return;

    await vaultxApi(`/api/secrets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        fields: newFields,
        rotate: true,
      }),
    });

    await refresh();
  };

  const requestDeleteApproval = async (id: string, password: string) => {
    if (!currentUser) throw new Error('You must be signed in.');

    return vaultxApi<{ token: string; expiresInSeconds: number }>(
      '/api/auth/step-up/delete',
      {
        method: 'POST',
        body: JSON.stringify({ secretId: id, password }),
      },
    );
  };

  const deleteSecret = async (id: string, stepUpToken: string) => {
    if (!currentUser) return;

    await vaultxApi(`/api/secrets/${id}`, {
      method: 'DELETE',
      headers: {
        'X-VAULTX-Step-Up': stepUpToken,
      },
    });

    await refresh();
  };

  const revealSecret = async (id: string) => {
    if (!currentUser) throw new Error('You must be signed in.');

    const data = await vaultxApi<{ fields: Record<string, string> }>(
      `/api/secrets/${id}/reveal`,
    );

    await fetchLogs();
    return data.fields;
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
    requestDeleteApproval,
    deleteSecret,
    revealSecret,
  };
}
