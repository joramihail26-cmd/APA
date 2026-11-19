'use strict';

const DEMO = [
  ['Ana', [6, 8, 7, 9]], ['Mihai', [9, 5, 6, 6]], ['Cristina', [7, 9, 5, 8]], ['Vlad', [5, 6, 9, 5]],
  ['Elena', [8, 7, 6, 7]], ['Andrei', [6, 4, 8, 6]], ['Dana', [7, 8, 7, 9]], ['Radu', [9, 6, 5, 4]],
];

/** Adaugă jucători de probă cu niveluri variate, ca să se poată testa aplicația rapid. */
function seedDemo(playerRepo, gameRepo) {
  const games = gameRepo.list();
  const existing = new Set(playerRepo.list().map((p) => p.name.toLowerCase()));
  let seed = 7;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  let added = 0;
  for (const [name, [strategy, creativity, speed, social]] of DEMO) {
    if (existing.has(name.toLowerCase())) continue;
    const levels = {};
    for (const g of games) levels[g.id] = 1 + Math.floor(rnd() * 5);
    playerRepo.create({ name, strategy, creativity, speed, social, levels });
    added++;
  }
  return added;
}

module.exports = { seedDemo };
