'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '@/lib/store';
import {
  logEntry, staggerContainer, duration, easing,
  breathingGlow, springPreset, fadeIn,
} from '@/lib/motion';

export const Telemetry: React.FC = () => {
  const logs = useStore((s) => s.activeJob.logs);
  const status = useStore((s) => s.activeJob.status);
  const evolution = useStore((s) => s.activeJob.evolution);
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const displayLogs = expanded ? logs : logs.slice(-5);

  // Auto-scroll on new logs
  useEffect(() => {
    if (containerRef.current && expanded) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs, expanded]);

  const isActive = !['idle', 'completed', 'failed'].includes(status);

  return (
    <motion.div
      className="py-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.15, duration: duration.normal, ease: easing.out }}
    >
      {/* Header — editorial section title */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-display text-base" style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
          Process
        </h3>

        {/* Live status — animated indicator */}
        <AnimatePresence mode="wait">
          {isActive && (
            <motion.div
              className="flex items-center gap-2"
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 6 }}
              transition={{ duration: duration.micro, ease: easing.out }}
            >
              {/* Breathing dot with ring pulse */}
              <div className="relative">
                <motion.div
                  className="w-2 h-2 rounded-full"
                  style={{ background: 'var(--accent)' }}
                  animate={{ opacity: [0.5, 1, 0.5], scale: [0.9, 1.1, 0.9] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{ border: '1px solid var(--accent)' }}
                  animate={{ scale: [1, 2, 1], opacity: [0.4, 0, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />
              </div>
              <span className="text-xs" style={{ color: 'var(--accent)' }}>
                Working
              </span>
            </motion.div>
          )}
          {status === 'completed' && (
            <motion.div
              className="flex items-center gap-1.5"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={springPreset.snappy}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--status-success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20,6 9,17 4,12"/>
              </svg>
              <span className="text-xs" style={{ color: 'var(--status-success)' }}>
                Complete
              </span>
            </motion.div>
          )}
          {status === 'failed' && (
            <motion.div
              className="flex items-center gap-1.5"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={springPreset.snappy}
            >
              <span className="text-xs" style={{ color: 'var(--status-error)' }}>
                Failed
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Evolution summary — with animated score */}
      <AnimatePresence>
        {evolution && (
          <motion.div
            className="mb-5 p-4 evolution-card"
            style={{
              background: 'var(--surface-0)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: duration.moderate, ease: easing.out }}
          >
            <div className="flex items-baseline justify-between mb-3">
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
                Evolutionary Search
              </span>
              <motion.span
                className="font-display text-lg"
                style={{ color: 'var(--accent)', fontWeight: 600 }}
                key={evolution.bestScore}
                initial={{ opacity: 0, scale: 0.8, filter: 'blur(4px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                transition={springPreset.bouncy}
              >
                {evolution.bestScore}
              </motion.span>
            </div>

            <div className="flex gap-4">
              {[
                { label: 'Generations', value: evolution.totalGenerations },
                { label: 'Candidates', value: evolution.totalCandidatesEvaluated },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08, duration: duration.normal, ease: easing.out }}
                >
                  <span className="mono text-xs" style={{ color: 'var(--text-ghost)' }}>{stat.label}</span>
                  <p className="mono text-sm" style={{ color: 'var(--text-secondary)' }}>{stat.value}</p>
                </motion.div>
              ))}

              {evolution.scoreHistory.length > 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.16, duration: duration.normal, ease: easing.out }}
                >
                  <span className="mono text-xs" style={{ color: 'var(--text-ghost)' }}>Scores</span>
                  <div className="flex gap-1 items-center mt-0.5">
                    {evolution.scoreHistory.map((s: number, i: number) => (
                      <React.Fragment key={i}>
                        <motion.span
                          className="mono text-xs"
                          style={{ color: i === evolution.scoreHistory.length - 1 ? 'var(--accent)' : 'var(--text-muted)' }}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.1, duration: duration.micro }}
                        >
                          {s}
                        </motion.span>
                        {i < evolution.scoreHistory.length - 1 && (
                          <span className="text-xs" style={{ color: 'var(--text-ghost)' }}>→</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Log entries — staggered, animated */}
      {logs.length === 0 ? (
        <motion.p
          className="text-xs italic"
          style={{ color: 'var(--text-ghost)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: duration.normal }}
        >
          Awaiting input
        </motion.p>
      ) : (
        <>
          <motion.div
            ref={containerRef}
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="space-y-1.5 overflow-y-auto"
            style={{ maxHeight: expanded ? '400px' : '200px' }}
          >
            <AnimatePresence mode="popLayout">
              {displayLogs.map((log, i) => {
                const isError = log.includes('ERROR') || log.includes('failed');
                const isIssue = log.includes('ISSUE');
                const isComplete = log.includes('Complete') || log.includes('Rendering');
                const color = isError
                  ? 'var(--status-error)'
                  : isIssue
                  ? 'var(--status-warning)'
                  : isComplete
                  ? 'var(--status-success)'
                  : 'var(--text-muted)';

                return (
                  <motion.div
                    key={`${i}-${log.slice(0, 20)}`}
                    variants={logEntry}
                    layout
                    className="flex items-start gap-3 py-1 px-2 rounded-md log-entry"
                  >
                    <motion.div
                      className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                      style={{ background: color }}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={springPreset.snappy}
                    />
                    <span
                      className="text-xs leading-relaxed"
                      style={{ color }}
                    >
                      {log}
                    </span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>

          {/* Expand/collapse — with animated text */}
          {logs.length > 5 && (
            <motion.button
              onClick={() => setExpanded(!expanded)}
              className="mt-3 text-xs flex items-center gap-1"
              style={{ color: 'var(--text-ghost)' }}
              whileHover={{ color: 'var(--text-muted)' }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: duration.micro }}
            >
              <motion.svg
                width="10" height="10" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                animate={{ rotate: expanded ? 180 : 0 }}
                transition={{ duration: duration.normal, ease: easing.out }}
              >
                <polyline points="6,9 12,15 18,9"/>
              </motion.svg>
              {expanded ? 'Show less' : `Show ${logs.length - 5} more`}
            </motion.button>
          )}
        </>
      )}
    </motion.div>
  );
};

export default Telemetry;
