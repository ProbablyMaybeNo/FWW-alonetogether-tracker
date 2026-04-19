# Agent G — Mobile UI Improvements

## Your Role
You are improving the mobile experience of the existing app pages (not the new battle system — that's Agents C–F). Your changes are independent and can run in parallel with all other agents. Focus on the pages that exist today: Campaign, Overview, Roster, Settlement, Events, Objectives. Do not touch BattlesPage.jsx — other agents own that.

## Branch
`feature/live-battle-system` — all work goes on this branch.

## Project Context
- Path: `D:\AI-Workstation\Antigravity\apps\FWW-alone-together-tracker`
- Stack: React 19 + Vite, Tailwind v4
- Read these files before starting:
  - `src/AppShell.jsx` — main nav wrapper, this is where the bottom nav goes
  - `src/RosterPage.jsx` — table layout to replace with cards on mobile
  - `src/SettlementPage.jsx` — structure list to improve
  - `src/OverviewPage.jsx` — dense layout to break into collapsible sections
  - `src/index.css` — CSS variables (colours, fonts) — do not change these
  - `BATTLE_REDESIGN_PLAN.md` → sections 2 and 3 — full list of mobile pain points and decisions

## Important Constraints
- Do NOT add `md:` or `lg:` Tailwind prefixes everywhere speculatively — add them only where they solve a specific problem
- Do NOT change any data logic, state management, or save functions — UI only
- Do NOT change desktop layouts that already work — only fix things that are broken on mobile
- Keep the terminal aesthetic intact — same colours, same glow effects, same font
- `text-[10px]` is banned — minimum font size is `text-xs` (12px). Replace all instances.
- All interactive elements in the critical path must have a minimum 44px touch target (use `min-h-[44px]` where needed)

---

## Task 1 — Bottom Navigation Bar

Replace the horizontal tab bar in `AppShell.jsx` with a **bottom navigation bar on mobile** and keep the top tab bar on desktop.

**Tabs and icons (use lucide-react — already installed):**
| Tab | Icon | Label |
|---|---|---|
| Campaign | `Flag` | Campaign |
| Overview | `LayoutDashboard` | Overview |
| Roster | `Users` | Roster |
| Settlement | `Building2` | Settlement |
| Battles | `Swords` | Battles |
| Quests | `Scroll` | Quests |

"Quests" combines Events + Objectives — when "Quests" is tapped, default to whichever of Events/Objectives was last active (or Events as default).

**Bottom nav layout:**
```
┌──────────────────────────────────────┐
│  [Flag] [Grid] [Users] [Build] [⚔] [📜] │
│  Campaign Overview Roster Settle Battles Quests │
└──────────────────────────────────────┘
```

- Fixed to bottom: `position: fixed; bottom: 0; left: 0; right: 0`
- Add `padding-bottom: env(safe-area-inset-bottom)` for notched phones
- Active tab: pip-green icon + label, with subtle glow
- Inactive: muted colour
- On desktop (≥ 768px `md:`): hide bottom nav, show existing top tab bar

Add `pb-16 md:pb-0` to the main content area so it doesn't sit behind the bottom nav.

---

## Task 2 — Roster Page: Card Layout on Mobile

On mobile, replace the multi-column table with a card-per-unit layout.

**Unit card:**
```
┌─────────────────────────────────────┐
│  Preston Garvey      [ACTIVE ●]     │
│  HP: 0/0 reg  |  Rad: 0            │
│  165 caps  •  Unique  •  Leader     │
│                          [▼ expand] │
├─────────────────────────────────────┤  ← expanded
│  Items: Laser Rifle, Combat Armor   │
│  Perks: (list)                      │
│  Fate rolls: 0  •  Battles: 0      │
│  [ROLL FATE]  [ADD ITEM]  [REMOVE]  │
└─────────────────────────────────────┘
```

- Fate badge colours: Active = pip-green, Delayed/Shaken = amber, Injured/Lost/Captured = danger-red, Dead = muted grey
- Collapsed state: name, fate badge, caps, one-line health summary
- Expanded state: full details + action buttons
- On desktop (≥ 768px `md:`): show the existing table layout unchanged

Keep the existing table as-is for desktop — just wrap the unit list in a conditional:
```jsx
<div className="hidden md:block">{/* existing table */}</div>
<div className="block md:hidden">{/* new card list */}</div>
```

Do NOT change any of the existing modal logic (FateRollModal, AddItemModal, PerkPickerModal) — just trigger them the same way from the card's action buttons.

---

## Task 3 — Settlement Page: Structure Cards on Mobile

On mobile, replace the structure grid with a vertical list of cards.

**Structure card:**
```
┌─────────────────────────────────────┐
│  Generator (Small)   [⚡ ON]  [⚡off]│
│  Condition: Good ●                  │
│  PWR: +2  |  Water: 0              │
│  [REPAIR]  [REINFORCE]  [SCRAP]     │
└─────────────────────────────────────┘
```

- Power toggle as a clear ON/OFF button pair (not a tiny checkbox)
- Condition shown as coloured dot: Good = green, Damaged = amber, Badly Damaged = orange, Wrecked = red
- Action buttons in a horizontal row, min 44px height
- Desktop: keep existing layout unchanged (same pattern as Task 2 — hidden/block conditionals)

Also: make the three Settlement sub-tabs (Structures · Item & Boost Decks · Explore) sticky at the top of the page on mobile so they don't scroll away.

---

## Task 4 — Overview Page: Collapsible Sections on Mobile

The Overview page is one dense scroll on mobile. Break it into collapsible sections.

Sections (each with a header that toggles collapse):
1. **Campaign** — phase, round, battle count, scavenger objective
2. **Settlement** — structure count, power/water balance, defense, active events
3. **Roster** — active/dead/unavailable counts, roster value, perk cap info
4. **Quests** — active quests, completed objectives, secret purposes

On mobile: all sections **collapsed by default**, user taps to expand.
On desktop: all sections **expanded by default** (keep current layout, just add the toggle header).

Implementation: simple `useState` per section, chevron icon rotates 180° when open. No animation required.

---

## Task 5 — Modal Improvements

In `src/components/Modal.jsx`:
- Add `max-h-[90vh] overflow-y-auto` to the modal content container
- Add `pb-[env(safe-area-inset-bottom)]` to the modal footer/bottom
- For the `wide` variant: on mobile (`< 768px`), make it full-screen: `w-full h-full rounded-none` instead of the standard width

---

## Task 6 — Text Size Floor

Search and replace ALL instances of `text-[10px]` in the codebase with `text-xs`. Run:
- Grep for `text-\[10px\]` across all `.jsx` files
- Replace every instance

---

## Definition of Done
- Bottom nav renders on mobile, top tabs on desktop
- Roster cards render on mobile, table on desktop
- Settlement structure cards render on mobile, grid on desktop
- Overview has collapsible sections on mobile
- Modal is max-height capped with scroll and safe-area padding
- Zero instances of `text-[10px]` remain
- `npm run dev` — test each changed page at 375px width in browser devtools before committing
- `npm run build` passes with 0 errors
- `git add` + `git commit`: `feat: mobile UI improvements — bottom nav, card layouts, collapsible sections`

## Report Back
When done, report:
1. Any existing functionality broken by the card layout change on Roster (e.g., modal triggers that needed rewiring)
2. Whether the Settlement sticky sub-tabs required CSS changes beyond Tailwind utilities
3. Any `text-[10px]` instances you found that were in unexpected files
4. Confirm tested at 375px width in devtools for each changed page
