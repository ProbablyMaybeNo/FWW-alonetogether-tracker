# Agent C — Battle Setup Wizard (Match Tab)

## Your Role
You are rebuilding the Battle page's Setup tab into a full multi-step battle setup wizard called the **Match tab**. This is the pre-battle configuration flow that culminates in a FIGHT! button launching the Live Battle Tracker. You depend on Agent A (schema) and Agent B (settlement deck hook). Do not start wiring Supabase until Agent A confirms the schema is live.

## Branch
`feature/live-battle-system` — all work goes on this branch.

## Project Context
- Path: `D:\AI-Workstation\Antigravity\apps\FWW-alone-together-tracker`
- Stack: React 19 + Vite, Tailwind v4, Supabase
- Read these files before starting:
  - `src/BattlesPage.jsx` — the page you are modifying
  - `src/useCampaignSync.js` — state management patterns
  - `src/data/battle/` — all scenario/environment/battlefield/purpose JSON files
  - `src/data/items.json` and `src/data/boosts.json` — item/boost pools
  - `src/data/units.json` — unit definitions with caps costs
  - `BATTLE_REDESIGN_PLAN.md` — full finalized decisions, especially section 4c and the FINALIZED DECISIONS LOG

## Tab Rename
The current four tabs on `BattlesPage.jsx` are: **Setup · Objectives · Scenarios · Decks**

Rename/restructure to: **Match · Decks · Scenarios · Objectives**

- **Match** replaces Setup (this file)
- **Decks** = Agent D's work (deck builder)
- **Scenarios** = keep as-is (browse only, no changes needed)
- **Objectives** = keep as-is (standalone, no changes)

## The Match Tab — Step-by-Step Wizard

On **mobile**: render as a vertical stepper — one step visible at a time with BACK / NEXT buttons.
On **desktop**: render as a single scrollable page with all steps visible.

Use a `step` state variable (1–5) to control mobile view. All steps always validate before NEXT is enabled.

---

### Step 1 — Opponent Selection
- List all players in `campaign_players` except the current user
- Each shows: player name, faction, settlement name
- Allow selecting one or more opponents (multi-select for future 3+ player support)
- At least one opponent must be selected to proceed

---

### Step 2 — Scenario Setup
- Dropdowns/selectors for: Environment, Battlefield, Purpose, Scenario
- Pull from existing JSON files in `src/data/battle/`
- Once a Scenario is selected, show a summary card with the scenario name and description inline
- Optional: free-text Terrain Notes field ("Describe your terrain layout")
- All fields optional — players can skip if using a custom/verbal scenario

---

### Step 3 — Battle Configuration
- **Points Limit**: number input, default 500, step 50
- **Turn Limit**: number input, optional (blank = no limit)
- **Game Mode**: dropdown — Skirmish / Into the Wasteland / Into the Vault (existing options)
- **Wasteland Items contribution**: number input — how many cards each player contributes from their Settlement Item Deck. Must be even (validate: min 2, max 20, must be even). Default 6.

---

### Step 4 — Battle Roster Build

This is the most complex step.

**Layout:**
```
Points Limit: 750  |  Used: 620  |  Remaining: 130
─────────────────────────────────────────────────
[+ ADD UNIT]   Filter: [All Factions ▼] [Search]

UNIT NAME          BASE  LOADOUT ITEMS       TOTAL  [REMOVE]
Preston Garvey     120   Laser Rifle (+45)   165    [×]
Cait               80    —                   80     [×]
...
─────────────────────────────────────────────────
BATTLE EQUIPMENT POOL
[Items/Boosts available to assign to units]
```

**Behaviour:**
- Units are selected from the player's current Roster Pool (`player_data.roster`) filtered by `fate: 'Active'` only (dead/delayed/lost units not selectable)
- Each unit shows its base caps cost
- Player can assign items AND boosts from the **Battle Equipment Pool** to each unit
- Battle Equipment Pool = items in `item_pool` where `location === 'stores'` + boosts in `boost_hand`
- When an item/boost is assigned to a unit: its caps cost is added to that unit's total. If it replaces a standard loadout item: the standard item's cost is subtracted first (net change)
- Standard loadout items removed for the battle are flagged as "replaced for battle only" — they do NOT update the unit's `equippedItems` on the roster
- Running total updates in real time
- Cannot exceed points limit (show warning, prevent adding if over)
- Minimum: 1 unit required

**Important:** All battle roster assignments are stored in the `active_battle.battleRosters[userId]` object in Supabase, not in `player_data.roster`. The roster page is never modified during battle setup.

---

### Step 5 — Objectives & Decks

**Objectives:**
- Player selects their Battle Objective from the existing objectives list (pull from `scavengerObjectives.js` or whatever source the Objectives tab currently uses)
- Player selects a Secret Quest/Objective (shown as [SECRET] to opponent during battle)
- Both are optional

**Deck Selection (which decks to use this battle):**
- Checkboxes for each deck type: Creature / Stranger / Danger / Explore / Event
- Wasteland Items is always included if contribution count > 0
- Default: all checked

**Wasteland Items Deck preview:**
- Show: "You will contribute X cards from your Settlement Item Deck. They will be permanently discarded after this battle."
- If Agent B's `contributeCardsToBattle` is available, call it here on FIGHT! — otherwise stub it

---

### FIGHT! Button

At the bottom of Step 5 (or always visible on desktop as a sticky footer):

- Disabled until: opponent selected, at least 1 unit in roster, points limit not exceeded
- Shows "Waiting for opponent to ready up" state (future — for now just launch immediately)
- On click:
  1. Call `contributeCardsToBattle(wastelandItemsCount)` from Agent B's hook — get the item IDs removed from the Settlement Item Deck
  2. Build the initial `active_battle` object (see Agent A's schema for the shape)
  3. Set `active_battle.status = 'active'`, `active_battle.startedAt = new Date().toISOString()`
  4. Populate `active_battle.battleRosters[userId]` with the built roster
  5. Populate `active_battle.deckStates.wastelandItems.drawPile` with the contributed item IDs (shuffled)
  6. Call `patch_active_battle(campaignId, activeBattle)` RPC
  7. Set local state to open the Live Battle Tracker overlay (Agent E will handle the overlay component — for now just `console.log('FIGHT! triggered', activeBattle)` and show a placeholder "Battle Starting..." message)

## State to Persist
Store the in-progress setup in `campaigns.active_battle` with `status: 'setup'` so players can return to it if they close the tab. On page load, if `active_battle.status === 'setup'`, restore the wizard to where they left off.

## Styling
- Match terminal aesthetic throughout
- Step indicator on mobile: "Step 2 of 5" text at top, no fancy progress bar needed
- Points limit bar: a simple text display is fine, no need for a graphical bar
- FIGHT! button: large, full-width, amber/warning colour with glow effect — this is the primary CTA

## Definition of Done
- All 5 steps render and validate correctly
- Battle roster builds with real-time caps tracking
- Item/boost assignment from Battle Pool works
- Wasteland Items contribution count is configurable and validated (even number)
- FIGHT! triggers the active_battle write to Supabase
- Setup state persists on refresh
- `npm run build` passes with 0 errors
- `git add` + `git commit`: `feat: battle setup wizard (Match tab)`

## Report Back
When done, report:
1. Exact shape of `active_battle` object written on FIGHT!
2. How you handled the "replaced for battle only" item tracking
3. Any data in `units.json` or `items.json` that was missing or needed special handling
4. What the FIGHT! trigger currently does (placeholder or wired to Agent E)
