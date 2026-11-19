import { api } from '../api.js';
import { h, toast, icon } from '../ui.js';
import { decrypt, countUp, tubeLetters } from '../fx/text.js';
import { magnet } from '../fx/pointer.js';

const pad = (n) => String(n).padStart(2, '0');

export async function render() {
  const [players, games, sessions, stats] = await Promise.all([api.players(), api.games(), api.sessions(), api.stats()]);
  const active = sessions.filter((s) => s.status === 'active');
  const finished = sessions.filter((s) => s.status === 'finished');
  const ready = players.length >= 4;

  // ---------- attract screen ----------
  const l1 = h('span', { class: 'line' }); const l2 = h('span', { class: 'line volt' });
  tubeLetters(l1, 'GAMENIGHT', 120); tubeLetters(l2, 'MASTER', 720);
  const sign = h('h1', { class: 'sign', 'aria-label': 'GameNight Master' }, l1, l2);
  const tagline = h('p', { class: 'tagline' });

  const start = h('a', { class: 'btn primary huge', href: ready ? '#/new' : '#/players' },
    icon('play'), ready ? 'Press start' : 'Adaugă jucători');
  const demo = !ready && h('button', { class: 'btn', type: 'button', onclick: async (e) => {
    e.currentTarget.disabled = true;
    try { const r = await api.demo(); toast(`Am adăugat ${r.added} jucători de probă`); location.hash = '#/players'; }
    catch (err) { toast(err.message, 'error'); e.currentTarget.disabled = false; }
  } }, 'Încarcă 8 jucători de probă');

  const statEl = (n, label) => { const b = h('b', {}, '00'); countUp(b, n, { delay: 900, duration: 1100, format: pad }); return h('span', {}, b, label); };

  const copy = h('div', { class: 'attract-copy' },
    h('span', { class: 'eyebrow' }, ready ? 'Players ready' : 'Insert coin'),
    sign, tagline,
    h('div', { class: 'attract-actions' }, h('span', { class: 'star' }, magnet(start)), demo),
    h('p', { class: 'attract-stats' }, statEl(players.length, 'jucători'), statEl(games.length, 'jocuri'), statEl(finished.length, 'seri jucate')),
    !ready && h('p', { class: 'muted small', style: { maxWidth: '46ch' } }, `Pentru echipe ai nevoie de cel puțin 4 jucători. Acum ai ${players.length}.`));

  // HIGH SCORES: clasamentul real sau un tabel demonstrativ, ca bandă pe linia orizontului
  const top = stats.players.filter((p) => p.played > 0).slice(0, 5);
  const rows = top.length
    ? top.map((p, i) => ({ rk: `${i + 1}`, nm: p.name, sc: pad(p.wins) }))
    : (players.length ? players.slice(0, 5).map((p, i) => ({ rk: `${i + 1}`, nm: p.name, sc: '--' })) : ['ANA', 'MIHAI', 'IOANA', 'VLAD', 'SARA'].map((n, i) => ({ rk: `${i + 1}`, nm: n, sc: '--' })));
  const set = () => [h('span', { class: 'hs-title' }, 'High scores'),
    ...rows.map((r) => h('span', {}, h('span', { class: 'k' }, `${r.rk}. `), r.nm, h('b', {}, r.sc)))];
  // patru copii ale setului: jumătatea animată e mereu mai lată decât ecranul, deci bucla nu lasă goluri
  const copies = [set(), set(), set(), set()].map((group, i) => group.map((n) => { if (i) n.setAttribute('aria-hidden', 'true'); return n; }));
  const ticker = h('div', { class: 'ticker', role: 'marquee', 'aria-label': top.length ? 'High scores: victorii în serile încheiate' : 'High scores' },
    h('div', { class: 'ticker-track' }, copies));

  const attract = h('section', { class: 'attract', 'aria-label': 'Ecranul de start' },
    copy, ticker,
    h('div', { class: 'horizon', 'aria-hidden': 'true' }),
    h('div', { class: 'floor', 'aria-hidden': 'true' }, h('div', { class: 'floor-grid' })));

  decrypt(tagline, 'Echipe echilibrate la fix, roluri potrivite și un scoreboard care se aprinde la fiecare punct.', { delay: 1100, speed: 22, perChar: 2 });

  // ---------- sub hero ----------
  const lower = h('div', { class: 'home-lower' });
  const cont = h('section', { class: 'continue', 'aria-labelledby': 'cont-title' },
    h('h2', { id: 'cont-title', class: 'label', style: { color: 'var(--neon)' } }, active.length ? 'Continue?' : 'Ultima seară'));
  if (active.length) {
    cont.append(...active.map((s) => {
      const done = s.matches.filter((m) => m.done).length;
      return h('a', { class: 'panel continue-card', href: `#/session/${s.id}` },
        h('span', { class: 'emoji', 'aria-hidden': 'true' }, s.game.emoji),
        h('span', {}, h('b', {}, s.game.name), h('span', { class: 'muted small' }, `${s.teams.map((t) => t.name).join(' · ')} · ${done} din ${s.matches.length} meciuri`)),
        h('span', { class: 'go', 'aria-hidden': 'true' }, '▶'));
    }));
  } else if (finished[0]) {
    const s = finished[0];
    cont.append(h('a', { class: 'panel continue-card', href: `#/session/${s.id}` },
      h('span', { class: 'emoji', 'aria-hidden': 'true' }, s.game.emoji),
      h('span', {}, h('b', {}, s.game.name), h('span', { class: 'muted small' }, s.result?.message ?? '')),
      h('span', { class: 'go', 'aria-hidden': 'true' }, '▶')));
  } else {
    cont.append(h('p', { class: 'muted' }, 'Nicio seară încă. Prima începe cu PRESS START.'));
  }

  const how = h('section', { 'aria-labelledby': 'how-title' },
    h('h2', { id: 'how-title', class: 'label', style: { color: 'var(--neon)', marginBottom: 'var(--s-2)' } }, 'How to play'),
    h('ol', { class: 'howto' },
      step('Echipe echilibrate', 'Bitmask DP verifică toate împărțirile și o alege pe cea cu cea mai mică diferență de putere.', '#/new'),
      step('Reguli stricte', 'Doi prieteni separați sau împreună? Branch and Bound găsește cea mai bună împărțire care le respectă.', '#/new'),
      step('Roluri', 'Algoritmul ungar pune fiecare jucător pe rolul pe care îl face cel mai bine.', '#/algorithms'),
      step('Planul serii', 'Rucsacul alege jocurile care încap în timpul vostru și plac cel mai mult.', '#/planner'),
      step('Meciuri', 'Metoda cercului face ca fiecare echipă să joace cu fiecare, fără suprapuneri.', '#/algorithms'),
      step('Teste', 'Fiecare algoritm e verificat automat cu o soluție de forță brută.', '#/algorithms')));
  lower.append(cont, how);

  return h('div', {}, attract, lower);
}

const step = (title, text, href) => h('li', {}, h('div', {}, h('b', {}, h('a', { href }, title)), h('span', { class: 'muted small' }, text)));
