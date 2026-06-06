import { LayoutElement, TypographyTokens } from '@/types/agents';

// Helper to resolve safe fonts
export function getSafeFont(font: string | null | undefined, isDisplay: boolean): string {
  if (!font || font === 'undefined') {
    return isDisplay ? 'Montserrat' : 'Inter';
  }
  return font;
}

export interface RenderedStyle {
  position: 'absolute';
  left: string;
  top: string;
  width: string;
  height: string;
  zIndex: number;
  transform: string;
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  lineHeight?: string | number;
  letterSpacing?: string;
  textAlign?: string;
  color?: string;
  display?: string;
  alignItems?: string;
  justifyContent?: string;
  backgroundColor?: string;
}

/**
 * Returns the exact styles for a layout element using container query units (cqw)
 * to ensure 100% visual identity between the canvas preview and export HTML.
 */
export function getElementRenderStyles(
  elem: LayoutElement,
  typography: TypographyTokens
): RenderedStyle {
  const isDisplay = elem.type === 'headline';
  const displayFont = getSafeFont(typography.displayFont, true);
  const bodyFont = getSafeFont(typography.bodyFont, false);

  const fontFamily = elem.fontFamily || (isDisplay ? displayFont : bodyFont);
  const rawFontSize = elem.fontSize || (
    isDisplay ? typography.headlineSize :
    elem.type === 'subheadline' ? typography.subheadlineSize :
    elem.type === 'cta' ? typography.ctaSize :
    typography.bodySize
  );

  // Convert pixels to container query units (1000px baseline -> 1cqw = 10px)
  const fontSizeCqw = `${(rawFontSize / 10).toFixed(2)}cqw`;
  const trackingCqw = `${((typography.tracking || 0) / 10).toFixed(2)}cqw`;
  const fontWeight = isDisplay ? typography.fontWeightDisplay : typography.fontWeightBody;

  const baseStyle: RenderedStyle = {
    position: 'absolute',
    left: `${elem.x.toFixed(2)}%`,
    top: `${elem.y.toFixed(2)}%`,
    width: `${elem.width.toFixed(2)}%`,
    height: `${elem.height.toFixed(2)}%`,
    zIndex: elem.zIndex || 10,
    transform: `rotate(${elem.rotation || 0}deg)`,
  };

  if (elem.type === 'cta') {
    return {
      ...baseStyle,
      fontFamily: `'${fontFamily}', sans-serif`,
      fontSize: fontSizeCqw,
      fontWeight: 'bold',
      letterSpacing: trackingCqw,
      textAlign: 'center',
      color: '#ffffff',
      backgroundColor: elem.color || '#3b82f6',
    };
  }

  if (elem.type === 'logo') {
    return baseStyle;
  }

  if (elem.type === 'divider') {
    return baseStyle;
  }

  return {
    ...baseStyle,
    fontFamily: `'${fontFamily}', sans-serif`,
    fontSize: fontSizeCqw,
    fontWeight: fontWeight,
    lineHeight: typography.lineHeight || 1.2,
    letterSpacing: trackingCqw,
    textAlign: typography.alignment || 'left',
    color: elem.color || '#ffffff',
  };
}

/**
 * Returns the inner HTML for an element based on its type.
 */
export function getElementInnerHtml(elem: LayoutElement, style: RenderedStyle): string {
  if (elem.type === 'cta') {
    return `<a href="#" style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; border-radius: 8px; font-family: ${style.fontFamily}; font-size: 1em; font-weight: bold; background-color: ${style.backgroundColor}; color: white; text-decoration: none; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 4px 6px rgba(0,0,0,0.1);">${elem.text || 'CTA'}</a>`;
  }

  if (elem.type === 'logo') {
    return `<div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; border: 1px dashed rgba(255,255,255,0.2); background: rgba(0,0,0,0.2); color: #ccc; font-family: sans-serif; font-size: 1.5cqw; font-weight: bold; letter-spacing: 2px;">${elem.text || 'BRAND'}</div>`;
  }

  if (elem.type === 'divider') {
    return `<div style="width: 100%; height: 50%; border-bottom: 1px solid rgba(255,255,255,0.2);"></div>`;
  }

  const justifySelf = style.textAlign === 'center' ? 'center' : style.textAlign === 'right' ? 'flex-end' : 'flex-start';
  return `<div style="display: flex; align-items: center; justify-content: ${justifySelf}; width: 100%; height: 100%; text-align: ${style.textAlign}; font-family: ${style.fontFamily}; font-size: 1em; font-weight: ${style.fontWeight}; line-height: ${style.lineHeight}; letter-spacing: ${style.letterSpacing}; color: ${style.color}; word-break: break-word; white-space: pre-wrap;">${elem.text || ''}</div>`;
}
