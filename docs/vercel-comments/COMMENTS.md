# Vercel Comments — Catalogue & Analysis

**Source:** Vercel Toolbar comments on `fww-alonetogether-tracker` (project `prj_PLhbGarkpm0MrJfU17bZWfCF0xPQ`, team `team_FqJjw2ukehBMlFAK8VePnElM`), branch `main`, author `rkhilarysignups-8609` (Ross), captured 2026-06-10.
**Total:** 25 unresolved comment threads. All against the live SPA (single URL `/`), so each comment is located by its **selected DOM element + React tree + content**, not URL path.
**Attachments:** `attachments/c01-edens-project-quest.png` (full Eden's Project quest text), `attachments/c05-map.png` (current map screenshot).

Legend — **Type:** Remove · Change · Feature · Data · Question. **Size:** S (≤30 min) · M · L · XL (multi-session feature). **Status:** Ready · Needs-decision · Verify-on-app (must click the live element to confirm exact target before editing).

---

## Page: HOMESTEAD (`HomesteadPage.jsx`)

### C11 · `VBeEqw2ida4T` — Remove "battle-ready" counter · **Remove · S · Ready**
Selected: `span.flex.items-center.gap-1` in ROSTER title bar.
> I don't think we need this battle ready counter. Players can see by the purple indicator how many and which units are "battle ready"
**Interpretation:** Remove the `⚔ N battle-ready` chip I added to the ROSTER title bar (commit 14bb4a1). The per-row purple swords indicator stays.
**Agent notes:** `HomesteadPage.jsx` — delete the `<span … {battleReadyCount} battle-ready>` block in the ROSTER header and the now-unused `battleReadyCount` derived const.

### C12 · `TJh3qnoluCUx` — Roster total shouldn't say "COST" · **Change · S · Ready**
Selected: `span.text-purple.text-[11px].font-bold` (the `COST {n}c` chip).
> The roster caps total shouldn't say COST it should just list the caps value. Players will know what it means.
**Interpretation:** Change `COST {rosterCapsTotal}c` → `{rosterCapsTotal}c` in the ROSTER title bar (revert the "COST " label from commit dfdef7d). Keep the glowing purple chip + tooltip.
**Agent notes:** `HomesteadPage.jsx` ROSTER header span.

### C09 · `Dg0zUjQGwx5c` — REST ALL tooltip should contain rest rules · **Change · S · Ready**
Selected: REST ALL `button.text-[10px]` in ROSTER title bar.
> Resting does the following, we need this info contained within the REST ALL tool tip.
> Radiation Damage: Convert half of their current Radiation Damage (rounded up) into Regular Damage. Regular Damage: Discard half of their current Regular Damage (rounded up). Conditions: Discard up to 1 condition currently affecting the model
**Interpretation:** Expand the REST ALL button `title=` to spell out the three rest effects above.
**Agent notes:** `HomesteadPage.jsx` REST ALL button. Matches `applyRestToUnit` in `utils/calculations.js`.

### C02 · `Hefg-vSIxTn2` — "What does this do?" (question) · **Question · S · Verify-on-app**
Selected: `button.inline-flex.items-center.gap-1.5` in the HOMESTEAD header `div.ml-auto`.
> What does this do?
**Interpretation:** Ross is asking what one of the HOMESTEAD-header buttons does. The class `inline-flex … gap-1.5` doesn't match the current POOLS/ADD-UNIT/BUILD/SELECT/USE buttons cleanly → **must click it on the live app to identify**, then answer (and likely add a tooltip so it's self-explanatory — ties to C19).
**Agent notes:** Open Homestead on the deploy, click the commented element via the Vercel toolbar to see which button, then reply + add a `title=`.

### C08 · `lkeG-8L1UTfG` — Move BUILD/SELECT/USE into STRUCTURES section · **Change · M · Ready**
Selected: a `button.text-[10px]` (one of the step buttons) in the HOMESTEAD header.
> I think we should add the 3 structure buttons BUILD, SELECT, USE to the combined STRUCTURES section below...makes more sense than having them in the HOMESTEAD title bar.
**Interpretation:** Relocate the `1·BUILD / 2·SELECT / 3·USE` step toggle out of the header and into the STRUCTURES panel header (the right-hand settlement column). Pairs with C18 (combine CAPS+STRUCTURES) and C19 (tooltips for these steps).
**Agent notes:** `HomesteadPage.jsx` — move the `['build','select','use'].map(...)` group into the STRUCTURES section header.

### C19 · `_sjJw-4QVQpV` — Tooltip box explaining BUILD/SELECT/USE · **Feature · M · Ready**
Selected: BUILD `button.text-[10px]` (3rd) in header.
> I feel like it might be good if we implemented a tool tip box that appeared to the left of the page containing instructions/explanations regarding what the buttons do. For example when a user hovered over build the tool tip text said "Use the Add Structures dropdown in the Structures section below to spend your caps on growing your settlement."
> Select: "Use your POWER and WATER supply to activate your structures, track your usage in the RESOURCES section below and activate a structure by pressing the PWR button on the STRUCTURES table."
> USE: "Once activated you can use your structures to draw settlement item and explore cards. Items drawn from structures are added to your settlement pool. Press the 'Pool' button in the HOMESTEAD header bar to open your POOLS menu. Use structure by clicking the USE button on the STRUCTURES table."
**Interpretation:** Add a hover/explainer panel (left of page or inline) describing each step. Exact copy supplied above. Depends on C08 (where the buttons end up).
**Agent notes:** Implement as tooltips on the build/select/use buttons (or a small fixed explainer box). Use the three strings verbatim.

### C04 · `zOrYVM8giNcY` — Remove the map LEGEND section · **Remove · S · → MAP (Wave 5)**
**RE-SCOPED:** verified on live app — this is the **MAP page** aside `div.border:nth-of-type(3)` = the **LEGEND** card (STATE key), NOT Homestead.
> We can remove this entire section.
**Interpretation:** Remove the LEGEND section from the map. Folds into the C07 map overhaul (fresh rebuild won't carry the legend). Could also be a standalone 1-liner removal if done before the rebuild.
**Agent notes:** `components/map/CampaignLegend.jsx` / its render in `CampaignMapPage.jsx`.

### C18 · `Af28E-zQ16sg` — Combine CAPS into STRUCTURES; caps counter inside · **Change · M · Ready**
Selected: `span.text-amber` "CAPS" header in the aside `div.border > div.flex`.
> We should rename this or just combine this section with the STRUCTURES section and name the combined section STRUCTURES. Make the caps counter a part of the combined structures section rather than its own header.
**Interpretation:** Merge the standalone CAPS card + the STRUCTURES card into one "STRUCTURES" panel, with the caps counter living in that combined header. Pairs with C08/C10.
**Agent notes:** `HomesteadPage.jsx` settlement aside — fold the CAPS block into the STRUCTURES card header.

### C10 · `Bipfj8b17lEL` — Replace storage display with a compact POOLS side panel · **Feature · L · Verify-on-app**
Selected: `div.text-label.text-[9px]` inside aside `div.border > div.grid > div.border:nth-of-type(3)` (a derived-stat tile, e.g. STORES).
> We should probably remove this and let the POOLS menu track all this info. Maybe we should include a really small side panel with icons and counters for all the POOLS/STORAGE structures. A list of icons and underneath a 0/0 type of counter for RECOVERY POOL, SHEDS, SETTLEMENT POOL, LOCKERS, AND STORES. When hovered over the icon a small tool tip appears with "Sheds used 2/4" if the player clicks anywhere on the side panel the POOL menu opens up. At the top of the section we can have the word "POOLS" or something.
**Interpretation:** Remove the current derived storage stat tile(s); add a slim vertical POOLS side panel: icon + `used/total` counter for RECOVERY POOL, SHEDS, SETTLEMENT POOL, LOCKERS, STORES; hover tooltip ("Sheds used 2/4"); clicking anywhere opens the POOLS slide-out. Depends on C13 (pool model).
**Agent notes:** Ties tightly to the C13 pools rework — build after the pool data model is settled.

---

## Page: CAMPAIGN MAP (`CampaignMapPage.jsx` + `map/` components)

### C07 · `z7Ld34ygTv64` — **Major map overhaul** · **Feature · XL · Needs-decision**
Selected: a map `<circle>` node.
> We need to do a big overhaul on this map feature. The current design is incredibly crowded and confusing. Main premise: a black "map" section where users upload an image of a map, then add locations by dragging icons from a side-panel legend. Players choose what each icon represents, change its colour, and add info. Clicking a placed icon opens a popup with black fields for name, type, status, owner, affect/effect, mode, connections, size, etc. (e.g. "Enclave Secret Base, Bunker, Contested, Enclave, +25 caps each round, Into the Vault, US Air Base + Gold Mine, Large").
> Also: connect locations with a snappable line to form a "route." Either via a guided "link location" flow (click target locations, max 2 connections, live line to cursor, Save) OR — simpler — a "DRAW LINE" button where you drop each end on two locations. ("THIS MIGHT BE WAY TOO MUCH TROUBLE … could be much easier to just click a 'DRAW LINE' button…")
**Interpretation:** Replace the current hex/SVG map (see `attachments/c05-map.png`) with an image-upload canvas + drag-from-legend icon placement + per-icon info popup + route-drawing. This supersedes/absorbs C05 and C06.
**Agent notes:** `components/map/*` (CampaignMapCanvas, MarkerPalette, TerritoryNode/Panel, RoutePanel, TradeRouteLine, FogOfWarLayer, etc.), `hooks/useCampaignMapState.js`, `data/campaignMap.js`. Map state persists to Supabase `campaign_map_state`. **Decision required** — see Open Questions Q1.

### C05 · `aGuso9pfqWXr` — Remove markers but reuse their menus; auto-calc connected locations · **Feature · L · Needs-decision**
Selected: a map `<circle>:nth-of-type(2)`.
> We can remove these entirely but we should use their menus in some form with the player deployed icons. Leave most of the sections blank for the player to add but some could be auto calculated like "connected locations" could populate automatically based on other locations that have been linked.
**Interpretation:** Part of the C07 overhaul — when reworking, keep the location-info menus but blank by default; auto-populate the "connected locations" field from drawn routes.
**Agent notes:** Folds into C07.

### C06 · `RZHA2B4szJsd` — Markers: blank names, Save fn, fewer, generic icons not letters, colours · **Feature · L · Needs-decision**
Selected: `h3.text-amber` MARKERS palette header (map aside).
> These Markers are great but can we leave their names blank until the player fills them in themselves? We'll need to add a "Save" function so players can save the names and their position on the board. Also we don't need quite as many as we have. Would be better to make them generic icons instead of letters so players can assign them to anything and then change their colors.
**Interpretation:** Part of the C07 overhaul — generic (non-lettered) icons, blank names until filled, fewer of them, colour-changeable, with explicit Save of name+board position.
**Agent notes:** `MarkerPalette.jsx`. Folds into C07.

### C03 · `1B0SJOGco17e` — FACTION THREAT factions blank/player-typed · **Change · M · → MAP (Wave 5)**
Selected: `span.inline-flex` in map aside `div.border:nth-of-type(2)` = the **FACTION THREAT** tracker. Verified on live app — currently fixed factions (Brotherhood of Steel, Caesar's Legion, Institute, Super Mutants, Raiders).
> We need to make it so the FACTIONS start blank and players can type in the factions they want so players can add any factions they want which are appropriate for their specific campaign.
**Interpretation:** FACTION THREAT list starts blank; players add/name their own faction rows (any factions appropriate to their campaign). Folds into the map rework.
**Agent notes:** `components/map/ThreatTracker.jsx`; faction-threat data in `data/campaignMap.js` / `useCampaignMapState.js`.

---

## Page: CAMPAIGN (`CampaignPage.jsx`)

### C20 · `gB2giC0O_zc0` — Remove battle counter · **Remove · S · Ready**
Selected: `span.text-pip.text-xs` in `div.flex > div.flex:nth-of-type(2)` — the BATTLES counter (CampaignPage.jsx ~L397).
> Remove this battle counter entirely. Unnecessary.
**Interpretation:** Remove the BATTLES stepper/counter from the Round/Battles controls row.
**Agent notes:** `CampaignPage.jsx` — remove the `BATTLES` control block; check `battleCount`/`handleBattleCountChange` for now-dead code.

### C23 · `tjkIHN7MdzBy` — Remove Scavenger Objectives board · **Remove · S · Ready**
Selected: `h2.text-amber` "SCAVENGER OBJECTIVES" (CampaignPage.jsx ~L754).
> Lets remove this scavenger objectives. They now live on the QUESTS page.
**Interpretation:** Delete the whole Scavenger Objectives board section from the Campaign page (functionality lives on Quests/Objectives now).
**Agent notes:** `CampaignPage.jsx` — remove the `Scavenger Objectives Board` block + unused `SCAVENGER_OBJECTIVES` import / related state if dead.

### C25 · `K_KSLu6_czym` — Remove a section (record on BATTLES page) · **Remove · S · Verify-on-app**
Selected: `h2.text-amber` in `div.p-4 > div.border > div.flex` (a section header).
> Not sure we need this section...lets remove for now. We can record battle outcomes and standings on the BATTLES page.
**Interpretation:** Remove a battle-outcomes/standings section from the Campaign page. **Confirm which `h2`** on the live app.
**Agent notes:** Likely a "battle log / standings" card on CampaignPage.

### C21 · `yQ9GLJzElpFe` — Player-entry button rework · **Change · M · Needs-decision**
Selected: `button.p-1.5.border.border-pip/30` inside a players table row.
> Not sure how we implement this button with the new player entry mechanic. Maybe it opens a dropdown containing the titles of that player's entries when they are clicked a box slides down containing the text from that entry...open to other suggestions...
**Interpretation:** Re-purpose this per-player table button to reveal that player's narrative entries (title dropdown → expandable text). Open to design. Related to the narrative rework C22/C24.
**Agent notes:** Folds into the narrative restructure (see Q3).

### C22 · `At3Ahmu7Abgr` — Restore player narrative sub-entries · **Feature · L · Needs-decision**
Selected: `div:nth-of-type(6)` (a whole Campaign section).
> I don't think we need this section either, can we go back to how it was before where players could add their own narrative entries as sub-entries on campaign narrative posts? Next to +ADD ENTRY on the campaign narrative title bar add a **+ PLAYER ENTRY** button. Clicking it opens a popup like the "my journal" +ADD Entry popup, EXACTLY the same except with one extra dropdown listing all campaign narrative entry titles. Player picks one, submits, and a small sub-entry bar appears below that narrative entry. Opening a campaign narrative shows its player narratives underneath. Change **+ ADD ENTRY → + CAMPAIGN ENTRY**.
**Interpretation:** Reintroduce player sub-entries attached to campaign narrative posts; rename the existing add button; add a +PLAYER ENTRY flow with a parent-entry picker. Tightly coupled to C24 + C21.
**Agent notes:** `CampaignPage.jsx`, `PersonalNarrativeLog.jsx`. See Q3.

### C24 · `R9bLDGrNX42z` — Combine narrative sections; arrow-toggle entries · **Feature · L · Needs-decision**
Selected: `th.text-info` in a narrative `table` header.
> Can we combine this section with the above campaign narrative section into one "campaign narrative section" with each entry hidden by an arrow toggle that players can click to open. The most recent entry remains displayed by default but can be hidden; the rest default closed but players can open as many as they want at once. Each entry keeps edit + delete.
**Interpretation:** Merge the two narrative-related sections into a single collapsible list (accordion, multi-open), newest expanded by default, per-entry edit/delete preserved. Coupled to C22/C21.
**Agent notes:** See Q3 — do C21/C22/C24 together as one "Campaign Narrative rework."

---

## Slide-out: POOLS panel (`ItemPoolPanel.jsx` / settlement pool components — `aside.fixed`)

### C13 · `F-R888B98nwY` — **Pools rework: RECOVERY / SETTLEMENT pools + equipment cycle** · **Feature · XL · Needs-decision**
Selected: `header.flex` of the POOLS slide-out.
> This slide out panel isn't really correct. We need item pools: a RECOVERY POOL and a SETTLEMENT POOL. When I draw items from the item deck there's an "add to pool" button — those go straight into my sheds and they shouldn't. They should go into a SETTLEMENT POOL, then be added to a LOCKER or STORE or SOLD. We also need a RECOVERY POOL where items found during battles go; items from LOCKERS also go to the recovery pool after a battle.
> **POOL SECTIONS & buttons:**
> - RECOVERY POOL — buttons **+SHED, SELL**
> - SETTLEMENT POOL — buttons **+STORE, +LOCKER, SELL**
> - SHED — clicking +SHED on a RECOVERY item moves it to the SETTLEMENT pool and ticks the shed counter +1 (resets next battle).
> - LOCKER — items moved into LOCKER from SETTLEMENT pool auto-move to RECOVERY POOL at start/end of next battle.
> - STORE — items in a STORE can be equipped on units during the BATTLE ROSTER step. Any not equipped that battle are SOLD for caps. After the battle, equipped STORE items move to RECOVERY POOL along with items found in battle.
**Interpretation:** Restructure the POOLS slide-out into RECOVERY POOL + SETTLEMENT POOL + SHED + LOCKER + STORE sections with the exact buttons/auto-moves above, and rewire the "add to pool" / structure-draw destinations and the round-transition logic. Big data-model + flow change touching the round-end cleanup in `App.jsx`.
**Agent notes:** `ItemPoolPanel.jsx`, `utils/settlementItemDeckUtils.js`, `usePersistedState.js` (item `location` values), round-end logic in `App.jsx` (L66–124), RosterBuildPhase (STORE equipping). **Decision required** — see Q2. This is the backbone of C10, C14–C17.

### C17 · `FucHEFAaagkj` — Add equipment-cycle explanation · **Feature · M · Needs-decision**
Selected: `p.text-muted.text-xs.mb-3` (descriptive paragraph inside the POOLS panel).
> It would be good to include a more detailed explanation of the EQUIPMENT CYCLE and the various SETTLEMENT POOLS AND STRUCTURES.
> SETTLEMENT EQUIPMENT CYCLE: BATTLE → RECOVERY POOL → MAINTENANCE SHEDS → USE STRUCTURES → SETTLEMENT POOL → LOCKERS/STORES.
> Add items found during battles to RECOVERY POOL, add items you want to keep to SHEDS and sell the rest. Items added to SHEDS / drawn from STRUCTURES go to a SETTLEMENT POOL. Before battle transfer items from SETTLEMENT POOL into LOCKERS and STORES, sell the rest. Items in STORES can be equipped next battle. Items in LOCKERS auto-move to your RECOVERY POOL.
**Interpretation:** Add an explainer (text/diagram) of the cycle inside the POOLS panel. Copy supplied. Note: this cycle description must be reconciled with C13 (see Q2 — they're consistent but worth confirming the canonical wording).
**Agent notes:** Add to POOLS panel header/help. Do alongside C13.

### C14 · `iz6ZzsPfBFjl` — Stash tab tooltip copy · **Change · S · Ready**
Selected: POOLS tab `button.flex-1` (2nd).
> Unique and Quest items get stored in your stash and can be equipped and removed from units at any time.
**Interpretation:** Set this tab's tooltip/description text to the supplied sentence (Stash = Unique/Quest items, equip/unequip anytime).
**Agent notes:** POOLS panel tab `title=`/subtitle.

### C15 · `z5r-yYJuNSw5` — Explore tab tooltip copy · **Change · S · Ready**
Selected: POOLS tab `button.flex-1` (4th).
> Draw and track your explore cards and their consequences.
**Interpretation:** Set the Explore tab tooltip/description to this sentence.

### C16 · `stLFZJT7eBWa` — Decks tab tooltip copy · **Change · S · Ready**
Selected: POOLS tab `button.flex-1` (3rd).
> Draw settlement items and boosts using the decks on this page.
**Interpretation:** Set the Decks tab tooltip/description to this sentence.

---

## Page: QUESTS / OBJECTIVES (`ObjectivesPage.jsx` + quest content pipeline)

### C01 · `vGXwnAoXf7eO` — Quest cards missing full text (data) · **Data · L · Ready**
Selected: an amber `span.text-xs` quest badge; attachment `c01-edens-project-quest.png` shows the full "CONVINCE THE TRADERS / Eden's Project" card (objective + reward: "Your Settlement gains 1 Item Structure worth 150c").
> We need to make sure the quests contain all the text from their actual quest cards. I'm not sure if it's the scraper not scraping all the text or if we have the text but just didn't add it. For example for Eden's Project based on our current text the player would have no idea how to complete or what reward they would receive. See attached image for the full quest text.
**Interpretation:** Audit quest content vs the real cards; many quests are missing objective/completion/reward text. Determine whether it's a scrape gap or an import gap, then backfill.
**Agent notes:** Quest pipeline — `scripts/*quest*` (build/import/export per `package.json`), quest content JSON consumed by `ObjectivesPage.jsx`. Cross-check against source card text (e.g. Maloric library). Start with Eden's Project as the reference case. See `CLAUDE.md` "Quest content pipeline" commands. **Possible question Q4.**

---

## Cross-cutting groups (for sequencing)
- **Homestead header/settlement restructure:** C08, C18, C10, C19 (+ C02 answer). Do together.
- **Quick text/remove wins:** C09, C11, C12, C14, C15, C16, C20, C23 (+ verify C04, C25).
- **Map overhaul:** C07, C05, C06, **C03** (faction-threat editable), **C04** (remove legend) — one feature.
- **Pools/equipment cycle:** C13, C17 → unblocks C10. (+ C14–16 copy.)
- **Campaign narrative rework:** C21, C22, C24.
- **Quest data:** C01.
