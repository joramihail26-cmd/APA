'use strict';
const Algorithm = require('./Algorithm');

/**
 * Programarea meciurilor cu metoda cercului: fiecare echipă joacă cu fiecare
 * în exact (k-1) etape, fără ca o echipă să apară de două ori într-o etapă.
 */
class RoundRobin extends Algorithm {
  constructor() {
    super('Round-robin (metoda cercului)', 'O(k²)');
  }

  solve(k, cycles = 1) {
    const teams = Array.from({ length: k }, (_, i) => i);
    if (k % 2 === 1) teams.push(-1); // pauză
    const m = teams.length;
    const rounds = [];
    let arr = teams.slice();
    for (let r = 0; r < m - 1; r++) {
      const matches = [];
      for (let i = 0; i < m / 2; i++) {
        const a = arr[i];
        const b = arr[m - 1 - i];
        if (a !== -1 && b !== -1) matches.push(a < b ? [a, b] : [b, a]);
      }
      rounds.push(matches);
      arr = [arr[0], arr[m - 1], ...arr.slice(1, m - 1)];
    }
    const all = [];
    for (let c = 0; c < cycles; c++) {
      rounds.forEach((matches, r) => {
        matches.forEach(([a, b]) => {
          // la ciclurile impare se inversează gazdele
          all.push(c % 2 === 0 ? { round: c * rounds.length + r + 1, a, b } : { round: c * rounds.length + r + 1, a: b, b: a });
        });
      });
    }
    return { result: { matches: all }, stats: { rounds: rounds.length * cycles } };
  }
}

module.exports = RoundRobin;
