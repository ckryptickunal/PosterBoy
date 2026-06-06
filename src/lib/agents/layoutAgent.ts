/**
 * Web Layout Agent — PosterBoy V2
 * ═════════════════════════════════
 * This agent thinks like a senior landing page designer.
 * It outputs layout STRATEGY and section PLACEMENTS — never coordinates.
 * CSS Grid/Flexbox handles actual positioning in the browser.
 */

import { callAgent } from './gemini';
import {
  VisionAnalysis,
  CopywriterOutput,
  TypographyTokens,
  WebLayoutOutput,
  LayoutStrategy,
} from '@/types/agents';

// ── Gemini Structured Output Schema ─────────────────────────────────────────

const SectionSchema = {
  type: 'OBJECT',
  properties: {
    id:        { type: 'STRING', description: 'Unique section ID: headline, subheadline, cta, supporting, logo, spacer' },
    role:      { type: 'STRING', enum: ['headline', 'subheadline', 'body', 'cta', 'logo', 'supporting', 'spacer', 'trust-markers'], description: 'Semantic role of this section' },
    placement: { type: 'STRING', enum: ['top-left', 'top-center', 'top-right', 'center-left', 'center', 'center-right', 'bottom-left', 'bottom-center', 'bottom-right'], description: 'Where this section appears within the content zone' },
  },
  required: ['id', 'role', 'placement'],
};

const DesignTokensSchema = {
  type: 'OBJECT',
  properties: {
    primaryColor:    { type: 'STRING', description: 'Primary accent color as hex (e.g. #d4af37)' },
    secondaryColor:  { type: 'STRING', description: 'Secondary color as hex' },
    textColor:       { type: 'STRING', description: 'Primary text color as hex (ensure contrast against image)' },
    accentColor:     { type: 'STRING', description: 'CTA button / highlight color as hex' },
    backgroundColor: { type: 'STRING', description: 'Content zone background color as hex (used in feature-focused layout)' },
    spacing:         { type: 'STRING', enum: ['tight', 'normal', 'generous', 'luxurious'], description: 'Spacing scale for padding and gaps' },
    borderRadius:    { type: 'STRING', description: 'Border radius for buttons/cards (e.g. "8px", "24px", "0px")' },
    textShadow:      { type: 'BOOLEAN', description: 'Whether to add text shadow for readability over images' },
    scrimOpacity:    { type: 'NUMBER', description: 'Opacity of the background overlay/scrim (0.0 to 0.8)' },
  },
  required: ['primaryColor', 'secondaryColor', 'textColor', 'accentColor', 'backgroundColor', 'spacing', 'borderRadius', 'textShadow', 'scrimOpacity'],
};

const WebLayoutSchema = {
  type: 'OBJECT',
  properties: {
    strategy: {
      type: 'STRING',
      enum: ['hero-left', 'hero-right', 'hero-overlay', 'editorial-split', 'centered-story', 'minimal-premium', 'feature-focused', 'magazine', 'narrative', 'information-dense'],
      description: 'The layout archetype to use. Choose based on image composition, content hierarchy, and visual weight distribution.',
    },
    sections: {
      type: 'ARRAY',
      items: SectionSchema,
      description: 'Ordered list of content sections. Must include headline, subheadline, and cta at minimum.',
    },
    designTokens: DesignTokensSchema,
    reasoning: {
      type: 'OBJECT',
      properties: {
        whyStrategy:   { type: 'STRING', description: 'Why this layout strategy was chosen for this image and content' },
        whyPlacements: { type: 'STRING', description: 'Why sections are placed in these zones' },
        whyColors:     { type: 'STRING', description: 'Why these colors were chosen (contrast, harmony, brand)' },
        whyHierarchy:  { type: 'STRING', description: 'How the visual hierarchy is established' },
        whySpacing:    { type: 'STRING', description: 'Why this spacing scale was chosen' },
      },
      required: ['whyStrategy', 'whyPlacements', 'whyColors', 'whyHierarchy', 'whySpacing'],
    },
  },
  required: ['strategy', 'sections', 'designTokens', 'reasoning'],
};

// ── Agent Parameters ────────────────────────────────────────────────────────

interface WebLayoutAgentParams {
  vision: VisionAnalysis;
  copy: CopywriterOutput;
  typography: TypographyTokens;
  designObjectives: string;   // from Design Strategist
  recommendedStrategy?: LayoutStrategy;
  strategyHint?: string;      // forces/suggests a specific strategy for parallel candidates
  hasLogo: boolean;           // whether user uploaded a logo
}

// ── Main Agent Function ─────────────────────────────────────────────────────

export async function runWebLayoutAgent(params: WebLayoutAgentParams): Promise<WebLayoutOutput> {
  const {
    vision,
    copy,
    typography,
    designObjectives,
    recommendedStrategy,
    strategyHint,
    hasLogo,
  } = params;

  const systemInstruction = `You are a SENIOR WEB DESIGNER specializing in premium landing page hero sections.

Your job is to design a webpage composition that will be rendered as a poster/social media image.

CRITICAL RULES:
1. You must NEVER output coordinates (x, y, width, height). Those do not exist in this system.
2. You choose a LAYOUT STRATEGY (like a CSS Grid template) and SECTION PLACEMENTS (semantic zones).
3. The browser's CSS engine handles all positioning. You think in layout archetypes, not pixels.
4. You MUST think about the IMAGE COMPOSITION when choosing strategy:
   - If subject is on the right → use hero-left (content left, image right)
   - If subject is centered → use centered-story or hero-overlay
   - If subject fills frame → use hero-overlay with scrim
   - If image has strong left negative space → use hero-left or editorial-split
5. LOGO IS OPTIONAL. Only include a logo section if hasLogo is true.
6. Colors must have HIGH CONTRAST against the image. White text on light images = FAILURE.
7. Text shadow and scrim opacity are your tools for ensuring readability over images.

LAYOUT STRATEGY GUIDE:
- hero-left: Content stacked on left, image dominates right. Best for: subject on right side.
- hero-right: Content stacked on right, image dominates left. Best for: subject on left side.
- hero-overlay: Full-bleed image background with gradient scrim + overlaid text. Best for: atmospheric images.
- editorial-split: Clean 50/50 split. Best for: editorial/magazine feel.
- centered-story: Centered text over image with radial scrim. Best for: centered subjects, storytelling.
- minimal-premium: Minimal text cluster, maximum whitespace. Best for: luxury, premium positioning.
- feature-focused: Image top, text panel below. Best for: product showcases.
- magazine: Multi-section editorial with column scrim. Best for: information-rich designs.
- narrative: Vertical storytelling flow, text distributed top-to-bottom. Best for: sequential content.
- information-dense: Grid-based multi-cell layout. Best for: data-heavy content.

Output strictly JSON matching the schema.`;

  const prompt = `
IMAGE ANALYSIS:
- Composition: ${vision.compositionType}
- Subject Count: ${vision.subjectCount}
- Subject Dominance: ${vision.subjectDominance}
- Negative Space Ratio: ${vision.negativeSpaceRatio}
- Visual Complexity: ${vision.visualComplexity}
- Image Contrast: ${vision.imageContrast}
- Dominant Colors: ${vision.dominantColors.join(', ')}
- Reading Flow: ${vision.readingFlowOpportunities.join(', ')}
- Has Faces: ${vision.faceRegions.length > 0 ? 'Yes' : 'No'}
- Has Products: ${vision.productRegions.length > 0 ? 'Yes' : 'No'}

VISUAL WEIGHT MAP:
${vision.visualWeightMap?.map(w => `  ${w.regionType}: importance=${w.importanceScore}, attention=${w.attentionScore}, protection=${w.protectionPriority}`).join('\n') || '  Not available'}

CONTENT TO PLACE:
- Headline: "${copy.headline}" (${copy.headline.split(' ').length} words)
- Subheadline: "${copy.subheadline}"
- CTA: "${copy.cta}"
${copy.supportingText ? `- Supporting: "${copy.supportingText}"` : ''}
- Logo: ${hasLogo ? 'YES (include logo section)' : 'NO (do NOT include logo section)'}

TYPOGRAPHY:
- Display Font: ${typography.displayFont}
- Body Font: ${typography.bodyFont}
- Headline Size: ${typography.headlineSize}px
- Alignment: ${typography.alignment}

DESIGN OBJECTIVES:
${designObjectives}

${recommendedStrategy ? `RECOMMENDED STRATEGY: ${recommendedStrategy}` : ''}
${strategyHint ? `STRATEGY HINT: ${strategyHint}` : ''}

Choose the best layout strategy for this specific image and content. Explain your reasoning.
`;

  const result = await callAgent({
    prompt,
    systemInstruction,
    responseSchema: WebLayoutSchema,
    temperature: 0.3,
  });

  return result as WebLayoutOutput;
}

export default runWebLayoutAgent;
