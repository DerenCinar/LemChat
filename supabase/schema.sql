-- ============================================================================
-- LemChat by LemHand — Complete Supabase Schema, RLS, Realtime & Storage
-- Run this script once in your Supabase Dashboard -> SQL Editor
-- ============================================================================

create extension if not exists "pgcrypto";

-- 1. Profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  handle text not null unique,
  avatar_text text not null default 'LC',
  role text not null default 'LemHand Member',
  status text not null default 'online' check (status in ('online', 'away', 'busy')),
  updated_at timestamptz not null default now()
);

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

alter table public.conversations enable row level security;

-- 3. Conversation Members
create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  pinned boolean not null default false,
  last_read_at timestamptz not null default now(),
  joined_at timestamptz not null default now(),
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

create policy "Channels are visible to all authenticated users, DMs to members"
  on public.conversations for select
  to authenticated
  using (type = 'channel' or public.is_conversation_member(id));

create policy "Authenticated users can create conversations"
  on public.conversations for insert
  to authenticated
  with check (auth.uid() = created_by);

create policy "Members can view membership of accessible conversations"
  on public.conversation_members for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_conversation_member(conversation_id)
    or exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.type = 'channel'
    )
  );

create policy "Authenticated users can join channels or add DM members"
  on public.conversation_members for insert
  to authenticated
  with check (
    user_id = auth.uid()
    or exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.created_by = auth.uid()
    )
  );

create policy "Users can update their own membership (pin, last_read_at)"
  on public.conversation_members for update
  to authenticated
  using (user_id = auth.uid());

-- 4. Messages
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  content text not null default '',
  code_block jsonb,
  attachments jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_conv_created
  on public.messages (conversation_id, created_at asc);

alter table public.messages enable row level security;

create policy "Users can read messages in channels or their DMs"
  on public.messages for select
  to authenticated
  using (
    public.is_conversation_member(conversation_id)
    or exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.type = 'channel'
    )
  );

create policy "Users can send messages to channels or their DMs"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and (
      public.is_conversation_member(conversation_id)
      or exists (
        select 1 from public.conversations c
        where c.id = conversation_id and c.type = 'channel'
      )
    )
  );

create policy "Users can update their own messages"
  on public.messages for update
  to authenticated
  using (sender_id = auth.uid());

create policy "Users can delete their own messages"
  on public.messages for delete
  to authenticated
  using (sender_id = auth.uid());

-- 5. Message Reactions
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

-- 6. Default #general channel + Auto-profile trigger on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_handle text;
  v_avatar text;
  v_general_id uuid;
begin
  v_name := coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1));
  v_handle := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'handle'), ''),
    '@' || regexp_replace(lower(split_part(new.email, '@', 1)), '[^a-z0-9_]', '', 'g') || '_' || substr(new.id::text, 1, 4)
  );
  v_avatar := upper(substr(v_name, 1, 2));

  insert into public.profiles (id, display_name, handle, avatar_text, role, status)
  values (new.id, v_name, v_handle, v_avatar, 'LemHand Member', 'online')
  on conflict (id) do nothing;

  -- Ensure #general exists and join the user automatically
  select id into v_general_id from public.conversations
  where type = 'channel' and name = 'general'
  limit 1;

  if v_general_id is null then
    insert into public.conversations (name, type, topic, created_by)
    values ('general', 'channel', 'Company-wide LemHand announcements & real-time chat', new.id)
    returning id into v_general_id;
  end if;

  insert into public.conversation_members (conversation_id, user_id, pinned)
  values (v_general_id, new.id, true)
  on conflict do nothing;

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
