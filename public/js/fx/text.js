// DecryptedText și CountUp (React Bits), în variantă vanilla.
import { reduced } from './motion.js';

const GLYPHS = 'ABCDEFGHIJKLMNOPRSTUVXZ0123456789#%&*+<>=?';

/**
 * DecryptedText: literele pornesc amestecate și se fixează pe rând, de la stânga la dreapta.
 * Cititoarele de ecran primesc textul final prin aria-label; caracterele animate sunt ascunse.
 */
export function decrypt(el, text, { speed = 38, delay = 0, perChar = 1 } = {}) {
  el.setAttribute('aria-label', text);
  if (reduced()) { el.textContent = text; return Promise.resolve(); }
  const chars = [...text];
  const spans = chars.map((ch) => {
    const s = document.createElement('span');
    s.setAttribute('aria-hidden', 'true');
    s.textContent = ch === ' ' ? ' ' : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
    return s;
  });
  el.replaceChildren(...spans);
  return new Promise((resolve) => {
    let revealed = 0;
    let timer;
    const tick = () => {
      revealed = Math.min(chars.length, revealed + perChar);
      spans.forEach((s, i) => {
        if (chars[i] === ' ') return;
        if (i < revealed) { s.textContent = chars[i]; s.className = 'on'; }
        else s.textContent = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      });
      if (revealed >= chars.length) { clearInterval(timer); el.textContent = text; resolve(); }
    };
    setTimeout(() => { timer = setInterval(tick, speed); }, delay);
  });
}

const fmt = new Intl.NumberFormat('ro-RO');
const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t));

/** CountUp: numără de la `from` la `to`. Rulează o singură dată, cu cifre tabulare. */
export function countUp(el, to, { from = 0, duration = 900, delay = 0, format = (n) => fmt.format(n) } = {}) {
  if (reduced() || from === to) { el.textContent = format(to); return; }
  el.textContent = format(from);
  const start = performance.now() + delay;
  const step = (now) => {
    const t = Math.max(0, (now - start) / duration);
    el.textContent = format(Math.round(from + (to - from) * easeOutExpo(t)));
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** Literele firmei de neon: fiecare se aprinde cu o mică întârziere aleatoare. */
export function tubeLetters(el, text, base = 0) {
  el.setAttribute('aria-label', text);
  const frag = [...text].map((ch, i) => {
    const s = document.createElement('span');
    s.className = 'ch';
    s.setAttribute('aria-hidden', 'true');
    s.textContent = ch;
    s.style.setProperty('--d', `${base + i * 70 + Math.round(Math.random() * 260)}ms`);
    return s;
  });
  el.replaceChildren(...frag);
}
