import { callAgent } from './gemini';
import { LayoutOutput, CriticOutput } from '@/types/agents';

const CriticOutputSchema = {
  type: 'OBJECT',
  properties: {
    score: { type: 'INTEGER', description: 'Overall design score out of 100.' },
    issues: { 
      type: 'ARRAY', 
      items: { type: 'STRING' },
      description: 'List of detected aesthetic or structural violations (e.g., text covers face, low contrast against background, overlap between title and cta).' 
    },
    fixes: { 
      type: 'ARRAY', 
      items: { type: 'STRING' },
      description: 'Actionable instructions for the Repair Agent to resolve the issues (e.g., "Shift headline upwards by 10% y", "Increase CTA button width to 20%").' 
    }
  },
  required: ['score', 'issues', 'fixes']
};

interface CriticAgentParams {
  screenshotBase64: string; // Base64 PNG image of the fully rendered design
  layout: LayoutOutput;
  rulesText: string;
}

/**
 * Critic Agent: Visually inspects the rendered layout screenshot and lists issues.
 */
export async function runCriticAgent(params: CriticAgentParams): Promise<CriticOutput> {
  const { screenshotBase64, layout, rulesText } = params;

  const systemInstruction = `You are a strict, highly experienced Art Director and Design Critic.
You are shown a screenshot of the fully rendered layout.
Your job is to critique the layout visually based on:
1. DESIGN CONSTITUTION: Verify if all rules are satisfied.
2. CONTRAST: Is text readable over the background image?
3. SPACING & MARGINS: Are elements too close to the borders? Is there clutter?
4. COLLISION: Do text boxes overlap each other or cover the main product/faces?
5. COMPOSITION: Is the layout visually balanced?

Assign a score out of 100. Be critical:
- If text covers faces or products, score must be below 60.
- If text overlaps other text, score must be below 65.
- If margins are violated or contrast is poor, deduct points.
Output strictly JSON conforming to the schema.`;

  const prompt = `
CURRENT LAYOUT COORDINATES:
${JSON.stringify(layout.elements, null, 2)}

DESIGN CONSTITUTION RULES:
${rulesText}

Evaluate the provided screenshot of this design. List all issues and suggest specific coordinates adjustments (e.g., shift up, shift down, increase size, reduce width) for the Repair Agent.
`;

  const result = await callAgent({
    prompt,
    systemInstruction,
    images: [{
      inlineData: {
        mimeType: 'image/png',
        data: screenshotBase64
      }
    }],
    responseSchema: CriticOutputSchema,
    temperature: 0.1
  });

  return result as CriticOutput;
}

export default runCriticAgent;
