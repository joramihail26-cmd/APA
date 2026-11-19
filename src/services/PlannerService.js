'use strict';
const { Knapsack } = require('../algorithms');
const Rating = require('./Rating');

const UNIT = 5; // minute

/** Alege jocurile care încap în timpul serii, cu satisfacție maximă pentru grupul prezent. */
class PlannerService {
  constructor() {
    this.knapsack = new Knapsack();
  }

  plan({ players, games, minutes }) {
    const n = players.length;
    const eligible = [];
    const excluded = [];
    for (const g of games) {
      if (n < g.min_players) excluded.push({ id: g.id, name: g.name, emoji: g.emoji, reason: `are nevoie de cel puțin ${g.min_players} jucători` });
      else if (n > g.max_players) excluded.push({ id: g.id, name: g.name, emoji: g.emoji, reason: `se joacă cu cel mult ${g.max_players} jucători` });
      else if (g.duration > minutes) excluded.push({ id: g.id, name: g.name, emoji: g.emoji, reason: 'durează mai mult decât timpul ales' });
      else eligible.push(g);
    }
    const info = eligible.map((g) => {
      const avg = players.reduce((a, p) => a + Rating.level(p, g), 0) / Math.max(1, n);
      return { game: g, avgLevel: Math.round(avg * 10) / 10, value: Math.round(g.fun * 10 * (0.6 + (0.4 * avg) / 5)) };
    });
    const items = info.map((x) => ({ weight: Math.ceil(x.game.duration / UNIT), value: x.value }));
    const { result, stats } = this.knapsack.run(items, Math.floor(minutes / UNIT));
    const chosen = result.chosen.map((i) => ({
      id: info[i].game.id, name: info[i].game.name, emoji: info[i].game.emoji,
      duration: info[i].game.duration, fun: info[i].game.fun, avgLevel: info[i].avgLevel, value: info[i].value,
    })).sort((a, b) => a.fun - b.fun || a.duration - b.duration);
    const notPicked = info.filter((_, i) => !result.chosen.includes(i)).map((x) => ({
      id: x.game.id, name: x.game.name, emoji: x.game.emoji, reason: 'nu mai încape în timp alături de celelalte',
    }));
    return {
      algorithm: this.knapsack.describe(),
      chosen,
      skipped: [...notPicked, ...excluded],
      totalMinutes: chosen.reduce((a, c) => a + c.duration, 0),
      totalValue: result.value,
      stats,
    };
  }
}

module.exports = PlannerService;
