import { api } from '../api.js';
import { h, avatar, empty, stagger } from '../ui.js';

const RANK = ['1ST', '2ND', '3RD'];

export async function render() {
  const [stats, sessions] = await Promise.all([api.stats(), api.sessions()]);
  const root = h('div', { class: 'stack' }, h('div', { class: 'page-head' },
    h('div', {}, h('span', { class: 'eyebrow' }, 'High scores'), h('h1', {}, 'Clasament'), h('p', { class: 'muted' }, 'Victoriile jucătorilor din toate serile încheiate.'))));

  if (!stats.players.length) { root.append(empty('🏆', 'Nimic de clasat încă', 'Adaugă jucători și încheie o seară ca să apară recordurile.', h('a', { class: 'btn primary', href: '#/new' }, 'Seară nouă'))); return root; }

  root.append(h('section', { class: 'panel hot' },
    h('div', { class: 'table-wrap' }, h('table', { class: 'board-table' },
      h('thead', {}, h('tr', {}, ['Loc', 'Jucător', 'Seri', 'Victorii', '% victorii', 'Puncte'].map((t, i) => h('th', { class: i > 1 ? 'num' : '', scope: 'col' }, t)))),
      h('tbody', {}, stats.players.map((p, i) => h('tr', {},
        h('td', {}, h('span', { class: 'rk' }, RANK[i] ?? `${i + 1}TH`)),
        h('td', {}, h('span', { class: 'row tight', style: { flexWrap: 'nowrap' } }, avatar(p, 'sm'), h('span', { style: { overflowWrap: 'anywhere' } }, p.name))),
        h('td', { class: 'num' }, p.played), h('td', { class: 'num' }, h('b', { style: { color: 'var(--volt)' } }, p.wins)), h('td', { class: 'num' }, `${p.rate}%`), h('td', { class: 'num' }, p.points)))))),
    h('p', { class: 'muted small', style: { marginTop: 'var(--s-3)' } }, 'O victorie se numără doar când echipa a câștigat singură. Punctele sunt cele ale echipei în seara respectivă.')));

  const fmt = (d) => new Date(d.replace(' ', 'T') + 'Z').toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' });
  root.append(h('section', { class: 'stack-sm' }, h('h2', { class: 'label', style: { color: 'var(--neon)' } }, 'Istoric seri'),
    sessions.length ? stagger(h('ul', { class: 'history' }, sessions.map((s) => {
      const done = s.status === 'finished';
      return h('li', {}, h('a', { href: `#/session/${s.id}` },
        h('span', { class: 'emoji', 'aria-hidden': 'true' }, s.game.emoji),
        h('span', { style: { minWidth: 0 } }, h('b', {}, s.game.name),
          h('span', { class: 'muted small' }, `${fmt(s.createdAt)} · ${done && s.result ? s.result.message : s.teams.map((t) => t.name).join(' · ')}`)),
        h('span', { class: `chip led ${done ? '' : 'hot'}` }, done ? 'Game over' : 'Live')));
    })), 12) : h('p', { class: 'muted' }, 'Nicio seară încă.')));
  return root;
}
