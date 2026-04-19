-- ============================================================
-- FWW Live Battle System — Agent A migration
-- Paste into Supabase SQL Editor and run on an existing database.
-- Idempotent: safe to re-run (IF NOT EXISTS / CREATE OR REPLACE).
-- ============================================================

alter table campaigns
  add column if not exists active_battle jsonb default null;

alter table player_data
  add column if not exists settlement_item_deck jsonb default null;

alter table player_data
  add column if not exists battle_roster_presets jsonb default '[]'::jsonb;

-- Verify (optional):
-- select column_name, data_type from information_schema.columns
-- where table_name in ('campaigns', 'player_data')
--   and column_name in ('active_battle', 'settlement_item_deck', 'battle_roster_presets');

create or replace function public.patch_active_battle(
  p_campaign_id uuid,
  p_active_battle jsonb
)
returns void
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
    raise exception 'Not a campaign member';
  end if;

  update campaigns
  set active_battle = p_active_battle,
      updated_at = now()
  where id = p_campaign_id;

  if not found then
    raise exception 'campaign not found';
  end if;
end;
$$;

grant execute on function public.patch_active_battle(uuid, jsonb) to authenticated;

create or replace function public.patch_settlement_item_deck(
  p_campaign_id uuid,
  p_user_id uuid,
  p_settlement_item_deck jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if auth.uid() != p_user_id then
    raise exception 'Can only update own data';
  end if;

  update player_data
  set settlement_item_deck = p_settlement_item_deck,
      updated_at = now()
  where campaign_id = p_campaign_id and user_id = p_user_id;

  if not found then
    raise exception 'player_data row not found';
  end if;
end;
$$;

grant execute on function public.patch_settlement_item_deck(uuid, uuid, jsonb) to authenticated;
