/**
 * Visual Diff Engine — PosterBoy V4
 * ════════════════════════════════════════════
 * Pure code. No LLM. Deterministic comparison.
 *
 * Compares two layout states and reports exactly what changed:
 *   - Position changes (placement moved)
 *   - Token changes (spacing, colors, scrim)
 *   - CSS override changes
 *   - Score changes per element
 *
 * This gives the system awareness of WHAT changed between iterations,
 * instead of just "a new layout appeared".
 */

import { WebLayoutOutput, SectionDefinition, DesignTokens } from '@/types/agents';
import { DesignStateSummary } from './designState';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PlacementDiff {
  elementId: string;
  from: string;
  to: string;
}

export interface TokenDiff {
  property: string;
  from: string;
  to: string;
}

export interface CssOverrideDiff {
  elementId: string;
  property: string;
  from: string | null;
  to: string | null;
  action: 'added' | 'changed' | 'removed';
}

export interface ScoreDiff {
  elementId: string;
  from: number;
  to: number;
  delta: number;
  improved: boolean;
  statusChange: string | null;  // e.g., "poor → good" or null if unchanged
}

export interface VisualDiffResult {
  iteration: { from: number; to: number };
  globalScoreDelta: number;
  placementChanges: PlacementDiff[];
  tokenChanges: TokenDiff[];
  cssOverrideChanges: CssOverrideDiff[];
  scoreChanges: ScoreDiff[];
  summary: string;  // Human-readable one-liner
  totalChanges: number;
  regression: boolean;  // Did any element get worse?
  regressionDetails: string[];
}

// ── Diff Functions ────────────────────────────────────────────────────────────

function diffTokens(before: DesignTokens, after: DesignTokens): TokenDiff[] {
  const diffs: TokenDiff[] = [];
  const keys: (keyof DesignTokens)[] = [
    'primaryColor', 'secondaryColor', 'textColor', 'accentColor',
    'backgroundColor', 'spacing', 'borderRadius', 'textShadow', 'scrimOpacity',
  ];
  for (const key of keys) {
    const bVal = String(before[key]);
    const aVal = String(after[key]);
    if (bVal !== aVal) {
      diffs.push({ property: key, from: bVal, to: aVal });
    }
  }
  return diffs;
}

function diffPlacements(before: SectionDefinition[], after: SectionDefinition[]): PlacementDiff[] {
  const diffs: PlacementDiff[] = [];
  const beforeMap = new Map(before.map(s => [s.id, s]));
  for (const section of after) {
    const prev = beforeMap.get(section.id);
    if (prev && prev.placement !== section.placement) {
      diffs.push({
        elementId: section.id,
        from: prev.placement,
        to: section.placement,
      });
    }
  }
  return diffs;
}

function diffCssOverrides(before: SectionDefinition[], after: SectionDefinition[]): CssOverrideDiff[] {
  const diffs: CssOverrideDiff[] = [];
  const beforeMap = new Map(before.map(s => [s.id, s]));

  for (const section of after) {
    const prev = beforeMap.get(section.id);
    const prevOverrides = prev?.cssOverrides || {};
    const newOverrides = section.cssOverrides || {};

    // Check for added/changed
    for (const [prop, val] of Object.entries(newOverrides)) {
      if (!(prop in prevOverrides)) {
        diffs.push({ elementId: section.id, property: prop, from: null, to: val, action: 'added' });
      } else if (prevOverrides[prop] !== val) {
        diffs.push({ elementId: section.id, property: prop, from: prevOverrides[prop], to: val, action: 'changed' });
      }
    }

    // Check for removed
    for (const [prop, val] of Object.entries(prevOverrides)) {
      if (!(prop in newOverrides)) {
        diffs.push({ elementId: section.id, property: prop, from: val, to: null, action: 'removed' });
      }
    }
  }

  return diffs;
}

function diffScores(
  before: DesignStateSummary,
  after: DesignStateSummary,
): ScoreDiff[] {
  const diffs: ScoreDiff[] = [];
  const beforeMap = new Map(before.elements.map(e => [e.id, e]));

  for (const el of after.elements) {
    const prev = beforeMap.get(el.id);
    if (!prev) continue;
    const delta = el.score - prev.score;
    const statusChanged = prev.status !== el.status;
    diffs.push({
      elementId: el.id,
      from: prev.score,
      to: el.score,
      delta,
      improved: delta > 0,
      statusChange: statusChanged ? `${prev.status} → ${el.status}` : null,
    });
  }

  return diffs;
}

// ── Main Diff ─────────────────────────────────────────────────────────────────

export function computeVisualDiff(
  beforeLayout: WebLayoutOutput,
  afterLayout: WebLayoutOutput,
  beforeState: DesignStateSummary,
  afterState: DesignStateSummary,
): VisualDiffResult {
  const placementChanges = diffPlacements(beforeLayout.sections, afterLayout.sections);
  const tokenChanges = diffTokens(beforeLayout.designTokens, afterLayout.designTokens);
  const cssOverrideChanges = diffCssOverrides(beforeLayout.sections, afterLayout.sections);
  const scoreChanges = diffScores(beforeState, afterState);

  const globalScoreDelta = afterState.globalScore - beforeState.globalScore;
  const regressions = scoreChanges.filter(d => d.delta < -5);  // element lost > 5 points
  const improvements = scoreChanges.filter(d => d.delta > 0);

  const totalChanges = placementChanges.length + tokenChanges.length + cssOverrideChanges.length;

  // Build summary
  const parts: string[] = [];
  if (placementChanges.length > 0) {
    parts.push(`${placementChanges.length} placement${placementChanges.length > 1 ? 's' : ''} moved`);
  }
  if (tokenChanges.length > 0) {
    parts.push(`${tokenChanges.length} token${tokenChanges.length > 1 ? 's' : ''} adjusted`);
  }
  if (cssOverrideChanges.length > 0) {
    parts.push(`${cssOverrideChanges.length} CSS override${cssOverrideChanges.length > 1 ? 's' : ''}`);
  }
  if (improvements.length > 0) {
    parts.push(`${improvements.length} element${improvements.length > 1 ? 's' : ''} improved`);
  }
  if (regressions.length > 0) {
    parts.push(`${regressions.length} regression${regressions.length > 1 ? 's' : ''}`);
  }
  parts.push(`score ${globalScoreDelta >= 0 ? '+' : ''}${globalScoreDelta}`);

  return {
    iteration: { from: beforeState.iteration, to: afterState.iteration },
    globalScoreDelta,
    placementChanges,
    tokenChanges,
    cssOverrideChanges,
    scoreChanges,
    summary: parts.join(', '),
    totalChanges,
    regression: regressions.length > 0,
    regressionDetails: regressions.map(r => `${r.elementId}: ${r.from} → ${r.to} (${r.delta})`),
  };
}

export default computeVisualDiff;
