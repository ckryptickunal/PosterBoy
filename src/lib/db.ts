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
