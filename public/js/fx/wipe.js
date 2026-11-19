// PixelTransition (React Bits): un grid de blocuri acoperă ecranul și apoi îl descoperă, în ordine aleatoare.
import { reduced } from './motion.js';

let layer;
function build() {
  const cols = innerWidth < 600 ? 6 : 14;
  const rows = Math.ceil(cols * innerHeight / innerWidth);
  layer = document.createElement('div');
  layer.className = 'wipe';
  layer.setAttribute('aria-hidden', 'true');
  layer.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  layer.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
  for (let i = 0; i < cols * rows; i++) layer.append(document.createElement('i'));
  document.body.append(layer);
  return [...layer.children];
}

const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

function run(cells, on, ms) {
  const order = shuffle([...cells]);
  const per = ms / order.length;
  return new Promise((resolve) => {
    const t0 = performance.now();
    const step = (now) => {
      const n = Math.min(order.length, Math.floor((now - t0) / per));
      for (let i = 0; i < n; i++) order[i].classList.toggle('on', on);
      if (n < order.length) requestAnimationFrame(step); else resolve();
    };
    requestAnimationFrame(step);
  });
}

/** Acoperă ecranul (~170 ms). Întoarce funcția care îl descoperă. */
export async function cover() {
  if (reduced()) return async () => {};
  layer?.remove();
  const cells = build();
  await run(cells, true, 170);
  return async () => {
    await run(cells, false, 200);
    layer?.remove(); layer = null;
  };
}
