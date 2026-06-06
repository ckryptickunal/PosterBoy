import { callAgent } from './gemini';
import { LayoutOutput, CriticOutput } from '@/types/agents';

// ── Category-scored critic output schema ──────────────────────────────────────
const CriticOutputSchema = {
  type: 'OBJECT',
  properties: {
    // Category scores
    face_safety:    { type: 'INTEGER', description: '0-100: Are text elements clear of all face regions? 100 = fully clear.' },
    product_safety: { type: 'INTEGER', description: '0-100: Are text elements clear of all product regions? 100 = fully clear.' },
    contrast:       { type: 'INTEGER', description: '0-100: Is text legible against the background? 100 = excellent contrast.' },
    hierarchy:      { type: 'INTEGER', description: '0-100: Is visual reading order clear? Headline > Subheadline > CTA?' },
    typography:     { type: 'INTEGER', description: '0-100: Are font sizes, weights, and spacing appropriate?' },
    composition:    { type: 'INTEGER', description: '0-100: Is the overall visual balance and layout pleasing?' },
    balance:        { type: 'INTEGER', description: '0-100: Is visual weight distributed well across the canvas?' },
    whitespace:     { type: 'INTEGER', description: '0-100: Is negative space used intentionally? No clutter?' },
    overall:        { type: 'INTEGER', description: 'Weighted overall score 0-100. Scoring hierarchy: hierarchy (20%) + readability/contrast (20%) + composition (15%) + emotion (15%) + whitespace (10%) + typography (10%) + balance (10%). CONSTRAINT: If face_safety < 30 OR product_safety < 30, cap overall at 40 regardless of other scores.' },

    issues: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description: 'Specific violations detected. Must reference element IDs and coordinates where possible.'
    },
    fixes: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description: 'Targeted, actionable repair instructions for the Repair Agent. Each fix must name the element and the coordinate adjustment.'
    },
    // Design Cognition additions:
    criticism: {
      type: 'OBJECT',
      properties: {
        feelsWeak: { type: 'STRING', description: 'What elements or relationships feel weak?' },
        feelsCrowded: { type: 'STRING', description: 'What parts of the layout feel crowded or lack breathing room?' },
        feelsDistracting: { type: 'STRING', description: 'What elements are visually distracting or compete with the subject?' },
        feelsUnfinished: { type: 'STRING', description: 'What feels unresolved or unfinished?' },
        feelsUnbalanced: { type: 'STRING', description: 'What visual weights feel unbalanced?' },
        feelsGeneric: { type: 'STRING', description: 'What looks like a generic template or lacks intention?' },
        feelsPremium: { type: 'STRING', description: 'What elements successfully communicate a premium positioning?' }
      },
      required: ['feelsWeak', 'feelsCrowded', 'feelsDistracting', 'feelsUnfinished', 'feelsUnbalanced', 'feelsGeneric', 'feelsPremium']
    },
    aestheticScores: {
      type: 'OBJECT',
      properties: {
        visualBalance: { type: 'INTEGER', description: 'Aesthetic balance score (0-100).' },
        visualTension: { type: 'INTEGER', description: 'Aesthetic composition tension score (0-100).' },
        hierarchyClarity: { type: 'INTEGER', description: 'Clarity of the reading hierarchy (0-100).' },
        whitespaceQuality: { type: 'INTEGER', description: 'Quality and breathing room of negative space (0-100).' },
        focusPreservation: { type: 'INTEGER', description: 'Preservation of the main visual subject (0-100).' },
        brandPerception: { type: 'INTEGER', description: 'Sophistication and premium perception of the brand logo placement (0-100).' },
        readability: { type: 'INTEGER', description: 'Aesthetic legibility and readability (0-100).' },
        emotion: { type: 'INTEGER', description: 'Emotional impact and feeling created by design (0-100).' }
      },
      required: ['visualBalance', 'visualTension', 'hierarchyClarity', 'whitespaceQuality', 'focusPreservation', 'brandPerception', 'readability', 'emotion']
    }
  },
  required: [
    'face_safety', 'product_safety', 'contrast', 'hierarchy',
    'typography', 'composition', 'balance', 'whitespace', 'overall',
    'issues', 'fixes', 'criticism', 'aestheticScores'
  ]
};

export interface CategoryCriticOutput extends CriticOutput {
  face_safety: number;
  product_safety: number;
  contrast: number;
  hierarchy: number;
  typography: number;
  composition: number;
  balance: number;
  whitespace: number;
  overall: number;
}

interface CriticAgentParams {
  screenshotBase64: string;
  layout: LayoutOutput;
  rulesText: string;
}

/**
 * Critic Agent: Visually inspects the rendered layout and returns category-level scores.
 * Never returns "No issues detected" unless all 8 categories have been individually scored.
 */
export async function runCriticAgent(params: CriticAgentParams): Promise<CategoryCriticOutput> {
  const { screenshotBase64, layout, rulesText } = params;

  const systemInstruction = `You are a strict Art Director and Design Critic for an autonomous design system.

You will receive a screenshot of a rendered poster design. You MUST score ALL eight categories independently — no category may be skipped.

SCORING PHILOSOPHY:
Visual hierarchy is the OBJECTIVE. Collision avoidance is a CONSTRAINT.

You optimize for:
1. Attention flow — Does the eye move naturally from headline → subheadline → CTA?
2. Visual hierarchy — Is the headline clearly dominant? Is the reading order obvious?
3. Readability — Can all text be read instantly against the background?
4. Brand presence — Does the design feel intentional, professional, and premium?
5. Emotional impact — Does the design evoke the intended feeling?

You enforce constraints:
- face_safety and product_safety: If violated (< 30), cap overall score at 40.
- These are hard limits, not objectives. A design with perfect safety but no hierarchy scores LOW.

SCORING WEIGHTS FOR OVERALL:
- hierarchy: 20%
- contrast/readability: 20%
- composition: 15%
- emotion (via aestheticScores): 15%
- whitespace: 10%
- typography: 10%
- balance: 10%

CONSTRAINT: If face_safety < 30 OR product_safety < 30, overall MUST NOT exceed 40.

Output strictly JSON conforming to the schema.`;

  const prompt = `
CURRENT LAYOUT ELEMENT COORDINATES:
${JSON.stringify(layout.elements, null, 2)}

DESIGN CONSTITUTION RULES:
${rulesText}

Score all 8 categories. Identify every violation. Provide precise coordinate-based repair instructions.
`;

  const result = await callAgent({
    prompt,
    systemInstruction,
    images: [{
      inlineData: {
        mimeType: 'image/png',
        data: screenshotBase64.replace(/^data:image\/\w+;base64,/, '')
      }
    }],
    responseSchema: CriticOutputSchema,
    temperature: 0.1
  });

  const out = result as CategoryCriticOutput;
  // Backfill legacy .score field from overall for downstream compatibility
  out.score = out.overall ?? out.score ?? 0;
  return out;
}

export default runCriticAgent;
