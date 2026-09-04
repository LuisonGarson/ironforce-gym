-- Fase 5: placeholder de suscripciones/pagos. Se crea la tabla ahora para no tener que
-- migrar el esquema despues, pero queda INERTE: sin ninguna politica de escritura para
-- "authenticated". Cuando se elija el proveedor de pago (ej. Stripe), la unica escritura
-- valida sera desde una Supabase Edge Function con la "service_role key" (que ignora RLS),
-- tras validar el webhook del proveedor -- nunca directamente desde el navegador del cliente.

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  plan text not null default 'none',
  status text not null default 'inactive' check (status in ('inactive', 'active', 'cancelled', 'past_due')),
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

create trigger before_subscription_update
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

create policy "subscriptions_select_own_or_admin"
  on public.subscriptions for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Deliberadamente sin políticas de INSERT/UPDATE/DELETE: la tabla queda de solo
-- lectura para todo el mundo hasta que exista la Edge Function de pagos.
