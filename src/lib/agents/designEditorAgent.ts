/**
 * Design Editor Agent — PosterBoy V4.5
 * ════════════════════════════════════════════
 * The human-like editor. Not a generator.
 * 
 * Given:
 *   - Current Layout
 *   - Critic Score & Feedback
 *   - Delta Memory (what improved, what regressed from last iteration)
 * 
 * Responsibilities:
 *   1. Preserve everything that scored well.
 *   2. Modify only low-scoring dimensions.
 *   3. Operate on deltas, not regeneration.
 */

import { callAgent } from './gemini';
import { WebLayoutOutput, SectionDefinition } from '@/types/agents';
import { CategoryCriticOutput } from './criticAgent';

export interface DeltaMemory {
  improved: string[];
  regressed: string[];
}

export interface DesignEditorParams {
  layout: WebLayoutOutput;
  criticResult: CategoryCriticOutput;
  deltaMemory: DeltaMemory;
  designObjectives: string;
}

export interface DesignEditorResult {
  updatedLayout: WebLayoutOutput;
  changeLog: string[];
  reasoning: string;
}

const EditorSchema = {
  type: 'OBJECT',
  properties: {
    changeLog: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description: 'A list of explicit local modifications made (e.g., "Moved headline from center to top-left", "Increased tracking by 0.05em")',
    },
    reasoning: {
      type: 'STRING',
      description: 'Why these specific edits were chosen to increase the score without changing successful elements',
    },
    sections: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          id: { type: 'STRING' },
          role: { type: 'STRING' },
          placement: { type: 'STRING' },
          cssOverrides: {
            type: 'OBJECT',
            additionalProperties: { type: 'STRING' }
          }
        },
        required: ['id', 'role', 'placement']
      }
    },
    designTokens: {
      type: 'OBJECT',
      properties: {
        spacing: { type: 'STRING', enum: ['tight', 'normal', 'generous', 'luxurious'] },
        scrimOpacity: { type: 'NUMBER' },
        textShadow: { type: 'BOOLEAN' },
        textColor: { type: 'STRING' },
        accentColor: { type: 'STRING' },
        borderRadius: { type: 'STRING' },
      },
      required: ['spacing', 'scrimOpacity', 'textShadow']
    }
  },
  required: ['changeLog', 'reasoning', 'sections', 'designTokens']
};

export async function runDesignEditorAgent(params: DesignEditorParams): Promise<DesignEditorResult> {
  const { layout, criticResult, deltaMemory, designObjectives } = params;

  // Identify what is working and what failed
  const goodCategories = Object.entries(criticResult)
    .filter(([k, v]) => typeof v === 'number' && v >= 85 && k !== 'overall' && k !== 'score')
    .map(([k]) => k);
  
  const badCategories = Object.entries(criticResult)
    .filter(([k, v]) => typeof v === 'number' && v < 85 && k !== 'overall' && k !== 'score')
    .map(([k]) => k);

  const systemInstruction = `You are the Design Editor Agent. 
You act like a human senior designer fixing a layout. You NEVER regenerate. You ONLY EDIT.

YOUR DIRECTIVES:
1. Preserve everything that is working. Do not change placements or styling that contribute to high-scoring metrics.
2. Modify ONLY the dimensions that are failing. 
3. Operate on deltas. Nudge, tweak, adjust. Do not reinvent the wheel.
4. Adhere to the Design Objectives. Do NOT treat them as absolute numerical constraints, but as qualitative goals.

CURRENT DELTA MEMORY:
Improved since last iteration: ${deltaMemory.improved.length > 0 ? deltaMemory.improved.join(', ') : 'None yet'}
Regressed since last iteration: ${deltaMemory.regressed.length > 0 ? deltaMemory.regressed.join(', ') : 'None yet'}

You MUST output the FULL updated layout (all sections and tokens), maintaining the exact same IDs and roles.`;

  const prompt = `
DESIGN OBJECTIVES:
${designObjectives}

CRITIC EVALUATION (Overall Score: ${criticResult.overall}/100):
Good (Do NOT modify elements driving these): ${goodCategories.join(', ')}
Needs Fix (Edit elements driving these): ${badCategories.join(', ')}

ISSUES TO FIX:
${criticResult.issues.map(i => `- ${i}`).join('\n')}

CURRENT LAYOUT TO EDIT:
Strategy: ${layout.strategy}
Tokens: ${JSON.stringify(layout.designTokens, null, 2)}
Sections:
${layout.sections.map(s => `- ID: ${s.id} | Role: ${s.role} | Placement: ${s.placement} | Overrides: ${JSON.stringify(s.cssOverrides || {})}`).join('\n')}

INSTRUCTIONS:
Output the updated layout. 
Keep successful elements EXACTLY AS THEY ARE.
Only change the 'placement', 'cssOverrides', or 'designTokens' necessary to fix the issues.
  `;

  const response = await callAgent({
    prompt,
    systemInstruction,
    responseSchema: EditorSchema,
    temperature: 0.2, // Low temperature for focused editing
  }) as any;

  // Merge back the content and other immutable properties
  const updatedSections = layout.sections.map(originalSection => {
    const updatedSection = response.sections.find((s: any) => s.id === originalSection.id);
    if (updatedSection) {
      return {
        ...originalSection,
        placement: updatedSection.placement,
        cssOverrides: updatedSection.cssOverrides || originalSection.cssOverrides
      };
    }
    return originalSection;
  });

  const updatedLayout: WebLayoutOutput = {
    ...layout,
    designTokens: {
      ...layout.designTokens,
      ...response.designTokens
    },
    sections: updatedSections,
    reasoning: {
      ...layout.reasoning,
      whyPositions: response.reasoning
    }
  };

  return {
    updatedLayout,
    changeLog: response.changeLog,
    reasoning: response.reasoning
  };
}

export default runDesignEditorAgent;
