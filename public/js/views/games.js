import { api } from '../api.js';
import { h, clear, openDialog, confirmBox, toast, TRAITS } from '../ui.js';

export async function render() {
  const root = h('div', { class: 'stack' });
  const body = h('div', { class: 'grid cols-2' });

  async function refresh() {
    const games = await api.games();
    clear(body);
    for (const g of games) {
      body.append(h('article', { class: 'card stack' },
        h('div', { class: 'row' }, h('span', { class: 'emoji' }, g.emoji), h('div', { class: 'grow' }, h('h3', { style: { margin: 0 } }, g.name),
          h('span', { class: 'muted small' }, `${g.min_players}–${g.max_players} jucători · ${g.duration} min · distracție ${g.fun}/10`))),
        g.description && h('p', { class: 'muted' }, g.description),
        h('div', { class: 'row' }, g.roles.map((r) => h('span', { class: 'chip', title: 'Locuri pe echipă' }, r.name, r.count > 1 ? ` ×${r.count}` : ''))),
        !g.builtin && h('div', {}, h('button', { class: 'btn small danger ghost', type: 'button', onclick: async () => {
          if (!(await confirmBox(`Ștergi jocul ${g.name}?`, 'Se șterg și nivelurile jucătorilor la acest joc, plus serile jucate cu el.'))) return;
          try { await api.deleteGame(g.id); toast('Joc șters'); refresh(); } catch (e) { toast(e.message, 'error'); }
        } }, 'Șterge'))));
    }
  }

  root.append(h('div', { class: 'page-head' },
    h('div', {}, h('h1', {}, 'Jocuri'), h('p', { class: 'muted' }, 'Fiecare joc are roluri proprii. Le poți completa cu jocurile voastre.')),
    h('button', { class: 'btn primary', type: 'button', onclick: () => gameForm(refresh) }, '+ Joc nou')), body);
  await refresh();
  return root;
}

function gameForm(onSaved) {
  const roles = [{ name: '', count: 1, trait: 'strategy' }];
  const roleBox = h('div', { class: 'stack' });
  const err = h('div', { class: 'err', role: 'alert' });
  const f = {
    name: h('input', { type: 'text', maxlength: 30, required: true, autocomplete: 'off' }),
    emoji: h('input', { type: 'text', maxlength: 4, value: '🎲' }),
    duration: h('input', { type: 'number', min: 5, max: 240, value: 30 }),
    fun: h('input', { type: 'number', min: 1, max: 10, value: 7 }),
    min: h('input', { type: 'number', min: 2, max: 20, value: 4 }),
    max: h('input', { type: 'number', min: 2, max: 30, value: 12 }),
    description: h('input', { type: 'text', maxlength: 200 }),
  };

  const drawRoles = () => {
    clear(roleBox);
    roles.forEach((r, i) => roleBox.append(h('div', { class: 'row' },
      h('input', { type: 'text', placeholder: 'Nume rol', value: r.name, maxlength: 24, 'aria-label': `Rol ${i + 1}`, style: { flex: '2 1 140px' }, oninput: (e) => { r.name = e.target.value; } }),
      h('input', { type: 'number', min: 1, max: 4, value: r.count, 'aria-label': 'Locuri', style: { flex: '0 0 70px' }, oninput: (e) => { r.count = Number(e.target.value); } }),
      h('select', { 'aria-label': 'Trăsătura principală', style: { flex: '1 1 140px' }, onchange: (e) => { r.trait = e.target.value; } },
        TRAITS.map(([k, l]) => h('option', { value: k, selected: r.trait === k }, l))),
      roles.length > 1 && h('button', { class: 'x', type: 'button', 'aria-label': 'Scoate rolul', onclick: () => { roles.splice(i, 1); drawRoles(); } }, '✕'))));
  };
  drawRoles();

  const field = (label, input) => h('label', { class: 'field' }, label, input);
  const form = h('form', { class: 'dlg', novalidate: true },
    h('h2', {}, 'Joc nou'),
    h('div', { class: 'grid cols-2' }, field('Nume', f.name), field('Emoji', f.emoji)),
    field('Descriere scurtă (opțional)', f.description),
    h('div', { class: 'grid cols-3' }, field('Durată (min)', f.duration), field('Distracție (1–10)', f.fun), field('Jucători minim', f.min), field('Jucători maxim', f.max)),
    h('div', {}, h('h3', {}, 'Roluri într-o echipă'),
      h('p', { class: 'muted small' }, 'Pentru fiecare rol: nume, numărul de locuri și trăsătura care contează cel mai mult. Dacă echipa are mai mulți jucători decât locuri, restul devin „Membru”.'),
      roleBox, h('button', { class: 'btn small', type: 'button', style: { marginTop: '10px' }, onclick: () => { if (roles.length < 8) { roles.push({ name: '', count: 1, trait: 'strategy' }); drawRoles(); } } }, '+ Rol')),
    err,
    h('div', { class: 'dlg-actions' },
      h('button', { class: 'btn', type: 'button', onclick: () => close() }, 'Anulează'),
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
