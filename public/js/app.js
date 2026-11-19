import { h, clear, loading, toast } from './ui.js';

const ROUTES = [
  { path: '/', label: 'Acasă', load: () => import('./views/home.js') },
  { path: '/players', label: 'Jucători', load: () => import('./views/players.js') },
  { path: '/games', label: 'Jocuri', load: () => import('./views/games.js') },
  { path: '/new', label: 'Seară nouă', load: () => import('./views/wizard.js') },
  { path: '/planner', label: 'Planificator', load: () => import('./views/planner.js') },
  { path: '/stats', label: 'Clasament', load: () => import('./views/stats.js') },
  { path: '/algorithms', label: 'Algoritmi', load: () => import('./views/algorithms.js') },
];
const SESSION = { load: () => import('./views/session.js') };

const main = document.getElementById('main');
const nav = document.getElementById('nav');
let token = 0;

function drawNav(active) {
  clear(nav);
  for (const r of ROUTES) {
    nav.append(h('a', { href: `#${r.path}`, 'aria-current': r.path === active ? 'page' : false }, r.label));
  }
}

async function render() {
  const mine = ++token;
  const hash = location.hash.replace(/^#/, '') || '/';
  const sess = hash.match(/^\/session\/(\d+)$/);
  const route = sess ? SESSION : ROUTES.find((r) => r.path === hash) || ROUTES[0];
  drawNav(sess ? '/stats' : route.path);
  clear(main).append(loading());
  try {
    const mod = await route.load();
    const view = await mod.render(sess ? Number(sess[1]) : undefined);
    if (mine !== token) return; // între timp s-a schimbat pagina
    clear(main).append(view);
    document.title = `${sess ? 'Seara' : route.label} · GameNight Master`;
    window.scrollTo(0, 0);
  } catch (e) {
    if (mine !== token) return;
    clear(main).append(h('div', { class: 'empty' }, h('h3', {}, 'Ceva nu a mers'), h('p', {}, e.message), h('a', { class: 'btn', href: '#/' }, 'Înapoi acasă')));
    toast(e.message, 'error');
  }
}

// temă
const root = document.documentElement;
try { const t = localStorage.getItem('theme'); if (t) root.dataset.theme = t; } catch { /* ignorat */ }
document.getElementById('theme').addEventListener('click', () => {
  const next = (root.dataset.theme || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')) === 'dark' ? 'light' : 'dark';
  root.dataset.theme = next;
  try { localStorage.setItem('theme', next); } catch { /* ignorat */ }
});

addEventListener('hashchange', render);
render();
