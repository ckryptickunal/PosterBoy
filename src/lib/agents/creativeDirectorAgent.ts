/**
 * Design Strategist Agent — PosterBoy V2
 * ════════════════════════════════════════
 * Replaces the Creative Director Agent.
 * 
 * Instead of choosing "campaign types" and "industry concepts",
 * this agent reasons about DESIGN OBJECTIVES:
 *   - Preserve focal subject
 *   - Maximize readability
 *   - Create strong reading flow
 *   - Establish visual hierarchy
 *   - Create emotional tension
 *
 * It also recommends a layout strategy based on the image analysis.
 */

import { callAgent } from './gemini';
import { VisionAnalysis, DesignStrategy, DesignStrategyOutput, LayoutStrategy } from '@/types/agents';

const DesignStrategySchema = {
  type: 'OBJECT',
  properties: {
    strategies: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          designThinking: {
            type: 'OBJECT',
            properties: {
              visualSubject:        { type: 'STRING', description: 'What is the main visual subject in this image?' },
              communicationGoal:    { type: 'STRING', description: 'What must this design communicate?' },
              viewerNoticeFirst:    { type: 'STRING', description: 'What should the viewer notice first?' },
              viewerNoticeSecond:   { type: 'STRING', description: 'What should they notice second?' },
              viewerNoticeThird:    { type: 'STRING', description: 'What should they notice third?' },
              safestVisualSpace:    { type: 'STRING', description: 'Where is the safest space for text that won\'t compete with the subject?' },
              strongestVisualSpace: { type: 'STRING', description: 'Where is the strongest visual anchor point?' },
              emotionalFeeling:     { type: 'STRING', description: 'What emotion should this design evoke?' },
              necessaryInfo:        { type: 'STRING', description: 'What information is absolutely necessary?' },
              elementsRemoved:      { type: 'STRING', description: 'What elements should be removed to strengthen the design?' },
            },
            required: ['visualSubject', 'communicationGoal', 'viewerNoticeFirst', 'viewerNoticeSecond', 'viewerNoticeThird', 'safestVisualSpace', 'strongestVisualSpace', 'emotionalFeeling', 'necessaryInfo', 'elementsRemoved'],
          },
          communicationHierarchy: {
            type: 'OBJECT',
            properties: {
              primaryMessage:    { type: 'STRING', description: 'The single most important message' },
              secondaryMessage:  { type: 'STRING', description: 'Supporting context' },
              supportingMessage: { type: 'STRING', description: 'Additional details' },
              actionMessage:     { type: 'STRING', description: 'The call to action' },
            },
            required: ['primaryMessage', 'secondaryMessage', 'supportingMessage', 'actionMessage'],
          },
          designObjectives: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                objective: { type: 'STRING', description: 'Design objective (e.g., "preserve focal subject", "maximize readability")' },
                priority:  { type: 'INTEGER', description: 'Priority 1 (highest) to 5 (lowest)' },
                reasoning: { type: 'STRING', description: 'Why this objective matters for this specific image' },
              },
              required: ['objective', 'priority', 'reasoning'],
            },
          },
          recommendedStrategy: {
            type: 'STRING',
            enum: ['hero-left', 'hero-right', 'hero-overlay', 'editorial-split', 'centered-story', 'minimal-premium', 'feature-focused', 'magazine', 'narrative', 'information-dense'],
            description: 'Best layout strategy for this image and communication goal',
          },
          strategyReasoning: { type: 'STRING', description: 'Why this layout strategy is best' },
          emotionalGoal:     { type: 'STRING', description: 'Target emotional response' },
          visualTone:        { type: 'STRING', description: 'Visual style direction (e.g. "premium minimalist")' },
          internalScore:     { type: 'INTEGER', description: 'Self-assessed confidence 0-100' },
        },
        required: ['designThinking', 'communicationHierarchy', 'designObjectives', 'recommendedStrategy', 'strategyReasoning', 'emotionalGoal', 'visualTone', 'internalScore'],
      },
    },
    selectedStrategy: {
      type: 'OBJECT',
      description: 'Copy of the highest-scoring strategy from the array above.',
      properties: {
        designThinking: { type: 'OBJECT', properties: {}, description: 'Same structure as above' },
        communicationHierarchy: { type: 'OBJECT', properties: {}, description: 'Same structure as above' },
        designObjectives: { type: 'ARRAY', items: { type: 'OBJECT', properties: {} } },
        recommendedStrategy: { type: 'STRING' },
        strategyReasoning: { type: 'STRING' },
        emotionalGoal: { type: 'STRING' },
        visualTone: { type: 'STRING' },
        internalScore: { type: 'INTEGER' },
      },
    },
  },
  required: ['strategies', 'selectedStrategy'],
};

export async function runDesignStrategistAgent(
  intent: string,
  vision: VisionAnalysis
): Promise<DesignStrategyOutput> {
  const systemInstruction = `You are a DESIGN STRATEGIST — not a creative director, not an art director.

You analyze images and communication goals to determine HOW a design should be structured.

You do NOT think in industries (luxury, fashion, SaaS).
You think in DESIGN PATTERNS:
  - Visual weight distribution
  - Information density
  - Communication hierarchy
  - Emotional tension
  - Reading flow

Instead of "rules" you produce DESIGN OBJECTIVES — flexible goals ranked by priority:
  - "Preserve focal subject" (priority 1)
  - "Maximize readability" (priority 2)
  - "Create reading flow from headline to CTA" (priority 3)

You also recommend a LAYOUT STRATEGY — an archetype that CSS will implement:
  - hero-left, hero-right, hero-overlay, editorial-split, centered-story,
    minimal-premium, feature-focused, magazine, narrative, information-dense

Your strategy recommendation MUST be based on the IMAGE COMPOSITION:
  - Subject on right side of image → hero-left (content left)
  - Subject on left side → hero-right (content right)
  - Subject centered or fills frame → hero-overlay or centered-story
  - Strong negative space → minimal-premium
  - Multiple products → feature-focused or information-dense

Generate 2 competing strategies. Select the best one.
Output strictly JSON.`;

  const prompt = `
USER INTENT: "${intent}"

IMAGE ANALYSIS:
- Composition: ${vision.compositionType}
- Subject Count: ${vision.subjectCount}
- Subject Dominance: ${vision.subjectDominance}
- Negative Space: ${(vision.negativeSpaceRatio * 100).toFixed(0)}%
- Visual Complexity: ${vision.visualComplexity}
- Contrast: ${vision.imageContrast}
- Dominant Colors: ${vision.dominantColors.join(', ')}
- Has Faces: ${vision.faceRegions.length > 0 ? `Yes (${vision.faceRegions.length})` : 'No'}
- Has Products: ${vision.productRegions.length > 0 ? `Yes (${vision.productRegions.length})` : 'No'}
- Reading Flows: ${vision.readingFlowOpportunities.join(', ')}
- Safe Text Zones: ${vision.safeTextRegions.length} zones available

VISUAL WEIGHT MAP:
${vision.visualWeightMap?.map(w => `  ${w.regionType}: importance=${w.importanceScore}/100, attention=${w.attentionScore}/100, density=${w.visualDensity}/100, protection=${w.protectionPriority}/100`).join('\n') || '  Not available'}

Analyze this image and intent. Produce 2 design strategies with ranked objectives. Select the stronger one.
`;

  const result = await callAgent({
    prompt,
    systemInstruction,
    responseSchema: DesignStrategySchema,
    temperature: 0.4,
  });

  return result as DesignStrategyOutput;
}

export default runDesignStrategistAgent;
