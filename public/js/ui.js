// Componente mici de interfață. Tot textul intră prin textContent, deci nu există risc de injectare HTML.
export function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v == null) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') {
      for (const [prop, val] of Object.entries(v)) {
        if (prop.startsWith('--')) el.style.setProperty(prop, val); else el.style[prop] = val;
      }
    }
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

export const clear = (el) => { el.replaceChildren(); return el; };

export function toast(message, type = 'ok') {
  const box = document.getElementById('toasts');
  const t = h('div', { class: `toast ${type === 'error' ? 'error' : ''}`, role: type === 'error' ? 'alert' : 'status' }, message);
  box.append(t);
  setTimeout(() => t.remove(), type === 'error' ? 5000 : 2600);
}

export function avatar(player, size = '') {
  return h('span', { class: `avatar ${size}`, style: { background: player.color }, 'aria-hidden': 'true' }, player.name.trim().charAt(0).toUpperCase());
}

export const LEVELS = ['', 'Începător', 'Slab', 'Mediu', 'Bun', 'Expert'];
export const stars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);
export const TRAITS = [
  ['strategy', 'Strategie'], ['creativity', 'Creativitate'], ['speed', 'Viteză'], ['social', 'Comunicare'],
];

export function loading() {
  return h('div', { class: 'loading', role: 'status', 'aria-label': 'Se încarcă' }, h('span', { class: 'spinner' }));
}

export function empty(emoji, title, text, ...actions) {
  return h('div', { class: 'empty' },
    h('span', { class: 'emoji' }, emoji), h('h3', {}, title), text && h('p', {}, text),
    actions.length ? h('div', { class: 'row', style: { justifyContent: 'center' } }, ...actions) : null);
}

/** Dialog modal bazat pe <dialog>. content este un element; returnează funcția de închidere. */
export function openDialog(content, { onClose } = {}) {
  const dlg = h('dialog', {}, content);
  document.body.append(dlg);
  dlg.addEventListener('close', () => { dlg.remove(); onClose && onClose(); });
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  dlg.showModal();
  return () => dlg.close();
}

export function confirmBox(title, text, okLabel = 'Șterge') {
  return new Promise((resolve) => {
    let result = false;
    const close = openDialog(h('div', { class: 'dlg' },
      h('h2', {}, title), h('p', { class: 'muted' }, text),
      h('div', { class: 'dlg-actions' },
        h('button', { class: 'btn', type: 'button', onclick: () => close() }, 'Anulează'),
        h('button', { class: 'btn danger', type: 'button', onclick: () => { result = true; close(); } }, okLabel))),
    { onClose: () => resolve(result) });
  });
}

export function segmented(options, value, onChange, label) {
  const wrap = h('div', { class: 'seg', role: 'group', 'aria-label': label });
  const draw = (v) => {
    clear(wrap);
    for (const [val, text, title] of options) {
      wrap.append(h('button', { type: 'button', title: title || text, 'aria-pressed': String(val === v), onclick: () => { draw(val); onChange(val); } }, text));
    }
  };
  draw(value);
  return wrap;
}

export function confetti() {
  const canvas = document.getElementById('confetti');
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const ctx = canvas.getContext('2d');
  canvas.width = innerWidth; canvas.height = innerHeight;
  const colors = ['#ffb703', '#ef476f', '#06d6a0', '#4cc9f0', '#9b5de5'];
  const bits = Array.from({ length: 140 }, () => ({
    x: Math.random() * canvas.width, y: -20 - Math.random() * canvas.height * 0.5,
    vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 4, s: 5 + Math.random() * 6,
    r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, c: colors[Math.floor(Math.random() * colors.length)],
  }));
  let frames = 0;
  (function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const b of bits) {
      b.x += b.vx; b.y += b.vy; b.r += b.vr;
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.r); ctx.fillStyle = b.c; ctx.fillRect(-b.s / 2, -b.s / 4, b.s, b.s / 2); ctx.restore();
    }
    if (++frames < 260) requestAnimationFrame(tick); else ctx.clearRect(0, 0, canvas.width, canvas.height);
  })();
}

export function formToggle(btn, busy) {
  btn.disabled = busy;
  btn.dataset.label ??= btn.textContent;
  btn.textContent = busy ? 'Se calculează…' : btn.dataset.label;
}
