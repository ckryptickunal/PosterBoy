/**
 * Design Editor Agent — PosterBoy V4.5
 * ════════════════════════════════════════════
 * The human-like editor. Not a generator.
 * 
 * Given:
 *   - Current Layout
 *   - CritiqueDelta (strengths, weaknesses, keep, modify, priorityFixes)
 *   - Vision Analysis
 * 
 * Rules:
 *   1. Preserve everything inside keep[]
 *   2. Modify only items inside modify[]
 *   3. Apply priority fixes first
 *   4. Do not regenerate copy
 *   5. Do not regenerate typography unless typography is failing
 *   6. Do not regenerate layout strategy unless score stagnates
 */

import { callAgent } from './gemini';
import { WebLayoutOutput, VisionAnalysis } from '@/types/agents';
import { CritiqueDelta } from './criticAgent';

export interface DesignEditorParams {
  currentDesign: WebLayoutOutput;
  critiqueDelta: CritiqueDelta;
  visionAnalysis: VisionAnalysis;
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
      description: 'A list of explicit local modifications made (e.g., "Moved headline left to clear face", "Increased CTA contrast")',
    },
    reasoning: {
      type: 'STRING',
      description: 'Why these specific edits address the priorityFixes without breaking the keep list',
    },
    strategy: {
      type: 'STRING',
      description: 'The layout strategy to use (only change if layout_strategy is in the MODIFY list)',
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
  const { currentDesign, critiqueDelta, visionAnalysis } = params;

  const systemInstruction = `You are the Design Editor Agent. 
You act like a human senior designer fixing a layout. You NEVER regenerate. You ONLY EDIT.

YOUR DIRECTIVES:
1. Preserve everything inside the 'keep' list.
2. Modify ONLY items inside the 'modify' list.
3. Apply the 'priorityFixes' first.
4. Nudge, tweak, adjust. Do not reinvent the wheel.

You MUST output the FULL updated layout (all sections and tokens), maintaining the exact same IDs and roles.`;

  const prompt = `
VISION CONTEXT:
${visionAnalysis.subjectDescription}
Focal points: ${visionAnalysis.focalPoints.join(', ')}

CRITIQUE DELTA:
Strengths: ${critiqueDelta.strengths.join(', ')}
Weaknesses: ${critiqueDelta.weaknesses.join(', ')}

MANDATORY RULES:
KEEP (Do not touch): ${critiqueDelta.keep.join(', ')}
MODIFY (Must change): ${critiqueDelta.modify.join(', ')}

PRIORITY FIXES TO APPLY NOW:
${JSON.stringify(critiqueDelta.priorityFixes, null, 2)}

CURRENT LAYOUT TO EDIT:
Strategy: ${currentDesign.strategy}
Tokens: ${JSON.stringify(currentDesign.designTokens, null, 2)}
Sections:
${currentDesign.sections.map(s => `- ID: ${s.id} | Role: ${s.role} | Placement: ${s.placement} | Overrides: ${JSON.stringify(s.cssOverrides || {})}`).join('\n')}

INSTRUCTIONS:
Output the updated layout. 
Keep successful elements EXACTLY AS THEY ARE.
Only change the 'placement', 'cssOverrides', or 'designTokens' necessary to fix the issues.
If 'layout_strategy' is in the MODIFY list, you MUST change the layout strategy to a new archetype.
  `;

  const response = await callAgent({
    prompt,
    systemInstruction,
    responseSchema: EditorSchema,
    temperature: 0.2, // Low temperature for focused editing
  }) as any;

  // Merge back the content and other immutable properties
  const updatedSections = currentDesign.sections.map(originalSection => {
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
    ...currentDesign,
    strategy: response.strategy || currentDesign.strategy,
    designTokens: {
      ...currentDesign.designTokens,
      ...response.designTokens
    },
    sections: updatedSections,
    reasoning: {
      ...currentDesign.reasoning,
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
