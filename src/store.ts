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
        environment: secretData.environment,
        description: secretData.description,
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
        environment: updates.environment,
        description: updates.description,
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

  const deleteSecret = async (id: string) => {
    if (!currentUser) return;

    await vaultxApi(`/api/secrets/${id}`, {
      method: 'DELETE',
    });

    await refresh();
  };

  const logAccess = async (id: string) => {
    if (!currentUser) return;

    await vaultxApi(`/api/secrets/${id}/access`, {
      method: 'POST',
    });

    await fetchLogs();
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
