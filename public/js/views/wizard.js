import { api } from '../api.js';
import { h, clear, avatar, empty, toast, segmented, LEVELS, stars, formToggle } from '../ui.js';

// Starea asistentului rămâne între pagini, ca să nu se piardă alegerile la o navigare accidentală.
const draft = { step: 1, playerIds: new Set(), gameId: null, teamCount: 2, rules: [], cycles: 1, proposal: null, names: [] };

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
  // curăță alegeri care nu mai există
  const known = new Set(players.map((p) => p.id));
  draft.playerIds = new Set([...draft.playerIds].filter((id) => known.has(id)));
  if (draft.gameId && !games.some((g) => g.id === draft.gameId)) draft.gameId = null;

  const root = h('div', { class: 'stack' });
  const body = h('div');
  const stepsBar = h('div', { class: 'steps', role: 'list' });
  root.append(h('div', { class: 'page-head' }, h('div', {}, h('h1', {}, 'Seară nouă'), h('p', { class: 'muted' }, 'Patru pași până la prima rundă.'))), stepsBar, body);

  const go = (n) => { draft.step = n; draw(); window.scrollTo(0, 0); };
  const selected = () => players.filter((p) => draft.playerIds.has(p.id));
  const game = () => games.find((g) => g.id === draft.gameId);
  const invalidate = () => { draft.proposal = null; };

  function drawSteps() {
    clear(stepsBar);
    ['Jucători', 'Joc și niveluri', 'Echipe și reguli', 'Rezultat'].forEach((t, i) => {
      const n = i + 1;
      stepsBar.append(h('div', { class: `step ${draft.step === n ? 'on' : ''} ${draft.step > n ? 'done' : ''}`, role: 'listitem', 'aria-current': draft.step === n ? 'step' : false }, h('i', {}, draft.step > n ? '✓' : n), t));
    });
  }

  function draw() {
    drawSteps();
    clear(body);
    if (!players.length) {
      body.append(empty('👥', 'Nu ai jucători', 'Adaugă mai întâi prietenii care vin la seară.', h('a', { class: 'btn primary', href: '#/players' }, 'Mergi la jucători')));
      return;
    }
    [null, step1, step2, step3, step4][draft.step]();
  }

  // ---------- pasul 1 ----------
  function step1() {
    const count = h('b', {}, draft.playerIds.size);
    const list = h('div', { class: 'row' });
    const next = h('button', { class: 'btn primary', type: 'button', onclick: () => go(2) }, 'Continuă');
    const sync = () => { count.textContent = draft.playerIds.size; next.disabled = draft.playerIds.size < 2; };
    const drawList = () => {
      clear(list);
      for (const p of players) {
        const on = draft.playerIds.has(p.id);
        list.append(h('button', { type: 'button', class: 'chip pick', 'aria-pressed': String(on), onclick: () => {
          if (draft.playerIds.has(p.id)) draft.playerIds.delete(p.id); else draft.playerIds.add(p.id);
          invalidate(); drawList(); sync();
        } }, avatar(p, 'sm'), p.name));
      }
    };
    drawList(); sync();
    body.append(h('section', { class: 'card stack' },
      h('h2', {}, 'Cine joacă în seara asta?'),
      h('div', { class: 'row' },
        h('button', { class: 'btn small', type: 'button', onclick: () => { players.forEach((p) => draft.playerIds.add(p.id)); invalidate(); drawList(); sync(); } }, 'Toți'),
        h('button', { class: 'btn small', type: 'button', onclick: () => { draft.playerIds.clear(); invalidate(); drawList(); sync(); } }, 'Niciunul'),
        h('span', { class: 'muted' }, 'Aleși: ', count)),
      list,
      h('div', { class: 'row' }, next, h('span', { class: 'muted small' }, 'Minim 2 jucători; pentru jocuri în echipe sunt potrivite 4 sau mai mulți.'))));
  }

  // ---------- pasul 2 ----------
  function step2() {
    const cards = h('div', { class: 'grid cols-3' });
    const levelsBox = h('div');
    const next = h('button', { class: 'btn primary', type: 'button', onclick: () => go(3) }, 'Continuă');
    const n = draft.playerIds.size;

    const drawCards = () => {
      clear(cards);
      for (const g of games) {
        const off = n < g.min_players || n > g.max_players;
        cards.append(h('button', { type: 'button', class: 'card game-card', 'aria-pressed': String(g.id === draft.gameId), onclick: () => { draft.gameId = g.id; invalidate(); drawCards(); drawLevels(); } },
          h('div', { class: 'row' }, h('span', { class: 'emoji' }, g.emoji), h('b', {}, g.name)),
          h('span', { class: 'muted small' }, `${g.min_players}–${g.max_players} jucători · ${g.duration} min`),
          off && h('span', { class: 'chip', style: { color: 'var(--bad)' } }, `recomandat ${g.min_players}–${g.max_players} jucători`)));
      }
    };
    const drawLevels = () => {
      clear(levelsBox);
      next.disabled = !draft.gameId;
      const g = game();
      if (!g) { levelsBox.append(h('p', { class: 'muted' }, 'Alege un joc ca să setezi nivelul fiecărui jucător.')); return; }
      levelsBox.append(h('h3', {}, `Nivel la ${g.name}`), h('p', { class: 'muted small' }, 'Nivelul decide cât de puternic este jucătorul la formarea echipelor. Se salvează imediat.'),
        h('div', { class: 'stack' }, selected().map((p) => h('div', { class: 'row', style: { justifyContent: 'space-between' } },
          h('span', { class: 'row' }, avatar(p, 'sm'), p.name),
          segmented([1, 2, 3, 4, 5].map((v) => [v, String(v), LEVELS[v]]), p.levels[g.id] ?? 3, async (v) => {
            try { await api.setLevels(p.id, { [g.id]: v }); p.levels[g.id] = v; invalidate(); toast(`${p.name}: ${LEVELS[v]}`); }
            catch (e) { toast(e.message, 'error'); }
          }, `Nivel ${p.name}`)))));
    };
    drawCards(); drawLevels();
    body.append(h('section', { class: 'stack' }, h('h2', {}, 'Ce jucați?'), cards, h('div', { class: 'card' }, levelsBox),
      h('div', { class: 'row' }, h('button', { class: 'btn', type: 'button', onclick: () => go(1) }, 'Înapoi'), next)));
  }

  // ---------- pasul 3 ----------
  function step3() {
    const n = draft.playerIds.size;
    const maxTeams = Math.min(8, n);
    draft.teamCount = Math.min(Math.max(2, draft.teamCount), maxTeams);
    draft.rules = draft.rules.filter((r) => r.type !== 'team' || r.team < draft.teamCount);

    const sizes = h('span', { class: 'muted' });
    const rulesBox = h('div', { class: 'stack' });
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
        draft.teamCount = v; draft.rules = draft.rules.filter((r) => r.type !== 'team' || r.team < v); invalidate(); sizes.textContent = `Dimensiuni: ${sizeText()}`; drawRules(); drawHint(); drawRuleForm();
      }, 'Număr de echipe'));
      sizes.textContent = `Dimensiuni: ${sizeText()}`;
    };
    const drawHint = () => { hint.textContent = draft.rules.length
      ? 'Cu reguli stricte rulează Branch and Bound: caută cea mai echilibrată împărțire care le respectă pe toate.'
      : 'Fără reguli rulează Bitmask DP: se verifică toate împărțirile posibile și se alege cea mai echilibrată.'; };

    const name = (id) => players.find((p) => p.id === id)?.name ?? '?';
    const ruleText = (r) => r.type === 'separate' ? `${name(r.a)} și ${name(r.b)} nu pot fi în aceeași echipă`
      : r.type === 'together' ? `${name(r.a)} și ${name(r.b)} trebuie să fie împreună`
      : `${name(r.a)} trebuie să fie în echipa ${r.team + 1}`;
    function drawRules() {
      clear(rulesBox);
      if (!draft.rules.length) rulesBox.append(h('p', { class: 'muted small' }, 'Nicio regulă. Împărțirea se face doar după nivel.'));
      draft.rules.forEach((r, i) => rulesBox.append(h('div', { class: 'rule' }, h('span', { class: 'grow' }, ruleText(r)),
        h('button', { class: 'x', type: 'button', 'aria-label': 'Șterge regula', onclick: () => { draft.rules.splice(i, 1); invalidate(); drawRules(); drawHint(); } }, '✕'))));
    }

    const ruleForm = h('div', { class: 'row' });
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
        const dup = draft.rules.some((r) => JSON.stringify(r) === JSON.stringify(rule));
        if (dup) { err.textContent = 'Regula există deja.'; return; }
        draft.rules.push(rule); invalidate(); drawRules(); drawHint();
      } }, 'Adaugă regula'));
      ruleForm.querySelectorAll('select').forEach((s) => { s.style.flex = '1 1 150px'; });
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
    body.append(h('section', { class: 'stack' }, h('h2', {}, 'Echipe și reguli'),
      h('div', { class: 'card stack' }, h('h3', {}, 'Câte echipe?'), countSeg, sizes),
      h('div', { class: 'card stack' }, h('h3', {}, 'Reguli stricte (opțional)'),
        h('p', { class: 'muted small' }, 'Folosește-le pentru perechi care se știu prea bine, frați, rivali sau cuplu care joacă împreună.'), rulesBox, ruleForm, hint),
      h('div', { class: 'card' }, h('div', { class: 'field' }, 'Câte manșe? (de câte ori joacă fiecare echipă cu fiecare)',
        segmented([1, 2, 3, 4, 5].map((v) => [v, String(v)]), draft.cycles, (v) => { draft.cycles = v; }, 'Manșe'))),
      err,
      h('div', { class: 'row' }, h('button', { class: 'btn', type: 'button', onclick: () => go(2) }, 'Înapoi'), calc)));
  }

  // ---------- pasul 4 ----------
  function step4() {
    const p = draft.proposal;
    if (!p) { go(3); return; }
    const g = game();
    const gain = p.baseline > 0 ? Math.round((1 - p.deviation / p.baseline) * 100) : 0;
    const err = h('div', { class: 'err', role: 'alert' });
    const start = h('button', { class: 'btn primary', type: 'button' }, 'Începe seara');

    const teamsGrid = h('div', { class: 'grid cols-2' });
    const drawTeams = () => {
      clear(teamsGrid);
      p.teams.forEach((t, i) => {
        const input = h('input', { type: 'text', value: draft.names[i] ?? `Echipa ${i + 1}`, maxlength: 28, 'aria-label': `Numele echipei ${i + 1}`, oninput: (e) => { draft.names[i] = e.target.value; } });
        teamsGrid.append(h('article', { class: 'card team', style: { '--tc': t.color } },
          h('div', { class: 'team-head' }, input),
          h('p', { class: 'muted small' }, `Putere totală ${t.sum} · medie ${t.avg} · ${t.players.length} jucători`),
          t.players.map((pl) => h('div', { class: 'member' }, avatar(pl, 'sm'),
            h('div', { class: 'who' }, pl.name, h('div', { class: 'role' }, pl.role, ` · potrivire ${pl.affinity}%`)),
            h('span', { class: 'lv', title: LEVELS[pl.level] }, stars(pl.level))))));
      });
    };
    drawTeams();

    start.addEventListener('click', async () => {
      err.textContent = '';
      start.disabled = true;
      try {
        const s = await api.createSession({
          gameId: g.id, method: p.method, cycles: draft.cycles,
          teams: p.teams.map((t, i) => ({ name: draft.names[i], color: t.color, players: t.players.map((pl) => ({ id: pl.id, role: pl.role })) })),
        });
        draft.proposal = null; draft.names = []; draft.step = 1;
        location.hash = `#/session/${s.id}`;
      } catch (e) { err.textContent = e.message; start.disabled = false; }
    });

    const st = p.stats;
    body.append(h('section', { class: 'stack' },
      h('div', { class: 'row' }, h('h2', { style: { margin: 0 } }, `${g.emoji} ${g.name}`), h('span', { class: 'chip accent' }, p.algorithm.name)),
      h('div', { class: 'card' }, h('div', { class: 'compare' },
        h('div', {}, h('span', { class: 'muted small' }, 'Diferență între echipe'), h('b', { class: 'good' }, p.deviation)),
        h('div', {}, h('span', { class: 'muted small' }, 'La întâmplare, în medie'), h('b', { class: 'bad' }, p.baseline)),
        h('div', {}, h('span', { class: 'muted small' }, 'Mai echilibrat cu'), h('b', {}, `${Math.max(0, gain)}%`)),
        h('div', {}, h('span', { class: 'muted small' }, 'Timp de calcul'), h('b', {}, `${st.ms} ms`))),
        h('details', { style: { marginTop: '12px' } }, h('summary', { class: 'muted small', style: { cursor: 'pointer' } }, 'Detalii despre calcul'),
          h('dl', { class: 'kv', style: { marginTop: '8px' } },
            h('dt', {}, 'Algoritm echipe'), h('dd', {}, `${p.algorithm.name}, ${p.algorithm.complexity}`),
            st.states != null && [h('dt', {}, 'Stări memorate'), h('dd', {}, st.states.toLocaleString('ro'))],
            st.nodes != null && [h('dt', {}, 'Noduri explorate'), h('dd', {}, st.nodes.toLocaleString('ro'))],
            st.pruned != null && [h('dt', {}, 'Ramuri tăiate'), h('dd', {}, st.pruned.toLocaleString('ro'))],
            h('dt', {}, 'Roluri'), h('dd', {}, `Kuhn-Munkres, ${st.roleSteps} pași, afinitate totală ${st.roleAffinity}`)))),
      h('div', { class: 'row' }, h('h3', { style: { margin: 0 } }, 'Numele echipelor'),
        h('button', { class: 'btn small', type: 'button', onclick: async () => { try { draft.names = (await api.teamNames(p.teams.length)).names; drawTeams(); } catch (e) { toast(e.message, 'error'); } } }, 'Alte nume'),
        h('span', { class: 'muted small' }, 'Le poți și scrie direct în carduri.')),
      teamsGrid, err,
      h('div', { class: 'row' }, h('button', { class: 'btn', type: 'button', onclick: () => go(3) }, 'Înapoi la reguli'), start)));
  }

  draw();
  return root;
}
