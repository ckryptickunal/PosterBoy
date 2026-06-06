import { callAgent } from './gemini';
import { LayoutOutput, CriticOutput } from '@/types/agents';

const LayoutElementSchema = {
  type: 'OBJECT',
  properties: {
    id: { type: 'STRING', description: 'Unique identifier of the element' },
    type: { type: 'STRING', enum: ['headline', 'subheadline', 'cta', 'supporting_text', 'divider', 'shape', 'icon', 'badge', 'logo'] },
    text: { type: 'STRING' },
    x: { type: 'NUMBER', description: 'Left coordinate percentage (0-100)' },
    y: { type: 'NUMBER', description: 'Top coordinate percentage (0-100)' },
    width: { type: 'NUMBER', description: 'Width percentage (0-100)' },
    height: { type: 'NUMBER', description: 'Height percentage (0-100)' },
    rotation: { type: 'NUMBER', description: 'Degrees of rotation' },
    zIndex: { type: 'INTEGER', description: 'Layer index' },
    color: { type: 'STRING', description: 'Hex color value' }
  },
  required: ['id', 'type', 'x', 'y', 'width', 'height', 'rotation', 'zIndex']
};

const LayoutOutputSchema = {
  type: 'OBJECT',
  properties: {
    elements: {
      type: 'ARRAY',
      items: LayoutElementSchema,
      description: 'The repaired coordinates list. All elements must remain, but positions/sizes adjusted.'
    }
  },
  required: ['elements']
};

interface RepairAgentParams {
  layout: LayoutOutput;
  critique: CriticOutput;
  rulesText: string;
}

/**
 * Repair Agent: Modifies element coordinates based on specific critique feedback.
 */
export async function runRepairAgent(params: RepairAgentParams): Promise<LayoutOutput> {
  const { layout, critique, rulesText } = params;

  const systemInstruction = `You are a Layout Repair Agent in an autonomous design system.
Your job is to read an existing layout coordinate structure, review the issues and fixes proposed by the Design Critic, and output an adjusted, repaired coordinate list.
- Keep the exact same element IDs and texts.
- Shift, resize, or realign coordinates (x, y, width, height) to satisfy the critic's comments.
- Do not let elements overflow the margins (default 8%).
- Do not let elements overlap each other.
- Move elements out of forbidden regions (faces, products).
Output strictly JSON conforming to the schema. Never generate HTML or CSS.`;

  const prompt = `
EXISTING LAYOUT TO REPAIR:
${JSON.stringify(layout.elements, null, 2)}

CRITIQUE ISSUES FOUND:
${critique.issues.map(iss => `- ${iss}`).join('\n')}

PROPOSED REPAIR INSTRUCTIONS:
${critique.fixes.map(fx => `- ${fx}`).join('\n')}

DESIGN CONSTITUTION RULES:
${rulesText}

Execute the repair and output the adjusted element coordinates JSON.
`;

  const result = await callAgent({
    prompt,
    systemInstruction,
    responseSchema: LayoutOutputSchema,
    temperature: 0.15
  });

  return result as LayoutOutput;
}

export default runRepairAgent;
