import { callAgent } from './gemini';
import { LayoutOutput, CriticOutput, LayoutElement } from '@/types/agents';

// ── Delta-based repair schema ─────────────────────────────────────────────────
// The repair agent outputs CHANGES, not a full new layout.
// Each change names the element, the field modified, before/after values, and reason.
const RepairDeltaSchema = {
  type: 'OBJECT',
  properties: {
    changes: {
      type: 'ARRAY',
      description: 'List of targeted coordinate or color adjustments. Each change modifies exactly one element property.',
      items: {
        type: 'OBJECT',
        properties: {
          element_id:   { type: 'STRING', description: 'ID of the element being modified (e.g. "headline", "cta")' },
          field:        { type: 'STRING', description: 'Which property to change: "x", "y", "width", "height", "color", "rotation", or "zIndex"' },
          from:         { type: 'STRING', description: 'Current value of the field as a string (e.g. "12.5" or "#FF0000")' },
          to:           { type: 'STRING', description: 'New value for the field after repair as a string (e.g. "15.0" or "#FFFFFF")' },
          reason:       { type: 'STRING', description: 'One-sentence explanation of why this change improves the design' }
        },
        required: ['element_id', 'field', 'from', 'to', 'reason']
      }
    }
  },
  required: ['changes']
};

interface RepairDelta {
  element_id: string;
  field: string;
  from: string;
  to: string;
  reason: string;
}

interface RepairAgentParams {
  layout: LayoutOutput;
  critique: CriticOutput & { face_safety?: number; product_safety?: number; overall?: number };
  rulesText: string;
  vision?: { faceRegions: any[]; productRegions: any[]; safeTextRegions: any[] };
}

/**
 * Applies a list of repair deltas to the existing layout, returning a new layout.
 * This is deterministic — no Gemini call needed for the application step.
 */
function applyDeltas(layout: LayoutOutput, changes: RepairDelta[]): LayoutOutput {
  const elements = layout.elements.map(el => ({ ...el }));

  for (const change of changes) {
    const el = elements.find(e => e.id === change.element_id);
    if (!el) {
      console.warn(`Repair delta: element "${change.element_id}" not found — skipping`);
      continue;
    }
    const field = change.field as keyof LayoutElement;
    if (field in el) {
      let val: any = change.to;
      if (['x', 'y', 'width', 'height', 'rotation', 'zIndex'].includes(change.field)) {
        val = parseFloat(change.to);
        if (isNaN(val)) {
          console.warn(`Repair delta: invalid numeric value "${change.to}" for field "${change.field}" — skipping`);
          continue;
        }
      }
      // Guarantee colors are valid hex strings
      if (change.field === 'color') {
        if (!val.startsWith('#') && /^[0-9a-fA-F]{6}$/.test(val)) {
          val = `#${val}`;
        }
      }
      (el as any)[field] = val;
    }
  }

  return { elements };
}

/**
 * Repair Agent: Generates targeted coordinate deltas based on critic category scores.
 * Produces an auditable change log (element, from, to, reason) rather than a full layout rewrite.
 */
export async function runRepairAgent(params: RepairAgentParams): Promise<{ layout: LayoutOutput; deltas: RepairDelta[] }> {
  const { layout, critique, rulesText, vision } = params;

  // Identify weakest categories to focus repair effort
  const categoryScores: Record<string, number> = {
    face_safety:    (critique as any).face_safety    ?? 100,
    product_safety: (critique as any).product_safety ?? 100,
    contrast:       (critique as any).contrast       ?? 100,
    hierarchy:      (critique as any).hierarchy      ?? 100,
    composition:    (critique as any).composition    ?? 100,
  };

  const weakCategories = Object.entries(categoryScores)
    .filter(([, v]) => v < 80)
    .sort(([, a], [, b]) => a - b)
    .map(([k, v]) => `  - ${k}: ${v}/100`)
    .join('\n');

  const systemInstruction = `You are a Layout Repair Agent in an autonomous design system.

Your job is to produce MINIMAL, TARGETED coordinate adjustments (deltas) that improve the weakest scoring areas.

RULES:
1. Output ONLY changes. Do NOT re-output the entire layout.
2. Each change modifies exactly ONE field of ONE element.
3. Prioritize face_safety and product_safety violations first — elements overlapping faces or products must be moved immediately.
4. Do NOT move elements into a protected region while fixing another issue (local optimization trap).
5. Preserve the overall composition — avoid moving elements that are already correctly placed.
6. Stay within 8% canvas margins (x: 8-92, y: 8-92).
7. Output strictly JSON conforming to the schema.`;

  const safeRegionsText = vision?.safeTextRegions
    ? `SAFE TEXT REGIONS (move elements INTO these zones):\n${JSON.stringify(vision.safeTextRegions, null, 2)}`
    : '';

  const forbiddenText = vision
    ? `FORBIDDEN REGIONS (never place text here):\n- Faces: ${JSON.stringify(vision.faceRegions)}\n- Products: ${JSON.stringify(vision.productRegions)}`
    : '';

  const prompt = `
CURRENT LAYOUT (element IDs, current coordinates):
${JSON.stringify(layout.elements.map(e => ({ id: e.id, type: e.type, x: e.x, y: e.y, width: e.width, height: e.height })), null, 2)}

WEAKEST SCORING CATEGORIES (fix these first):
${weakCategories || '  All categories scoring well — make micro-refinements only.'}

CRITIC ISSUES TO FIX:
${critique.issues.map(i => `- ${i}`).join('\n')}

CRITIC REPAIR INSTRUCTIONS:
${critique.fixes.map(f => `- ${f}`).join('\n')}

${safeRegionsText}
${forbiddenText}

DESIGN CONSTITUTION:
${rulesText}

Generate ONLY the minimal set of coordinate deltas needed to improve the design. Each delta must have a clear reason.
`;

  const result = await callAgent({
    prompt,
    systemInstruction,
    responseSchema: RepairDeltaSchema,
    temperature: 0.1
  });

  const deltas: RepairDelta[] = (result as any).changes || [];
  const repairedLayout = applyDeltas(layout, deltas);

  return { layout: repairedLayout, deltas };
}

export default runRepairAgent;
