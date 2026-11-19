'use strict';
const path = require('path');
const express = require('express');
const compression = require('compression');

const { openDatabase } = require('./db');
const { HttpError, idList, intIn } = require('./validators');
const PlayerRepository = require('./repositories/PlayerRepository');
const GameRepository = require('./repositories/GameRepository');
const TeamService = require('./services/TeamService');
const PlannerService = require('./services/PlannerService');
const SessionService = require('./services/SessionService');
const StatsService = require('./services/StatsService');
const TeamNames = require('./services/TeamNames');
const { seedDemo } = require('./services/DemoData');
const { runSuite } = require('./services/SelfTest');
const algorithms = require('./algorithms');

const wrap = (fn) => (req, res, next) => {
  try {
    const out = fn(req, res);
    if (out !== undefined) res.json(out);
  } catch (e) { next(e); }
};

function createApp(db = openDatabase()) {
  const players = new PlayerRepository(db);
  const games = new GameRepository(db);
  const teamService = new TeamService();
  const planner = new PlannerService();
  const sessions = new SessionService(db, players, games);
  const stats = new StatsService(db, players, sessions);

  const app = express();
  app.disable('x-powered-by');
  app.use(compression());
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('Content-Security-Policy', "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; script-src 'self'; frame-ancestors 'none'");
    next();
  });
  app.use(express.json({ limit: '100kb' }));

  const id = (req) => intIn(req.params.id, 1, 1e9, 'Identificator');
  const pickPlayers = (rawIds) => {
    const ids = idList(rawIds, 'Jucători');
    return ids.map((i) => players.get(i));
  };

  // ---------- jucători ----------
  app.get('/api/players', wrap(() => players.list()));
  app.post('/api/players', wrap((req, res) => { res.status(201); return players.create(req.body || {}); }));
  app.put('/api/players/:id', wrap((req) => players.update(id(req), req.body || {})));
  app.put('/api/players/:id/levels', wrap((req) => players.setLevels(id(req), req.body?.levels)));
  app.delete('/api/players/:id', wrap((req, res) => { players.remove(id(req)); res.status(204).end(); }));
  app.post('/api/demo', wrap(() => ({ added: seedDemo(players, games) })));

  // ---------- jocuri ----------
  app.get('/api/games', wrap(() => games.list()));
  app.post('/api/games', wrap((req, res) => { res.status(201); return games.create(req.body || {}); }));
  app.delete('/api/games/:id', wrap((req, res) => { games.remove(id(req)); res.status(204).end(); }));

  // ---------- algoritmi ----------
  app.get('/api/team-names', wrap((req) => ({ names: TeamNames.pick(intIn(req.query.count ?? 2, 1, 8, 'Număr')) })));

  app.post('/api/propose', wrap((req) => {
    const b = req.body || {};
    return teamService.propose({
      players: pickPlayers(b.playerIds),
      game: games.get(Number(b.gameId)),
      teamCount: intIn(b.teamCount, 2, 8, 'Numărul de echipe'),
      constraints: Array.isArray(b.constraints) ? b.constraints.slice(0, 30) : [],
      method: b.method,
    });
  }));

  app.post('/api/plan', wrap((req) => {
    const b = req.body || {};
    return planner.plan({
      players: pickPlayers(b.playerIds),
      games: games.list(),
      minutes: intIn(b.minutes, 20, 600, 'Timpul (minute)'),
    });
  }));

  app.get('/api/algorithms', wrap(() => Object.values(algorithms).map((A) => new A().describe())));
  app.get('/api/selftest', wrap(() => {
    const t0 = Date.now();
    const r = runSuite();
    return { total: r.total, passed: r.passed, ms: Date.now() - t0, groups: r.groups.map((g) => ({ name: g.name, total: g.cases.length, passed: g.cases.filter((c) => c.ok).length })) };
  }));

  // ---------- seri ----------
  app.get('/api/sessions', wrap(() => sessions.list(100)));
  app.post('/api/sessions', wrap((req, res) => { res.status(201); return sessions.create(req.body || {}); }));
  app.get('/api/sessions/:id', wrap((req) => sessions.get(id(req))));
  app.put('/api/sessions/:id/matches/:index', wrap((req) => sessions.setMatch(id(req), intIn(req.params.index, 0, 500, 'Meci'), req.body || {})));
  app.post('/api/sessions/:id/finish', wrap((req) => sessions.finish(id(req))));
  app.delete('/api/sessions/:id', wrap((req, res) => { sessions.remove(id(req)); res.status(204).end(); }));

  app.get('/api/stats', wrap(() => stats.overview()));
  app.get('/api/health', wrap(() => ({ ok: true })));

  // ---------- fișiere statice ----------
  app.use(express.static(path.join(__dirname, '..', 'public'), {
    maxAge: '1h',
    setHeaders: (res, file) => { if (file.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache'); },
  }));

  app.use('/api', (req, res) => res.status(404).json({ error: 'Adresa nu există' }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON invalid' });
    console.error(err);
    return res.status(500).json({ error: 'Eroare internă' });
  });

  app.locals.db = db;
  return app;
}

module.exports = { createApp };
