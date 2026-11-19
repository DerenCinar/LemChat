-- Run once in the Supabase SQL editor if "Last seen" always shows unavailable.
alter table public.profiles add column if not exists last_seen_at timestamptz;

-- Backfill so existing users show something right away.
update public.profiles set last_seen_at = now() where last_seen_at is null;

-- Make sure users can update their own row (needed to write last_seen_at).
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);
