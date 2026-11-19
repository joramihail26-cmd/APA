'use strict';

/** Clasamentul general al jucătorilor, calculat din serile încheiate. */
class StatsService {
  constructor(db, playerRepo, sessionService) {
    this.db = db;
    this.players = playerRepo;
    this.sessions = sessionService;
  }

  overview() {
    const finished = this.sessions.list(500).filter((s) => s.status === 'finished');
    const acc = new Map(this.players.list().map((p) => [p.id, { id: p.id, name: p.name, color: p.color, played: 0, wins: 0, points: 0 }]));
    for (const s of finished) {
      const winnerSet = new Set(s.result.winners);
      const byTeam = new Map(s.standings.map((r) => [r.team, r]));
      s.teams.forEach((team, ti) => {
        for (const p of team.players) {
          const a = acc.get(p.id);
          if (!a) continue;
          a.played++;
          if (winnerSet.has(ti) && s.result.winners.length === 1) a.wins++;
          a.points += byTeam.get(ti).pts;
        }
      });
    }
    const players = [...acc.values()]
      .map((p) => ({ ...p, rate: p.played ? Math.round((p.wins / p.played) * 100) : 0 }))
      .sort((a, b) => b.wins - a.wins || b.points - a.points || b.rate - a.rate || a.name.localeCompare(b.name));
    return {
      players,
      sessions: finished.length,
      active: this.sessions.list(50).filter((s) => s.status === 'active').length,
    };
  }
}

module.exports = StatsService;
