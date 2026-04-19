# FWW Alone Together Tracker — Full Audit & Mobile/Battle Redesign Report

> Generated: 2026-04-18  
> Add your notes under each section or at the bottom in the NOTES section.

---

## 1. App Overview

The FWW Alone Together Tracker is a React/Vite SPA deployed on Vercel, backed by Supabase. It supports multiplayer campaigns (Supabase) and solo offline play (localStorage). The app covers the full FWW campaign loop: roster building, settlement management, deck/card mechanics, battle setup, quest/event tracking, and campaign narrative.

**Pages:** Campaign · Overview · Roster · Settlement · Battles · Events · Objectives  
**Stack:** React 19, Vite, Tailwind v4, Supabase (auth + real-time), localStorage fallback

---

## 2. Mobile UI/UX Audit

### Current State

The app uses a terminal-style aesthetic (dark, glow effects, amber/pip green palette). Layout relies entirely on Tailwind flexbox/grid wrapping — there are **no explicit responsive prefixes** (`md:`, `lg:`) used anywhere in the codebase. The app adapts by wrapping, not by truly reconfiguring for mobile. This creates a series of predictable problems on small screens.

### Critical Mobile Pain Points

| Area | Problem |
|---|---|
| **Navigation** | Tab bar at top — on mobile with 7 tabs (Campaign, Overview, Roster, Settlement, Battles, Events, Objectives) text is extremely cramped or overflows entirely |
| **Roster page** | Multi-column table (Name, Health, Fate, Removal, Battles, Items, Perks, Perk Cap, Remove) — completely unusable on a 375px screen as-is |
| **Battles → Decks tab** | Seven separate deck panels stacked vertically, each with collapsible card lists — enormous vertical scroll, no way to jump between decks |
| **Settlement → Structures** | Card grid with action buttons (repair, reinforce, scrap, toggle power) — buttons cluster and overlap on narrow screens |
| **Modals** | `wide` prop variant not responsive-aware — wide modals overflow viewport on mobile |
| **Typography scale** | `text-[10px]` / `text-xs` is already at the readable floor on desktop — on mobile retina screens it's technically legible but fatiguing |
| **Touch targets** | Several action buttons are `px-2 py-1` — well below the 44px recommended minimum touch target size |
| **Stat cards** | Stat card grids wrap unpredictably — the visual hierarchy collapses on small screens |
| **Card draw UI** | The draw/discard interface in decks requires precise taps on small labels |
| **Overview page** | Dense data (settlement stats, roster stats, campaign stats, scavenger objectives, battle hand) — no visual separation of concern on mobile |

### Recommended Mobile Changes

**Navigation:**
- Replace the horizontal text tab bar with a bottom navigation bar (mobile native pattern). Use icons + short labels. 7 items is too many for a bottom nav — group "Events" and "Objectives" under a single "Quests" tab to bring it to 6 max. Consider a "more" overflow if needed.
- Highlight the active tab with the pip-green glow you already have for interactive elements.

**Roster:**
- Replace the table with a card-per-unit layout on mobile. Each unit card shows: name, fate badge, health bar (rad vs reg damage), a chevron to expand for items/perks/conditions. Actions (roll fate, add item, remove) live in the expanded state.
- The multi-column table is fine as a desktop view — use a layout toggle or auto-switch based on viewport.

**Settlement:**
- Structures should display as a list of cards, not a dense table. Each structure card: name, condition pip, power toggle, a horizontal row of action buttons.
- The three sub-tabs (Structures · Item & Boost Decks · Explore) should be sticky at the top of the settlement section, not lost in scroll.

**Overview:**
- Break the dense overview into collapsible sections: Campaign Summary / Settlement / Roster / Quests. Collapsed by default on mobile, expanded on desktop. The amount of data here is overwhelming at a glance on a small screen.

**Battles / Decks:**
- The deck panels need a secondary nav inside the tab — a horizontal scrolling chip row (Creature · Stranger · Danger · Explore · Event · Population · Items) that shows only the selected deck panel, not all seven stacked.

**Modals:**
- All modals should max-height at 90vh with internal scroll, and have a safe-area-inset bottom padding for modern phones. The `wide` variant should become full-screen on mobile.

**Touch targets:**
- Enforce 44px minimum for all interactive elements in the critical path (draw button, fate roll, add/remove unit).

**General:**
- Consider a "quick actions" FAB (floating action button) on the roster and settlement pages for the most common action (Add Unit / Add Structure).

---

## 3. Features to Change, Remove, or Add (Mobile Focus)

### Change

| Feature | Current | Recommended |
|---|---|---|
| Tab navigation | Horizontal top tabs, text only | Bottom nav bar, icons + labels |
| Roster display | Table | Unit cards, expandable |
| Overview | Single dense scroll | Collapsible sections |
| Battle decks | All 7 stacked | Chip-nav single panel view |
| Modals | Fixed `wide` class | Full-screen on mobile |
| Deck setup (checkbox lists) | Long scrollable checkbox list | Searchable/filterable chip selector |
| Caps display | Small label in header | Persistent floating chip at bottom-right (always visible) |

### Remove

- The separate "Objectives" page as a standalone tab — integrate scavenger objectives into Overview as a collapsible section. It's too lightweight to justify its own tab slot on mobile. > NOTE: Keep the objectives tab as a stand alone so that players can reference the different objectives withouit having to be inside the "live battle tracker"
- Duplicate narrative display (Overview has a narrative section AND Campaign has one) — consolidate to Campaign only.
- `text-[10px]` sizing — too small anywhere. Floor should be `text-xs` (12px).

### Add

- **At-a-glance campaign status widget**: A persistent top banner (collapsible) on every page showing: Phase · Round · Active Battle (if any). Currently you have to navigate to Campaign to know where you are. > NOTE: I think this is unecessary we are trying to cut back on clutter not add more.
- **Unit quick-status overlay**: Swipe a unit card to reveal damage/condition controls rather than requiring navigation into a modal. < NOTE: Thos could work but it needs to be done well and display enough info for it to be useful. Otherwise just keep regular full modal>
- **Empty state messaging**: Many panels show nothing with no explanation when empty (no units, no decks set up). Friendly empty states with action prompts improve onboarding.
- **Onboarding flow**: New players who join a campaign see a blank app with no guidance. A simple "here's what to do first" prompt per page would dramatically reduce confusion.
- **Offline indicator**: Make it clear when operating in localStorage mode vs Supabase mode.

---

## 4. The Battle Section — Redesign Proposal

### 4a. Clarifying Questions (ADD YOUR ANSWERS HERE)

1. **Real-time sync scope**: When you say "shared UI window overlay" — do you mean all players literally see the same interface updating in real time (like a shared Google Doc) via Supabase subscriptions? Or is it more like each player has their own view but it reflects the shared battle state?

   > YOUR ANSWER: Each player has their own view but it updates in real time. Ideally I think how it would work best would be for each player to see their own "LIVE BATTLE TRACKER" Modal which on one side had a live list of their selected roster for that specific battle, for each unit on the roster they would see their equipment, perks, damage, radiation, injuries, conditions, plus looted equipment from that battle, etc. Then underneath that list each player would see their current objectives, current quests,etc, chosen during battle setup. 
   
   Then in the middle would be a section containing Live Battle info, Turn number, Game Mode/scenario, Decks with total cards in deck/cards drawn and the last card drawn for each deck "face up" not sure how hard it would be to scrape all the content of each card though...maybe too much of a task at first to start we could just see the name of the last drawn card which gets replaced when a new card is drawn. The decks would be determined during set up mainly by the game mode but also manually if players want to just add that deck to any of their games. These decks would be the stranger, danger, creature, explore, etc, cards. Then below those would be an events deck which players would draw from randomly and would need to display the actual content of the card in the live battle tracker modal, then finally below those would be the "Wasteland Items Deck" which would be a deck of items chosen randomly, or manually, or both, from both players "settlement item decks" equally. SEE BELOW FOR MORE DETAILS At the bottom of the center column would be a "END BATTLE" button. When it was clicked a pop-up would appear on both players screens asking them to report the outcome of the battle, Major/Minor victory, draw, loss. This info would be updated live on a battle report tracker on the campaign page. Players couldn't start/join another battle until their previous battle outcome was submitted. When the battle report is submitted All the stats being tracked for each unit are added to the same units on the players Roster Page, damage, radiation, injuries, Removed, battles,  fate, etc, all transfer to the same units on the larger roster pool to track their persistent growth over the course of the campaign. The Units stats on the Roster Page will also be affected when the UNITS REST or when their FATE is determined by a FATE ROLL. Also at the top of the center column would be a "Battle Turn" counter with a "Next turn" button that the players pressed to progress to the next turn, they should also be able to go back to previous turns to make changes or add things they forgot, the UNIT status would temporarily save between each turn so players could go back to see what was added when and add things or make changes they forgot in a previous turn. At the end of the battle these temporary turn saves would be deleted.

   Then on the opposite side to the "players Roster" there would be the "opponents Roster" which would be a list of units that the opponent chose for this battle. It would update live as the opponent tracked their damage, radiation, etc, on their units including items looted by each unit. Quests and Secret objecti8ves would be hidden. 

   Finally at the end of each submits their battle report. Status, damage, removed, battles, injuries, etc, are all carried over to the players ROSTER POOL on the ROSTER page. Any items that they finish the battle with in their UNITS possession are added to the "POST-BATTLE EQUIPMENT POOL" where they are either carried over into the settlement equipment pool using mechanical sheds or sold for their value in caps when the next campaign round is triggered. 
   
   ITEMS DECKS INFO: When cards are added to the wasteland items deck they are removed from both players persistent Settlement items deck and added to the discard pile, plus the wasteland deck, for the next battle only. This is the same settlement items deck containing all the items currently available in the game that players would draw from individually during the settlement phase. Which would need to be tracked on the settlement page. Doesn't need to be fancy, maybe just a sections with "Settlement  Item Deck -- 29/1000" and a DRAW button and DISCARDED button allowing players to draw an items when needed and to also see a basic list of the names of previously drawn/discarded settlement cards.  

2. **Campaign Items Deck — origin**: You describe players drawing from their Campaign Items Deck during settlement phase and also contributing to battle item decks. Is this Campaign Items Deck the same as the current "settlement deck" / "item pool" system, or is it a separate new deck that needs to be built from scratch? 

   > YOUR ANSWER: NOTE: I beleive the campaign deck is the same as the settlement deck / item pool. Please see above for more info but basically each player as a persistent "SETTLEMENT ITEM DECK" which all items are drawn from. Mostly during the settlement phase when structures are used or during battle when looted. Anytime a card is drawn from this deck, for any reason, it is added to a SETTLEMENT ITEM DECK DISCARD PILE. When players setup a battle an equal number of cards are chosen randomly from each players ITEM SETTLEMENT DECK. They are removed from the settlement deck and added to the discard pile BUT they are also added to a shared WASTELAND ITEMS DECK for the players upcoming battle. THAT IS HOW ITEMS ARE HANDLED. 

Then there are the ITEM POOLS, those come in 3 forms, SETTLEMENT POOL these are items which are drawn using structures or carried over from the POST-BATTLE POOL using mechanical sheds or from the previous SETTLEMENT POOL using LOCKERS. Then there is the BATTLE POOL - These are items which are added to a pool of available equipment that can be assigned to units during a battle setup. This pool consists of items carried over from the SETTLEMENT POOL using STORES. Any items not carried over using stores into the BATTLE ITEM POOL are sold for their caps value. Finally the POST-BATTLE ITEM POOL consists of items looted during a battle. Any items not carried over into the SETTLEMENT POOL using MECHANICAL SHEDS are sold for their caps value. Unique, quest, objective items are automatically added to a UNIT/UNITS on the players ROSTER POOL and become part of their "STANDARD" equipment. 

3. **Deck builder — card pool scope**: When building decks (creature, stranger, etc.), are players choosing from the existing `battleCreatures.json` etc. card definitions, or is there a separate card pool per player (like a physical card collection)?

   > YOUR ANSWER: Players are choosing randomly, manually, or both from the existing .json files for each deck type. These decks are shared and are not persistent. At the end of each battle the cards drawn are forgotten and new decks are built during the setup phase of the next battle. This is true for all decks except ITEMS.

4. **Battle roster points limit**: You mention players choose a points limit and build a battle roster from their Roster Pool. Is this points limit agreed upon before battle starts (during setup), and does it use the existing `baseCaps` + `equippedItems` caps system already in the app?

   > YOUR ANSWER: This is a pre-determined caps limit set during the battle setup. After the battle set up is complete and players have chosen a game mode/scenario, caps limit, number of turns, decks to use, etc, then they build their BATTLE ROSTER using UNITS from their Roster page and EQUIPMENT/BOOSTS from  their BATTLE EQUIPMENT POOL, UNITS points costs are determined by their unit cost and standard load out, any items added to a unit from the battle pool adjust the units caps cost, they can replace a units standard equipment for this battle only. After the battle a UNITS caps limit will revert back to the unit cost + theri standard load out. Standard loadouts are whatever equipment a unit has on it's UNIT entry on the roster page. EVEN IF AN ITEM IS REPLACED WITH EQUIPMENT FROM THE BATTLE EQUIPMENT POOL IT IS RETURNED TO THE UNIT AT THE SAME CAPS COST AFTER THE BATTLE. ALL BATTLE EQUIPMENT/BOOSTS ARE REMOVED FROM UNITS AFTER A BATTLE.

5. **Injuries/wounds during battle**: Should injuries applied during battle immediately update the Roster page, or only propagate when the battle ends and the summary is confirmed?

   > YOUR ANSWER: Only propagate when the battle has ended. But should be tracked on the live battle tracker see above.

6. **Items looted from corpses**: Where do these items come from mechanically? Are they drawn from the Wasteland Items deck, or are they defined per unit in `units.json`?

   > YOUR ANSWER: Items looted from corpses are added manually to the UNIT that looted the corpse. On the LIVE BATTLE TRACKER there should be a function to easily select an item from the full item  list for each unit so it can be added to that unit as a LOOTED ITEM. Then removed from the unit and added to the POST BATTLE ITEM pool after the battle has ended.

7. **"Decisive victory / victory / draw / loss"**: Is this a 4-way outcome, or does "decisive victory" just modify the rewards of a regular victory?

   > YOUR ANSWER: Victory conditions vary by game mode. For INTO THE WASTELAND and INTO THE VAULT there aren't standard victory conditions unless dictated by a specific scenario. Make it so players can just choose their victory condtion rather than worrying about making each condition available based on the game mode. Offer players the choice to choose Major, Minor, Draw, Loss and maybe N/A then players can just choose.

---

### 4b. Renamed Tab Structure

The current four tabs — **Setup · Objectives · Scenarios · Decks** — should become:

| New Tab | Old | Purpose |
|---|---|---|
| **Match** | Setup | Choose opponent, scenario, objectives, decks, points limit, start fight |
| **Decks** | Decks | Build and manage all card decks (creature, stranger, danger, explore, event, items) |
| **Rosters** | (new) | Build battle roster from Roster Pool, assign battle items |
| **Scenarios** | Scenarios | Browse available scenarios, environments, battlefields, purposes |

The **Objectives** tab content moves into the Match tab (players select objectives as part of setup). This reduces the tab count and makes the flow sequential: **Rosters → Scenarios → Match → (fight) → Decks (live)**.

>NOTE: KEEP THE OBJECTIVES TAB SO PLAYERS CAN REVIEW THEIR COMPLETED OBJECTIVES AND AVILABLE OBJECTIVES OUTSIDE OF MATCHES

---

### 4c. The MATCH Tab — Pre-Battle Setup Flow

>NOTE: PLEASE SEE ABOVE FOR LOTS OF DETAILS ON HOW THIS SHOULD BE VISUALIZED AND FORMATTED.

The Match tab replaces Setup and becomes a wizard-style setup sequence. On mobile this is a multi-step flow. On desktop it can be a single scrollable page.

**Step 1 — Opponent Selection**
- Select opponent(s) from campaign players (already exists, but extend to multi-player)
- Display each opponent's faction, settlement name, current caps

**Step 2 — Scenario**
- Choose environment, battlefield, purpose, scenario (currently in Scenarios tab — bring selection here, keep browse in Scenarios tab)
- Show scenario summary card inline once selected

**Step 3 — Points Limit & Battle Roster**
- Set points limit (e.g., 500 caps)
- Each player builds their Battle Roster by selecting units from their Roster Pool up to the points limit
- Units display: name, caps, fate status, equipped items, health
- Players can select pre-saved Battle Roster templates (see Roster page changes below)
- Equippable items from the Campaign Items Deck are shown here for assignment

**Step 4 — Objectives**
- Each player selects their Battle Objective (public)
- Each player selects their Secret Objective/Quest (hidden from opponents — shown as "SECRET" to others)
- Scenario-defined objectives shown separately

**Step 5 — Deck Assignment**
- Assign which decks are used in this battle (select from pre-built decks in the Decks tab)
- Campaign Items Deck contribution: each player automatically contributes 6 cards randomly from their Campaign Items Deck to the shared Wasteland Items battle deck — shown here as a confirmation step
- Confirm all deck states

**FIGHT! Button**
- Active only when all players have confirmed their setup
- Each player must confirm readiness (a "READY" toggle per player shown to all)
- Pressing FIGHT! transitions all players to the Live Battle overlay

---

### 4d. Live Battle Overlay

> NOTE: SEE ABOVE FOR MORE DETAILS ON THIS LIVE BATTLE TRACKER OVERLAY

When FIGHT! is triggered, a full-screen overlay launches for all connected players. This is a shared real-time state, synced via Supabase (new `active_battle` column on campaigns, or a separate `battles` table row with live state).

**Overlay Layout (Mobile — vertical stack):**

```
┌─────────────────────────────────────┐
│  BATTLE: [Scenario Name]  Round 1   │  ← Header bar, persistent
│  [Player A] vs [Player B]           │
├─────────────────────────────────────┤
│  [DECKS] [UNITS] [OBJECTIVES] [LOG] │  ← Secondary nav within overlay
├─────────────────────────────────────┤
│                                     │
│         ACTIVE DECK AREA            │  ← Main content changes per nav
│                                     │
└─────────────────────────────────────┘
```

**DECKS view within overlay:**
- Horizontal chip selector for deck type (Creature · Stranger · Danger · Explore · Event · Items)
- Large DRAW button for the active player
- Current card displayed prominently (card name, full text/content)
- When a card is drawn it's visible to all players
- Next draw sends previous card to discard (auto, no confirmation needed — speeds up play)
- Item cards drawn go to the drawing player's item tray (see below)

**UNITS view within overlay:**
- Shows both players' battle rosters side by side (desktop) or tabbed by player (mobile)
- Each unit shows: name, health pips, conditions (poisoned/injured arm/injured leg indicator icons)
- Tap a unit → quick action panel: Apply Wound / Apply Rad Damage / Apply Condition / Remove from Battle
- Items looted from corpse: button on a removed unit to loot and assign item to winner's item tray
- Caps received: button to award caps when a unit is removed

**OBJECTIVES view within overlay:**
- Public objectives visible to all players
- Secret objectives shown as "[SECRET]" for the opponent — player taps their own to see theirs
- Checkboxes to mark objectives as completed during battle

**LOG view within overlay:**
- Chronological list of battle events: card draws, unit removals, items looted, caps received
- Read-only shared log — both players see the same log

**Per-Player Item Tray:**
- Persistent panel (collapses/expands) at the bottom of the overlay showing items drawn/looted/acquired this battle
- Displayed under each player's name
- Items here are what gets carried through to the post-battle summary

---

### 4e. Post-Battle Summary

>NOTE: SEE ABOVE

When a player ends the battle (or both players confirm "Battle Over"):

**Outcome selection:**
- Each player selects: Decisive Victory / Victory / Draw / Loss
- If outcomes conflict (both claim Victory), flag for manual resolution or use a coin-flip mechanic

**Summary pop-up (both players see simultaneously):**
```
┌─────────────────────────────────────┐
│         BATTLE COMPLETE             │
│                                     │
│  WINNER: [Player Name]              │
│  RESULT: [Decisive Victory]         │
│                                     │
│  ── PLAYER A ──                     │
│  Caps gained: +150                  │
│  Items: Laser Pistol, Combat Armor  │
│  Objectives complete: 2/3           │
│  ── PLAYER B ──                     │
│  Caps gained: +80                   │
│  Items: Stimpak x2                  │
│  Objectives complete: 1/3           │
│                                     │
│  OBJECTIVE REWARDS:                 │
│  [Objective Name] → [Brief Reward]  │
│                                     │
│  [CONFIRM & APPLY]                  │
└─────────────────────────────────────┘
```

**CONFIRM & APPLY triggers:**
- Battle record added to `campaign.battles` (existing system)
- Caps delta applied to each player's `player_data.caps`
- Items from item tray move to each player's `item_pool` (in "recovery" location)
- Items removed from the Wasteland Items deck do NOT return to players' Campaign Items Decks (they're spent)
- Injuries/wounds applied during battle sync to `player_data.roster` units
- Completed objectives recorded in `completed_objectives`
- Campaign `battle_count` incremented
- Campaign narrative entry auto-generated: "[Player A] defeated [Player B] in [Scenario] (Round [X])"

---

### 4f. Campaign Items Deck (New System)

> NOTE: SEE ABOVE I THINK IT'S THE SAME AS THE CURRENT ITEM POOL/SETTLEMENT DECK JUST ADJUSTED SLIGHTLY

This is a new persistent deck per player, separate from the current item pool and settlement deck.

**Data shape (add to `player_data`):**
```javascript
campaign_items_deck: {
  cards: [itemId, ...],   // full deck
  drawn: [itemId, ...],   // items already drawn during settlement phase
  discard: [itemId, ...]  // items spent in battles (removed permanently from deck)
}
```

**How it works:**
- Players draw from this deck during the settlement phase (same as current settlement deck mechanics, but this deck is specifically for items that persist across rounds)
- When setting up a battle, each player automatically contributes 6 cards randomly from their `campaign_items_deck.cards` into the shared Wasteland Items battle deck
- Those 6 cards move to `campaign_items_deck.discard` — they are gone from the player's deck regardless of whether they're drawn in battle
- Items a player draws from the Wasteland Items deck during battle go to their item tray and then their item pool — they do NOT go back into the Campaign Items Deck
- New cards are added to the Campaign Items Deck through settlement phase rewards and quest completions

**UI placement:**
- Settlement page, Item & Boost Decks sub-tab: add a "Campaign Items Deck" panel alongside the existing settlement deck and boost deck panels
- Show: deck count, draw button, drawn pile, discard pile
- Cards have full content visible (not just name) when drawn

---

### 4g. Deck Builder (Decks Tab)

The current Decks tab needs a proper deck builder, not just checkbox lists.

**New Decks tab structure:**
- Horizontal chip nav: Creature · Stranger · Danger · Explore · Event · Items
- Each deck panel has two modes: **Browse** and **Build**

**Browse mode:**
- Scrollable list of all cards of that type
- Each card shows: name, type badge, full card text/content
- Tap to expand for full details
- Filter by: keyword search, card subtype, faction (for creature/stranger)

**Build mode:**
- Same list but with include/exclude toggle on each card
- "Add to Deck" / "Remove from Deck" buttons
- Running count: "X of Y cards selected"
- "Shuffle & Use" button to finalize
- "Random N" button (existing functionality, but now filterable by faction/type before randomizing)
- Save deck as named preset (stored in player_data)

**Items deck specifically:**
- In Browse mode: shows cards available from player's Campaign Items Deck contribution + opponent's contribution
- In Build mode: shows the combined 12 contributed cards and lets players arrange order or re-randomize

---

### 4h. Roster Page Additions for Battle System

> NOTE: IT'S PROBABLY EASIER TO JUST ADD THE BATTLE ROSTER SELLECTION TO THE BATTLE SET UP SYSTEM< AND KEEP THE ROSTER PAGE THE SAME AS IT IS. DOWN THE LINE WE CAN ADD PRE-SET ROSTERS IF IT SEEMS LIKE IT IS SOMETHING PLAYERS WOULD LIKE. 

**Battle Roster Presets:**
- New section at the top of Roster page: "Battle Rosters"
- Players can save named battle roster configurations (e.g., "750pt Raider Rush", "500pt Sneaky Sniper")
- Each preset stores: selected unit slotIds, points limit, assigned items
- Quick-load during Match setup

**Pre-Battle Item Assignment:**
- Within a Battle Roster preset, players can pre-assign items from their item pool to units
- These assignments carry into the Match setup step automatically

**Unit Status Indicators (Roster mobile improvement):**
- Color-coded fate badges visible without expanding: green (Active), yellow (Delayed/Shaken), red (Injured/Lost/Captured), grey (Dead)
- Health bar showing rad vs reg damage ratio at a glance

---

### 4i. Additional Suggested Features

> NOTE: LETS KEEP ALL THESE UNTIL WE'VE MADE THE ABOVE CHANGES

1. **Battle Timer/Round Counter**: A shared visible round counter within the battle overlay. Optionally an optional timer per round if players want paced play.

2. **Initiative Tracker**: A simple re-orderable list of units (both players combined) to track activation order each round. Players drag to reorder as initiative is determined each round.

3. **Dice Roller**: Built-in FWW dice roller (yellow, red, black dice mechanics) accessible within the battle overlay. Reduces need for physical dice or third-party apps.

4. **Terrain Notes**: A free-text field in battle setup where players describe the terrain setup, or attach a photo. Preserves the setup for multi-session battles.

5. **Battle Pause/Resume**: The live battle state persists in Supabase — players can close the overlay and return. A banner on the Battles tab shows "Battle in progress — tap to resume."

6. **Unit activation tracking**: Per-unit "Activated this round" toggle (clears at round end) so players can track who has acted. Common pain point in miniature wargames.

7. **Spectator mode**: Campaign members who aren't in the battle can view the battle overlay in read-only mode. Adds community feel to the campaign.

8. **Post-battle roster sync confirmation**: After CONFIRM & APPLY, show each player a confirmation screen "These injuries have been applied to your roster — do you want to adjust before confirming?" before writing. Irreversible stat changes should have a gate.

9. **Battle history replay**: The LOG view records all events — give players a way to review this after the battle is over. Currently battle records are minimal (win/loss/opponent). Full event log would be far richer.

10. **Caps bidding for first activation**: Some FWW scenarios use caps bidding for first activation. A simple "Bid caps for first activation" widget during battle setup would cover this.

11. **Scenario-specific rule reminders**: When a scenario is selected, surface any special rules (from `battleScenarios.json`) as a persistent collapsible reminder within the battle overlay — stops players forgetting scenario-specific mechanics mid-game.

12. **Combat log export**: At battle end, let players export the full battle log as a sharable text summary for Discord/social posting.

---

## 5. Branching Strategy

Work on a feature branch to avoid touching the current app until the new system is ready.

```bash
git checkout -b feature/live-battle-system
```

**What stays untouched on `main`:**
- All existing campaign, roster, settlement, quest, and overview functionality
- The current Battle page (kept as-is until the new system is ready to swap in)

**What gets built on the branch:**
- New `ActiveBattle` component / overlay system
- New `CampaignItemsDeck` data layer + UI
- New `BattleRosterPresets` system on Roster page
- Revised `BattlesPage` with Match tab
- New `DeckBuilder` component
- New Supabase table/column for live battle state
- Schema migration for `campaign_items_deck` on `player_data`

**Merge criteria before touching main:**
- Full live battle flow works end-to-end in two browser windows (simulating two players)
- Post-battle confirmation correctly propagates to roster, item pool, and campaign records
- Campaign Items Deck correctly deducts contributed cards and doesn't double-count

**Supabase changes needed:**
- New column: `player_data.campaign_items_deck` (jsonb)
- New column: `player_data.battle_roster_presets` (jsonb)
- New column: `campaigns.active_battle` (jsonb) — live battle state, replaces current `battle_page_state`
- New RPC: `patch_active_battle(campaign_id, battle_state)` — callable by battle participants
- Consider a separate `battle_sessions` table for history/replay if you want battle logs persisted

---

## 6. Priority Implementation Order

1. **Schema migration** (new columns, RPC) — foundation everything else depends on
2. **Campaign Items Deck** — standalone feature, low risk, high value, needed for battle item deck contribution
3. **Battle Roster Presets** (Roster page) — standalone, needed for Match setup
4. **Match tab wizard** (no live sync yet — just setup state) — validates the UX flow before adding real-time complexity
5. **Deck Builder** (enhanced Decks tab) — standalone improvement, can ship independently
6. **Live Battle overlay** — the complex real-time piece, built last once all inputs are validated
7. **Post-battle summary + propagation** — hooks everything together
8. **Mobile-specific improvements** — bottom nav, unit cards, chip nav for decks — can be done in parallel with any of the above

---

## NOTES

> NOTE: PLEASE ASK ME ANY NEW QUESTIONS THAT YOU HAVE BASED ON MY ABOVE NOTES.

WHEN  REFERING TO ITEM POOLS, EQUIPMENT, ETC, PLEASE ALSO INCLUDE BOOST CARDS IN THE SAME SYSTEM. PLAYERS CAN ADD ITEMS AND/OR BOOSTS TO THEIR VARIOUS ITEM POOLS AND TO UNITS IN BATTLES, ETC.

---

## FINALIZED DECISIONS LOG

> All decisions below are confirmed and supersede anything in the sections above. Use this as the source of truth when building.

### Navigation & Tabs
- Objectives tab stays as a standalone tab — players need it for reference outside of battles
- No persistent campaign status banner — unnecessary clutter
- Unit swipe overlay: only build if interaction is rich enough; otherwise keep full modal

### Boosts
- Boosts are drawn only via settlement structures using their own separate deck (already in app)
- Boosts cannot be looted or drawn during battles
- Boosts are NOT part of the Wasteland Items Deck
- Boosts ARE part of the Battle Equipment Pool and can be assigned to units during battle setup (adjusting caps cost)
- Boosts are removed from units at end of battle and added to the Post-Battle Item Pool alongside items

### Settlement Item Deck
- This IS the existing settlement deck — one persistent copy per player covering every item card in the game
- Cards drawn are ALWAYS permanently discarded regardless of reason (structure use, battle contribution, anything)
- Structure use mechanic: draw cards one at a time until a card matching the structure's benefit type appears — all non-matching draws also go to discard
- Cards contributed to the Wasteland Items Deck during battle setup are removed from the Settlement Item Deck and discarded even if never drawn during the battle
- When the deck exhausts: auto-reshuffle all discards back in, show a notification to players
- UI on Settlement page: "Settlement Item Deck — X/Y" panel with DRAW button and DISCARDED list (players can review past drawn cards by name and manually re-add specific cards back into the deck if needed)

### Item Pool Hierarchy (confirmed)
```
SETTLEMENT ITEM DECK (draw source)
        ↓ draw via structures
SETTLEMENT POOL
        ↓ via Stores structure
BATTLE EQUIPMENT POOL  ←── items not moved here are sold for caps at round end
        ↓ assigned to units during battle setup
[BATTLE — units carry items]
        ↓ items removed from units at battle end
POST-BATTLE ITEM POOL  ←── looted items also land here
        ↓ via Mechanical Sheds
SETTLEMENT POOL  ←── items not moved here are sold for caps
```
- Unique / quest / objective items: auto-attached permanently to the relevant unit on the Roster Pool as standard equipment
- LOCKERS carry items forward from one SETTLEMENT POOL to the next round's SETTLEMENT POOL

### Wasteland Items Deck
- Built during battle setup from equal contributions from both players' Settlement Item Decks
- Number of cards contributed is configurable per battle (must be equal from both players — e.g., 6 each)
- Contributed cards are removed from each player's Settlement Item Deck and discarded regardless of battle outcome
- Deck is not persistent — rebuilt fresh each battle

### Battle Roster & Caps
- Points limit set during battle setup (agreed by both players)
- Players select units from their Roster Pool up to the points limit
- Each unit's caps cost = base unit cost + equipped items (standard loadout or swapped Battle Pool items)
- Items from Battle Pool can replace a unit's standard loadout items for the battle — caps cost adjusts in real time
- Standard loadout items removed during roster build are NOT removed from the unit on the Roster page
- All Battle Pool items are removed from units at battle end → Post-Battle Item Pool
- Standard loadout items always return to the unit at their standard caps cost after battle
- Battle Roster Presets: deferred — add unit selection inside Battle Setup instead; no changes to Roster page for now

### Live Battle Tracker Layout
- Each player has their own view, updated in real time via Supabase subscriptions
- **Mobile layout**: vertical scroll — Your Roster (collapsible) → Battle Info (always visible center) → Opponent Roster (collapsible)
- **Desktop layout**: three columns side by side — Your Roster | Battle Info | Opponent Roster
- Perspective: always YOU = left/top, OPPONENT = right/bottom

**Your Roster column contains:**
- All units selected for this battle with: equipment, perks, damage, radiation, injuries, conditions, looted items
- Your objectives (public) and quests/secret objectives (visible to you only)

**Battle Info column contains (top to bottom):**
- Turn counter + NEXT TURN button (can go back to previous turns to make corrections; temp turn saves deleted at battle end)
- Game mode / scenario reminder
- Decks panel: each deck shows total/drawn count + last drawn card name; Events deck shows full card content; Wasteland Items deck
- END BATTLE button at bottom

**Opponent Roster column contains:**
- Opponent's battle units with: damage, radiation, conditions, looted items — updated live
- Secret objectives/quests hidden (shown as [SECRET])

### Deck Types in Battle
- Creature, Stranger, Danger, Explore, Event, Wasteland Items
- All decks except Wasteland Items are non-persistent: rebuilt from JSON card pools each battle (randomly, manually, or both)
- Wasteland Items deck is built from player contributions (see above)
- Boosts: separate deck, not used during live battle

### Looted Items
- Added manually by the player during battle via a searchable item list on the Live Battle Tracker
- Attached to the specific unit that did the looting
- At battle end: removed from unit → Post-Battle Item Pool

### Injuries & Unit Stats During Battle
- Tracked live on the Live Battle Tracker (damage, radiation, conditions, removed status)
- Only propagate to the Roster page when the battle ends and outcome is confirmed

### Victory Conditions
- Players choose: Major Victory / Minor Victory / Draw / Loss / N/A
- No restriction by game mode — players self-report what applies

### Turn Counter
- Simple counter + NEXT TURN button
- No automatic resets when turns are reached — END BATTLE is always manual
- Unit activation tracking deferred to a later phase

### Additional Features (deferred — revisit after core system complete)
1. Battle Timer / optional per-round timer
2. Initiative Tracker (drag to reorder units)
3. FWW Dice Roller (yellow/red/black dice)
4. Terrain Notes (free text + photo in setup)
5. Battle Pause / Resume (persists in Supabase, banner on Battles tab)
6. Unit activation tracking per round
7. Spectator mode (read-only for non-participants)
8. Post-battle roster sync confirmation gate
9. Battle history / event log replay
10. Caps bidding for first activation
11. Scenario-specific rule reminders in overlay
12. Combat log export (shareable text summary)

### Supabase Schema Changes Required
- `player_data.battle_roster_presets` (jsonb) — deferred
- `campaigns.active_battle` (jsonb) — replaces `battle_page_state`, holds live battle state
- New RPC: `patch_active_battle(campaign_id, battle_state)` — callable by battle participants
- Consider `battle_sessions` table for event log history/replay

### Implementation Order (confirmed)
1. Schema migration (new columns + RPC)
2. Settlement Item Deck UI on Settlement page
3. Battle Setup wizard (Match tab) — no live sync yet
4. Deck Builder (enhanced Decks tab)
5. Live Battle Tracker overlay (real-time Supabase sync)
6. Post-battle summary + stat propagation to Roster/item pools
7. Mobile layout improvements (bottom nav, collapsible sections, etc.)
8. Deferred features (see above)

