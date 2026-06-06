/**
 * Micro Repair Agent — PosterBoy V4
 * ════════════════════════════════════════════
 * The constraint solver. Not a designer — a nudger.
 *
 * Given:
 *   - Current layout
 *   - Localized issues (from Issue Localization Agent)
 *   - Locked elements (must not touch)
 *   - Design state (what's already good)
 *
 * It outputs:
 *   - Micro deltas: "move headline from center to top-left"
 *   - Token adjustments: "increase scrim opacity from 0.3 to 0.55"
 *   - NEVER a full layout replacement
 *
 * Allowed actions:
 *   ✓ Move section placement (e.g., center → top-left)
 *   ✓ Adjust spacing token (tight → generous)
 *   ✓ Adjust scrim opacity
 *   ✓ Toggle text shadow
 *   ✓ Adjust colors for contrast
 *   ✓ Add CSS overrides (font-size scale, opacity, letter-spacing)
 *
 * NOT allowed:
 *   ✗ Change layout strategy
 *   ✗ Change copy text
 *   ✗ Change font families
 *   ✗ Modify locked elements
 *   ✗ Full layout regeneration
 */

import { callAgent } from './gemini';
import { WebLayoutOutput, SectionDefinition, DesignTokens } from '@/types/agents';
import { LocalizedIssue } from './issueLocalizationAgent';
import { DesignStateSummary } from '../designState';

// ── Output Schema ─────────────────────────────────────────────────────────────

const MicroRepairSchema = {
  type: 'OBJECT',
  properties: {
    repairs: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          targetElement: {
            type: 'STRING',
            description: 'Which element to modify (must NOT be locked)',
          },
          action: {
            type: 'STRING',
            enum: ['move', 'adjust_spacing', 'adjust_scrim', 'adjust_contrast', 'adjust_scale', 'toggle_shadow', 'add_css_override'],
            description: 'The type of micro repair action',
          },
          newPlacement: {
            type: 'STRING',
            enum: ['top-left', 'top-center', 'top-right', 'center-left', 'center', 'center-right', 'bottom-left', 'bottom-center', 'bottom-right'],
            description: 'New placement zone (only for "move" action)',
          },
          cssOverrides: {
            type: 'OBJECT',
            properties: {
              'font-size': { type: 'STRING', description: 'e.g., "90%", "110%"' },
              'opacity': { type: 'STRING', description: 'e.g., "0.9"' },
              'letter-spacing': { type: 'STRING', description: 'e.g., "0.05em"' },
              'margin-top': { type: 'STRING', description: 'e.g., "2%"' },
              'margin-bottom': { type: 'STRING', description: 'e.g., "2%"' },
              'padding': { type: 'STRING', description: 'e.g., "1% 3%"' },
            },
            description: 'CSS property overrides to apply (only for "add_css_override" action)',
          },
          tokenChange: {
            type: 'OBJECT',
            properties: {
              property: { type: 'STRING', description: 'Design token to change (spacing, scrimOpacity, textShadow, textColor, accentColor, borderRadius)' },
              newValue: { type: 'STRING', description: 'New value for the token' },
            },
            description: 'Design token adjustment (for adjust_* actions)',
          },
          reason: {
            type: 'STRING',
            description: 'Why this specific micro repair fixes the identified issue',
          },
          fixesIssue: {
            type: 'STRING',
            description: 'Which localized issue this repair addresses (copy the issue problem text)',
          },
        },
        required: ['targetElement', 'action', 'reason', 'fixesIssue'],
      },
    },
    confidence: {
      type: 'INTEGER',
      description: 'Confidence 0-100 that these repairs will improve the score without breaking locked elements',
    },
    expectedScoreGain: {
      type: 'INTEGER',
      description: 'Estimated points of improvement in overall score (0-30)',
    },
    changeDescription: {
      type: 'STRING',
      description: 'Human-readable one-line summary of all changes (e.g., "Moved headline to top-left, increased scrim opacity for better contrast")',
    },
  },
  required: ['repairs', 'confidence', 'expectedScoreGain', 'changeDescription'],
};

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MicroRepair {
  targetElement: string;
  action: 'move' | 'adjust_spacing' | 'adjust_scrim' | 'adjust_contrast' | 'adjust_scale' | 'toggle_shadow' | 'add_css_override';
  newPlacement?: SectionDefinition['placement'];
  cssOverrides?: Record<string, string>;
  tokenChange?: { property: string; newValue: string };
  reason: string;
  fixesIssue: string;
}

export interface MicroRepairResult {
  repairs: MicroRepair[];
  confidence: number;
  expectedScoreGain: number;
  changeDescription: string;
}

// ── Agent ─────────────────────────────────────────────────────────────────────

interface MicroRepairParams {
  layout: WebLayoutOutput;
  localizedIssues: LocalizedIssue[];
  repairPriority: string[];
  designState: DesignStateSummary;
  lockedElements: string[];
  rootCause: string;
}

export async function runMicroRepairAgent(params: MicroRepairParams): Promise<MicroRepairResult> {
  const { layout, localizedIssues, repairPriority, designState, lockedElements, rootCause } = params;

  // Only repair high-severity issues (≥ 5)
  const actionableIssues = localizedIssues.filter(iss => iss.severity >= 5);

  if (actionableIssues.length === 0) {
    return {
      repairs: [],
      confidence: 100,
      expectedScoreGain: 0,
      changeDescription: 'No actionable issues found. Design is acceptable.',
    };
  }

  const systemInstruction = `You are a Micro Repair Agent — a design constraint solver.

You are NOT a designer. You are a nudger. You make the SMALLEST possible changes to fix identified issues.

RULES:
1. You may ONLY modify elements in the repair priority list.
2. LOCKED ELEMENTS are UNTOUCHABLE. Do NOT generate repairs for them under any circumstance.
3. You CANNOT change: layout strategy, copy text, font families. Those are fixed constraints.
4. You CAN change: placement, spacing, scrim opacity, text shadow, colors, CSS overrides (scale, opacity, margins).
5. Each repair must fix EXACTLY ONE identified issue.
6. Prefer the SMALLEST change. "Move headline from center to top-left" is better than changing 5 things.
7. Order repairs by priority — fix the most severe issue first.
8. If a repair might break a locked element, do NOT apply it. Find an alternative.
9. Your confidence score should reflect how certain you are that these changes won't cause collateral damage.

Think like a senior designer making final adjustments in Figma — small, deliberate nudges.

Output strictly JSON conforming to the schema.`;

  const prompt = `
ROOT CAUSE OF DESIGN WEAKNESS:
${rootCause}

ISSUES TO FIX (sorted by severity):
${actionableIssues
  .sort((a, b) => b.severity - a.severity)
  .map((iss, i) => `  ${i + 1}. [${iss.element}] ${iss.problem} (severity: ${iss.severity}/10, metric: ${iss.metric})
     Suggested fix: ${iss.suggestedFix}`)
  .join('\n')}

REPAIR PRIORITY ORDER:
${repairPriority.join(' → ')}

CURRENT LAYOUT:
- Strategy: ${layout.strategy} (CANNOT CHANGE)
- Sections:
${layout.sections.map(s => `  ${s.id} (${s.role}) → placement: ${s.placement}${s.cssOverrides ? ` [overrides: ${JSON.stringify(s.cssOverrides)}]` : ''}`).join('\n')}
- Design Tokens:
  spacing: ${layout.designTokens.spacing}
  scrimOpacity: ${layout.designTokens.scrimOpacity}
  textShadow: ${layout.designTokens.textShadow}
  textColor: ${layout.designTokens.textColor}
  accentColor: ${layout.designTokens.accentColor}
  borderRadius: ${layout.designTokens.borderRadius}

LOCKED ELEMENTS (DO NOT TOUCH):
${lockedElements.length > 0 ? lockedElements.map(id => `  ✓ ${id} — locked, performing well`).join('\n') : '  None'}

DESIGN STATE:
${designState.elements.map(e => `  ${e.id}: score=${e.score} status=${e.status} locked=${e.locked}`).join('\n')}

Generate the minimal set of micro repairs to fix these issues. Each repair must target a specific element and a specific issue.
`;

  const result = await callAgent({
    prompt,
    systemInstruction,
    responseSchema: MicroRepairSchema,
    temperature: 0.2,
  });

  const repairResult = result as MicroRepairResult;

  // Post-process: filter out any repairs targeting locked elements (safety check)
  repairResult.repairs = repairResult.repairs.filter(r => !lockedElements.includes(r.targetElement));

  return repairResult;
}

export default runMicroRepairAgent;
