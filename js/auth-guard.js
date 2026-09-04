// Guards de sesion/rol para las paginas protegidas.
// IMPORTANTE: esto es solo UX (evita parpadeo de contenido y redirige si falta sesion).
// La barrera de seguridad real es Row Level Security en Postgres (ver supabase/*.sql):
// cualquiera podria desactivar este JS y seguir sin poder leer/escribir filas ajenas.
import { supabase } from './supabase-client.js';

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function getCurrentProfile() {
  const session = await getSession();
  if (!session) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, phone, role')
    .eq('id', session.user.id)
    .single();
  if (error) return null;
  return data;
}

// role: 'admin' | 'client' | null (null = solo exige sesion, cualquier rol vale)
export async function requireRole(role) {
  const session = await getSession();
  if (!session) {
    location.replace('login.html');
    return null;
  }
  const profile = await getCurrentProfile();
  if (!profile) {
    location.replace('login.html');
    return null;
  }
  if (role && profile.role !== role) {
    location.replace(profile.role === 'admin' ? 'dashboard-admin.html' : 'mis-reservas.html');
    return null;
  }
  return profile;
}

export async function logout() {
  await supabase.auth.signOut();
  location.replace('index.html');
}
