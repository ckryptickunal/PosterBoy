/**
 * Orchestrator V3 — PosterBoy Evolutionary Pipeline
 * ══════════════════════════════════════════════════════
 * Pipeline:
 *   Vision → Design Strategist → Copywriter + Typography → Evolutionary Search → HTML Compose
 *
 * Key differences from V2:
 * - Evolutionary search replaces 3-candidate + repair loops
 * - 6 initial candidates, scored in parallel
 * - Best 2 survive, mutate, repeat until convergence
 * - Full history stored (scores, layouts, reasoning, typography)
 * - Scoring hierarchy: visual hierarchy is objective, collision is constraint
 */

import { randomUUID } from 'crypto';
import db from '../db';
import runVisionAgent from './visionAgent';
import runDesignStrategistAgent from './creativeDirectorAgent';
import runCopywriterAgent from './copywriterAgent';
import runTypographyAgent from './typographyAgent';
import { runEvolutionarySearch } from './localOptimizationEngine';
import runCriticAgent from './criticAgent';
import { composeHTML } from '../htmlComposer';
import { pipelineLog, agentLog, saveJobReplay, writePerformanceStats } from '../logger';
import {
  VisionAnalysis,
  CopywriterOutput,
  TypographyTokens,
  WebLayoutOutput,
  DesignStrategy,
  LayoutStrategy,
  EvolutionResult,
} from '@/types/agents';

export interface GenerationResult {
  jobId: string;
  vision: VisionAnalysis;
  strategy: DesignStrategy;
  copy: CopywriterOutput;
  typography: TypographyTokens;
  layout: WebLayoutOutput;
  html: string;
  evolution: {
    totalGenerations: number;
    totalCandidatesEvaluated: number;
    scoreHistory: number[];
    bestScore: number;
  };
}

/**
 * Executes the V3 evolutionary pipeline.
 *
 * Pipeline graph:
 *   Vision
 *     └─ Design Strategist (parallel with Memory)
 *           └─ Copywriter + Typography (parallel)
 *                 └─ Evolutionary Search (6 candidates → score → mutate → repeat)
 *                       └─ HTML Compose (deterministic, no LLM)
 */
export async function generateInitialLayout(
  imageName: string,
  imageBase64: string,
  mimeType: string,
  intent: string,
  availableFonts: any[]
): Promise<GenerationResult> {
  const jobId = randomUUID();
  const pipelineStart = Date.now();
  const agentTimings: Record<string, { start: number; end?: number }> = {};

  db.prepare(`
    INSERT INTO jobs (id, status, image_path, intent, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(jobId, 'vision_analysis', imageName, intent, new Date().toISOString(), new Date().toISOString());

  pipelineLog(`JOB_START job_id=${jobId} intent="${intent}"`);

  try {
    // ── STAGE 1: Vision Analysis ──────────────────────────────────────────────
    agentTimings['Vision'] = { start: Date.now() };
    agentLog('vision', `[${jobId}] Vision Agent STARTED`);
    const vision = await runVisionAgent(imageBase64, mimeType);
    agentTimings['Vision'].end = Date.now();
    const visionMs = agentTimings['Vision'].end - agentTimings['Vision'].start;
    agentLog('vision', `[${jobId}] Vision Agent COMPLETED duration=${(visionMs / 1000).toFixed(2)}s`);
    pipelineLog(`AGENT_COMPLETE agent=Vision job_id=${jobId} duration=${visionMs}ms`);

    db.prepare('UPDATE jobs SET status = ?, updated_at = ? WHERE id = ?')
      .run('designing', new Date().toISOString(), jobId);

    // ── STAGE 2: Design Strategist (parallel with memory retrieval) ───────────
    pipelineLog(`PARALLEL_START job_id=${jobId} agents=[DesignStrategist,Memory]`);

    const [strategyOutput, memoryRecords] = await Promise.all([
      (async () => {
        agentTimings['DesignStrategist'] = { start: Date.now() };
        agentLog('strategy', `[${jobId}] Design Strategist STARTED`);
        const out = await runDesignStrategistAgent(intent, vision);
        agentTimings['DesignStrategist'].end = Date.now();
        const ms = agentTimings['DesignStrategist'].end - agentTimings['DesignStrategist'].start;
        agentLog('strategy', `[${jobId}] Design Strategist COMPLETED duration=${(ms / 1000).toFixed(2)}s`);
        pipelineLog(`AGENT_COMPLETE agent=DesignStrategist job_id=${jobId} duration=${ms}ms`);
        return out;
      })(),

      // Memory Retrieval
      (async () => {
        const records = db.prepare(`
          SELECT visual_genome_json, communication_genome_json, layout_json, score
          FROM layout_memory
          ORDER BY score DESC LIMIT 10
        `).all() as Array<{ visual_genome_json: string; communication_genome_json: string; layout_json: string; score: number }>;
        pipelineLog(`MEMORY_RETRIEVED job_id=${jobId} matches=${records.length}`);
        return records;
      })(),
    ]);

    pipelineLog(`PARALLEL_DONE job_id=${jobId}`);

    const selectedStrategy = strategyOutput.selectedStrategy;
    agentLog('strategy', `[${jobId}] Selected strategy: ${selectedStrategy?.recommendedStrategy || 'unknown'} (score: ${selectedStrategy?.internalScore || 0})`);

    db.prepare('UPDATE jobs SET status = ?, updated_at = ? WHERE id = ?')
      .run('copywriting', new Date().toISOString(), jobId);

    // ── STAGE 3: Copywriter + Typography in parallel ──────────────────────────
    pipelineLog(`PARALLEL_START job_id=${jobId} agents=[Copywriter,Typography]`);

    // Build a Concept-compatible object for the copywriter (bridge to old interface)
    const conceptBridge = {
      campaignType: selectedStrategy.visualTone || 'premium',
      communicationGoal: selectedStrategy.designThinking?.communicationGoal || intent,
      emotionalGoal: selectedStrategy.emotionalGoal || 'inspire action',
      hierarchyStrategy: selectedStrategy.communicationHierarchy?.primaryMessage || intent,
      ctaStrategy: selectedStrategy.communicationHierarchy?.actionMessage || 'Learn More',
    };

    const [copy, typography] = await Promise.all([
      // Copywriter
      (async () => {
        agentTimings['Copywriter'] = { start: Date.now() };
        agentLog('copywriter', `[${jobId}] Copywriter STARTED`);
        const out = await runCopywriterAgent(intent, conceptBridge as any, vision);
        agentTimings['Copywriter'].end = Date.now();
        const ms = agentTimings['Copywriter'].end - agentTimings['Copywriter'].start;
        agentLog('copywriter', `[${jobId}] Copywriter COMPLETED duration=${(ms / 1000).toFixed(2)}s`);
        pipelineLog(`AGENT_COMPLETE agent=Copywriter job_id=${jobId} duration=${ms}ms`);
        return out;
      })(),

      // Typography
      (async () => {
        agentTimings['Typography'] = { start: Date.now() };
        agentLog('typography', `[${jobId}] Typography Agent STARTED`);
        const out = await runTypographyAgent(
          { communicationArchetype: selectedStrategy.visualTone } as any,
          availableFonts,
          `Design tone: ${selectedStrategy.visualTone}. Emotional goal: ${selectedStrategy.emotionalGoal}. Strategy: ${selectedStrategy.recommendedStrategy}.`
        );
        agentTimings['Typography'].end = Date.now();
        const ms = agentTimings['Typography'].end - agentTimings['Typography'].start;
        agentLog('typography', `[${jobId}] Typography COMPLETED duration=${(ms / 1000).toFixed(2)}s`);
        pipelineLog(`AGENT_COMPLETE agent=Typography job_id=${jobId} duration=${ms}ms`);
        return out;
      })(),
    ]);

    pipelineLog(`PARALLEL_DONE job_id=${jobId}`);

    db.prepare('UPDATE jobs SET status = ?, updated_at = ? WHERE id = ?')
      .run('evolving', new Date().toISOString(), jobId);

    // ── STAGE 4: Evolutionary Layout Search ───────────────────────────────────
    agentTimings['Evolution'] = { start: Date.now() };
    agentLog('layout', `[${jobId}] Evolutionary Search STARTED`);

    // Format design objectives as a string for the layout agent
    const objectivesText = (selectedStrategy.designObjectives || [])
      .sort((a: any, b: any) => a.priority - b.priority)
      .map((o: any) => `[P${o.priority}] ${o.objective}: ${o.reasoning}`)
      .join('\n');

    const recommendedStrat = selectedStrategy.recommendedStrategy || 'hero-overlay';

    const evolutionResult: EvolutionResult = await runEvolutionarySearch({
      jobId,
      vision,
      copy,
      typography,
      designObjectives: objectivesText,
      recommendedStrategy: recommendedStrat,
      imageBase64,
      mimeType,
      hasLogo: false, // TODO: wire to actual logo upload state
      maxGenerations: 3,
    });

    agentTimings['Evolution'].end = Date.now();
    const evolMs = agentTimings['Evolution'].end - agentTimings['Evolution'].start;
    agentLog('layout', `[${jobId}] Evolutionary Search COMPLETED duration=${(evolMs / 1000).toFixed(2)}s best_score=${evolutionResult.bestScore} generations=${evolutionResult.totalGenerations} candidates=${evolutionResult.totalCandidatesEvaluated}`);
    pipelineLog(`AGENT_COMPLETE agent=Evolution job_id=${jobId} duration=${evolMs}ms best_score=${evolutionResult.bestScore}`);

    const winner = evolutionResult.bestLayout;

    // ── STAGE 5: HTML Composition (deterministic, no LLM) ─────────────────────
    const imageDataUrl = `data:${mimeType};base64,${imageBase64}`;
    const html = composeHTML({
      layout: winner,
      typography,
      copy,
      imageBase64: imageDataUrl,
      logoUrl: null,
      canvasWidth: 1080,
      canvasHeight: 1080,
    });

    agentLog('composer', `[${jobId}] HTML composed: ${html.length} bytes, strategy=${winner.strategy}`);

    // ── Save to database ──────────────────────────────────────────────────────
    db.prepare('UPDATE jobs SET status = ?, final_layout_json = ?, updated_at = ? WHERE id = ?')
      .run('layout_rendering', JSON.stringify({ layout: winner, typography, strategy: selectedStrategy, evolution: { bestScore: evolutionResult.bestScore, generations: evolutionResult.totalGenerations, candidates: evolutionResult.totalCandidatesEvaluated } }), new Date().toISOString(), jobId);

    const totalMs = Date.now() - pipelineStart;
    pipelineLog(`JOB_INITIAL_DONE job_id=${jobId} total_duration=${totalMs}ms`);

    // Save replay log
    saveJobReplay(jobId, {
      intent,
      imageName,
      agents: {
        Vision: { duration: agentTimings['Vision'].end! - agentTimings['Vision'].start, depends_on: [] },
        DesignStrategist: { duration: agentTimings['DesignStrategist'].end! - agentTimings['DesignStrategist'].start, depends_on: ['Vision'] },
        Copywriter: { duration: agentTimings['Copywriter'].end! - agentTimings['Copywriter'].start, depends_on: ['DesignStrategist'] },
        Typography: { duration: agentTimings['Typography'].end! - agentTimings['Typography'].start, depends_on: ['DesignStrategist'] },
        Evolution: { duration: evolMs, depends_on: ['Copywriter', 'Typography', 'Vision'] },
      },
      outputs: { vision, strategy: selectedStrategy, copy, typography, layout: winner, evolution: { bestScore: evolutionResult.bestScore, scoreHistory: evolutionResult.scoreHistory } },
    });

    writePerformanceStats(agentTimings);

    return {
      jobId,
      vision,
      strategy: selectedStrategy,
      copy,
      typography,
      layout: winner,
      html,
      evolution: {
        totalGenerations: evolutionResult.totalGenerations,
        totalCandidatesEvaluated: evolutionResult.totalCandidatesEvaluated,
        scoreHistory: evolutionResult.scoreHistory,
        bestScore: evolutionResult.bestScore,
      },
    };

  } catch (error: any) {
    db.prepare('UPDATE jobs SET status = ?, updated_at = ? WHERE id = ?')
      .run('failed', new Date().toISOString(), jobId);
    pipelineLog(`JOB_FAILED job_id=${jobId} error="${error.message || error}"`);
    console.error(`Orchestrator failed for Job ${jobId}:`, error);
    throw error;
  }
}

// ── Critique (post-generation evaluation — kept for UI scoring) ──────────────

export interface CritiqueRepairResult {
  score: number;
  issues: string[];
  fixes: string[];
  repairedLayout: WebLayoutOutput | null;
  status: 'completed' | 'repaired' | 'failed';
  bestScore: number;
  iterationsRun: number;
}

export async function processCritiqueAndRepair(
  jobId: string,
  iteration: number,
  layout: WebLayoutOutput,
  screenshotBase64: string,
  vision: VisionAnalysis
): Promise<CritiqueRepairResult> {
  try {
    const activeConst = db.prepare('SELECT rules_text FROM constitutions WHERE active = 1 ORDER BY version DESC LIMIT 1').get() as { rules_text: string } | undefined;
    const rulesText = activeConst?.rules_text || '';

    pipelineLog(`CRITIQUE_START job_id=${jobId} iteration=${iteration}`);
    agentLog('critic', `[${jobId}] Critic Agent STARTED iteration=${iteration}`);

    const criticResult = await runCriticAgent({
      screenshotBase64,
      layout: { elements: [], reasoning: { whyPositions: '', whyLogoPosition: '', whyCTAPosition: '', whyAlignment: '', whyHierarchy: '' } },
      rulesText,
    });

    pipelineLog(`CRITIQUE_DONE job_id=${jobId} iteration=${iteration} score=${criticResult.score}`);

    // Save critique to history
    db.prepare(`
      INSERT INTO critique_history (job_id, iteration, score, issues_json, fixes_json, layout_json, screenshot_path, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(jobId, iteration, criticResult.score, JSON.stringify(criticResult.issues), JSON.stringify(criticResult.fixes), JSON.stringify(layout), null, new Date().toISOString());

    if (criticResult.score >= 90) {
      saveBestToMemory(jobId, layout, criticResult.score, vision);
    }

    return {
      score: criticResult.score,
      issues: criticResult.issues,
      fixes: criticResult.fixes,
      repairedLayout: null,
      status: 'completed',
      bestScore: criticResult.score,
      iterationsRun: iteration,
    };

  } catch (error: any) {
    console.error(`Critique failed for Job ${jobId}:`, error);
    return {
      score: 0,
      issues: [error.message],
      fixes: [],
      repairedLayout: null,
      status: 'failed',
      bestScore: 0,
      iterationsRun: iteration,
    };
  }
}

// ── Memory ──────────────────────────────────────────────────────────────────

function saveBestToMemory(jobId: string, layout: WebLayoutOutput, score: number, vision: VisionAnalysis) {
  try {
    const visualGenome = JSON.stringify({
      subjectCount: vision.subjectCount,
      negativeSpaceRatio: vision.negativeSpaceRatio,
      visualComplexity: vision.visualComplexity,
      subjectDominance: vision.subjectDominance,
      compositionType: vision.compositionType,
      imageContrast: vision.imageContrast,
    });

    const commGenome = JSON.stringify({
      layoutStrategy: layout.strategy,
      spacing: layout.designTokens.spacing,
    });

    const decisionsJson = JSON.stringify({
      strategy: layout.strategy,
      reasoning: layout.reasoning,
      designTokens: layout.designTokens,
    });

    db.prepare(`
      INSERT INTO layout_memory (job_id, visual_genome_json, communication_genome_json, layout_json, decisions_json, score, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(jobId, visualGenome, commGenome, JSON.stringify(layout), decisionsJson, score, new Date().toISOString());

    pipelineLog(`MEMORY_SAVED job_id=${jobId} score=${score} strategy=${layout.strategy}`);
  } catch (err) {
    console.error('Failed to save to memory:', err);
  }
}
