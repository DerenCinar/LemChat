-- Two-player grid games (Connect Four, Gomoku). Run after polls_games_migration.sql.
-- For connect-four p_position is the column (0-6); for gomoku it is the cell index (0-80).
create or replace function public.grid_game_move(p_message_id uuid, p_position integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_msg public.messages%rowtype;
  v_meta jsonb;
  v_board jsonb;
  v_game text;
  v_mark text;
  v_expected text;
  v_uid text := auth.uid()::text;
  v_cols int; v_rows int; v_win int; v_gravity boolean;
  v_idx int := -1;
  r int; c int; d int; s int; x int; y int; n int; dx int; dy int;
  v_dx int[] := array[1,0,1,1];
  v_dy int[] := array[0,1,1,-1];
begin
  select * into v_msg from public.messages where id = p_message_id for update;
  if not found or v_msg.metadata is null or v_msg.metadata->>'kind' <> 'game' then
    raise exception 'Game not found';
  end if;
  if not public.is_conversation_member(v_msg.conversation_id) then
    raise exception 'Not a member of this conversation';
  end if;
  v_meta := v_msg.metadata;
  v_game := v_meta->>'game';
  if v_game = 'connect-four' then
    v_cols := 7; v_rows := 6; v_win := 4; v_gravity := true;
  elsif v_game = 'connect-five' then
    v_cols := 9; v_rows := 7; v_win := 5; v_gravity := true;
  elsif v_game = 'mega-tic-tac-toe' then
    v_cols := 5; v_rows := 5; v_win := 4; v_gravity := false;
  elsif v_game = 'gomoku' then
    v_cols := 9; v_rows := 9; v_win := 5; v_gravity := false;
  else
    raise exception 'Unsupported game';
  end if;
  if v_meta ? 'winner' then
    raise exception 'Game is over';
  end if;
  v_board := v_meta->'board';

  if v_gravity then
    if p_position < 0 or p_position >= v_cols then raise exception 'Invalid move'; end if;
    for r in reverse (v_rows - 1)..0 loop
      if v_board->(r * v_cols + p_position) = 'null'::jsonb then
        v_idx := r * v_cols + p_position;
        exit;
      end if;
    end loop;
    if v_idx < 0 then raise exception 'Column full'; end if;
  else
    if p_position < 0 or p_position >= v_cols * v_rows then raise exception 'Invalid move'; end if;
    if v_board->p_position <> 'null'::jsonb then raise exception 'Square taken'; end if;
    v_idx := p_position;
  end if;

  v_mark := v_meta->>'currentTurn';
  if v_mark = 'X' then v_expected := v_meta->>'xPlayerId'; else v_expected := v_meta->>'oPlayerId'; end if;
  if v_expected is null then
    if v_uid = v_meta->>'xPlayerId' then raise exception 'Waiting for an opponent'; end if;
    v_meta := jsonb_set(v_meta, '{oPlayerId}', to_jsonb(v_uid));
  elsif v_expected <> v_uid then
    raise exception 'Not your turn';
  end if;

  v_board := jsonb_set(v_board, array[v_idx::text], to_jsonb(v_mark));
  v_meta := jsonb_set(v_meta, '{board}', v_board);
  v_meta := jsonb_set(v_meta, '{currentTurn}', to_jsonb(case when v_mark = 'X' then 'O' else 'X' end));

  c := v_idx % v_cols;
  r := v_idx / v_cols;
  for d in 1..4 loop
    dx := v_dx[d]; dy := v_dy[d]; n := 1;
    for s in -1..1 loop
      continue when s = 0;
      x := c + dx * s; y := r + dy * s;
      while x >= 0 and y >= 0 and x < v_cols and y < v_rows
            and v_board->>(y * v_cols + x) = v_mark loop
        n := n + 1;
        x := x + dx * s; y := y + dy * s;
      end loop;
    end loop;
    if n >= v_win then
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

grant execute on function public.grid_game_move(uuid, integer) to authenticated;

-- Reversi (8x8). Board is a flat array of 64 cells; X moves first.
create or replace function public.reversi_flips(b text[], p_idx int, p_mark text)
returns int[]
language plpgsql
immutable
as $$
declare
  v_opp text := case when p_mark = 'X' then 'O' else 'X' end;
  v_out int[] := '{}';
  v_run int[];
  d int; x int; y int; dx int; dy int;
  v_dx int[] := array[-1,0,1,-1,1,-1,0,1];
  v_dy int[] := array[-1,-1,-1,0,0,1,1,1];
begin
  if b[p_idx + 1] is not null then return v_out; end if;
  for d in 1..8 loop
    dx := v_dx[d]; dy := v_dy[d];
    v_run := '{}';
    x := (p_idx % 8) + dx; y := (p_idx / 8) + dy;
    while x >= 0 and y >= 0 and x < 8 and y < 8 and b[y * 8 + x + 1] = v_opp loop
      v_run := v_run || (y * 8 + x);
      x := x + dx; y := y + dy;
    end loop;
    if coalesce(array_length(v_run, 1), 0) > 0
       and x >= 0 and y >= 0 and x < 8 and y < 8
       and b[y * 8 + x + 1] = p_mark then
      v_out := v_out || v_run;
    end if;
  end loop;
  return v_out;
end;
$$;

create or replace function public.reversi_has_move(b text[], p_mark text)
returns boolean
language plpgsql
immutable
as $$
declare i int;
begin
  for i in 0..63 loop
    if coalesce(array_length(public.reversi_flips(b, i, p_mark), 1), 0) > 0 then return true; end if;
  end loop;
  return false;
end;
$$;

create or replace function public.reversi_move(p_message_id uuid, p_position integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_msg public.messages%rowtype;
  v_meta jsonb;
  v_b text[];
  v_mark text;
  v_opp text;
  v_expected text;
  v_uid text := auth.uid()::text;
  v_flips int[];
  f int;
  v_x int; v_o int;
begin
  select * into v_msg from public.messages where id = p_message_id for update;
  if not found or v_msg.metadata is null or v_msg.metadata->>'kind' <> 'game'
     or v_msg.metadata->>'game' <> 'reversi' then
    raise exception 'Game not found';
  end if;
  if not public.is_conversation_member(v_msg.conversation_id) then
    raise exception 'Not a member of this conversation';
  end if;
  v_meta := v_msg.metadata;
  if v_meta ? 'winner' or p_position < 0 or p_position > 63 then
    raise exception 'Invalid move';
  end if;
  select array_agg(e #>> '{}' order by ord) into v_b
    from jsonb_array_elements(v_meta->'board') with ordinality as t(e, ord);

  v_mark := v_meta->>'currentTurn';
  v_opp := case when v_mark = 'X' then 'O' else 'X' end;
  if v_mark = 'X' then v_expected := v_meta->>'xPlayerId'; else v_expected := v_meta->>'oPlayerId'; end if;
  if v_expected is null then
    if v_uid = v_meta->>'xPlayerId' then raise exception 'Waiting for an opponent'; end if;
    v_meta := jsonb_set(v_meta, '{oPlayerId}', to_jsonb(v_uid));
  elsif v_expected <> v_uid then
    raise exception 'Not your turn';
  end if;

  v_flips := public.reversi_flips(v_b, p_position, v_mark);
  if coalesce(array_length(v_flips, 1), 0) = 0 then
    raise exception 'Illegal move';
  end if;
  foreach f in array v_flips loop
    v_b[f + 1] := v_mark;
  end loop;
  v_b[p_position + 1] := v_mark;

  v_meta := jsonb_set(v_meta, '{board}', (
    select jsonb_agg(case when x is null then 'null'::jsonb else to_jsonb(x) end order by ord)
    from unnest(v_b) with ordinality as u(x, ord)
  ));

  if public.reversi_has_move(v_b, v_opp) then
    v_meta := jsonb_set(v_meta, '{currentTurn}', to_jsonb(v_opp));
  elsif public.reversi_has_move(v_b, v_mark) then
    v_meta := jsonb_set(v_meta, '{currentTurn}', to_jsonb(v_mark));
  else
    select count(*) filter (where x = 'X'), count(*) filter (where x = 'O') into v_x, v_o from unnest(v_b) as u(x);
    v_meta := jsonb_set(v_meta, '{currentTurn}', to_jsonb(v_opp));
    v_meta := jsonb_set(v_meta, '{winner}', to_jsonb(case when v_x = v_o then 'draw' when v_x > v_o then 'X' else 'O' end));
  end if;
  update public.messages set metadata = v_meta where id = p_message_id;
end;
$$;

grant execute on function public.reversi_move(uuid, integer) to authenticated;

notify pgrst, 'reload schema';
