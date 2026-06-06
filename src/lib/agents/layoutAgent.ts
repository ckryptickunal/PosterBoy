import { callAgent } from './gemini';
import { VisionAnalysis, CopywriterOutput, TypographyTokens, LayoutOutput, LayoutElement } from '@/types/agents';

const LayoutElementSchema = {
  type: 'OBJECT',
  properties: {
    id: { type: 'STRING', description: 'Unique identifier, e.g. "headline", "subheadline", "cta", "bg_overlay", "logo"' },
    type: { 
      type: 'STRING', 
      enum: ['headline', 'subheadline', 'cta', 'supporting_text', 'divider', 'shape', 'icon', 'badge', 'logo'],
      description: 'Element classification'
    },
    text: { type: 'STRING', description: 'The actual text string to render. Keep blank for shapes/dividers.' },
    x: { type: 'NUMBER', description: 'Left coordinate as percentage of canvas width (0-100)' },
    y: { type: 'NUMBER', description: 'Top coordinate as percentage of canvas height (0-100)' },
    width: { type: 'NUMBER', description: 'Width as percentage of canvas width (0-100)' },
    height: { type: 'NUMBER', description: 'Height as percentage of canvas height (0-100)' },
    rotation: { type: 'NUMBER', description: 'Degrees of rotation (typically 0, unless diagonal/slanted is desired)' },
    zIndex: { type: 'INTEGER', description: 'Layer order (e.g. background shapes 1, text elements 10, CTA/logos 20)' },
    color: { type: 'STRING', description: 'Hex code for text/background fill. Pick from dominant colors or use contrast fallbacks (e.g. #FFFFFF, #000000).' }
  },
  required: ['id', 'type', 'x', 'y', 'width', 'height', 'rotation', 'zIndex']
};

const LayoutOutputSchema = {
  type: 'OBJECT',
  properties: {
    elements: {
      type: 'ARRAY',
      items: LayoutElementSchema,
      description: 'List of elements positioned on the canvas. Must include headline, subheadline, cta, and optionally shapes/logos.'
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
 * Layout Agent: Generates coordinate coordinates for design elements.
 */
export async function runLayoutAgent(params: LayoutAgentParams): Promise<LayoutOutput> {
  const { vision, copy, typography, rulesText, memoryExamples } = params;

  // Format few-shot examples from database layout memory
  const memoryText = memoryExamples.length > 0 
    ? memoryExamples.map((ex, idx) => `
EXAMPLE #${idx+1} [Style: ${ex.style}, Image: ${ex.image_type}, Score: ${ex.score}]:
${JSON.stringify(JSON.parse(ex.layout_json), null, 2)}
`).join('\n')
    : 'No layout memory examples found yet. Start with standard layout rules.';

  const systemInstruction = `You are a professional Art Director and Layout Architect.
Your task is to place the generated copy blocks, CTAs, and logo containers on the canvas using an absolute percentage coordinate system (0 to 100).
- (0, 0) is top-left, (100, 100) is bottom-right.
- The reference canvas size is 1000px wide. Keep in mind that element sizes are represented as percentage width/height (0-100).
- Headline size is ${typography.headlineSize}px, Subheadline: ${typography.subheadlineSize}px, CTA: ${typography.ctaSize}px, Body: ${typography.bodySize}px.
- Use text length to calculate appropriate width/height percentages. A 10-word headline at ${typography.headlineSize}px will take roughly 50-70% width and 15-20% height.

CRITICAL DESIGN RULES (from Design Constitution):
${rulesText}

IMAGE REGION SEGMENTATION (Do not overlap content elements with faces or products!):
- Face Regions (FORBIDDEN): ${JSON.stringify(vision.faceRegions)}
- Product Regions (FORBIDDEN): ${JSON.stringify(vision.productRegions)}
- Empty Zones (RECOMMENDED for text): ${JSON.stringify(vision.emptyRegions)}
- Safe Text Regions: ${JSON.stringify(vision.safeTextRegions)}
- Logo Safe Regions: ${JSON.stringify(vision.logoSafeRegions)}

Output strictly JSON matching the response schema. Never generate HTML or CSS styles.`;

  const prompt = `
GENERATE COORDINATES FOR THESE ELEMENTS:
1. Headline ("${copy.headline}"): type: "headline", font: "${typography.displayFont}"
2. Subheadline ("${copy.subheadline}"): type: "subheadline", font: "${typography.bodyFont}"
3. CTA Button ("${copy.cta}"): type: "cta", font: "${typography.bodyFont}"
${copy.supportingText ? `4. Supporting Text ("${copy.supportingText}"): type: "supporting_text", font: "${typography.bodyFont}"` : ''}
5. Logo container (if requested by style): type: "logo"

DOMINANT COLORS:
${vision.dominantColors.join(', ')}

DESIGN STYLE: ${vision.designStyleClassification}
TEXT ALIGNMENT: ${typography.alignment}

LAYOUT MEMORY (PROVED WORKABLE PATTERNS):
${memoryText}

Place elements strategically inside empty/safe regions, keeping the 8% margins. Ensure no overlaps occur between elements.
`;

  const result = await callAgent({
    prompt,
    systemInstruction,
    responseSchema: LayoutOutputSchema,
    temperature: 0.2
  });

  return result as LayoutOutput;
}

export default runLayoutAgent;
