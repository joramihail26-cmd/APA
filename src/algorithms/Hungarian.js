'use strict';
const Algorithm = require('./Algorithm');

/**
 * Algoritmul Kuhn-Munkres (metoda ungară) cu potențiale, O(n^2 * m).
 * Rezolvă problema de atribuire: n jucători pe m >= n roluri, astfel încât
 * costul total să fie minim. Pentru maximizare se transformă costul în
 * (max - afinitate).
 */
class Hungarian extends Algorithm {
  constructor() {
    super('Kuhn-Munkres (Hungarian)', 'O(n² · m)');
  }

  /**
   * @param {number[][]} cost matrice n x m, n <= m
   * @returns {{result:{assignment:number[], total:number}, stats:object}}
   *   assignment[i] = coloana atribuită rândului i
   */
  solve(cost) {
    const n = cost.length;
    if (n === 0) return { result: { assignment: [], total: 0 }, stats: { steps: 0 } };
    const m = cost[0].length;
    if (n > m) throw new Error('Hungarian: numărul de rânduri trebuie să fie <= numărul de coloane');

    const INF = Number.POSITIVE_INFINITY;
    const u = new Array(n + 1).fill(0);
    const v = new Array(m + 1).fill(0);
    const p = new Array(m + 1).fill(0); // p[j] = rândul atribuit coloanei j
    const way = new Array(m + 1).fill(0);
    let steps = 0;

    for (let i = 1; i <= n; i++) {
      p[0] = i;
      let j0 = 0;
      const minv = new Array(m + 1).fill(INF);
      const used = new Array(m + 1).fill(false);
      do {
        used[j0] = true;
        const i0 = p[j0];
        let delta = INF;
        let j1 = 0;
        for (let j = 1; j <= m; j++) {
          if (used[j]) continue;
          steps++;
          const cur = cost[i0 - 1][j - 1] - u[i0] - v[j];
          if (cur < minv[j]) { minv[j] = cur; way[j] = j0; }
          if (minv[j] < delta) { delta = minv[j]; j1 = j; }
        }
        for (let j = 0; j <= m; j++) {
          if (used[j]) { u[p[j]] += delta; v[j] -= delta; } else { minv[j] -= delta; }
        }
        j0 = j1;
      } while (p[j0] !== 0);
      do {
        const j1 = way[j0];
        p[j0] = p[j1];
        j0 = j1;
      } while (j0);
    }

    const assignment = new Array(n).fill(-1);
    for (let j = 1; j <= m; j++) if (p[j]) assignment[p[j] - 1] = j - 1;
    let total = 0;
    for (let i = 0; i < n; i++) total += cost[i][assignment[i]];
    return { result: { assignment, total }, stats: { steps } };
  }
}

module.exports = Hungarian;
