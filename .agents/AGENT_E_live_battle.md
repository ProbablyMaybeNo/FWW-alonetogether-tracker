# Agent E — Live Battle Tracker Overlay

## Your Role
You are building the Live Battle Tracker — the full-screen overlay that launches when players press FIGHT! and runs for the duration of the battle. This is the most complex component in the project. You depend on Agent A (schema), Agent B (settlement deck hook), and Agent C (battle setup + FIGHT! trigger). Do not start until you have confirmed Agent A's schema is live and Agent C's FIGHT! trigger is writing to `campaigns.active_battle`.

## Branch
`feature/live-battle-system` — all work goes on this branch.

## Project Context
- Path: `D:\AI-Workstation\Antigravity\apps\FWW-alone-together-tracker`
- Stack: React 19 + Vite, Tailwind v4, Supabase real-time subscriptions
- Read ALL of these before starting:
  - `src/useCampaignSync.js` — how Supabase real-time subscriptions work in this app. Mirror this pattern.
  - `src/App.jsx` — where to mount the overlay (it should render above the main nav when active)
  - `src/components/BattleDeckPanel.jsx` — existing draw/discard UI to reuse or reference
  - `src/data/battle/` — all card JSON files
  - `src/data/items.json` — full item list (for loot picker)
  - `BATTLE_REDESIGN_PLAN.md` → FINALIZED DECISIONS LOG — especially the Live Battle Tracker Layout section

## Overview

When `campaigns.active_battle.status === 'active'`, render a full-screen overlay on top of the entire app. All players in the battle see their own version of this overlay, updated in real time via Supabase subscriptions on the `campaigns` table.

Mount point: in `App.jsx`, after the main `<AppShell>`, add:
```jsx
{activeBattle?.status === 'active' && (
  <LiveBattleTracker
    activeBattle={activeBattle}
    currentUserId={user.id}
    campaignId={campaignId}
    onPatchBattle={patchActiveBattle}
  />
)}
```

## Real-Time Sync Pattern

Subscribe to `campaigns` table changes (the `active_battle` column) using the existing Supabase subscription pattern in `useCampaignSync.js`. When any player makes a change to `active_battle`, all players' overlays update within ~1 second.

Every mutation in the overlay:
1. Optimistically updates local state immediately
2. Calls `patchActiveBattle(campaignId, newActiveBattle)` to write to Supabase
3. Remote players receive the update via their subscription

Use a simple merge strategy: always write the full `active_battle` object (not partials). Include a `lastUpdatedBy: userId` field to prevent echo loops (ignore incoming updates where `lastUpdatedBy === currentUserId`).

---

## Layout

### Mobile (< 768px): Vertical Scroll

```
┌──────────────────────────────────────┐
│  BATTLE: [Scenario]  Turn 3  [NEXT▶] │  ← Sticky header
├──────────────────────────────────────┤
│  [▼ YOUR ROSTER]  tap to expand      │  ← Collapsible, starts collapsed
│    [unit cards with live stats]      │
├──────────────────────────────────────┤
│  ──── DECKS ────                     │  ← Always visible, scrolls with page
│  [deck rows]                         │
│  ──── EVENTS ────                    │
│  [event card content]                │
│  ──── WASTELAND ITEMS ────           │
│  [items deck]                        │
│  [END BATTLE]                        │
├──────────────────────────────────────┤
│  [▼ OPPONENT ROSTER]  tap to expand  │  ← Collapsible, starts collapsed
└──────────────────────────────────────┘
```

### Desktop (≥ 768px): Three Columns

```
┌──────────────────────────────────────────────────────────┐
│  BATTLE: [Scenario Name]               Turn 3  [NEXT ▶] │
├──────────────┬───────────────────────┬───────────────────┤
│ YOUR ROSTER  │   BATTLE INFO         │ OPPONENT ROSTER   │
│              │                       │                   │
│ [unit list]  │  DECKS               │  [opponent units] │
│ [objectives] │  [deck rows]          │  (live updated)   │
│ [quests]     │  EVENTS               │  Quests: [SECRET] │
│              │  [event card]         │                   │
│              │  WASTELAND ITEMS      │                   │
│              │  [items deck]         │                   │
│              │  [END BATTLE]         │                   │
└──────────────┴───────────────────────┴───────────────────┘
```

---

## Component Breakdown

### 1. Sticky Header
- Battle label / scenario name
- "Turn X" counter
- [◀ PREV] [NEXT ▶] buttons for turn navigation
- Turn history: when NEXT is pressed, snapshot the current `participants` unit states into `active_battle.turnHistory[currentTurn]`. When PREV is pressed, restore that snapshot for editing. Temp snapshots deleted on END BATTLE.

### 2. Your Roster Column / Section

For each unit in `active_battle.battleRosters[currentUserId]`:

```
┌─────────────────────────────────────┐
│  Preston Garvey  [Active]  165 caps │
│  HP: ██████░░  Rad: █░░░░           │
│  Items: Laser Rifle, Combat Armor   │
│  Looted: —                          │
│  [WOUND] [RAD] [CONDITION] [REMOVE] │
└─────────────────────────────────────┘
```

- **WOUND**: increment `regDamage` by 1
- **RAD**: increment `radDamage` by 1
- **CONDITION**: dropdown — Poisoned / Injured Arm / Injured Leg / toggle on/off
- **REMOVE**: mark unit as `removed: true`, increment `removed` count, prompt "Loot corpse?" (see Loot Picker below)
- Health bar: visual representation of `regDamage` and `radDamage` vs a max (use unit's base caps / 10 as a rough max, or just show numbers if too complex)
- All changes write to `active_battle.participants[currentUserId].units[slotId]`

**Objectives section** (below unit list):
- Player's selected Battle Objective: name + checkbox to mark complete
- Player's Secret Quest: shown in full to the player, shown as [SECRET] to opponents

### 3. Opponent Roster Column / Section

Mirror of Your Roster but:
- Read from `active_battle.participants[opponentUserId].units`
- Read-only — no action buttons
- Objectives shown as [SECRET] if secret
- Updates in real time from Supabase subscription

### 4. Battle Info — Decks Section

For each active deck (creature, stranger, danger, explore, event):
```
CREATURE DECK  |  12 remaining  |  4 discarded
Last drawn: Radscorpion
```
- Show deck name, remaining count, discarded count, last drawn card name
- No draw button here — draws happen via the Events section and individual deck draw buttons below

For EVENT deck specifically — show the full card content of the last drawn event card (not just name).

Add a **[DRAW: DeckName]** button for each deck. When pressed:
- Move first card from `drawPile` to `discardPile`
- Set `lastDrawn` to that card's ID
- Lookup card content from the relevant JSON file
- Write updated `deckStates` to `active_battle`
- All players see the update within ~1 second

### 5. Battle Info — Wasteland Items Deck

Same draw/discard mechanic as other decks.

When an Item card is drawn:
- Show item name + subType
- Prompt: "Assign to [dropdown of your units] or [Add to Item Tray]"
- If assigned to a unit, add to that unit's `lootedItems` array in `active_battle.participants[currentUserId].units[slotId]`
- Item Tray = unassigned drawn items, shown at bottom of Your Roster column

### 6. Loot Picker (modal)

When a unit is removed ("REMOVE" button), show a small modal:
```
[Unit Name] has been removed.
Loot this corpse?
[Search items: ____________]
[Item list — scrollable, searchable by name]
[SKIP]  [LOOT SELECTED ITEM]
```
- Full `items.json` list, searchable
- Selected item added to the removing player's loot tray
- Multiple loots allowed (can reopen after closing)

### 7. Battle Log

Auto-generated text log stored in `active_battle.log`:
```javascript
{ turn: 3, timestamp: "iso", userId: "...", event: "Drew Radscorpion from Creature deck" }
{ turn: 3, timestamp: "iso", userId: "...", event: "Preston Garvey took 1 wound" }
```
Append an entry for every action (draw, wound, rad, condition, remove, loot, turn change).
Show as a collapsible read-only panel at the bottom of the Battle Info column.

### 8. END BATTLE Button

- Large, full-width, danger-red colour with glow
- On click: show a confirmation modal:
  ```
  End the battle?
  Your outcome: [Major Victory ▼] [Minor Victory] [Draw] [Loss] [N/A]
  [CONFIRM END]  [CANCEL]
  ```
- On CONFIRM: set `active_battle.status = 'ended'`, `active_battle.endedAt = now()`, write to Supabase
- This triggers the Post-Battle Summary (Agent F)

---

## Turn System

- Turn counter starts at 1
- NEXT TURN: increment turn, snapshot current unit states into `turnHistory[turn]`
- PREV TURN: decrement turn, load that turn's snapshot for editing
- Turn snapshots are part of `active_battle.turnHistory` — an array of participant state snapshots
- On END BATTLE: `turnHistory` is NOT cleared from Supabase (kept for battle log/history). Cleared from local state after Post-Battle Summary is confirmed.

---

## Styling

- Full-screen overlay: `position: fixed; inset: 0; z-index: 50; background: var(--color-bg)`
- Header: sticky top, dark background, amber turn counter
- Your Roster: pip-green accent
- Opponent Roster: info-blue or muted accent (visually distinct from yours)
- Battle Info: neutral, terminal-style
- END BATTLE: danger-red (`--color-danger`) with glow
- Collapsible sections: chevron toggle, animate height if possible
- All action buttons: minimum 44px touch target

## Definition of Done
- Overlay mounts when `active_battle.status === 'active'`
- All unit tracking works (wound, rad, condition, remove)
- All deck draw/discard works with real-time sync
- Loot picker works
- Opponent roster updates live from Supabase subscription
- Turn counter + history (prev/next) works
- Battle log appends correctly
- END BATTLE sets status to 'ended'
- Works in two browser windows simultaneously (test this explicitly)
- `npm run build` passes with 0 errors
- `git add` + `git commit`: `feat: live battle tracker overlay with real-time sync`

## Report Back
When done, report:
1. How you handled the echo-loop prevention on Supabase subscription updates
2. Any Supabase subscription limitations you hit (e.g., payload size for large battle states)
3. How turn history snapshots are structured
4. Whether the three-column desktop layout and collapsible mobile layout both work
5. Anything deferred or stubbed
