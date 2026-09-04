import { supabase } from './supabase-client.js';
import { requireRole, logout } from './auth-guard.js';

function fmtDateTime(iso) {
  return new Date(iso).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

async function loadClasses() {
  const tbody = document.getElementById('classes-tbody');
  const { data, error } = await supabase
    .from('classes')
    .select('id, title, starts_at, ends_at, capacity, location, is_cancelled')
    .order('starts_at', { ascending: true });

  if (error) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state">No se pudieron cargar las clases.</td></tr>`;
    return;
  }
  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state">Todavia no creaste ninguna clase.</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map((c) => `
    <tr data-id="${c.id}">
      <td>${escapeHtml(c.title)}</td>
      <td>${fmtDateTime(c.starts_at)}</td>
      <td>${fmtDateTime(c.ends_at)}</td>
      <td>${c.capacity}</td>
      <td>${c.is_cancelled
        ? '<span class="badge badge-cancelled">Cancelada</span>'
        : '<span class="badge badge-booked">Activa</span>'}</td>
      <td>
        ${c.is_cancelled
          ? ''
          : `<button type="button" class="btn btn-danger btn-sm" data-action="cancel-class" data-id="${c.id}">Cancelar</button>`}
      </td>
    </tr>
  `).join('');
}

async function loadBookings() {
  const tbody = document.getElementById('bookings-tbody');
  const { data, error } = await supabase
    .from('bookings')
    .select('id, status, created_at, profiles(full_name, phone), classes(title, starts_at)')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty-state">No se pudieron cargar las reservas.</td></tr>`;
    return;
  }
  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty-state">Todavia no hay reservas.</td></tr>`;
    return;
  }

  const badgeClass = { booked: 'badge-booked', cancelled: 'badge-cancelled', attended: 'badge-attended' };
  const badgeLabel = { booked: 'Reservada', cancelled: 'Cancelada', attended: 'Asistio' };

  tbody.innerHTML = data.map((b) => `
    <tr>
      <td>${escapeHtml(b.profiles?.full_name || '(sin nombre)')}</td>
      <td>${escapeHtml(b.classes?.title || '(clase eliminada)')}</td>
      <td>${b.classes ? fmtDateTime(b.classes.starts_at) : '-'}</td>
      <td><span class="badge ${badgeClass[b.status]}">${badgeLabel[b.status]}</span></td>
    </tr>
  `).join('');
}

function initNewClassForm() {
  const form = document.getElementById('new-class-form');
  const errorEl = document.getElementById('new-class-error');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.hidden = true;

    const startsAt = new Date(form.starts_at.value);
    const endsAt = new Date(form.ends_at.value);
    if (!(endsAt > startsAt)) {
      errorEl.textContent = 'La hora de fin tiene que ser posterior a la de inicio.';
      errorEl.hidden = false;
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.from('classes').insert({
      title: form.title.value.trim(),
      trainer_name: form.trainer_name.value.trim() || null,
      location: form.location.value.trim() || null,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      capacity: Number(form.capacity.value),
      created_by: session.user.id,
    });

    if (error) {
      errorEl.textContent = 'No se pudo crear la clase.';
      errorEl.hidden = false;
      return;
    }

    form.reset();
    loadClasses();
  });
}

function initClassesTable() {
  document.getElementById('classes-tbody').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action="cancel-class"]');
    if (!btn) return;
    if (!confirm('Cancelar esta clase? Los clientes ya no podran reservarla.')) return;
    await supabase.from('classes').update({ is_cancelled: true }).eq('id', btn.dataset.id);
    loadClasses();
  });
}

(async function init() {
  const profile = await requireRole('admin');
  if (!profile) return;

  document.getElementById('admin-name').textContent = profile.full_name || profile.id;
  document.getElementById('logout-btn').addEventListener('click', logout);

  initNewClassForm();
  initClassesTable();
  loadClasses();
  loadBookings();
})();
