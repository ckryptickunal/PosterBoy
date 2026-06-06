'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '@/lib/store';
import { duration, easing, springPreset } from '@/lib/motion';

interface ConstitutionEditorProps {
  onClose: () => void;
}

export const ConstitutionEditor: React.FC<ConstitutionEditorProps> = ({ onClose }) => {
  const { rulesText, rulesVersion, updateConstitution } = useStore();
  const [draft, setDraft] = useState(rulesText);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const success = await updateConstitution(draft);
    setSaving(false);
    if (success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  return (
    <>
      {/* Backdrop — smooth fade with blur */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: duration.normal, ease: easing.out }}
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(19, 19, 20, 0.15)', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      />

      {/* Panel — drawer curve from Emil Kowalski */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: duration.slow, ease: easing.drawer }}
        className="fixed top-0 right-0 bottom-0 z-50 flex flex-col"
        style={{
          width: '460px',
          maxWidth: '90vw',
          background: 'var(--bg-base)',
          borderLeft: '1px solid var(--border-subtle)',
          boxShadow: '-20px 0 60px rgba(19, 19, 20, 0.08)',
        }}
      >
        {/* Header — staggered content */}
        <motion.div
          className="flex items-center justify-between px-6 py-5"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: duration.normal, ease: easing.out }}
        >
          <div>
            <h2 className="font-display text-lg" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
              Design Constitution
            </h2>
            {rulesVersion && (
              <motion.p
                className="text-xs mono mt-1"
                style={{ color: 'var(--text-ghost)' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25, duration: duration.normal }}
              >
                Version {rulesVersion}
              </motion.p>
            )}
          </div>

          {/* Close button with rotation */}
          <motion.button
            onClick={onClose}
            className="p-2 rounded-md close-btn"
            style={{ color: 'var(--text-muted)' }}
            whileHover={{ rotate: 90, backgroundColor: 'var(--surface-0)' }}
            whileTap={{ scale: 0.9 }}
            transition={{ duration: duration.micro, ease: easing.out }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </motion.button>
        </motion.div>

        {/* Editor — smooth entrance */}
        <motion.div
          className="flex-1 overflow-hidden p-6"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: duration.moderate, ease: easing.out }}
        >
          <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
            Rules are injected into every agent at generation and critique time.
          </p>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full h-full mono text-xs leading-relaxed p-4 resize-none textarea-field"
            style={{
              background: 'var(--surface-0)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-secondary)',
              outline: 'none',
              minHeight: '300px',
            }}
            spellCheck={false}
          />
        </motion.div>

        {/* Footer — staggered buttons */}
        <motion.div
          className="px-6 py-5 flex items-center justify-end gap-3"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: duration.normal, ease: easing.out }}
        >
          <motion.button
            onClick={onClose}
            className="btn-ghost"
            whileTap={{ scale: 0.97 }}
            transition={{ duration: duration.press }}
          >
            Cancel
          </motion.button>
          <motion.button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex items-center gap-2"
            whileTap={{ scale: 0.97 }}
            transition={{ duration: duration.press }}
          >
            <AnimatePresence mode="wait">
              {saved ? (
                <motion.span
                  key="saved"
                  className="flex items-center gap-1.5"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={springPreset.snappy}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20,6 9,17 4,12"/>
                  </svg>
                  Saved
                </motion.span>
              ) : saving ? (
                <motion.span
                  key="saving"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: duration.micro }}
                >
                  <span className="flex gap-0.5 items-center">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="w-1 h-1 rounded-full bg-current"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut', delay: i * 0.15 }}
                      />
                    ))}
                    <span className="ml-1.5">Saving</span>
                  </span>
                </motion.span>
              ) : (
                <motion.span
                  key="update"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: duration.micro }}
                >
                  Update
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </motion.div>
      </motion.div>
    </>
  );
};

export default ConstitutionEditor;
