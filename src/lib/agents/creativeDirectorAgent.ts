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
You must evaluate each concept internally based on how it fits the image spacing (faces, products) and matches the aesthetic tone. 
- Concept A should focus on Premium/Luxury (e.g., generous whitespace, delicate alignment).
- Concept B should focus on Editorial/Lifestyle (e.g., text overlap boundaries, asymmetric balance).
- Concept C should focus on Commercial/Conversion (e.g., clear CTA prominence, bold highlights).
Score each out of 100, select the highest-scoring concept as the winner, and return the complete layout strategy.
Output strictly JSON conforming to the schema.`;

  const prompt = `
USER INTENT: "${userIntent}"

VISION ANALYSIS DETAILS:
- Image Dimensions: ${vision.width}x${vision.height} (Aspect: ${vision.aspectRatio})
- Classification: ${vision.designStyleClassification}
- Dominant Colors: ${vision.dominantColors.join(', ')}
- Composition: ${vision.compositionStyle}
- Visual Density: ${vision.visualDensity}
- Face Regions Count: ${vision.faceRegions.length}
- Product Regions Count: ${vision.productRegions.length}
- Empty Zones Count: ${vision.emptyRegions.length}

Generate 3 concepts (A, B, C), score them, and output the selected winner.
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
