import { api } from '../api.js';
import { h, empty, toast } from '../ui.js';

export async function render() {
  const [players, games, sessions] = await Promise.all([api.players(), api.games(), api.sessions()]);
  const active = sessions.filter((s) => s.status === 'active');
  const finished = sessions.filter((s) => s.status === 'finished');

  const root = h('div', { class: 'stack' });
  root.append(h('div', { class: 'page-head' },
    h('div', {}, h('h1', {}, 'Seara de jocnpm'),
      h('p', { class: 'muted' }, 'Adaugi prietenii, alegi jocul, iar aplicația împarte echipele și rolurile, apoi ține scorul.')),
    h('a', { class: 'btn primary', href: '#/new' }, 'Începe o seară nouă')));

  root.append(h('div', { class: 'grid cols-3' },
    stat(players.length, 'jucători'), stat(games.length, 'jocuri disponibile'), stat(finished.length, 'seri încheiate')));

  if (players.length < 4) {
    root.append(empty('👥', 'Ai nevoie de cel puțin 4 jucători',
      'Adaugă prietenii unul câte unul sau încarcă un grup de probă ca să vezi cum funcționează.',
      h('a', { class: 'btn primary', href: '#/players' }, 'Adaugă jucători'),
      h('button', { class: 'btn', type: 'button', onclick: async () => {
        try { const r = await api.demo(); toast(`Am adăugat ${r.added} jucători`); location.hash = '#/players'; }
        catch (e) { toast(e.message, 'error'); }
      } }, 'Încarcă 8 jucători de probă')));
  }

  if (active.length) {
    root.append(h('section', {}, h('h2', {}, 'Seri în desfășurare'),
      h('div', { class: 'grid cols-2' }, active.map((s) => sessionCard(s)))));
  }

  root.append(h('section', {}, h('h2', {}, 'Cum se folosesc algoritmii'),
    h('div', { class: 'grid cols-3' },
      info('Echipe echilibrate', 'Bitmask DP verifică toate împărțirile posibile și o alege pe cea cu cea mai mică diferență de putere între echipe.', '#/new'),
      info('Reguli stricte', 'Dacă doi prieteni trebuie separați sau puși împreună, Branch and Bound găsește cea mai bună împărțire care respectă regulile.', '#/new'),
      info('Roluri', 'Algoritmul ungar potrivește fiecare jucător cu rolul pe care îl face cel mai bine în jocul ales.', '#/algorithms'),
      info('Planul serii', 'Rucsacul cu programare dinamică alege jocurile care încap în timpul tău și plac cel mai mult grupului.', '#/planner'),
      info('Meciuri', 'Metoda cercului pune fiecare echipă să joace cu fiecare, fără suprapuneri.', '#/algorithms'),
      info('Teste', 'Fiecare algoritm este verificat automat cu o soluție de forță brută.', '#/algorithms'))));
  return root;
}

const stat = (n, label) => h('div', { class: 'card stat' }, h('b', {}, n), h('span', {}, label));

function info(title, text, href) {
  return h('a', { class: 'card flat', href, style: { textDecoration: 'none' } }, h('h3', {}, title), h('p', { class: 'muted small' }, text));
}

function sessionCard(s) {
  const done = s.matches.filter((m) => m.done).length;
  return h('a', { class: 'card', href: `#/session/${s.id}`, style: { textDecoration: 'none' } },
    h('h3', {}, `${s.game.emoji} ${s.game.name}`),
    h('p', { class: 'muted' }, s.teams.map((t) => t.name).join(' · ')),
    h('span', { class: 'chip accent' }, `${done} din ${s.matches.length} meciuri jucate`));
}
