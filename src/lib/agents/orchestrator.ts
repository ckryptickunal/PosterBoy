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
import { VisionAnalysis, CopywriterOutput, TypographyTokens, LayoutOutput, CriticOutput } from '@/types/agents';

// Helper to generate UUIDs (Node 18+ built-in)
function generateId() {
  return randomUUID();
}

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
 */
export async function generateInitialLayout(
  imageName: string,
  imageBase64: string,
  mimeType: string,
  intent: string,
  availableFonts: any[]
): Promise<GenerationResult> {
  const jobId = generateId();

  // 1. Log job start
  db.prepare(`
    INSERT INTO jobs (id, status, image_path, intent, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(jobId, 'vision_analysis', imageName, intent, new Date().toISOString(), new Date().toISOString());

  try {
    // 2. Run Vision Agent (Agent 1)
    const vision = await runVisionAgent(imageBase64, mimeType);
    db.prepare('UPDATE jobs SET status = ?, updated_at = ? WHERE id = ?')
      .run('creative_direction', new Date().toISOString(), jobId);

    // 3. Query Design Constitution (Rules)
    const activeConst = db.prepare('SELECT rules_text FROM constitutions WHERE active = 1 ORDER BY version DESC LIMIT 1').get() as { rules_text: string };
    const rulesText = activeConst?.rules_text || '';

    // 4. Query Layout Memory (Few-shot patterns)
    const style = vision.designStyleClassification || 'minimal';
    const imageType = vision.productRegions.length > 0 ? vision.productRegions[0].label || 'product' : 'general';
    const memoryRecords = db.prepare(`
      SELECT style, image_type, layout_json, score 
      FROM layout_memory 
      WHERE style = ? OR image_type = ? 
      ORDER BY score DESC LIMIT 3
    `).all(style, imageType) as Array<{ style: string; image_type: string; layout_json: string; score: number }>;

    // 5. Run Creative Director Agent (Agent 2 - Multi-Shot Ideation)
    const cdOutput = await runCreativeDirectorAgent(intent, vision);
    const selectedConcept = cdOutput.selectedConcept;
    db.prepare('UPDATE jobs SET status = ?, updated_at = ? WHERE id = ?')
      .run('copywriting', new Date().toISOString(), jobId);

    // 6. Run Copywriter Agent (Agent 3)
    const copy = await runCopywriterAgent(selectedConcept, vision);
    db.prepare('UPDATE jobs SET status = ?, updated_at = ? WHERE id = ?')
      .run('typography', new Date().toISOString(), jobId);

    // 7. Run Typography Agent (Agent 4)
    const typography = await runTypographyAgent(selectedConcept, availableFonts);
    db.prepare('UPDATE jobs SET status = ?, updated_at = ? WHERE id = ?')
      .run('layout', new Date().toISOString(), jobId);

    // 8. Run Layout Agent (Agent 5 - coordinate planner)
    const layout = await runLayoutAgent({
      vision,
      copy,
      typography,
      rulesText,
      memoryExamples: memoryRecords
    });

    // 9. Update Job final state
    db.prepare('UPDATE jobs SET status = ?, final_layout_json = ?, updated_at = ? WHERE id = ?')
      .run('layout_rendering', JSON.stringify(layout), new Date().toISOString(), jobId);

    return {
      jobId,
      vision,
      concept: selectedConcept,
      copy,
      typography,
      layout
    };

  } catch (error: any) {
    db.prepare('UPDATE jobs SET status = ?, updated_at = ? WHERE id = ?')
      .run('failed', new Date().toISOString(), jobId);
    console.error(`Orchestrator failed during generation for Job ${jobId}:`, error);
    throw error;
  }
}

export interface CritiqueRepairResult {
  score: number;
  issues: string[];
  fixes: string[];
  repairedLayout: LayoutOutput | null;
  status: 'completed' | 'repaired' | 'failed';
}

/**
 * Executes Agent 6 (Critic) and Agent 7 (Repair) on a rendered screenshot.
 */
export async function processCritiqueAndRepair(
  jobId: string,
  iteration: number,
  layout: LayoutOutput,
  screenshotBase64: string,
  vision: VisionAnalysis
): Promise<CritiqueRepairResult> {
  try {
    // 1. Fetch active Constitution
    const activeConst = db.prepare('SELECT rules_text FROM constitutions WHERE active = 1 ORDER BY version DESC LIMIT 1').get() as { rules_text: string };
    const rulesText = activeConst?.rules_text || '';

    // 2. Run Python Geometry Helper (calculates overlaps, spacing, margins)
    const geomResult = await runGeometryHelper({
      elements: layout.elements,
      faceRegions: vision.faceRegions,
      productRegions: vision.productRegions,
      margins: 8.0 // standard 8%
    });

    // 3. Run Gemini Critic Agent (Agent 6)
    const criticResult = await runCriticAgent({
      screenshotBase64,
      layout,
      rulesText
    });

    // 4. Combine evaluations (Python geometry checks enforce absolute correctness)
    const combinedScore = Math.min(geomResult.score, criticResult.score);
    const combinedIssues = Array.from(new Set([...geomResult.issues, ...criticResult.issues]));
    const combinedFixes = Array.from(new Set([...geomResult.fixes, ...criticResult.fixes]));

    const critiqueOutput: CriticOutput = {
      score: combinedScore,
      issues: combinedIssues,
      fixes: combinedFixes
    };

    let repairedLayout: LayoutOutput | null = null;
    let status: 'completed' | 'repaired' = 'completed';

    // 5. If score < 90 and we haven't hit max iterations, run Repair Agent (Agent 7)
    if (combinedScore < 90 && iteration < 3) {
      status = 'repaired';
      repairedLayout = await runRepairAgent({
        layout,
        critique: critiqueOutput,
        rulesText
      });
    }

    // 6. Save iteration to critique history
    db.prepare(`
      INSERT INTO critique_history (job_id, iteration, score, issues_json, fixes_json, layout_json, screenshot_path, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      jobId,
      iteration,
      combinedScore,
      JSON.stringify(combinedIssues),
      JSON.stringify(combinedFixes),
      JSON.stringify(repairedLayout || layout),
      null, // Screenshot path not stored locally to avoid bloating local storage
      new Date().toISOString()
    );

    // 7. If score is high (>= 90), index layout to Layout Memory
    if (combinedScore >= 90) {
      const style = vision.designStyleClassification || 'minimal';
      const imageType = vision.productRegions.length > 0 ? vision.productRegions[0].label || 'product' : 'general';
      const goal = 'creative_generation';
      
      // Store in memory table
      db.prepare(`
        INSERT INTO layout_memory (image_type, goal, style, headline_strategy, score, layout_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        imageType,
        goal,
        style,
        conceptStrategy(layout),
        combinedScore,
        JSON.stringify(repairedLayout || layout),
        new Date().toISOString()
      );
      
      // Update Job status to completed
      db.prepare('UPDATE jobs SET status = ?, final_layout_json = ?, updated_at = ? WHERE id = ?')
        .run('completed', JSON.stringify(repairedLayout || layout), new Date().toISOString(), jobId);
    }

    return {
      score: combinedScore,
      issues: combinedIssues,
      fixes: combinedFixes,
      repairedLayout,
      status
    };

  } catch (error: any) {
    console.error(`Orchestrator critique fail for Job ${jobId}:`, error);
    return {
      score: 0,
      issues: [`Critique loop error: ${error.message || error}`],
      fixes: [],
      repairedLayout: null,
      status: 'failed'
    };
  }
}

// Simple heuristic to extract text strategy for layout index tag
function conceptStrategy(layout: LayoutOutput): string {
  const headline = layout.elements.find(e => e.type === 'headline')?.text || '';
  if (headline.length < 15) return 'short_impact';
  if (headline.length < 35) return 'standard_title';
  return 'long_story';
}
