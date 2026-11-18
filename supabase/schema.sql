-- ============================================================================
-- SkellyTalk — Complete Supabase Schema, RLS, Realtime & Storage
-- Run this script once in your Supabase Dashboard -> SQL Editor
-- ============================================================================

create extension if not exists "pgcrypto";

-- 1. Profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  account_name text not null default '',
  handle text not null unique,
  avatar_text text not null default 'ST',
  role text not null default '',
  status text not null default 'online' check (status in ('online', 'away', 'busy')),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists account_name text not null default '';
alter table public.profiles alter column role set default '';
update public.profiles
set account_name = display_name
where account_name = '';

alter table public.profiles enable row level security;

create policy "Profiles are viewable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- 2. Conversations (channels & 1:1 DMs)
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('channel', 'dm')),
  topic text not null default '',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.conversations add column if not exists logo_url text;

alter table public.conversations enable row level security;

-- 3. Conversation Members
create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  pinned boolean not null default false,
  last_read_at timestamptz not null default now(),
  joined_at timestamptz not null default now(),
  role text not null default 'member' check (role in ('owner', 'admin', 'moderator', 'member')),
  primary key (conversation_id, user_id)
);

alter table public.conversation_members enable row level security;

-- Helper function to check membership without recursive RLS issues
create or replace function public.is_conversation_member(conv_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from public.conversation_members
    where conversation_id = conv_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.can_manage_conversation(conv_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_members
    where conversation_id = conv_id
      and user_id = auth.uid()
      and role in ('owner', 'admin')
  );
$$;

drop policy if exists "Channels are visible to all authenticated users, DMs to members" on public.conversations;
drop policy if exists "Conversations are visible to creator or members" on public.conversations;
create policy "Conversations are visible to creator or members"
  on public.conversations for select
  to authenticated
  using (created_by = auth.uid() or public.is_conversation_member(id));

create policy "Authenticated users can create conversations"
  on public.conversations for insert
  to authenticated
  with check (auth.uid() = created_by);

drop policy if exists "Members can view membership of accessible conversations" on public.conversation_members;
create policy "Members can view membership of accessible conversations"
  on public.conversation_members for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_conversation_member(conversation_id)
  );

drop policy if exists "Authenticated users can join channels or add DM members" on public.conversation_members;
drop policy if exists "Members can invite others or join conversations" on public.conversation_members;
create policy "Members can invite others or join conversations"
  on public.conversation_members for insert
  to authenticated
  with check (
    user_id = auth.uid()
    or public.is_conversation_member(conversation_id)
    or exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.created_by = auth.uid()
    )
  );

drop policy if exists "Owners and admins can update group memberships" on public.conversation_members;
create policy "Users can update their own membership (pin, last_read_at)"
  on public.conversation_members for update
  to authenticated
  using (
    user_id = auth.uid()
    or public.can_manage_conversation(conversation_id)
  );

drop policy if exists "Users can leave conversations" on public.conversation_members;
create policy "Users can leave or owners/admins can remove members"
  on public.conversation_members for delete
  to authenticated
  using (
    user_id = auth.uid()
    or public.can_manage_conversation(conversation_id)
  );

-- 4. Messages
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  content text not null default '',
  ciphertext jsonb,
  encryption_version text,
  ciphertext_type integer,
  code_block jsonb,
  attachments jsonb,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

-- Upgrade existing SkellyTalk databases in place.
alter table public.messages add column if not exists ciphertext jsonb;
alter table public.messages add column if not exists encryption_version text;
alter table public.messages add column if not exists ciphertext_type integer;
alter table public.messages add column if not exists edited_at timestamptz;
alter table public.messages add column if not exists deleted_at timestamptz;

create index if not exists idx_messages_conv_created
  on public.messages (conversation_id, created_at asc);

alter table public.messages enable row level security;

drop policy if exists "Users can read messages in channels or their DMs" on public.messages;
create policy "Users can read messages in their groups and DMs"
  on public.messages for select
  to authenticated
  using (public.is_conversation_member(conversation_id));

drop policy if exists "Users can send messages to channels or their DMs" on public.messages;
create policy "Users can send messages to their groups and DMs"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_conversation_member(conversation_id)
  );

create policy "Users can update their own messages"
  on public.messages for update
  to authenticated
  using (sender_id = auth.uid());

create policy "Users can delete their own messages"
  on public.messages for delete
  to authenticated
  using (sender_id = auth.uid());

-- 4a. Public Signal key directory (private key material is never stored here)
create table if not exists public.signal_key_bundles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  identity_key text not null,
  registration_id integer not null,
  signed_pre_key_id integer not null,
  signed_pre_key text not null,
  signed_pre_key_signature text not null,
  kyber_pre_key_id integer not null,
  kyber_pre_key text not null,
  kyber_pre_key_signature text not null,
  one_time_pre_keys jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.signal_key_bundles enable row level security;

create policy "Authenticated users can read public key bundles"
  on public.signal_key_bundles for select
  to authenticated
  using (true);

create policy "Users can publish their own public key bundle"
  on public.signal_key_bundles for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can rotate their own public key bundle"
  on public.signal_key_bundles for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Sender-key distributions for group chats. These records contain only public
-- group-ratchet distribution messages, never sender private state.
create table if not exists public.signal_sender_key_distributions (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  distribution_id uuid not null,
  distribution_message text not null,
  created_at timestamptz not null default now(),
  primary key (conversation_id, sender_id, distribution_id)
);

alter table public.signal_sender_key_distributions enable row level security;

create policy "Conversation members can read sender-key distributions"
  on public.signal_sender_key_distributions for select
  to authenticated
  using (public.is_conversation_member(conversation_id));

create policy "Conversation members can publish sender-key distributions"
  on public.signal_sender_key_distributions for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_conversation_member(conversation_id)
  );

-- 5. Personal Message Pins
create table if not exists public.message_pins (
  message_id uuid not null references public.messages (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

alter table public.message_pins enable row level security;

drop policy if exists "Users can manage their own message pins" on public.message_pins;
create policy "Users can manage their own message pins"
  on public.message_pins for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 6. Message Reactions
create table if not exists public.message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique (message_id, user_id, emoji)
);

alter table public.message_reactions enable row level security;

create policy "Authenticated users can read reactions"
  on public.message_reactions for select
  to authenticated
  using (true);

create policy "Users can add their own reactions"
  on public.message_reactions for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can remove their own reactions"
  on public.message_reactions for delete
  to authenticated
  using (user_id = auth.uid());

-- 6. Auto-profile trigger on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_account_name text;
  v_handle text;
  v_avatar text;
begin
  v_name := coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1));
  v_account_name := v_name;
  v_handle := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'handle'), ''),
    '@' || regexp_replace(lower(split_part(new.email, '@', 1)), '[^a-z0-9_]', '', 'g') || '_' || substr(new.id::text, 1, 4)
  );
  v_avatar := upper(substr(v_name, 1, 1));

  insert into public.profiles (id, display_name, account_name, handle, avatar_text, role, status)
  values (new.id, v_name, v_account_name, v_handle, v_avatar, '', 'online')
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 7. Enable Supabase Realtime publications
do $$
begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.message_reactions;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.conversations;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.conversation_members;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.profiles;
exception when duplicate_object then null;
end $$;

-- 8. Storage bucket for file & image attachments
insert into storage.buckets (id, name, public)
values ('lemchat-attachments', 'lemchat-attachments', true)
on conflict (id) do nothing;

create policy "Authenticated users can upload attachments"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'lemchat-attachments');

create policy "Anyone can view attachments"
  on storage.objects for select
  to public
  using (bucket_id = 'lemchat-attachments');
