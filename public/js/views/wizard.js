import { api } from '../api.js';
import { h, clear, avatar, empty, toast, segmented, LEVELS, pips, formToggle, icon, stagger } from '../ui.js';
import { cartridge } from './games.js';
import { countUp } from '../fx/text.js';

// Starea asistentului rămâne între pagini, ca să nu se piardă alegerile la o navigare accidentală.
const draft = { step: 1, playerIds: new Set(), gameId: null, teamCount: 2, rules: [], cycles: 1, proposal: null, names: [] };
const STAGES = ['Jucători', 'Joc și niveluri', 'Echipe și reguli', 'VS'];

export function preset({ playerIds, gameId }) {
  draft.playerIds = new Set(playerIds);
  draft.gameId = gameId ?? null;
  draft.step = gameId ? 2 : 1;
  draft.proposal = null;
  draft.rules = [];
  draft.names = [];
}

export async function render() {
  const [players, games] = await Promise.all([api.players(), api.games()]);
  const known = new Set(players.map((p) => p.id));
  draft.playerIds = new Set([...draft.playerIds].filter((id) => known.has(id)));
  if (draft.gameId && !games.some((g) => g.id === draft.gameId)) draft.gameId = null;

  const root = h('div', { class: 'stack' });
  const body = h('div', { class: 'stack' });
  const stagesBar = h('ol', { class: 'stages', style: { listStyle: 'none', margin: 0 } });
  const title = h('h1', {});
  root.append(h('div', { class: 'page-head' }, h('div', {}, h('span', { class: 'eyebrow' }, 'Seară nouă'), title)), stagesBar, body);

  const go = (n) => { draft.step = n; draw(); window.scrollTo(0, 0); };
  const selected = () => players.filter((p) => draft.playerIds.has(p.id));
  const game = () => games.find((g) => g.id === draft.gameId);
  const invalidate = () => { draft.proposal = null; };

  function drawStages() {
    clear(stagesBar);
    STAGES.forEach((t, i) => {
      const n = i + 1;
      stagesBar.append(h('li', { class: `stage ${draft.step === n ? 'on' : ''} ${draft.step > n ? 'done' : ''}`, 'aria-current': draft.step === n ? 'step' : false },
        h('span', { class: 'label' }, draft.step > n ? `Stage ${n} ✓` : `Stage ${n}`), h('b', {}, t)));
    });
    title.textContent = ['', 'Cine joacă?', 'Ce jucați?', 'Echipe și reguli', 'Echipele sunt gata'][draft.step];
  }

  function draw() {
    drawStages();
    clear(body);
    if (!players.length) {
      body.append(empty('👥', 'Nu ai jucători', 'Adaugă mai întâi prietenii care vin la seară.', h('a', { class: 'btn primary', href: '#/players' }, 'Mergi la jucători')));
      return;
    }
    [null, step1, step2, step3, step4][draft.step]();
  }

  // ---------- STAGE 1: character select ----------
  function step1() {
    const count = h('b', { class: 'time-out', style: { fontSize: '1.5rem' } }, draft.playerIds.size);
    const grid = h('div', { class: 'select-grid' });
    const next = h('button', { class: 'btn primary', type: 'button', onclick: () => go(2) }, 'Continuă', icon('play'));
    const hint = h('span', { class: 'muted small' });
    const sync = () => {
      count.textContent = String(draft.playerIds.size).padStart(2, '0');
      const ok = draft.playerIds.size >= 2;
      next.disabled = !ok;
      hint.textContent = ok ? (draft.playerIds.size < 4 ? 'Pentru jocuri în echipe sunt potriviți 4 sau mai mulți.' : '') : 'Alege cel puțin 2 jucători.';
    };
    const order = () => [...draft.playerIds];
    const drawGrid = () => {
      clear(grid);
      for (const p of players) {
        const on = draft.playerIds.has(p.id);
        grid.append(h('button', { type: 'button', class: 'pick-tile', 'aria-pressed': String(on), onclick: () => {
          if (draft.playerIds.has(p.id)) draft.playerIds.delete(p.id); else draft.playerIds.add(p.id);
          invalidate(); drawGrid(); sync();
        } },
          h('span', { class: 'pn', 'aria-hidden': 'true' }, on ? `P${order().indexOf(p.id) + 1}` : ''),
          avatar(p, 'lg'), h('span', { class: 'nm' }, p.name), h('span', { class: 'ready', 'aria-hidden': 'true' }, on ? 'READY' : 'PRESS')));
      }
    };
    drawGrid(); sync();
    body.append(
      h('div', { class: 'row' },
        h('button', { class: 'btn small', type: 'button', onclick: () => { players.forEach((p) => draft.playerIds.add(p.id)); invalidate(); drawGrid(); sync(); } }, 'Toți'),
        h('button', { class: 'btn small ghost', type: 'button', onclick: () => { draft.playerIds.clear(); invalidate(); drawGrid(); sync(); } }, 'Niciunul'),
        h('span', { class: 'label', style: { marginLeft: 'auto' } }, 'Aleși ', count)),
      grid,
      h('div', { class: 'actions' }, hint, h('span', { class: 'push' }, next)));
  }

  // ---------- STAGE 2: cartușul și nivelurile ----------
  function step2() {
    const carts = h('div', { class: 'carts' });
    const levelsBox = h('div', { class: 'panel stack-sm' });
    const next = h('button', { class: 'btn primary', type: 'button', onclick: () => go(3) }, 'Continuă', icon('play'));
    const n = draft.playerIds.size;

    const drawCarts = () => {
      clear(carts);
      for (const g of games) {
        const off = n < g.min_players || n > g.max_players;
        carts.append(cartridge(g, {
          pressed: g.id === draft.gameId,
          onPick: () => { draft.gameId = g.id; invalidate(); drawCarts(); drawLevels(); },
          extra: g.id === draft.gameId ? h('span', { class: 'insert' }, '▶ Inserted')
            : off ? h('span', { class: 'chip', style: { color: 'var(--bad)' } }, `recomandat ${g.min_players}–${g.max_players} jucători`) : null,
        }));
      }
    };
    const drawLevels = () => {
      clear(levelsBox);
      next.disabled = !draft.gameId;
      const g = game();
      if (!g) { levelsBox.append(h('p', { class: 'muted' }, 'Alege un joc, apoi setezi nivelul fiecărui jucător la el.')); return; }
      levelsBox.append(h('h3', {}, `Nivel la ${g.name}`), h('p', { class: 'muted small' }, 'Nivelul decide cât de puternic e jucătorul la formarea echipelor. Se salvează imediat.'),
        h('div', { class: 'level-list' }, selected().map((p) => h('div', { class: 'level-row' },
          h('span', {}, avatar(p, 'sm'), p.name),
          segmented([1, 2, 3, 4, 5].map((v) => [v, String(v), LEVELS[v]]), p.levels[g.id] ?? 3, async (v) => {
            try { await api.setLevels(p.id, { [g.id]: v }); p.levels[g.id] = v; invalidate(); toast(`${p.name}: ${LEVELS[v]}`); }
            catch (e) { toast(e.message, 'error'); }
          }, `Nivel ${p.name}`)))));
    };
    drawCarts(); drawLevels();
    body.append(carts, levelsBox,
      h('div', { class: 'actions' }, h('button', { class: 'btn ghost', type: 'button', onclick: () => go(1) }, 'Înapoi'), h('span', { class: 'push' }, next)));
  }

  // ---------- STAGE 3: echipe și reguli ----------
  function step3() {
    const n = draft.playerIds.size;
    const maxTeams = Math.min(8, n);
    draft.teamCount = Math.min(Math.max(2, draft.teamCount), maxTeams);
    draft.rules = draft.rules.filter((r) => r.type !== 'team' || r.team < draft.teamCount);

    const sizes = h('span', { class: 'label' });
    const rulesBox = h('div', { class: 'stack-sm' });
    const hint = h('p', { class: 'muted small' });
    const err = h('div', { class: 'err', role: 'alert' });
    const calc = h('button', { class: 'btn primary', type: 'button' }, 'Calculează echipele');

    const sizeText = () => {
      const base = Math.floor(n / draft.teamCount); const extra = n % draft.teamCount;
      return Array.from({ length: draft.teamCount }, (_, i) => base + (i < extra ? 1 : 0)).join(' + ');
    };
    const countSeg = h('div');
    const drawCount = () => {
      clear(countSeg).append(segmented(Array.from({ length: maxTeams - 1 }, (_, i) => [i + 2, String(i + 2)]), draft.teamCount, (v) => {
        draft.teamCount = v; draft.rules = draft.rules.filter((r) => r.type !== 'team' || r.team < v); invalidate(); sizes.textContent = `Dimensiuni ${sizeText()}`; drawRules(); drawHint(); drawRuleForm();
      }, 'Număr de echipe'));
      sizes.textContent = `Dimensiuni ${sizeText()}`;
    };
    const drawHint = () => { hint.textContent = draft.rules.length
      ? 'Cu reguli stricte rulează Branch and Bound: caută cea mai echilibrată împărțire care le respectă pe toate.'
      : 'Fără reguli rulează Bitmask DP: verifică toate împărțirile posibile și o alege pe cea mai echilibrată.'; };

    const name = (id) => players.find((p) => p.id === id)?.name ?? '?';
    const ruleText = (r) => r.type === 'separate' ? `${name(r.a)} și ${name(r.b)} nu pot fi în aceeași echipă`
      : r.type === 'together' ? `${name(r.a)} și ${name(r.b)} trebuie să fie împreună`
      : `${name(r.a)} trebuie să fie în echipa ${r.team + 1}`;
    function drawRules() {
      clear(rulesBox);
      if (!draft.rules.length) rulesBox.append(h('p', { class: 'muted small' }, 'Nicio regulă. Împărțirea se face doar după nivel.'));
      draft.rules.forEach((r, i) => rulesBox.append(h('div', { class: 'rule' }, h('span', { class: 'grow' }, ruleText(r)),
        h('button', { class: 'x', type: 'button', 'aria-label': `Șterge regula: ${ruleText(r)}`, onclick: () => { draft.rules.splice(i, 1); invalidate(); drawRules(); drawHint(); } }, '✕'))));
    }

    const ruleForm = h('div', { class: 'row tight' });
    function drawRuleForm() {
      clear(ruleForm);
      const sel = selected();
      const type = h('select', { 'aria-label': 'Tip regulă' },
        h('option', { value: 'separate' }, 'nu pot fi împreună'), h('option', { value: 'together' }, 'trebuie să fie împreună'), h('option', { value: 'team' }, 'trebuie să fie în echipa'));
      const a = h('select', { 'aria-label': 'Primul jucător' }, sel.map((p) => h('option', { value: p.id }, p.name)));
      const b = h('select', { 'aria-label': 'Al doilea jucător' }, sel.map((p, i) => h('option', { value: p.id, selected: i === 1 }, p.name)));
      const t = h('select', { 'aria-label': 'Echipa', hidden: true }, Array.from({ length: draft.teamCount }, (_, i) => h('option', { value: i }, `Echipa ${i + 1}`)));
      type.addEventListener('change', () => { const isTeam = type.value === 'team'; b.hidden = isTeam; t.hidden = !isTeam; });
      ruleForm.append(a, type, b, t, h('button', { class: 'btn', type: 'button', onclick: () => {
        err.textContent = '';
        const rule = type.value === 'team' ? { type: 'team', a: Number(a.value), team: Number(t.value) } : { type: type.value, a: Number(a.value), b: Number(b.value) };
        if (rule.type !== 'team' && rule.a === rule.b) { err.textContent = 'Alege doi jucători diferiți.'; return; }
        if (draft.rules.some((r) => JSON.stringify(r) === JSON.stringify(rule))) { err.textContent = 'Regula există deja.'; return; }
        draft.rules.push(rule); invalidate(); drawRules(); drawHint();
      } }, icon('plus'), 'Adaugă regula'));
      ruleForm.querySelectorAll('select').forEach((s) => { s.style.flex = '1 1 160px'; s.style.width = 'auto'; });
    }

    calc.addEventListener('click', async () => {
      err.textContent = '';
      formToggle(calc, true);
      try {
        draft.proposal = await api.propose({ playerIds: [...draft.playerIds], gameId: draft.gameId, teamCount: draft.teamCount, constraints: draft.rules, method: draft.rules.length ? 'constrained' : 'balanced' });
        if (draft.names.length !== draft.teamCount) draft.names = (await api.teamNames(draft.teamCount)).names;
        go(4);
      } catch (e) { err.textContent = e.message; formToggle(calc, false); }
    });

    drawCount(); drawRules(); drawHint(); drawRuleForm();
    body.append(
      h('div', { class: 'grid cols-2', style: { alignItems: 'start' } },
        h('section', { class: 'panel stack-sm' }, h('h3', {}, 'Câte echipe?'), countSeg, sizes),
        h('section', { class: 'panel stack-sm' }, h('h3', {}, 'Câte manșe?'), h('p', { class: 'muted small' }, 'De câte ori joacă fiecare echipă cu fiecare.'),
          segmented([1, 2, 3, 4, 5].map((v) => [v, String(v)]), draft.cycles, (v) => { draft.cycles = v; }, 'Manșe'))),
      h('section', { class: 'panel stack-sm' }, h('h3', {}, 'Reguli stricte (opțional)'),
        h('p', { class: 'muted small' }, 'Pentru frați, rivali sau cupluri care vor să joace împreună.'), rulesBox, ruleForm, hint),
      err,
      h('div', { class: 'actions' }, h('button', { class: 'btn ghost', type: 'button', onclick: () => go(2) }, 'Înapoi'), h('span', { class: 'push' }, calc)));
  }

  // ---------- STAGE 4: ecranul VS ----------
  function step4() {
    const p = draft.proposal;
    if (!p) { go(3); return; }
    const g = game();
    const gain = p.baseline > 0 ? Math.round((1 - p.deviation / p.baseline) * 100) : 0;
    const err = h('div', { class: 'err', role: 'alert' });
    const start = h('button', { class: 'btn primary huge', type: 'button' }, icon('play'), 'Începe seara');
    const duel = p.teams.length === 2;

    const stage = h('div', { class: `vs-stage ${duel ? 'duel' : 'many'}` });
    const teamCard = (t, i) => {
      const input = h('input', { type: 'text', value: draft.names[i] ?? `Echipa ${i + 1}`, maxlength: 28, 'aria-label': `Numele echipei ${i + 1}`, oninput: (e) => { draft.names[i] = e.target.value; } });
      return h('article', { class: 'panel team', style: { '--tc': t.color, '--i': i, '--from': duel && i === 1 ? '48px' : '-48px' } },
        h('div', { class: 'team-banner' }, input,
          h('span', { class: 'power' }, 'Putere ', h('b', {}, t.sum), ' · medie ', h('b', {}, t.avg), ` · ${t.players.length} jucători`)),
        t.players.map((pl, j) => h('div', { class: 'member', style: { '--i': i, '--j': j } }, avatar(pl, 'sm'),
          h('div', { style: { minWidth: 0 } }, h('div', { class: 'who' }, pl.name), h('div', { class: 'role' }, pl.role)),
          h('div', { style: { display: 'grid', justifyItems: 'end', gap: '4px' } }, pips(pl.level), h('span', { class: 'aff' }, `potrivire ${pl.affinity}%`)))));
    };
    const drawTeams = () => {
      clear(stage);
      if (duel) stage.append(teamCard(p.teams[0], 0), h('div', { class: 'vs-mark', 'aria-hidden': 'true' }, 'VS'), teamCard(p.teams[1], 1));
      else stage.append(h('div', { class: 'vs-mark', 'aria-hidden': 'true' }, 'VS'), ...p.teams.map(teamCard));
    };
    drawTeams();

    start.addEventListener('click', async () => {
      err.textContent = '';
      formToggle(start, true);
      try {
        const s = await api.createSession({
          gameId: g.id, method: p.method, cycles: draft.cycles,
          teams: p.teams.map((t, i) => ({ name: draft.names[i], color: t.color, players: t.players.map((pl) => ({ id: pl.id, role: pl.role })) })),
        });
        draft.proposal = null; draft.names = []; draft.step = 1;
        location.hash = `#/session/${s.id}`;
      } catch (e) { err.textContent = e.message; formToggle(start, false); }
    });

    const st = p.stats;
    const big = (cls, value, fmt) => { const b = h('b', { class: cls }, '0'); countUp(b, value, { delay: 700, format: fmt }); return b; };
    body.append(
      h('div', { class: 'vs-head' }, h('span', { class: 'chip led hot' }, `${g.emoji} ${g.name}`), h('span', { class: 'chip led' }, p.algorithm.name),
        h('span', { class: 'grow' }), h('button', { class: 'btn small', type: 'button', onclick: async () => { try { draft.names = (await api.teamNames(p.teams.length)).names; drawTeams(); } catch (e) { toast(e.message, 'error'); } } }, 'Alte nume')),
      h('p', { class: 'muted small' }, 'Numele echipelor se pot scrie direct în bannere.'),
      stage,
      h('section', { class: 'panel stack-sm' },
        h('div', { class: 'compare' },
          h('div', {}, h('span', { class: 'label' }, 'Diferență'), big('good', p.deviation)),
          h('div', {}, h('span', { class: 'label' }, 'La întâmplare'), big('bad', p.baseline)),
          h('div', {}, h('span', { class: 'label' }, 'Mai echilibrat'), big('', Math.max(0, gain), (n) => `${n}%`)),
          h('div', {}, h('span', { class: 'label' }, 'Calcul'), big('', st.ms, (n) => `${n} ms`))),
        h('details', {}, h('summary', { class: 'muted small' }, 'Detalii despre calcul'),
          h('dl', { class: 'kv' },
            h('dt', {}, 'Algoritm echipe'), h('dd', {}, `${p.algorithm.name}, ${p.algorithm.complexity}`),
            st.states != null && [h('dt', {}, 'Stări memorate'), h('dd', {}, st.states.toLocaleString('ro'))],
            st.nodes != null && [h('dt', {}, 'Noduri explorate'), h('dd', {}, st.nodes.toLocaleString('ro'))],
            st.pruned != null && [h('dt', {}, 'Ramuri tăiate'), h('dd', {}, st.pruned.toLocaleString('ro'))],
            h('dt', {}, 'Roluri'), h('dd', {}, `Kuhn-Munkres, ${st.roleSteps} pași, afinitate totală ${st.roleAffinity}`)))),
      err,
      h('div', { class: 'actions' }, h('button', { class: 'btn ghost', type: 'button', onclick: () => go(3) }, 'Înapoi la reguli'), h('span', { class: 'push' }, start)));
  }

  draw();
  stagger(body, 6);
  return root;
}
