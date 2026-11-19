// TiltedCard și Magnet (React Bits), cu arcuri care pornesc din valoarea curentă.
import { spring, finePointer, reduced } from './motion.js';

/** TiltedCard: cardul se înclină spre cursor, cu o pată de lumină. Doar pe mouse, nu pe touch. */
export function tilt(el, { max = 9, scale = 1.025 } = {}) {
  if (!finePointer() || reduced()) return el;
  let rx = 0; let ry = 0; let sc = 1;
  const apply = () => { el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) scale(${sc})`; };
  const sx = spring((v) => { rx = v; apply(); }, { response: 0.3 });
  const sy = spring((v) => { ry = v; apply(); }, { response: 0.3 });
  const ss = spring((v) => { sc = v; apply(); }, { response: 0.25 });
  ss.jump(1);
  const glare = document.createElement('span');
  glare.className = 'glare';
  glare.setAttribute('aria-hidden', 'true');
  el.append(glare);
  el.addEventListener('pointermove', (e) => {
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width; const py = (e.clientY - r.top) / r.height;
    sx.set((0.5 - py) * 2 * max); sy.set((px - 0.5) * 2 * max); ss.set(scale);
    glare.style.setProperty('--gx', `${px * 100}%`); glare.style.setProperty('--gy', `${py * 100}%`);
    el.classList.add('tilting');
  });
  el.addEventListener('pointerleave', () => { sx.set(0); sy.set(0); ss.set(1); el.classList.remove('tilting'); });
  return el;
}

/** Magnet: elementul e atras ușor spre cursor când acesta se apropie. */
export function magnet(el, { padding = 70, strength = 4 } = {}) {
  if (!finePointer() || reduced()) return el;
  let x = 0; let y = 0;
  const apply = () => { el.style.transform = `translate(${x}px, ${y}px)`; };
  const sx = spring((v) => { x = v; apply(); }, { response: 0.4 });
  const sy = spring((v) => { y = v; apply(); }, { response: 0.4 });
  const onMove = (e) => {
    if (!el.isConnected) { removeEventListener('pointermove', onMove); return; }
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2; const cy = r.top + r.height / 2;
    const near = Math.abs(e.clientX - cx) < r.width / 2 + padding && Math.abs(e.clientY - cy) < r.height / 2 + padding;
    sx.set(near ? (e.clientX - cx) / strength : 0);
    sy.set(near ? (e.clientY - cy) / strength : 0);
  };
  addEventListener('pointermove', onMove, { passive: true });
  return el;
}
