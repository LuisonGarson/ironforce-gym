-- Fase 1: perfiles de usuario, rol admin/client, y proteccion contra auto-escalada de rol.
-- Pegar y ejecutar en el SQL Editor de tu proyecto Supabase (supabase.com > tu proyecto > SQL Editor).

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  phone text,
  role text not null default 'client' check (role in ('client', 'admin')),
  privacy_accepted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Funcion auxiliar: evita la recursion de RLS que ocurriria si una politica sobre
-- "profiles" tuviera que volver a consultar "profiles" (con RLS activo) para saber el rol.
-- SECURITY DEFINER hace que esta consulta puntual se ejecute sin aplicar RLS.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Crea automaticamente la fila de perfil cuando alguien se registra en Supabase Auth.
-- full_name/phone llegan desde options.data del signUp() del frontend (js/auth.js).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'phone'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Impide que un cliente se auto-promueva a admin haciendo UPDATE de su propia fila.
-- RLS no puede restringir una sola columna en un UPDATE, por eso se resuelve con trigger.
create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role <> old.role and not public.is_admin() then
    raise exception 'No tenes permiso para cambiar el rol de este perfil';
  end if;
  new.updated_at = now();
  return new;
end;
$$;

create trigger before_profile_update
  before update on public.profiles
  for each row execute function public.prevent_role_escalation();

-- Un usuario ve/edita su propio perfil; un admin ve/edita cualquiera.
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

create policy "profiles_update_own_or_admin"
  on public.profiles for update
  to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- Sin politica de INSERT/DELETE para "authenticated": la fila se crea solo via el
-- trigger on_auth_user_created (security definer) y el borrado queda para la fase GDPR.
