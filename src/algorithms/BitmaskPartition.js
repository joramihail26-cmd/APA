'use strict';
const Algorithm = require('./Algorithm');

const popcount = (x) => { let c = 0; while (x) { x &= x - 1; c++; } return c; };

/**
 * Partiționare echilibrată cu programare dinamică pe măști de biți.
 * Starea dp[mask] = abaterea minimă (maximul abaterilor echipelor deja formate)
 * pentru a așeza jucătorii din mask în primele echipe. Echipa curentă se
 * deduce din popcount(mask), deci memoria este O(2^n).
 *
 * Abaterea unei echipe = |suma ei - dimensiune * media jucătorilor|.
 * Se minimizează abaterea maximă, deci soluția este optimă exact.
 */
class BitmaskPartition extends Algorithm {
  constructor() {
    super('Bitmask DP (partiționare echilibrată)', 'O(3ⁿ) timp, O(2ⁿ) memorie');
    this.MAX_PLAYERS = 18;
  }

  /** Dimensiunile echipelor: primele (n mod k) echipe primesc un jucător în plus. */
  static teamSizes(n, k) {
    const base = Math.floor(n / k);
    const extra = n % k;
    return Array.from({ length: k }, (_, i) => base + (i < extra ? 1 : 0));
  }

  /**
   * @param {number[]} strengths puterea fiecărui jucător
   * @param {number} k numărul de echipe
   * @returns {{result:{teams:number[][], deviation:number, sums:number[]}, stats:object}}
   */
  solve(strengths, k) {
    const n = strengths.length;
    if (k < 2) throw new Error('Sunt necesare cel puțin 2 echipe');
    if (n < k) throw new Error('Sunt mai multe echipe decât jucători');
    if (n > this.MAX_PLAYERS) throw new Error(`Maximum ${this.MAX_PLAYERS} jucători pentru partiționarea exactă`);

    const sizes = BitmaskPartition.teamSizes(n, k);
    const full = (1 << n) - 1;
    const total = strengths.reduce((a, b) => a + b, 0);
    const mean = total / n;

    // sume parțiale pentru fiecare mască (calculate incremental)
    const sum = new Int32Array(1 << n);
    for (let mask = 1; mask <= full; mask++) {
      const low = mask & -mask;
      sum[mask] = sum[mask ^ low] + strengths[31 - Math.clz32(low)];
    }

    // prefixele dimensiunilor: boundary[t] = câți jucători sunt deja așezați înaintea echipei t
    const boundary = [0];
    for (const s of sizes) boundary.push(boundary[boundary.length - 1] + s);
    const teamAt = new Map();
    boundary.forEach((b, t) => teamAt.set(b, t));

    const memo = new Map();
    const choice = new Map();
    let states = 0;

    // rest = masca jucătorilor încă neașezați
    const best = (rest) => {
      const placed = n - popcount(rest);
      const t = teamAt.get(placed);
      if (t === k - 1) {
        // ultima echipă primește tot ce a rămas
        return Math.abs(sum[rest] - sizes[t] * mean);
      }
      if (memo.has(rest)) return memo.get(rest);
      states++;
      // dacă toate echipele rămase au aceeași dimensiune, ele sunt interschimbabile:
      // forțăm cel mai mic jucător rămas în echipa curentă (elimină simetria)
      let sym = true;
      for (let j = t + 1; j < k; j++) if (sizes[j] !== sizes[t]) { sym = false; break; }
      const lowBit = rest & -rest;
      let bestVal = Infinity;
      let bestSub = 0;
      for (let sub = rest; sub; sub = (sub - 1) & rest) {
        if (popcount(sub) !== sizes[t]) continue;
        if (sym && !(sub & lowBit)) continue;
        const dev = Math.abs(sum[sub] - sizes[t] * mean);
        if (dev >= bestVal) continue;
        const val = Math.max(dev, best(rest ^ sub));
        if (val < bestVal) { bestVal = val; bestSub = sub; }
      }
      memo.set(rest, bestVal);
      choice.set(rest, bestSub);
      return bestVal;
    };

    const deviation = best(full);

    const teams = [];
    let rest = full;
    for (let t = 0; t < k - 1; t++) {
      const sub = choice.get(rest);
      teams.push(maskToList(sub, n));
      rest ^= sub;
    }
    teams.push(maskToList(rest, n));
    const sums = teams.map((tm) => tm.reduce((a, i) => a + strengths[i], 0));
    return { result: { teams, deviation, sums }, stats: { states, sizes } };
  }
}

function maskToList(mask, n) {
  const out = [];
  for (let i = 0; i < n; i++) if (mask & (1 << i)) out.push(i);
  return out;
}

module.exports = BitmaskPartition;
