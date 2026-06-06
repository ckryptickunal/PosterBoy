import db from '../db';
import runWebLayoutAgent from './layoutAgent';
import runCriticAgent from './criticAgent';
import { runDesignEditorAgent, DeltaMemory } from './designEditorAgent';
import { composeHTML } from '../htmlComposer';
import { pipelineLog, agentLog } from '../logger';
import {
  VisionAnalysis,
  CopywriterOutput,
  TypographyTokens,
  WebLayoutOutput,
  LayoutStrategy,
  EvolutionResult,
  EvolutionGeneration,
} from '@/types/agents';

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_ITERATIONS = 5;
const CONVERGENCE_SCORE = 92;
const MIN_IMPROVEMENT = 1;

interface LocalOptimizationParams {
  jobId: string;
  vision: VisionAnalysis;
  copy: CopywriterOutput;
  typography: TypographyTokens;
  designObjectives: string;
  recommendedStrategy: LayoutStrategy;
  imageBase64: string;
  mimeType: string;
  hasLogo: boolean;
  maxGenerations?: number;
}

export async function runLocalOptimization(params: LocalOptimizationParams): Promise<EvolutionResult> {
  const {
    jobId, vision, copy, typography, designObjectives,
    recommendedStrategy, imageBase64, mimeType, hasLogo,
    maxGenerations = MAX_ITERATIONS,
  } = params;

  const scoreHistory: number[] = [];
  const generationHistory: EvolutionGeneration[] = [];
  let totalEvaluated = 0;

  pipelineLog(`OPTIMIZE_START job_id=${jobId} max_iterations=${maxGenerations}`);

  // 1. Initial Layout Generation
  agentLog('editor', `[${jobId}] Generating initial layout with strategy: ${recommendedStrategy}`);
  let currentLayout = await runWebLayoutAgent({
    vision, copy, typography, designObjectives, recommendedStrategy, hasLogo,
  });

  let bestLayout = JSON.parse(JSON.stringify(currentLayout));
  let bestScore = 0;

  const activeConst = db.prepare('SELECT rules_text FROM constitutions WHERE active = 1 ORDER BY version DESC LIMIT 1').get() as { rules_text: string } | undefined;
  const rulesText = activeConst?.rules_text || '';

  // 2. Initial Score
  let lastCritic = await runCriticAgent({
    screenshotBase64: imageBase64,
    layout: currentLayout,
    rulesText,
  });
  totalEvaluated++;
  bestScore = lastCritic.overall || lastCritic.score || 0;
  scoreHistory.push(bestScore);
  
  generationHistory.push({
    generation: 0,
    candidates: [{ layout: currentLayout, score: bestScore, reasoning: 'Initial layout', parentId: null, mutationType: 'initial' }],
    bestScore,
    bestCandidateIndex: 0,
  });

  agentLog('editor', `[${jobId}] Initial score: ${bestScore}`);

  if (bestScore >= CONVERGENCE_SCORE) {
    agentLog('editor', `[${jobId}] Score ${bestScore} >= ${CONVERGENCE_SCORE}. Converged immediately.`);
    return buildResult(bestLayout, bestScore, generationHistory, scoreHistory, totalEvaluated);
  }

  const deltaMemory: DeltaMemory = { improved: [], regressed: [] };

  // 3. Local Editor Loop
  for (let iter = 1; iter <= maxGenerations; iter++) {
    agentLog('editor', `[${jobId}] ── Iteration ${iter} ──`);

    const editorResult = await runDesignEditorAgent({
      layout: currentLayout,
      criticResult: lastCritic,
      deltaMemory,
      designObjectives
    });

    agentLog('editor', `[${jobId}] Editor modifications: ${editorResult.changeLog.join(' | ')}`);

    const newLayout = editorResult.updatedLayout;
    
    // Rescore
    const newCritic = await runCriticAgent({
      screenshotBase64: imageBase64,
      layout: newLayout,
      rulesText,
    });
    totalEvaluated++;
    
    const newScore = newCritic.overall || newCritic.score || 0;
    scoreHistory.push(newScore);

    generationHistory.push({
      generation: iter,
      candidates: [{ layout: newLayout, score: newScore, reasoning: editorResult.reasoning, parentId: 0, mutationType: 'local_edit' }],
      bestScore: newScore,
      bestCandidateIndex: 0,
    });

    // Update Delta Memory
    deltaMemory.improved = [];
    deltaMemory.regressed = [];
    for (const [key, newVal] of Object.entries(newCritic)) {
      if (typeof newVal === 'number' && key !== 'overall' && key !== 'score') {
        const oldVal = (lastCritic as any)[key] as number;
        if (newVal > oldVal + 2) deltaMemory.improved.push(key);
        else if (newVal < oldVal - 2) deltaMemory.regressed.push(key);
      }
    }

    if (newScore > bestScore) {
      bestScore = newScore;
      bestLayout = JSON.parse(JSON.stringify(newLayout));
      currentLayout = newLayout;
      lastCritic = newCritic;
      agentLog('editor', `[${jobId}] ✓ NEW BEST: ${newScore}`);
    } else {
      agentLog('editor', `[${jobId}] ✗ No improvement: ${newScore}. Reverting to best layout.`);
      // Rollback memory and layout if we regressed
      currentLayout = JSON.parse(JSON.stringify(bestLayout));
    }

    if (bestScore >= CONVERGENCE_SCORE) {
      agentLog('editor', `[${jobId}] Score ${bestScore} >= ${CONVERGENCE_SCORE}. Converged.`);
      break;
    }

    if (iter > 1 && newScore <= bestScore) {
      agentLog('editor', `[${jobId}] Stalled. Stopping.`);
      break;
    }
  }

  pipelineLog(`OPTIMIZE_DONE job_id=${jobId} iterations=${generationHistory.length} final_score=${bestScore}`);
  return buildResult(bestLayout, bestScore, generationHistory, scoreHistory, totalEvaluated);
}

function buildResult(
  bestLayout: WebLayoutOutput,
  bestScore: number,
  generationHistory: EvolutionGeneration[],
  scoreHistory: number[],
  totalCandidatesEvaluated: number,
): EvolutionResult {
  return {
    bestLayout,
    bestScore,
    totalGenerations: generationHistory.length,
    totalCandidatesEvaluated,
    generationHistory,
    scoreHistory,
  };
}

export { runLocalOptimization as runEvolutionarySearch };
export default runLocalOptimization;
