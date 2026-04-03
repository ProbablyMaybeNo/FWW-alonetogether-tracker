-- Paste into Supabase SQL Editor. Adds shared Battles page state + member RPC (same pattern as inhabitants).

alter table campaigns
  add column if not exists battle_page_state jsonb default '{}'::jsonb;

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
