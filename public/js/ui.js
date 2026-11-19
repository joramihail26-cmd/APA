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

// ---------- iconuri (SVG, linie de 2px) ----------
const ICONS = {
  home: 'M4 11 12 4l8 7v9h-5v-6H9v6H4z',
  users: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0M17 11a3 3 0 1 0 0-6M22 20a6 6 0 0 0-4-5.6',
  trophy: 'M8 4h8v5a4 4 0 0 1-8 0zM8 6H4v1a4 4 0 0 0 4 4M16 6h4v1a4 4 0 0 1-4 4M12 13v4M8 21h8M9 17h6v4H9z',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z',
  dice: 'M4 4h16v16H4zM8.5 8.5h.01M15.5 15.5h.01M15.5 8.5h.01M8.5 15.5h.01M12 12h.01',
  route: 'M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM8 17h7a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h7',
  chip: 'M7 7h10v10H7zM10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4',
  plus: 'M12 5v14M5 12h14',
  play: 'M7 4l13 8-13 8z',
};
export function icon(name) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2'); svg.setAttribute('stroke-linecap', 'round'); svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS(ns, 'path'); p.setAttribute('d', ICONS[name] || ''); svg.append(p);
  return svg;
}

export function toast(message, type = 'ok') {
  const box = document.getElementById('toasts');
  const t = h('div', { class: `toast ${type === 'error' ? 'error' : ''}`, role: type === 'error' ? 'alert' : 'status' }, h('span', {}, message));
  box.append(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 240); }, type === 'error' ? 5000 : 2600);
}

// ---------- jucători ----------
const seg = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('ro', { granularity: 'grapheme' }) : null;
const firstGrapheme = (s) => (seg ? [...seg.segment(s)][0]?.segment : [...s][0]) || '?';
export function initials(name) {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  const a = firstGrapheme(words[0]); const b = words.length > 1 ? firstGrapheme(words.at(-1)) : '';
  return (a + b).toUpperCase();
}
/** Cerneala (închis/deschis) cu contrast mai bun pe culoarea jucătorului. */
export function inkFor(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return 'oklch(0.17 0.035 300)';
  const n = parseInt(m[1], 16);
  const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const L = 0.2126 * lin(n >> 16) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return (L + 0.05) / 0.0466 >= 1.05 / (L + 0.05) ? 'oklch(0.17 0.035 300)' : 'oklch(0.985 0.01 340)';
}
export function avatar(player, size = '') {
  return h('span', { class: `avatar ${size}`, style: { background: player.color, '--ink': inkFor(player.color) }, 'aria-hidden': 'true' }, initials(player.name));
}

export const LEVELS = ['', 'Începător', 'Slab', 'Mediu', 'Bun', 'Expert'];
/** Nivelul ca 5 LED-uri, cu text pentru cititoarele de ecran. */
export function pips(n, max = 5) {
  return h('span', { class: 'pips', role: 'img', 'aria-label': `Nivel ${n} din ${max}, ${LEVELS[n] ?? ''}`.trim(), title: LEVELS[n] },
    Array.from({ length: max }, (_, i) => h('i', { class: i < n ? 'on' : '' })));
}
/** Bară LED de 10 segmente pentru o trăsătură de la 1 la 10. */
export function meter(v, color) {
  return h('span', { class: 'meter', style: color ? { '--c': color } : null, 'aria-hidden': 'true' },
    Array.from({ length: 10 }, (_, i) => h('i', { class: i < v ? 'on' : '' })));
}
export const TRAITS = [
  ['strategy', 'Strategie'], ['creativity', 'Creativitate'], ['speed', 'Viteză'], ['social', 'Comunicare'],
];

export function loading() {
  return h('div', { class: 'loading', role: 'status', 'aria-busy': 'true' }, h('span', {}, 'LOADING'), h('p', { class: 'sr-only' }, 'Se încarcă'));
}

export function empty(emoji, title, text, ...actions) {
  return h('div', { class: 'panel empty', role: 'status' },
    h('span', { class: 'emoji', 'aria-hidden': 'true' }, emoji),
    h('span', { class: 'insert-coin', 'aria-hidden': 'true' }, 'INSERT COIN'),
    h('h3', {}, title), text && h('p', { class: 'muted' }, text),
    actions.length ? h('div', { class: 'row', style: { justifyContent: 'center' } }, ...actions) : null);
}

/** Dialog modal bazat pe <dialog>: focus prins înăuntru, Escape închide, focusul revine la buton. */
export function openDialog(content, { onClose, className = 'dlg-shell' } = {}) {
  const opener = document.activeElement;
  const dlg = h('dialog', { class: className }, content);
  document.body.append(dlg);
  dlg.addEventListener('close', () => { dlg.remove(); onClose && onClose(); if (opener?.isConnected) opener.focus(); });
  dlg.addEventListener('click', (e) => { if (e.target === dlg && className === 'dlg-shell') dlg.close(); });
  dlg.showModal();
  return () => dlg.close();
}

export function confirmBox(title, text, okLabel = 'Șterge') {
  return new Promise((resolve) => {
    let result = false;
    const close = openDialog(h('div', { class: 'dlg panel' },
      h('h2', {}, title), h('p', { class: 'muted' }, text),
      h('div', { class: 'dlg-actions' },
        h('button', { class: 'btn ghost', type: 'button', onclick: () => close() }, 'Anulează'),
        h('button', { class: 'btn danger', type: 'button', onclick: () => { result = true; close(); } }, okLabel))),
    { onClose: () => resolve(result) });
  });
}

export function segmented(options, value, onChange, label) {
  const wrap = h('div', { class: 'seg', role: 'group', 'aria-label': label });
  const draw = (v) => {
    clear(wrap);
    for (const [val, text, title] of options) {
      wrap.append(h('button', { type: 'button', title: title || text, 'aria-label': title ? `${text}, ${title}` : null, 'aria-pressed': String(val === v), onclick: () => { draw(val); onChange(val); } }, text));
    }
  };
  draw(value);
  return wrap;
}

export function formToggle(btn, busy) {
  btn.disabled = busy;
  btn.dataset.label ??= btn.textContent;
  btn.setAttribute('aria-busy', String(busy));
  if (busy) btn.replaceChildren(h('span', { class: 'spinner', 'aria-hidden': 'true' }), 'Se calculează');
  else btn.textContent = btn.dataset.label;
}

/** Setează --i pe copiii unui container, pentru intrarea eșalonată. */
export function stagger(el, cap = 10) {
  el.classList.add('enter');
  [...el.children].forEach((c, i) => c.style.setProperty('--i', Math.min(i, cap)));
  return el;
}
