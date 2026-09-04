import { getSession, getCurrentProfile, logout } from './auth-guard.js';

(async function () {
  const slot = document.getElementById('nav-auth-slot');
  if (!slot) return;

  const session = await getSession();
  if (!session) {
    slot.innerHTML = '<a href="login.html" class="nav-cta">Iniciar sesion</a>';
    return;
  }

  const profile = await getCurrentProfile();
  const dashboardHref = profile?.role === 'admin' ? 'dashboard-admin.html' : 'mis-reservas.html';
  const dashboardLabel = profile?.role === 'admin' ? 'Panel admin' : 'Mis reservas';

  slot.innerHTML = `
    <a href="${dashboardHref}">${dashboardLabel}</a>
    <button type="button" id="nav-logout" class="nav-cta">Cerrar sesion</button>
  `;

  document.getElementById('nav-logout').addEventListener('click', logout);
})();
