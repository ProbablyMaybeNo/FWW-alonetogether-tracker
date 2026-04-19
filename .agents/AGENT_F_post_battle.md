# Agent F — Post-Battle Summary & Stat Propagation

## Your Role
You are building the post-battle summary screen and the system that propagates all battle outcomes back into the persistent campaign data (roster, item pools, caps, objectives, campaign record). You depend on Agent E — do not start until Agent E confirms `active_battle.status === 'ended'` is being written correctly.

## Branch
`feature/live-battle-system` — all work goes on this branch.

## Project Context
- Path: `D:\AI-Workstation\Antigravity\apps\FWW-alone-together-tracker`
- Stack: React 19 + Vite, Tailwind v4, Supabase
- Read these files before starting:
  - `src/useCampaignSync.js` — all save methods, especially `savePlayer`, `patchBattles`, `patchNarratives`
  - `src/usePersistedState.js` — offline state shape + migrations
  - `src/App.jsx` — where NewRoundModal and other post-action flows are handled (mirror this pattern)
  - `BATTLE_REDESIGN_PLAN.md` → FINALIZED DECISIONS LOG — item pool hierarchy, propagation rules

## Trigger

When `active_battle.status === 'ended'` is detected (via Supabase subscription or local state change), unmount the Live Battle Tracker overlay and mount the Post-Battle Summary instead.

---

## Post-Battle Summary Component

Full-screen modal (not overlay — uses the existing `Modal` component) shown to all battle participants simultaneously.

### Step 1 — Outcome Selection (each player independently)

```
┌──────────────────────────────────────┐
│         HOW DID IT GO?               │
│                                      │
│  [MAJOR VICTORY]  [MINOR VICTORY]    │
│  [DRAW]           [LOSS]   [N/A]     │
│                                      │
│  Waiting for opponent to submit...   │
└──────────────────────────────────────┘
```

- Each player selects their outcome independently
- Stored in `active_battle.outcome[userId]`
- Once both have submitted, advance to Step 2 automatically
- If outcomes conflict (both claim Major Victory, etc.): show a note "Outcomes differ — please agree and resubmit" and let each player reselect. No automatic resolution.

### Step 2 — Battle Summary (shown to both players simultaneously)

```
┌──────────────────────────────────────┐
│         BATTLE COMPLETE              │
│  [Scenario Name] | Turn 7            │
│                                      │
│  ── PLAYER A (Major Victory) ──      │
│  Units lost: 2                       │
│  Items gained: Laser Pistol          │
│                Combat Armor          │
│  Caps gained: +150                   │
│  Objectives complete: 2 / 3          │
│                                      │
│  ── PLAYER B (Loss) ──               │
│  Units lost: 4                       │
│  Items gained: Stimpak               │
│  Caps gained: +80                    │
│  Objectives complete: 1 / 3          │
│                                      │
│  COMPLETED OBJECTIVES:               │
│  • Scavenge the Ruins → +50 caps     │
│  • Eliminate Leader → +1 perk point  │
│                                      │
│  [CONFIRM & APPLY]                   │
└──────────────────────────────────────┘
```

Derive this data from `active_battle`:
- Units lost: count of `removed: true` units in each player's battle roster
- Items gained: items in each player's loot tray (`lootedItems` across all units + unassigned item tray)
- Caps gained: sum of any caps-reward events in the battle log (or 0 if not tracked — leave as 0 for now, manual input can be added later)
- Objectives complete: count of checked objectives

### Step 3 — CONFIRM & APPLY

On click, execute all propagation in sequence. Show a loading state. On completion, dismiss and return to normal app.

---

## Propagation Rules (execute in this order)

### 1. Update `player_data.roster` for current player

For each unit in `active_battle.battleRosters[userId]`:
- Find the matching unit in `player_data.roster` by `slotId`
- Apply: `regDamage += battle.regDamage`, `radDamage += battle.radDamage`
- Apply conditions: if `condPoisoned`, `condInjuredArm`, `condInjuredLeg` were set during battle, set them on the roster unit
- Apply: `removed += battle.removed` (increment removal count)
- Apply: `battles += 1` (increment battle count for all units that participated, including removed ones)
- Apply fate change: if unit was `removed: true` during battle, set `fate: 'Pending'` on the roster unit (requires fate roll at next round end)
- Do NOT modify `equippedItems` — standard loadout always returns as-is

**Gate:** Show a confirmation screen before writing:
```
These changes will be applied to your roster:
• Preston Garvey: +2 wounds, +1 rad, fate → Pending
• Cait: +1 wound
[APPLY ROSTER CHANGES]  [EDIT]
```
Let the player edit individual values before confirming. This prevents permanent mistakes.

### 2. Remove battle items from units, move to Post-Battle Pool

- All items assigned from Battle Equipment Pool to units during setup: move to `item_pool` with `location: 'recovery'`
- Looted items from battle: move to `item_pool` with `location: 'recovery'`
- Unique/quest/objective items (if any flagged as such): add permanently to the unit's `equippedItems` on the roster and do NOT put in item pool

### 3. Apply caps

- Any caps gained during battle (from the log or summary input): add to `player_data.caps`

### 4. Update completed objectives

- For each checked-off objective: add to `player_data.completed_objectives`

### 5. Write battle record to `campaigns.battles`

Use the existing `patchBattles` RPC. Battle record shape (match existing format):
```javascript
{
  id: uuid,
  date: iso-timestamp,
  label: activeBattle.setup.label || 'Battle',
  scenario: activeBattle.setup.scenario.scenarioId,
  gameMode: activeBattle.setup.gameMode,
  turns: activeBattle.turn,
  participants: [
    { userId, playerName, outcome: activeBattle.outcome[userId], objectivesComplete: N }
  ]
}
```

### 6. Increment `campaigns.battle_count`

Use existing `patchCampaignProgress` RPC — increment `battle_count` by 1.

### 7. Auto-generate campaign narrative entry

```javascript
const narrative = `[PlayerA] vs [PlayerB] — [Scenario] (Turn ${turn}) — ${outcome}`
```
Call `patchNarratives` with this entry (see existing pattern in `useCampaignSync.js`).

### 8. Clear `active_battle`

Set `campaigns.active_battle = null` via `patch_active_battle(campaignId, null)`.

---

## Offline Mode

If running in localStorage mode (no Supabase), all the same propagation applies but writes to local state instead of Supabase. The battle record still writes to `campaign.battles` in local state. No opponent summary is shown in offline mode — just the current player's summary.

---

## Styling

- Summary modal: full-screen on mobile, centered max-width 600px on desktop
- Outcome buttons: large, clear — use existing button styles but bigger
- Player A section: pip-green accent; Player B section: info-blue accent
- CONFIRM & APPLY: amber primary CTA with loading spinner on click
- Roster confirmation screen: danger-amber border — this is a destructive write, signal it visually

## Definition of Done
- Outcome selection works for both players, waits for both before showing summary
- Summary correctly derives data from `active_battle`
- Roster confirmation gate works — player can edit before confirming
- All 8 propagation steps execute in order
- `active_battle` is cleared after confirmation
- App returns to normal state (Battles page) after confirmation
- Offline mode: all writes go to localStorage
- `npm run build` passes with 0 errors
- `git add` + `git commit`: `feat: post-battle summary and stat propagation`

## Report Back
When done, report:
1. How you handled the "both players must submit" sync (what happens if one player closes the app before submitting)
2. Whether the roster confirmation gate is fully editable or just a review screen
3. Any propagation step you had to skip or stub, and why
4. How unique/quest items were identified (what flag in the data marks them as such)
