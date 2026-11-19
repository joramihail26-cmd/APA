// Utilitare comune pentru efectele portate din React Bits.
export const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export const finePointer = () => matchMedia('(hover: hover) and (pointer: fine)').matches;

/** Culoarea unui token CSS (ex. '--neon'), ca șir utilizabil pe canvas. */
export function token(name) {
  const probe = document.createElement('i');
  probe.style.color = `var(${name})`;
  probe.style.display = 'none';
  document.body.append(probe);
  const c = getComputedStyle(probe).color;
  probe.remove();
  return c;
}

/**
 * Arc critic amortizat (Apple: damping 1.0) urmărit cu rAF. Pornește mereu din valoarea curentă,
 * deci se poate întrerupe și redirecționa oricând.
 */
export function spring(onUpdate, { response = 0.35, damping = 1 } = {}) {
  const k = (2 * Math.PI / response) ** 2;
  const c = 4 * Math.PI * damping / response;
  let x = 0; let v = 0; let target = 0; let raf = 0; let last = 0;
  const step = (t) => {
    const dt = Math.min(0.032, (t - last) / 1000 || 0.016);
    last = t;
    const a = -k * (x - target) - c * v;
    v += a * dt; x += v * dt;
    onUpdate(x);
    if (Math.abs(x - target) < 0.001 && Math.abs(v) < 0.001) { x = target; onUpdate(x); raf = 0; return; }
    raf = requestAnimationFrame(step);
  };
  return {
    set(to) { target = to; if (!raf) { last = performance.now(); raf = requestAnimationFrame(step); } },
    jump(to) { target = to; x = to; v = 0; onUpdate(x); },
    stop() { cancelAnimationFrame(raf); raf = 0; },
  };
}
