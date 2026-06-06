/**
 * PosterBoy V4 Motion System
 * ════════════════════════════
 * Emil Kowalski's Design Engineering Philosophy applied:
 *
 * 1. Custom strong easing curves — built-in CSS easings are too weak
 * 2. UI animations stay under 300ms — 180ms feels more responsive than 400ms
 * 3. Never animate from scale(0) — start from scale(0.95) with opacity
 * 4. Exit at ~60% of enter duration — asymmetric timing feels natural
 * 5. ease-out for enters, ease-in-out for on-screen movement
 * 6. Button press feedback: 100-160ms — instant responsive feel
 * 7. Stagger delays: 30-80ms — short enough to not block interaction
 * 8. Hardware-accelerate: transform + opacity only
 */

import type { Transition, Variants } from 'motion/react';

// ── Easing (Strong custom curves per Emil Kowalski) ─────────────────────────

export const easing = {
  /** Strong ease-out for entering elements — instant feedback, graceful settle */
  out: [0.23, 1, 0.32, 1] as [number, number, number, number],
  /** Ease-in for exiting — quick departure */
  in: [0.7, 0, 0.84, 0] as [number, number, number, number],
  /** Strong ease-in-out for on-screen movement — natural accel/decel */
  inOut: [0.77, 0, 0.175, 1] as [number, number, number, number],
  /** iOS-like drawer curve (from Ionic Framework) */
  drawer: [0.32, 0.72, 0, 1] as [number, number, number, number],
  /** Anthropic's signature easing — slow, intentional */
  anthropic: [0.77, 0, 0.175, 1] as [number, number, number, number],
};

// ── Duration Tokens (Emil's hierarchy) ──────────────────────────────────────

export const duration = {
  /** 100ms — button press feedback */
  press: 0.1,
  /** 150ms — micro-interactions, tooltips */
  micro: 0.15,
  /** 200ms — hover, focus, small UI changes */
  fast: 0.2,
  /** 250ms — dropdowns, selects, standard UI */
  normal: 0.25,
  /** 350ms — modals, drawers entering */
  moderate: 0.35,
  /** 500ms — panel slides, page transitions */
  slow: 0.5,
  /** 700ms — hero reveals, canvas transitions */
  reveal: 0.7,
  /** Exit: always 60% of enter duration */
  exit: 0.15,
  /** Exit for slow elements */
  exitSlow: 0.2,
};

// ── Spring Presets (for alive, interruptible animations) ─────────────────────

export const springPreset = {
  /** Snappy spring — button interactions, small UI */
  snappy: { type: 'spring' as const, duration: 0.25, bounce: 0.1 },
  /** Responsive spring — modals, panels */
  responsive: { type: 'spring' as const, duration: 0.4, bounce: 0.15 },
  /** Gentle spring — decorative, alive-feeling */
  gentle: { type: 'spring' as const, duration: 0.6, bounce: 0.2 },
  /** Bouncy spring — playful, celebration */
  bouncy: { type: 'spring' as const, duration: 0.5, bounce: 0.35 },
};

// ── Transition Presets ──────────────────────────────────────────────────────

export const transition = {
  /** Standard enter */
  enter: { duration: duration.normal, ease: easing.out } as Transition,
  /** Standard exit — always faster */
  exit: { duration: duration.exit, ease: easing.in } as Transition,
  /** Slow reveal */
  reveal: { duration: duration.reveal, ease: easing.out } as Transition,
  /** Panel slide (drawer curve) */
  panel: { duration: duration.slow, ease: easing.drawer } as Transition,
  /** Micro interaction */
  micro: { duration: duration.micro, ease: easing.out } as Transition,
};

// ── Animation Variants ──────────────────────────────────────────────────────

/** Fade in — with custom strong easing */
export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: duration.normal, ease: easing.out } },
  exit: { opacity: 0, transition: { duration: duration.exit, ease: easing.in } },
};

/** Slide up + fade — editorial reveal with stronger motion */
export const slideUp: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.moderate, ease: easing.out },
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: { duration: duration.exit, ease: easing.in },
  },
};

/** Slide down + fade */
export const slideDown: Variants = {
  initial: { opacity: 0, y: -12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.moderate, ease: easing.out },
  },
  exit: {
    opacity: 0,
    y: 6,
    transition: { duration: duration.exit, ease: easing.in },
  },
};

/** Scale in — never from 0, always from 0.95+ per Emil */
export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.96 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: duration.moderate, ease: easing.out },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: { duration: duration.exit, ease: easing.in },
  },
};

/** Scale in from larger — for modals/overlays */
export const scaleInModal: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: springPreset.responsive,
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    transition: { duration: duration.exitSlow, ease: easing.in },
  },
};

/** For log entries — appear from left with stagger */
export const logEntry: Variants = {
  initial: { opacity: 0, x: -8 },
  animate: {
    opacity: 1,
    x: 0,
    transition: { duration: duration.fast, ease: easing.out },
  },
};

/** Container with staggered children — 50ms stagger per Emil (30-80ms range) */
export const staggerContainer: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05,
    },
  },
};

/** Stagger item */
export const staggerItem: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.normal, ease: easing.out },
  },
};

/** Slide in from right — for side panels */
export const slideInRight: Variants = {
  initial: { x: '100%' },
  animate: {
    x: 0,
    transition: { duration: duration.slow, ease: easing.drawer },
  },
  exit: {
    x: '100%',
    transition: { duration: duration.exitSlow, ease: easing.in },
  },
};

// ── Utility Interactions ────────────────────────────────────────────────────

/** Press scale — 0.97 per Emil, with 100-160ms feedback */
export const pressScale = {
  whileTap: { scale: 0.97 },
  transition: { duration: duration.press, ease: easing.out },
};

/** Hover lift — subtle, only on pointer devices */
export const hoverLift = {
  whileHover: { y: -2, transition: { duration: duration.micro, ease: easing.out } },
};

/** Hover glow — for interactive elements */
export const hoverGlow = {
  whileHover: {
    boxShadow: '0 0 20px rgba(217, 119, 87, 0.15)',
    transition: { duration: duration.fast, ease: easing.out },
  },
};

/** Slow pulse for processing states — 3s cycle, ease-in-out */
export const pulse: Variants = {
  animate: {
    opacity: [0.4, 1, 0.4],
    transition: {
      duration: 2.5,
      repeat: Infinity,
      ease: easing.inOut,
    },
  },
};

/** Breathing glow — for active status indicators */
export const breathingGlow: Variants = {
  animate: {
    scale: [1, 1.2, 1],
    opacity: [0.6, 1, 0.6],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: easing.inOut,
    },
  },
};

/** Score counter — for animating numbers in */
export const scoreReveal: Variants = {
  initial: { opacity: 0, scale: 0.8, filter: 'blur(4px)' },
  animate: {
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
    transition: { duration: duration.moderate, ease: easing.out },
  },
};

/** Card hover — lift with shadow */
export const cardHover = {
  whileHover: {
    y: -3,
    boxShadow: '0 8px 30px rgba(19, 19, 20, 0.08)',
    transition: { duration: duration.fast, ease: easing.out },
  },
};

/** Shimmer sweep — for loading states */
export const shimmerSweep: Variants = {
  animate: {
    backgroundPosition: ['200% 0', '-200% 0'],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

// ── Legacy spring exports (kept for compatibility) ──────────────────────────
export const spring = {
  snappy: springPreset.snappy as unknown as Transition,
  smooth: springPreset.responsive as unknown as Transition,
  gentle: springPreset.gentle as unknown as Transition,
  bounce: springPreset.bouncy as unknown as Transition,
};
