'use client';

import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WebLayoutOutput, TypographyTokens } from '@/types/agents';
import {
  fadeIn, scaleIn, slideUp, duration, easing, pulse,
  breathingGlow, scoreReveal, springPreset, pressScale,
} from '@/lib/motion';
import { LottieAnimation, LOTTIE_URLS } from '@/components/LottieAnimation';

interface CanvasProps {
  imageUrl: string | null;
  layout: WebLayoutOutput | null;
  typography: TypographyTokens | null;
  html: string | null;
  score: number | null;
  status: string;
}

export const Canvas: React.FC<CanvasProps> = ({
  imageUrl,
  layout,
  html,
  score,
  status,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  useEffect(() => {
    if (iframeRef.current && html) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
        setTimeout(() => setIframeLoaded(true), 400);
      }
    } else {
      setIframeLoaded(false);
    }
  }, [html]);

  const isProcessing = ['analyzing', 'designing', 'copywriting', 'typography', 'arranging', 'evolving'].includes(status);

  // Status labels — creative collaborator language
  const statusLabels: Record<string, { label: string; sub: string }> = {
    analyzing: { label: 'Analyzing composition', sub: 'Understanding visual hierarchy & focal points' },
    designing: { label: 'Evaluating hierarchy', sub: 'Mapping spatial relationships & balance' },
    copywriting: { label: 'Crafting narrative', sub: 'Writing compelling editorial copy' },
    typography: { label: 'Selecting typography', sub: 'Pairing fonts for maximum impact' },
    arranging: { label: 'Exploring directions', sub: 'Testing layout archetypes & grids' },
    evolving: { label: 'Refining compositions', sub: 'Evolutionary search for optimal layout' },
    rendering: { label: 'Composing final design', sub: 'Assembling all elements into HTML' },
    critiquing: { label: 'Evaluating quality', sub: 'Scoring against design constitution' },
  };

  // ── Empty State — inviting, alive ──────────────────────────────────────────
  if (!imageUrl && !html) {
    return (
      <motion.div
        variants={fadeIn}
        initial="initial"
        animate="animate"
        className="flex flex-col items-center justify-center w-full canvas-empty"
        style={{
          maxWidth: '760px',
          aspectRatio: '1 / 1',
          background: 'var(--surface-0)',
          border: '1px dashed var(--border-default)',
          borderRadius: 'var(--radius-lg)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Animated corner accents */}
        <motion.div
          className="absolute top-0 left-0 w-20 h-20"
          style={{
            background: 'linear-gradient(135deg, rgba(217, 119, 87, 0.06) 0%, transparent 70%)',
            borderRadius: '0 0 100% 0',
          }}
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-0 right-0 w-20 h-20"
          style={{
            background: 'linear-gradient(315deg, rgba(106, 155, 204, 0.06) 0%, transparent 70%)',
            borderRadius: '100% 0 0 0',
          }}
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        />

        <motion.div className="flex flex-col items-center gap-6 z-10">
          {/* Upload icon with pulse */}
          <motion.div
            className="w-16 h-16 rounded-2xl flex items-center justify-center canvas-upload-icon"
            style={{
              border: '1.5px solid var(--border-default)',
              background: 'linear-gradient(135deg, var(--surface-1), var(--surface-0))',
            }}
            animate={{
              boxShadow: [
                '0 0 0 0 rgba(217, 119, 87, 0)',
                '0 0 0 8px rgba(217, 119, 87, 0.04)',
                '0 0 0 0 rgba(217, 119, 87, 0)',
              ],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent)' }}>
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21,15 16,10 5,21"/>
            </svg>
          </motion.div>

          <div className="text-center">
            <motion.p
              className="font-editorial text-xl"
              style={{ color: 'var(--text-secondary)', fontWeight: 400 }}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: duration.moderate, ease: easing.out }}
            >
              Begin with an image
            </motion.p>
            <motion.p
              className="text-xs mt-2"
              style={{ color: 'var(--text-ghost)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: duration.moderate, ease: easing.out }}
            >
              JPG, PNG, or WebP — drag or select from panel
            </motion.p>
          </div>

          {/* Subtle animated line decoration */}
          <motion.div
            className="flex gap-1.5 items-center mt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45, duration: duration.moderate }}
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="rounded-full"
                style={{
                  width: i === 1 ? '20px' : '4px',
                  height: '3px',
                  background: 'var(--accent)',
                  opacity: 0.25,
                }}
                animate={{ opacity: [0.15, 0.4, 0.15] }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: i * 0.3,
                }}
              />
            ))}
          </motion.div>
        </motion.div>
      </motion.div>
    );
  }

  // ── Processing State — alive, informative ─────────────────────────────────
  if (imageUrl && !html) {
    const statusInfo = statusLabels[status] || { label: 'Processing…', sub: '' };

    return (
      <motion.div
        variants={scaleIn}
        initial="initial"
        animate="animate"
        className="relative flex-1 overflow-hidden w-full"
        style={{
          maxWidth: '760px',
          aspectRatio: '1 / 1',
          background: 'var(--bg-base)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        {/* Background image — gently dimmed */}
        <motion.img
          src={imageUrl}
          alt="Source"
          className="w-full h-full object-cover absolute inset-0"
          style={{ opacity: 0.1, filter: 'blur(4px) saturate(0.5)' }}
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Gradient overlay for depth */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 30%, var(--bg-base) 100%)',
          }}
        />

        {/* Processing overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 z-10">
          {/* Animated processing indicator — orbiting dots */}
          <div className="relative w-16 h-16">
            <motion.div
              className="absolute inset-0"
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="absolute w-2.5 h-2.5 rounded-full"
                  style={{
                    background: 'var(--accent)',
                    top: '50%',
                    left: '50%',
                    transformOrigin: '0 0',
                  }}
                  animate={{
                    opacity: [0.3, 1, 0.3],
                    scale: [0.8, 1.1, 0.8],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: i * 0.4,
                  }}
                  initial={false}
                />
              ))}
            </motion.div>

            {/* Center dot */}
            <motion.div
              className="absolute top-1/2 left-1/2 w-3 h-3 rounded-full -translate-x-1/2 -translate-y-1/2"
              style={{ background: 'var(--accent)' }}
              animate={{ opacity: [0.4, 1, 0.4], scale: [0.9, 1.1, 0.9] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>

          {/* Status text — editorial voice with AnimatePresence */}
          <AnimatePresence mode="wait">
            <motion.div
              key={status}
              className="text-center"
              initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -6, filter: 'blur(4px)' }}
              transition={{ duration: duration.normal, ease: easing.out }}
            >
              <p
                className="font-editorial text-lg"
                style={{ color: 'var(--text-secondary)', fontWeight: 400 }}
              >
                {statusInfo.label}
              </p>
              <motion.p
                className="text-xs mt-1.5"
                style={{ color: 'var(--text-ghost)' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15, duration: duration.normal }}
              >
                {statusInfo.sub}
              </motion.p>
            </motion.div>
          </AnimatePresence>

          {/* Progress bar — smooth sweep */}
          <motion.div
            className="w-48 h-0.5 rounded-full overflow-hidden"
            style={{ background: 'var(--surface-2)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: duration.moderate }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{
                background: 'linear-gradient(90deg, var(--accent), var(--accent-light))',
              }}
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: easing.inOut }}
            />
          </motion.div>
        </div>
      </motion.div>
    );
  }

  // ── Active State (HTML rendered) ──────────────────────────────────────────
  return (
    <motion.div
      variants={scaleIn}
      initial="initial"
      animate="animate"
      className="relative flex-1 w-full"
      style={{ maxWidth: '760px' }}
    >
      {/* Strategy label — animated badge */}
      <AnimatePresence>
        {layout && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: duration.normal, ease: easing.out }}
            className="absolute top-3 left-3 z-20"
          >
            <span className="badge-accent badge-animated">
              {layout.strategy}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Score — animated reveal with blur-in */}
      <AnimatePresence>
        {score !== null && (
          <motion.div
            variants={scoreReveal}
            initial="initial"
            animate="animate"
            exit="initial"
            className="absolute bottom-4 right-4 z-20 flex items-center gap-2 score-chip"
            style={{
              background: 'rgba(254, 250, 224, 0.92)',
              backdropFilter: 'blur(12px)',
              borderRadius: 'var(--radius-md)',
              padding: '8px 16px',
              border: '1px solid var(--border-subtle)',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <motion.span
              className="font-display text-xl"
              style={{
                color: score >= 70 ? 'var(--status-success)' : 'var(--accent)',
                fontWeight: 600,
              }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={springPreset.bouncy}
            >
              {score}
            </motion.span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>/100</span>

            {/* Success sparkle when score >= 70 */}
            {score >= 70 && (
              <motion.div
                className="absolute -top-1 -right-1"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, ...springPreset.bouncy }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--status-success)" style={{ filter: 'drop-shadow(0 0 4px rgba(120, 140, 93, 0.3))' }}>
                  <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6z"/>
                </svg>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* The iframe — smooth reveal with border radius */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: iframeLoaded ? 1 : 0, scale: iframeLoaded ? 1 : 0.98 }}
        transition={{ duration: duration.reveal, ease: easing.out }}
        className="overflow-hidden canvas-frame"
        style={{
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          boxShadow: iframeLoaded ? 'var(--shadow-lg)' : 'none',
          transition: `box-shadow ${duration.slow * 1000}ms`,
        }}
      >
        <iframe
          ref={iframeRef}
          id="design-canvas"
          title="Design Preview"
          className="w-full"
          style={{
            backgroundColor: '#f5f0cb',
            aspectRatio: '1 / 1',
            maxHeight: '760px',
            display: 'block',
          }}
          sandbox="allow-same-origin"
          srcDoc={html || ''}
        />
      </motion.div>
    </motion.div>
  );
};

export default Canvas;
