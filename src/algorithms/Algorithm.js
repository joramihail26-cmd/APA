'use strict';

/**
 * Clasa de bază pentru toți algoritmii exacți din aplicație.
 * Fiecare algoritm își declară numele și complexitatea, iar metoda
 * run() returnează rezultatul împreună cu statistici de execuție.
 */
class Algorithm {
  constructor(name, complexity) {
    this.name = name;
    this.complexity = complexity;
  }

  /** Implementat de clasele derivate. Returnează { result, stats }. */
  solve() {
    throw new Error('solve() trebuie implementat');
  }

  run(...args) {
    const start = process.hrtime.bigint();
    const out = this.solve(...args);
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    return { ...out, stats: { ...(out.stats || {}), ms: Math.round(ms * 100) / 100 } };
  }

  describe() {
    return { name: this.name, complexity: this.complexity };
  }
}

module.exports = Algorithm;
