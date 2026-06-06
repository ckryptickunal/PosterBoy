import { callAgent } from './gemini';
import { VisionAnalysis, Concept, CopywriterOutput } from '@/types/agents';

const CopywriterOutputSchema = {
  type: 'OBJECT',
  properties: {
    headline: { 
      type: 'STRING', 
      description: 'The primary headline. Must be compelling, concise, and strictly 10 words or fewer.' 
    },
    subheadline: { 
      type: 'STRING', 
      description: 'A supporting subheadline. Adds context or a value proposition (1-2 sentences).' 
    },
    cta: { 
      type: 'STRING', 
      description: 'Call-to-action text, e.g. "Shop Collection", "Discover More", "Book Now". Keep it under 4 words.' 
    },
    supportingText: { 
      type: 'STRING', 
      description: 'Optional secondary body copy or details like date, website URL, or minor callouts.' 
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
 * Copywriter Agent: Generates text copy elements constrained by visual context and layout style.
 */
export async function runCopywriterAgent(
  concept: Concept,
  vision: VisionAnalysis
): Promise<CopywriterOutput> {
  const systemInstruction = `You are an expert Copywriter for digital marketing and print design.
Your task is to generate design copy (headline, subheadline, call-to-action, and supporting text) based on a Creative Concept and Vision Analysis.
Constraints:
- Headline must be STRICTLY 10 words or fewer. If you write more than 10 words, the layout will break!
- Make the copywriting punchy, elegant, and highly tailored to the visual style (e.g. luxury uses fewer words, tech is functional).
- The CTA should be brief (1-3 words).
Output strictly JSON matching the schema.`;

  const prompt = `
CREATIVE CONCEPT STRATEGY:
- Campaign: ${concept.campaignType}
- Communication Goal: ${concept.communicationGoal}
- Emotional Direction: ${concept.emotionalGoal}
- Hierarchy Strategy: ${concept.hierarchyStrategy}

IMAGE CONTEXT:
- Design Style: ${vision.designStyleClassification}
- Dominant Colors: ${vision.dominantColors.join(', ')}

Generate copy that is platform-aware and optimized. Remember, the headline must not exceed 10 words.
`;

  const result = await callAgent({
    prompt,
    systemInstruction,
    responseSchema: CopywriterOutputSchema,
    temperature: 0.4
  });

  return result as CopywriterOutput;
}

export default runCopywriterAgent;
