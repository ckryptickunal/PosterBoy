/**
 * Design State Store — PosterBoy V4
 * ══════════════════════════════════════════
 * Tracks per-element state across optimization iterations.
 *
 * Every element has:
 *   - score (0-100)
 *   - status: 'excellent' | 'good' | 'acceptable' | 'poor' | 'failing'
 *   - locked: boolean (if score ≥ LOCK_THRESHOLD, element cannot be modified)
 *   - history: array of past scores + reasoning
 *
 * The state store is the memory of what the system has already gotten right.
 * The Micro Repair Agent reads the state to know what NOT to touch.
 */

import { WebLayoutOutput, SectionDefinition, DesignTokens } from '@/types/agents';

// ── Constants ─────────────────────────────────────────────────────────────────

const LOCK_THRESHOLD = 85;       // Lock element if score ≥ 85
const UNLOCK_THRESHOLD = 70;     // Unlock if score drops below 70 (due to collateral damage)
const EXCELLENT_THRESHOLD = 90;
const GOOD_THRESHOLD = 80;
const ACCEPTABLE_THRESHOLD = 65;
const POOR_THRESHOLD = 50;

// ── Types ─────────────────────────────────────────────────────────────────────

export type ElementStatus = 'excellent' | 'good' | 'acceptable' | 'poor' | 'failing';

export interface ElementHistoryEntry {
  iteration: number;
  score: number;
  status: ElementStatus;
  issues: string[];
  action: 'initial' | 'repaired' | 'locked' | 'unlocked' | 'unchanged';
  reasoning: string;
}

export interface ElementState {
  elementId: string;              // 'headline', 'subheadline', 'cta', 'logo', 'supporting', etc.
  role: SectionDefinition['role'];
  score: number;                  // Current score 0-100
  status: ElementStatus;
  locked: boolean;                // If true, the repair agent must NOT modify this element
  lockedSince: number | null;     // Iteration when locked (null if unlocked)
  history: ElementHistoryEntry[];
  currentPlacement: SectionDefinition['placement'];
  currentCssOverrides: Record<string, string>;
}

export interface DesignState {
  jobId: string;
  iteration: number;
  elements: Map<string, ElementState>;
  strategy: WebLayoutOutput['strategy'];
  designTokens: DesignTokens;
  globalScore: number;
  tokenHistory: Array<{
    iteration: number;
    tokens: DesignTokens;
    reason: string;
  }>;
}

export interface DesignStateSummary {
  iteration: number;
  globalScore: number;
  lockedCount: number;
  unlockedCount: number;
  failingElements: string[];
  poorElements: string[];
  excellentElements: string[];
  elements: Array<{
    id: string;
    score: number;
    status: ElementStatus;
    locked: boolean;
  }>;
}

// ── Status Calculation ────────────────────────────────────────────────────────

function scoreToStatus(score: number): ElementStatus {
  if (score >= EXCELLENT_THRESHOLD) return 'excellent';
  if (score >= GOOD_THRESHOLD) return 'good';
  if (score >= ACCEPTABLE_THRESHOLD) return 'acceptable';
  if (score >= POOR_THRESHOLD) return 'poor';
  return 'failing';
}

// ── Design State Store ────────────────────────────────────────────────────────

export class DesignStateStore {
  private state: DesignState;

  constructor(jobId: string, layout: WebLayoutOutput) {
    this.state = {
      jobId,
      iteration: 0,
      elements: new Map(),
      strategy: layout.strategy,
      designTokens: { ...layout.designTokens },
      globalScore: 0,
      tokenHistory: [{
        iteration: 0,
        tokens: { ...layout.designTokens },
        reason: 'Initial layout generation',
      }],
    };

    // Initialize element states from layout sections
    for (const section of layout.sections) {
      this.state.elements.set(section.id, {
        elementId: section.id,
        role: section.role,
        score: 0,
        status: 'failing',
        locked: false,
        lockedSince: null,
        history: [],
        currentPlacement: section.placement,
        currentCssOverrides: section.cssOverrides || {},
      });
    }
  }

  // ── Core Operations ───────────────────────────────────────────────────────

  /**
   * Update element scores from a Critic evaluation.
   * Automatically locks/unlocks elements based on thresholds.
   */
  updateScores(
    elementScores: Array<{ elementId: string; score: number; issues: string[] }>,
    globalScore: number,
    iteration: number,
  ): { locked: string[]; unlocked: string[]; unchanged: string[] } {
    this.state.iteration = iteration;
    this.state.globalScore = globalScore;

    const locked: string[] = [];
    const unlocked: string[] = [];
    const unchanged: string[] = [];

    for (const es of elementScores) {
      const el = this.state.elements.get(es.elementId);
      if (!el) continue;

      const prevScore = el.score;
      const prevLocked = el.locked;
      el.score = es.score;
      el.status = scoreToStatus(es.score);

      // Auto-lock: score crossed LOCK_THRESHOLD upward
      if (!el.locked && es.score >= LOCK_THRESHOLD) {
        el.locked = true;
        el.lockedSince = iteration;
        locked.push(es.elementId);
        el.history.push({
          iteration,
          score: es.score,
          status: el.status,
          issues: es.issues,
          action: 'locked',
          reasoning: `Score ${es.score} ≥ ${LOCK_THRESHOLD}. Element locked to preserve quality.`,
        });
      }
      // Auto-unlock: locked element's score dropped below UNLOCK_THRESHOLD
      // (collateral damage from another repair)
      else if (el.locked && es.score < UNLOCK_THRESHOLD) {
        el.locked = false;
        el.lockedSince = null;
        unlocked.push(es.elementId);
        el.history.push({
          iteration,
          score: es.score,
          status: el.status,
          issues: es.issues,
          action: 'unlocked',
          reasoning: `Score dropped from ${prevScore} to ${es.score} (< ${UNLOCK_THRESHOLD}). Element unlocked for repair.`,
        });
      }
      // No lock change
      else {
        unchanged.push(es.elementId);
        el.history.push({
          iteration,
          score: es.score,
          status: el.status,
          issues: es.issues,
          action: prevScore === 0 ? 'initial' : 'unchanged',
          reasoning: el.locked
            ? `Locked element. Score ${es.score}. No modification allowed.`
            : `Score ${prevScore} → ${es.score}. Element remains unlocked.`,
        });
      }
    }

    return { locked, unlocked, unchanged };
  }

  /**
   * Apply a repair to a specific element — updates placement and overrides.
   * Refuses to apply if the element is locked.
   */
  applyRepair(
    elementId: string,
    newPlacement?: SectionDefinition['placement'],
    newCssOverrides?: Record<string, string>,
    reason?: string,
  ): boolean {
    const el = this.state.elements.get(elementId);
    if (!el) return false;

    if (el.locked) {
      console.warn(`[DesignState] Refused repair on locked element "${elementId}".`);
      return false;
    }

    if (newPlacement) el.currentPlacement = newPlacement;
    if (newCssOverrides) {
      el.currentCssOverrides = { ...el.currentCssOverrides, ...newCssOverrides };
    }

    el.history.push({
      iteration: this.state.iteration,
      score: el.score,
      status: el.status,
      issues: [],
      action: 'repaired',
      reasoning: reason || 'Micro repair applied.',
    });

    return true;
  }

  /**
   * Update design tokens (spacing, colors, scrim) — tracked in history.
   */
  updateTokens(newTokens: Partial<DesignTokens>, reason: string): void {
    this.state.designTokens = { ...this.state.designTokens, ...newTokens };
    this.state.tokenHistory.push({
      iteration: this.state.iteration,
      tokens: { ...this.state.designTokens },
      reason,
    });
  }

  // ── Queries ───────────────────────────────────────────────────────────────

  /** Get IDs of all locked elements */
  getLockedElements(): string[] {
    return Array.from(this.state.elements.values())
      .filter(e => e.locked)
      .map(e => e.elementId);
  }

  /** Get IDs of all elements that need repair (score < ACCEPTABLE_THRESHOLD) */
  getRepairCandidates(): string[] {
    return Array.from(this.state.elements.values())
      .filter(e => !e.locked && e.score < ACCEPTABLE_THRESHOLD)
      .sort((a, b) => a.score - b.score) // worst first
      .map(e => e.elementId);
  }

  /** Get full element state */
  getElement(id: string): ElementState | undefined {
    return this.state.elements.get(id);
  }

  /** Get a summary for the Micro Repair Agent prompt */
  getSummary(): DesignStateSummary {
    const elements = Array.from(this.state.elements.values());
    return {
      iteration: this.state.iteration,
      globalScore: this.state.globalScore,
      lockedCount: elements.filter(e => e.locked).length,
      unlockedCount: elements.filter(e => !e.locked).length,
      failingElements: elements.filter(e => e.status === 'failing').map(e => e.elementId),
      poorElements: elements.filter(e => e.status === 'poor').map(e => e.elementId),
      excellentElements: elements.filter(e => e.status === 'excellent').map(e => e.elementId),
      elements: elements.map(e => ({
        id: e.elementId,
        score: e.score,
        status: e.status,
        locked: e.locked,
      })),
    };
  }

  /** Build a WebLayoutOutput from current state (with all repairs applied) */
  toLayout(): WebLayoutOutput {
    const sections: SectionDefinition[] = Array.from(this.state.elements.values()).map(el => ({
      id: el.elementId,
      role: el.role,
      placement: el.currentPlacement,
      cssOverrides: Object.keys(el.currentCssOverrides).length > 0 ? el.currentCssOverrides : undefined,
    }));

    return {
      strategy: this.state.strategy,
      sections,
      designTokens: { ...this.state.designTokens },
      reasoning: {
        whyStrategy: `V4 constraint-solved layout. ${this.state.tokenHistory.length} token iterations.`,
        whyPlacements: `Element placements optimized over ${this.state.iteration} iterations.`,
        whyColors: this.state.tokenHistory[this.state.tokenHistory.length - 1]?.reason || '',
        whyHierarchy: `Locked ${this.getLockedElements().length} elements at quality threshold.`,
        whySpacing: `Spacing: ${this.state.designTokens.spacing}`,
      },
    };
  }

  /** Get the current iteration number */
  getIteration(): number {
    return this.state.iteration;
  }

  /** Get the current global score */
  getGlobalScore(): number {
    return this.state.globalScore;
  }

  /** Check if all elements are either locked or acceptable */
  isConverged(): boolean {
    return Array.from(this.state.elements.values()).every(
      e => e.locked || e.score >= ACCEPTABLE_THRESHOLD
    );
  }

  /** Get raw state for persistence */
  serialize(): object {
    return {
      ...this.state,
      elements: Object.fromEntries(this.state.elements),
    };
  }
}

export default DesignStateStore;
