import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  Copy,
  RotateCcw,
  Edit2,
  Trash2,
  ShieldAlert,
  Check,
  Loader2,
} from 'lucide-react';
import { Secret, Role } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../lib/utils';

interface SecretsTableProps {
  secrets: Secret[];
  currentRole: Role;
  onEdit: (secret: Secret) => void | Promise<void>;
  onRotate: (secret: Secret) => void;
  onDelete: (secret: Secret) => void;
  onReveal: (id: string) => Promise<Record<string, string>>;
}

export function SecretsTable({
  secrets,
  currentRole,
  onEdit,
  onRotate,
  onDelete,
  onReveal,
}: SecretsTableProps) {
  const [revealedFields, setRevealedFields] = useState<Record<string, Record<string, string>>>({});
  const [revealLoading, setRevealLoading] = useState<Set<string>>(new Set());
  const [revealError, setRevealError] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string | null>(null);

  const toggleReveal = async (id: string) => {
    if (currentRole === 'Viewer') return;

    if (revealedFields[id]) {
      setRevealedFields((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      setRevealError((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      return;
    }

    setRevealLoading((current) => new Set(current).add(id));
    setRevealError((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });

    try {
      const fields = await onReveal(id);
      setRevealedFields((current) => ({ ...current, [id]: fields }));
    } catch (error) {
      setRevealError((current) => ({
        ...current,
        [id]: error instanceof Error ? error.message : 'Failed to reveal secret.',
      }));
    } finally {
      setRevealLoading((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const canEdit = (env: string) => {
    if (currentRole === 'Admin') return true;
    return (
      currentRole === 'Developer' &&
      (env === 'Development' || env === 'Staging' || env === 'Global')
    );
  };

  const EnvBadge = ({ env }: { env: string }) => {
    const colors: Record<string, string> = {
      Global: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      Development: 'bg-green-500/10 text-green-500 border-green-500/20',
      Staging: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
      Production: 'bg-red-500/10 text-red-500 border-red-500/20',
    };

    return (
      <span
        className={cn(
          'px-2 py-0.5 rounded text-[9px] font-medium border uppercase tracking-wider',
          colors[env] || 'bg-[#1F2937] text-gray-400',
        )}
      >
        {env}
      </span>
    );
  };

  if (secrets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <ShieldAlert className="w-12 h-12 mb-4 text-gray-700" />
        <p>No secrets found matching the criteria.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#0F1115] border border-[#1F2937] rounded-xl overflow-hidden">
      <table className="w-full text-left whitespace-nowrap">
        <thead className="bg-[#0A0B0E] text-[10px] font-bold text-gray-500 uppercase sticky top-0">
          <tr>
            <th className="px-4 py-3 border-b border-[#1F2937]">Credential Name</th>
            <th className="px-4 py-3 border-b border-[#1F2937]">Type / Provider</th>
            <th className="px-4 py-3 border-b border-[#1F2937]">Environment</th>
            <th className="px-4 py-3 border-b border-[#1F2937]">Stored Fields</th>
            <th className="px-4 py-3 border-b border-[#1F2937]">Last Rotated</th>
            <th className="px-4 py-3 border-b border-[#1F2937] text-right">Actions</th>
          </tr>
        </thead>

        <tbody className="text-xs font-medium">
          {secrets.map((secret) => {
            const fields = revealedFields[secret.id];
            const isRevealed = !!fields;
            const isLoading = revealLoading.has(secret.id);
            const editable = canEdit(secret.environment);
            const entries = fields ? Object.entries(fields) : [];
            const jsonString = fields ? JSON.stringify(fields, null, 2) : '';
            const fieldCount =
              secret.fieldCount ?? secret.fieldNames?.length ?? entries.length;

            return (
              <tr
                key={secret.id}
                className="border-b border-[#1F2937] hover:bg-blue-500/5 transition-colors group cursor-default align-top"
              >
                <td className="px-4 py-4">
                  <div className="font-mono text-white">{secret.key}</div>
                  <div className="text-[10px] text-gray-500 truncate max-w-[200px] mt-1">
                    {secret.description}
                  </div>
                </td>

                <td className="px-4 py-4">
                  <div className="text-[10px] text-gray-300 capitalize">
                    {secret.type?.replace('_', ' ') || 'Custom'}
                  </div>
                  {secret.provider && (
                    <div className="text-[9px] text-gray-500 uppercase tracking-widest mt-1">
                      {secret.provider}
                    </div>
                  )}
                </td>

                <td className="px-4 py-4">
                  <EnvBadge env={secret.environment} />
                </td>

                <td className="px-4 py-4 max-w-[340px]">
                  <div className="flex flex-col gap-2">
                    <div
                      className={cn(
                        'font-mono text-[10px] bg-[#0A0B0E] p-2 rounded border border-[#1F2937]',
                        isRevealed ? 'text-gray-300' : 'text-gray-500 select-none',
                      )}
                    >
                      {isRevealed ? (
                        <div className="flex flex-col gap-1 whitespace-pre-wrap break-all">
                          {entries.map(([name, value]) => (
                            <div key={name}>
                              <span className="text-blue-400">{name}:</span>{' '}
                              {value}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div>{fieldCount} field(s) stored ••••••••••••••••••••••••</div>
                      )}
                    </div>

                    {revealError[secret.id] && (
                      <div className="text-[9px] text-red-400 whitespace-normal">
                        {revealError[secret.id]}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => void toggleReveal(secret.id)}
                        disabled={currentRole === 'Viewer' || isLoading}
                        className="text-gray-500 hover:text-gray-300 disabled:opacity-50 p-1 bg-[#1F2937]/50 rounded"
                        title={
                          currentRole === 'Viewer'
                            ? 'Viewers cannot reveal values'
                            : isRevealed
                              ? 'Hide value'
                              : 'Reveal value'
                        }
                      >
                        {isLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : isRevealed ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>

                      {isRevealed && (
                        <button
                          onClick={() => void copyToClipboard(jsonString, secret.id)}
                          className="text-gray-500 hover:text-gray-300 p-1 bg-[#1F2937]/50 rounded"
                          title="Copy all to clipboard (JSON)"
                        >
                          {copied === secret.id ? (
                            <Check className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </td>

                <td className="px-4 py-4 text-gray-400 text-[10px]">
                  {formatDistanceToNow(new Date(secret.lastRotatedAt), {
                    addSuffix: true,
                  })}
                </td>

                <td className="px-4 py-4 text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => void onEdit(secret)}
                      disabled={!editable}
                      className="p-1 text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 rounded disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                      title="Edit secret"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onRotate(secret)}
                      disabled={!editable}
                      className="p-1 text-gray-500 hover:text-orange-400 hover:bg-orange-500/10 rounded disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                      title="Rotate secret"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDelete(secret)}
                      disabled={!editable}
                      className="p-1 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                      title={
                        editable
                          ? 'Delete secret'
                          : 'You do not have permission to delete this secret'
                      }
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
