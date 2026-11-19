'use strict';
const { TRAITS } = require('../validators');

const DEFAULT_LEVEL = 3;

/**
 * Calculează puterea și afinitatea unui jucător pentru un joc.
 *  - potrivirea cu un rol: media ponderată a trăsăturilor jucătorului (0..100)
 *  - afinitate = 50% potrivire + 50% nivelul declarat la joc (1..5 -> 20..100)
 *  - putere (pentru echilibrarea echipelor) = 70% nivel + 30% cea mai bună potrivire
 */
class Rating {
  static level(player, game) {
    return player.levels?.[game.id] ?? DEFAULT_LEVEL;
  }

  static fit(player, weights) {
    let num = 0;
    let den = 0;
    for (const t of TRAITS) {
      const w = weights[t] ?? 0;
      num += w * player[t];
      den += w;
    }
    return den === 0 ? 50 : (100 * num) / (den * 10);
  }

  static affinity(player, game, weights) {
    return Math.round(0.5 * Rating.fit(player, weights) + 0.5 * Rating.level(player, game) * 20);
  }

  static strength(player, game) {
    const bestFit = Math.max(...game.roles.map((r) => Rating.fit(player, r.weights)));
    return Math.round(0.7 * Rating.level(player, game) * 20 + 0.3 * bestFit);
  }
}

module.exports = Rating;
