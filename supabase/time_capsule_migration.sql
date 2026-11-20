-- Time-capsule messages.
-- The message body is AES-GCM encrypted on the sender's device and stored in
-- messages.metadata. The AES key is kept ONLY in capsule_keys, which has RLS enabled
-- and no policies, so clients can never select it. The key is released solely by
-- open_capsule(), which checks the server clock against unlock_at, so the recipient's
-- device cannot decrypt the message before the unlock time (changing the local clock
-- or editing metadata does nothing).

create table if not exists public.capsule_keys (
  message_id uuid primary key references public.messages (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  unlock_at timestamptz not null,
  key text not null,
  created_at timestamptz not null default now()
);

alter table public.capsule_keys enable row level security;
revoke all on public.capsule_keys from anon, authenticated;

create or replace function public.seal_capsule(p_message_id uuid, p_key text, p_unlock_at timestamptz)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_msg public.messages%rowtype;
begin
  select * into v_msg from public.messages where id = p_message_id;
  if not found or v_msg.sender_id <> auth.uid() then
    raise exception 'Message not found';
  end if;
  if v_msg.metadata is null or v_msg.metadata->>'kind' <> 'capsule' then
    raise exception 'Not a time capsule';
  end if;
  if p_unlock_at <= now() then
    raise exception 'Unlock time must be in the future';
  end if;
  insert into public.capsule_keys (message_id, sender_id, unlock_at, key)
  values (p_message_id, auth.uid(), p_unlock_at, p_key);
end;
$$;

create or replace function public.open_capsule(p_message_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conv uuid;
  v_row public.capsule_keys%rowtype;
begin
  select conversation_id into v_conv from public.messages where id = p_message_id;
  if v_conv is null or not public.is_conversation_member(v_conv) then
    raise exception 'Not a member of this conversation';
  end if;
  select * into v_row from public.capsule_keys where message_id = p_message_id;
  if not found then
    raise exception 'Capsule is not sealed';
  end if;
  if now() < v_row.unlock_at then
    raise exception 'Capsule is still locked';
  end if;
  return v_row.key;
end;
$$;

grant execute on function public.seal_capsule(uuid, text, timestamptz) to authenticated;
grant execute on function public.open_capsule(uuid) to authenticated;

notify pgrst, 'reload schema';
