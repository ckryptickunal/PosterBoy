import { callAgent } from './gemini';
import { VisionAnalysis, WebLayoutOutput } from '@/types/agents';

export interface BeautyScore {
  beauty: number;
  premium: number;
  balance: number;
  visual_taste: number;
}

interface BeautyAgentParams {
  screenshotBase64: string;
  vision: VisionAnalysis;
  layout: WebLayoutOutput;
}

const BeautySchema = {
  type: 'OBJECT',
  properties: {
    beauty: { type: 'INTEGER', description: '0-100 score of pure aesthetic beauty and visual harmony' },
    premium: { type: 'INTEGER', description: '0-100 score of luxury, sophistication, and premium feel' },
    balance: { type: 'INTEGER', description: '0-100 score of visual weight distribution and structural stability' },
    visual_taste: { type: 'INTEGER', description: '0-100 score of tasteful typography pairing, spacing, and restraint' },
    feedback: { type: 'STRING', description: 'One sentence of aesthetic feedback' }
  },
  required: ['beauty', 'premium', 'balance', 'visual_taste', 'feedback']
};

export async function runBeautyAgent(params: BeautyAgentParams): Promise<BeautyScore> {
  const { screenshotBase64, vision, layout } = params;

  const systemInstruction = `You are an elite Design Critic and Art Director.
You do not care about constraints. You only care about BEAUTY.
Evaluate the provided design screenshot strictly on aesthetics.
1. Beauty: Is it gorgeous? Does it wow the viewer?
2. Premium: Does it look expensive, luxurious, and highly polished?
3. Balance: Do the elements form a cohesive, perfectly weighted composition?
4. Taste: Is there restraint? Are the font choices and whitespace allocations tasteful?

Output strictly JSON.`;

  const prompt = `
VISION CONTEXT:
Subject: ${vision.subjectDescription}
Vibe: ${vision.aestheticVibe}

CURRENT LAYOUT STRATEGY:
${layout.strategy}

Evaluate the beauty of the rendered screenshot.`;

  const result = await callAgent({
    prompt,
    systemInstruction,
    images: [{
      inlineData: {
        mimeType: 'image/png',
        data: screenshotBase64.replace(/^data:image\/\w+;base64,/, '')
      }
    }],
    responseSchema: BeautySchema,
    temperature: 0.1
  });

  return result as BeautyScore;
}

export default runBeautyAgent;
