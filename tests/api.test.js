'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { openDatabase } = require('../src/db');
const { createApp } = require('../src/app');

let server;
let base;
before(async () => {
  const app = createApp(openDatabase(':memory:'));
  await new Promise((r) => { server = app.listen(0, r); });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

const call = async (method, url, body) => {
  const res = await fetch(base + url, { method, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : null };
};

test('flux complet: jucători, niveluri, echipe, scor, câștigător', async () => {
  assert.strictEqual((await call('POST', '/api/demo')).data.added, 8);
  const players = (await call('GET', '/api/players')).data;
  const games = (await call('GET', '/api/games')).data;
  assert.strictEqual(players.length, 8);
  assert.ok(games.length >= 8);

  // validări
  assert.strictEqual((await call('POST', '/api/players', { name: 'a' })).status, 400);
  assert.strictEqual((await call('POST', '/api/players', { name: 'ana' })).status, 409);
  assert.strictEqual((await call('PUT', `/api/players/${players[0].id}/levels`, { levels: { [games[0].id]: 9 } })).status, 400);

  // nivel
  const lv = await call('PUT', `/api/players/${players[0].id}/levels`, { levels: { [games[0].id]: 5 } });
  assert.strictEqual(lv.data.levels[games[0].id], 5);

  // propunere Bitmask DP
  const ids = players.map((p) => p.id);
  const prop = (await call('POST', '/api/propose', { playerIds: ids, gameId: games[0].id, teamCount: 2 })).data;
  assert.strictEqual(prop.method, 'balanced');
  assert.strictEqual(prop.teams.length, 2);
  assert.ok(prop.deviation <= prop.baseline);

  // restricții (Branch and Bound)
  const cons = await call('POST', '/api/propose', {
    playerIds: ids, gameId: games[0].id, teamCount: 2,
    constraints: [{ type: 'separate', a: ids[0], b: ids[1] }, { type: 'together', a: ids[2], b: ids[3] }],
  });
  assert.strictEqual(cons.data.method, 'constrained');
  const where = {};
  cons.data.teams.forEach((t) => t.players.forEach((p) => { where[p.id] = t.index; }));
  assert.notStrictEqual(where[ids[0]], where[ids[1]]);
  assert.strictEqual(where[ids[2]], where[ids[3]]);

  // restricții imposibile
  const bad = await call('POST', '/api/propose', {
    playerIds: ids.slice(0, 4), gameId: games[0].id, teamCount: 2,
    constraints: [{ type: 'together', a: ids[0], b: ids[1] }, { type: 'together', a: ids[1], b: ids[2] }, { type: 'together', a: ids[2], b: ids[3] }],
  });
  assert.strictEqual(bad.status, 422);

  // seară
  const body = {
    gameId: games[0].id, method: 'balanced', cycles: 1,
    teams: prop.teams.map((t, i) => ({ name: `Echipa ${'AB'[i]}`, color: t.color, players: t.players.map((p) => ({ id: p.id, role: p.role })) })),
  };
  const s = (await call('POST', '/api/sessions', body)).data;
  assert.strictEqual(s.matches.length, 1);
  assert.strictEqual((await call('POST', `/api/sessions/${s.id}/finish`)).status, 400);
  await call('PUT', `/api/sessions/${s.id}/matches/0`, { sa: 7, sb: 4, done: true });
  const fin = (await call('POST', `/api/sessions/${s.id}/finish`)).data;
  assert.strictEqual(fin.status, 'finished');
  assert.deepStrictEqual(fin.result.winners, [0]);
  assert.match(fin.result.message, /Echipa A câștigă/);
  assert.strictEqual((await call('PUT', `/api/sessions/${s.id}/matches/0`, { sa: 1, sb: 1, done: true })).status, 400);

  const st = (await call('GET', '/api/stats')).data;
  assert.strictEqual(st.sessions, 1);
  assert.ok(st.players.some((p) => p.wins === 1));

  // planificator
  const plan = (await call('POST', '/api/plan', { playerIds: ids, minutes: 120 })).data;
  assert.ok(plan.totalMinutes <= 120 && plan.chosen.length > 0);
});

test('autotest algoritmi prin API', async () => {
  const r = (await call('GET', '/api/selftest')).data;
  assert.strictEqual(r.passed, r.total);
});
