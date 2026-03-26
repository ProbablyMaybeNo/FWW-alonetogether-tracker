-- Enable RLS
-- Profiles (username storage)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  created_at timestamptz default now()
);
alter table profiles enable row level security;
create policy "Users can read all profiles" on profiles for select using (true);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- Campaigns
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
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table campaigns enable row level security;
create policy "Campaign members can read" on campaigns for select using (
  exists (select 1 from campaign_players where campaign_id = campaigns.id and user_id = auth.uid())
);
create policy "Creator can update campaign" on campaigns for update using (auth.uid() = created_by);
create policy "Authenticated users can create campaigns" on campaigns for insert with check (auth.uid() = created_by);

-- Campaign players (membership)
create table if not exists campaign_players (
  id uuid default gen_random_uuid() primary key,
  campaign_id uuid references campaigns on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  player_name text,
  faction text,
  joined_at timestamptz default now(),
  unique(campaign_id, user_id)
);
alter table campaign_players enable row level security;
create policy "Members can read campaign roster" on campaign_players for select using (
  exists (select 1 from campaign_players cp2 where cp2.campaign_id = campaign_players.campaign_id and cp2.user_id = auth.uid())
);
create policy "Users can join campaigns" on campaign_players for insert with check (auth.uid() = user_id);
create policy "Users can update own membership" on campaign_players for update using (auth.uid() = user_id);

-- Per-player data
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
  updated_at timestamptz default now(),
  unique(campaign_id, user_id)
);
alter table player_data enable row level security;
create policy "Player can read own data" on player_data for select using (auth.uid() = user_id);
create policy "Campaign members can read others basic data" on player_data for select using (
  exists (select 1 from campaign_players where campaign_id = player_data.campaign_id and user_id = auth.uid())
);
create policy "Player can insert own data" on player_data for insert with check (auth.uid() = user_id);
create policy "Player can update own data" on player_data for update using (auth.uid() = user_id);

-- Function to update updated_at timestamp
create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger campaigns_updated_at before update on campaigns for each row execute function update_updated_at();
create trigger player_data_updated_at before update on player_data for each row execute function update_updated_at();
