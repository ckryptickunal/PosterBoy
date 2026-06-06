import React, { useEffect, useRef } from 'react';
import { Terminal, Cpu, CheckCircle, AlertTriangle } from 'lucide-react';
import { useStore } from '@/lib/store';

export const Telemetry: React.FC = () => {
  const logs = useStore((state) => state.activeJob.logs);
  const status = useStore((state) => state.activeJob.status);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll telemetry logs to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getStatusIcon = () => {
    switch (status) {
      case 'idle':
        return <CheckCircle className="w-4 h-4 text-zinc-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-emerald-500 animate-pulse" />;
      case 'failed':
        return <AlertTriangle className="w-4 h-4 text-rose-500" />;
      default:
        return <Cpu className="w-4 h-4 text-blue-500 animate-spin" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'idle': return 'System Idle';
      case 'analyzing': return 'Agent 1: Vision Segmenting...';
      case 'designing': return 'Agent 2: Creative Strategy...';
      case 'copywriting': return 'Agent 3: Copywriting...';
      case 'typography': return 'Agent 4: Typography Pairing...';
      case 'arranging': return 'Agent 5: Coordinates Planning...';
      case 'rendering': return 'Rendering Canvas...';
      case 'critiquing': return 'Agent 6: Visual Critique & Repair Loop...';
      case 'completed': return 'Design Completed!';
      case 'failed': return 'Pipeline Failed';
      default: return 'Processing...';
    }
  };

  return (
    <div className="glass-panel rounded-xl p-4 flex flex-col h-[280px] overflow-hidden border border-zinc-800">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-blue-500" />
          <h2 className="font-semibold text-sm text-zinc-200">Agent Telemetry & Logs</h2>
        </div>
        <div className="flex items-center gap-1.5 bg-zinc-900 px-2 py-0.5 rounded text-xs text-zinc-400 border border-zinc-800">
          {getStatusIcon()}
          <span>{getStatusText()}</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto font-mono text-[11px] leading-relaxed text-zinc-400 space-y-2 pr-1">
        {logs.length === 0 ? (
          <div className="text-zinc-600 italic">No job logs recorded. Upload an image to start the design loop.</div>
        ) : (
          logs.map((log, index) => {
            const isError = log.includes('[ERROR') || log.includes('failed');
            const isCritique = log.includes('[CRITIQUE');
            const isOverride = log.includes('[HUMAN');
            let color = 'text-zinc-400';
            if (isError) color = 'text-rose-400 font-semibold';
            else if (isCritique) color = 'text-amber-400';
            else if (isOverride) color = 'text-sky-400';
            else if (log.includes('Complete') || log.includes('success')) color = 'text-emerald-400';

            return (
              <div key={index} className={`${color} border-l border-zinc-800 pl-2`}>
                {log}
              </div>
            );
          })
        )}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
};
export default Telemetry;
