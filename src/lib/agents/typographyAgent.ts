import { callAgent } from './gemini';
import { Concept, TypographyTokens } from '@/types/agents';

// Default preloaded Google Fonts pairings
export const DEFAULT_FONTS = [
  { name: 'Montserrat', familyName: 'Montserrat', category: 'display' },
  { name: 'Playfair Display', familyName: 'Playfair Display', category: 'display' },
  { name: 'Bebas Neue', familyName: 'Bebas Neue', category: 'display' },
  { name: 'Inter', familyName: 'Inter', category: 'body' },
  { name: 'Roboto', familyName: 'Roboto', category: 'body' },
  { name: 'Merriweather', familyName: 'Merriweather', category: 'body' }
];

const TypographyTokensSchema = {
  type: 'OBJECT',
  properties: {
    displayFont: { type: 'STRING', description: 'Selected display/headline font family name. Must be chosen from the available list.' },
    bodyFont: { type: 'STRING', description: 'Selected body/subheadline font family name. Must be chosen from the available list.' },
    headlineSize: { type: 'INTEGER', description: 'Recommended size in pixels for the primary headline (e.g. 64 to 96)' },
    subheadlineSize: { type: 'INTEGER', description: 'Recommended size in pixels for the subheadline (e.g. 28 to 36)' },
    bodySize: { type: 'INTEGER', description: 'Recommended size in pixels for the body/supporting text (e.g. 18 to 24)' },
    ctaSize: { type: 'INTEGER', description: 'Recommended size in pixels for the CTA text (e.g. 20 to 26)' },
    lineHeight: { type: 'NUMBER', description: 'Line spacing coefficient, e.g. 1.1, 1.2, 1.4' },
    tracking: { type: 'NUMBER', description: 'Letter spacing offset in pixels (can be negative or positive, e.g. -1, 0, 2, 4)' },
    alignment: { type: 'STRING', description: 'Text alignment constraint: "left", "center", or "right"' },
    fontWeightDisplay: { type: 'STRING', description: 'Font weight for display text (e.g. "700", "800", "bold")' },
    fontWeightBody: { type: 'STRING', description: 'Font weight for body text (e.g. "400", "300", "normal")' }
  },
  required: [
    'displayFont', 'bodyFont', 'headlineSize', 'subheadlineSize',
    'bodySize', 'ctaSize', 'lineHeight', 'tracking', 'alignment',
    'fontWeightDisplay', 'fontWeightBody'
  ]
};

/**
 * Typography Agent: Selects font pairings and sets type tokens.
 */
export async function runTypographyAgent(
  concept: Concept,
  availableFonts: Array<{ name: string; familyName: string; category: string }>
): Promise<TypographyTokens> {
  const fontPool = availableFonts.length > 0 ? availableFonts : DEFAULT_FONTS;

  const fontListText = fontPool
    .map(f => `- Family: "${f.familyName}" (Category: ${f.category})`)
    .join('\n');

  const systemInstruction = `You are a Typography and Editorial Layout Expert.
Your task is to select a Display Font (for headlines) and a Body Font (for subheadlines, body, and CTA) from the list of available fonts.
Rules:
- Never use the same font for both display and body.
- Display Font should match the brand tone (e.g., Serif like "Playfair Display" for luxury/jewellery; Sans-serif like "Bebas Neue" for bold/sale; "Montserrat" or "Inter" for modern/clean).
- Body Font must be highly readable (e.g., "Inter", "Roboto").
- Adjust relative font sizes (reference canvas width is 1000px). Headline size must be at least 2.5x body size.
- Choose alignment: left (standard editorial), center (premium minimal), or right.
Output strictly JSON conforming to the schema.`;

  const prompt = `
CREATIVE CONCEPT STRATEGY:
- Campaign: ${concept.campaignType}
- Visual Strategy: ${concept.visualStrategy}
- Hierarchy Strategy: ${concept.hierarchyStrategy}

AVAILABLE FONTS IN DATABASE:
${fontListText}

Pick the best font pairing and output the typography tokens JSON.
`;

  const result = await callAgent({
    prompt,
    systemInstruction,
    responseSchema: TypographyTokensSchema,
    temperature: 0.2
  });

  return result as TypographyTokens;
}

export default runTypographyAgent;
