import React from 'react';
import { Search, UserCircle, Plus, LogOut } from 'lucide-react';
import { Role } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface TopbarProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  currentRole: Role;
  onNewSecret: () => void;
  currentTab: 'secrets' | 'logs';
}

export function Topbar({ searchQuery, setSearchQuery, currentRole, onNewSecret, currentTab }: TopbarProps) {
  const { currentUser, logout } = useAuth();

  return (
    <div className="h-14 border-b border-[#1F2937] bg-[#0F1115] flex flex-shrink-0 items-center justify-between px-6 sticky top-0 z-10 shrink-0">
      <div className="flex-1 max-w-md relative">
        <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search secrets or keys..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[#0A0B0E] border border-[#374151] rounded py-1.5 pl-9 pr-4 text-[10px] text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500 focus:ring-0 transition-all"
        />
      </div>

      <div className="flex items-center gap-6">
        {currentTab === 'secrets' && currentRole !== 'Viewer' && (
          <button
            onClick={onNewSecret}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-[10px] font-bold uppercase transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Secret
          </button>
        )}
        
        <div className="h-6 w-px bg-[#374151]"></div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-[9px] text-gray-500 uppercase tracking-widest leading-none mb-1">
              {currentUser?.email}
            </span>
            <div className="flex items-center gap-2">
              <span className="bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase">
                {currentRole}
              </span>
            </div>
          </div>
          
          <button 
            onClick={logout}
            className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
