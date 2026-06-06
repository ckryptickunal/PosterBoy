/**
 * Constraint Validator
 * ─────────────────────
 * A deterministic, zero-LLM validation layer that runs on every layout candidate
 * BEFORE it is sent to the renderer or the Critic Agent.
 *
 * If a layout fails this check it is REJECTED and regenerated.
 * This prevents bad layouts from ever reaching the canvas.
 */

import { LayoutOutput, LayoutElement, Region, TypographyTokens, ConstraintViolation, ConstraintReport } from '@/types/agents';

const MARGIN = 8; // 8% minimum safe margin from canvas edges

/** Compute intersection-over-union of two rectangles (all values 0-100 %) */
function iou(a: Region, b: { x: number; y: number; width: number; height: number }): number {
  const ax1 = a.x, ay1 = a.y, ax2 = a.x + a.width, ay2 = a.y + a.height;
  const bx1 = b.x, by1 = b.y, bx2 = b.x + b.width, by2 = b.y + b.height;

  const ix1 = Math.max(ax1, bx1);
  const iy1 = Math.max(ay1, by1);
  const ix2 = Math.min(ax2, bx2);
  const iy2 = Math.min(ay2, by2);

  const interW = Math.max(0, ix2 - ix1);
  const interH = Math.max(0, iy2 - iy1);
  const inter = interW * interH;
  if (inter === 0) return 0;

  const aArea = (ax2 - ax1) * (ay2 - ay1);
  const bArea = (bx2 - bx1) * (by2 - by1);
  return inter / (aArea + bArea - inter);
}

/** Returns true if element rect overlaps a protected region more than the threshold */
function overlaps(el: LayoutElement, region: Region, threshold = 0.05): boolean {
  return iou(region, { x: el.x, y: el.y, width: el.width, height: el.height }) > threshold;
}

export function validateLayout(
  layout: LayoutOutput,
  faceRegions: Region[],
  productRegions: Region[],
  typography?: TypographyTokens | null
): ConstraintReport {
  const violations: ConstraintViolation[] = [];

  for (const el of layout.elements) {
    const isTextElement = ['headline', 'subheadline', 'cta', 'supporting_text'].includes(el.type);

    if (!isTextElement) continue;

    // ── 1. Font undefined check ──────────────────────────────────────────────
    if (el.fontFamily === 'undefined' || el.fontFamily === 'null') {
      violations.push({
        type: 'font_undefined',
        elementId: el.id,
        message: `Element "${el.id}" has fontFamily="${el.fontFamily}" — hard fail.`,
        severity: 'critical',
      });
    }

    // ── 2. Face overlap ──────────────────────────────────────────────────────
    for (const face of faceRegions) {
      if (overlaps(el, face, 0.03)) {
        violations.push({
          type: 'face_overlap',
          elementId: el.id,
          message: `Element "${el.id}" overlaps face region at (${face.x.toFixed(1)},${face.y.toFixed(1)}).`,
          severity: 'critical',
        });
      }
    }

    // ── 3. Product overlap ───────────────────────────────────────────────────
    for (const prod of productRegions) {
      if (overlaps(el, prod, 0.05)) {
        violations.push({
          type: 'product_overlap',
          elementId: el.id,
          message: `Element "${el.id}" overlaps product region at (${prod.x.toFixed(1)},${prod.y.toFixed(1)}).`,
          severity: 'critical',
        });
      }
    }

    // ── 4. Margin violations ─────────────────────────────────────────────────
    if (el.x < MARGIN || el.y < MARGIN || (el.x + el.width) > (100 - MARGIN) || (el.y + el.height) > (100 - MARGIN)) {
      violations.push({
        type: 'margin',
        elementId: el.id,
        message: `Element "${el.id}" at (${el.x.toFixed(1)}, ${el.y.toFixed(1)}) violates ${MARGIN}% margin.`,
        severity: 'warning',
      });
    }

    // ── 5. Element overflow ──────────────────────────────────────────────────
    if (el.x < 0 || el.y < 0 || el.x + el.width > 100 || el.y + el.height > 100) {
      violations.push({
        type: 'element_overflow',
        elementId: el.id,
        message: `Element "${el.id}" overflows canvas bounds.`,
        severity: 'critical',
      });
    }
  }

  // ── 6. Typography global check ───────────────────────────────────────────
  if (typography) {
    if (!typography.displayFont || typography.displayFont === 'undefined') {
      violations.push({
        type: 'font_undefined',
        elementId: 'typography',
        message: 'displayFont is undefined in Typography tokens — generation must not continue.',
        severity: 'critical',
      });
    }
    if (!typography.bodyFont || typography.bodyFont === 'undefined') {
      violations.push({
        type: 'font_undefined',
        elementId: 'typography',
        message: 'bodyFont is undefined in Typography tokens — generation must not continue.',
        severity: 'critical',
      });
    }
  }

  const criticalCount = violations.filter(v => v.severity === 'critical').length;
  const warningCount  = violations.filter(v => v.severity === 'warning').length;

  // Score: start at 100, deduct 20 per critical, 5 per warning
  const score = Math.max(0, 100 - criticalCount * 20 - warningCount * 5);
  const valid  = criticalCount === 0;

  return { valid, violations, score };
}
