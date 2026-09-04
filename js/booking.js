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

let currentUserId = null;

async function loadAvailableClasses() {
  const grid = document.getElementById('available-classes');
  const nowIso = new Date().toISOString();

  const [{ data: classes, error: classesError }, { data: myBookings }] = await Promise.all([
    supabase
      .from('classes')
      .select('id, title, trainer_name, location, starts_at, ends_at, capacity')
      .eq('is_cancelled', false)
      .gte('starts_at', nowIso)
      .order('starts_at', { ascending: true }),
    supabase
      .from('bookings')
      .select('class_id')
      .eq('user_id', currentUserId)
      .eq('status', 'booked'),
  ]);

  if (classesError) {
    grid.innerHTML = '<p class="empty-state">No se pudieron cargar las clases.</p>';
    return;
  }
  if (!classes.length) {
    grid.innerHTML = '<p class="empty-state">No hay clases programadas por ahora.</p>';
    return;
  }

  const bookedClassIds = new Set((myBookings || []).map((b) => b.class_id));

  // Cuenta reservas activas por clase (solo para mostrar cupo disponible en la UI;
  // el bloqueo real de sobrecupo lo hace el trigger en la base de datos).
  const { data: activeCounts } = await supabase
    .from('bookings')
    .select('class_id')
    .eq('status', 'booked')
    .in('class_id', classes.map((c) => c.id));

  const countByClass = {};
  (activeCounts || []).forEach((b) => {
    countByClass[b.class_id] = (countByClass[b.class_id] || 0) + 1;
  });

  grid.innerHTML = classes.map((c) => {
    const taken = countByClass[c.id] || 0;
    const full = taken >= c.capacity;
    const alreadyBooked = bookedClassIds.has(c.id);
    return `
      <div class="class-card">
        <h3>${escapeHtml(c.title)}</h3>
        <div class="class-meta">
          <span>${fmtDateTime(c.starts_at)}</span>
          ${c.trainer_name ? `<span>Con ${escapeHtml(c.trainer_name)}</span>` : ''}
          ${c.location ? `<span>${escapeHtml(c.location)}</span>` : ''}
          <span>${taken}/${c.capacity} lugares ocupados ${full ? '<span class="badge badge-full">Completo</span>' : ''}</span>
        </div>
        ${alreadyBooked
          ? '<span class="badge badge-booked">Ya reservaste</span>'
          : `<button type="button" class="btn btn-primary btn-sm" data-action="book" data-id="${c.id}" ${full ? 'disabled' : ''}>Reservar</button>`}
      </div>
    `;
  }).join('');
}

async function loadMyBookings() {
  const tbody = document.getElementById('my-bookings-tbody');
  const { data, error } = await supabase
    .from('bookings')
    .select('id, status, classes(title, starts_at)')
    .order('created_at', { ascending: false });

  if (error) {
    tbody.innerHTML = `<tr><td colspan="3" class="empty-state">No se pudieron cargar tus reservas.</td></tr>`;
    return;
  }
  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="3" class="empty-state">Todavia no reservaste ninguna clase.</td></tr>`;
    return;
  }

  const badgeClass = { booked: 'badge-booked', cancelled: 'badge-cancelled', attended: 'badge-attended' };
  const badgeLabel = { booked: 'Reservada', cancelled: 'Cancelada', attended: 'Asistida' };

  tbody.innerHTML = data.map((b) => `
    <tr>
      <td>${b.classes ? escapeHtml(b.classes.title) : '(clase eliminada)'}${b.classes ? `<br><span class="class-meta">${fmtDateTime(b.classes.starts_at)}</span>` : ''}</td>
      <td><span class="badge ${badgeClass[b.status]}">${badgeLabel[b.status]}</span></td>
      <td>${b.status === 'booked'
        ? `<button type="button" class="btn btn-danger btn-sm" data-action="cancel" data-id="${b.id}">Cancelar</button>`
        : ''}</td>
    </tr>
  `).join('');
}

function initActions() {
  document.getElementById('available-classes').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action="book"]');
    if (!btn || btn.disabled) return;
    btn.disabled = true;
    const { error } = await supabase.from('bookings').insert({
      class_id: btn.dataset.id,
      user_id: currentUserId,
    });
    if (error) {
      alert('No se pudo reservar: ' + (error.message.includes('cupo') || error.message.includes('cancelada') ? error.message : 'la clase ya no esta disponible.'));
    }
    await Promise.all([loadAvailableClasses(), loadMyBookings()]);
  });

  document.getElementById('my-bookings-tbody').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action="cancel"]');
    if (!btn) return;
    if (!confirm('Cancelar esta reserva?')) return;
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', btn.dataset.id);
    await Promise.all([loadAvailableClasses(), loadMyBookings()]);
  });
}

(async function init() {
  const profile = await requireRole(null);
  if (!profile) return;
  currentUserId = profile.id;

  document.getElementById('client-name').textContent = profile.full_name || profile.id;
  document.getElementById('logout-btn').addEventListener('click', logout);
  if (profile.role === 'admin') {
    document.getElementById('admin-link').hidden = false;
  }

  initActions();
  loadAvailableClasses();
  loadMyBookings();
})();
