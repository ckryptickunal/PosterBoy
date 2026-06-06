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
    overall:        { type: 'INTEGER', description: 'Weighted overall score 0-100. DO NOT average — weight face_safety and product_safety most heavily.' },

    issues: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description: 'Specific violations detected. Must reference element IDs and coordinates where possible.'
    },
    fixes: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description: 'Targeted, actionable repair instructions for the Repair Agent. Each fix must name the element and the coordinate adjustment.'
    }
  },
  required: [
    'face_safety', 'product_safety', 'contrast', 'hierarchy',
    'typography', 'composition', 'balance', 'whitespace', 'overall',
    'issues', 'fixes'
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

SCORING RULES:
- face_safety: If ANY text element visually overlaps a human face, score MUST be below 30.
- product_safety: If ANY text element visually overlaps the main product, score MUST be below 30.
- contrast: Check text readability. White text on white background = 0. High contrast = 100.
- hierarchy: Headline must be visually dominant. CTA must be clearly clickable. Hierarchy 100 = instantly readable top-to-bottom.
- typography: Assess font size ratios, weight differentiation, and letter spacing appropriateness.
- composition: Assess overall visual balance, golden ratio alignment, and spatial harmony.
- balance: Is visual weight evenly distributed, or is one corner overloaded?
- whitespace: Is negative space intentional and generous, or cramped and cluttered?
- overall: Weighted score — face_safety and product_safety failures drag this below 60 regardless of other scores.

You MUST provide specific, coordinate-referenced fixes for the Repair Agent (e.g., "Move headline from y=72 to y=15 to clear face region at y=40-80").

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
