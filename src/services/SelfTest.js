'use strict';
const { Hungarian, BitmaskPartition, BranchAndBound, Knapsack, RoundRobin } = require('../algorithms');

/** Generator pseudo-aleator determinist (mulberry32), pentru teste reproductibile. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const ri = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));

// ---------- referințe de forță brută ----------
function bruteAssignment(cost) {
  const n = cost.length, m = cost[0].length;
  let best = Infinity;
  const used = new Array(m).fill(false);
  (function rec(i, acc) {
    if (acc >= best) return;
    if (i === n) { best = acc; return; }
    for (let j = 0; j < m; j++) if (!used[j]) { used[j] = true; rec(i + 1, acc + cost[i][j]); used[j] = false; }
  })(0, 0);
  return best;
}

function brutePartition(str, k, constraints = []) {
  const n = str.length;
  const sizes = BitmaskPartition.teamSizes(n, k);
  const mean = str.reduce((a, b) => a + b, 0) / n;
  let best = Infinity;
  const assign = new Array(n).fill(-1);
  const counts = new Array(k).fill(0);
  const sums = new Array(k).fill(0);
  const ok = () => constraints.every((c) => {
    if (c.type === 'separate') return assign[c.a] !== assign[c.b];
    if (c.type === 'together') return assign[c.a] === assign[c.b];
    return assign[c.a] === c.team;
  });
  (function rec(i) {
    if (i === n) {
      if (!ok()) return;
      let v = 0;
      for (let t = 0; t < k; t++) v = Math.max(v, Math.abs(sums[t] - sizes[t] * mean));
      if (v < best) best = v;
      return;
    }
    for (let t = 0; t < k; t++) {
      if (counts[t] >= sizes[t]) continue;
      assign[i] = t; counts[t]++; sums[t] += str[i];
      rec(i + 1);
      assign[i] = -1; counts[t]--; sums[t] -= str[i];
    }
  })(0);
  return best;
}

function bruteKnapsack(items, cap) {
  let best = 0;
  for (let mask = 0; mask < 1 << items.length; mask++) {
    let w = 0, v = 0;
    for (let i = 0; i < items.length; i++) if (mask & (1 << i)) { w += items[i].weight; v += items[i].value; }
    if (w <= cap && v > best) best = v;
  }
  return best;
}

const near = (a, b) => Math.abs(a - b) < 1e-6;

function runSuite() {
  const groups = [];

  // Hungarian
  {
    const cases = [];
    const r = rng(11);
    const algo = new Hungarian();
    for (let t = 0; t < 40; t++) {
      const n = ri(r, 1, 6), m = ri(r, n, 7);
      const cost = Array.from({ length: n }, () => Array.from({ length: m }, () => ri(r, 0, 99)));
      const got = algo.run(cost).result;
      const want = bruteAssignment(cost);
      const distinct = new Set(got.assignment).size === n;
      cases.push({ label: `matrice ${n}x${m} #${t + 1}`, ok: near(got.total, want) && distinct, detail: `obținut ${got.total}, așteptat ${want}` });
    }
    groups.push({ name: 'Kuhn-Munkres comparat cu forța brută', cases });
  }

  // Bitmask DP
  {
    const cases = [];
    const r = rng(22);
    const algo = new BitmaskPartition();
    for (let t = 0; t < 40; t++) {
      const n = ri(r, 4, 9), k = ri(r, 2, Math.min(4, n));
      const str = Array.from({ length: n }, () => ri(r, 10, 100));
      const got = algo.run(str, k).result;
      const want = brutePartition(str, k);
      const covers = got.teams.flat().sort((a, b) => a - b).join() === [...Array(n).keys()].join();
      cases.push({ label: `n=${n}, k=${k} #${t + 1}`, ok: near(got.deviation, want) && covers, detail: `obținut ${got.deviation}, așteptat ${want}` });
    }
    groups.push({ name: 'Bitmask DP comparat cu forța brută', cases });
  }

  // Branch and Bound
  {
    const cases = [];
    const r = rng(33);
    const algo = new BranchAndBound();
    for (let t = 0; t < 60; t++) {
      const n = ri(r, 4, 9), k = ri(r, 2, Math.min(3, n));
      const str = Array.from({ length: n }, () => ri(r, 10, 100));
      const cons = [];
      const cnt = ri(r, 0, 3);
      for (let c = 0; c < cnt; c++) {
        const a = ri(r, 0, n - 1);
        let b = ri(r, 0, n - 1);
        if (a === b) b = (a + 1) % n;
        const kind = ri(r, 0, 2);
        cons.push(kind === 0 ? { type: 'separate', a, b } : kind === 1 ? { type: 'together', a, b } : { type: 'team', a, team: ri(r, 0, k - 1) });
      }
      const got = algo.run(str, k, cons).result;
      const want = brutePartition(str, k, cons);
      const okv = want === Infinity ? got.feasible === false : got.feasible && near(got.deviation, want);
      let okc = true;
      if (got.feasible) {
        const where = new Array(n);
        got.teams.forEach((tm, ti) => tm.forEach((p) => { where[p] = ti; }));
        okc = cons.every((c) => (c.type === 'separate' ? where[c.a] !== where[c.b] : c.type === 'together' ? where[c.a] === where[c.b] : where[c.a] === c.team));
      }
      cases.push({ label: `n=${n}, k=${k}, ${cons.length} restricții #${t + 1}`, ok: okv && okc, detail: `obținut ${got.deviation}, așteptat ${want}` });
    }
    // fără restricții trebuie să coincidă cu Bitmask DP
    const bm = new BitmaskPartition();
    for (let t = 0; t < 10; t++) {
      const n = ri(r, 8, 12), k = ri(r, 2, 4);
      const str = Array.from({ length: n }, () => ri(r, 10, 100));
      const a = algo.run(str, k, []).result.deviation;
      const b = bm.run(str, k).result.deviation;
      cases.push({ label: `B&B = Bitmask DP, n=${n}, k=${k} #${t + 1}`, ok: near(a, b), detail: `${a} vs ${b}` });
    }
    groups.push({ name: 'Branch and Bound comparat cu forța brută și cu Bitmask DP', cases });
  }

  // Rucsac
  {
    const cases = [];
    const r = rng(44);
    const algo = new Knapsack();
    for (let t = 0; t < 30; t++) {
      const g = ri(r, 1, 10);
      const items = Array.from({ length: g }, () => ({ weight: ri(r, 1, 12), value: ri(r, 1, 50) }));
      const cap = ri(r, 3, 40);
      const got = algo.run(items, cap).result;
      const want = bruteKnapsack(items, cap);
      const weightOk = got.used <= cap;
      cases.push({ label: `${g} obiecte, capacitate ${cap} #${t + 1}`, ok: got.value === want && weightOk, detail: `obținut ${got.value}, așteptat ${want}` });
    }
    groups.push({ name: 'Rucsac DP comparat cu forța brută', cases });
  }

  // Round robin
  {
    const cases = [];
    const algo = new RoundRobin();
    for (let k = 2; k <= 8; k++) {
      const { matches } = algo.run(k, 1).result;
      const pairs = new Set(matches.map((m) => [Math.min(m.a, m.b), Math.max(m.a, m.b)].join('-')));
      const perRound = {};
      let clash = false;
      for (const m of matches) {
        perRound[m.round] = perRound[m.round] || new Set();
        if (perRound[m.round].has(m.a) || perRound[m.round].has(m.b)) clash = true;
        perRound[m.round].add(m.a); perRound[m.round].add(m.b);
      }
      cases.push({ label: `${k} echipe`, ok: matches.length === (k * (k - 1)) / 2 && pairs.size === matches.length && !clash, detail: `${matches.length} meciuri` });
    }
    groups.push({ name: 'Round-robin: fiecare pereche o singură dată, fără suprapuneri', cases });
  }

  const total = groups.reduce((a, g) => a + g.cases.length, 0);
  const passed = groups.reduce((a, g) => a + g.cases.filter((c) => c.ok).length, 0);
  return { groups, total, passed };
}

module.exports = { runSuite };
