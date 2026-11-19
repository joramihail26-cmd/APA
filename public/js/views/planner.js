import { api } from '../api.js';
import { h, clear, avatar, empty, toast, segmented, formToggle } from '../ui.js';
import { preset } from './wizard.js';

export async function render() {
  const players = await api.players();
  if (players.length < 2) {
    return h('div', { class: 'stack' }, h('h1', {}, 'Planificator'), empty('⏱️', 'Ai nevoie de jucători', 'Planul se face pe baza nivelurilor din grup.', h('a', { class: 'btn primary', href: '#/players' }, 'Adaugă jucători')));
  }
  const chosen = new Set(players.map((p) => p.id));
  let minutes = 120;
  const list = h('div', { class: 'row' });
  const out = h('div');
  const go = h('button', { class: 'btn primary', type: 'button' }, 'Alege jocurile');

  const drawList = () => {
    clear(list);
    for (const p of players) {
      list.append(h('button', { type: 'button', class: 'chip pick', 'aria-pressed': String(chosen.has(p.id)), onclick: () => { chosen.has(p.id) ? chosen.delete(p.id) : chosen.add(p.id); drawList(); } }, avatar(p, 'sm'), p.name));
    }
  };
  drawList();

  const time = h('output', {}, '2 h');
  const fmt = (m) => `${Math.floor(m / 60) ? `${Math.floor(m / 60)} h ` : ''}${m % 60 ? `${m % 60} min` : ''}`.trim();
  const slider = h('input', { type: 'range', min: 30, max: 360, step: 15, value: minutes, 'aria-label': 'Timp disponibil', oninput: (e) => { minutes = Number(e.target.value); time.textContent = fmt(minutes); } });
  time.textContent = fmt(minutes);

  go.addEventListener('click', async () => {
    if (chosen.size < 2) { toast('Alege cel puțin 2 jucători', 'error'); return; }
    formToggle(go, true);
    try { drawResult(await api.plan({ playerIds: [...chosen], minutes })); }
    catch (e) { toast(e.message, 'error'); }
    formToggle(go, false);
  });

  function drawResult(r) {
    clear(out);
    if (!r.chosen.length) { out.append(empty('🤷', 'Nu încape niciun joc', 'Mărește timpul sau schimbă grupul.')); return; }
    out.append(h('section', { class: 'card stack' },
      h('div', { class: 'row' }, h('h2', { style: { margin: 0 } }, 'Programul serii'), h('span', { class: 'chip accent' }, `${r.totalMinutes} min din ${minutes}`), h('span', { class: 'chip' }, `satisfacție ${r.totalValue}`)),
      h('p', { class: 'muted small' }, 'Jocurile sunt puse de la cele mai liniștite la cele mai intense. Fiecare apare o singură dată.'),
      h('ol', { class: 'timeline plain', style: { padding: 0 } }, r.chosen.map((g, i) => h('li', {},
        h('span', { class: 'emoji' }, g.emoji),
        h('div', {}, h('b', {}, `${i + 1}. ${g.name}`), h('div', { class: 'muted small' }, `${g.duration} min · distracție ${g.fun}/10 · nivel mediu al grupului ${g.avgLevel}`)),
        h('button', { class: 'btn small', type: 'button', onclick: () => { preset({ playerIds: [...chosen], gameId: g.id }); location.hash = '#/new'; } }, 'Joacă acum')))),
      r.skipped.length > 0 && h('details', {}, h('summary', { class: 'muted small', style: { cursor: 'pointer' } }, `Jocuri lăsate pe dinafară (${r.skipped.length})`),
        h('ul', { class: 'muted small' }, r.skipped.map((g) => h('li', {}, `${g.emoji} ${g.name}: ${g.reason}`)))),
      h('p', { class: 'muted small' }, `Calculat cu ${r.algorithm.name}, ${r.algorithm.complexity}.`)));
  }

  return h('div', { class: 'stack' },
    h('div', { class: 'page-head' }, h('div', {}, h('h1', {}, 'Planificator'), h('p', { class: 'muted' }, 'Spui cine vine și cât timp aveți, iar aplicația alege jocurile care plac cel mai mult grupului.'))),
    h('section', { class: 'card stack' }, h('h3', {}, 'Cine vine'), list,
      h('label', { class: 'field' }, h('span', { class: 'row' }, 'Timp disponibil: ', time), slider), h('div', {}, go)),
    out);
}
