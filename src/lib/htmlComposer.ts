/**
 * HTML Composer — The Core of PosterBoy V2
 * ══════════════════════════════════════════
 * Takes semantic layout output (strategy + sections + tokens) and produces
 * a self-contained HTML document styled with CSS Grid/Flexbox.
 *
 * NO coordinate generation. NO absolute positioning.
 * The browser layout engine handles all positioning.
 *
 * The output HTML can be:
 * 1. Rendered in an iframe for live preview
 * 2. Screenshotted for PNG export
 * 3. Exported as a standalone HTML file
 */

import {
  WebLayoutOutput,
  LayoutStrategy,
  SectionDefinition,
  DesignTokens,
  TypographyTokens,
  CopywriterOutput,
} from '@/types/agents';

// ── Layout Strategy → CSS Grid Template Mapping ─────────────────────────────

const STRATEGY_CSS: Record<LayoutStrategy, string> = {
  'hero-left': `
    .poster { display: grid; grid-template-columns: 55% 45%; grid-template-rows: 1fr; }
    .poster__content { grid-column: 1; display: flex; flex-direction: column; justify-content: center; padding: var(--pad); gap: var(--gap); z-index: 2; }
    .poster__image-zone { grid-column: 2; }
  `,
  'hero-right': `
    .poster { display: grid; grid-template-columns: 45% 55%; grid-template-rows: 1fr; }
    .poster__content { grid-column: 2; display: flex; flex-direction: column; justify-content: center; padding: var(--pad); gap: var(--gap); z-index: 2; }
    .poster__image-zone { grid-column: 1; }
  `,
  'hero-overlay': `
    .poster { display: grid; grid-template-columns: 1fr; grid-template-rows: 1fr; }
    .poster__content { grid-column: 1; grid-row: 1; display: flex; flex-direction: column; justify-content: flex-end; padding: var(--pad); padding-bottom: calc(var(--pad) * 2); gap: var(--gap); z-index: 2; }
    .poster__image-zone { grid-column: 1; grid-row: 1; }
    .poster__scrim { grid-column: 1; grid-row: 1; z-index: 1; background: linear-gradient(to top, var(--scrim-color) 0%, transparent 60%); }
  `,
  'editorial-split': `
    .poster { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr; }
    .poster__content { grid-column: 1; display: flex; flex-direction: column; justify-content: center; padding: var(--pad); gap: var(--gap); z-index: 2; }
    .poster__image-zone { grid-column: 2; }
  `,
  'centered-story': `
    .poster { display: grid; grid-template-columns: 1fr; grid-template-rows: 1fr; place-items: center; }
    .poster__content { grid-column: 1; grid-row: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: var(--pad); gap: var(--gap); z-index: 2; max-width: 80%; }
    .poster__image-zone { grid-column: 1; grid-row: 1; }
    .poster__scrim { grid-column: 1; grid-row: 1; z-index: 1; background: radial-gradient(ellipse at center, var(--scrim-color) 0%, transparent 75%); }
  `,
  'minimal-premium': `
    .poster { display: grid; grid-template-columns: 1fr; grid-template-rows: 1fr; }
    .poster__content { grid-column: 1; grid-row: 1; display: flex; flex-direction: column; justify-content: flex-end; align-items: flex-start; padding: calc(var(--pad) * 2); gap: calc(var(--gap) * 1.5); z-index: 2; }
    .poster__image-zone { grid-column: 1; grid-row: 1; }
    .poster__scrim { grid-column: 1; grid-row: 1; z-index: 1; background: linear-gradient(135deg, var(--scrim-color) 0%, transparent 50%); }
  `,
  'feature-focused': `
    .poster { display: grid; grid-template-columns: 1fr; grid-template-rows: 60% 40%; }
    .poster__image-zone { grid-row: 1; }
    .poster__content { grid-row: 2; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: var(--pad); gap: var(--gap); z-index: 2; background: var(--bg-color); }
  `,
  'magazine': `
    .poster { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: auto 1fr auto; }
    .poster__image-zone { grid-column: 1 / -1; grid-row: 1 / -1; }
    .poster__content { grid-column: 1; grid-row: 1 / -1; display: flex; flex-direction: column; justify-content: space-between; padding: var(--pad); gap: var(--gap); z-index: 2; }
    .poster__scrim { grid-column: 1; grid-row: 1 / -1; z-index: 1; background: linear-gradient(to right, var(--scrim-color) 0%, transparent 80%); }
  `,
  'narrative': `
    .poster { display: grid; grid-template-columns: 1fr; grid-template-rows: auto 1fr auto; }
    .poster__image-zone { grid-column: 1; grid-row: 1 / -1; }
    .poster__content { grid-column: 1; grid-row: 1 / -1; display: flex; flex-direction: column; justify-content: space-between; padding: var(--pad); gap: var(--gap); z-index: 2; }
    .poster__scrim { grid-column: 1; grid-row: 1 / -1; z-index: 1; background: linear-gradient(to bottom, transparent 0%, var(--scrim-color) 40%, var(--scrim-color) 60%, transparent 100%); }
  `,
  'information-dense': `
    .poster { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; }
    .poster__image-zone { grid-column: 1 / -1; grid-row: 1 / -1; }
    .poster__content { grid-column: 1 / -1; grid-row: 1 / -1; display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr auto; gap: var(--gap); padding: var(--pad); z-index: 2; }
    .poster__scrim { grid-column: 1 / -1; grid-row: 1 / -1; z-index: 1; background: var(--scrim-color); }
  `,
};

// ── Placement → CSS alignment mapping ───────────────────────────────────────

function getPlacementStyles(placement: SectionDefinition['placement']): string {
  const map: Record<string, string> = {
    'top-left':      'align-self: flex-start; text-align: left;',
    'top-center':    'align-self: flex-start; text-align: center;',
    'top-right':     'align-self: flex-start; text-align: right;',
    'center-left':   'align-self: center; text-align: left;',
    'center':        'align-self: center; text-align: center;',
    'center-right':  'align-self: center; text-align: right;',
    'bottom-left':   'align-self: flex-end; text-align: left;',
    'bottom-center': 'align-self: flex-end; text-align: center;',
    'bottom-right':  'align-self: flex-end; text-align: right;',
  };
  return map[placement] || '';
}

// ── Spacing token → CSS value mapping ───────────────────────────────────────

function getSpacingValues(spacing: DesignTokens['spacing']): { pad: string; gap: string } {
  const map: Record<string, { pad: string; gap: string }> = {
    'tight':     { pad: '4%',  gap: '1.5%' },
    'normal':    { pad: '6%',  gap: '2.5%' },
    'generous':  { pad: '8%',  gap: '3.5%' },
    'luxurious': { pad: '12%', gap: '5%' },
  };
  return map[spacing] || map['normal'];
}

// ── Section → HTML element mapping ──────────────────────────────────────────

function renderSection(section: SectionDefinition, typography: TypographyTokens): string {
  const placementCSS = getPlacementStyles(section.placement);
  const overrides = section.cssOverrides
    ? Object.entries(section.cssOverrides).map(([k, v]) => `${k}: ${v};`).join(' ')
    : '';

  switch (section.role) {
    case 'headline':
      return `<h1 class="poster__headline" style="${placementCSS} ${overrides}">${section.content || ''}</h1>`;

    case 'subheadline':
      return `<p class="poster__subheadline" style="${placementCSS} ${overrides}">${section.content || ''}</p>`;

    case 'body':
    case 'supporting':
      return `<p class="poster__body" style="${placementCSS} ${overrides}">${section.content || ''}</p>`;

    case 'cta':
      return `<a class="poster__cta" href="#" style="${placementCSS} ${overrides}">${section.content || 'Learn More'}</a>`;

    case 'logo':
      // CRITICAL: Only render if content is provided (actual logo URL or text).
      // NEVER render placeholder logos.
      if (!section.content) return '';
      return `<div class="poster__logo" style="${placementCSS} ${overrides}">${section.content}</div>`;

    case 'spacer':
      return `<div class="poster__spacer" style="${overrides}"></div>`;

    case 'trust-markers':
      return `<div class="poster__trust" style="${placementCSS} ${overrides}">${section.content || ''}</div>`;

    default:
      return '';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main composer function
// ═══════════════════════════════════════════════════════════════════════════════

export interface ComposeOptions {
  layout: WebLayoutOutput;
  typography: TypographyTokens;
  copy: CopywriterOutput;
  imageBase64?: string;       // data:image/... URL or base64
  imageUrl?: string;          // HTTP URL for the background image
  logoUrl?: string | null;    // Only if user uploaded a logo
  canvasWidth?: number;       // default 1080
  canvasHeight?: number;      // default 1080
  fonts?: Array<{ familyName: string; fileUrl: string }>;  // user-uploaded fonts
}

export function composeHTML(options: ComposeOptions): string {
  const {
    layout,
    typography,
    copy,
    imageBase64,
    imageUrl,
    logoUrl,
    canvasWidth = 1080,
    canvasHeight = 1080,
    fonts = [],
  } = options;

  const tokens = layout.designTokens;
  const spacingVals = getSpacingValues(tokens.spacing);

  // Build the image source (prefer base64 for self-contained export)
  const imgSrc = imageBase64 || imageUrl || '';

  // Strategy-specific CSS
  const strategyCss = STRATEGY_CSS[layout.strategy] || STRATEGY_CSS['hero-overlay'];

  // Populate section content from copy
  const sections = layout.sections.map(section => {
    const populated = { ...section };
    switch (section.role) {
      case 'headline':
        populated.content = copy.headline;
        break;
      case 'subheadline':
        populated.content = copy.subheadline;
        break;
      case 'cta':
        populated.content = copy.cta;
        break;
      case 'supporting':
      case 'body':
        populated.content = copy.supportingText || section.content || '';
        break;
      case 'logo':
        // Only populate if user actually uploaded a logo
        populated.content = logoUrl ? `<img src="${logoUrl}" alt="Logo" style="max-height: 100%; max-width: 100%; object-fit: contain;" />` : '';
        break;
    }
    return populated;
  });

  // Build section HTML
  const sectionsHtml = sections
    .map(s => renderSection(s, typography))
    .filter(Boolean)
    .join('\n      ');

  // Font imports
  const displayFontSafe = typography.displayFont || 'Inter';
  const bodyFontSafe = typography.bodyFont || 'Inter';
  const googleFontFamilies = [displayFontSafe, bodyFontSafe]
    .filter(f => !fonts.some(uf => uf.familyName === f))
    .map(f => f.replace(/ /g, '+'))
    .join('&family=');

  const googleFontsLink = googleFontFamilies
    ? `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=${googleFontFamilies}:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">`
    : '';

  const uploadedFontFaces = fonts.map(f => `
    @font-face {
      font-family: '${f.familyName}';
      src: url('${f.fileUrl}') format('woff2');
      font-display: swap;
    }
  `).join('\n');

  // Determine if we need a scrim element
  const needsScrim = ['hero-overlay', 'centered-story', 'minimal-premium', 'magazine', 'narrative', 'information-dense'].includes(layout.strategy);

  const scrimColor = `rgba(0,0,0,${tokens.scrimOpacity || 0.4})`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=${canvasWidth}">
  ${googleFontsLink}
  <style>
    ${uploadedFontFaces}

    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

    :root {
      --primary: ${tokens.primaryColor};
      --secondary: ${tokens.secondaryColor};
      --text: ${tokens.textColor};
      --accent: ${tokens.accentColor};
      --bg-color: ${tokens.backgroundColor};
      --scrim-color: ${scrimColor};
      --pad: ${spacingVals.pad};
      --gap: ${spacingVals.gap};
      --radius: ${tokens.borderRadius};
      --display-font: '${displayFontSafe}', sans-serif;
      --body-font: '${bodyFontSafe}', sans-serif;
    }

    body {
      width: ${canvasWidth}px;
      height: ${canvasHeight}px;
      overflow: hidden;
      background: #000;
    }

    .poster {
      position: relative;
      width: ${canvasWidth}px;
      height: ${canvasHeight}px;
      overflow: hidden;
      container-type: inline-size;
    }

    .poster__image-zone {
      position: relative;
      overflow: hidden;
    }

    .poster__image-zone img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .poster__scrim {
      pointer-events: none;
    }

    /* Layout strategy */
    ${strategyCss}

    /* Typography */
    .poster__headline {
      font-family: var(--display-font);
      font-size: ${(typography.headlineSize / 10).toFixed(1)}cqw;
      font-weight: ${typography.fontWeightDisplay};
      line-height: ${typography.lineHeight};
      letter-spacing: ${(typography.tracking / 10).toFixed(2)}cqw;
      color: var(--text);
      ${tokens.textShadow ? 'text-shadow: 0 2px 12px rgba(0,0,0,0.5);' : ''}
      word-break: break-word;
    }

    .poster__subheadline {
      font-family: var(--body-font);
      font-size: ${(typography.subheadlineSize / 10).toFixed(1)}cqw;
      font-weight: ${typography.fontWeightBody};
      line-height: ${(typography.lineHeight * 1.1).toFixed(2)};
      color: var(--text);
      opacity: 0.85;
      ${tokens.textShadow ? 'text-shadow: 0 1px 8px rgba(0,0,0,0.4);' : ''}
    }

    .poster__body {
      font-family: var(--body-font);
      font-size: ${(typography.bodySize / 10).toFixed(1)}cqw;
      font-weight: ${typography.fontWeightBody};
      line-height: ${(typography.lineHeight * 1.2).toFixed(2)};
      color: var(--text);
      opacity: 0.75;
    }

    .poster__cta {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-family: var(--display-font);
      font-size: ${(typography.ctaSize / 10).toFixed(1)}cqw;
      font-weight: 700;
      color: #fff;
      background: var(--accent);
      padding: 1.2cqw 3.5cqw;
      border-radius: var(--radius);
      text-decoration: none;
      letter-spacing: 0.05em;
      border: none;
      cursor: pointer;
      align-self: flex-start;
      ${tokens.textShadow ? '' : 'box-shadow: 0 4px 14px rgba(0,0,0,0.25);'}
    }

    .poster__logo {
      max-height: 5cqw;
      max-width: 20cqw;
    }

    .poster__logo img {
      max-height: 100%;
      max-width: 100%;
      object-fit: contain;
    }

    .poster__spacer {
      flex: 1;
    }

    .poster__trust {
      font-family: var(--body-font);
      font-size: ${(typography.bodySize * 0.8 / 10).toFixed(1)}cqw;
      color: var(--text);
      opacity: 0.5;
    }
  </style>
</head>
<body>
  <div class="poster">
    <div class="poster__image-zone">
      <img src="${imgSrc}" alt="" />
    </div>
    ${needsScrim ? '<div class="poster__scrim"></div>' : ''}
    <div class="poster__content">
      ${sectionsHtml}
    </div>
  </div>
</body>
</html>`;
}

export default composeHTML;
