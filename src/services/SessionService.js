'use strict';
const { RoundRobin } = require('../algorithms');
const { HttpError, cleanName, intIn } = require('../validators');

const WIN = 3;
const DRAW = 1;

/** Ciclul de viață al unei seri: creare, introducerea scorurilor, clasament, câștigător. */
class SessionService {
  constructor(db, playerRepo, gameRepo) {
    this.db = db;
    this.players = playerRepo;
    this.games = gameRepo;
    this.robin = new RoundRobin();
    this.stmts = {
      insert: db.prepare('INSERT INTO sessions (game_id, method, state) VALUES (?, ?, ?)'),
      one: db.prepare('SELECT * FROM sessions WHERE id = ?'),
      list: db.prepare('SELECT * FROM sessions ORDER BY id DESC LIMIT ?'),
      save: db.prepare('UPDATE sessions SET state = ? WHERE id = ?'),
      finish: db.prepare("UPDATE sessions SET status='finished', result=?, state=?, finished_at=datetime('now') WHERE id = ?"),
      del: db.prepare('DELETE FROM sessions WHERE id = ?'),
    };
  }

  hydrate(row) {
    const game = this.games.get(row.game_id);
    const state = JSON.parse(row.state);
    return {
      id: row.id, status: row.status, method: row.method,
      createdAt: row.created_at, finishedAt: row.finished_at,
      game: { id: game.id, name: game.name, emoji: game.emoji },
      teams: state.teams, matches: state.matches, cycles: state.cycles,
      standings: SessionService.standings(state),
      result: row.result ? JSON.parse(row.result) : null,
    };
  }

  create(body) {
    const game = this.games.get(Number(body.gameId));
    if (!Array.isArray(body.teams) || body.teams.length < 2 || body.teams.length > 8) throw new HttpError(400, 'Sunt necesare între 2 și 8 echipe');
    const cycles = intIn(body.cycles ?? 1, 1, 5, 'Numărul de manșe');
    const seenPlayers = new Set();
    const seenNames = new Set();
    const teams = body.teams.map((t, i) => {
      const name = cleanName(t.name, `Numele echipei ${i + 1}`, 28);
      if (seenNames.has(name.toLowerCase())) throw new HttpError(400, `Numele „${name}” apare de două ori`);
      seenNames.add(name.toLowerCase());
      if (!Array.isArray(t.players) || t.players.length === 0) throw new HttpError(400, `Echipa „${name}” nu are jucători`);
      const players = t.players.map((p) => {
        const id = Number(p.id);
        if (seenPlayers.has(id)) throw new HttpError(400, 'Un jucător apare în două echipe');
        seenPlayers.add(id);
        const row = this.players.get(id);
        return { id, name: row.name, color: row.color, role: String(p.role || 'Membru').slice(0, 24) };
      });
      return { name, color: /^#[0-9a-fA-F]{6}$/.test(t.color) ? t.color : '#118ab2', players };
    });
    const { matches } = this.robin.run(teams.length, cycles).result;
    const state = {
      teams, cycles,
      matches: matches.map((m) => ({ round: m.round, a: m.a, b: m.b, sa: 0, sb: 0, done: false })),
    };
    const id = Number(this.stmts.insert.run(game.id, body.method === 'constrained' ? 'constrained' : 'balanced', JSON.stringify(state)).lastInsertRowid);
    return this.get(id);
  }

  get(id) {
    const row = this.stmts.one.get(id);
    if (!row) throw new HttpError(404, 'Seara nu există');
    return this.hydrate(row);
  }

  list(limit = 50) {
    return this.stmts.list.all(limit).map((r) => this.hydrate(r));
  }

  setMatch(id, index, body) {
    const row = this.stmts.one.get(id);
    if (!row) throw new HttpError(404, 'Seara nu există');
    if (row.status !== 'active') throw new HttpError(400, 'Seara este încheiată');
    const state = JSON.parse(row.state);
    const m = state.matches[index];
    if (!m) throw new HttpError(404, 'Meciul nu există');
    m.sa = intIn(body.sa, 0, 999, 'Scorul');
    m.sb = intIn(body.sb, 0, 999, 'Scorul');
    m.done = !!body.done;
    this.stmts.save.run(JSON.stringify(state), id);
    return this.get(id);
  }

  finish(id) {
    const row = this.stmts.one.get(id);
    if (!row) throw new HttpError(404, 'Seara nu există');
    if (row.status !== 'active') throw new HttpError(400, 'Seara este deja încheiată');
    const state = JSON.parse(row.state);
    if (!state.matches.some((m) => m.done)) throw new HttpError(400, 'Marchează cel puțin un meci ca jucat');
    const standings = SessionService.standings(state);
    const top = standings[0];
    const winners = standings.filter((s) => s.pts === top.pts && s.diff === top.diff && s.gf === top.gf);
    const game = this.games.get(row.game_id);
    const result = {
      winners: winners.map((w) => w.team),
      message: SessionService.message(winners, state, game),
    };
    this.stmts.finish.run(JSON.stringify(result), JSON.stringify(state), id);
    return this.get(id);
  }

  remove(id) {
    if (!this.stmts.one.get(id)) throw new HttpError(404, 'Seara nu există');
    this.stmts.del.run(id);
  }

  /** Clasament: puncte, diferență de scor, scor marcat, apoi nume. */
  static standings(state) {
    const rows = state.teams.map((t, i) => ({ team: i, name: t.name, color: t.color, played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, diff: 0, pts: 0 }));
    for (const m of state.matches) {
      if (!m.done) continue;
      const A = rows[m.a];
      const B = rows[m.b];
      A.played++; B.played++;
      A.gf += m.sa; A.ga += m.sb; B.gf += m.sb; B.ga += m.sa;
      if (m.sa > m.sb) { A.w++; B.l++; A.pts += WIN; }
      else if (m.sa < m.sb) { B.w++; A.l++; B.pts += WIN; }
      else { A.d++; B.d++; A.pts += DRAW; B.pts += DRAW; }
    }
    rows.forEach((r) => { r.diff = r.gf - r.ga; });
    return rows.sort((x, y) => y.pts - x.pts || y.diff - x.diff || y.gf - x.gf || x.name.localeCompare(y.name));
  }

  static message(winners, state, game) {
    const join = (arr) => (arr.length <= 1 ? arr.join('') : `${arr.slice(0, -1).join(', ')} și ${arr[arr.length - 1]}`);
    if (winners.length === 1) {
      const w = winners[0];
      const names = state.teams[w.team].players.map((p) => p.name);
      return `Echipa ${w.name} câștigă seara de ${game.name}, cu ${w.pts} puncte din ${w.played} ${w.played === 1 ? 'meci' : 'meciuri'} jucate. Felicitări, ${join(names)}!`;
    }
    const names = winners.map((w) => w.name);
    return `Egalitate perfectă la ${game.name}: ${join(names)} termină cu același număr de puncte, aceeași diferență și același scor. Rămâne de jucat un meci decisiv.`;
  }
}

module.exports = SessionService;
