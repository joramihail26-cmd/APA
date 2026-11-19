'use strict';

const NAMES = [
  'Vulpile Roșii', 'Lupii Nopții', 'Bufnițele', 'Tigrii de Hârtie', 'Cocoșii Gălăgioși', 'Ursuleții Zâmbăreți',
  'Racheta', 'Fulgerele', 'Pisicile Turbate', 'Vidrele', 'Zimbrii', 'Șoimii', 'Castorii', 'Bursucii',
  'Ariciii Veseli', 'Piticii Mari', 'Tornada', 'Cartofii Prăjiți', 'Pinguinii', 'Dragonii Mici',
];

function pick(count) {
  const pool = NAMES.slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

module.exports = { pick };
