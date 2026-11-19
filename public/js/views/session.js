import { api } from '../api.js';
import { h, clear, avatar, toast, openDialog, confirmBox, confetti } from '../ui.js';

export async function render(id) {
  let s = await api.session(id);
  const root = h('div', { class: 'stack' });
  const top = h('div');
  const cols = h('div', { class: 'grid', style: { gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', alignItems: 'start' } });
  const matchesBox = h('div');
  const side = h('div', { class: 'stack' });
  cols.append(matchesBox, side);
  root.append(top, cols);

  const active = () => s.status === 'active';
  const team = (i) => s.teams[i];

  function drawTop() {
    const done = s.matches.filter((m) => m.done).length;
    clear(top).append(
      h('div', { class: 'page-head' },
        h('div', {}, h('h1', {}, `${s.game.emoji} ${s.game.name}`),
          h('p', { class: 'muted' }, `${s.teams.length} echipe · ${done} din ${s.matches.length} meciuri jucate · ${active() ? 'în desfășurare' : 'încheiată'}`)),
        h('div', { class: 'row' },
          h('button', { class: 'btn danger ghost', type: 'button', onclick: async () => {
            if (!(await confirmBox('Ștergi seara?', 'Scorurile și rezultatul se pierd.'))) return;
            try { await api.deleteSession(s.id); toast('Seară ștearsă'); location.hash = '#/stats'; } catch (e) { toast(e.message, 'error'); }
          } }, 'Șterge'),
          active() && h('button', { class: 'btn primary', type: 'button', onclick: finish }, 'Încheie seara'))),
      (!active() && s.result) ? h('div', { class: 'banner row', style: { marginBottom: '16px' } }, h('span', { class: 'trophy' }, s.result.winners.length === 1 ? '🏆' : '🤝'), h('div', { class: 'grow' }, h('h2', { style: { margin: 0 } }, s.result.winners.length === 1 ? 'Avem un câștigător' : 'Egalitate'), h('p', { style: { margin: 0 } }, s.result.message))) : null);
  }

  function drawMatches() {
    clear(matchesBox);
    let last = 0;
    s.matches.forEach((m, i) => {
      if (m.round !== last) { last = m.round; matchesBox.append(h('div', { class: 'round-title' }, `Etapa ${m.round}`)); }
      const A = team(m.a); const B = team(m.b);
      const set = (key, delta) => {
        const next = { sa: m.sa, sb: m.sb, done: true };
        next[key] = Math.max(0, Math.min(999, m[key] + delta));
        save(i, next);
      };
      const side = (key) => h('div', { class: 'score' },
        h('button', { class: 'btn', type: 'button', disabled: !active(), 'aria-label': 'Scade un punct', onclick: () => set(key, -1) }, '−'),
        h('output', { 'aria-live': 'polite' }, m[key]),
        h('button', { class: 'btn', type: 'button', disabled: !active(), 'aria-label': 'Adaugă un punct', onclick: () => set(key, 1) }, '+'));
      matchesBox.append(h('div', { class: `match ${m.done ? 'done' : ''}`, style: { marginBottom: '10px' } },
        h('div', { class: 'tn', style: { '--tc': A.color } }, h('i', { class: 'dot' }), h('span', {}, A.name)),
        h('div', { class: 'row', style: { justifyContent: 'center', flexWrap: 'nowrap' } }, side('sa'), h('b', {}, ':'), side('sb')),
        h('div', { class: 'tn r', style: { '--tc': B.color } }, h('span', {}, B.name), h('i', { class: 'dot' })),
        active() && h('div', { style: { gridColumn: '1 / -1', textAlign: 'center' } },
          m.done ? h('button', { class: 'btn small ghost', type: 'button', onclick: () => save(i, { sa: 0, sb: 0, done: false }) }, 'Resetează meciul')
                 : h('span', { class: 'muted small' }, 'Apasă + la oricare echipă ca să marchezi meciul ca jucat'))));
    });
  }

  function drawSide() {
    clear(side).append(
      h('section', { class: 'card' }, h('h3', {}, 'Clasament'),
        h('div', { class: 'table-wrap' }, h('table', {},
          h('thead', {}, h('tr', {}, ['#', 'Echipa', 'J', 'V', 'E', 'Î', '+/−', 'Pct'].map((t, i) => h('th', { class: i > 1 ? 'num' : '' }, t)))),
          h('tbody', {}, s.standings.map((r, i) => h('tr', {},
            h('td', {}, i + 1),
            h('td', {}, h('span', { class: 'row', style: { flexWrap: 'nowrap', gap: '8px' } }, h('i', { class: 'dot', style: { '--tc': r.color } }), r.name)),
            h('td', { class: 'num' }, r.played), h('td', { class: 'num' }, r.w), h('td', { class: 'num' }, r.d), h('td', { class: 'num' }, r.l),
            h('td', { class: 'num' }, r.diff > 0 ? `+${r.diff}` : r.diff), h('td', { class: 'num' }, h('b', {}, r.pts))))))),
        h('p', { class: 'muted small', style: { marginTop: '8px' } }, 'Victorie 3 puncte, egal 1. La egalitate contează diferența de scor, apoi scorul marcat.')),
      h('section', { class: 'card' }, h('h3', {}, 'Echipe și roluri'),
        s.teams.map((t) => h('div', { style: { marginBottom: '12px' } },
          h('div', { class: 'row', style: { gap: '8px' } }, h('i', { class: 'dot', style: { '--tc': t.color } }), h('b', {}, t.name)),
          t.players.map((p) => h('div', { class: 'member' }, avatar(p, 'sm'), h('div', { class: 'who' }, p.name), h('span', { class: 'chip' }, p.role)))))));
  }

  const redraw = () => { drawTop(); drawMatches(); drawSide(); };

  async function save(i, vals) {
    const before = { ...s.matches[i] };
    Object.assign(s.matches[i], vals); // actualizare imediată în interfață
    drawMatches();
    try {
      s = await api.setMatch(s.id, i, vals);
      redraw();
    } catch (e) {
      Object.assign(s.matches[i], before);
      toast(e.message, 'error');
      drawMatches();
    }
  }

  async function finish() {
    const left = s.matches.filter((m) => !m.done).length;
    if (!s.matches.some((m) => m.done)) { toast('Marchează cel puțin un meci ca jucat', 'error'); return; }
    if (left && !(await confirmBox('Încheie seara?', `Mai sunt ${left} meciuri nejucate, care nu vor conta în clasament.`, 'Încheie'))) return;
    try {
      s = await api.finish(s.id);
      redraw();
      winnerDialog();
    } catch (e) { toast(e.message, 'error'); }
  }

  function winnerDialog() {
    const single = s.result.winners.length === 1;
    const winner = single ? team(s.result.winners[0]) : null;
    const close = openDialog(h('div', { class: 'dlg', style: { textAlign: 'center', justifyItems: 'center' } },
      h('div', { class: 'trophy' }, single ? '🏆' : '🤝'),
      h('h1', {}, single ? winner.name : 'Egalitate'),
      h('p', { style: { fontSize: '1.1rem', maxWidth: '44ch' } }, s.result.message),
      single && h('div', { class: 'row', style: { justifyContent: 'center' } }, winner.players.map((p) => h('span', { class: 'chip pick', style: { cursor: 'default' } }, avatar(p, 'sm'), p.name))),
      h('div', { class: 'dlg-actions' },
        h('a', { class: 'btn', href: '#/stats', onclick: () => close() }, 'Vezi clasamentul'),
        h('a', { class: 'btn primary', href: '#/new', onclick: () => close() }, 'Seară nouă'))));
    if (single) confetti();
  }

  redraw();
  return root;
}
