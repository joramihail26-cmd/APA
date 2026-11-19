import { api } from '../api.js';
import { h, clear, avatar, empty, toast, formToggle, icon } from '../ui.js';
import { preset } from './wizard.js';

export async function render() {
  const players = await api.players();
  const head = h('div', { class: 'page-head' }, h('div', {}, h('span', { class: 'eyebrow' }, 'Route map'), h('h1', {}, 'Planificator'),
    h('p', { class: 'muted' }, 'Spui cine vine și cât timp aveți. Aplicația alege jocurile care plac cel mai mult grupului.')));
  if (players.length < 2) {
    return h('div', { class: 'stack' }, head, empty('⏱️', 'Ai nevoie de jucători', 'Planul se face pe baza nivelurilor din grup.', h('a', { class: 'btn primary', href: '#/players' }, 'Adaugă jucători')));
  }
  const chosen = new Set(players.map((p) => p.id));
  let minutes = 120;
  const list = h('div', { class: 'row tight' });
  const out = h('div');
  const go = h('button', { class: 'btn primary', type: 'button' }, 'Alege jocurile');

  const drawList = () => {
    clear(list);
    for (const p of players) {
      list.append(h('button', { type: 'button', class: 'chip pick', 'aria-pressed': String(chosen.has(p.id)), onclick: () => { chosen.has(p.id) ? chosen.delete(p.id) : chosen.add(p.id); drawList(); } }, avatar(p, 'sm'), p.name));
    }
  };
  drawList();

  const fmt = (m) => `${Math.floor(m / 60) ? `${Math.floor(m / 60)} h ` : ''}${m % 60 ? `${m % 60} min` : ''}`.trim();
  const time = h('output', { class: 'time-out', for: 'time' }, fmt(minutes));
  const slider = h('input', { id: 'time', type: 'range', min: 30, max: 360, step: 15, value: minutes, 'aria-label': 'Timp disponibil', 'aria-valuetext': fmt(minutes),
    oninput: (e) => { minutes = Number(e.target.value); time.textContent = fmt(minutes); e.target.setAttribute('aria-valuetext', fmt(minutes)); } });

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
    out.append(h('section', { class: 'panel stack' },
      h('div', { class: 'row' }, h('h2', {}, 'Programul serii'), h('span', { class: 'chip led hot' }, `${r.totalMinutes} din ${minutes} min`), h('span', { class: 'chip led' }, `satisfacție ${r.totalValue}`)),
      h('p', { class: 'muted small' }, 'De la cel mai liniștit joc la cel mai intens. Fiecare apare o singură dată.'),
      h('ol', { class: 'route' }, r.chosen.map((g, i) => h('li', { style: { '--i': i } },
        h('span', { class: 'node', 'aria-hidden': 'true' }, g.emoji, h('em', {}, `L${i + 1}`)),
        h('div', { style: { minWidth: 0 } }, h('b', {}, g.name), h('div', { class: 'muted small' }, `${g.duration} min · distracție ${g.fun}/10 · nivelul grupului ${g.avgLevel}`)),
        h('button', { class: 'btn small', type: 'button', onclick: () => { preset({ playerIds: [...chosen], gameId: g.id }); location.hash = '#/new'; } }, icon('play'), 'Joacă')))),
      r.skipped.length > 0 && h('details', {}, h('summary', { class: 'muted small' }, `Jocuri lăsate pe dinafară (${r.skipped.length})`),
        h('ul', { class: 'muted small' }, r.skipped.map((g) => h('li', {}, `${g.emoji} ${g.name}: ${g.reason}`)))),
      h('p', { class: 'muted small' }, `Calculat cu ${r.algorithm.name}, ${r.algorithm.complexity}.`)));
  }

  return h('div', { class: 'stack' }, head,
    h('section', { class: 'panel stack' },
      h('div', { class: 'stack-sm' }, h('h3', {}, 'Cine vine'), list),
      h('div', { class: 'stack-sm' }, h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('label', { for: 'time', style: { fontWeight: 700 } }, 'Timp disponibil'), time), slider),
      h('div', {}, go)),
    out);
}
