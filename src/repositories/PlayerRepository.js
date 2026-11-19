'use strict';
const { HttpError, TRAITS, cleanName, intIn, cleanColor, COLORS } = require('../validators');

/** Acces la jucători și la nivelurile lor pe fiecare joc. */
class PlayerRepository {
  constructor(db) {
    this.db = db;
    this.stmts = {
      all: db.prepare('SELECT * FROM players ORDER BY name COLLATE NOCASE'),
      one: db.prepare('SELECT * FROM players WHERE id = ?'),
      insert: db.prepare(`INSERT INTO players (name, color, strategy, creativity, speed, social)
        VALUES (@name, @color, @strategy, @creativity, @speed, @social)`),
      update: db.prepare(`UPDATE players SET name=@name, color=@color, strategy=@strategy,
        creativity=@creativity, speed=@speed, social=@social WHERE id=@id`),
      del: db.prepare('DELETE FROM players WHERE id = ?'),
      levels: db.prepare('SELECT player_id, game_id, level FROM levels'),
      levelsOf: db.prepare('SELECT game_id, level FROM levels WHERE player_id = ?'),
      setLevel: db.prepare(`INSERT INTO levels (player_id, game_id, level) VALUES (?, ?, ?)
        ON CONFLICT(player_id, game_id) DO UPDATE SET level = excluded.level`),
      gameExists: db.prepare('SELECT 1 FROM games WHERE id = ?'),
      count: db.prepare('SELECT COUNT(*) c FROM players'),
    };
  }

  list() {
    const levels = {};
    for (const l of this.stmts.levels.all()) (levels[l.player_id] ||= {})[l.game_id] = l.level;
    return this.stmts.all.all().map((p) => ({ ...p, levels: levels[p.id] || {} }));
  }

  get(id) {
    const p = this.stmts.one.get(id);
    if (!p) throw new HttpError(404, 'Jucătorul nu există');
    const levels = {};
    for (const l of this.stmts.levelsOf.all(id)) levels[l.game_id] = l.level;
    return { ...p, levels };
  }

  static parse(body) {
    const out = { name: cleanName(body.name, 'Numele', 24), color: cleanColor(body.color) };
    for (const t of TRAITS) out[t] = intIn(body[t] ?? 5, 1, 10, 'Trăsătura');
    return out;
  }

  create(body) {
    const data = PlayerRepository.parse(body);
    if (!body.color) data.color = COLORS[this.stmts.count.get().c % COLORS.length];
    const tx = this.db.transaction(() => {
      let id;
      try {
        id = this.stmts.insert.run(data).lastInsertRowid;
      } catch (e) {
        if (String(e.message).includes('UNIQUE')) throw new HttpError(409, 'Există deja un jucător cu acest nume');
        throw e;
      }
      if (body.levels) this.setLevels(Number(id), body.levels);
      return Number(id);
    });
    return this.get(tx());
  }

  update(id, body) {
    this.get(id);
    const data = PlayerRepository.parse(body);
    const tx = this.db.transaction(() => {
      try {
        this.stmts.update.run({ ...data, id });
      } catch (e) {
        if (String(e.message).includes('UNIQUE')) throw new HttpError(409, 'Există deja un jucător cu acest nume');
        throw e;
      }
      if (body.levels) this.setLevels(id, body.levels);
    });
    tx();
    return this.get(id);
  }

  setLevels(id, levels) {
    if (typeof levels !== 'object' || levels === null) throw new HttpError(400, 'Niveluri invalide');
    this.get(id);
    const tx = this.db.transaction(() => {
      for (const [gameId, lv] of Object.entries(levels)) {
        const g = Number(gameId);
        if (!this.stmts.gameExists.get(g)) throw new HttpError(400, 'Joc inexistent');
        this.stmts.setLevel.run(id, g, intIn(lv, 1, 5, 'Nivelul'));
      }
    });
    tx();
    return this.get(id);
  }

  remove(id) {
    this.get(id);
    this.stmts.del.run(id);
  }
}

module.exports = PlayerRepository;
