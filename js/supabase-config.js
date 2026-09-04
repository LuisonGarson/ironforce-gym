// Reemplazá estos dos valores por los de tu propio proyecto Supabase
// (Project Settings -> API, en supabase.com). Ambos son PUBLICOS por diseno:
// la seguridad real vive en las politicas de Row Level Security de Postgres,
// no en mantener esta URL/clave en secreto. NUNCA pongas aqui la
// "service_role key" -- esa nunca debe usarse en codigo que corre en el navegador.
export const SUPABASE_URL = 'https://TU_PROYECTO.supabase.co';
export const SUPABASE_ANON_KEY = 'TU_ANON_KEY_PUBLICA';
