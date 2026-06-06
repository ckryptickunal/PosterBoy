export interface Region {
  x: number; // 0 to 100 percentage relative to image width
  y: number; // 0 to 100 percentage relative to image height
  width: number;
  height: number;
  label?: string;
}

export interface VisionAnalysis {
  width: number;
  height: number;
  aspectRatio: string;
  dominantColors: string[]; // hex codes
  attentionMap?: number[][]; // visual weight grids if applicable
  faceRegions: Region[];
  productRegions: Region[];
  backgroundRegions: Region[];
  emptyRegions: Region[];
  safeTextRegions: Region[];
  logoSafeRegions: Region[];
  compositionStyle: string; // e.g., symmetric, rule-of-thirds, diagonal
  visualDensity: 'low' | 'medium' | 'high';
  designStyleClassification: string; // e.g., luxury, minimal, tech, retro
}

export interface Concept {
  name: string; // "A" | "B" | "C"
  communicationGoal: string;
  emotionalGoal: string;
  visualStrategy: string;
  hierarchyStrategy: string;
  ctaStrategy: string;
  campaignType: string;
  internalScore: number; // 0 to 100
  rationale: string;
}

export interface CreativeDirectorOutput {
  concepts: Concept[];
  selectedConceptName: string; // "A" | "B" | "C"
  selectedConcept: Concept;
}

export interface CopywriterOutput {
  headline: string;
  subheadline: string;
  cta: string;
  supportingText?: string;
  disclaimers?: string[];
}

export interface TypographyTokens {
  displayFont: string; // Font family name
  bodyFont: string; // Font family name
  headlineSize: number; // px relative to canvas
  subheadlineSize: number; // px relative to canvas
  bodySize: number; // px relative to canvas
  ctaSize: number; // px relative to canvas
  lineHeight: number; // e.g. 1.2
  tracking: number; // letter spacing in em/px
  alignment: 'left' | 'center' | 'right';
  fontWeightDisplay: string; // e.g. "bold", "700"
  fontWeightBody: string; // e.g. "normal", "400"
}

export interface LayoutElement {
  id: string; // unique identifier (e.g. "headline", "cta", "subheadline", "supportingText", "shape_1", "logo")
  type: 'headline' | 'subheadline' | 'cta' | 'supporting_text' | 'divider' | 'shape' | 'icon' | 'badge' | 'logo';
  text?: string;
  x: number; // 0 to 100 percentage coordinates relative to canvas width
  y: number; // 0 to 100 percentage coordinates relative to canvas height
  width: number; // percentage width
  height: number; // percentage height
  rotation: number; // degrees
  zIndex: number;
  color?: string; // hex color or design token (e.g., 'primary', 'secondary')
  fontFamily?: string;
  fontSize?: number;
}

export interface LayoutOutput {
  elements: LayoutElement[];
}

export interface CriticOutput {
  score: number; // 0 to 100
  issues: string[];
  fixes: string[];
}

export interface DesignRule {
  id: string;
  title: string;
  description: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}
