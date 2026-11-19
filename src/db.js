'use strict';
const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const DEFAULT_GAMES = require('./seedGames');

/**
 * Strat subțire peste SQLite-ul inclus în Node (node:sqlite), ca aplicația să
 * nu depindă de module native care trebuie compilate. Oferă pragma() și
 * transaction() cu tranzacții imbricate (cele interioare se execută direct).
 */
class Database {
  constructor(file) {
    this.raw = new DatabaseSync(file);
    this.depth = 0;
  }

  exec(sql) { this.raw.exec(sql); }

  prepare(sql) { return this.raw.prepare(sql); }

  pragma(text) { this.raw.exec(`PRAGMA ${text}`); }

  transaction(fn) {
    return (...args) => {
      if (this.depth > 0) return fn(...args);
      this.raw.exec('BEGIN');
      this.depth++;
      try {
        const out = fn(...args);
        this.raw.exec('COMMIT');
        return out;
      } catch (e) {
        this.raw.exec('ROLLBACK');
        throw e;
      } finally {
        this.depth--;
      }
    };
  }

  close() { this.raw.close(); }
}

/** Deschide baza de date SQLite, creează tabelele și jocurile implicite. */
function openDatabase(file) {
  const target = file || process.env.DB_FILE || path.join(__dirname, '..', 'data', 'gamenight.db');
  if (target !== ':memory:') fs.mkdirSync(path.dirname(target), { recursive: true });
  const db = new Database(target);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE COLLATE NOCASE,
      color TEXT NOT NULL,
      strategy INTEGER NOT NULL DEFAULT 5,
      creativity INTEGER NOT NULL DEFAULT 5,
      speed INTEGER NOT NULL DEFAULT 5,
      social INTEGER NOT NULL DEFAULT 5,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE COLLATE NOCASE,
      emoji TEXT NOT NULL DEFAULT '🎲',
      description TEXT NOT NULL DEFAULT '',
      duration INTEGER NOT NULL,
      fun INTEGER NOT NULL DEFAULT 5,
      min_players INTEGER NOT NULL DEFAULT 2,
      max_players INTEGER NOT NULL DEFAULT 16,
      roles TEXT NOT NULL,
      builtin INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS levels (
      player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
      level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 5),
      PRIMARY KEY (player_id, game_id)
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'active',
      method TEXT NOT NULL,
      state TEXT NOT NULL,
      result TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      finished_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status, id DESC);
  `);

  const count = db.prepare('SELECT COUNT(*) c FROM games').get().c;
  if (count === 0) {
    const ins = db.prepare(`INSERT INTO games (name, emoji, description, duration, fun, min_players, max_players, roles, builtin)
      VALUES (@name, @emoji, @description, @duration, @fun, @min_players, @max_players, @roles, 1)`);
    db.transaction(() => {
      for (const g of DEFAULT_GAMES) ins.run({ ...g, roles: JSON.stringify(g.roles) });
    })();
  }
  return db;
}

module.exports = { openDatabase };
