import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2 } from 'lucide-react';
import { Secret, Environment, CredentialType } from '../types';

interface SecretModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  initialData?: Secret | null;
}

const SCHEMAS: Record<CredentialType, string[]> = {
  api_key: ['key'],
  token: ['token'],
  oauth: ['clientId', 'clientSecret', 'redirectUri'],
  username_password: ['username', 'password'],
  cloud_credentials: ['accessKeyId', 'secretAccessKey', 'region'],
  database: ['host', 'port', 'database', 'username', 'password'],
  ssh_key: ['publicKey', 'privateKey', 'passphrase'],
  webhook_secret: ['signingSecret', 'endpoint'],
  custom: []
};

const CREDENTIAL_TYPE_LABELS: Record<CredentialType, string> = {
  api_key: 'API Key',
  token: 'Access Token',
  oauth: 'OAuth Credential',
  username_password: 'Username / Password',
  cloud_credentials: 'Cloud Credential',
  database: 'Database Credential',
  ssh_key: 'SSH Key',
  webhook_secret: 'Webhook Secret',
  custom: 'Custom Credential'
};

export function SecretModal({ isOpen, onClose, onSave, initialData }: SecretModalProps) {
  const [key, setKey] = useState('');
  const [provider, setProvider] = useState('');
  const [type, setType] = useState<CredentialType>('api_key');
  const [fields, setFields] = useState<{key: string, value: string}[]>([{ key: 'key', value: '' }]);
  const [environment, setEnvironment] = useState<Environment>('Development');
  const [description, setDescription] = useState('');

  useEffect(() => {
    const clearSensitiveState = () => {
      setKey('');
      setProvider('');
      setFields([]);
      setDescription('');
    };

    window.addEventListener('vaultx:lock', clearSensitiveState);
    return () => window.removeEventListener('vaultx:lock', clearSensitiveState);
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setKey(initialData.key);
        setProvider(initialData.provider || '');
        setType(initialData.type || 'custom');
        setEnvironment(initialData.environment);
        setDescription(initialData.description || '');
        
        if (initialData.fields && Object.keys(initialData.fields).length > 0) {
          setFields(Object.entries(initialData.fields).map(([k, v]) => ({ key: k, value: v })));
        } else if (initialData.value) {
          setFields([{ key: 'value', value: initialData.value }]);
        } else {
          setFields([]);
        }
      } else {
        setKey('');
        setProvider('');
        setType('api_key');
        setEnvironment('Development');
        setDescription('');
        setFields([{ key: 'key', value: '' }]);
      }
    }
  }, [isOpen, initialData]);

  const handleTypeChange = (newType: CredentialType) => {
    setType(newType);
    const schemaFields = SCHEMAS[newType];
    
    // Only auto-populate if we are creating new or switching types, but don't lose data if editing.
    // For simplicity, we just reset fields when type changes.
    const newFieldArr = schemaFields.map(f => ({ key: f, value: '' }));
    setFields(newFieldArr.length > 0 ? newFieldArr : [{ key: 'customField', value: '' }]);
  };

  const addField = () => {
    setFields([...fields, { key: `field_${fields.length + 1}`, value: '' }]);
  };

  const updateField = (index: number, keyStr: string, valueStr: string) => {
    const newFields = [...fields];
    newFields[index] = { key: keyStr, value: valueStr };
    setFields(newFields);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fieldsRecord: Record<string, string> = {};
    fields.forEach(f => {
      if (f.key.trim()) fieldsRecord[f.key.trim()] = f.value;
    });

    onSave({ 
      key, 
      provider,
      type,
      fields: fieldsRecord, 
      environment, 
      description, 
      tags: [] 
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0F1115] border border-[#1F2937] rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-[#1F2937] shrink-0">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            {initialData ? 'Edit Credential' : 'Add Credential'}
          </h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} autoComplete="off" className="p-6 overflow-y-auto space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Credential Type</label>
              <select
                value={type}
                onChange={(e) => handleTypeChange(e.target.value as CredentialType)}
                className="w-full bg-[#0A0B0E] border border-[#374151] rounded px-3 py-2 text-[10px] text-white focus:outline-none focus:border-blue-500 focus:ring-0 transition-all"
              >
                {Object.entries(CREDENTIAL_TYPE_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>{label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Environment</label>
              <select
                value={environment}
                onChange={(e) => setEnvironment(e.target.value as Environment)}
                className="w-full bg-[#0A0B0E] border border-[#374151] rounded px-3 py-2 text-[10px] text-white focus:outline-none focus:border-blue-500 focus:ring-0 transition-all"
              >
                <option value="Development">Development</option>
                <option value="Staging">Staging</option>
                <option value="Production">Production</option>
                <option value="Global">Global</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Name / Identifier</label>
              <input
                required
                type="text"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="e.g. OPENROUTER_API_KEY"
                className="w-full bg-[#0A0B0E] border border-[#374151] rounded px-3 py-2 text-[10px] text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 focus:ring-0 transition-all font-mono"
              />
            </div>
            
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Provider (Optional)</label>
              <input
                type="text"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder="e.g. AWS, OpenRouter, UpCloud"
                className="w-full bg-[#0A0B0E] border border-[#374151] rounded px-3 py-2 text-[10px] text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 focus:ring-0 transition-all font-mono"
              />
            </div>
          </div>

          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-[10px] font-bold text-blue-500 uppercase tracking-widest">Secret Fields</label>
              <button
                type="button"
                onClick={addField}
                className="flex items-center gap-1 text-[9px] text-gray-400 hover:text-blue-400 uppercase font-bold transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add Field
              </button>
            </div>
            
            <div className="space-y-2 border border-[#1F2937] p-3 rounded-lg bg-[#0A0B0E]/50">
              {fields.map((field, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <input
                    type="text"
                    required
                    autoComplete="off"
                    value={field.key}
                    onChange={(e) => updateField(idx, e.target.value, field.value)}
                    placeholder="Field Name"
                    className="w-1/3 bg-[#0A0B0E] border border-[#374151] rounded px-3 py-1.5 text-[10px] text-gray-300 placeholder:text-gray-600 focus:outline-none focus:border-blue-500 focus:ring-0 transition-all font-mono"
                  />
                  <input
                    type="password"
                    required
                    name={`vaultx-secret-value-${idx}`}
                    autoComplete="new-password"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    spellCheck={false}
                    value={field.value}
                    onChange={(e) => updateField(idx, field.key, e.target.value)}
                    placeholder="Secret Value"
                    className="flex-1 bg-[#0A0B0E] border border-[#374151] rounded px-3 py-1.5 text-[10px] text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 focus:ring-0 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => removeField(idx)}
                    className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors shrink-0"
                    title="Remove Field"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {fields.length === 0 && (
                <div className="text-center text-[10px] text-gray-500 py-4 font-mono">
                  No fields defined. Add a field to store secret data.
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this credential used for?"
              rows={2}
              className="w-full bg-[#0A0B0E] border border-[#374151] rounded px-3 py-2 text-[10px] text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 focus:ring-0 transition-all resize-none"
            />
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
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-[10px] font-bold uppercase transition-colors"
            >
              <Save className="w-4 h-4" />
              {initialData ? 'Save Changes' : 'Create Credential'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
