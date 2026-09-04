-- Fase 3: reservas de clientes a clases, con control de cupo y anti-duplicados.
-- Requiere haber ejecutado antes 001_profiles.sql y 002_classes.sql.

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'booked' check (status in ('booked', 'cancelled', 'attended')),
  created_at timestamptz not null default now(),
  cancelled_at timestamptz
);

-- Evita que el mismo usuario tenga dos reservas activas para la misma clase.
create unique index bookings_one_active_per_class_user
  on public.bookings (class_id, user_id)
  where status = 'booked';

alter table public.bookings enable row level security;

-- No se puede expresar el limite de cupo con un CHECK simple (requiere contar filas
-- relacionadas), asi que se resuelve con un trigger que cuenta reservas activas.
create or replace function public.enforce_class_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  class_capacity int;
  active_count int;
  class_is_cancelled boolean;
begin
  select capacity, is_cancelled into class_capacity, class_is_cancelled
  from public.classes where id = new.class_id;

  if class_is_cancelled then
    raise exception 'No se puede reservar una clase cancelada';
  end if;

  select count(*) into active_count
  from public.bookings
  where class_id = new.class_id and status = 'booked';

  if active_count >= class_capacity then
    raise exception 'Esta clase ya alcanzo su cupo maximo';
  end if;

  return new;
end;
$$;

create trigger before_booking_insert
  before insert on public.bookings
  for each row
  when (new.status = 'booked')
  execute function public.enforce_class_capacity();

-- Solo permite que un cliente cancele su propia reserva (status -> 'cancelled'),
-- nunca que reasigne la reserva a otra clase u otro usuario, ni la reactive.
create or replace function public.restrict_booking_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if new.class_id <> old.class_id or new.user_id <> old.user_id then
    raise exception 'No se puede modificar la clase o el titular de una reserva';
  end if;

  if old.status = 'cancelled' and new.status <> 'cancelled' then
    raise exception 'No se puede reactivar una reserva cancelada';
  end if;

  if new.status = 'cancelled' and new.cancelled_at is null then
    new.cancelled_at = now();
  end if;

  return new;
end;
$$;

create trigger before_booking_update
  before update on public.bookings
  for each row execute function public.restrict_booking_update();

create policy "bookings_select_own_or_admin"
  on public.bookings for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "bookings_insert_own"
  on public.bookings for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "bookings_update_own_or_admin"
  on public.bookings for update
  to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- Sin politica de DELETE: se conserva historico via status='cancelled'.
