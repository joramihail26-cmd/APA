import { api } from '../api.js';
import { h, clear, avatar, toast, openDialog, confirmBox, icon } from '../ui.js';
import { decrypt, countUp } from '../fx/text.js';
import { fireworks } from '../fx/canvas.js';

const RANK = ['1ST', '2ND', '3RD'];
const rankLabel = (i) => RANK[i] ?? `${i + 1}TH`;

export async function render(id) {
  let s = await api.session(id);
  const root = h('div', { class: 'stack' });
  const top = h('div', { class: 'stack' });
  const board = h('div', { class: 'board' });
  const side = h('div', { class: 'stack' });
  root.append(top, h('div', { class: 'session-grid' }, h('section', { 'aria-label': 'Meciuri' }, board), side));

  const active = () => s.status === 'active';
  const team = (i) => s.teams[i];
  let bumped = null; // ce scor tocmai s-a schimbat, pentru efectul +1

  function drawTop() {
    const done = s.matches.filter((m) => m.done).length;
    clear(top).append(...[
      h('div', { class: 'page-head' },
        h('div', {}, h('span', { class: 'eyebrow' }, active() ? 'Now playing' : 'Game over'),
          h('h1', {}, `${s.game.emoji} ${s.game.name}`),
          h('p', { class: 'muted' }, `${s.teams.length} echipe · ${done} din ${s.matches.length} meciuri jucate · ${active() ? 'în desfășurare' : 'încheiată'}`)),
        h('div', { class: 'row' },
          h('button', { class: 'btn ghost danger', type: 'button', onclick: async () => {
            if (!(await confirmBox('Ștergi seara?', 'Scorurile și rezultatul se pierd definitiv.'))) return;
            try { await api.deleteSession(s.id); toast('Seară ștearsă'); location.hash = '#/stats'; } catch (e) { toast(e.message, 'error'); }
          } }, 'Șterge'),
          active() && h('span', { class: 'star' }, h('button', { class: 'btn primary', type: 'button', onclick: finish }, 'Încheie seara')))),
      (!active() && s.result) ? h('section', { class: 'panel banner-win' },
        h('span', { style: { fontSize: '2.75rem' }, 'aria-hidden': 'true' }, s.result.winners.length === 1 ? '🏆' : '🤝'),
        h('div', { class: 'stack-sm' }, h('span', { class: 'label' }, s.result.winners.length === 1 ? 'High score' : 'Draw'),
          h('h2', {}, s.result.winners.length === 1 ? team(s.result.winners[0]).name : 'Egalitate'),
          h('p', {}, s.result.message),
          h('div', {}, h('button', { class: 'btn small', type: 'button', onclick: () => winnerScreen(false) }, 'Vezi ecranul final')))) : null,
    ].filter(Boolean));
  }

  function drawBoard() {
    clear(board);
    let last = 0;
    s.matches.forEach((m, i) => {
      if (m.round !== last) { last = m.round; board.append(h('h2', { class: 'round-title label' }, `Etapa ${m.round}`)); }
      const A = team(m.a); const B = team(m.b);
      const set = (key, delta) => {
        const next = { sa: m.sa, sb: m.sb, done: true };
        next[key] = Math.max(0, Math.min(999, m[key] + delta));
        bumped = delta > 0 ? `${i}-${key}` : null;
        save(i, next);
      };
      const side = (key, who) => {
        const led = h('output', { class: `score-led ${bumped === `${i}-${key}` ? 'bump' : ''}`, 'aria-live': 'polite', 'aria-label': `Scor ${who.name}: ${m[key]}` }, m[key]);
        return h('div', { class: 'score' }, led,
          active() && h('div', { class: 'score-btns' },
            h('button', { class: 'btn', type: 'button', 'aria-label': `Scade un punct pentru ${who.name}`, disabled: m[key] === 0, onclick: () => set(key, -1) }, '−'),
            h('button', { class: 'btn', type: 'button', 'aria-label': `Adaugă un punct pentru ${who.name}`, onclick: () => set(key, 1) }, '+')));
      };
      board.append(h('div', { class: `panel tight match ${m.done ? 'done' : ''}` },
        h('div', { class: 'tn', style: { '--tc': A.color } }, h('i', { class: 'dot', 'aria-hidden': 'true' }), h('span', {}, A.name)),
        h('div', { class: 'score-pair' }, side('sa', A), h('span', { class: 'score-sep', 'aria-hidden': 'true' }, ':'), side('sb', B)),
        h('div', { class: 'tn r', style: { '--tc': B.color } }, h('span', {}, B.name), h('i', { class: 'dot', 'aria-hidden': 'true' })),
        active() && h('div', { class: 'note' },
          m.done ? h('button', { class: 'btn small ghost', type: 'button', onclick: () => save(i, { sa: 0, sb: 0, done: false }) }, 'Resetează meciul')
                 : h('span', { class: 'muted small' }, 'Apasă + la echipa care a punctat. Meciul se marchează singur ca jucat.'))));
    });
    bumped = null;
  }

  function drawSide() {
    clear(side).append(
      h('section', { class: 'panel stack-sm' }, h('h2', { class: 'label', style: { color: 'var(--neon)' } }, 'Clasament live'),
        h('div', { class: 'table-wrap' }, h('table', { class: 'standings' },
          h('thead', {}, h('tr', {}, ['#', 'Echipa', 'J', 'V', 'E', 'Î', '+/−', 'Pct'].map((t, i) => h('th', { class: i > 1 ? 'num' : '', scope: 'col', title: ['Loc', 'Echipa', 'Jucate', 'Victorii', 'Egaluri', 'Înfrângeri', 'Diferență', 'Puncte'][i] }, t)))),
          h('tbody', {}, s.standings.map((r, i) => h('tr', { class: i === 0 && r.played ? 'lead' : '' },
            h('td', { class: 'num', style: { textAlign: 'left' } }, i + 1),
            h('td', {}, h('span', { class: 'row tight', style: { flexWrap: 'nowrap' } }, h('i', { class: 'dot', style: { '--tc': r.color }, 'aria-hidden': 'true' }), r.name)),
            h('td', { class: 'num' }, r.played), h('td', { class: 'num' }, r.w), h('td', { class: 'num' }, r.d), h('td', { class: 'num' }, r.l),
            h('td', { class: 'num' }, r.diff > 0 ? `+${r.diff}` : r.diff), h('td', { class: 'num' }, h('b', {}, r.pts))))))),
        h('p', { class: 'muted small' }, 'Victorie 3 puncte, egal 1. La egalitate contează diferența de scor, apoi scorul marcat.')),
      h('section', { class: 'panel stack-sm' }, h('h2', { class: 'label', style: { color: 'var(--neon)' } }, 'Echipe și roluri'),
        s.teams.map((t) => h('div', { class: 'stack-sm', style: { gap: 'var(--s-2)' } },
          h('div', { class: 'row tight' }, h('i', { class: 'dot', style: { '--tc': t.color }, 'aria-hidden': 'true' }), h('b', {}, t.name)),
          t.players.map((p) => h('div', { class: 'member' }, avatar(p, 'sm'), h('div', { class: 'who' }, p.name), h('span', { class: 'role' }, p.role)))))));
  }

  const redraw = () => { drawTop(); drawBoard(); drawSide(); };

  async function save(i, vals) {
    const before = { ...s.matches[i] };
    Object.assign(s.matches[i], vals); // actualizare imediată în interfață
    drawBoard();
    try {
      const local = s.matches[i];
      s = await api.setMatch(s.id, i, vals);
      drawTop(); drawSide();
      // tabla se redesenează doar dacă serverul a corectat ceva, ca să nu tăiem efectul +1
      const m = s.matches[i];
      if (m.sa !== local.sa || m.sb !== local.sb || m.done !== local.done) drawBoard();
    } catch (e) {
      Object.assign(s.matches[i], before);
      toast(e.message, 'error');
      drawBoard();
    }
  }

  async function finish() {
    const left = s.matches.filter((m) => !m.done).length;
    if (!s.matches.some((m) => m.done)) { toast('Marchează cel puțin un meci ca jucat', 'error'); return; }
    if (left && !(await confirmBox('Încheie seara?', `Mai sunt ${left} meciuri nejucate. Nu vor conta în clasament.`, 'Încheie'))) return;
    try {
      s = await api.finish(s.id);
      redraw();
      winnerScreen(true);
    } catch (e) { toast(e.message, 'error'); }
  }

  /** HIGH SCORE: GAME OVER, numele câștigătorului decriptat, tabela de recorduri și artificii. */
  function winnerScreen(celebrate) {
    const single = s.result.winners.length === 1;
    const winner = single ? team(s.result.winners[0]) : null;
    const name = h('h2', { class: 'hs-name', id: 'hs-name' });
    const table = h('ol', { class: 'hs-table', 'aria-label': 'Clasamentul serii' }, s.standings.map((r, i) => {
      const sc = h('span', { class: 'sc' }, '0');
      countUp(sc, r.pts, { delay: 1300 + i * 90, duration: 700, format: (n) => `${String(n).padStart(2, '0')} PTS` });
      return h('li', { style: { '--i': i } }, h('span', { class: 'rk' }, rankLabel(i)), h('span', { class: 'nm' }, r.name), sc);
    }));
    const close = openDialog(h('div', { class: 'hs-inner' },
      h('p', { class: 'gameover' }, h('span', { class: 'glitch', 'data-text': 'GAME OVER' }, 'GAME OVER')),
      h('p', { class: 'hs-win-label' }, single ? 'Winner' : 'Draw'),
      name,
      h('p', { class: 'hs-msg' }, s.result.message),
      single && h('div', { class: 'hs-team' }, winner.players.map((p) => h('span', { class: 'chip pick', style: { cursor: 'default' } }, avatar(p, 'sm'), p.name))),
      table,
      h('div', { class: 'hs-actions' },
        h('a', { class: 'btn', href: '#/stats', onclick: () => close() }, 'Clasament general'),
        h('a', { class: 'btn primary', href: '#/new', onclick: () => close() }, icon('play'), 'Seară nouă'),
        h('button', { class: 'btn ghost', type: 'button', onclick: () => close() }, 'Închide'))),
    { className: 'hs' });
    decrypt(name, single ? winner.name : 'Egalitate', { delay: 700, speed: 45 });
    if (celebrate && single) fireworks();
  }

  redraw();
  return root;
}
