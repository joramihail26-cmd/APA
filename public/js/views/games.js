import { api } from '../api.js';
import { h, clear, openDialog, confirmBox, toast, TRAITS, icon, stagger } from '../ui.js';

/** Un joc desenat ca un cartuș. `onPick` îl face selectabil (pasul 2 din Seară nouă). */
export function cartridge(g, { pressed, onPick, extra } = {}) {
  const body = [
    h('div', { class: 'cart-label' }, h('span', { class: 'emoji', 'aria-hidden': 'true' }, g.emoji), h('h3', {}, g.name)),
    h('p', { class: 'specs' }, h('b', {}, `${g.min_players}–${g.max_players}`), ' jucători · ', h('b', {}, g.duration), ' min · fun ', h('b', {}, `${g.fun}/10`)),
    extra,
  ];
  if (onPick) return h('button', { type: 'button', class: 'panel cart', 'aria-pressed': String(!!pressed), onclick: onPick }, body);
  return h('article', { class: 'panel cart' }, body);
}

export async function render() {
  const root = h('div', { class: 'stack' });
  const body = h('div', { class: 'carts' });

  async function refresh() {
    const games = await api.games();
    clear(body);
    for (const g of games) {
      body.append(cartridge(g, { extra: [
        g.description && h('p', { class: 'muted small' }, g.description),
        h('div', { class: 'row tight' }, g.roles.map((r) => h('span', { class: 'chip', title: 'Locuri pe echipă' }, r.name, r.count > 1 ? ` ×${r.count}` : ''))),
        !g.builtin && h('div', {}, h('button', { class: 'btn small danger ghost', type: 'button', onclick: async () => {
          if (!(await confirmBox(`Ștergi jocul ${g.name}?`, 'Se șterg și nivelurile jucătorilor la acest joc, plus serile jucate cu el.'))) return;
          try { await api.deleteGame(g.id); toast('Joc șters'); refresh(); } catch (e) { toast(e.message, 'error'); }
        } }, 'Șterge')),
      ] }));
    }
    stagger(body, 12);
  }

  root.append(h('div', { class: 'page-head' },
    h('div', {}, h('span', { class: 'eyebrow' }, 'Game select'), h('h1', {}, 'Jocuri'), h('p', { class: 'muted' }, 'Fiecare joc are roluri proprii. Adaugă și jocurile voastre.')),
    h('button', { class: 'btn primary', type: 'button', onclick: () => gameForm(refresh) }, icon('plus'), 'Joc nou')), body);
  await refresh();
  return root;
}

function gameForm(onSaved) {
  const roles = [{ name: '', count: 1, trait: 'strategy' }];
  const roleBox = h('div', { class: 'stack-sm' });
  const err = h('div', { class: 'err', role: 'alert' });
  const f = {
    name: h('input', { type: 'text', maxlength: 30, required: true, autocomplete: 'off' }),
    emoji: h('input', { type: 'text', maxlength: 4, value: '🎲' }),
    duration: h('input', { type: 'number', inputmode: 'numeric', min: 5, max: 240, value: 30 }),
    fun: h('input', { type: 'number', inputmode: 'numeric', min: 1, max: 10, value: 7 }),
    min: h('input', { type: 'number', inputmode: 'numeric', min: 2, max: 20, value: 4 }),
    max: h('input', { type: 'number', inputmode: 'numeric', min: 2, max: 30, value: 12 }),
    description: h('input', { type: 'text', maxlength: 200 }),
  };

  const drawRoles = () => {
    clear(roleBox);
    roles.forEach((r, i) => roleBox.append(h('div', { class: 'row tight' },
      h('input', { type: 'text', placeholder: 'ex. Desenator', value: r.name, maxlength: 24, 'aria-label': `Numele rolului ${i + 1}`, style: { flex: '2 1 140px' }, oninput: (e) => { r.name = e.target.value; } }),
      h('input', { type: 'number', inputmode: 'numeric', min: 1, max: 4, value: r.count, 'aria-label': `Locuri pentru rolul ${i + 1}`, style: { flex: '0 0 76px' }, oninput: (e) => { r.count = Number(e.target.value); } }),
      h('select', { 'aria-label': `Trăsătura principală a rolului ${i + 1}`, style: { flex: '1 1 140px' }, onchange: (e) => { r.trait = e.target.value; } },
        TRAITS.map(([k, l]) => h('option', { value: k, selected: r.trait === k }, l))),
      roles.length > 1 && h('button', { class: 'x', type: 'button', 'aria-label': `Scoate rolul ${i + 1}`, onclick: () => { roles.splice(i, 1); drawRoles(); } }, '✕'))));
  };
  drawRoles();

  const field = (label, input) => h('label', { class: 'field' }, label, input);
  const form = h('form', { class: 'dlg panel', novalidate: true },
    h('div', {}, h('span', { class: 'eyebrow' }, 'New cartridge'), h('h2', {}, 'Joc nou')),
    h('div', { class: 'grid cols-2' }, field('Nume', f.name), field('Emoji', f.emoji)),
    field('Descriere scurtă (opțional)', f.description),
    h('div', { class: 'grid', style: { gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' } }, field('Durată (min)', f.duration), field('Distracție (1–10)', f.fun), field('Jucători minim', f.min), field('Jucători maxim', f.max)),
    h('div', { class: 'stack-sm' }, h('h3', {}, 'Roluri într-o echipă'),
      h('p', { class: 'muted small' }, 'Pentru fiecare rol: nume, câte locuri are și trăsătura care contează. Jucătorii în plus devin „Membru”.'),
      roleBox, h('div', {}, h('button', { class: 'btn small', type: 'button', onclick: () => { if (roles.length < 8) { roles.push({ name: '', count: 1, trait: 'strategy' }); drawRoles(); } } }, icon('plus'), 'Rol'))),
    err,
    h('div', { class: 'dlg-actions' },
      h('button', { class: 'btn ghost', type: 'button', onclick: () => close() }, 'Anulează'),
      h('button', { class: 'btn primary', type: 'submit' }, 'Salvează jocul')));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.textContent = '';
    try {
      await api.addGame({
        name: f.name.value, emoji: f.emoji.value, description: f.description.value,
        duration: Number(f.duration.value), fun: Number(f.fun.value),
        min_players: Number(f.min.value), max_players: Number(f.max.value), roles,
      });
      close(); toast('Joc adăugat'); onSaved();
    } catch (ex) { err.textContent = ex.message; }
  });
  const close = openDialog(form);
  f.name.focus();
}
