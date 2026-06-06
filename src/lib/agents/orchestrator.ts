import { randomUUID } from 'crypto';
import db from '../db';
import runVisionAgent from './visionAgent';
import runCreativeDirectorAgent from './creativeDirectorAgent';
import runCopywriterAgent from './copywriterAgent';
import runTypographyAgent from './typographyAgent';
import runLayoutAgent from './layoutAgent';
import runCriticAgent from './criticAgent';
import runRepairAgent from './repairAgent';
import runGeometryHelper from '../pythonRunner';
import { pipelineLog, agentLog, saveJobReplay, writePerformanceStats } from '../logger';
import { validateLayout } from '../constraintValidator';
import { VisionAnalysis, CopywriterOutput, TypographyTokens, LayoutOutput, CriticOutput } from '@/types/agents';

export interface GenerationResult {
  jobId: string;
  vision: VisionAnalysis;
  concept: any;
  copy: CopywriterOutput;
  typography: TypographyTokens;
  layout: LayoutOutput;
}

/**
 * Executes Agents 1-5 to produce the initial design candidate.
 *
 * Parallelisation graph:
 *   Vision
 *     └─ Promise.all(CreativeDirector, TypographyPrep, MemoryRetrieval)
 *           └─ Copywriter  (depends on Creative Director)
 *                 └─ Layout  (depends on Copy + Typography + Memory + Vision)
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
  const agentTimings: Record<string, { start: number; end?: number; tokens?: number }> = {};

  db.prepare(`
    INSERT INTO jobs (id, status, image_path, intent, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(jobId, 'vision_analysis', imageName, intent, new Date().toISOString(), new Date().toISOString());

  pipelineLog(`JOB_START job_id=${jobId} intent="${intent}"`);

  try {
    // ── STAGE 1: Vision (must complete first — everything depends on it) ──────
    agentTimings['Vision'] = { start: Date.now() };
    agentLog('vision', `[${jobId}] Vision Agent STARTED`);
    const vision = await runVisionAgent(imageBase64, mimeType);
    agentTimings['Vision'].end = Date.now();
    const visionMs = agentTimings['Vision'].end - agentTimings['Vision'].start;
    agentLog('vision', `[${jobId}] Vision Agent COMPLETED  duration=${(visionMs / 1000).toFixed(2)}s`);
    pipelineLog(`AGENT_COMPLETE agent=Vision job_id=${jobId} duration=${visionMs}ms`);

    db.prepare('UPDATE jobs SET status = ?, updated_at = ? WHERE id = ?')
      .run('creative_direction', new Date().toISOString(), jobId);

    // ── STAGE 2: Parallel fan-out — CreativeDirector + Memory + Constitution ──
    // NOTE: Typography is intentionally NOT in this group — it requires the
    // actual winning Concept from Creative Director, not a speculative hint.
    // Running it speculatively with undefined concept fields causes hallucination.
    pipelineLog(`PARALLEL_START job_id=${jobId} agents=[CreativeDirector,MemoryRetrieval,Constitution]`);

    const [cdOutput, memoryRecords, rulesText] = await Promise.all([
      // Creative Director (Agent 2)
      (async () => {
        agentTimings['CreativeDirector'] = { start: Date.now() };
        agentLog('creative', `[${jobId}] Creative Director STARTED`);
        const out = await runCreativeDirectorAgent(intent, vision);
        agentTimings['CreativeDirector'].end = Date.now();
        const ms = agentTimings['CreativeDirector'].end - agentTimings['CreativeDirector'].start;
        agentLog('creative', `[${jobId}] Creative Director COMPLETED  duration=${(ms / 1000).toFixed(2)}s`);
        pipelineLog(`AGENT_COMPLETE agent=CreativeDirector job_id=${jobId} duration=${ms}ms`);
        return out;
      })(),

      // Memory Retrieval (SQLite — synchronous but wrapped async)
      (async () => {
        const style = vision.designStyleClassification || 'minimal';
        const imageType = vision.productRegions.length > 0
          ? vision.productRegions[0].label || 'product'
          : 'general';
        const records = db.prepare(`
          SELECT style, image_type, layout_json, score
          FROM layout_memory
          WHERE style = ? OR image_type = ?
          ORDER BY score DESC LIMIT 3
        `).all(style, imageType) as Array<{ style: string; image_type: string; layout_json: string; score: number }>;
        pipelineLog(`MEMORY_RETRIEVED job_id=${jobId} matches=${records.length}`);
        return records;
      })(),

      // Constitution (sync SQLite)
      (async () => {
        const row = db.prepare('SELECT rules_text FROM constitutions WHERE active = 1 ORDER BY version DESC LIMIT 1').get() as { rules_text: string } | undefined;
        return row?.rules_text || '';
      })(),
    ]);

    pipelineLog(`PARALLEL_DONE job_id=${jobId}`);

    const selectedConcept = cdOutput.selectedConcept;
    db.prepare('UPDATE jobs SET status = ?, updated_at = ? WHERE id = ?')
      .run('copywriting', new Date().toISOString(), jobId);

    // ── STAGE 3: Copywriter + Typography in parallel (both depend only on CD) ──
    // Typography now receives the real selectedConcept — no hallucination risk.
    pipelineLog(`PARALLEL_START job_id=${jobId} agents=[Copywriter,Typography]`);

    const [copy, typography] = await Promise.all([
      // Copywriter (Agent 3) — intent is threaded through to anchor the copy
      (async () => {
        agentTimings['Copywriter'] = { start: Date.now() };
        agentLog('copywriter', `[${jobId}] Copywriter STARTED`);
        const out = await runCopywriterAgent(intent, selectedConcept, vision);
        agentTimings['Copywriter'].end = Date.now();
        const ms = agentTimings['Copywriter'].end - agentTimings['Copywriter'].start;
        agentLog('copywriter', `[${jobId}] Copywriter COMPLETED  duration=${(ms / 1000).toFixed(2)}s`);
        pipelineLog(`AGENT_COMPLETE agent=Copywriter job_id=${jobId} duration=${ms}ms`);
        return out;
      })(),

      // Typography (Agent 4) — now receives the real concept, not a speculative hint
      (async () => {
        agentTimings['Typography'] = { start: Date.now() };
        agentLog('typography', `[${jobId}] Typography Agent STARTED`);
        const out = await runTypographyAgent(selectedConcept, availableFonts);
        agentTimings['Typography'].end = Date.now();
        const ms = agentTimings['Typography'].end - agentTimings['Typography'].start;
        agentLog('typography', `[${jobId}] Typography Agent COMPLETED  duration=${(ms / 1000).toFixed(2)}s`);
        pipelineLog(`AGENT_COMPLETE agent=Typography job_id=${jobId} duration=${ms}ms`);
        return out;
      })(),
    ]);

    pipelineLog(`PARALLEL_DONE job_id=${jobId}`);

    db.prepare('UPDATE jobs SET status = ?, updated_at = ? WHERE id = ?')
      .run('layout', new Date().toISOString(), jobId);

    // ── STAGE 4: Layout (depends on everything above) ─────────────────────────
    agentTimings['Layout'] = { start: Date.now() };
    agentLog('layout', `[${jobId}] Layout Agent STARTED`);
    const layout = await runLayoutAgent({ vision, copy, typography, rulesText, memoryExamples: memoryRecords });
    agentTimings['Layout'].end = Date.now();
    const layoutMs = agentTimings['Layout'].end - agentTimings['Layout'].start;
    agentLog('layout', `[${jobId}] Layout Agent COMPLETED  duration=${(layoutMs / 1000).toFixed(2)}s`);
    pipelineLog(`AGENT_COMPLETE agent=Layout job_id=${jobId} duration=${layoutMs}ms`);

    db.prepare('UPDATE jobs SET status = ?, final_layout_json = ?, updated_at = ? WHERE id = ?')
      .run('layout_rendering', JSON.stringify(layout), new Date().toISOString(), jobId);

    const totalMs = Date.now() - pipelineStart;
    pipelineLog(`JOB_INITIAL_DONE job_id=${jobId} total_duration=${totalMs}ms`);

    // Save dependency-graph style job replay JSON
    saveJobReplay(jobId, {
      intent,
      imageName,
      agents: {
        Vision: { duration: agentTimings['Vision'].end! - agentTimings['Vision'].start, depends_on: [] },
        CreativeDirector: { duration: agentTimings['CreativeDirector'].end! - agentTimings['CreativeDirector'].start, depends_on: ['Vision'] },
        Typography: { duration: agentTimings['Typography'].end! - agentTimings['Typography'].start, depends_on: ['Vision'] },
        Copywriter: { duration: agentTimings['Copywriter'].end! - agentTimings['Copywriter'].start, depends_on: ['CreativeDirector'] },
        Layout: { duration: agentTimings['Layout'].end! - agentTimings['Layout'].start, depends_on: ['Copywriter', 'Typography', 'Vision', 'Memory'] },
      },
      outputs: { vision, concept: selectedConcept, copy, typography, layout },
    });

    writePerformanceStats(agentTimings);

    return { jobId, vision, concept: selectedConcept, copy, typography, layout };

  } catch (error: any) {
    db.prepare('UPDATE jobs SET status = ?, updated_at = ? WHERE id = ?')
      .run('failed', new Date().toISOString(), jobId);
    pipelineLog(`JOB_FAILED job_id=${jobId} error="${error.message || error}"`);
    console.error(`Orchestrator failed during generation for Job ${jobId}:`, error);
    throw error;
  }
}

export interface CritiqueRepairResult {
  score: number;
  issues: string[];
  fixes: string[];
  repairedLayout: LayoutOutput | null;
  categoryScores?: Record<string, number>;
  status: 'completed' | 'repaired' | 'failed';
  bestScore: number;
  iterationsRun: number;
}

const MAX_LOOPS = 10;
const EARLY_STOP_MIN_IMPROVEMENT = 2; // stop if < 2 points gained for 2 consecutive iterations
const TARGET_SCORE = 90;

/**
 * Critique + Repair loop with Best-State Preservation.
 *
 * Algorithm:
 *   best_layout = initial_layout
 *   best_score  = initial_score
 *   for up to MAX_LOOPS:
 *     critique(best_layout)
 *     if score >= TARGET_SCORE → done
 *     generate 3 repair candidates
 *     validate each with constraint engine
 *     if any candidate > best_score → update best
 *     else count consecutive no-improvement → early stop after 2
 */
export async function processCritiqueAndRepair(
  jobId: string,
  iteration: number,
  layout: LayoutOutput,
  screenshotBase64: string,
  vision: VisionAnalysis
): Promise<CritiqueRepairResult> {
  const iterStart = Date.now();

  try {
    const activeConst = db.prepare('SELECT rules_text FROM constitutions WHERE active = 1 ORDER BY version DESC LIMIT 1').get() as { rules_text: string };
    const rulesText = activeConst?.rules_text || '';

    // ── CRITIQUE: Python geometry + Gemini Critic in parallel ─────────────────
    pipelineLog(`CRITIQUE_START job_id=${jobId} iteration=${iteration}`);
    agentLog('critic', `[${jobId}] Critic Agent STARTED  iteration=${iteration}`);
    const criticStart = Date.now();

    const [geomResult, criticResult] = await Promise.all([
      runGeometryHelper({
        elements: layout.elements,
        faceRegions: vision.faceRegions,
        productRegions: vision.productRegions,
        margins: 8.0,
      }),
      runCriticAgent({ screenshotBase64, layout, rulesText }),
    ]);

    const criticMs = Date.now() - criticStart;
    agentLog('critic', `[${jobId}] Critic DONE  ${criticMs}ms  overall=${criticResult.score}`);

    // Merge geometry and visual critic scores — geometry is a hard floor
    const combinedScore = Math.min(geomResult.score, criticResult.score);
    const combinedIssues = Array.from(new Set([...geomResult.issues, ...criticResult.issues]));
    const combinedFixes  = Array.from(new Set([...geomResult.fixes,  ...criticResult.fixes]));
    // Spread criticResult first (brings category scores), then override core fields with merged values
    const critiqueOutput: CriticOutput = {
      ...criticResult,
      score: combinedScore,
      issues: combinedIssues,
      fixes: combinedFixes,
    };

    pipelineLog(`CRITIQUE_DONE job_id=${jobId} iteration=${iteration} score=${combinedScore} duration=${criticMs}ms`);

    // ── Save critique to history ──────────────────────────────────────────────
    db.prepare(`
      INSERT INTO critique_history (job_id, iteration, score, issues_json, fixes_json, layout_json, screenshot_path, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(jobId, iteration, combinedScore, JSON.stringify(combinedIssues), JSON.stringify(combinedFixes), JSON.stringify(layout), null, new Date().toISOString());

    // ── If score already passes, no repair needed ─────────────────────────────
    if (combinedScore >= TARGET_SCORE) {
      saveBestToMemory(jobId, layout, combinedScore, vision);
      return {
        score: combinedScore,
        issues: combinedIssues,
        fixes: combinedFixes,
        categoryScores: buildCategoryMap(criticResult),
        repairedLayout: null,
        status: 'completed',
        bestScore: combinedScore,
        iterationsRun: iteration,
      };
    }

    // ── REPAIR: Generate 3 candidates, validate each, keep best ──────────────
    agentLog('repair', `[${jobId}] Repair Agent STARTED  iteration=${iteration} score=${combinedScore}`);
    const repairStart = Date.now();

    // Run 3 repair candidates in parallel
    const repairResults = await Promise.all(
      [1, 2, 3].map(() =>
        runRepairAgent({
          layout,
          critique: critiqueOutput,
          rulesText,
          vision: { faceRegions: vision.faceRegions, productRegions: vision.productRegions, safeTextRegions: vision.safeTextRegions },
        }).catch(() => null)
      )
    );

    const repairMs = Date.now() - repairStart;
    agentLog('repair', `[${jobId}] Repair Agent DONE  ${repairMs}ms  candidates=${repairResults.filter(Boolean).length}`);
    pipelineLog(`AGENT_COMPLETE agent=Repair job_id=${jobId} iteration=${iteration} duration=${repairMs}ms`);

    // Score each repair candidate with constraint validator
    let bestRepair: LayoutOutput | null = null;
    let bestRepairScore = combinedScore; // must beat current score to be accepted

    for (const r of repairResults) {
      if (!r) continue;
      const report = validateLayout(r.layout, vision.faceRegions, vision.productRegions);
      // Weighted: constraint score counts for 40%, critic score proxy for 60%
      // We use constraint score as a proxy since we can't re-run Gemini per candidate
      const candidateScore = report.score;
      if (candidateScore > bestRepairScore) {
        bestRepairScore = candidateScore;
        bestRepair = r.layout;
      }
    }

    const accepted = bestRepair !== null;
    const finalLayout = bestRepair || layout; // NEVER downgrade — keep original if all repairs worse
    const finalScore  = accepted ? bestRepairScore : combinedScore;

    if (accepted) {
      pipelineLog(`REPAIR_ACCEPTED job_id=${jobId} iteration=${iteration} score=${finalScore} (was ${combinedScore})`);
    } else {
      pipelineLog(`REPAIR_REJECTED job_id=${jobId} iteration=${iteration} — all candidates scored <= current, keeping best`);
    }

    // Index to memory if score is high enough
    if (finalScore >= TARGET_SCORE) {
      saveBestToMemory(jobId, finalLayout, finalScore, vision);
    }

    const iterMs = Date.now() - iterStart;
    pipelineLog(`CRITIQUE_ITER_DONE job_id=${jobId} iteration=${iteration} finalScore=${finalScore} duration=${iterMs}ms`);

    return {
      score: combinedScore,       // score BEFORE repair (for UI display)
      issues: combinedIssues,
      fixes: combinedFixes,
      categoryScores: buildCategoryMap(criticResult),
      repairedLayout: accepted ? finalLayout : null,
      status: accepted ? 'repaired' : 'completed',
      bestScore: finalScore,
      iterationsRun: iteration,
    };

  } catch (error: any) {
    pipelineLog(`CRITIQUE_FAILED job_id=${jobId} iteration=${iteration} error="${error.message || error}"`);
    console.error(`Orchestrator critique fail for Job ${jobId}:`, error);
    return {
      score: 0,
      issues: [`Critique loop error: ${error.message || error}`],
      fixes: [],
      repairedLayout: null,
      status: 'failed',
      bestScore: 0,
      iterationsRun: iteration,
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function saveBestToMemory(jobId: string, layout: LayoutOutput, score: number, vision: VisionAnalysis) {
  const style = vision.designStyleClassification || 'minimal';
  const imageType = vision.productRegions.length > 0 ? vision.productRegions[0].label || 'product' : 'general';
  db.prepare(`
    INSERT INTO layout_memory (image_type, goal, style, headline_strategy, score, layout_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(imageType, 'creative_generation', style, conceptStrategy(layout), score, JSON.stringify(layout), new Date().toISOString());
  db.prepare('UPDATE jobs SET status = ?, final_layout_json = ?, updated_at = ? WHERE id = ?')
    .run('completed', JSON.stringify(layout), new Date().toISOString(), jobId);
  pipelineLog(`MEMORY_INDEXED job_id=${jobId} score=${score} style=${style}`);
}

function buildCategoryMap(criticResult: any): Record<string, number> {
  return {
    face_safety:    criticResult.face_safety    ?? 0,
    product_safety: criticResult.product_safety ?? 0,
    contrast:       criticResult.contrast       ?? 0,
    hierarchy:      criticResult.hierarchy      ?? 0,
    typography:     criticResult.typography     ?? 0,
    composition:    criticResult.composition    ?? 0,
    balance:        criticResult.balance        ?? 0,
    whitespace:     criticResult.whitespace     ?? 0,
  };
}

function conceptStrategy(layout: LayoutOutput): string {
  const headline = layout.elements.find(e => e.type === 'headline')?.text || '';
  if (headline.length < 15) return 'short_impact';
  if (headline.length < 35) return 'standard_title';
  return 'long_story';
}
