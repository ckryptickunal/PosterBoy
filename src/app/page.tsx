'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { captureSafePng } from '@/lib/exportEngine';
import { useStore } from '@/lib/store';
import Canvas from '@/components/Canvas';
import ControlPanel from '@/components/ControlPanel';
import Telemetry from '@/components/Telemetry';
import CritiquePanel from '@/components/CritiquePanel';
import ConstitutionEditor from '@/components/ConstitutionEditor';
import {
  fadeIn, slideUp, duration, easing,
  pressScale, springPreset, staggerContainer, staggerItem,
} from '@/lib/motion';

export default function StudioPage() {
  const store = useStore();
  const { activeJob, fetchInitialData } = store;
  const [showConstitution, setShowConstitution] = useState(false);
  const [headerReady, setHeaderReady] = useState(false);

  useEffect(() => {
    fetchInitialData();
    // Stagger header entrance
    setTimeout(() => setHeaderReady(true), 100);
  }, []);

  // Auto-critique when HTML is composed
  useEffect(() => {
    if (activeJob.status === 'rendering' && activeJob.html) {
      const captureAndSubmit = async () => {
        const iframe = document.getElementById('design-canvas') as HTMLIFrameElement;
        if (iframe) {
          try {
            // captureSafePng internally awaits fonts, images, and animation frames
            const dataUrl = await captureSafePng(iframe);
            await store.runCritiqueLoop(dataUrl);
          } catch (err) {
            console.error('Safe capture failed:', err);
            await store.runCritiqueLoop('');
          }
        }
      };
      captureAndSubmit();
    }
  }, [activeJob.status, activeJob.html]);

  // ── Export Handlers ─────────────────────────────────────────────────────
  const handleExportPng = async () => {
    const iframe = document.getElementById('design-canvas') as HTMLIFrameElement;
    if (iframe) {
      try {
        const dataUrl = await captureSafePng(iframe);
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `posterboy_${activeJob.layout?.strategy || 'design'}.png`;
        a.click();
      } catch (e) { console.error('PNG export failed:', e); }
    }
  };

  const handleExportHtml = () => {
    if (!activeJob.html) return;
    const blob = new Blob([activeJob.html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `posterboy_${activeJob.layout?.strategy || 'design'}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      {/* ── Header — staggered entrance ── */}
      <motion.header
        className="flex items-center justify-between px-8 py-5 header-bar"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: duration.moderate, ease: easing.out }}
      >
        <motion.div
          className="flex items-baseline gap-3"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.08, duration: duration.normal, ease: easing.out }}
        >
          <h1 className="font-display text-xl" style={{ fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            PosterBoy
          </h1>
          <motion.span
            className="text-xs"
            style={{ color: 'var(--text-ghost)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: duration.normal }}
          >
            Creative Studio
          </motion.span>

          {/* Subtle live indicator when pipeline is active */}
          <AnimatePresence>
            {!['idle', 'completed', 'failed'].includes(activeJob.status) && (
              <motion.div
                className="flex items-center gap-1.5 ml-2"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={springPreset.snappy}
              >
                <motion.div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: 'var(--accent)' }}
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />
                <span className="text-xs" style={{ color: 'var(--accent)' }}>
                  Live
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.div
          className="flex items-center gap-3"
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.12, duration: duration.normal, ease: easing.out }}
        >
          {/* Export buttons — slide in when design is ready */}
          <AnimatePresence>
            {activeJob.html && (
              <motion.div
                initial={{ opacity: 0, x: 8, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 8, scale: 0.95 }}
                transition={{ duration: duration.normal, ease: easing.out }}
                className="flex gap-2"
              >
                <motion.button
                  onClick={handleExportPng}
                  className="btn-ghost text-xs flex items-center gap-1.5"
                  whileTap={{ scale: 0.97 }}
                  whileHover={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
                  transition={{ duration: duration.micro, ease: easing.out }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  PNG
                </motion.button>
                <motion.button
                  onClick={handleExportHtml}
                  className="btn-ghost text-xs flex items-center gap-1.5"
                  whileTap={{ scale: 0.97 }}
                  whileHover={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
                  transition={{ duration: duration.micro, ease: easing.out }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="16,18 22,12 16,6"/><polyline points="8,6 2,12 8,18"/>
                  </svg>
                  HTML
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            onClick={() => setShowConstitution(true)}
            className="btn-ghost text-xs"
            whileTap={{ scale: 0.97 }}
            whileHover={{ borderColor: 'var(--border-strong)' }}
            transition={{ duration: duration.micro, ease: easing.out }}
          >
            Constitution
          </motion.button>
        </motion.div>
      </motion.header>

      {/* ── Main Layout ── */}
      <div className="flex" style={{ minHeight: 'calc(100vh - 65px)' }}>

        {/* ── Canvas (hero — 70-80% of attention) ── */}
        <motion.main
          className="flex-1 flex items-center justify-center p-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: duration.moderate, ease: easing.out }}
        >
          <Canvas
            imageUrl={activeJob.imageUrl}
            layout={activeJob.layout}
            typography={activeJob.typography}
            html={activeJob.html}
            score={activeJob.score}
            status={activeJob.status}
          />
        </motion.main>

        {/* ── Side Panel (recedes visually) — smooth entrance ── */}
        <motion.aside
          className="flex flex-col"
          style={{
            width: '340px',
            minWidth: '340px',
            borderLeft: '1px solid var(--border-subtle)',
            background: 'var(--bg-base)',
          }}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15, duration: duration.moderate, ease: easing.out }}
        >
          <ControlPanel />

          {/* ── Divider ── */}
          <div className="divider mx-6" />

          {/* ── Telemetry ── */}
          <div className="px-6">
            <Telemetry />
          </div>

          {/* ── Critique (contextual) ── */}
          <AnimatePresence>
            {activeJob.critiqueLogs.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: duration.moderate, ease: easing.out }}
              >
                <div className="divider mx-6" />
                <div className="px-6 py-6">
                  <CritiquePanel />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.aside>
      </div>

      {/* ── Constitution Editor (slide-over) ── */}
      <AnimatePresence>
        {showConstitution && (
          <ConstitutionEditor onClose={() => setShowConstitution(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
