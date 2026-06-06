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
  reasoning?: string; // Explain typography decision logic
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
  score: number; // overall 0-100 (backfilled from 'overall' category)
  issues: string[];
  fixes: string[];
  // Category scores (present after critic overhaul)
  face_safety?: number;
  product_safety?: number;
  contrast?: number;
  hierarchy?: number;
  typography?: number;
  composition?: number;
  balance?: number;
  whitespace?: number;
  overall?: number;
}

export interface ConstraintViolation {
  type: 'face_overlap' | 'product_overlap' | 'margin' | 'font_undefined' | 'element_overflow';
  elementId: string;
  message: string;
  severity: 'critical' | 'warning';
}

export interface ConstraintReport {
  valid: boolean;
  violations: ConstraintViolation[];
  score: number; // 0-100 — deducted per violation
}

export interface DesignRule {
  id: string;
  title: string;
  description: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface PipelineRun {
  id: string;
  jobId: string;
  startedAt: string;
  completedAt?: string;
  totalDurationMs: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalApiCalls: number;
  totalRetries: number;
  totalRepairLoops: number;
  finalScore?: number;
  createdAt: string;
}

export interface AgentRun {
  id: string;
  pipelineRunId: string;
  agentName: string;
  modelName: string;
  iterationNumber: number;
  executionOrder: number;
  startedAt: string;
  completedAt?: string;
  durationMs: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
  retryCount: number;
  status: 'started' | 'completed' | 'failed';
  inputData?: string;
  outputData?: string;
  createdAt: string;
}

export interface TokenUsage {
  id: number;
  pipelineRunId: string;
  agentRunId: string;
  modelName: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
  timestamp: string;
}

export interface AgentEvent {
  id: number;
  pipelineRunId: string;
  agentName: string;
  eventType: 'started' | 'completed' | 'retry' | 'failed' | 'repaired' | 'schema_error' | 'validation_error' | 'critic_feedback' | 'repair_applied' | 'memory_retrieved';
  message: string;
  metadata?: string;
  timestamp: string;
}

export interface PerformanceAnalytics {
  slowestAgent: { agentName: string; avgDurationMs: number } | null;
  mostExpensiveAgent: { agentName: string; totalCost: number } | null;
  highestTokenConsumer: { agentName: string; totalTokens: number } | null;
  avgGenerationTimeMs: number;
  avgRepairCount: number;
  avgScoreImprovement: number;
}

