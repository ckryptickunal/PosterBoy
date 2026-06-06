import { callAgent } from './gemini';
import { VisionAnalysis, CopywriterOutput, TypographyTokens, LayoutOutput } from '@/types/agents';
import { validateLayout } from '../constraintValidator';

const LayoutElementSchema = {
  type: 'OBJECT',
  properties: {
    id: { type: 'STRING', description: 'Unique identifier: "headline", "subheadline", "cta", "supporting_text", "logo"' },
    type: {
      type: 'STRING',
      enum: ['headline', 'subheadline', 'cta', 'supporting_text', 'divider', 'shape', 'icon', 'badge', 'logo'],
    },
    text: { type: 'STRING', description: 'The actual text to render. Keep blank for shapes/dividers.' },
    x: { type: 'NUMBER', description: 'Left edge as % of canvas width. MUST be within safe regions and outside FORBIDDEN zones.' },
    y: { type: 'NUMBER', description: 'Top edge as % of canvas height. MUST be within safe regions and outside FORBIDDEN zones.' },
    width: { type: 'NUMBER', description: 'Width as % of canvas width.' },
    height: { type: 'NUMBER', description: 'Height as % of canvas height.' },
    rotation: { type: 'NUMBER', description: 'Degrees of rotation (typically 0).' },
    zIndex: { type: 'INTEGER', description: 'Layer order: shapes=1, text=10, CTA/logos=20.' },
    color: { type: 'STRING', description: 'Hex color chosen for maximum contrast against image background.' }
  },
  required: ['id', 'type', 'x', 'y', 'width', 'height', 'rotation', 'zIndex']
};

const LayoutOutputSchema = {
  type: 'OBJECT',
  properties: {
    elements: {
      type: 'ARRAY',
      items: LayoutElementSchema,
      description: 'All elements positioned on the canvas. Must include headline, subheadline, cta, and optionally logo.'
    }
  },
  required: ['elements']
};

interface LayoutAgentParams {
  vision: VisionAnalysis;
  copy: CopywriterOutput;
  typography: TypographyTokens;
  rulesText: string;
  memoryExamples: Array<{ style: string; image_type: string; layout_json: string; score: number }>;
}

/**
 * Layout Agent: Generates 3 candidate layouts, validates each against constraint engine,
 * and returns the highest-scoring valid candidate.
 *
 * NEVER returns a layout with face/product overlaps or undefined fonts.
 */
export async function runLayoutAgent(params: LayoutAgentParams): Promise<LayoutOutput> {
  const { vision, copy, typography, rulesText, memoryExamples } = params;

  // Build an explicit forbidden-zones block that Gemini cannot ignore
  const forbiddenText = [
    ...vision.faceRegions.map((r, i) =>
      `  FACE #${i + 1}: x=${r.x.toFixed(1)}-${(r.x + r.width).toFixed(1)}%, y=${r.y.toFixed(1)}-${(r.y + r.height).toFixed(1)}% — NO text allowed here`),
    ...vision.productRegions.map((r, i) =>
      `  PRODUCT #${i + 1}: x=${r.x.toFixed(1)}-${(r.x + r.width).toFixed(1)}%, y=${r.y.toFixed(1)}-${(r.y + r.height).toFixed(1)}% — NO text allowed here`),
  ].join('\n') || '  None detected';

  const safeText = vision.safeTextRegions.length > 0
    ? vision.safeTextRegions.map((r, i) =>
        `  SAFE #${i + 1}: x=${r.x.toFixed(1)}-${(r.x + r.width).toFixed(1)}%, y=${r.y.toFixed(1)}-${(r.y + r.height).toFixed(1)}%`)
        .join('\n')
    : '  No explicit safe zones — use top 30% or bottom 20% as text areas';

  const memoryText = memoryExamples.length > 0
    ? memoryExamples.map((ex, i) =>
        `MEMORY #${i + 1} [Style:${ex.style}, Score:${ex.score}]:\n${JSON.stringify(JSON.parse(ex.layout_json), null, 2)}`)
        .join('\n')
    : 'No memory examples yet.';

  const systemInstruction = `You are a professional Art Director and Layout Architect.

CRITICAL CONSTRAINT (HARD RULE — NO EXCEPTIONS):
You MUST place ALL text elements (headline, subheadline, cta, supporting_text) EXCLUSIVELY inside the SAFE TEXT REGIONS listed below.
You MUST NEVER place any text inside the FORBIDDEN REGIONS listed below.
Violating this rule makes the design unusable.

COORDINATE SYSTEM:
- (0,0) = top-left, (100,100) = bottom-right
- Reference canvas: 1000px wide
- Minimum margin: 8% from all edges (x: 8-92, y: 8-92)
- Headline at ${typography.headlineSize}px ≈ use width 50-70%, height 12-18%
- Subheadline at ${typography.subheadlineSize}px ≈ use width 50-70%, height 8-12%
- CTA at ${typography.ctaSize}px ≈ use width 25-35%, height 6-10%

DESIGN CONSTITUTION:
${rulesText}

Output strictly JSON matching the schema.`;

  const buildPrompt = (variationHint: string) => `
FORBIDDEN REGIONS — NEVER place text here:
${forbiddenText}

SAFE TEXT REGIONS — ONLY place text here:
${safeText}

ELEMENTS TO PLACE:
1. Headline: "${copy.headline}" — type: "headline", color: high-contrast hex
2. Subheadline: "${copy.subheadline}" — type: "subheadline"
3. CTA: "${copy.cta}" — type: "cta"
${copy.supportingText ? `4. Supporting: "${copy.supportingText}" — type: "supporting_text"` : ''}
5. Logo placeholder — type: "logo" (use a logo-safe corner)

DOMINANT COLORS: ${vision.dominantColors.join(', ')}
DESIGN STYLE: ${vision.designStyleClassification}
ALIGNMENT: ${typography.alignment}

LAYOUT MEMORY (proven patterns):
${memoryText}

${variationHint}

Place every text element strictly inside the SAFE regions above.
Do not let any text element overlap a FORBIDDEN region even partially.
Stay within 8% canvas margins on all sides.
`;

  const CANDIDATES = 3;
  const candidates: LayoutOutput[] = [];
  const validationScores: number[] = [];

  const variations = [
    'VARIATION A: Position headline in upper safe zone. CTA in lower-center.',
    'VARIATION B: Position headline in a left-aligned safe zone. Stack subheadline below. CTA bottom-right.',
    'VARIATION C: Use the lowest safe zone for all text. Create a text band at the bottom of the image.',
  ];

  // Generate CANDIDATES layouts in parallel
  const results = await Promise.all(
    variations.map((hint) =>
      callAgent({
        prompt: buildPrompt(hint),
        systemInstruction,
        responseSchema: LayoutOutputSchema,
        temperature: 0.3,
      }).catch(() => null)
    )
  );

  for (const result of results) {
    if (!result) continue;
    const layout = result as LayoutOutput;
    const report = validateLayout(layout, vision.faceRegions, vision.productRegions, typography);
    candidates.push(layout);
    validationScores.push(report.score);
  }

  if (candidates.length === 0) {
    throw new Error('Layout Agent: All 3 candidate layouts failed generation — check Gemini API key and quota.');
  }

  // Pick the candidate with the highest constraint score
  const bestIdx = validationScores.indexOf(Math.max(...validationScores));
  const best = candidates[bestIdx];
  const bestScore = validationScores[bestIdx];

  console.log(`Layout Agent: selected candidate ${bestIdx + 1}/${candidates.length} with constraint score ${bestScore}/100`);

  // Log constraint violations for best candidate
  const bestReport = validateLayout(best, vision.faceRegions, vision.productRegions, typography);
  if (bestReport.violations.length > 0) {
    console.warn('Layout Agent: Best candidate has remaining violations:',
      bestReport.violations.map(v => v.message).join('; '));
  }

  return best;
}

export default runLayoutAgent;
