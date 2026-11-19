'use strict';
const { BitmaskPartition, BranchAndBound } = require('../algorithms');
const { HttpError } = require('../validators');
const Rating = require('./Rating');
const RoleAssigner = require('./RoleAssigner');

const TEAM_COLORS = ['#ef476f', '#118ab2', '#06d6a0', '#ffb703', '#9b5de5', '#f77f00', '#2ec4b6', '#80b918'];

/**
 * Formează echipele: Bitmask DP când nu există restricții, Branch and Bound
 * când utilizatorul impune reguli stricte, apoi atribuie rolurile (Hungarian).
 */
class TeamService {
  constructor() {
    this.bitmask = new BitmaskPartition();
    this.bnb = new BranchAndBound();
    this.roles = new RoleAssigner();
  }

  propose({ players, game, teamCount, constraints = [], method }) {
    const n = players.length;
    if (n < 2) throw new HttpError(400, 'Alege cel puțin 2 jucători');
    if (teamCount < 2 || teamCount > 8) throw new HttpError(400, 'Numărul de echipe trebuie să fie între 2 și 8');
    if (n < teamCount) throw new HttpError(400, 'Sunt mai multe echipe decât jucători');

    const strengths = players.map((p) => Rating.strength(p, game));
    const index = new Map(players.map((p, i) => [p.id, i]));

    let algo;
    let out;
    const usedMethod = constraints.length > 0 ? 'constrained' : method === 'constrained' ? 'constrained' : 'balanced';
    if (usedMethod === 'balanced') {
      if (n > this.bitmask.MAX_PLAYERS) throw new HttpError(400, `Pentru echilibrare exactă sunt acceptați cel mult ${this.bitmask.MAX_PLAYERS} jucători`);
      algo = this.bitmask;
      out = this.bitmask.run(strengths, teamCount);
      out.result.feasible = true;
    } else {
      if (n > 20) throw new HttpError(400, 'Cu restricții sunt acceptați cel mult 20 de jucători');
      const mapped = constraints.map((c) => {
        if (!index.has(c.a)) throw new HttpError(400, 'Restricție cu jucător nealeas');
        if (c.type === 'team') {
          if (!Number.isInteger(c.team) || c.team < 0 || c.team >= teamCount) throw new HttpError(400, 'Echipa din restricție nu există');
          return { type: 'team', a: index.get(c.a), team: c.team };
        }
        if (!['separate', 'together'].includes(c.type)) throw new HttpError(400, 'Tip de restricție necunoscut');
        if (!index.has(c.b) || c.a === c.b) throw new HttpError(400, 'Restricție invalidă: alege doi jucători diferiți');
        return { type: c.type, a: index.get(c.a), b: index.get(c.b) };
      });
      algo = this.bnb;
      out = this.bnb.run(strengths, teamCount, mapped);
      if (!out.result.feasible) {
        throw new HttpError(422, `${out.result.reason}. Elimină sau modifică o regulă și încearcă din nou.`);
      }
    }

    const { teams, sums, deviation } = out.result;
    const sizes = BitmaskPartition.teamSizes(n, teamCount);
    const roleStats = { steps: 0, totalAffinity: 0 };

    const resultTeams = teams.map((memberIdx, ti) => {
      const members = memberIdx.map((i) => players[i]);
      const { roles, stats } = this.roles.assign(members, game);
      roleStats.steps += stats.steps;
      roleStats.totalAffinity += stats.totalAffinity;
      const byId = new Map(roles.map((r) => [r.playerId, r]));
      return {
        index: ti,
        color: TEAM_COLORS[ti % TEAM_COLORS.length],
        sum: sums[ti],
        avg: Math.round((sums[ti] / members.length) * 10) / 10,
        players: members.map((p) => ({
          id: p.id, name: p.name, color: p.color,
          level: Rating.level(p, game),
          strength: strengths[index.get(p.id)],
          role: byId.get(p.id).role,
          affinity: byId.get(p.id).affinity,
        })),
      };
    });

    return {
      method: usedMethod,
      algorithm: algo.describe(),
      deviation: Math.round(deviation * 100) / 100,
      baseline: this.baseline(strengths, teamCount, sizes),
      teams: resultTeams,
      stats: { ...out.stats, roleSteps: roleStats.steps, roleAffinity: roleStats.totalAffinity },
    };
  }

  /** Abaterea medie a 300 de împărțiri la întâmplare, ca termen de comparație. */
  baseline(strengths, k, sizes) {
    const n = strengths.length;
    const mean = strengths.reduce((a, b) => a + b, 0) / n;
    let seed = 12345;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const trials = 300;
    let acc = 0;
    for (let t = 0; t < trials; t++) {
      const arr = strengths.slice();
      for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
      let pos = 0;
      let worst = 0;
      for (let ti = 0; ti < k; ti++) {
        let s = 0;
        for (let q = 0; q < sizes[ti]; q++) s += arr[pos++];
        worst = Math.max(worst, Math.abs(s - sizes[ti] * mean));
      }
      acc += worst;
    }
    return Math.round((acc / trials) * 100) / 100;
  }
}

module.exports = TeamService;
