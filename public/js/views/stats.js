import { api } from '../api.js';
import { h, avatar, empty } from '../ui.js';

export async function render() {
  const [stats, sessions] = await Promise.all([api.stats(), api.sessions()]);
  const root = h('div', { class: 'stack' }, h('div', { class: 'page-head' }, h('div', {}, h('h1', {}, 'Clasament'), h('p', { class: 'muted' }, 'Victoriile jucătorilor din toate serile încheiate.'))));

  if (!stats.players.length) { root.append(empty('📊', 'Nimic de clasat încă', 'Adaugă jucători și încheie o seară ca să apară statistici.', h('a', { class: 'btn primary', href: '#/new' }, 'Seară nouă'))); return root; }

  root.append(h('section', { class: 'card' },
    h('div', { class: 'table-wrap' }, h('table', {},
      h('thead', {}, h('tr', {}, ['#', 'Jucător', 'Seri', 'Victorii', '% victorii', 'Puncte'].map((t, i) => h('th', { class: i > 1 ? 'num' : '' }, t)))),
      h('tbody', {}, stats.players.map((p, i) => h('tr', {},
        h('td', {}, i + 1), h('td', {}, h('span', { class: 'row', style: { flexWrap: 'nowrap' } }, avatar(p, 'sm'), p.name)),
        h('td', { class: 'num' }, p.played), h('td', { class: 'num' }, h('b', {}, p.wins)), h('td', { class: 'num' }, `${p.rate}%`), h('td', { class: 'num' }, p.points)))))),
    h('p', { class: 'muted small', style: { marginTop: '8px' } }, 'O victorie se numără doar când echipa a câștigat singură. Punctele sunt cele ale echipei din seara respectivă.')));

  root.append(h('section', {}, h('h2', {}, 'Istoric seri'),
    sessions.length ? h('div', { class: 'grid cols-2' }, sessions.map((s) => {
      const done = s.status === 'finished';
      return h('a', { class: 'card', href: `#/session/${s.id}`, style: { textDecoration: 'none' } },
        h('div', { class: 'row' }, h('b', {}, `${s.game.emoji} ${s.game.name}`), h('span', { class: `chip ${done ? '' : 'accent'}` }, done ? 'încheiată' : 'în desfășurare')),
        h('p', { class: 'muted small', style: { margin: '6px 0' } }, new Date(s.createdAt.replace(' ', 'T') + 'Z').toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })),
        done && s.result ? h('p', { style: { margin: 0 } }, s.result.message) : h('p', { class: 'muted', style: { margin: 0 } }, s.teams.map((t) => t.name).join(' · ')));
    })) : h('p', { class: 'muted' }, 'Nicio seară încă.')));
  return root;
}
