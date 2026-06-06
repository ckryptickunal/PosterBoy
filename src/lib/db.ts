import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'db.sqlite');

// Initialize database connection
const db = new Database(DB_PATH);

// Set WAL mode for faster local execution
db.pragma('journal_mode = WAL');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    image_path TEXT NOT NULL,
    intent TEXT NOT NULL,
    final_layout_json TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS constitutions (
    version INTEGER PRIMARY KEY AUTOINCREMENT,
    rules_text TEXT NOT NULL,
    active INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS layout_memory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    image_type TEXT NOT NULL,
    goal TEXT NOT NULL,
    style TEXT NOT NULL,
    headline_strategy TEXT NOT NULL,
    score REAL NOT NULL,
    layout_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS critique_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id TEXT NOT NULL,
    iteration INTEGER NOT NULL,
    score REAL NOT NULL,
    issues_json TEXT NOT NULL,
    fixes_json TEXT NOT NULL,
    layout_json TEXT NOT NULL,
    screenshot_path TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(job_id) REFERENCES jobs(id)
  );

  CREATE TABLE IF NOT EXISTS fonts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    family_name TEXT NOT NULL,
    category TEXT NOT NULL, -- 'display' | 'body'
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS pipeline_runs (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    total_duration_ms INTEGER DEFAULT 0,
    total_input_tokens INTEGER DEFAULT 0,
    total_output_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    total_api_calls INTEGER DEFAULT 0,
    total_retries INTEGER DEFAULT 0,
    total_repair_loops INTEGER DEFAULT 0,
    final_score REAL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(job_id) REFERENCES jobs(id)
  );

  CREATE TABLE IF NOT EXISTS agent_runs (
    id TEXT PRIMARY KEY,
    pipeline_run_id TEXT NOT NULL,
    agent_name TEXT NOT NULL,
    model_name TEXT NOT NULL,
    iteration_number INTEGER DEFAULT 1,
    execution_order INTEGER DEFAULT 1,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    duration_ms INTEGER DEFAULT 0,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    estimated_cost REAL DEFAULT 0.0,
    retry_count INTEGER DEFAULT 0,
    status TEXT NOT NULL, -- 'started', 'completed', 'failed'
    input_data TEXT, -- JSON stringified inputs
    output_data TEXT, -- JSON stringified outputs
    created_at TEXT NOT NULL,
    FOREIGN KEY(pipeline_run_id) REFERENCES pipeline_runs(id)
  );

  CREATE TABLE IF NOT EXISTS token_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pipeline_run_id TEXT NOT NULL,
    agent_run_id TEXT NOT NULL,
    model_name TEXT NOT NULL,
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    estimated_cost REAL DEFAULT 0.0,
    timestamp TEXT NOT NULL,
    FOREIGN KEY(pipeline_run_id) REFERENCES pipeline_runs(id),
    FOREIGN KEY(agent_run_id) REFERENCES agent_runs(id)
  );

  CREATE TABLE IF NOT EXISTS agent_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pipeline_run_id TEXT NOT NULL,
    agent_name TEXT NOT NULL,
    event_type TEXT NOT NULL, -- 'started', 'completed', 'retry', 'failed', 'repaired', 'schema_error', 'critic_feedback', 'repair_applied'
    message TEXT NOT NULL,
    metadata TEXT, -- JSON stringified metadata
    timestamp TEXT NOT NULL,
    FOREIGN KEY(pipeline_run_id) REFERENCES pipeline_runs(id)
  );
`);

// Seed default design constitution if empty
const checkConst = db.prepare('SELECT COUNT(*) as count FROM constitutions').get() as { count: number };
if (checkConst.count === 0) {
  try {
    const defaultRulesPath = path.join(process.cwd(), 'design_rules.md');
    if (fs.existsSync(defaultRulesPath)) {
      const defaultRules = fs.readFileSync(defaultRulesPath, 'utf-8');
      db.prepare(`
        INSERT INTO constitutions (rules_text, active, created_at)
        VALUES (?, 1, ?)
      `).run(defaultRules, new Date().toISOString());
    }
  } catch (err) {
    console.error('Failed to seed default constitution rules:', err);
  }
}

export default db;
export { db };
