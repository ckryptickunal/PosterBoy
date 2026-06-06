import { callAgent } from './gemini';
import { LayoutOutput } from '@/types/agents';

export interface Fix {
  target: string;
  action: string;
  reason: string;
}

export interface CritiqueDelta {
  overall: number; // Will be calculated by Orchestrator using Beauty score
  readability: number;
  hierarchy: number;
  composition: number;
  emotion: number;
  premium_quality: number;
  brand_fit: number;
  contrast: number;
  spacing: number;
  
  strengths: string[];
  weaknesses: string[];
  keep: string[];
  modify: string[];
  remove: string[];
  priorityFixes: Fix[];
}

const CriticDeltaSchema = {
  type: 'OBJECT',
  properties: {
    readability: { type: 'INTEGER', description: '0-100 score' },
    hierarchy: { type: 'INTEGER', description: '0-100 score' },
    composition: { type: 'INTEGER', description: '0-100 score' },
    emotion: { type: 'INTEGER', description: '0-100 score' },
    premium_quality: { type: 'INTEGER', description: '0-100 score' },
    brand_fit: { type: 'INTEGER', description: '0-100 score' },
    contrast: { type: 'INTEGER', description: '0-100 score' },
    spacing: { type: 'INTEGER', description: '0-100 score' },
    
    strengths: { type: 'ARRAY', items: { type: 'STRING' } },
    weaknesses: { type: 'ARRAY', items: { type: 'STRING' } },
    keep: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Elements/dimensions that MUST NOT change' },
    modify: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Elements/dimensions that MUST change' },
    remove: { type: 'ARRAY', items: { type: 'STRING' } },
    
    priorityFixes: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          target: { type: 'STRING', description: 'Element ID' },
          action: { type: 'STRING', description: 'e.g., move_left, increase_contrast' },
          reason: { type: 'STRING' }
        },
        required: ['target', 'action', 'reason']
      }
    }
  },
  required: [
    'readability', 'hierarchy', 'composition', 'emotion', 
    'premium_quality', 'brand_fit', 'contrast', 'spacing',
    'strengths', 'weaknesses', 'keep', 'modify', 'remove', 'priorityFixes'
  ]
};

interface CriticAgentParams {
  screenshotBase64: string;
  layout: LayoutOutput;
  rulesText: string;
}

export async function runCriticAgent(params: CriticAgentParams): Promise<CritiqueDelta> {
  const { screenshotBase64, layout, rulesText } = params;

  const systemInstruction = `You are a Delta Critic for an autonomous design system.

Your job is to evaluate a design and output exact DELTAS for the Design Editor Agent.
You do NOT output a single score. You output a multi-objective matrix.

CRITIQUE RULES:
1. Identify EXACTLY what is working (keep).
2. Identify EXACTLY what is failing (modify).
3. If an element is in 'keep', the Editor will lock it.
4. If an element is in 'modify', the Editor will change it.
5. Provide precise 'priorityFixes' for the worst offenders.

DESIGN OBJECTIVES TO EVALUATE AGAINST:
${rulesText}

Output strictly JSON conforming to the schema.`;

  const prompt = `
CURRENT LAYOUT ELEMENT COORDINATES/IDS:
${JSON.stringify(layout.elements.map(e => e.id), null, 2)}

Provide your Delta Critique.`;

  const result = await callAgent({
    prompt,
    systemInstruction,
    images: [{
      inlineData: {
        mimeType: 'image/png',
        data: screenshotBase64.replace(/^data:image\/\w+;base64,/, '')
      }
    }],
    responseSchema: CriticDeltaSchema,
    temperature: 0.1
  });

  const out = result as CritiqueDelta;
  out.overall = 0; // Will be hydrated
  return out;
}

export default runCriticAgent;
