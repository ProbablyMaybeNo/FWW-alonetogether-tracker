-- Add narrative_log column to player_data
alter table player_data
  add column if not exists narrative_log jsonb default '[]'::jsonb;

-- Allow all campaign members to update battles (security definer bypasses RLS)
create or replace function public.patch_campaign_battles(
  p_campaign_id uuid,
  p_battles jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not exists (
    select 1 from campaign_players
    where campaign_id = p_campaign_id and user_id = auth.uid()
  ) then
    raise exception 'not a campaign member';
  end if;

  update campaigns
  set battles = coalesce(p_battles, '{}'::jsonb)
  where id = p_campaign_id;

  if not found then
    raise exception 'campaign not found';
  end if;
end;
$$;

grant execute on function public.patch_campaign_battles(uuid, jsonb) to authenticated;

-- Ensure battle_page_state patch function exists
create or replace function public.patch_campaign_battle_page_state(
  p_campaign_id uuid,
  p_state jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not exists (
    select 1 from campaign_players
    where campaign_id = p_campaign_id and user_id = auth.uid()
  ) then
    raise exception 'not a campaign member';
  end if;

  update campaigns
  set battle_page_state = coalesce(p_state, '{}'::jsonb)
  where id = p_campaign_id;

  if not found then
    raise exception 'campaign not found';
  end if;
end;
$$;

grant execute on function public.patch_campaign_battle_page_state(uuid, jsonb) to authenticated;

-- Allow any campaign member to update phase/round/battleCount
create or replace function public.patch_campaign_progress(
  p_campaign_id uuid,
  p_phase int default null,
  p_round int default null,
  p_battle_count int default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not exists (
    select 1 from campaign_players
    where campaign_id = p_campaign_id and user_id = auth.uid()
  ) then
    raise exception 'not a campaign member';
  end if;

  update campaigns
  set
    phase       = coalesce(p_phase, phase),
    round       = coalesce(p_round, round),
    battle_count = coalesce(p_battle_count, battle_count)
  where id = p_campaign_id;

  if not found then
    raise exception 'campaign not found';
  end if;
end;
$$;

grant execute on function public.patch_campaign_progress(uuid, int, int, int) to authenticated;
