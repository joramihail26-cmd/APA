// ClickSpark (React Bits) și artificiile pixelate pentru HIGH SCORE, pe un singur canvas fix.
import { reduced, token } from './motion.js';

const canvas = () => document.getElementById('fx');
let ctx; let parts = []; let raf = 0; let dpr = 1;

function ensure() {
  const c = canvas();
  if (!c) return false;
  dpr = Math.min(2, devicePixelRatio || 1);
  if (c.width !== innerWidth * dpr || c.height !== innerHeight * dpr) {
    c.width = innerWidth * dpr; c.height = innerHeight * dpr;
  }
  ctx ||= c.getContext('2d');
  return true;
}

function loop() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  parts = parts.filter((p) => p.life > 0);
  for (const p of parts) {
    p.life -= 1; p.x += p.vx; p.y += p.vy; p.vy += p.g; p.vx *= p.drag; p.vy *= p.drag;
    const a = Math.min(1, p.life / p.fade);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.c;
    if (p.kind === 'line') {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.ang);
      ctx.fillRect(0, -1, p.s * a, 2);
      ctx.restore();
    } else {
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s); // pixeli pătrați, ca pe automat
    }
  }
  ctx.globalAlpha = 1;
  if (parts.length) raf = requestAnimationFrame(loop);
  else { raf = 0; ctx.clearRect(0, 0, innerWidth, innerHeight); }
}
const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };

/** Scântei scurte la apăsarea unui buton (8 linii care pleacă din punctul atins). */
export function spark(x, y) {
  if (reduced() || !ensure()) return;
  const c = token('--volt');
  for (let i = 0; i < 8; i++) {
    const ang = (Math.PI * 2 * i) / 8;
    parts.push({ kind: 'line', x, y, vx: Math.cos(ang) * 3.2, vy: Math.sin(ang) * 3.2, g: 0, drag: 0.86, ang, s: 12, c, life: 16, fade: 16 });
  }
  kick();
}

/** Un foc de artificii pixelat. */
export function burst(x, y, colors) {
  if (reduced() || !ensure()) return;
  const n = 46;
  for (let i = 0; i < n; i++) {
    const ang = Math.random() * Math.PI * 2; const sp = 2 + Math.random() * 5;
    parts.push({ kind: 'px', x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 1.5, g: 0.08, drag: 0.975,
      s: Math.random() < 0.3 ? 6 : 4, c: colors[i % colors.length], life: 60 + Math.random() * 40, fade: 30 });
  }
  kick();
}

/** Secvența de artificii a ecranului HIGH SCORE (~2.6 s). */
export function fireworks() {
  if (reduced()) return;
  const colors = [token('--neon'), token('--volt'), token('--go'), token('--text')];
  const shots = innerWidth < 600 ? 5 : 9;
  for (let i = 0; i < shots; i++) {
    setTimeout(() => burst(innerWidth * (0.15 + Math.random() * 0.7), innerHeight * (0.12 + Math.random() * 0.35), colors), 700 + i * 260);
  }
}

/** Activează scânteile global, pe orice .btn apăsat. */
export function installSparks() {
  addEventListener('pointerdown', (e) => {
    const b = e.target.closest('.btn:not([disabled]), .deck-coin, .pick-tile');
    if (b) spark(e.clientX, e.clientY);
  }, { passive: true });
  addEventListener('resize', () => { if (ctx) ensure(); }, { passive: true });
}
