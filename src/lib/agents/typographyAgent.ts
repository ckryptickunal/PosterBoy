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
    displayFont: { type: 'STRING', description: 'The EXACT family name string of the chosen display font, taken verbatim from the available fonts list.' },
    bodyFont: { type: 'STRING', description: 'The EXACT family name string of the chosen body font, taken verbatim from the available fonts list.' },
    headlineSize: { type: 'INTEGER', description: 'Headline size in pixels (64–96 range)' },
    subheadlineSize: { type: 'INTEGER', description: 'Subheadline size in pixels (28–36 range)' },
    bodySize: { type: 'INTEGER', description: 'Body/supporting text size in pixels (18–24 range)' },
    ctaSize: { type: 'INTEGER', description: 'CTA text size in pixels (20–26 range)' },
    lineHeight: { type: 'NUMBER', description: 'Line height coefficient, e.g. 1.1, 1.2, 1.4' },
    tracking: { type: 'NUMBER', description: 'Letter spacing offset in pixels (e.g. -1, 0, 2, 4)' },
    alignment: { type: 'STRING', description: 'Text alignment: must be exactly "left", "center", or "right"' },
    fontWeightDisplay: { type: 'STRING', description: 'Font weight for display (e.g. "700", "800", "bold")' },
    fontWeightBody: { type: 'STRING', description: 'Font weight for body (e.g. "400", "300", "normal")' }
  },
  required: [
    'displayFont', 'bodyFont', 'headlineSize', 'subheadlineSize',
    'bodySize', 'ctaSize', 'lineHeight', 'tracking', 'alignment',
    'fontWeightDisplay', 'fontWeightBody'
  ]
};

/**
 * Typography Agent: Selects font pairings and sets type tokens.
 * Font names must match exactly from the available pool — no hallucination.
 */
export async function runTypographyAgent(
  concept: Concept,
  availableFonts: Array<any>
): Promise<TypographyTokens> {
  // Guarantee a valid pool — never pass empty array to Gemini
  const rawPool = (availableFonts && availableFonts.length > 0) ? availableFonts : DEFAULT_FONTS;

  // Normalize casing from SQLite snake_case fields
  const fontPool = rawPool.map(f => ({
    name:       f.name,
    familyName: f.familyName || f.family_name || f.name,
    category:   f.category || 'body'
  }));

  const displayFonts = fontPool.filter(f => f.category === 'display');
  const bodyFonts = fontPool.filter(f => f.category === 'body');

  // Safety: if pool has no display/body split, use all as both
  const displayOptions = displayFonts.length > 0 ? displayFonts : fontPool;
  const bodyOptions = bodyFonts.length > 0 ? bodyFonts : fontPool;

  // Build an explicit, numbered list so the model can't hallucinate outside of it
  const displayList = displayOptions.map((f, i) => `  ${i + 1}. "${f.familyName}"`).join('\n');
  const bodyList = bodyOptions.map((f, i) => `  ${i + 1}. "${f.familyName}"`).join('\n');

  const systemInstruction = `You are a Typography Expert for digital design.
Your job is to choose one Display font and one Body font from EXACTLY the lists provided.

RULES:
1. You MUST choose displayFont from the DISPLAY FONTS LIST only.
2. You MUST choose bodyFont from the BODY FONTS LIST only.
3. Copy the family name character-for-character. Never write "undefined", "null", or any name not in the list.
4. Display and Body fonts must be different families.
5. Output strictly JSON conforming to the schema.`;

  const prompt = `
CREATIVE CONCEPT:
- Campaign: ${concept.campaignType || 'general'}
- Visual Strategy: ${concept.visualStrategy || 'modern'}
- Hierarchy Strategy: ${concept.hierarchyStrategy || 'standard'}

DISPLAY FONTS LIST (choose ONE for displayFont):
${displayList}

BODY FONTS LIST (choose ONE for bodyFont):
${bodyList}

Choose the best pairing for this concept and output the full typography tokens JSON.
`;

  const result = await callAgent({
    prompt,
    systemInstruction,
    responseSchema: TypographyTokensSchema,
    temperature: 0.1 // low temp = less hallucination on font names
  });

  const tokens = result as TypographyTokens;

  // ── Post-call validation: catch undefined/null font names ──────────────────
  const allFamilyNames = fontPool.map(f => f.familyName);

  if (!tokens.displayFont || tokens.displayFont === 'undefined' || !allFamilyNames.includes(tokens.displayFont)) {
    const fallback = displayOptions[0]?.familyName;
    if (!fallback) throw new Error('Typography Agent: No display fonts available in pool and model returned invalid font.');
    console.warn(`Typography Agent returned invalid displayFont "${tokens.displayFont}" — falling back to "${fallback}"`);
    tokens.displayFont = fallback;
  }

  if (!tokens.bodyFont || tokens.bodyFont === 'undefined' || !allFamilyNames.includes(tokens.bodyFont)) {
    const fallback = bodyOptions[0]?.familyName;
    if (!fallback) throw new Error('Typography Agent: No body fonts available in pool and model returned invalid font.');
    console.warn(`Typography Agent returned invalid bodyFont "${tokens.bodyFont}" — falling back to "${fallback}"`);
    tokens.bodyFont = fallback;
  }

  if (tokens.displayFont === tokens.bodyFont) {
    // Force body to be different
    const altBody = bodyOptions.find(f => f.familyName !== tokens.displayFont);
    if (altBody) tokens.bodyFont = altBody.familyName;
  }

  return tokens;
}

export default runTypographyAgent;
