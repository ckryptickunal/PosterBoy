import { callAgent } from './gemini';
import { VisionAnalysis, Concept, CopywriterOutput } from '@/types/agents';

const CopywriterOutputSchema = {
  type: 'OBJECT',
  properties: {
    headline: {
      type: 'STRING',
      description: 'The primary headline. Must be strictly 10 words or fewer. Must directly relate to the USER INTENT provided.'
    },
    subheadline: {
      type: 'STRING',
      description: 'A supporting subheadline that expands on the headline (1-2 sentences). Must stay on-topic with the user intent.'
    },
    cta: {
      type: 'STRING',
      description: 'Call-to-action text. Keep it under 4 words. Must relate to the campaign (e.g. "Shop Collection", "Discover More", "Explore Now").'
    },
    supportingText: {
      type: 'STRING',
      description: 'Optional secondary body copy or details like date, website URL, or minor callouts. Must relate to the campaign.'
    },
    disclaimers: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description: 'Optional legal fine-print or minor conditions.'
    }
  },
  required: ['headline', 'subheadline', 'cta']
};

/**
 * Copywriter Agent: Generates text copy grounded in both the user's explicit intent
 * AND the creative concept strategy. The user intent is treated as a hard constraint —
 * copy must never drift to unrelated topics (e.g., generating beauty copy for a jewellery brief).
 */
export async function runCopywriterAgent(
  userIntent: string,
  concept: Concept,
  vision: VisionAnalysis
): Promise<CopywriterOutput> {
  const systemInstruction = `You are an expert Copywriter for digital marketing and print design.
You will be given a USER INTENT (the client's goal) and a CREATIVE CONCEPT STRATEGY.

CRITICAL RULES:
1. The USER INTENT is your NON-NEGOTIABLE anchor. Every line of copy must directly serve that intent.
2. If the user says "Summer Diamond Jewellery Collection", write about diamonds and jewellery — NOT beauty, NOT makeup, NOT other products.
3. The headline must be STRICTLY 10 words or fewer.
4. Do NOT hallucinate products, services, or topics not present in the intent.
5. The CTA should be brief (1-3 words) and campaign-appropriate.
6. Output strictly JSON matching the schema. No other text.`;

  const prompt = `
USER INTENT (NON-NEGOTIABLE — copy must serve this exact brief):
"${userIntent}"

CREATIVE CONCEPT STRATEGY (use to determine tone and style, not topic):
- Campaign Type: ${concept.campaignType}
- Communication Goal: ${concept.communicationGoal}
- Emotional Direction: ${concept.emotionalGoal}
- Hierarchy Strategy: ${concept.hierarchyStrategy}
- CTA Strategy: ${concept.ctaStrategy}

IMAGE CONTEXT:
- Composition Type: ${vision.compositionType || vision.compositionStyle}
- Visual Complexity: ${vision.visualComplexity}
- Dominant Colors: ${vision.dominantColors.join(', ')}
- Has Faces: ${vision.faceRegions.length > 0 ? 'Yes' : 'No'}
- Has Products: ${vision.productRegions.length > 0 ? 'Yes' : 'No'}

Generate copy that is laser-focused on the user intent above.
The headline must not exceed 10 words.
Do not substitute the user's topic with any other product, service, or theme.
`;

  const result = await callAgent({
    prompt,
    systemInstruction,
    responseSchema: CopywriterOutputSchema,
    temperature: 0.3
  });

  return result as CopywriterOutput;
}

export default runCopywriterAgent;
