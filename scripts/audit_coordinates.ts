/**
 * Build Guard — HTML Composer Validation
 * ═══════════════════════════════════════
 * Replaces the old coordinate audit script.
 * Validates that the HTML Composer can produce valid HTML for each layout strategy.
 */

import { composeHTML } from '../src/lib/htmlComposer';
import type { WebLayoutOutput, TypographyTokens, CopywriterOutput } from '../src/types/agents';

const STRATEGIES = [
  'hero-left', 'hero-right', 'hero-overlay', 'editorial-split',
  'centered-story', 'minimal-premium', 'feature-focused',
  'magazine', 'narrative', 'information-dense',
] as const;

const mockTypography: TypographyTokens = {
  displayFont: 'Inter',
  bodyFont: 'Inter',
  headlineSize: 48,
  subheadlineSize: 24,
  bodySize: 16,
  ctaSize: 18,
  lineHeight: 1.2,
  tracking: 0,
  alignment: 'left',
  fontWeightDisplay: '700',
  fontWeightBody: '400',
  reasoning: {
    whyFont: 'test', whyWeight: 'test', whySize: 'test',
    whyAlignment: 'test', whySpacing: 'test',
  },
};

const mockCopy: CopywriterOutput = {
  headline: 'Test Headline',
  subheadline: 'Test Subheadline',
  cta: 'Learn More',
};

console.log('Running HTML Composer build guard...');

let passed = 0;
let failed = 0;

for (const strategy of STRATEGIES) {
  const mockLayout: WebLayoutOutput = {
    strategy,
    sections: [
      { id: 'headline', role: 'headline', placement: 'center-left' },
      { id: 'subheadline', role: 'subheadline', placement: 'center-left' },
      { id: 'cta', role: 'cta', placement: 'bottom-left' },
    ],
    designTokens: {
      primaryColor: '#ffffff',
      secondaryColor: '#cccccc',
      textColor: '#ffffff',
      accentColor: '#3b82f6',
      backgroundColor: '#000000',
      spacing: 'normal',
      borderRadius: '8px',
      textShadow: true,
      scrimOpacity: 0.4,
    },
    reasoning: {
      whyStrategy: 'test', whyPlacements: 'test',
      whyColors: 'test', whyHierarchy: 'test', whySpacing: 'test',
    },
  };

  try {
    const html = composeHTML({
      layout: mockLayout,
      typography: mockTypography,
      copy: mockCopy,
      imageUrl: 'https://example.com/test.jpg',
    });

    if (!html.includes('<!DOCTYPE html>')) throw new Error('Missing DOCTYPE');
    if (!html.includes('.poster')) throw new Error('Layout CSS not found');
    if (!html.includes('Test Headline')) throw new Error('Headline not rendered');

    passed++;
  } catch (e: any) {
    console.error(`✗ Strategy "${strategy}" failed: ${e.message}`);
    failed++;
  }
}

console.log(`✓ HTML Composer audit: ${passed}/${STRATEGIES.length} strategies passed.`);

if (failed > 0) {
  console.error(`✗ ${failed} strategies failed. Build blocked.`);
  process.exit(1);
} else {
  console.log('✓ All layout strategies produce valid HTML!');
}
