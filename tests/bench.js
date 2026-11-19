'use strict';
// Măsoară timpii algoritmilor pe date aleatoare. Rulare: npm run bench
const { Hungarian, BitmaskPartition, BranchAndBound, Knapsack } = require('../src/algorithms');

const rnd = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
const strengths = (n) => Array.from({ length: n }, () => rnd(20, 100));
const median = (f, reps = 5) => { const t = []; for (let i = 0; i < reps; i++) t.push(f()); return t.sort((a, b) => a - b)[Math.floor(reps / 2)]; };

console.log('Bitmask DP');
for (const [n, k] of [[8, 2], [10, 2], [12, 3], [14, 3], [16, 4], [18, 3]]) {
  const ms = median(() => new BitmaskPartition().run(strengths(n), k).stats.ms);
  console.log(`  n=${n} k=${k}: ${ms} ms`);
}
console.log('Branch and Bound (1 regulă separate)');
for (const [n, k] of [[8, 2], [12, 3], [16, 4], [20, 4]]) {
  const ms = median(() => new BranchAndBound().run(strengths(n), k, [{ type: 'separate', a: 0, b: 1 }]).stats.ms);
  console.log(`  n=${n} k=${k}: ${ms} ms`);
}
console.log('Hungarian');
for (const n of [10, 50, 100, 200]) {
  const cost = Array.from({ length: n }, () => Array.from({ length: n }, () => rnd(0, 99)));
  console.log(`  ${n}x${n}: ${median(() => new Hungarian().run(cost).stats.ms)} ms`);
}
console.log('Rucsac');
for (const [g, c] of [[10, 72], [50, 288], [200, 1000]]) {
  const items = Array.from({ length: g }, () => ({ weight: rnd(3, 12), value: rnd(10, 100) }));
  console.log(`  ${g} jocuri, ${c} unități: ${median(() => new Knapsack().run(items, c).stats.ms)} ms`);
}
