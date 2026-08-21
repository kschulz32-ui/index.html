const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DATABASE_PATH = process.env.DATABASE_PATH || './data/journal.db';
const resolvedPath = path.resolve(process.cwd(), DATABASE_PATH);
fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });

const db = new Database(resolvedPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'America/Chicago',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER NOT NULL REFERENCES groups(id),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    token TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS weekly_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER NOT NULL REFERENCES groups(id),
    sermon_date TEXT NOT NULL,
    sermon_title TEXT NOT NULL,
    prompt_text TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft',
    scheduled_for TEXT,
    sent_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS weekly_takeaways (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    weekly_entry_id INTEGER NOT NULL REFERENCES weekly_entries(id),
    position INTEGER NOT NULL,
    text TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS journal_responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    weekly_entry_id INTEGER NOT NULL REFERENCES weekly_entries(id),
    member_id INTEGER NOT NULL REFERENCES members(id),
    personal_text TEXT,
    work_text TEXT,
    family_text TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(weekly_entry_id, member_id)
  );
`);

// Seed the single pilot group if none exists yet — schema supports more
// groups later, but the app only ever operates against the first one for now.
const groupCount = db.prepare('SELECT COUNT(*) AS n FROM groups').get().n;
if (groupCount === 0) {
  db.prepare('INSERT INTO groups (name, timezone) VALUES (?, ?)').run(
    'Pilot Group',
    process.env.GROUP_TIMEZONE || 'America/Chicago'
  );
}

function getDefaultGroup() {
  return db.prepare('SELECT * FROM groups ORDER BY id ASC LIMIT 1').get();
}

module.exports = { db, getDefaultGroup };
