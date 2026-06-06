/**
 * PosterBoy Logger
 * ─────────────────
 * Writes structured append-only logs to:
 *   logs/pipeline.log
 *   logs/agents/vision.log
 *   logs/agents/creative.log
 *   logs/agents/copywriter.log
 *   logs/agents/typography.log
 *   logs/agents/layout.log
 *   logs/agents/critic.log
 *   logs/agents/repair.log
 *   logs/jobs/<jobId>.json
 *   logs/performance/daily_stats.json
 */

import fs from 'fs';
import path from 'path';

const LOG_ROOT = path.join(process.cwd(), 'logs');

// Ensure all log directories exist on first import
const dirs = [
  LOG_ROOT,
  path.join(LOG_ROOT, 'agents'),
  path.join(LOG_ROOT, 'jobs'),
  path.join(LOG_ROOT, 'performance'),
];
for (const d of dirs) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function ts(): string {
  return new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
}

function append(filePath: string, line: string) {
  try {
    fs.appendFileSync(filePath, line + '\n');
  } catch {
    // Non-fatal — logging should never crash the app
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Writes an entry to logs/pipeline.log
 *
 * @example
 * pipelineLog('JOB_START job_id=abc intent="jewellery launch"')
 */
export function pipelineLog(message: string) {
  const logPath = path.join(LOG_ROOT, 'pipeline.log');
  const separator = message.startsWith('JOB_') ? '\n' + '─'.repeat(64) + '\n' : '';
  append(logPath, `${separator}[${ts()}] ${message}`);
}

/**
 * Writes an entry to logs/agents/<agent>.log
 *
 * @param agent  One of: vision | creative | copywriter | typography | layout | critic | repair
 * @param message  Free-form log line
 */
export function agentLog(agent: string, message: string) {
  const logPath = path.join(LOG_ROOT, 'agents', `${agent}.log`);
  append(logPath, `[${ts()}] ${message}`);
}

/**
 * Saves a full job replay JSON to logs/jobs/<jobId>.json
 * Contains inputs, outputs, timings, and agent dependency graph.
 */
export function saveJobReplay(jobId: string, payload: {
  intent: string;
  imageName: string;
  agents: Record<string, { duration: number; depends_on: string[]; tokens?: number; cost?: number }>;
  outputs: Record<string, any>;
}) {
  const filePath = path.join(LOG_ROOT, 'jobs', `${jobId}.json`);
  try {
    fs.writeFileSync(filePath, JSON.stringify({
      job_id: jobId,
      created_at: new Date().toISOString(),
      ...payload,
    }, null, 2));
  } catch {
    // Non-fatal
  }
}

/**
 * Updates logs/performance/daily_stats.json with per-agent timing info.
 */
export function writePerformanceStats(
  agentTimings: Record<string, { start: number; end?: number }>
) {
  const statsPath = path.join(LOG_ROOT, 'performance', 'daily_stats.json');
  const today = new Date().toISOString().slice(0, 10);

  let stats: Record<string, any> = {};
  try {
    if (fs.existsSync(statsPath)) {
      stats = JSON.parse(fs.readFileSync(statsPath, 'utf-8'));
    }
  } catch { /* fresh file */ }

  if (!stats[today]) stats[today] = { generations: 0, agents: {} };
  stats[today].generations += 1;

  for (const [name, t] of Object.entries(agentTimings)) {
    if (!t.end) continue;
    const ms = t.end - t.start;
    if (!stats[today].agents[name]) {
      stats[today].agents[name] = { count: 0, total_ms: 0, avg_ms: 0, max_ms: 0 };
    }
    const a = stats[today].agents[name];
    a.count += 1;
    a.total_ms += ms;
    a.avg_ms = Math.round(a.total_ms / a.count);
    a.max_ms = Math.max(a.max_ms, ms);
  }

  try {
    fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));
  } catch { /* Non-fatal */ }
}
