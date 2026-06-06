'use client';

import React, { useEffect, useRef } from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

interface LottieAnimationProps {
  /** URL to a .lottie or .json animation file */
  src: string;
  /** Width in px or CSS string */
  width?: number | string;
  /** Height in px or CSS string */
  height?: number | string;
  /** Whether to loop */
  loop?: boolean;
  /** Autoplay on mount */
  autoplay?: boolean;
  /** Playback speed multiplier */
  speed?: number;
  /** CSS class */
  className?: string;
  /** Additional styles */
  style?: React.CSSProperties;
}

/**
 * LottieAnimation — A clean React wrapper around DotLottieReact.
 * Uses the modern @lottiefiles/dotlottie-react for GPU-accelerated
 * Lottie rendering via the ThorVG engine.
 */
export const LottieAnimation: React.FC<LottieAnimationProps> = ({
  src,
  width = 120,
  height = 120,
  loop = true,
  autoplay = true,
  speed = 1,
  className = '',
  style = {},
}) => {
  return (
    <div
      className={className}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      <DotLottieReact
        src={src}
        loop={loop}
        autoplay={autoplay}
        speed={speed}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};

// ── Curated Animation URLs ──────────────────────────────────────────────────
// Public LottieFiles animations for different UI states

export const LOTTIE_URLS = {
  // Processing/loading states
  creativeLoading: 'https://lottie.host/f5743b12-be38-4689-9864-dfa85272e81a/pTx1TkSxVq.lottie',
  processingDots: 'https://lottie.host/2b1b1a4e-0f93-4464-a52a-eddf95e15386/k08TxLyEkE.lottie',
  // Success/complete
  successCheck: 'https://lottie.host/d6221aaf-e104-45ff-a21c-07dc9f19f5b3/m2bHr3nJys.lottie',
  // Upload/image
  imageUpload: 'https://lottie.host/fb7ff1a6-e152-40b8-8153-1dddb0e7d710/NKXJ3bBjjC.lottie',
  // Writing/creative
  creativeWrite: 'https://lottie.host/3a3f5b6e-7163-44c3-b7a1-b35e2d2ac68a/7C5E6LBQyJ.lottie',
  // Stars/sparkle
  sparkle: 'https://lottie.host/182e5f47-f22e-413c-8d8c-0a93d5ce2b66/qSf1UjEy4Z.lottie',
  // Empty state
  emptyCanvas: 'https://lottie.host/5f6f4b6e-1d4f-4bf0-9c0a-6f21bea6f40a/qfK5KFBHKG.lottie',
};

export default LottieAnimation;
