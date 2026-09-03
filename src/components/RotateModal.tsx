import React, { useState, useEffect } from 'react';
import { X, RotateCcw, AlertTriangle } from 'lucide-react';
import { Secret } from '../types';

interface RotateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (id: string, newFields: Record<string, string>) => void;
  secret: Secret | null;
}

export function RotateModal({ isOpen, onClose, onConfirm, secret }: RotateModalProps) {
  const [fields, setFields] = useState<{key: string, value: string}[]>([]);

  useEffect(() => {
    const clearSensitiveState = () => setFields([]);

    window.addEventListener('vaultx:lock', clearSensitiveState);
    return () => window.removeEventListener('vaultx:lock', clearSensitiveState);
  }, []);

  useEffect(() => {
    if (isOpen && secret) {
      if (secret.fieldNames && secret.fieldNames.length > 0) {
        setFields(secret.fieldNames.map((key) => ({ key, value: '' })));
      } else if (secret.fields && Object.keys(secret.fields).length > 0) {
        setFields(Object.keys(secret.fields).map((key) => ({ key, value: '' })));
      } else {
        setFields([{ key: 'key', value: '' }]);
      }
    }
  }, [isOpen, secret]);

  if (!isOpen || !secret) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fieldsRecord: Record<string, string> = {};
    fields.forEach(f => {
      if (f.key.trim()) fieldsRecord[f.key.trim()] = f.value;
    });
    onConfirm(secret.id, fieldsRecord);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0F1115] border border-[#1F2937] rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-[#1F2937]">
          <h3 className="text-xs font-bold text-white flex items-center gap-2 uppercase tracking-wider">
            <RotateCcw className="w-4 h-4 text-orange-500" />
            Rotate Credential
          </h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} autoComplete="off" className="p-6 space-y-4">
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 flex gap-3 text-[10px] text-orange-200">
            <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" />
            <p>You are about to rotate the credentials for <strong className="font-mono text-white">{secret.key}</strong> in <strong>{secret.environment}</strong>. This action will be logged.</p>
          </div>

          <div className="space-y-3">
            {fields.map((field, idx) => (
              <div key={idx}>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">New {field.key}</label>
                <input
                  required
                  type="password"
                  name={`vaultx-rotate-value-${idx}`}
                  autoComplete="new-password"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  spellCheck={false}
                  value={field.value}
                  onChange={(e) => {
                    const newFields = [...fields];
                    newFields[idx].value = e.target.value;
                    setFields(newFields);
                  }}
                  placeholder={`Enter new ${field.key}...`}
                  className="w-full bg-[#0A0B0E] border border-[#374151] rounded px-3 py-2 text-[10px] text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 focus:ring-0 transition-all font-mono"
                />
              </div>
            ))}
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-[#1F2937]">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded text-[10px] font-bold text-gray-400 hover:text-white hover:bg-[#1F2937] transition-colors uppercase"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded text-[10px] font-bold uppercase transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Confirm Rotation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
