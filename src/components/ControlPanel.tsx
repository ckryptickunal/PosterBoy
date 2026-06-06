'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '@/lib/store';
import {
  slideUp, fadeIn, duration, easing, pressScale,
  hoverLift, springPreset, staggerContainer, staggerItem,
} from '@/lib/motion';

export const ControlPanel: React.FC = () => {
  const store = useStore();
  const [intent, setIntent] = useState('An elegant Instagram post announcing our new Summer Diamond Jewellery Collection.');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Font uploader state
  const [fontFile, setFontFile] = useState<File | null>(null);
  const [fontFamily, setFontFamily] = useState('');
  const [fontCategory, setFontCategory] = useState<'display' | 'body'>('display');
  const [fontUploading, setFontUploading] = useState(false);

  // Collapsible sections
  const [fontsOpen, setFontsOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleFontChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFontFile(e.target.files[0]);
      const name = e.target.files[0].name.split('.')[0].replace(/[-_]/g, ' ');
      setFontFamily(name);
    }
  };

  const handleUploadFont = async () => {
    if (!fontFile || !fontFamily) return;
    setFontUploading(true);
    const success = await store.uploadFont(fontFile, fontFamily, fontCategory);
    setFontUploading(false);
    if (success) {
      setFontFile(null);
      setFontFamily('');
    }
  };

  const handleTriggerPipeline = () => {
    if (!imageFile || !intent) return;
    store.startDesignPipeline(imageFile, intent);
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const isGenerating = ['analyzing', 'designing', 'copywriting', 'typography', 'arranging', 'evolving', 'rendering', 'critiquing'].includes(store.activeJob.status);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* ── Image ── */}
      <div className="px-6 pt-8 pb-6">
        <motion.h3
          className="font-display text-xs uppercase tracking-widest mb-4"
          style={{ color: 'var(--text-muted)', letterSpacing: '0.15em' }}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: duration.normal, ease: easing.out }}
        >
          Image
        </motion.h3>
        <motion.div
          className="relative overflow-hidden cursor-pointer group image-dropzone"
          style={{
            background: isDragging ? 'var(--accent-muted)' : 'var(--surface-0)',
            border: `1.5px ${isDragging ? 'solid' : 'dashed'} ${isDragging ? 'var(--accent)' : 'var(--border-default)'}`,
            borderRadius: 'var(--radius-md)',
            minHeight: imagePreview ? 'auto' : '100px',
          }}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          whileHover={{ borderColor: 'var(--accent)', scale: 1.005 }}
          whileTap={{ scale: 0.995 }}
          transition={{ duration: duration.micro, ease: easing.out }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          // @ts-ignore - motion typings
          layoutId="image-upload"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
          />
          {imagePreview ? (
            <div className="relative">
              <motion.img
                src={imagePreview}
                alt="Selected"
                className="w-full h-36 object-cover"
                style={{ opacity: 0.85 }}
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 0.85, scale: 1 }}
                transition={{ duration: duration.moderate, ease: easing.out }}
              />
              {/* Hover overlay with smooth opacity */}
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                style={{ background: 'rgba(254, 250, 224, 0.75)' }}
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}
                transition={{ duration: duration.micro, ease: easing.out }}
              >
                <motion.span
                  className="text-xs font-medium flex items-center gap-1.5"
                  style={{ color: 'var(--accent)' }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17,8 12,3 7,8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  Change image
                </motion.span>
              </motion.div>

              {/* Subtle gradient at bottom */}
              <div
                className="absolute bottom-0 left-0 right-0 h-8"
                style={{ background: 'linear-gradient(transparent, var(--surface-0))' }}
              />
            </div>
          ) : (
            <motion.div
              className="flex flex-col items-center justify-center py-8 gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1, duration: duration.normal }}
            >
              {/* Upload icon with breathing animation */}
              <motion.div
                animate={{
                  y: [0, -3, 0],
                }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: isDragging ? 'var(--accent)' : 'var(--text-ghost)' }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17,8 12,3 7,8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </motion.div>
              <span className="text-xs" style={{ color: isDragging ? 'var(--accent)' : 'var(--text-ghost)' }}>
                {isDragging ? 'Drop image here' : 'Drag or click to select'}
              </span>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* ── Divider ── */}
      <div className="divider mx-6" />

      {/* ── Intent ── */}
      <motion.div
        className="px-6 py-6"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: duration.normal, ease: easing.out }}
      >
        <h3 className="font-display text-xs uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)', letterSpacing: '0.15em' }}>
          Brief
        </h3>
        <div className="relative">
          <textarea
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            placeholder="Describe the design intent…"
            rows={3}
            className="w-full resize-none text-sm leading-relaxed textarea-field"
            style={{
              background: 'transparent',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 14px',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
          {/* Character count with fade */}
          <motion.span
            className="absolute bottom-2 right-3 text-xs mono"
            style={{ color: 'var(--text-ghost)', fontSize: '10px' }}
            animate={{ opacity: intent.length > 0 ? 0.6 : 0 }}
            transition={{ duration: duration.micro }}
          >
            {intent.length}
          </motion.span>
        </div>
      </motion.div>

      {/* ── Generate ── */}
      <motion.div
        className="px-6 pb-6"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: duration.normal, ease: easing.out }}
      >
        <motion.button
          onClick={handleTriggerPipeline}
          disabled={!imageFile || !intent || isGenerating}
          className="btn-primary w-full flex items-center justify-center gap-2"
          style={{ padding: '12px 24px', position: 'relative', overflow: 'hidden' }}
          whileTap={{ scale: 0.97 }}
          whileHover={{ opacity: 0.92 }}
          transition={{ duration: duration.press, ease: easing.out }}
        >
          {/* Shimmer overlay during generation */}
          {isGenerating && (
            <motion.div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
                backgroundSize: '200% 100%',
              }}
              animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            />
          )}

          {isGenerating ? (
            <motion.span
              className="flex items-center gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: duration.micro }}
            >
              {/* Animated dots */}
              <span className="flex gap-0.5">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="w-1 h-1 rounded-full bg-current"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.15 }}
                  />
                ))}
              </span>
              <span>Composing</span>
            </motion.span>
          ) : (
            <>
              <span>Generate Design</span>
              <motion.svg
                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                animate={{ x: [0, 3, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/>
              </motion.svg>
            </>
          )}
        </motion.button>
      </motion.div>

      {/* ── Divider ── */}
      <div className="divider mx-6" />

      {/* ── Typography ── */}
      <div className="px-6 py-6">
        <motion.button
          onClick={() => setFontsOpen(!fontsOpen)}
          className="flex items-center justify-between w-full group"
          whileTap={{ scale: 0.99 }}
          transition={{ duration: duration.press }}
        >
          <h3 className="font-display text-xs uppercase tracking-widest" style={{ color: 'var(--text-muted)', letterSpacing: '0.15em' }}>
            Custom Fonts
          </h3>
          <motion.svg
            width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ color: 'var(--text-ghost)' }}
            animate={{ rotate: fontsOpen ? 180 : 0 }}
            transition={{ duration: duration.normal, ease: easing.out }}
          >
            <polyline points="6,9 12,15 18,9"/>
          </motion.svg>
        </motion.button>

        <AnimatePresence>
          {fontsOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: duration.normal, ease: easing.out }}
              className="overflow-hidden"
            >
              <motion.div
                className="pt-4 space-y-3"
                variants={staggerContainer}
                initial="initial"
                animate="animate"
              >
                {/* Uploaded fonts list */}
                {store.fonts.length > 0 && (
                  <div className="space-y-1 mb-4">
                    {store.fonts.map((font: any, i: number) => (
                      <motion.div
                        key={i}
                        className="flex items-center gap-2 py-1.5 px-2 rounded-md"
                        variants={staggerItem}
                        whileHover={{ backgroundColor: 'var(--surface-0)' }}
                        transition={{ duration: duration.micro }}
                      >
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {font.family_name || font.familyName}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--text-ghost)' }}>
                          · {font.category}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Upload form */}
                <div className="space-y-2">
                  <input
                    type="file"
                    accept=".woff2,.woff,.ttf,.otf"
                    onChange={handleFontChange}
                    className="w-full text-xs"
                    style={{ color: 'var(--text-muted)' }}
                  />
                  <AnimatePresence>
                    {fontFile && (
                      <motion.div
                        className="space-y-2"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: duration.normal, ease: easing.out }}
                      >
                        <input
                          type="text"
                          value={fontFamily}
                          onChange={(e) => setFontFamily(e.target.value)}
                          placeholder="Family name"
                          className="w-full text-xs input-field"
                          style={{
                            background: 'transparent',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-xs)',
                            padding: '6px 10px',
                            color: 'var(--text-primary)',
                            outline: 'none',
                          }}
                        />
                        <div className="flex gap-2">
                          <select
                            value={fontCategory}
                            onChange={(e) => setFontCategory(e.target.value as any)}
                            className="text-xs flex-1"
                            style={{
                              background: 'transparent',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: 'var(--radius-xs)',
                              padding: '6px 10px',
                              color: 'var(--text-secondary)',
                              outline: 'none',
                            }}
                          >
                            <option value="display">Display</option>
                            <option value="body">Body</option>
                          </select>
                          <motion.button
                            onClick={handleUploadFont}
                            disabled={fontUploading || !fontFamily}
                            className="btn-ghost text-xs"
                            style={{ padding: '6px 12px' }}
                            whileTap={{ scale: 0.97 }}
                            transition={{ duration: duration.press }}
                          >
                            {fontUploading ? (
                              <motion.span
                                animate={{ opacity: [0.5, 1, 0.5] }}
                                transition={{ duration: 1.2, repeat: Infinity }}
                              >
                                …
                              </motion.span>
                            ) : 'Upload'}
                          </motion.button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Divider ── */}
      <div className="divider mx-6" />

      {/* ── Design Reasoning (when available) ── */}
      <AnimatePresence>
        {store.activeJob.layout && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: duration.moderate, ease: easing.out }}
            className="px-6 py-6"
          >
            <h3 className="font-display text-xs uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)', letterSpacing: '0.15em' }}>
              Design Reasoning
            </h3>
            <motion.div
              className="space-y-4"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {store.activeJob.layout.reasoning && (
                <>
                  <ReasoningItem label="Strategy" value={store.activeJob.layout.reasoning.whyStrategy} index={0} />
                  <ReasoningItem label="Placements" value={store.activeJob.layout.reasoning.whyPlacements} index={1} />
                  <ReasoningItem label="Colors" value={store.activeJob.layout.reasoning.whyColors} index={2} />
                  <ReasoningItem label="Hierarchy" value={store.activeJob.layout.reasoning.whyHierarchy} index={3} />
                  <ReasoningItem label="Spacing" value={store.activeJob.layout.reasoning.whySpacing} index={4} />
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spacer */}
      <div className="flex-1" />

      {/* ── Actions (when design is ready) ── */}
      <AnimatePresence>
        {store.activeJob.html && store.activeJob.status === 'completed' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: duration.normal, ease: easing.out }}
            className="px-6 py-6 mt-auto"
            style={{ borderTop: '1px solid var(--border-subtle)' }}
          >
            <div className="flex gap-2">
              <motion.button
                onClick={() => store.approveDesign()}
                className="btn-primary flex-1 text-xs flex items-center justify-center gap-1.5"
                whileTap={{ scale: 0.97 }}
                transition={{ duration: duration.press }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20,6 9,17 4,12"/>
                </svg>
                Approve
              </motion.button>
              <motion.button
                onClick={() => store.resetJob()}
                className="btn-ghost flex-1 text-xs"
                whileTap={{ scale: 0.97 }}
                transition={{ duration: duration.press }}
              >
                Reset
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Design Reasoning Item — with stagger animation ──────────────────────────

function ReasoningItem({ label, value, index }: { label: string; value: string; index: number }) {
  if (!value) return null;
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06, duration: duration.normal, ease: easing.out }}
    >
      <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-ghost)', letterSpacing: '0.08em' }}>
        {label}
      </span>
      <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {value}
      </p>
    </motion.div>
  );
}

export default ControlPanel;
