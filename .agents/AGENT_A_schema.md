# Agent A — Supabase Schema Migration

## Your Role
You are building the database foundation for the FWW Alone Together Tracker's new Live Battle System. Every other agent's work depends on yours. Do this first. Do not move on until all migrations are applied and verified.

## Branch
`feature/live-battle-system` — all work goes on this branch.

## Project Context
- Path: `D:\AI-Workstation\Antigravity\apps\FWW-alone-together-tracker`
- Stack: React 19 + Vite, Supabase (PostgreSQL + real-time), Tailwind v4
- Supabase credentials: check `.env` or Vercel dashboard
- Package manager: npm
- Existing schema reference: `src/` — read `useCampaignSync.js` and `usePersistedState.js` for current data shapes before touching anything

## What Already Exists (do not modify)
- `campaigns` table: has `battle_page_state` (jsonb) — this gets REPLACED by `active_battle`
- `player_data` table: has `settlement_deck`, `settlement_discard` (jsonb arrays of item IDs)
- `campaign_players` table: existing player records
- All existing RPC functions: leave them alone

## Your Tasks

### 1. Add `active_battle` column to `campaigns`
```sql
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS active_battle jsonb DEFAULT NULL;
```
This replaces `battle_page_state` for live battle state. Do NOT drop `battle_page_state` yet — leave it in place until Agent E confirms the overlay is working.

Default shape when a battle starts (for reference — Agent E will populate this):
```json
{
  "version": 1,
  "status": "setup",
  "startedAt": null,
  "setup": {
    "gameMode": null,
    "participantUserIds": [],
    "opponentUserIds": [],
    "scenario": { "environmentId": null, "battlefieldId": null, "purposeId": null, "scenarioId": null },
    "pointsLimit": 500,
    "turnLimit": null,
    "wastelandItemsCount": 6
  },
  "readyFlags": {},
  "turn": 0,
  "turnHistory": [],
  "participants": {},
  "deckStates": {
    "creature": { "drawPile": [], "discardPile": [], "lastDrawn": null },
    "stranger": { "drawPile": [], "discardPile": [], "lastDrawn": null },
    "danger": { "drawPile": [], "discardPile": [], "lastDrawn": null },
    "explore": { "drawPile": [], "discardPile": [], "lastDrawn": null },
    "event": { "drawPile": [], "discardPile": [], "lastDrawn": null },
    "wastelandItems": { "drawPile": [], "discardPile": [], "lastDrawn": null }
  },
  "battleRosters": {},
  "log": [],
  "outcome": null,
  "endedAt": null
}
```

### 2. Add `settlement_item_deck` column to `player_data`
```sql
ALTER TABLE player_data ADD COLUMN IF NOT EXISTS settlement_item_deck jsonb DEFAULT NULL;
```

Shape:
```json
{
  "drawPile": ["itemId1", "itemId2"],
  "discardPile": ["itemId3"],
  "manuallyRestored": []
}
```
Note: `drawPile` contains all item IDs not yet drawn. `discardPile` is permanent discard. `manuallyRestored` tracks IDs the player manually moved back into the draw pile (for UI display only).

### 3. Add `battle_roster_presets` column to `player_data`
```sql
ALTER TABLE player_data ADD COLUMN IF NOT EXISTS battle_roster_presets jsonb DEFAULT '[]'::jsonb;
```

Shape (array of presets):
```json
[
  {
    "id": "uuid",
    "name": "750pt Raider Rush",
    "pointsLimit": 750,
    "unitSlotIds": ["slotId1", "slotId2"],
    "itemOverrides": { "slotId1": ["itemId1", "itemId2"] },
    "createdAt": "iso-date"
  }
]
```

### 4. Create RPC: `patch_active_battle`
```sql
CREATE OR REPLACE FUNCTION patch_active_battle(
  p_campaign_id uuid,
  p_active_battle jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only allow participants (campaign members) to update
  IF NOT EXISTS (
    SELECT 1 FROM campaign_players
    WHERE campaign_id = p_campaign_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not a campaign member';
  END IF;

  UPDATE campaigns
  SET active_battle = p_active_battle,
      updated_at = now()
  WHERE id = p_campaign_id;
END;
$$;
```

### 5. Create RPC: `patch_settlement_item_deck`
```sql
CREATE OR REPLACE FUNCTION patch_settlement_item_deck(
  p_campaign_id uuid,
  p_user_id uuid,
  p_settlement_item_deck jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Can only update own data';
  END IF;

  UPDATE player_data
  SET settlement_item_deck = p_settlement_item_deck,
      updated_at = now()
  WHERE campaign_id = p_campaign_id AND user_id = p_user_id;
END;
$$;
```

### 6. Verify RLS policies cover new columns
- `active_battle`: campaign members can read (via existing SELECT policy on campaigns). Only participants should write via the RPC (enforced in the function).
- `settlement_item_deck` / `battle_roster_presets`: players can only read/write their own (existing player_data RLS covers this).

Run this check after applying:
```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name IN ('campaigns', 'player_data')
AND column_name IN ('active_battle', 'settlement_item_deck', 'battle_roster_presets');
```
All three should appear in results.

### 7. Update offline localStorage migration in `usePersistedState.js`
- Find the `migrate` function (currently handles versions 1–9)
- Add version 10 migration that adds `settlementItemDeck: { drawPile: [], discardPile: [], manuallyRestored: [] }` and `battleRosterPresets: []` to the state object if not present
- Bump the version constant to 10

## Definition of Done
- All 3 columns exist in Supabase
- Both RPCs exist and are callable by authenticated users
- RLS verified — no unintended access
- localStorage migration bumped to version 10
- `git add` + `git commit` your changes with message: `feat: schema migration for live battle system (v10)`

## Report Back
When done, report:
1. Confirm all columns created (paste the verify query result)
2. Confirm both RPCs created
3. Confirm localStorage migration added
4. Any deviations from the plan and why
