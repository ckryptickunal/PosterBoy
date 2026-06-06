// ═══════════════════════════════════════════════════════════════════════════════
// PosterBoy V2 Type System — Web Layout Architecture
// ═══════════════════════════════════════════════════════════════════════════════
// Core principle: LLMs output INTENT and STRUCTURE, not coordinates.
// CSS Grid/Flexbox handles positioning. Browser handles rendering.
// ═══════════════════════════════════════════════════════════════════════════════

// ── Geometry Primitives ──────────────────────────────────────────────────────

export interface Region {
  x: number; // 0 to 100 percentage relative to image width
  y: number; // 0 to 100 percentage relative to image height
  width: number;
  height: number;
  label?: string;
}

// ── Vision Agent Output ──────────────────────────────────────────────────────

export interface VisualWeightEntry {
  regionType: 'face' | 'product' | 'object' | 'background' | 'negative_space';
  importanceScore: number; // 0-100
  attentionScore: number; // 0-100
  visualDensity: number; // 0-100
  protectionPriority: number; // 0-100 (100 = never overlap)
}

export interface VisionAnalysis {
  width: number;
  height: number;
  aspectRatio: string;
  dominantColors: string[]; // hex codes

  // Protected regions (do not place text here)
  faceRegions: Region[];
  productRegions: Region[];

  // Available regions (place text here)
  backgroundRegions: Region[];
  emptyRegions: Region[];
  safeTextRegions: Region[];
  logoSafeRegions: Region[];

  // Composition analysis
  compositionStyle: string;
  visualDensity: 'low' | 'medium' | 'high';
  compositionType: 'minimalist' | 'rule_of_thirds' | 'symmetric' | 'asymmetric' | 'diagonal' | 'centered';

  // Visual intelligence (zero-industry thinking)
  subjectCount: number;
  negativeSpaceRatio: number; // 0 to 1
  visualComplexity: 'low' | 'medium' | 'high';
  subjectDominance: 'low' | 'medium' | 'high';
  imageContrast: 'low' | 'medium' | 'high';
  readingFlowOpportunities: string[];

  // Visual weight map — the key missing piece
  visualWeightMap: VisualWeightEntry[];

  // Content zone recommendations (where text CAN go, not where it MUST go)
  negativeSpaceDiscovery: {
    candidateTextZones: Region[];
    candidateLogoZones: Region[];
    candidateCTAZones: Region[];
  };

  // Attention heatmap — 5x5 grid of attention scores (0-100)
  attentionHeatmap: number[][];

  // Negative space map — 5x5 grid of openness scores (0-100)
  negativeSpaceMap: number[][];

  // Safe text zone ranking — all 9 placement zones ranked by safety
  safeTextZoneRanking: Array<{
    zone: 'top-left' | 'top-center' | 'top-right' | 'center-left' | 'center' | 'center-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
    confidence: number;
    reason: string;
  }>;

  // Deep composition analysis
  compositionAnalysis: {
    primaryFocalPoint: string;
    naturalReadingFlow: string;
    visualTension: string;
    emotionalTone: string;
    recommendedContentPlacement: string;
  };
}

// ── Design Strategist Output (replaces Creative Director) ────────────────────

export interface DesignObjective {
  objective: string; // e.g., "preserve focal subject", "maximize readability"
  priority: number; // 1 (highest) to 5 (lowest)
  reasoning: string;
}

export interface DesignStrategy {
  // Design thinking answers
  designThinking: {
    visualSubject: string;
    communicationGoal: string;
    viewerNoticeFirst: string;
    viewerNoticeSecond: string;
    viewerNoticeThird: string;
    safestVisualSpace: string;
    strongestVisualSpace: string;
    emotionalFeeling: string;
    necessaryInfo: string;
    elementsRemoved: string;
  };

  // Communication hierarchy
  communicationHierarchy: {
    primaryMessage: string;
    secondaryMessage: string;
    supportingMessage: string;
    actionMessage: string;
  };

  // Design objectives (replace rigid rules)
  designObjectives: DesignObjective[];

  // Recommended layout archetype
  recommendedStrategy: LayoutStrategy;
  strategyReasoning: string;

  // Emotional + visual direction
  emotionalGoal: string;
  visualTone: string; // e.g., "premium minimalist", "bold editorial"

  // Scoring for the concept
  internalScore: number; // 0-100
}

export interface DesignStrategyOutput {
  strategies: DesignStrategy[];
  selectedStrategy: DesignStrategy;
}

// ── Copywriter Output ────────────────────────────────────────────────────────

export interface CopywriterOutput {
  headline: string;
  subheadline: string;
  cta: string;
  supportingText?: string;
  disclaimers?: string[];
}

// ── Typography Tokens ────────────────────────────────────────────────────────

export interface TypographyTokens {
  displayFont: string;
  bodyFont: string;
  headlineSize: number;
  subheadlineSize: number;
  bodySize: number;
  ctaSize: number;
  lineHeight: number;
  tracking: number; // letter spacing
  alignment: 'left' | 'center' | 'right';
  fontWeightDisplay: string;
  fontWeightBody: string;
  reasoning: {
    whyFont: string;
    whyWeight: string;
    whySize: string;
    whyAlignment: string;
    whySpacing: string;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// NEW: Web Layout System — No coordinates, semantic intent only
// ═══════════════════════════════════════════════════════════════════════════════

/** Layout archetypes — the LLM chooses strategy, CSS handles positioning */
export type LayoutStrategy =
  | 'hero-left'          // Image right, content stacked left
  | 'hero-right'         // Image left, content stacked right
  | 'hero-overlay'       // Image background, content overlay with scrim
  | 'editorial-split'    // 50/50 editorial two-column layout
  | 'centered-story'     // Centered content over image background
  | 'minimal-premium'    // Maximum whitespace, minimal text cluster
  | 'feature-focused'    // Product hero with supporting text below/beside
  | 'magazine'           // Multi-column editorial with clear hierarchy
  | 'narrative'          // Sequential vertical storytelling flow
  | 'information-dense'; // Grid-based layout for data-heavy content

/** Semantic placement zones — CSS Grid areas, not pixel coordinates */
export type ContentPlacement =
  | 'top-left' | 'top-center' | 'top-right'
  | 'center-left' | 'center' | 'center-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

/** A semantic section in the layout — positioned by CSS, not coordinates */
export interface SectionDefinition {
  id: string;
  role: 'headline' | 'subheadline' | 'body' | 'cta' | 'logo' | 'supporting' | 'spacer' | 'trust-markers';
  content?: string;
  placement: ContentPlacement;
  /** Optional CSS class overrides for this section */
  cssOverrides?: Record<string, string>;
}

/** Design tokens that the HTML composer uses to style the page */
export interface DesignTokens {
  primaryColor: string;    // Dominant brand/accent color
  secondaryColor: string;  // Supporting color
  textColor: string;       // Primary text color
  accentColor: string;     // CTA/highlight color
  backgroundColor: string; // Overlay/scrim background
  spacing: 'tight' | 'normal' | 'generous' | 'luxurious';
  borderRadius: string;    // e.g., '0px', '8px', '24px'
  textShadow: boolean;     // Whether to apply text shadow for readability
  scrimOpacity: number;    // 0-1 background overlay opacity
}

/** The new layout output — strategy + sections + tokens, NO coordinates */
export interface WebLayoutOutput {
  strategy: LayoutStrategy;
  sections: SectionDefinition[];
  designTokens: DesignTokens;
  reasoning: {
    whyStrategy: string;
    whyPlacements: string;
    whyColors: string;
    whyHierarchy: string;
    whySpacing: string;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Critic + Refinement System — Element-level scoring, not global scores
// ═══════════════════════════════════════════════════════════════════════════════

export interface ElementScore {
  elementId: string;        // 'headline', 'cta', 'subheadline', etc.
  score: number;            // 0-100
  issues: string[];         // specific problems for THIS element
  failedMetrics: string[];  // 'contrast', 'readability', 'hierarchy', 'spacing'
}

export interface LocalizedIssue {
  element: string;
  metric: 'contrast' | 'readability' | 'hierarchy' | 'spacing' | 'overlap' | 'balance' | 'prominence';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
}

export interface CriticOutput {
  score: number; // overall 0-100
  issues: string[]; // global issues
  fixes: string[]; // suggested fixes
  elementScores: ElementScore[];
  localizedIssues: LocalizedIssue[];
  // Art-director impression
  criticism: {
    feelsWeak: string;
    feelsCrowded: string;
    feelsDistracting: string;
    feelsUnfinished: string;
    feelsUnbalanced: string;
    feelsGeneric: string;
    feelsPremium: string;
  };
  aestheticScores: {
    visualBalance: number;
    visualTension: number;
    hierarchyClarity: number;
    whitespaceQuality: number;
    focusPreservation: number;
    brandPerception: number;
    readability: number;
    emotion: number;
  };
}

/** A minimal CSS token refinement delta — not coordinate shifts */
export interface RefinementDelta {
  elementId: string;
  property: string;       // CSS property or design token name
  from: string;
  to: string;
  expectedGain: number;   // estimated score improvement
  risk: number;           // 0-1 probability of collateral damage
  reason: string;
}

export interface RefinementOutput {
  deltas: RefinementDelta[];
  lockedElements: string[]; // element IDs scoring ≥85, must not be modified
}

// ═══════════════════════════════════════════════════════════════════════════════
// Design Memory — Store reasoning, not coordinates
// ═══════════════════════════════════════════════════════════════════════════════

export interface DesignDecision {
  decision: string;
  reason: string;
  outcome_score: number;
}

export interface DesignGenome {
  visualStructure: {
    subjectCount: number;
    negativeSpaceRatio: number;
    visualComplexity: 'low' | 'medium' | 'high';
    subjectDominance: 'low' | 'medium' | 'high';
    compositionType: string;
    imageContrast: 'low' | 'medium' | 'high';
  };
  communicationStructure: {
    archetype: string;
    patterns: string[];
  };
  layoutStrategy: LayoutStrategy;
  typographyStructure: {
    displayFontCategory: string;
    bodyFontCategory: string;
    headlineSize: number;
    bodySize: number;
  };
  decisions: DesignDecision[];
  performanceMetrics: {
    overallScore: number;
    elementScores: Record<string, number>;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Evolutionary Search Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface EvolutionCandidate {
  layout: WebLayoutOutput;
  score: number | null;
  reasoning: string;
  parentId: number | null;
  mutationType: 'initial' | 'strategy_shift' | 'token_mutation' | 'placement_mutation' | 'crossover';
}

export interface EvolutionGeneration {
  generation: number;
  candidates: EvolutionCandidate[];
  bestScore: number;
  bestCandidateIndex: number;
}

export interface EvolutionResult {
  bestLayout: WebLayoutOutput;
  bestScore: number;
  totalGenerations: number;
  totalCandidatesEvaluated: number;
  generationHistory: EvolutionGeneration[];
  scoreHistory: number[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// Pipeline / Telemetry Types (unchanged)
// ═══════════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════════
// DEPRECATED — Old coordinate-based types kept temporarily for migration
// These will be removed once all consumers are migrated.
// ═══════════════════════════════════════════════════════════════════════════════

/** @deprecated Use WebLayoutOutput instead */
export interface LayoutElement {
  id: string;
  type: 'headline' | 'subheadline' | 'cta' | 'supporting_text' | 'divider' | 'shape' | 'icon' | 'badge' | 'logo';
  text?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  color?: string;
  fontFamily?: string;
  fontSize?: number;
}

/** @deprecated Use WebLayoutOutput instead */
export interface LayoutOutput {
  elements: LayoutElement[];
  reasoning: {
    whyPositions: string;
    whyLogoPosition: string;
    whyCTAPosition: string;
    whyAlignment: string;
    whyHierarchy: string;
  };
}

/** @deprecated Use DesignStrategy instead */
export interface Concept {
  name: string;
  communicationGoal: string;
  emotionalGoal: string;
  visualStrategy: string;
  hierarchyStrategy: string;
  ctaStrategy: string;
  campaignType: string;
  internalScore: number;
  rationale: string;
  communicationArchetype: string;
  designHypothesis: string;
  communicationPatterns: string[];
  designThinking: {
    visualSubject: string;
    communicationGoal: string;
    viewerNoticeFirst: string;
    viewerNoticeSecond: string;
    viewerNoticeThird: string;
    safestVisualSpace: string;
    strongestVisualSpace: string;
    emotionalFeeling: string;
    necessaryInfo: string;
    elementsRemoved: string;
  };
  communicationHierarchy: {
    primaryMessage: string;
    secondaryMessage: string;
    supportingMessage: string;
    actionMessage: string;
  };
}

/** @deprecated Use DesignStrategyOutput instead */
export interface CreativeDirectorOutput {
  concepts: Concept[];
  selectedConceptName: string;
  selectedConcept: Concept;
}

/** @deprecated Coordinate-based validation no longer needed */
export interface ConstraintViolation {
  type: 'face_overlap' | 'product_overlap' | 'margin' | 'font_undefined' | 'element_overflow';
  elementId: string;
  message: string;
  severity: 'critical' | 'warning';
}

/** @deprecated Coordinate-based validation no longer needed */
export interface ConstraintReport {
  valid: boolean;
  violations: ConstraintViolation[];
  score: number;
}
