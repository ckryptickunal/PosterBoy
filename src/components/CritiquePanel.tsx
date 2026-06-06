import React from 'react';
import { Eye, ShieldCheck, AlertCircle, Play, RefreshCw, Hammer } from 'lucide-react';
import { useStore } from '@/lib/store';

interface CritiquePanelProps {
  onTriggerCritique: () => void;
  isProcessing: boolean;
}

export const CritiquePanel: React.FC<CritiquePanelProps> = ({ onTriggerCritique, isProcessing }) => {
  const activeJob = useStore((state) => state.activeJob);
  const critiqueLogs = activeJob.critiqueLogs;
  const currentScore = activeJob.score;

  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-zinc-600 border-zinc-800 bg-zinc-900';
    if (score < 60) return 'text-rose-500 border-rose-900/30 bg-rose-950/10';
    if (score < 90) return 'text-amber-500 border-amber-900/30 bg-amber-950/10';
    return 'text-emerald-500 border-emerald-950/30 bg-emerald-950/10';
  };

  // Find latest log
  const latestCritique = critiqueLogs[critiqueLogs.length - 1];

  return (
    <div className="glass-panel rounded-xl p-4 flex flex-col h-full border border-zinc-800">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-amber-500" />
          <h2 className="font-semibold text-sm text-zinc-200">Critique & Repair Engine</h2>
        </div>
        
        {activeJob.id && activeJob.status !== 'failed' && (
          <button
            onClick={onTriggerCritique}
            disabled={isProcessing || activeJob.status === 'critiquing'}
            className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white font-medium text-xs px-2.5 py-1 rounded border border-zinc-700 transition disabled:opacity-50"
          >
            {isProcessing || activeJob.status === 'critiquing' ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>Evaluate Screenshot</span>
          </button>
        )}
      </div>

      {activeJob.id === null ? (
        <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 text-center p-4">
          <ShieldCheck className="w-10 h-10 mb-2 stroke-1" />
          <p className="text-xs italic">Awaiting design generation to run critique checks.</p>
        </div>
      ) : (
        <div className="flex-grow flex flex-col md:flex-row gap-4 overflow-y-auto pr-1">
          {/* Left Column: Score gauge */}
          <div className="flex flex-col items-center justify-center md:w-1/3 border-b md:border-b-0 md:border-r border-zinc-800 pb-4 md:pb-0 md:pr-4">
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-2">Design Rating</span>
            <div className={`w-24 h-24 rounded-full border-4 flex flex-col items-center justify-center ${getScoreColor(currentScore)}`}>
              <span className="text-3xl font-black">{currentScore !== null ? currentScore : '--'}</span>
              <span className="text-[9px] uppercase font-semibold text-zinc-400">/ 100</span>
            </div>
            
            <div className="mt-3 text-center">
              <span className="text-[10px] text-zinc-400 font-semibold block">
                Iteration: {activeJob.currentIteration} / 3
              </span>
              <span className="text-[9px] text-zinc-500">
                {currentScore !== null && currentScore >= 90 ? 'Publishable Standard' : 'Requires Adjustment'}
              </span>
            </div>
          </div>

          {/* Right Column: Issues and Loop History */}
          <div className="flex-1 flex flex-col overflow-y-auto space-y-4 max-h-[200px] md:max-h-none">
            {/* Issues */}
            <div>
              <h3 className="text-xs font-bold text-zinc-400 mb-2 uppercase tracking-wide">Detected Issues</h3>
              {latestCritique && latestCritique.issues.length > 0 ? (
                <div className="space-y-1.5">
                  {latestCritique.issues.map((iss, index) => (
                    <div key={index} className="flex gap-2 text-xs text-zinc-300 bg-zinc-950/40 p-2 rounded border border-zinc-900">
                      <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <span>{iss}</span>
                    </div>
                  ))}
                </div>
              ) : currentScore !== null && currentScore >= 90 ? (
                <div className="flex gap-2 text-xs text-emerald-400 bg-emerald-950/10 p-2 rounded border border-emerald-950/20">
                  <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Design matches all Design Constitution constraints successfully!</span>
                </div>
              ) : (
                <div className="text-xs italic text-zinc-500">No issues detected yet. Run screenshot evaluation.</div>
              )}
            </div>

            {/* Loop History */}
            {critiqueLogs.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-zinc-400 mb-2 uppercase tracking-wide">Correction Steps</h3>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {critiqueLogs.map((log) => (
                    <div
                      key={log.iteration}
                      className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border ${
                        log.score >= 90 
                          ? 'bg-emerald-950/10 border-emerald-900/30 text-emerald-400' 
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                      }`}
                    >
                      <Hammer className="w-3 h-3" />
                      <span>Loop #{log.iteration}: <strong>{log.score}</strong></span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default CritiquePanel;
