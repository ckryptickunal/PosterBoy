import { callAgent } from './gemini';
import { Concept, TypographyTokens } from '@/types/agents';

const TypographyTokensSchema = {
  type: 'OBJECT',
  properties: {
    displayFont: { type: 'STRING', description: 'The EXACT family name string of the chosen display font, taken verbatim from the available DISPLAY FONTS list.' },
    bodyFont: { type: 'STRING', description: 'The EXACT family name string of the chosen body font, taken verbatim from the available BODY FONTS list.' },
    headlineSize: { type: 'INTEGER', description: 'Intelligent headline font size in px (e.g. 50–96) determined by copy length and canvas balance.' },
    subheadlineSize: { type: 'INTEGER', description: 'Intelligent subheadline font size in px (e.g. 24–38) based on campaign density.' },
    bodySize: { type: 'INTEGER', description: 'Intelligent body font size in px (e.g. 14–24).' },
    ctaSize: { type: 'INTEGER', description: 'Intelligent CTA font size in px (e.g. 16–26).' },
    lineHeight: { type: 'NUMBER', description: 'Line height coefficient (e.g. 1.0, 1.15, 1.35) matching the selected font and sizing.' },
    tracking: { type: 'NUMBER', description: 'Letter spacing offset in px (e.g. -2, -1, 0, 2, 4) calculated for aesthetic balance.' },
    alignment: { type: 'STRING', description: 'Text alignment matching layout logic: "left", "center", or "right".' },
    fontWeightDisplay: { type: 'STRING', description: 'Font weight for display/headline (e.g. "700", "800", "bold", "normal").' },
    fontWeightBody: { type: 'STRING', description: 'Font weight for body/subheadline (e.g. "400", "300", "normal", "light").' },
    reasoning: { type: 'STRING', description: 'Detailed visual explanation of typography selection, design choices, and size settings relative to the campaign concept.' }
  },
  required: [
    'displayFont', 'bodyFont', 'headlineSize', 'subheadlineSize',
    'bodySize', 'ctaSize', 'lineHeight', 'tracking', 'alignment',
    'fontWeightDisplay', 'fontWeightBody', 'reasoning'
  ]
};

/**
 * Typography Agent: Selects font pairings and sets type tokens.
 * Font names must match exactly from the available pool — no default fallback allowed.
 */
export async function runTypographyAgent(
  concept: Concept,
  availableFonts: Array<any>,
  styleHint: string = ''
): Promise<TypographyTokens> {
  // Guard: Fail fast if no fonts are uploaded by the user
  if (!availableFonts || availableFonts.length === 0) {
    throw new Error('Typography Agent: No fonts available in pool. Please upload at least one display font and one body font first.');
  }

  // Normalize casing from SQLite fields
  const fontPool = availableFonts.map(f => ({
    name:       f.name,
    familyName: f.familyName || f.family_name || f.name,
    category:   f.category || 'body'
  }));

  const displayFonts = fontPool.filter(f => f.category === 'display');
  const bodyFonts = fontPool.filter(f => f.category === 'body');

  if (displayFonts.length === 0) {
    throw new Error('Typography Agent: No fonts categorized as "display" available. Please upload a display font.');
  }
  if (bodyFonts.length === 0) {
    throw new Error('Typography Agent: No fonts categorized as "body" available. Please upload a body font.');
  }

  // Build explicit lists of family names
  const displayList = displayFonts.map((f, i) => `  ${i + 1}. "${f.familyName}"`).join('\n');
  const bodyList = bodyFonts.map((f, i) => `  ${i + 1}. "${f.familyName}"`).join('\n');

  const systemInstruction = `You are a Typography Expert for digital design.
Your job is to choose one Display font and one Body font from EXACTLY the lists provided.

RULES:
1. You MUST choose displayFont from the DISPLAY FONTS LIST only.
2. You MUST choose bodyFont from the BODY FONTS LIST only.
3. Copy the family name character-for-character. Never write "undefined", "null", or any name not in the list.
4. Output sizes, tracking, alignment, line heights, and letter spacing dynamically. Do NOT use fixed static presets. Adjust based on copy length, hierarchy strategy, and campaign type.
5. Provide a clear reasoning explaination for your design choices.
6. Output strictly JSON conforming to the schema.`;

  const prompt = `
CREATIVE CONCEPT:
- Campaign: ${concept.campaignType || 'general'}
- Visual Strategy: ${concept.visualStrategy || 'modern'}
- Hierarchy Strategy: ${concept.hierarchyStrategy || 'standard'}

DESIGN HINT FOR THIS CANDIDATE:
${styleHint || 'Create a balanced, clean pairing.'}

AVAILABLE DISPLAY FONTS:
${displayList}

AVAILABLE BODY FONTS:
${bodyList}

Determine the optimal typography pairing, sizes, tracking, and heights. Explain your strategy in the reasoning field.
`;

  const result = await callAgent({
    prompt,
    systemInstruction,
    responseSchema: TypographyTokensSchema,
    temperature: 0.3 // slightly higher temperature to encourage variation between candidates
  });

  const tokens = result as TypographyTokens;

  // Post-call validation: catch invalid font choices
  const displayFamilyNames = displayFonts.map(f => f.familyName);
  const bodyFamilyNames = bodyFonts.map(f => f.familyName);

  if (!tokens.displayFont || !displayFamilyNames.includes(tokens.displayFont)) {
    console.warn(`Typography Agent returned invalid displayFont "${tokens.displayFont}" — falling back to "${displayFamilyNames[0]}"`);
    tokens.displayFont = displayFamilyNames[0];
  }

  if (!tokens.bodyFont || !bodyFamilyNames.includes(tokens.bodyFont)) {
    console.warn(`Typography Agent returned invalid bodyFont "${tokens.bodyFont}" — falling back to "${bodyFamilyNames[0]}"`);
    tokens.bodyFont = bodyFamilyNames[0];
  }

  return tokens;
}

export default runTypographyAgent;
