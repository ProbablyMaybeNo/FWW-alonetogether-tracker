-- Paste THIS ENTIRE FILE's contents into Supabase Dashboard → SQL Editor → New query.
-- Do not paste the path (e.g. src/lib/...); only the SQL below must run.
--
-- 1) Column for shared inhabitant deck + session state (JSON).
-- 2) RPC so any campaign member can update this payload (RLS on campaigns is creator-only for direct UPDATE).

alter table campaigns
  add column if not exists inhabitants_state jsonb
  default '{"decks":[],"session":{"round":0,"items":[]},"pendingDraw":null}'::jsonb;

create or replace function public.patch_campaign_inhabitants_state(
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
  set inhabitants_state = coalesce(p_state, '{}'::jsonb)
  where id = p_campaign_id;

  if not found then
    raise exception 'campaign not found';
  end if;
end;
$$;

grant execute on function public.patch_campaign_inhabitants_state(uuid, jsonb) to authenticated;
