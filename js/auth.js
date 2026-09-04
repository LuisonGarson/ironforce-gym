import { supabase } from './supabase-client.js';
import { getSession, getCurrentProfile } from './auth-guard.js';

function showError(el, message) {
  el.textContent = message;
  el.hidden = false;
}

function clearError(el) {
  el.textContent = '';
  el.hidden = true;
}

async function redirectIfLoggedIn() {
  const session = await getSession();
  if (!session) return;
  const profile = await getCurrentProfile();
  location.replace(profile?.role === 'admin' ? 'dashboard-admin.html' : 'mis-reservas.html');
}

function initLoginForm() {
  const form = document.getElementById('login-form');
  if (!form) return;
  const errorEl = document.getElementById('login-error');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError(errorEl);
    const email = form.email.value.trim();
    const password = form.password.value;

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        showError(errorEl, 'Email o contrasena incorrectos.');
        return;
      }
      const profile = await getCurrentProfile();
      location.replace(profile?.role === 'admin' ? 'dashboard-admin.html' : 'mis-reservas.html');
    } finally {
      submitBtn.disabled = false;
    }
  });
}

function initRegisterForm() {
  const form = document.getElementById('register-form');
  if (!form) return;
  const errorEl = document.getElementById('register-error');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError(errorEl);

    if (!form.privacy.checked) {
      showError(errorEl, 'Tenes que aceptar la politica de privacidad para registrarte.');
      return;
    }
    if (form.password.value.length < 8) {
      showError(errorEl, 'La contrasena tiene que tener al menos 8 caracteres.');
      return;
    }
    if (form.password.value !== form.password_confirm.value) {
      showError(errorEl, 'Las contrasenas no coinciden.');
      return;
    }

    const email = form.email.value.trim();
    const fullName = form.full_name.value.trim();
    const phone = form.phone.value.trim();

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password: form.password.value,
        options: {
          data: { full_name: fullName, phone: phone || null },
        },
      });
      if (error) {
        showError(errorEl, error.message.includes('already registered')
          ? 'Ese email ya tiene una cuenta.'
          : 'No se pudo completar el registro. Intenta de nuevo.');
        return;
      }
      form.hidden = true;
      document.getElementById('register-success').hidden = false;
    } finally {
      submitBtn.disabled = false;
    }
  });
}

redirectIfLoggedIn();
initLoginForm();
initRegisterForm();
