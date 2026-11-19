'use strict';
const { Hungarian } = require('../algorithms');
const Rating = require('./Rating');

const GENERIC = { name: 'Membru', weights: { strategy: 1, creativity: 1, speed: 1, social: 1 } };

/** Atribuie rolurile jocului jucătorilor unei echipe folosind algoritmul ungar. */
class RoleAssigner {
  constructor() {
    this.hungarian = new Hungarian();
  }

  /**
   * @returns {{ roles: {playerId:number, role:string, affinity:number}[], stats:object }}
   */
  assign(players, game) {
    const slots = [];
    for (const r of game.roles) for (let i = 0; i < r.count; i++) slots.push(r);
    while (slots.length < players.length) slots.push(GENERIC);

    // costul = 100 - afinitate, deoarece algoritmul minimizează
    const cost = players.map((p) => slots.map((s) => 100 - Rating.affinity(p, game, s.weights)));
    const { result, stats } = this.hungarian.run(cost);
    const roles = players.map((p, i) => {
      const slot = slots[result.assignment[i]];
      return { playerId: p.id, role: slot.name, affinity: 100 - cost[i][result.assignment[i]] };
    });
    return { roles, stats: { ...stats, totalAffinity: roles.reduce((a, r) => a + r.affinity, 0) } };
  }
}

module.exports = RoleAssigner;
