alter table public.messages add column if not exists metadata jsonb;

-- 4b. Interactive messages (polls and in-app games). State lives in the plaintext
-- `metadata` column and is mutated only through these membership-checked functions.
create or replace function public.vote_poll(p_message_id uuid, p_option_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_msg public.messages%rowtype;
  v_votes jsonb;
begin
  select * into v_msg from public.messages where id = p_message_id for update;
  if not found or v_msg.metadata is null or v_msg.metadata->>'kind' <> 'poll' then
    raise exception 'Poll not found';
  end if;
  if not public.is_conversation_member(v_msg.conversation_id) then
    raise exception 'Not a member of this conversation';
  end if;
  if not exists (
    select 1 from jsonb_array_elements(v_msg.metadata->'options') o where o->>'id' = p_option_id
  ) then
    raise exception 'Unknown option';
  end if;
  v_votes := coalesce(v_msg.metadata->'votes', '{}'::jsonb);
  if v_votes->>auth.uid()::text = p_option_id then
    v_votes := v_votes - auth.uid()::text;
  else
    v_votes := v_votes || jsonb_build_object(auth.uid()::text, p_option_id);
  end if;
  update public.messages
    set metadata = jsonb_set(v_msg.metadata, '{votes}', v_votes)
    where id = p_message_id;
end;
$$;

create or replace function public.game_move(p_message_id uuid, p_position integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_msg public.messages%rowtype;
  v_meta jsonb;
  v_board jsonb;
  v_mark text;
  v_expected text;
  v_uid text := auth.uid()::text;
  v_lines int[][] := array[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  i int;
begin
  select * into v_msg from public.messages where id = p_message_id for update;
  if not found or v_msg.metadata is null or v_msg.metadata->>'kind' <> 'game' then
    raise exception 'Game not found';
  end if;
  if not public.is_conversation_member(v_msg.conversation_id) then
    raise exception 'Not a member of this conversation';
  end if;
  v_meta := v_msg.metadata;
  if v_meta ? 'winner' or p_position < 0 or p_position > 8 then
    raise exception 'Invalid move';
  end if;
  v_board := v_meta->'board';
  if v_board->p_position <> 'null'::jsonb then
    raise exception 'Square taken';
  end if;
  v_mark := v_meta->>'currentTurn';
  if v_mark = 'X' then
    v_expected := v_meta->>'xPlayerId';
  else
    v_expected := v_meta->>'oPlayerId';
  end if;
  if v_expected is null then
    if v_uid = v_meta->>'xPlayerId' then
      raise exception 'Waiting for an opponent';
    end if;
    v_meta := jsonb_set(v_meta, '{oPlayerId}', to_jsonb(v_uid));
  elsif v_expected <> v_uid then
    raise exception 'Not your turn';
  end if;
  v_board := jsonb_set(v_board, array[p_position::text], to_jsonb(v_mark));
  v_meta := jsonb_set(v_meta, '{board}', v_board);
  v_meta := jsonb_set(v_meta, '{currentTurn}', to_jsonb(case when v_mark = 'X' then 'O' else 'X' end));
  for i in 1..8 loop
    if v_board->>(v_lines[i][1]) = v_mark
       and v_board->>(v_lines[i][2]) = v_mark
       and v_board->>(v_lines[i][3]) = v_mark then
      v_meta := jsonb_set(v_meta, '{winner}', to_jsonb(v_mark));
    end if;
  end loop;
  if not (v_meta ? 'winner') and not exists (
    select 1 from jsonb_array_elements(v_board) e where e = 'null'::jsonb
  ) then
    v_meta := jsonb_set(v_meta, '{winner}', '"draw"'::jsonb);
  end if;
  update public.messages set metadata = v_meta where id = p_message_id;
end;
$$;

grant execute on function public.vote_poll(uuid, text) to authenticated;
grant execute on function public.game_move(uuid, integer) to authenticated;


notify pgrst, 'reload schema';
