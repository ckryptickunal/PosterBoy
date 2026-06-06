/**
 * Issue Localization Agent — PosterBoy V4
 * ════════════════════════════════════════════
 * The missing brain between Critic and Repair.
 *
 * Instead of:
 *   Score = 62 → Generate another layout
 *
 * It outputs:
 *   headline → too close to necklace → severity 8
 *   cta → weak contrast → severity 6
 *
 * The repair then becomes:
 *   Move headline up 4%, Increase CTA contrast
 *   NOT: Generate another layout.
 */

import { callAgent } from './gemini';
import { CategoryCriticOutput } from './criticAgent';
import { WebLayoutOutput } from '@/types/agents';
import { DesignStateSummary } from '../designState';

// ── Output Schema ─────────────────────────────────────────────────────────────

const LocalizedIssueSchema = {
  type: 'OBJECT',
  properties: {
    issues: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          element: {
            type: 'STRING',
            enum: ['headline', 'subheadline', 'cta', 'logo', 'supporting', 'spacer', 'trust-markers', 'scrim', 'spacing', 'tokens'],
            description: 'Which specific element caused this issue',
          },
          problem: {
            type: 'STRING',
            description: 'Precise description of what is wrong with THIS element (e.g., "headline overlaps product region", "CTA text has insufficient contrast against dark scrim")',
          },
          metric: {
            type: 'STRING',
            enum: ['contrast', 'readability', 'hierarchy', 'spacing', 'overlap', 'balance', 'prominence', 'alignment', 'scale'],
            description: 'Which design metric this issue violates',
          },
          severity: {
            type: 'INTEGER',
            description: 'Severity from 1 (minor nitpick) to 10 (design-breaking). Only issues ≥ 5 should trigger repair.',
          },
          suggestedFix: {
            type: 'STRING',
            description: 'The smallest possible change to fix THIS specific issue. Must be a single atomic action (e.g., "move headline to top-left", "increase scrim opacity to 0.6", "reduce headline size by 15%"). Never suggest regenerating the layout.',
          },
          affectedScore: {
            type: 'STRING',
            enum: ['face_safety', 'product_safety', 'contrast', 'hierarchy', 'typography', 'composition', 'balance', 'whitespace'],
            description: 'Which Critic category score this issue primarily drags down',
          },
        },
        required: ['element', 'problem', 'metric', 'severity', 'suggestedFix', 'affectedScore'],
      },
    },
    rootCause: {
      type: 'STRING',
      description: 'The single deepest root cause of the design\'s weaknesses (e.g., "headline and product compete for the same visual zone", "spacing is too tight throughout"). This should explain WHY the issues exist, not just list them.',
    },
    repairPriority: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description: 'Ordered list of element IDs to repair, from highest priority to lowest. Only include elements that need repair (severity ≥ 5).',
    },
  },
  required: ['issues', 'rootCause', 'repairPriority'],
};

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LocalizedIssue {
  element: string;
  problem: string;
  metric: string;
  severity: number;
  suggestedFix: string;
  affectedScore: string;
}

export interface IssueLocalizationResult {
  issues: LocalizedIssue[];
  rootCause: string;
  repairPriority: string[];
}

// ── Agent ─────────────────────────────────────────────────────────────────────

interface IssueLocalizationParams {
  criticResult: CategoryCriticOutput;
  layout: WebLayoutOutput;
  designState: DesignStateSummary;
  lockedElements: string[];
}

export async function runIssueLocalizationAgent(params: IssueLocalizationParams): Promise<IssueLocalizationResult> {
  const { criticResult, layout, designState, lockedElements } = params;

  const systemInstruction = `You are an Issue Localization Agent for a design system.

Your ONLY job is to take a Critic's evaluation and precisely identify WHICH ELEMENTS caused WHICH PROBLEMS.

You are not a designer. You are a diagnostic tool. You identify root causes.

CRITICAL RULES:
1. Every issue must name a SPECIFIC ELEMENT (headline, subheadline, cta, etc.)
2. Every issue must describe the EXACT PROBLEM (not "looks bad" but "headline overlaps product bounding box at center-right")
3. Every suggested fix must be the SMALLEST POSSIBLE CHANGE — never suggest "regenerate layout"
4. LOCKED elements (listed below) must NEVER appear in your repair priority list. They are already good.
5. Severity scale:
   - 1-4: Minor (don't repair, just note)
   - 5-7: Moderate (repair if budget allows)
   - 8-10: Critical (must repair immediately)
6. If the Critic scores are mostly good (overall ≥ 85), return FEWER issues. Don't invent problems.
7. The root cause should be a single sentence explaining the DEEPEST reason for the design's weakness.

Output strictly JSON conforming to the schema.`;

  const prompt = `
CRITIC SCORES:
- Face Safety: ${criticResult.face_safety}/100
- Product Safety: ${criticResult.product_safety}/100
- Contrast: ${criticResult.contrast}/100
- Hierarchy: ${criticResult.hierarchy}/100
- Typography: ${criticResult.typography}/100
- Composition: ${criticResult.composition}/100
- Balance: ${criticResult.balance}/100
- Whitespace: ${criticResult.whitespace}/100
- Overall: ${criticResult.overall}/100

CRITIC ISSUES:
${criticResult.issues.map((iss, i) => `  ${i + 1}. ${iss}`).join('\n')}

CRITIC FIXES SUGGESTED:
${criticResult.fixes.map((fix, i) => `  ${i + 1}. ${fix}`).join('\n')}

CRITIC QUALITATIVE FEEDBACK:
- Feels weak: ${criticResult.criticism?.feelsWeak || 'N/A'}
- Feels crowded: ${criticResult.criticism?.feelsCrowded || 'N/A'}
- Feels distracting: ${criticResult.criticism?.feelsDistracting || 'N/A'}
- Feels unfinished: ${criticResult.criticism?.feelsUnfinished || 'N/A'}
- Feels unbalanced: ${criticResult.criticism?.feelsUnbalanced || 'N/A'}
- Feels generic: ${criticResult.criticism?.feelsGeneric || 'N/A'}
- Feels premium: ${criticResult.criticism?.feelsPremium || 'N/A'}

CURRENT LAYOUT:
- Strategy: ${layout.strategy}
- Sections: ${layout.sections.map(s => `${s.id} (${s.role}) → ${s.placement}`).join(', ')}
- Spacing: ${layout.designTokens.spacing}
- Scrim Opacity: ${layout.designTokens.scrimOpacity}
- Text Shadow: ${layout.designTokens.textShadow}
- Text Color: ${layout.designTokens.textColor}
- Accent Color: ${layout.designTokens.accentColor}

DESIGN STATE:
- Iteration: ${designState.iteration}
- Global Score: ${designState.globalScore}
- Elements: ${designState.elements.map(e => `${e.id}: score=${e.score} status=${e.status} locked=${e.locked}`).join(', ')}

LOCKED ELEMENTS (DO NOT SUGGEST REPAIRS FOR THESE):
${lockedElements.length > 0 ? lockedElements.join(', ') : 'None — all elements are unlocked.'}

Localize every issue to a specific element. Suggest the smallest possible fix for each.
`;

  const result = await callAgent({
    prompt,
    systemInstruction,
    responseSchema: LocalizedIssueSchema,
    temperature: 0.15,
  });

  // Post-process: filter out any issues targeting locked elements
  const filtered = (result as IssueLocalizationResult);
  filtered.issues = filtered.issues.filter(iss => !lockedElements.includes(iss.element));
  filtered.repairPriority = filtered.repairPriority.filter(id => !lockedElements.includes(id));

  return filtered;
}

export default runIssueLocalizationAgent;
