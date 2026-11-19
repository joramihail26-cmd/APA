'use strict';
const Algorithm = require('./Algorithm');

/**
 * Rucsac 0/1 cu programare dinamică, folosit la alegerea jocurilor care
 * încap în timpul disponibil al serii, cu satisfacție maximă pentru grup.
 */
class Knapsack extends Algorithm {
  constructor() {
    super('Rucsac 0/1 (planificarea serii)', 'O(g · T)');
  }

  /**
   * @param {{weight:number, value:number}[]} items weight = durată în unități
   * @param {number} capacity capacitate în aceleași unități
   */
  solve(items, capacity) {
    const g = items.length;
    const dp = Array.from({ length: g + 1 }, () => new Int32Array(capacity + 1));
    for (let i = 1; i <= g; i++) {
      const { weight, value } = items[i - 1];
      for (let c = 0; c <= capacity; c++) {
        dp[i][c] = dp[i - 1][c];
        if (weight <= c && dp[i - 1][c - weight] + value > dp[i][c]) dp[i][c] = dp[i - 1][c - weight] + value;
      }
    }
    const chosen = [];
    let c = capacity;
    for (let i = g; i >= 1; i--) {
      if (dp[i][c] !== dp[i - 1][c]) { chosen.push(i - 1); c -= items[i - 1].weight; }
    }
    chosen.reverse();
    return {
      result: { chosen, value: dp[g][capacity], used: chosen.reduce((a, i) => a + items[i].weight, 0) },
      stats: { cells: g * (capacity + 1) },
    };
  }
}

module.exports = Knapsack;
