'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '@/lib/store';
import {
  slideUp, duration, easing, springPreset,
  staggerContainer, staggerItem,
} from '@/lib/motion';

export const CritiquePanel: React.FC = () => {
  const activeJob = useStore((s) => s.activeJob);
  const { critiqueLogs, score } = activeJob;
  const [issuesOpen, setIssuesOpen] = useState(false);

  const latest = critiqueLogs[critiqueLogs.length - 1];
  if (!latest && score === null) return null;

  const displayScore = score ?? latest?.score ?? 0;
  const scoreColor = displayScore >= 70
    ? 'var(--status-success)'
    : displayScore >= 50
    ? 'var(--status-warning)'
    : 'var(--status-error)';

  // Score quality label
  const qualityLabel = displayScore >= 80 ? 'Excellent' : displayScore >= 70 ? 'Good' : displayScore >= 50 ? 'Needs work' : 'Poor';

  return (
    <motion.div
      variants={slideUp}
      initial="initial"
      animate="animate"
    >
      <h3 className="font-display text-xs uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)', letterSpacing: '0.15em' }}>
        Evaluation
      </h3>

      {/* Score display — animated with blur-in and quality label */}
      <div className="flex items-baseline gap-3 mb-5">
        <motion.span
          className="font-display text-3xl"
          style={{ color: scoreColor, fontWeight: 600 }}
          key={displayScore}
          initial={{ opacity: 0, scale: 0.8, filter: 'blur(6px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          transition={springPreset.bouncy}
        >
          {displayScore}
        </motion.span>
        <span className="text-sm" style={{ color: 'var(--text-ghost)' }}>/100</span>

        {/* Quality badge with spring animation */}
        <motion.span
          className="text-xs px-2 py-0.5 rounded-full ml-auto"
          style={{
            background: displayScore >= 70 ? 'rgba(120, 140, 93, 0.1)' : displayScore >= 50 ? 'rgba(176, 125, 16, 0.1)' : 'rgba(196, 85, 61, 0.1)',
            color: scoreColor,
            border: `1px solid ${displayScore >= 70 ? 'rgba(120, 140, 93, 0.2)' : displayScore >= 50 ? 'rgba(176, 125, 16, 0.2)' : 'rgba(196, 85, 61, 0.2)'}`,
          }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, ...springPreset.snappy }}
        >
          {qualityLabel}
        </motion.span>
      </div>

      {/* Score progress bar */}
      <motion.div
        className="w-full h-1 rounded-full mb-5 overflow-hidden"
        style={{ background: 'var(--surface-2)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15, duration: duration.normal }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ background: scoreColor }}
          initial={{ width: '0%' }}
          animate={{ width: `${displayScore}%` }}
          transition={{ delay: 0.3, duration: 0.8, ease: easing.out }}
        />
      </motion.div>

      {/* Issues */}
      {latest && latest.issues.length > 0 && (
        <div>
          <motion.button
            onClick={() => setIssuesOpen(!issuesOpen)}
            className="flex items-center gap-2 mb-2 group"
            whileTap={{ scale: 0.98 }}
            transition={{ duration: duration.press }}
          >
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {latest.issues.length} {latest.issues.length === 1 ? 'observation' : 'observations'}
            </span>
            <motion.svg
              width="10" height="10" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ color: 'var(--text-ghost)' }}
              animate={{ rotate: issuesOpen ? 180 : 0 }}
              transition={{ duration: duration.normal, ease: easing.out }}
            >
              <polyline points="6,9 12,15 18,9"/>
            </motion.svg>
          </motion.button>

          <AnimatePresence>
            {issuesOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: duration.normal, ease: easing.out }}
                className="overflow-hidden"
              >
                <motion.div
                  className="space-y-2"
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                >
                  {latest.issues.map((issue, i) => (
                    <motion.div
                      key={i}
                      className="flex items-start gap-2 py-1 px-2 rounded-md"
                      variants={staggerItem}
                      whileHover={{ backgroundColor: 'rgba(176, 125, 16, 0.04)' }}
                      transition={{ duration: duration.micro }}
                    >
                      <motion.div
                        className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                        style={{ background: 'var(--status-warning)' }}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: i * 0.05, ...springPreset.snappy }}
                      />
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        {issue}
                      </p>
                    </motion.div>
                  ))}
                </motion.div>

                {latest.fixes.length > 0 && (
                  <motion.div
                    className="mt-4 space-y-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2, duration: duration.normal }}
                  >
                    <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-ghost)', letterSpacing: '0.08em' }}>
                      Suggestions
                    </span>
                    {latest.fixes.map((fix, i) => (
                      <motion.div
                        key={i}
                        className="flex items-start gap-2 py-1 px-2 rounded-md"
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + i * 0.06, duration: duration.normal, ease: easing.out }}
                        whileHover={{ backgroundColor: 'rgba(120, 140, 93, 0.04)' }}
                      >
                        <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: 'var(--status-success)' }} />
                        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                          {fix}
                        </p>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
};

export default CritiquePanel;
