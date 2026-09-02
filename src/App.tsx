import React, { useState, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { SecretsTable } from './components/SecretsTable';
import { AuditLogTable } from './components/AuditLogTable';
import { SecretModal } from './components/SecretModal';
import { RotateModal } from './components/RotateModal';
import { useSecretsManager } from './store';
import { Environment, Secret } from './types';
import { useAuth } from './contexts/AuthContext';
import { Auth } from './components/Auth';

export default function App() {
  const { currentUser, loading } = useAuth();
  const {
    secrets,
    logs,
    currentRole,
    isLoaded,
    addSecret,
    updateSecret,
    rotateSecret,
    deleteSecret,
    logAccess,
  } = useSecretsManager();

  const [currentTab, setCurrentTab] = useState<'secrets' | 'logs'>('secrets');
  const [environmentFilter, setEnvironmentFilter] = useState<Environment | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [isSecretModalOpen, setIsSecretModalOpen] = useState(false);
  const [editingSecret, setEditingSecret] = useState<Secret | null>(null);
  const [isRotateModalOpen, setIsRotateModalOpen] = useState(false);
  const [rotatingSecret, setRotatingSecret] = useState<Secret | null>(null);

  const filteredSecrets = useMemo(() => {
    return secrets.filter(secret => {
      if (environmentFilter !== 'All' && secret.environment !== environmentFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return secret.key.toLowerCase().includes(q) || 
               secret.description?.toLowerCase().includes(q) ||
               secret.tags?.some(t => t.toLowerCase().includes(q));
      }
      return true;
    });
  }, [secrets, environmentFilter, searchQuery]);

  const filteredLogs = useMemo(() => {
    if (!searchQuery) return logs;
    const q = searchQuery.toLowerCase();
    return logs.filter(log => 
      log.details.toLowerCase().includes(q) || 
      log.secretKey?.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q)
    );
  }, [logs, searchQuery]);

  const handleOpenNew = () => {
    setEditingSecret(null);
    setIsSecretModalOpen(true);
  };

  const handleOpenEdit = (secret: Secret) => {
    setEditingSecret(secret);
    setIsSecretModalOpen(true);
  };

  const handleSaveSecret = (data: any) => {
    if (editingSecret) {
      updateSecret(editingSecret.id, data);
    } else {
      addSecret(data);
    }
  };

  const handleOpenRotate = (secret: Secret) => {
    setRotatingSecret(secret);
    setIsRotateModalOpen(true);
  };

  const handleConfirmRotate = (id: string, newValue: string) => {
    rotateSecret(id, newValue);
  };

  if (loading) {
    return <div className="min-h-screen bg-[#0A0B0E] flex items-center justify-center text-gray-500 font-mono text-xs uppercase tracking-widest">Initializing Secure Connection...</div>;
  }

  if (!currentUser) {
    return <Auth />;
  }

  if (!isLoaded) {
    return <div className="min-h-screen bg-[#0A0B0E] flex items-center justify-center text-gray-500 font-mono text-xs uppercase tracking-widest">Loading VaultX Data...</div>;
  }

  return (
    <div className="flex h-screen bg-[#0A0B0E] overflow-hidden font-sans">
      <Sidebar 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab} 
        environmentFilter={environmentFilter}
        setEnvironmentFilter={setEnvironmentFilter}
      />
      
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Topbar 
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          currentRole={currentRole as Role}
          onNewSecret={handleOpenNew}
          currentTab={currentTab}
        />
        
        <main className="flex-1 overflow-y-auto p-6 bg-transparent">
          <div className="max-w-6xl mx-auto space-y-6">
            <div>
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                {currentTab === 'secrets' ? 'Secrets Vault' : 'Audit Logs'}
              </h2>
              <p className="text-[10px] text-gray-400 mt-1">
                {currentTab === 'secrets' 
                  ? 'Manage your environment variables and API keys.' 
                  : 'Track access, rotations, and modifications across the system.'}
              </p>
            </div>

            {currentTab === 'secrets' ? (
              <SecretsTable 
                secrets={filteredSecrets} 
                currentRole={currentRole as Role}
                onEdit={handleOpenEdit}
                onRotate={handleOpenRotate}
                onDelete={(s) => {
                  if (confirm(`Are you sure you want to delete ${s.key}?`)) {
                    deleteSecret(s.id);
                  }
                }}
                onLogAccess={logAccess}
              />
            ) : (
              <AuditLogTable logs={filteredLogs} />
            )}
          </div>
        </main>
      </div>

      <SecretModal 
        isOpen={isSecretModalOpen} 
        onClose={() => setIsSecretModalOpen(false)} 
        onSave={handleSaveSecret}
        initialData={editingSecret}
      />

      <RotateModal 
        isOpen={isRotateModalOpen}
        onClose={() => setIsRotateModalOpen(false)}
        onConfirm={handleConfirmRotate}
        secret={rotatingSecret}
      />
    </div>
  );
}
