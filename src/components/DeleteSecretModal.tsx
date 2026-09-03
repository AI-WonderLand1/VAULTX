import React, { useEffect, useState } from 'react';
import { AlertTriangle, ShieldCheck, Trash2, X } from 'lucide-react';
import { Secret } from '../types';

interface DeleteSecretModalProps {
  secret: Secret | null;
  email?: string;
  onClose: () => void;
  onConfirm: (password: string) => Promise<void>;
}

export function DeleteSecretModal({
  secret,
  email,
  onClose,
  onConfirm,
}: DeleteSecretModalProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const clearSensitiveState = () => {
      setPassword('');
      setError('');
      setLoading(false);
    };

    window.addEventListener('vaultx:lock', clearSensitiveState);
    return () => window.removeEventListener('vaultx:lock', clearSensitiveState);
  }, []);

  useEffect(() => {
    setPassword('');
    setError('');
    setLoading(false);
  }, [secret]);

  if (!secret) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!password) return;

    setLoading(true);
    setError('');

    try {
      await onConfirm(password);
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#0F1115] border border-red-500/30 rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-[#1F2937]">
          <div className="flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-red-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Delete Secret
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-1 text-gray-500 hover:text-white disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="text-[10px] text-red-100 leading-relaxed">
              You are permanently deleting{' '}
              <strong className="font-mono text-white">{secret.key}</strong>.
              Re-enter your current VAULTX account password to continue.
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
              Account
            </label>
            <div className="text-[10px] text-gray-300 font-mono bg-[#0A0B0E] border border-[#1F2937] rounded px-3 py-2">
              {email || 'Current VAULTX account'}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
              Current Password
            </label>
            <input
              autoFocus
              required
              type="password"
              name="vaultx-delete-current-password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full bg-[#0A0B0E] border border-[#374151] rounded px-3 py-2 text-[10px] text-white font-mono focus:outline-none focus:border-red-500"
              placeholder="Enter current account password"
            />
          </div>

          {error && (
            <div className="text-[10px] text-red-400 font-mono border border-red-500/20 bg-red-500/5 rounded p-2">
              {error}
            </div>
          )}

          <div className="flex items-center gap-2 text-[9px] text-gray-500">
            <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
            Approval is valid for this secret only and expires after 2 minutes.
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3 py-1.5 rounded text-[10px] font-bold uppercase text-gray-400 hover:text-white disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !password}
              className="px-3 py-1.5 rounded text-[10px] font-bold uppercase bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 flex items-center gap-2"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {loading ? 'Verifying...' : 'Verify & Delete'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
