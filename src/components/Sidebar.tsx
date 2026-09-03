import React from 'react';
import { Shield, Key, FileText, Database, ShieldAlert, Cloud, Search, Command, Lock } from 'lucide-react';
import { cn } from '../lib/utils';
import { Environment } from '../types';

interface SidebarProps {
  currentTab: 'secrets' | 'logs';
  setCurrentTab: (tab: 'secrets' | 'logs') => void;
  environmentFilter: Environment | 'All';
  setEnvironmentFilter: (env: Environment | 'All') => void;
}

const ENVIRONMENTS: { name: Environment | 'All'; icon: React.FC<any>; color: string }[] = [
  { name: 'All', icon: Database, color: 'text-gray-400' },
  { name: 'Global', icon: Cloud, color: 'text-blue-400' },
  { name: 'Development', icon: Command, color: 'text-green-500' },
  { name: 'Staging', icon: Search, color: 'text-orange-500' },
  { name: 'Production', icon: ShieldAlert, color: 'text-red-500' },
];

export function Sidebar({ currentTab, setCurrentTab, environmentFilter, setEnvironmentFilter }: SidebarProps) {
  return (
    <div className="w-56 border-r border-[#1F2937] bg-[#0A0B0E] flex flex-col h-screen overflow-y-auto shrink-0">
      <div className="p-4 flex items-center gap-3 border-b border-[#1F2937] shrink-0">
        <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center">
          <Shield className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-sm tracking-tight text-white uppercase">VaultX</h1>
          <p className="text-[9px] text-blue-500 font-bold uppercase tracking-wider">Secrets Manager</p>
        </div>
      </div>

      <div className="p-4 flex-1 space-y-6">
        <div>
          <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 px-2">Navigation</h2>
          <div className="space-y-1">
            <button
              onClick={() => setCurrentTab('secrets')}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-colors",
                currentTab === 'secrets' ? "bg-blue-600/10 text-blue-400 border border-blue-600/20" : "hover:bg-[#1F2937] text-gray-400 transition-colors border border-transparent"
              )}
            >
              <Key className="w-4 h-4" />
              Secrets Vault
            </button>
            <button
              onClick={() => setCurrentTab('logs')}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-colors",
                currentTab === 'logs' ? "bg-blue-600/10 text-blue-400 border border-blue-600/20" : "hover:bg-[#1F2937] text-gray-400 transition-colors border border-transparent"
              )}
            >
              <FileText className="w-4 h-4" />
              Audit Logs
            </button>
          </div>
        </div>

        {currentTab === 'secrets' && (
          <div>
            <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 px-2">Environments</h2>
            <div className="space-y-1">
              {ENVIRONMENTS.map((env) => {
                const Icon = env.icon;
                return (
                  <button
                    key={env.name}
                    onClick={() => setEnvironmentFilter(env.name)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-colors",
                      environmentFilter === env.name ? "bg-[#1F2937] text-white border border-[#374151]" : "hover:bg-[#1F2937] text-gray-400 transition-colors border border-transparent"
                    )}
                  >
                    <Icon className={cn("w-4 h-4", env.color)} />
                    {env.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
      
      <div className="p-4">
        <div className="bg-[#0F1115] border border-[#1F2937] rounded-lg p-3 text-[10px] text-gray-400">
          <p className="font-bold text-gray-300 mb-1 flex items-center gap-2 uppercase tracking-wider text-[9px]"><Lock className="w-3 h-3 text-blue-500" /> Server-Side Encrypted</p>
          <p className="leading-relaxed text-gray-500">Secret values are encrypted at rest by the VAULTX server with AES-256-GCM.</p>
        </div>
      </div>
    </div>
  );
}
