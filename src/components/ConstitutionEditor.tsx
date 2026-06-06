import React, { useState, useEffect } from 'react';
import { BookOpen, Check, Save, RefreshCw } from 'lucide-react';
import { useStore } from '@/lib/store';

export const ConstitutionEditor: React.FC = () => {
  const storeRules = useStore((state) => state.rulesText);
  const version = useStore((state) => state.rulesVersion);
  const updateConstitution = useStore((state) => state.updateConstitution);
  const [localRules, setLocalRules] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync state with store loaded value
  useEffect(() => {
    setLocalRules(storeRules);
  }, [storeRules]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    const success = await updateConstitution(localRules);
    setIsSaving(false);
    if (success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }
  };

  return (
    <div className="glass-panel rounded-xl p-4 flex flex-col h-[280px] border border-zinc-800">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-emerald-500" />
          <h2 className="font-semibold text-sm text-zinc-200">Design Constitution</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-700">
            v{version || 1}
          </span>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs px-2.5 py-1 rounded transition disabled:opacity-50"
          >
            {isSaving ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : saveSuccess ? (
              <Check className="w-3 h-3 text-white" />
            ) : (
              <Save className="w-3 h-3" />
            )}
            <span>{saveSuccess ? 'Saved' : 'Update'}</span>
          </button>
        </div>
      </div>
      <div className="flex-1 flex flex-col">
        <textarea
          value={localRules}
          onChange={(e) => setLocalRules(e.target.value)}
          className="w-full flex-1 bg-zinc-950/80 border border-zinc-800 rounded p-2 text-xs font-mono text-zinc-300 focus:outline-none focus:border-zinc-700 resize-none"
          placeholder="# Design Constitution Rules..."
        />
        <div className="text-[9px] text-zinc-500 mt-1.5">
          * Markdown format. Agents read these rules at every stage of generation and critique.
        </div>
      </div>
    </div>
  );
};
export default ConstitutionEditor;
