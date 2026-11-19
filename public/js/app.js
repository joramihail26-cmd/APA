import { h, clear, loading, toast, icon } from './ui.js';
import { installSparks } from './fx/canvas.js';
import { cover } from './fx/wipe.js';
import { magnet } from './fx/pointer.js';

const ROUTES = [
  { path: '/', label: 'Acasă', icon: 'home', load: () => import('./views/home.js') },
  { path: '/players', label: 'Jucători', icon: 'users', load: () => import('./views/players.js') },
  { path: '/games', label: 'Jocuri', icon: 'dice', load: () => import('./views/games.js') },
  { path: '/new', label: 'Seară nouă', icon: 'play', load: () => import('./views/wizard.js') },
  { path: '/planner', label: 'Planificator', icon: 'route', load: () => import('./views/planner.js') },
  { path: '/stats', label: 'Clasament', icon: 'trophy', load: () => import('./views/stats.js') },
  { path: '/algorithms', label: 'Algoritmi', icon: 'chip', load: () => import('./views/algorithms.js') },
];
const SESSION = { load: () => import('./views/session.js') };
const route = (p) => ROUTES.find((r) => r.path === p);

const main = document.getElementById('main');
const nav = document.getElementById('nav');
const deck = document.getElementById('deck');
const root = document.documentElement;
let token = 0;
let first = true;

// ---------- navigația de pe desktop: butoane de cabinet + START ----------
function drawNav(active) {
  clear(nav);
  for (const r of ROUTES.filter((x) => x.path !== '/new')) {
    nav.append(h('a', { class: 'navbtn', href: `#${r.path}`, 'aria-current': r.path === active ? 'page' : false }, r.label));
  }
  const start = h('a', { class: 'btn primary small', href: '#/new', 'aria-current': active === '/new' ? 'page' : false }, icon('play'), 'Seară nouă');
  nav.append(h('span', { class: 'star start-wrap', style: { marginLeft: '12px' } }, magnet(start, { padding: 30, strength: 6 })));
}

// ---------- panoul de control de jos (telefon) ----------
const moreMenu = h('div', { class: 'more-menu', id: 'more-menu', popover: 'auto', role: 'menu', 'aria-label': 'Mai multe pagini' });
document.body.append(moreMenu);
moreMenu.addEventListener('click', (e) => { if (e.target.closest('a')) moreMenu.hidePopover(); });

function drawDeck(active) {
  clear(deck);
  const btn = (p) => { const r = route(p); return h('a', { class: 'deckbtn', href: `#${p}`, 'aria-current': p === active ? 'page' : false }, icon(r.icon), h('span', {}, r.label)); };
  const extra = ['/games', '/planner', '/algorithms'];
  deck.append(
    btn('/'), btn('/players'),
    h('a', { class: 'deck-coin', href: '#/new', 'aria-label': 'Seară nouă', 'aria-current': active === '/new' ? 'page' : false },
      h('span', { 'aria-hidden': 'true' }, 'START'), h('span', { 'aria-hidden': 'true' }, 'Seară')),
    btn('/stats'),
    h('button', { class: 'deckbtn', type: 'button', popovertarget: 'more-menu', 'aria-haspopup': 'menu', 'aria-current': extra.includes(active) ? 'page' : false },
      icon('more'), h('span', {}, 'Mai mult')));
  clear(moreMenu).append(
    ...extra.map((p) => { const r = route(p); return h('a', { href: `#${p}`, role: 'menuitem', 'aria-current': p === active ? 'page' : false }, icon(r.icon), r.label); }),
    h('button', { type: 'button', role: 'menuitem', onclick: () => { toggleTheme(); moreMenu.hidePopover(); } }, icon(isDark() ? 'sun' : 'moon'), isDark() ? 'Temă deschisă' : 'Temă închisă'));
}

// ---------- randare cu tranziție pixel ----------
async function render() {
  const mine = ++token;
  const hash = location.hash.replace(/^#/, '') || '/';
  const sess = hash.match(/^\/session\/(\d+)$/);
  const r = sess ? SESSION : route(hash) || ROUTES[0];
  const active = sess ? '/stats' : r.path;
  drawNav(active); drawDeck(active);

  const uncoverP = first ? Promise.resolve(null) : cover();
  if (first) clear(main).append(loading());
  try {
    const viewP = r.load().then((mod) => mod.render(sess ? Number(sess[1]) : undefined));
    // dacă datele întârzie, descoperim ecranul pe starea de încărcare
    const uncover = await uncoverP;
    const view = await Promise.race([viewP, new Promise((res) => setTimeout(() => res(null), 650))]);
    if (mine !== token) { uncover && uncover(); return; }
    if (view) clear(main).append(view);
    else { clear(main).append(loading()); }
    window.scrollTo(0, 0);
    uncover && uncover();
    const done = view || await viewP;
    if (mine !== token) return;
    if (!view) clear(main).append(done);
    document.title = `${sess ? 'Seara' : r.label} · GameNight Master`;
    if (!first) main.focus({ preventScroll: true });
  } catch (e) {
    if (mine !== token) return;
    clear(main).append(h('div', { class: 'panel empty', role: 'alert' }, h('span', { class: 'insert-coin' }, 'ERROR'), h('h3', {}, 'Ceva nu a mers'), h('p', { class: 'muted' }, e.message), h('a', { class: 'btn', href: '#/' }, 'Înapoi acasă')));
    toast(e.message, 'error');
  } finally { first = false; }
}

// ---------- temă ----------
const isDark = () => (root.dataset.theme || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')) === 'dark';
const themeBtn = document.getElementById('theme');
function drawThemeBtn() {
  clear(themeBtn).append(icon(isDark() ? 'sun' : 'moon'));
  themeBtn.setAttribute('aria-label', isDark() ? 'Treci la tema deschisă' : 'Treci la tema închisă');
}
function toggleTheme() {
  const next = isDark() ? 'light' : 'dark';
  root.dataset.theme = next;
  try { localStorage.setItem('theme', next); } catch { /* ignorat */ }
  drawThemeBtn();
  drawDeck(location.hash.replace(/^#/, '') || '/');
}
try { const t = localStorage.getItem('theme'); if (t) root.dataset.theme = t; } catch { /* ignorat */ }
themeBtn.addEventListener('click', toggleTheme);
drawThemeBtn();

installSparks();
addEventListener('hashchange', render);
render();
