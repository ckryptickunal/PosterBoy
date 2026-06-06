import db from '../db';
import runWebLayoutAgent from './layoutAgent';
import runCriticAgent, { CritiqueDelta } from './criticAgent';
import runBeautyAgent, { BeautyScore } from './beautyAgent';
import { runDesignEditorAgent } from './designEditorAgent';
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

const MAX_ITERATIONS = 25;
const CONVERGENCE_SCORE = 90;

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
}

export async function runLocalOptimization(params: LocalOptimizationParams): Promise<EvolutionResult> {
  const {
    jobId, vision, copy, typography, designObjectives,
    recommendedStrategy, imageBase64, mimeType, hasLogo,
  } = params;

  const scoreHistory: number[] = [];
  const generationHistory: EvolutionGeneration[] = [];
  let totalEvaluated = 0;

  pipelineLog(`OPTIMIZE_START job_id=${jobId} loop=goal_seeking`);

  // ── 1. Initial Generation ────────────────────────────────────────────────
  agentLog('editor', `[${jobId}] Generating initial layout...`);
  let currentLayout = await runWebLayoutAgent({
    vision, copy, typography, designObjectives, recommendedStrategy, hasLogo,
  });

  let bestLayout = JSON.parse(JSON.stringify(currentLayout));
  let bestScore = 0;

  const activeConst = db.prepare('SELECT rules_text FROM constitutions WHERE active = 1 ORDER BY version DESC LIMIT 1').get() as { rules_text: string } | undefined;
  const rulesText = activeConst?.rules_text || '';

  // Calculate Overall Score helper
  const calculateOverallScore = (critic: CritiqueDelta, beauty: BeautyScore) => {
    // overall = 0.35 readability + 0.25 hierarchy + 0.20 composition + 0.20 beauty
    return Math.round(
      0.35 * critic.readability +
      0.25 * critic.hierarchy +
      0.20 * critic.composition +
      0.20 * beauty.beauty
    );
  };

  // Evaluate Initial Layout
  let currentCritic = await runCriticAgent({ screenshotBase64: imageBase64, layout: currentLayout, rulesText });
  let currentBeauty = await runBeautyAgent({ screenshotBase64: imageBase64, vision, layout: currentLayout });
  currentCritic.overall = calculateOverallScore(currentCritic, currentBeauty);
  
  let bestCritic = currentCritic;
  
  totalEvaluated++;
  bestScore = currentCritic.overall;
  scoreHistory.push(bestScore);
  
  generationHistory.push({
    generation: 0,
    candidates: [{ layout: currentLayout, score: bestScore, reasoning: 'Initial layout', parentId: null, mutationType: 'initial' }],
    bestScore,
    bestCandidateIndex: 0,
  });

  agentLog('editor', `[${jobId}] Iteration 0 → ${bestScore}`);

  if (bestScore >= CONVERGENCE_SCORE) {
    agentLog('editor', `[${jobId}] Initial score >= 90. Converged immediately.`);
    return buildResult(bestLayout, bestScore, generationHistory, scoreHistory, totalEvaluated);
  }

  // ── 2. Goal-Seeking Loop ──────────────────────────────────────────────────
  let consecutiveStalls = 0;
  let iter = 1;

  while (true) {
    if (iter > MAX_ITERATIONS) {
      agentLog('editor', `[${jobId}] Reached max iterations (${MAX_ITERATIONS}). Stopping.`);
      break;
    }

    agentLog('editor', `[${jobId}] ── Iteration ${iter} ──`);

    // Editor Step
    const editorResult = await runDesignEditorAgent({
      currentDesign: currentLayout,
      critiqueDelta: currentCritic,
      visionAnalysis: vision
    });

    agentLog('editor', `[${jobId}] Changes: ${editorResult.changeLog.join(' | ')}`);

    const candidateLayout = editorResult.updatedLayout;
    
    // Evaluate Candidate
    const candidateCritic = await runCriticAgent({ screenshotBase64: imageBase64, layout: candidateLayout, rulesText });
    const candidateBeauty = await runBeautyAgent({ screenshotBase64: imageBase64, vision, layout: candidateLayout });
    candidateCritic.overall = calculateOverallScore(candidateCritic, candidateBeauty);
    
    totalEvaluated++;
    const candidateScore = candidateCritic.overall;
    scoreHistory.push(candidateScore);

    generationHistory.push({
      generation: iter,
      candidates: [{ layout: candidateLayout, score: candidateScore, reasoning: editorResult.reasoning, parentId: 0, mutationType: 'local_edit' }],
      bestScore: Math.max(bestScore, candidateScore),
      bestCandidateIndex: 0,
    });

    agentLog('editor', `[${jobId}] Iteration ${iter} → ${candidateScore}`);

    // Regression Protection & Best State
    if (candidateScore > bestScore) {
      // Meaningful improvement?
      if (candidateScore - bestScore < 1) {
        consecutiveStalls++;
      } else {
        consecutiveStalls = 0;
      }
      
      bestScore = candidateScore;
      bestLayout = JSON.parse(JSON.stringify(candidateLayout));
      bestCritic = candidateCritic;
      currentLayout = candidateLayout;
      currentCritic = candidateCritic;
      agentLog('editor', `[${jobId}] ✓ NEW BEST`);
    } else {
      consecutiveStalls++;
      agentLog('editor', `[${jobId}] ✗ Regressed or no improvement. Discarding child. Restoring Best (${bestScore}).`);
      // Discard candidate, revert state
      currentLayout = JSON.parse(JSON.stringify(bestLayout));
      currentCritic = bestCritic;
    }

    // Stopping Conditions
    if (bestScore >= CONVERGENCE_SCORE) {
      agentLog('editor', `[${jobId}] Score ${bestScore} >= ${CONVERGENCE_SCORE}. Converged!`);
      break;
    }

    if (consecutiveStalls >= 5) {
      agentLog('editor', `[${jobId}] Improvement < 1 for 5 consecutive iterations. Stalled. Stopping.`);
      break;
    }

    // Stagnation Recovery (Larger mutations)
    if (consecutiveStalls === 3) {
      agentLog('editor', `[${jobId}] Stagnation detected. Allowing larger mutations next iteration.`);
      currentCritic.modify.push('layout_strategy', 'typography_scale');
    }

    iter++;
  }

  pipelineLog(`OPTIMIZE_DONE job_id=${jobId} iterations=${iter} final_score=${bestScore}`);
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
