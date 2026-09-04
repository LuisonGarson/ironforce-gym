-- Fase 2: catalogo de clases/turnos del gimnasio.
-- Requiere haber ejecutado antes 001_profiles.sql (usa public.is_admin()).

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  trainer_name text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity int not null check (capacity > 0),
  location text,
  is_cancelled boolean not null default false,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

alter table public.classes enable row level security;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger before_class_update
  before update on public.classes
  for each row execute function public.set_updated_at();

-- El horario de clases es publico: se muestra en la landing para "vender" el gimnasio
-- incluso a quien todavia no se registro.
create policy "classes_select_public"
  on public.classes for select
  to anon, authenticated
  using (true);

create policy "classes_insert_admin"
  on public.classes for insert
  to authenticated
  with check (public.is_admin());

create policy "classes_update_admin"
  on public.classes for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "classes_delete_admin"
  on public.classes for delete
  to authenticated
  using (public.is_admin());
