import { api } from '../api.js';
import { h, formToggle, toast, stagger } from '../ui.js';

const DOCS = [
  { key: 'Kuhn-Munkres', title: 'Kuhn-Munkres', where: 'Atribuirea rolurilor în fiecare echipă',
    how: 'Se construiește o matrice jucători × roluri cu costul 100 − afinitate. Algoritmul menține potențiale pe rânduri și coloane și extinde un cuplaj pe drumuri alternante, până când fiecare jucător are un rol distinct cu cost total minim.' },
  { key: 'Bitmask', title: 'Programare dinamică cu mască de biți', where: 'Echipe echilibrate',
    how: 'Mulțimea jucătorilor încă neașezați este o mască. Pentru fiecare mască se alege submulțimea care formează echipa curentă și se păstrează abaterea maximă minimă. Prima echipă conține mereu cel mai mic jucător rămas când echipele rămase au aceeași mărime, ceea ce elimină soluțiile simetrice.' },
  { key: 'Branch', title: 'Branch and Bound', where: 'Echipe echilibrate cu reguli stricte',
    how: 'Jucătorii sunt așezați pe rând în echipe, în ordinea puterii. O ramură se taie dacă încalcă o regulă sau o capacitate, ori dacă limita inferioară a abaterii nu mai poate depăși cea mai bună soluție găsită. Dacă nicio ramură nu supraviețuiește, regulile sunt contradictorii.' },
  { key: 'Rucsac', title: 'Rucsac 0/1', where: 'Planificatorul serii',
    how: 'Timpul este împărțit în unități de 5 minute. Tabelul dp[i][t] reține satisfacția maximă folosind primele i jocuri în t unități, iar soluția se reconstruiește de la ultimul rând.' },
  { key: 'Round', title: 'Round-robin', where: 'Programul meciurilor',
    how: 'O echipă rămâne fixă, celelalte se rotesc la fiecare etapă. Dacă numărul echipelor e impar se adaugă o pauză. Rezultă k−1 etape (sau k), cu fiecare pereche exact o dată.' },
];

export async function render() {
  const list = await api.algorithms();
  const byKey = (k) => list.find((a) => a.name.includes(k));
  const out = h('div', { 'aria-live': 'polite' });
  const run = h('button', { class: 'btn primary', type: 'button' }, 'Rulează testele');

  run.addEventListener('click', async () => {
    formToggle(run, true);
    try {
      const r = await api.selftest();
      const ok = r.passed === r.total;
      out.replaceChildren(h('div', { class: `panel stack-sm ${ok ? '' : 'hot'}` },
        h('h3', {}, ok ? `Toate cele ${r.total} verificări au trecut` : `${r.passed} din ${r.total} verificări au trecut`),
        stagger(h('ul', { class: 'tests' }, r.groups.map((g) => {
          const pass = g.passed === g.total;
          return h('li', {}, h('span', { class: `st ${pass ? 'good' : 'bad'}` }, pass ? 'PASS' : 'FAIL'), h('span', {}, g.name), h('span', { class: 'label' }, `${g.passed}/${g.total}`));
        }))),
        h('p', { class: 'muted small' }, `Durată ${r.ms} ms. Fiecare algoritm e comparat cu o soluție de forță brută pe instanțe aleatoare.`)));
    } catch (e) { toast(e.message, 'error'); }
    formToggle(run, false);
  });

  return h('div', { class: 'stack' },
    h('div', { class: 'page-head' }, h('div', {}, h('span', { class: 'eyebrow' }, 'How it works'), h('h1', {}, 'Algoritmii'), h('p', { class: 'muted' }, 'Toți sunt exacți și rulează pe server la fiecare seară creată.'))),
    stagger(h('div', { class: 'algo-list' }, DOCS.map((d) => h('article', { class: 'panel algo stack-sm' },
      h('h3', {}, d.title),
      h('p', { class: 'row tight' }, h('span', { class: 'chip led' }, d.where), h('span', { class: 'cx' }, byKey(d.key)?.complexity ?? '')),
      h('p', { class: 'muted' }, d.how))))),
    h('section', { class: 'panel hot stack-sm' }, h('h2', {}, 'Verificare automată'),
      h('p', { class: 'muted' }, 'Rulează acum bateria de teste pe server. Aceleași teste pornesc și cu comanda ', h('code', {}, 'npm test'), '.'), h('div', {}, run)),
    out);
}
