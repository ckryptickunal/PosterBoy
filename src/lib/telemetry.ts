import { randomUUID } from 'crypto';
import db from './db';
import { PerformanceAnalytics } from '@/types/agents';

// Pricing rates per token (Gemini 2.5 Flash and Pro equivalents)
export function estimateCost(modelName: string, inputTokens: number, outputTokens: number): number {
  const modelLower = modelName.toLowerCase();
  let inputRate = 0.075 / 1000000; // $0.075 per 1M input tokens
  let outputRate = 0.30 / 1000000; // $0.30 per 1M output tokens

  if (modelLower.includes('pro')) {
    inputRate = 1.25 / 1000000;  // $1.25 per 1M input tokens
    outputRate = 5.00 / 1000000; // $5.00 per 1M output tokens
  }

  return (inputTokens * inputRate) + (outputTokens * outputRate);
}

// 1. Starts a top-level pipeline run
export function startPipelineRun(jobId: string): string {
  const id = randomUUID();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO pipeline_runs (id, job_id, started_at, created_at)
    VALUES (?, ?, ?, ?)
  `).run(id, jobId, now, now);
  return id;
}

// 2. Completes a pipeline run, recalculating overall aggregates
export function completePipelineRun(pipelineRunId: string, finalScore: number | null): void {
  const now = new Date().toISOString();
  
  // Calculate aggregate stats for this pipeline run
  const runInfo = db.prepare('SELECT started_at FROM pipeline_runs WHERE id = ?').get(pipelineRunId) as { started_at: string };
  if (!runInfo) return;

  const durationMs = new Date(now).getTime() - new Date(runInfo.started_at).getTime();

  // Aggregate totals from agent_runs
  const stats = db.prepare(`
    SELECT 
      SUM(input_tokens) as total_in,
      SUM(output_tokens) as total_out,
      SUM(total_tokens) as total_tok,
      COUNT(id) as total_calls,
      SUM(retry_count) as total_ret
    FROM agent_runs
    WHERE pipeline_run_id = ?
  `).get(pipelineRunId) as { total_in: number; total_out: number; total_tok: number; total_calls: number; total_ret: number };

  // Count repair loops (Critic loops run count)
  const repairLoops = db.prepare(`
    SELECT COUNT(*) as count 
    FROM agent_runs 
    WHERE pipeline_run_id = ? AND agent_name = 'Critic Agent'
  `).get(pipelineRunId) as { count: number };

  db.prepare(`
    UPDATE pipeline_runs 
    SET 
      completed_at = ?,
      total_duration_ms = ?,
      total_input_tokens = ?,
      total_output_tokens = ?,
      total_tokens = ?,
      total_api_calls = ?,
      total_retries = ?,
      total_repair_loops = ?,
      final_score = ?
    WHERE id = ?
  `).run(
    now,
    durationMs,
    stats.total_in || 0,
    stats.total_out || 0,
    stats.total_tok || 0,
    stats.total_calls || 0,
    stats.total_ret || 0,
    Math.max(0, (repairLoops.count || 0) - 1), // Number of actual repair iterations is loops - 1
    finalScore,
    pipelineRunId
  );
}

// 3. Starts an individual agent run stage
export function startAgentRun(
  pipelineRunId: string,
  agentName: string,
  modelName: string,
  iterationNumber: number,
  executionOrder: number,
  inputData?: any
): string {
  const id = randomUUID();
  const now = new Date().toISOString();
  const inputStr = inputData ? JSON.stringify(inputData) : null;

  db.prepare(`
    INSERT INTO agent_runs (
      id, pipeline_run_id, agent_name, model_name, iteration_number, 
      execution_order, started_at, status, input_data, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, 'started', ?, ?)
  `).run(id, pipelineRunId, agentName, modelName, iterationNumber, executionOrder, now, inputStr, now);

  // Record startup event
  recordAgentEvent(pipelineRunId, agentName, 'started', `Agent ${agentName} execution initiated on ${modelName}.`);

  return id;
}

// 4. Completes an individual agent run stage
export function completeAgentRun(
  agentRunId: string,
  status: 'completed' | 'failed',
  outputData?: any,
  retryCount = 0
): void {
  const now = new Date().toISOString();
  const runInfo = db.prepare('SELECT started_at, pipeline_run_id, agent_name, model_name FROM agent_runs WHERE id = ?').get(agentRunId) as {
    started_at: string;
    pipeline_run_id: string;
    agent_name: string;
    model_name: string;
  };
  
  if (!runInfo) return;

  const durationMs = new Date(now).getTime() - new Date(runInfo.started_at).getTime();

  // Aggregate tokens from token_usage for this agent_run
  const tokenStats = db.prepare(`
    SELECT SUM(prompt_tokens) as in_tok, SUM(completion_tokens) as out_tok
    FROM token_usage
    WHERE agent_run_id = ?
  `).get(agentRunId) as { in_tok: number | null; out_tok: number | null };

  const promptTokens = tokenStats.in_tok || 0;
  const completionTokens = tokenStats.out_tok || 0;
  const totalTokens = promptTokens + completionTokens;
  const cost = estimateCost(runInfo.model_name, promptTokens, completionTokens);
  const outputStr = outputData ? JSON.stringify(outputData) : null;

  db.prepare(`
    UPDATE agent_runs
    SET 
      completed_at = ?,
      duration_ms = ?,
      input_tokens = ?,
      output_tokens = ?,
      total_tokens = ?,
      estimated_cost = ?,
      retry_count = ?,
      status = ?,
      output_data = ?
    WHERE id = ?
  `).run(now, durationMs, promptTokens, completionTokens, totalTokens, cost, retryCount, status, outputStr, agentRunId);

  // Record completion/fail event
  recordAgentEvent(
    runInfo.pipeline_run_id,
    runInfo.agent_name,
    status,
    status === 'completed' 
      ? `Agent ${runInfo.agent_name} finished in ${durationMs}ms consuming ${totalTokens} tokens.`
      : `Agent ${runInfo.agent_name} failed after ${durationMs}ms.`
  );
}

// 5. Records generic agent event
export function recordAgentEvent(
  pipelineRunId: string,
  agentName: string,
  eventType: string,
  message: string,
  metadata?: any
): void {
  const now = new Date().toISOString();
  const metaStr = metadata ? JSON.stringify(metadata) : null;
  db.prepare(`
    INSERT INTO agent_events (pipeline_run_id, agent_name, event_type, message, metadata, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(pipelineRunId, agentName, eventType, message, metaStr, now);
}

// 6. Gets report for a specific pipeline run (used for visual timeline and replays)
export function getPipelineReport(pipelineRunId: string): any {
  const run = db.prepare('SELECT * FROM pipeline_runs WHERE id = ?').get(pipelineRunId);
  if (!run) return null;

  const agents = db.prepare(`
    SELECT * FROM agent_runs 
    WHERE pipeline_run_id = ? 
    ORDER BY execution_order ASC, started_at ASC
  `).all(pipelineRunId);

  const events = db.prepare(`
    SELECT * FROM agent_events 
    WHERE pipeline_run_id = ? 
    ORDER BY timestamp ASC
  `).all(pipelineRunId);

  // Sum estimated cost
  const costSum = db.prepare(`
    SELECT SUM(estimated_cost) as cost FROM agent_runs WHERE pipeline_run_id = ?
  `).get(pipelineRunId) as { cost: number };

  return {
    pipeline: run,
    agents,
    events,
    estimatedCost: costSum.cost || 0
  };
}

// 7. Performance aggregate analytics
export function getPerformanceAnalytics(): PerformanceAnalytics {
  const slowest = db.prepare(`
    SELECT agent_name as agentName, AVG(duration_ms) as avgDurationMs 
    FROM agent_runs 
    WHERE status = 'completed'
    GROUP BY agent_name 
    ORDER BY avgDurationMs DESC 
    LIMIT 1
  `).get() as { agentName: string; avgDurationMs: number } | undefined;

  const costliest = db.prepare(`
    SELECT agent_name as agentName, SUM(estimated_cost) as totalCost 
    FROM agent_runs 
    GROUP BY agent_name 
    ORDER BY totalCost DESC 
    LIMIT 1
  `).get() as { agentName: string; totalCost: number } | undefined;

  const heaviest = db.prepare(`
    SELECT agent_name as agentName, SUM(total_tokens) as totalTokens 
    FROM agent_runs 
    GROUP BY agent_name 
    ORDER BY totalTokens DESC 
    LIMIT 1
  `).get() as { agentName: string; totalTokens: number } | undefined;

  const avgGenTime = db.prepare(`
    SELECT AVG(total_duration_ms) as avgTime 
    FROM pipeline_runs 
    WHERE completed_at IS NOT NULL
  `).get() as { avgTime: number };

  const avgRepairs = db.prepare(`
    SELECT AVG(total_repair_loops) as avgRepairs 
    FROM pipeline_runs 
    WHERE completed_at IS NOT NULL
  `).get() as { avgRepairs: number };

  // Calculate score improvement average
  // Score diff between final score and initial loop critic score
  const scoreImprovement = db.prepare(`
    SELECT AVG(final_score - initial_score) as avgImprovement
    FROM (
      SELECT pr.id, pr.final_score, (
        SELECT score FROM critique_history 
        WHERE job_id = pr.job_id 
        ORDER BY iteration ASC LIMIT 1
      ) as initial_score
      FROM pipeline_runs pr
      WHERE pr.final_score IS NOT NULL
    ) WHERE initial_score IS NOT NULL
  `).get() as { avgImprovement: number };

  return {
    slowestAgent: slowest || null,
    mostExpensiveAgent: costliest || null,
    highestTokenConsumer: heaviest || null,
    avgGenerationTimeMs: avgGenTime?.avgTime || 0,
    avgRepairCount: avgRepairs?.avgRepairs || 0,
    avgScoreImprovement: scoreImprovement?.avgImprovement || 0
  };
}
