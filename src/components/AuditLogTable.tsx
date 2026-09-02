import React from 'react';
import { AuditLog } from '../types';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { ShieldAlert, Plus, Edit2, RotateCcw, Trash2, Eye, UserCircle, Settings } from 'lucide-react';

interface AuditLogTableProps {
  logs: AuditLog[];
}

export function AuditLogTable({ logs }: AuditLogTableProps) {
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATED': return <Plus className="w-4 h-4 text-emerald-400" />;
      case 'UPDATED': return <Edit2 className="w-4 h-4 text-indigo-400" />;
      case 'ROTATED': return <RotateCcw className="w-4 h-4 text-amber-400" />;
      case 'DELETED': return <Trash2 className="w-4 h-4 text-rose-400" />;
      case 'ACCESSED': return <Eye className="w-4 h-4 text-cyan-400" />;
      case 'ROLE_CHANGED': return <UserCircle className="w-4 h-4 text-purple-400" />;
      case 'SYSTEM_INIT': return <Settings className="w-4 h-4 text-gray-400" />;
      default: return <ShieldAlert className="w-4 h-4 text-gray-400" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATED': return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'UPDATED': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      case 'ROTATED': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      case 'DELETED': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'ACCESSED': return 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20';
      case 'ROLE_CHANGED': return 'text-purple-500 bg-purple-500/10 border-purple-500/20';
      default: return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
    }
  };

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <p>No audit logs available.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#0F1115] border border-[#1F2937] rounded-xl overflow-hidden">
      <table className="w-full text-left whitespace-nowrap">
        <thead className="bg-[#0A0B0E] text-[10px] font-bold text-gray-500 uppercase sticky top-0">
          <tr>
            <th className="px-4 py-3 border-b border-[#1F2937]">Timestamp</th>
            <th className="px-4 py-3 border-b border-[#1F2937]">Action</th>
            <th className="px-4 py-3 border-b border-[#1F2937]">User Role</th>
            <th className="px-4 py-3 border-b border-[#1F2937]">Target Key</th>
            <th className="px-4 py-3 border-b border-[#1F2937] w-full">Details</th>
          </tr>
        </thead>
        <tbody className="text-xs font-medium">
          {logs.map(log => (
            <tr key={log.id} className="border-b border-[#1F2937] hover:bg-blue-500/5 transition-colors cursor-default">
              <td className="px-4 py-3 text-gray-500 text-[10px] font-mono">
                {format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss')}
              </td>
              <td className="px-4 py-3">
                <div className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider", getActionColor(log.action))}>
                  {getActionIcon(log.action)}
                  {log.action}
                </div>
              </td>
              <td className="px-4 py-3">
                <span className="text-white font-medium text-[10px]">{log.userRole}</span>
              </td>
              <td className="px-4 py-3 font-mono text-[10px] text-gray-400">
                {log.secretKey || '-'}
              </td>
              <td className="px-4 py-3 text-gray-400 text-[10px] truncate max-w-[400px]">
                {log.details}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
