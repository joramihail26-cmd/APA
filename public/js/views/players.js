import { api } from '../api.js';
import { h, clear, avatar, empty, openDialog, confirmBox, toast, segmented, LEVELS, stars, TRAITS } from '../ui.js';

const COLORS = ['#ef476f', '#ffb703', '#06d6a0', '#118ab2', '#9b5de5', '#f77f00', '#2ec4b6', '#e76f51', '#4cc9f0', '#80b918'];
let view = 'cards';

export async function render() {
  const root = h('div', { class: 'stack' });
  const body = h('div');

  async function refresh() {
    const [players, games] = await Promise.all([api.players(), api.games()]);
    clear(body);
    if (!players.length) {
      body.append(empty('👥', 'Încă nu ai niciun jucător', 'Adaugă primul prieten, apoi setează nivelul lui la fiecare joc.',
        h('button', { class: 'btn primary', type: 'button', onclick: () => editor(null, games, refresh) }, 'Adaugă jucător'),
        h('button', { class: 'btn', type: 'button', onclick: async () => { try { const r = await api.demo(); toast(`Am adăugat ${r.added} jucători`); refresh(); } catch (e) { toast(e.message, 'error'); } } }, 'Încarcă 8 jucători de probă')));
      return;
    }
    body.append(view === 'cards' ? cards(players, games, refresh) : matrix(players, games, refresh));
  }

  const toggle = segmented([['cards', 'Carduri'], ['matrix', 'Tabel niveluri']], view, (v) => { view = v; refresh(); }, 'Mod afișare');
  root.append(h('div', { class: 'page-head' },
    h('div', {}, h('h1', {}, 'Jucători'), h('p', { class: 'muted' }, 'Fiecare jucător are un nivel separat pentru fiecare joc, de la 1 la 5.')),
    h('div', { class: 'row' }, toggle,
      h('button', { class: 'btn primary', type: 'button', onclick: async () => editor(null, await api.games(), refresh) }, '+ Jucător nou'))), body);
  await refresh();
  return root;
}

function cards(players, games, refresh) {
  return h('div', { class: 'grid cols-3' }, players.map((p) => {
    const avgs = games.map((g) => p.levels[g.id] ?? 3);
    const best = games.filter((g) => (p.levels[g.id] ?? 3) >= 4).slice(0, 4);
    return h('article', { class: 'card stack' },
      h('div', { class: 'row' }, avatar(p, 'lg'),
        h('div', { class: 'grow' }, h('h3', { style: { margin: 0 } }, p.name),
          h('span', { class: 'muted small' }, `nivel mediu ${(avgs.reduce((a, b) => a + b, 0) / avgs.length).toFixed(1)}`))),
      h('div', { class: 'traits' }, TRAITS.flatMap(([k, label]) => [h('span', {}, label), h('div', { class: 'bar' }, h('i', { style: { width: `${p[k] * 10}%` } }))])),
      h('div', { class: 'row' }, best.length ? best.map((g) => h('span', { class: 'chip', title: `${g.name}: ${LEVELS[p.levels[g.id] ?? 3]}` }, g.emoji, ' ', g.name)) : h('span', { class: 'muted small' }, 'Fără jocuri la nivel bun sau expert')),
      h('div', { class: 'row' },
        h('button', { class: 'btn small', type: 'button', onclick: () => editor(p, games, refresh) }, 'Editează'),
        h('button', { class: 'btn small danger ghost', type: 'button', onclick: async () => {
          if (!(await confirmBox(`Ștergi pe ${p.name}?`, 'Dispare din listă, dar serile deja încheiate rămân în istoric.'))) return;
          try { await api.deletePlayer(p.id); toast('Jucător șters'); refresh(); } catch (e) { toast(e.message, 'error'); }
        } }, 'Șterge')));
  }));
}

function matrix(players, games, refresh) {
  const head = h('tr', {}, h('th', {}, 'Jucător'), games.map((g) => h('th', { title: g.name }, `${g.emoji} ${g.name}`)));
  const rows = players.map((p) => h('tr', {}, h('td', {}, h('div', { class: 'row' }, avatar(p, 'sm'), p.name)),
    games.map((g) => {
      const sel = h('select', { 'aria-label': `${p.name}, ${g.name}`, onchange: async (e) => {
        try { await api.setLevels(p.id, { [g.id]: Number(e.target.value) }); toast(`${p.name}: ${g.name} → ${LEVELS[e.target.value]}`); }
        catch (err) { toast(err.message, 'error'); refresh(); }
      } }, [1, 2, 3, 4, 5].map((n) => h('option', { value: n, selected: (p.levels[g.id] ?? 3) === n }, `${n} · ${LEVELS[n]}`)));
      return h('td', {}, sel);
    })));
  return h('div', { class: 'card' }, h('p', { class: 'muted small' }, 'Schimbarea se salvează imediat. Fără o alegere, nivelul implicit este 3 (Mediu).'),
    h('div', { class: 'table-wrap' }, h('table', { class: 'matrix' }, h('thead', {}, head), h('tbody', {}, rows))));
}

function editor(player, games, onSaved) {
  const data = player
    ? { name: player.name, color: player.color, strategy: player.strategy, creativity: player.creativity, speed: player.speed, social: player.social, levels: { ...player.levels } }
    : { name: '', color: COLORS[Math.floor(Math.random() * COLORS.length)], strategy: 5, creativity: 5, speed: 5, social: 5, levels: {} };

  const err = h('div', { class: 'err', role: 'alert' });
  const name = h('input', { type: 'text', value: data.name, maxlength: 24, required: true, autocomplete: 'off', id: 'pname' });
  const sw = h('div', { class: 'swatches' });
  const drawSw = () => { clear(sw); COLORS.forEach((c) => sw.append(h('button', { type: 'button', class: 'swatch', style: { background: c }, 'aria-label': `Culoare ${c}`, 'aria-pressed': String(c === data.color), onclick: () => { data.color = c; drawSw(); } }))); };
  drawSw();

  const sliders = TRAITS.map(([k, label]) => {
    const out = h('b', {}, data[k]);
    const input = h('input', { type: 'range', min: 1, max: 10, value: data[k], 'aria-label': label, oninput: (e) => { data[k] = Number(e.target.value); out.textContent = data[k]; } });
    return h('label', { class: 'field' }, h('span', { class: 'row' }, label, out), input);
  });

  const levelRows = games.map((g) => h('div', { class: 'row', style: { justifyContent: 'space-between' } },
    h('span', {}, `${g.emoji} ${g.name}`),
    segmented([1, 2, 3, 4, 5].map((n) => [n, String(n), LEVELS[n]]), data.levels[g.id] ?? 3, (v) => { data.levels[g.id] = v; }, `Nivel ${g.name}`)));

  const form = h('form', { class: 'dlg', novalidate: true },
    h('h2', {}, player ? `Editezi pe ${player.name}` : 'Jucător nou'),
    h('label', { class: 'field', for: 'pname' }, 'Nume', name),
    h('div', { class: 'field' }, h('span', {}, 'Culoare'), sw),
    h('div', {}, h('h3', {}, 'Cum se descurcă'), h('p', { class: 'muted small' }, 'Trăsăturile decid ce rol i se potrivește în fiecare joc.'), h('div', { class: 'grid cols-2' }, sliders)),
    h('div', {}, h('h3', {}, 'Nivel la fiecare joc'), h('p', { class: 'muted small' }, '1 = începător, 5 = expert. Valoarea implicită este 3.'), h('div', { class: 'stack' }, levelRows)),
    err,
    h('div', { class: 'dlg-actions' },
      h('button', { class: 'btn', type: 'button', onclick: () => close() }, 'Anulează'),
      h('button', { class: 'btn primary', type: 'submit' }, 'Salvează')));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.textContent = '';
    const payload = { ...data, name: name.value };
    // trimitem și nivelurile implicite alese, ca să fie salvate explicit
    for (const g of games) payload.levels[g.id] ??= 3;
    try {
      if (player) await api.updatePlayer(player.id, payload); else await api.addPlayer(payload);
      close();
      toast(player ? 'Modificările au fost salvate' : `${payload.name.trim()} a fost adăugat`);
      onSaved();
    } catch (ex) { err.textContent = ex.message; }
  });
  const close = openDialog(form);
  name.focus();
}
