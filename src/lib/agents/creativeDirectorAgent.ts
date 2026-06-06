import { callAgent } from './gemini';
import { VisionAnalysis, CreativeDirectorOutput, Concept } from '@/types/agents';

const ConceptSchema = {
  type: 'OBJECT',
  properties: {
    name: { type: 'STRING', description: 'Concept identifier: A, B, or C' },
    communicationGoal: { type: 'STRING', description: 'Clear message of what the design is trying to convey.' },
    emotionalGoal: { type: 'STRING', description: 'Feeling or mood to evoke (e.g., luxury, excitement, trust, tech sleekness).' },
    visualStrategy: { type: 'STRING', description: 'Visual style direction (e.g., High-contrast editorial, minimal luxury white-space, bold typography overlays).' },
    hierarchyStrategy: { type: 'STRING', description: 'Instruction on text element priority, reading order, and size differentiation.' },
    ctaStrategy: { type: 'STRING', description: 'Strategy for the CTA button style, placement, and impact.' },
    campaignType: { type: 'STRING', description: 'e.g. product_announcement, sale_promo, brand_awareness, quote_editorial' },
    internalScore: { type: 'INTEGER', description: 'Score out of 100 on how well this concept matches the user intent and composition' },
    rationale: { type: 'STRING', description: 'Brief reasoning for why this concept was proposed and how it scores.' }
  },
  required: [
    'name', 'communicationGoal', 'emotionalGoal', 'visualStrategy',
    'hierarchyStrategy', 'ctaStrategy', 'campaignType', 'internalScore', 'rationale'
  ]
};

const CreativeDirectorOutputSchema = {
  type: 'OBJECT',
  properties: {
    concepts: {
      type: 'ARRAY',
      items: ConceptSchema,
      description: 'Three distinct creative concepts generated based on the image analysis and user intent.'
    },
    selectedConceptName: { type: 'STRING', description: 'Must be one of "A", "B", or "C" indicating the highest scoring concept.' },
    selectedConcept: ConceptSchema
  },
  required: ['concepts', 'selectedConceptName', 'selectedConcept']
};

/**
 * Creative Director Agent: Ideates three concept directions, scores them, and picks the best.
 */
export async function runCreativeDirectorAgent(
  userIntent: string,
  vision: VisionAnalysis
): Promise<CreativeDirectorOutput> {
  const systemInstruction = `You are a Senior Creative Director. Your job is to read a client's design intent, review a Vision Analysis of their background image, and propose 3 distinct creative concepts (Concept A, B, and C).

CRITICAL RULES:
1. The USER INTENT is your creative brief. All concepts must serve that exact subject — do NOT substitute products, brands, or themes.
2. Concept A should focus on Premium/Luxury (generous whitespace, delicate alignment).
3. Concept B should focus on Editorial/Lifestyle (text-image tension, asymmetric balance).
4. Concept C should focus on Commercial/Conversion (clear CTA prominence, bold highlights).
5. Score each concept out of 100 based on fit with the image composition and user intent.
6. Output strictly JSON conforming to the schema.`;

  const prompt = `
USER INTENT (CREATIVE BRIEF — all concepts must serve this):
"${userIntent}"

VISION ANALYSIS:
- Dimensions: ${vision.width}x${vision.height} (Aspect: ${vision.aspectRatio})
- Style Classification: ${vision.designStyleClassification}
- Dominant Colors: ${vision.dominantColors.join(', ')}
- Composition: ${vision.compositionStyle}
- Visual Density: ${vision.visualDensity}
- Face Regions: ${vision.faceRegions.length}
- Product Regions: ${vision.productRegions.length}
- Empty (text-safe) Zones: ${vision.emptyRegions.length}

Generate 3 concepts (A, B, C) that are all about: "${userIntent}".
Score them, and return the selected winner.
`;

  const result = await callAgent({
    prompt,
    systemInstruction,
    responseSchema: CreativeDirectorOutputSchema,
    temperature: 0.3
  });

  return result as CreativeDirectorOutput;
}

export default runCreativeDirectorAgent;
