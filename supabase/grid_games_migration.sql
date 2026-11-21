-- Two-player in-chat games (Connect Four/Five, Mega Tic-Tac-Toe, Reversi, Checkers,
-- Dots & Boxes, Pig, Memory Duel). Run after polls_games_migration.sql.
-- One generic function: the server checks membership + whose turn it is, then stores the
-- new board/state. Game rules are enforced by the players' clients.
create or replace function public.game_apply(p_message_id uuid, p_state jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_msg public.messages%rowtype;
  v_meta jsonb;
  v_mark text;
  v_expected text;
  v_uid text := auth.uid()::text;
  k text;
begin
  select * into v_msg from public.messages where id = p_message_id for update;
  if not found or v_msg.metadata is null or v_msg.metadata->>'kind' <> 'game' then
    raise exception 'Game not found';
  end if;
  if not public.is_conversation_member(v_msg.conversation_id) then
    raise exception 'Not a member of this conversation';
  end if;
  v_meta := v_msg.metadata;
  if v_meta->'winner' is not null then
    raise exception 'Game is over';
  end if;
  v_mark := v_meta->>'currentTurn';
  if v_mark = 'X' then v_expected := v_meta->>'xPlayerId'; else v_expected := v_meta->>'oPlayerId'; end if;
  if v_expected is null then
    if v_uid = v_meta->>'xPlayerId' then
      raise exception 'Waiting for an opponent';
    end if;
    v_meta := jsonb_set(v_meta, '{oPlayerId}', to_jsonb(v_uid));
  elsif v_expected <> v_uid then
    raise exception 'Not your turn';
  end if;
  foreach k in array array['board', 'state', 'currentTurn', 'winner'] loop
    if p_state->k is not null and jsonb_typeof(p_state->k) <> 'null' then
      v_meta := jsonb_set(v_meta, array[k], p_state->k);
    end if;
  end loop;
  update public.messages set metadata = v_meta where id = p_message_id;
end;
$$;

grant execute on function public.game_apply(uuid, jsonb) to authenticated;

notify pgrst, 'reload schema';
