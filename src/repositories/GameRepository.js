'use strict';
const { HttpError, cleanName, intIn } = require('../validators');

const TRAIT_KEYS = ['strategy', 'creativity', 'speed', 'social'];

class GameRepository {
  constructor(db) {
    this.db = db;
    this.stmts = {
      all: db.prepare('SELECT * FROM games ORDER BY builtin DESC, name COLLATE NOCASE'),
      one: db.prepare('SELECT * FROM games WHERE id = ?'),
      insert: db.prepare(`INSERT INTO games (name, emoji, description, duration, fun, min_players, max_players, roles, builtin)
        VALUES (@name, @emoji, @description, @duration, @fun, @min_players, @max_players, @roles, 0)`),
      del: db.prepare('DELETE FROM games WHERE id = ? AND builtin = 0'),
    };
  }

  static hydrate(row) {
    return { ...row, builtin: !!row.builtin, roles: JSON.parse(row.roles) };
  }

  list() {
    return this.stmts.all.all().map(GameRepository.hydrate);
  }

  get(id) {
    const row = this.stmts.one.get(id);
    if (!row) throw new HttpError(404, 'Jocul nu există');
    return GameRepository.hydrate(row);
  }

  /** Rolurile se primesc ca listă de { name, count, trait } și primesc ponderi din trăsătura principală. */
  static parseRoles(raw) {
    if (!Array.isArray(raw) || raw.length === 0) throw new HttpError(400, 'Adaugă cel puțin un rol');
    if (raw.length > 8) throw new HttpError(400, 'Maximum 8 roluri');
    return raw.map((r) => {
      const name = cleanName(r.name, 'Numele rolului', 24);
      const count = intIn(r.count ?? 1, 1, 4, 'Numărul de locuri');
      const main = TRAIT_KEYS.includes(r.trait) ? r.trait : null;
      const weights = {};
      for (const t of TRAIT_KEYS) weights[t] = main ? (t === main ? 4 : 1) : 1;
      return { name, count, weights };
    });
  }

  create(body) {
    const roles = GameRepository.parseRoles(body.roles);
    const min = intIn(body.min_players ?? 2, 2, 20, 'Minim jucători');
    const max = intIn(body.max_players ?? 16, min, 30, 'Maxim jucători');
    const data = {
      name: cleanName(body.name, 'Numele jocului', 30),
      emoji: String(body.emoji || '🎲').slice(0, 4),
      description: String(body.description || '').trim().slice(0, 200),
      duration: intIn(body.duration, 5, 240, 'Durata (minute)'),
      fun: intIn(body.fun ?? 5, 1, 10, 'Distracția'),
      min_players: min,
      max_players: max,
      roles: JSON.stringify(roles),
    };
    try {
      return this.get(Number(this.stmts.insert.run(data).lastInsertRowid));
    } catch (e) {
      if (String(e.message).includes('UNIQUE')) throw new HttpError(409, 'Există deja un joc cu acest nume');
      throw e;
    }
  }

  remove(id) {
    const g = this.get(id);
    if (g.builtin) throw new HttpError(400, 'Jocurile implicite nu pot fi șterse');
    this.stmts.del.run(id);
  }
}

module.exports = GameRepository;
