# Agent D — Deck Builder (Decks Tab)

## Your Role
You are rebuilding the Decks tab on the Battle page into a proper deck builder with Browse and Build modes. This is largely a UI-only task — you are working with existing JSON card data. You can work in parallel with Agents A, B, and C.

## Branch
`feature/live-battle-system` — all work goes on this branch.

## Project Context
- Path: `D:\AI-Workstation\Antigravity\apps\FWW-alone-together-tracker`
- Stack: React 19 + Vite, Tailwind v4
- Read these files before starting:
  - `src/BattlesPage.jsx` — the page you are modifying (Decks tab)
  - `src/components/BattleDeckPanel.jsx` — existing deck UI, understand it before replacing
  - `src/data/battle/battleCreatures.json`
  - `src/data/battle/battleStrangers.json`
  - `src/data/battle/battleDangers.json`
  - `src/data/battle/battleExplores.json`
  - `src/data/battle/battleEvents.json`
  - `src/data/items.json` — for the Items deck

## What This Tab Becomes

The Decks tab manages 6 deck types. Replace the current stacked panel layout with a **chip nav** at the top, showing one deck at a time.

### Chip Nav
```
[Creature] [Stranger] [Danger] [Explore] [Event] [Items]
```
- Horizontal scrollable row
- Active chip highlighted with pip-green glow
- Default selected: Creature

---

## Each Deck Panel — Two Modes: BROWSE and BUILD

Each deck panel has a toggle at the top right: **[BROWSE | BUILD]**

---

### BROWSE Mode

A scrollable list of all cards for that deck type.

**Card list item layout:**
```
┌────────────────────────────────────────┐
│  Radscorpion          [Creature/Feral] │
│  ▼ (tap to expand)                     │
│  ─────────────────────────────────────  │  ← expanded state
│  [Full card text content here]          │
└────────────────────────────────────────┘
```

- Card name + type badge always visible
- Tap to expand: shows full card text/content
- Filter bar at top: text search (searches name and content) + type/faction filter dropdown
- For Creature and Stranger decks: faction filter (Survivor, Raiders, Institute, Brotherhood, Super Mutants, etc. — derive from the data)
- Default: collapsed, filtered to all

---

### BUILD Mode

Same list, but each card has an include/exclude toggle.

```
┌────────────────────────────────────────┐
│  Radscorpion          [Creature/Feral] │  [✓ IN DECK]
│  Deathclaw            [Creature/Feral] │  [+ ADD]
│  Mirelurk             [Creature/Mire]  │  [+ ADD]
└────────────────────────────────────────┘

Cards selected: 14 / 47 total
[Random 10 ▼]   [Clear All]   [Shuffle & Save]
```

**Behaviour:**
- Selected cards shown with a pip-green border or checkmark
- "Random N" button: dropdown to pick number (5, 10, 15, 20, All), respects current filter — randomizes from filtered subset
- "Clear All": deselects all
- "Shuffle & Save": finalises this deck — shuffles selected card indices and saves as the deck configuration for the upcoming battle
- Saved deck configuration stored in `player_data` under `battlePageState.deckStates.[deckKey]` (use existing pattern from `useCampaignSync.js`)
- Named preset save: optional "Save as Preset [_name_] [SAVE]" input — stored in `player_data` (add `deckPresets: {}` to state if not present, key by deck type)

---

### Items Deck (Special Case)

The Items deck is different from other decks:

- In **BROWSE mode**: shows all items from `items.json`, filterable by subType (Weapon, Armor, Consumable, Mod, etc.)
- In **BUILD mode**: this deck is NOT manually built — it is populated automatically during battle setup when players contribute cards from their Settlement Item Decks (Agent C/B handles this). Show an informational message instead of the build interface:
  ```
  The Wasteland Items Deck is built automatically during battle setup.
  Each player contributes cards from their Settlement Item Deck.
  Browse the full item pool above to see what could appear.
  ```
- The Wasteland Items Deck's current battle state (draw/discard piles) is shown here during an active battle — Agent E handles that live state, just leave a placeholder here for now.

---

## Styling
- Chip nav: horizontal scroll on mobile, no wrapping. Active chip = pip-green background + glow. Inactive = muted border.
- Card items: use the existing terminal panel style. Type badges use `text-xs` with coloured backgrounds matching card type (amber for danger, pip-green for creature, info-blue for stranger, etc.)
- Build mode selected state: pip-green left border or subtle green tint on the card row
- "Shuffle & Save" button: primary CTA style (amber or pip-green, full width at bottom of panel)

## Important Constraints
- Do NOT modify the live draw/discard mechanics that happen during battle — those are Agent E's domain
- Do NOT remove the existing draw mode from `BattleDeckPanel.jsx` — Agent E needs it. You are replacing the setup/build UI only.
- Keep the existing `battlePageState.deckStates` data shape compatible — you are writing to the same keys

## Definition of Done
- Chip nav renders and switches between 6 deck types
- Browse mode: all cards visible, expandable, filterable
- Build mode: include/exclude, random N, clear all, shuffle & save — all functional
- Items deck: browse works, build mode shows informational message
- Named preset save works (at least basic implementation)
- `npm run build` passes with 0 errors
- `git add` + `git commit`: `feat: deck builder with browse and build modes`

## Report Back
When done, report:
1. Card data shape you found in each JSON file (name of the content field used for full text)
2. How you handled the Items deck BUILD mode placeholder
3. Whether named presets are fully implemented or stubbed
4. Any card data missing content/text that defaulted to name-only display
