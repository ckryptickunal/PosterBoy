# Design Constitution: PosterBoy Core Rules

This constitution dictates the design rules and constraints enforced by all agents.

---

## Rule 1: Never Cover Faces
- **Priority**: CRITICAL
- **Description**: Text blocks, icons, logos, or shapes must never intersect with any detected human face region. Keep a minimum spacing of 40px from the boundary of any face region.

## Rule 2: Never Cover Primary Products
- **Priority**: CRITICAL
- **Description**: Text elements, CTAs, and secondary graphics must never overlap the main product region (e.g. jewellery, watches, clothing, tech gear) unless it is a design overlay requested by the prompt (e.g. a subtle background glow).

## Rule 3: Maintain 8% Margins
- **Priority**: HIGH
- **Description**: All design elements must remain within a safe content boundary. Calculate margins as 8% of the canvas width and height. Do not position text blocks or primary CTAs inside the margin boundaries.

## Rule 4: Maximum 3-4 Text Blocks
- **Priority**: HIGH
- **Description**: To prevent visual clutter, a single design canvas is limited to a maximum of 4 text blocks (e.g. 1 Headline, 1 Subheadline, 1 CTA, 1 Supporting Text).

## Rule 5: Minimum Contrast Ratio (4.5:1)
- **Priority**: HIGH
- **Description**: Text elements must stand out against their underlying background region. If a text block overlaps a high-detail or high-contrast background area, it must be repositioned to an empty/background region or rendered with a background shape/glow to guarantee readability.

## Rule 6: Respect Typography Hierarchy
- **Priority**: HIGH
- **Description**: Display/Headline fonts must be significantly larger than body/subheadline fonts (minimum 2.5x size ratio). Headline tracking should be tight, and body tracking should be legible.

## Rule 7: Rule of Thirds Placement
- **Priority**: MEDIUM
- **Description**: Place primary focal text or visual anchors close to the composition's vertical or horizontal third axes. Align CTA buttons relative to text blocks to create clear, sequential reading flows.

## Rule 8: Preserve Negative Space
- **Priority**: HIGH
- **Description**: Do not fill every empty region. A minimum of 30% of the canvas must remain clear of text and overlay elements to maintain a luxury, high-end feel.
