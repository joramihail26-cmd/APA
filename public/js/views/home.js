import { api } from '../api.js';
import { h, toast, icon, avatar } from '../ui.js';
import { heroScene } from './home-scene.js';

const fmtDate = (d) => new Date(d.replace(' ', 'T') + 'Z').toLocaleDateString('ro-RO', { day: 'numeric', month: 'long' });

export async function render() {
  const [players, games, sessions, stats] = await Promise.all([api.players(), api.games(), api.sessions(), api.stats()]);
  const finished = sessions.filter((s) => s.status === 'finished');
  const ready = players.length >= 4;

  // ---------- scena de sus: un singur punct de atenție ----------
  const demo = !ready && h('button', { class: 'btn hero-ghost', type: 'button', onclick: async (e) => {
    e.currentTarget.disabled = true;
    try { const r = await api.demo(); toast(`Am adăugat ${r.added} jucători de probă`); location.hash = '#/players'; }
    catch (err) { toast(err.message, 'error'); e.currentTarget.disabled = false; }
  } }, 'Încarcă 8 jucători de probă');

  const hero = h('section', { class: 'hero', 'aria-labelledby': 'hero-title' },
    heroScene(),
    h('div', { class: 'hero-copy' },
      h('span', { class: 'hero-badge hero-in', style: { '--i': 0 }, 'aria-hidden': 'true' }, 'GN'),
      h('h1', { class: 'hero-title hero-in', id: 'hero-title', style: { '--i': 1 } }, 'GameNight Master'),
      h('p', { class: 'hero-sub hero-in', style: { '--i': 2 } },
        'Echipe echilibrate la fix, roluri potrivite pentru fiecare și scorul serii. Voi jucați, aplicația face calculele.'),
      h('div', { class: 'hero-actions hero-in', style: { '--i': 3 } },
        h('a', { class: 'btn primary huge', href: ready ? '#/new' : '#/players' }, icon('play'), ready ? 'Începe o seară' : 'Adaugă jucători'),
        demo),
      h('p', { class: 'hero-meta hero-in', style: { '--i': 4 } },
        `${players.length} jucători · ${games.length} jocuri · ${finished.length} ${finished.length === 1 ? 'seară jucată' : 'seri jucate'}`,
        !ready && ' · ai nevoie de cel puțin 4 jucători')));

  // ---------- rândurile de carduri ----------
  const sessionCards = sessions.map((s) => {
    const live = s.status === 'active';
    const done = s.matches.filter((m) => m.done).length;
    return h('a', { class: 'tile', href: `#/session/${s.id}` },
      h('div', { class: 'tile-band', style: { '--tc': s.teams[0]?.color || 'var(--neon)' } },
        h('span', { class: 'tile-emoji', 'aria-hidden': 'true' }, s.game.emoji),
        h('span', { class: `tile-chip ${live ? 'live' : ''}` }, live ? 'În desfășurare' : 'Încheiată')),
      h('div', { class: 'tile-body' },
        h('b', { class: 'tile-name' }, s.game.name),
        h('span', { class: 'tile-line' }, live ? `${done} din ${s.matches.length} meciuri · ${s.teams.map((t) => t.name).join(' · ')}` : (s.result?.message ?? '')),
        h('span', { class: 'tile-date' }, fmtDate(s.createdAt))));
  });

  const ranked = stats.players.filter((p) => p.played > 0);
  const colorOf = (name) => players.find((x) => x.name === name)?.color || '#ff49ba';
  const playerCards = (ranked.length ? ranked : players).slice(0, 12).map((p, i) => {
    const color = p.color || colorOf(p.name);
    return h('div', { class: 'tile' },
      h('div', { class: 'tile-band person', style: { '--tc': color } },
        avatar({ name: p.name, color }, 'xl'),
        ranked.length ? h('span', { class: 'tile-rank' }, `#${i + 1}`) : null),
      h('div', { class: 'tile-body' },
        h('b', { class: 'tile-name' }, p.name),
        h('span', { class: 'tile-line' }, ranked.length
          ? `${p.wins} ${p.wins === 1 ? 'victorie' : 'victorii'} · ${p.played} ${p.played === 1 ? 'seară' : 'seri'}`
          : 'Încă nicio seară jucată')));
  });

  const gameCards = games.map((g) => h('a', { class: 'tile', href: '#/games' },
    h('div', { class: 'tile-band game' }, h('span', { class: 'tile-emoji', 'aria-hidden': 'true' }, g.emoji)),
    h('div', { class: 'tile-body' },
      h('b', { class: 'tile-name' }, g.name),
      h('span', { class: 'tile-line' }, `${g.min_players}–${g.max_players} jucători · ${g.duration} min`))));

  const rows = h('div', { class: 'rows' },
    row('Seri', sessions.length, '#/stats', sessionCards,
      h('a', { class: 'tile tile-empty', href: ready ? '#/new' : '#/players' }, h('b', {}, 'Nicio seară încă'), h('span', {}, ready ? 'Prima începe de aici.' : 'Adaugă mai întâi jucătorii.'))),
    row(ranked.length ? 'Clasament' : 'Jucători', ranked.length || players.length, ranked.length ? '#/stats' : '#/players', playerCards,
      h('a', { class: 'tile tile-empty', href: '#/players' }, h('b', {}, 'Niciun jucător'), h('span', {}, 'Adaugă prietenii care vin la seară.'))),
    row('Jocuri', games.length, '#/games', gameCards, null));

  return h('div', { class: 'home' }, hero, rows);
}

/** Un rând de carduri care se derulează pe orizontală, cu săgeți, ca în referințe. */
function row(title, count, href, cards, emptyCard) {
  const track = h('div', { class: 'row-track' }, cards.length ? cards : emptyCard);
  const prev = h('button', { class: 'icon-btn', type: 'button', 'aria-label': `${title}: înapoi`, onclick: () => track.scrollBy({ left: -track.clientWidth * 0.8, behavior: 'smooth' }) }, icon('left'));
  const next = h('button', { class: 'icon-btn', type: 'button', 'aria-label': `${title}: înainte`, onclick: () => track.scrollBy({ left: track.clientWidth * 0.8, behavior: 'smooth' }) }, icon('right'));
  const sync = () => {
    prev.disabled = track.scrollLeft < 4;
    next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
  };
  track.addEventListener('scroll', sync, { passive: true });
  new ResizeObserver(sync).observe(track);
  return h('section', { class: 'row-block', 'aria-label': title },
    h('div', { class: 'row-head' },
      h('h2', {}, title), h('span', { class: 'row-count' }, count),
      h('span', { class: 'grow' }),
      h('a', { class: 'row-all', href }, 'Toate'),
      h('div', { class: 'row-arrows' }, prev, next)),
    track);
}
