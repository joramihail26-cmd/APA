'use strict';
/**
 * Cadru de testare pentru algoritmi: fiecare algoritm este comparat cu o
 * soluție de forță brută pe instanțe aleatoare (generator cu sămânță fixă).
 * Rulare: npm test
 */
const { test } = require('node:test');
const assert = require('node:assert');
const { runSuite } = require('../src/services/SelfTest');

const report = runSuite();
for (const group of report.groups) {
  test(group.name, () => {
    const failed = group.cases.filter((c) => !c.ok);
    assert.strictEqual(failed.length, 0, failed.map((f) => `${f.label}: ${f.detail}`).join('\n'));
  });
}
