-- ============================================================
-- FWW Alone Together — Supabase Schema
-- Paste this entire file into the Supabase SQL Editor and run.
-- ============================================================

-- ── 1. TABLES (all created before any cross-referencing policies) ──

create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  created_at timestamptz default now()
);

create table if not exists campaigns (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  invite_code text unique not null default upper(substr(md5(random()::text), 1, 6)),
  created_by uuid references auth.users on delete set null,
  phase int default 1 not null,
  round int default 0 not null,
  battle_count int default 0 not null,
  phase1_cap_limit int default 750 not null,
  explore_locations jsonb default '{}'::jsonb,
  battles jsonb default '{}'::jsonb,
  inhabitants_state jsonb default '{"decks":[],"session":{"round":0,"items":[]},"pendingDraw":null}'::jsonb,
  battle_page_state jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists campaign_players (
  id uuid default gen_random_uuid() primary key,
  campaign_id uuid references campaigns on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  player_name text,
  faction text,
  joined_at timestamptz default now(),
  unique(campaign_id, user_id)
);

create table if not exists player_data (
  id uuid default gen_random_uuid() primary key,
  campaign_id uuid references campaigns on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  caps int default 0,
  roster jsonb default '[]'::jsonb,
  settlement jsonb default '{"structures":[],"landPurchased":false}'::jsonb,
  item_pool jsonb default '{"items":[]}'::jsonb,
  quest_cards jsonb default '[]'::jsonb,
  drawn_quest_ids jsonb default '[]'::jsonb,
  discarded_quest_ids jsonb default '[]'::jsonb,
  event_cards jsonb default '{}'::jsonb,
  active_events jsonb default '[]'::jsonb,
  explore_cards_this_round int default 0,
  active_scavenger_objective text,
  completed_objectives jsonb default '[]'::jsonb,
  objective_progress jsonb default '{}'::jsonb,
  secret_purpose_history jsonb default '[]'::jsonb,
  player_info jsonb default '{}'::jsonb,
  settlement_deck jsonb default '[]'::jsonb,
  settlement_discard jsonb default '[]'::jsonb,
  boost_hand jsonb default '[]'::jsonb,
  boost_deck jsonb default '[]'::jsonb,
  boost_discard jsonb default '[]'::jsonb,
  updated_at timestamptz default now(),
  unique(campaign_id, user_id)
);

-- ── 2. ENABLE RLS ──

alter table profiles enable row level security;
alter table campaigns enable row level security;
alter table campaign_players enable row level security;
alter table player_data enable row level security;

-- ── 3. POLICIES — profiles ──

create policy "profiles_select_all" on profiles
  for select using (true);

create policy "profiles_insert_own" on profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id);

-- ── 4. POLICIES — campaigns ──
-- Note: campaign_players table must exist before these policies run (it does — see above).

create policy "campaigns_select_members" on campaigns
  for select using (
    exists (
      select 1 from campaign_players
      where campaign_players.campaign_id = campaigns.id
        and campaign_players.user_id = auth.uid()
    )
  );

create policy "campaigns_insert_own" on campaigns
  for insert with check (auth.uid() = created_by);

create policy "campaigns_update_creator" on campaigns
  for update using (auth.uid() = created_by);

create policy "campaigns_delete_creator" on campaigns
  for delete using (auth.uid() = created_by);

-- ── 5. POLICIES — campaign_players ──

create policy "campaign_players_select_members" on campaign_players
  for select using (
    exists (
      select 1 from campaign_players cp2
      where cp2.campaign_id = campaign_players.campaign_id
        and cp2.user_id = auth.uid()
    )
  );

create policy "campaign_players_insert_self" on campaign_players
  for insert with check (auth.uid() = user_id);

create policy "campaign_players_update_self" on campaign_players
  for update using (auth.uid() = user_id);

create policy "campaign_players_delete_self" on campaign_players
  for delete using (auth.uid() = user_id);

create policy "campaign_players_delete_by_creator" on campaign_players
  for delete using (
    exists (
      select 1 from campaigns
      where campaigns.id = campaign_players.campaign_id
        and campaigns.created_by = auth.uid()
    )
  );

-- ── 6. POLICIES — player_data ──

create policy "player_data_select_own" on player_data
  for select using (auth.uid() = user_id);

create policy "player_data_select_campaign_members" on player_data
  for select using (
    exists (
      select 1 from campaign_players
      where campaign_players.campaign_id = player_data.campaign_id
        and campaign_players.user_id = auth.uid()
    )
  );

create policy "player_data_insert_own" on player_data
  for insert with check (auth.uid() = user_id);

create policy "player_data_update_own" on player_data
  for update using (auth.uid() = user_id);

-- ── 7. updated_at trigger ──

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger campaigns_updated_at
  before update on campaigns
  for each row execute function update_updated_at();

create trigger player_data_updated_at
  before update on player_data
  for each row execute function update_updated_at();
