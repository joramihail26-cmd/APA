'use strict';
const Algorithm = require('./Algorithm');
const BitmaskPartition = require('./BitmaskPartition');

/**
 * Branch and Bound pentru formarea echipelor cu restricții stricte:
 *   - { type: 'separate', a, b }  jucătorii a și b nu pot fi în aceeași echipă
 *   - { type: 'together', a, b }  jucătorii a și b trebuie să fie împreună
 *   - { type: 'team', a, team }   jucătorul a trebuie să fie în echipa indicată
 *
 * Se așază jucătorii (în ordinea descrescătoare a puterii) pe echipe. O ramură
 * este tăiată când:
 *   1. încalcă o restricție sau capacitatea unei echipe;
 *   2. limita inferioară a abaterii (depășirea țintei de către o echipă
 *      sau imposibilitatea de a o completa) nu mai poate bate cel mai bun
 *      rezultat găsit.
 * Rezultatul este optim în raport cu aceeași funcție de cost ca la Bitmask DP.
 */
class BranchAndBound extends Algorithm {
  constructor() {
    super('Branch and Bound (restricții stricte)', 'O(kⁿ) în cel mai rău caz, practic mult mai mic datorită tăierilor');
    this.MAX_PLAYERS = 24;
    this.NODE_LIMIT = 8_000_000;
  }

  /**
   * @param {number[]} strengths
   * @param {number} k
   * @param {object[]} constraints restricții pe indici de jucători (0..n-1)
   */
  solve(strengths, k, constraints = []) {
    const n = strengths.length;
    if (k < 2) throw new Error('Sunt necesare cel puțin 2 echipe');
    if (n < k) throw new Error('Sunt mai multe echipe decât jucători');
    if (n > this.MAX_PLAYERS) throw new Error(`Maximum ${this.MAX_PLAYERS} jucători`);

    const sizes = BitmaskPartition.teamSizes(n, k);
    const total = strengths.reduce((a, b) => a + b, 0);
    const mean = total / n;
    const target = sizes.map((s) => s * mean);

    // pre-procesare restricții
    const separate = Array.from({ length: n }, () => []);
    const together = Array.from({ length: n }, () => []);
    const fixed = new Array(n).fill(-1);
    for (const c of constraints) {
      if (c.type === 'separate') { separate[c.a].push(c.b); separate[c.b].push(c.a); }
      else if (c.type === 'together') { together[c.a].push(c.b); together[c.b].push(c.a); }
      else if (c.type === 'team') {
        if (c.team < 0 || c.team >= k) return infeasible(`Echipa ${c.team + 1} nu există`);
        if (fixed[c.a] !== -1 && fixed[c.a] !== c.team) return infeasible('Un jucător este fixat în două echipe diferite');
        fixed[c.a] = c.team;
      }
    }
    const hasFixed = fixed.some((x) => x !== -1);

    // verificare rapidă: grupurile "împreună" nu pot depăși cea mai mare echipă
    const comp = components(n, together);
    const maxSize = Math.max(...sizes);
    for (const g of comp) if (g.length > maxSize) return infeasible('Un grup de jucători care trebuie să fie împreună este mai mare decât o echipă');

    // ordinea de procesare: jucătorii cu restricții fixe primii, apoi după putere
    const order = [...Array(n).keys()].sort((x, y) => {
      if ((fixed[y] !== -1) !== (fixed[x] !== -1)) return fixed[y] !== -1 ? 1 : -1;
      return strengths[y] - strengths[x] || x - y;
    });
    const assign = new Array(n).fill(-1);
    const sums = new Array(k).fill(0);
    const counts = new Array(k).fill(0);
    let bestVal = Infinity;
    let bestAssign = null;
    let nodes = 0;
    let pruned = 0;
    let aborted = false;

    const lowerBound = (depth) => {
      let maxLeft = 0;
      for (let i = depth; i < n; i++) if (strengths[order[i]] > maxLeft) maxLeft = strengths[order[i]];
      let lb = 0;
      for (let t = 0; t < k; t++) {
        // suma crește doar, deci depășirea țintei de acum rămâne în soluția finală
        const over = sums[t] - target[t];
        if (over > lb) lb = over;
        // o echipă incompletă nu poate primi mai mult de free * (cel mai puternic rămas)
        const free = sizes[t] - counts[t];
        if (free > 0) {
          const under = target[t] - (sums[t] + free * maxLeft);
          if (under > lb) lb = under;
        }
      }
      return lb;
    };

    const canPlace = (p, t) => {
      if (counts[t] >= sizes[t]) return false;
      if (fixed[p] !== -1 && fixed[p] !== t) return false;
      for (const q of separate[p]) if (assign[q] === t) return false;
      for (const q of together[p]) if (assign[q] !== -1 && assign[q] !== t) return false;
      // un jucător legat prin "team" de o altă echipă nu poate fi pus împreună cu cineva fixat altundeva
      for (const q of together[p]) if (fixed[q] !== -1 && fixed[q] !== t) return false;
      return true;
    };

    const dfs = (depth) => {
      if (aborted) return;
      nodes++;
      if (nodes > this.NODE_LIMIT) { aborted = true; return; }
      if (depth === n) {
        let val = 0;
        for (let t = 0; t < k; t++) val = Math.max(val, Math.abs(sums[t] - target[t]));
        if (val < bestVal) { bestVal = val; bestAssign = assign.slice(); }
        return;
      }
      if (lowerBound(depth) >= bestVal) { pruned++; return; }

      const p = order[depth];
      // fără simetrie, echipele de aceeași dimensiune sunt interschimbabile:
      // deschidem doar prima echipă goală de fiecare dimensiune
      const tried = new Set();
      for (let t = 0; t < k; t++) {
        if (!hasFixed && counts[t] === 0) {
          if (tried.has(sizes[t])) continue;
          tried.add(sizes[t]);
        }
        if (!canPlace(p, t)) continue;
        assign[p] = t; sums[t] += strengths[p]; counts[t]++;
        dfs(depth + 1);
        assign[p] = -1; sums[t] -= strengths[p]; counts[t]--;
      }
    };

    dfs(0);

    if (!bestAssign) {
      return infeasible(aborted ? 'Căutarea a depășit limita de timp' : 'Restricțiile nu pot fi respectate simultan', { nodes, pruned });
    }
    const teams = Array.from({ length: k }, () => []);
    bestAssign.forEach((t, i) => teams[t].push(i));
    const tsums = teams.map((tm) => tm.reduce((a, i) => a + strengths[i], 0));
    return {
      result: { feasible: true, teams, deviation: bestVal, sums: tsums },
      stats: { nodes, pruned, sizes, aborted },
    };
  }
}

function infeasible(reason, stats = {}) {
  return { result: { feasible: false, reason, teams: [], sums: [], deviation: null }, stats };
}

/** Componentele conexe ale relației "împreună". */
function components(n, adj) {
  const seen = new Array(n).fill(false);
  const out = [];
  for (let i = 0; i < n; i++) {
    if (seen[i]) continue;
    const stack = [i];
    const g = [];
    seen[i] = true;
    while (stack.length) {
      const x = stack.pop();
      g.push(x);
      for (const y of adj[x]) if (!seen[y]) { seen[y] = true; stack.push(y); }
    }
    out.push(g);
  }
  return out;
}

module.exports = BranchAndBound;
