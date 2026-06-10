# Pools / Equipment-Cycle Rework — Design & Conflict Flags (C13 + C17)

Per Ross's "build it but check my logic" call. This maps your spec onto the current code and flags where it collides with existing behaviour. **Implementation is paused on the 3 decisions at the bottom.**

## Your spec (C13 + C17), normalised
**Cycle:** `BATTLE → RECOVERY POOL → (+SHED) → SETTLEMENT POOL → (+LOCKER / +STORE) → next battle`

- **RECOVERY POOL** — receives: items found in battle, STORE items that were equipped this battle, and LOCKER items (at next battle). Buttons per item: **+SHED**, **SELL**.
- **SETTLEMENT POOL** — receives: items moved via +SHED, and items drawn from USE structures / the deck "add to pool". Buttons per item: **+STORE**, **+LOCKER**, **SELL**.
- **SHED** — not a storage location; it's a **per-round counter**. +SHED on a RECOVERY item moves it to SETTLEMENT POOL and ticks the shed counter +1. Counter resets at the next battle. (# of Maintenance Sheds = max +SHED moves per round.)
- **LOCKER** — holds items; at the start of the next battle they **auto-move to RECOVERY POOL**.
- **STORE** — holds items; equippable during the BATTLE ROSTER step. Unequipped STORE items are **sold** for caps; equipped ones move to **RECOVERY POOL** after the battle.

## Current code (what exists today)
- Item `location` values: `recovery`, `stored` (=shed-held), `locker`, `stores`, `manual` (stash). Legacy aliases exist (`Temp Pool`, `Maint. Shed`, etc.).
- `ItemPoolPanel.jsx` tabs: POOL / SHED / LOCKERS / STORES. SHED is a **holding location** with capacity `shedCount×2 units`.
- Drawn items currently land in **`stored`** (the bug you flagged): `useStructureUse.jsx:204`, `SettlementDeckPanel.jsx:141`.
- Post-battle: items → `recovery` (`postBattlePropagation.js:131,149`). ✓ already matches.
- **Round-end engine** (`App.jsx:66–124`, fires when shared `round` increments):
  1. Auto-**sells** every `recovery` + `stored` item (refunds caps).
  2. Moves `locker` → `stored`.
  3. Resets structures (`usedThisRound`/`powered` → false).
  4. Auto-Rests roster.
  5. Moves boost hand → `recovery`.

## Mapping spec → new model
- New locations: `recovery`, **`settlement`** (replaces shed-as-storage), `locker`, `store` (was `stores`), `manual` (unchanged).
- New state: a **shed counter** per round (e.g. `state.shedMovesThisRound`), max = # Maintenance Sheds, resets at battle/round boundary.
- Redirect drawn items `stored → settlement` (`useStructureUse.jsx:204`, `SettlementDeckPanel.jsx:141`).
- Rebuild `ItemPoolPanel` sections to RECOVERY / SETTLEMENT / LOCKER / STORE with the buttons above; SHED becomes a counter chip, not a tab.

## ⚠️ CONFLICTS with existing behaviour (need your decisions)

**Conflict A — the round-end auto-sell.** Today, advancing the round **auto-sells all recovery + stored items**. Your model says the player decides (+SHED/SELL on recovery; +STORE/+LOCKER/SELL on settlement), and "sell the rest" happens at specific transfer points. If I keep the current auto-sell, items vanish into caps every round before the player acts. → **Decision 1.**

**Conflict B — locker direction.** Today locker → `stored` at round-end. Your model: locker → **recovery** at the *start of the next battle*. Direction and trigger both differ. → folded into Decision 2.

**Conflict C — the trigger model.** Your cycle is described around **battle boundaries** ("after the battle", "start of next battle"), but the app only has **round increments** (the ROUND stepper / NEXT ROUND) and a **post-battle finalize**. In FWW each settlement round contains one battle, so the two boundaries are close but not identical. I need to know which existing trigger maps to which transition. → **Decision 2.**

**Conflict D — STORE unequipped auto-sell.** "Unequipped STORE items are sold after the battle." That needs a hook at battle resolution (post-battle finalize) to sell STORE items that weren't in the submitted battle roster. Currently STORE (`stores`) items are just assignments; nothing sells the leftovers. New logic in `postBattlePropagation.js`. (No decision needed — just flagging it's new.)

## Decisions needed before I build
**D1 — Round-end auto-sell:** Drop the automatic sell of recovery/stored items entirely (player sells manually), or keep an auto-sell of *leftovers* at some point ("sell the rest")? If keep — which pools and at which boundary?

**D2 — Trigger mapping:** Map the transitions to existing events like this (my recommendation), or differently?
- *After battle* (post-battle finalize, already fires): equipped STORE → recovery, battle finds → recovery, unequipped STORE → sold.
- *Round advance* (ROUND increment): LOCKER → recovery, reset shed counter, reset structures, auto-Rest (as today).
- No new "start battle" button needed.

**D3 — Capacities:** Confirm: SHED = max `+SHED` moves per round = # Maintenance Sheds (resets each round). LOCKER capacity = # Lockers (1 item each). STORE capacity = # Stores (1 item each). Keep the "boost = ½ slot" rule or drop it?
