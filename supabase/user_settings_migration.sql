-- Cross-device settings sync.
-- Run once in the Supabase SQL editor.
--
-- One row per user. `data` is a map of  settingKey -> { "v": string|null, "t": epoch-ms }
-- where v = null means the setting was deleted (tombstone). The newest `t` wins per key.

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint user_settings_size check (octet_length(data::text) < 2000000)
);

alter table public.user_settings enable row level security;

drop policy if exists "Users can read their own settings" on public.user_settings;
create policy "Users can read their own settings"
  on public.user_settings for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own settings" on public.user_settings;
create policy "Users can insert their own settings"
  on public.user_settings for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own settings" on public.user_settings;
create policy "Users can update their own settings"
  on public.user_settings for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Atomic per-key merge so two devices saving different settings at the same time
-- never overwrite each other. Returns the merged result.
create or replace function public.merge_user_settings(patch jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  result jsonb;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.user_settings as us (user_id, data, updated_at)
  values (auth.uid(), coalesce(patch, '{}'::jsonb), now())
  on conflict (user_id) do update
    set data = (
          select coalesce(jsonb_object_agg(m.k, m.v), '{}'::jsonb)
          from (
            select
              coalesce(n.key, o.key) as k,
              case
                when n.key is null then o.value
                when o.key is null then n.value
                when coalesce((n.value ->> 't')::bigint, 0) >= coalesce((o.value ->> 't')::bigint, 0)
                  then n.value
                else o.value
              end as v
            from jsonb_each(us.data) as o(key, value)
            full join jsonb_each(excluded.data) as n(key, value) on o.key = n.key
          ) m
        ),
        updated_at = now()
  returning data into result;

  return result;
end;
$$;

revoke all on function public.merge_user_settings(jsonb) from public;
grant execute on function public.merge_user_settings(jsonb) to authenticated;

-- Live updates to other signed-in devices.
do $$
begin
  alter publication supabase_realtime add table public.user_settings;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
