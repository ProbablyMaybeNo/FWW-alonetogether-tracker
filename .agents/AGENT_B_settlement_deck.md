# Agent B — Settlement Item Deck UI

## Your Role
You are building the Settlement Item Deck panel on the Settlement page. This is a self-contained UI feature. You can work in parallel with Agent A (schema), but your data layer depends on the `settlement_item_deck` column Agent A creates. Wire the UI first using local state, then connect to Supabase once the column exists.

## Branch
`feature/live-battle-system` — all work goes on this branch.

## Project Context
- Path: `D:\AI-Workstation\Antigravity\apps\FWW-alone-together-tracker`
- Stack: React 19 + Vite, Tailwind v4, Supabase
- Package manager: npm
- Read these files before starting:
  - `src/SettlementPage.jsx` — where your panel goes (Item & Boost Decks sub-tab)
  - `src/useCampaignSync.js` — how state is saved to Supabase
  - `src/usePersistedState.js` — offline state shape
  - `src/data/items.json` — the full item card pool (every card in the game)
  - `src/components/BattleDeckPanel.jsx` — reference for draw/discard UI pattern already in the app

## What This Feature Does

The Settlement Item Deck is each player's personal copy of every item card in the game. It is the source from which all items enter the game. Cards drawn from it are always permanently discarded.

**How it works mechanically:**
- Draw pile starts as all item IDs from `items.json`, shuffled
- When a player uses a structure, cards are drawn one at a time until a card matching the structure's type appears — all drawn cards (matching or not) go to discard permanently
- When the draw pile exhausts, the entire discard pile is auto-reshuffled back into the draw pile (with a notification)
- Players can manually review past discarded cards by name and restore specific ones back to the draw pile (edge case/correction mechanic)
- Contributed cards pulled for Wasteland Items Deck during battle setup also go to discard here (Agent C handles that trigger — just make sure your save function is exported cleanly)

## UI to Build

Add a new panel to the **Item & Boost Decks** sub-tab of `SettlementPage.jsx`, alongside the existing settlement deck and boost deck panels.

### Panel layout:
```
┌─────────────────────────────────────────┐
│  SETTLEMENT ITEM DECK                   │
│  Draw Pile: 847 cards  |  Discarded: 42 │
│                                         │
│  [DRAW CARD]                            │
│                                         │
│  Last drawn: Combat Knife (Melee)       │  ← shows after a draw
│                                         │
│  [▼ DISCARDED CARDS (42)]              │  ← collapsible
│    Search: [__________]                 │
│    • Laser Pistol          [RESTORE]    │
│    • Stimpak               [RESTORE]    │
│    • ...                                │
└─────────────────────────────────────────┘
```

### Behaviour:
- **DRAW CARD**: pulls the next card from the draw pile, moves it to discard, shows it as "Last drawn: [name] ([subType])"
- **Auto-reshuffle**: when draw pile hits 0, shuffle all discards back into draw pile, show a brief inline alert: "Deck exhausted — reshuffled X cards back in."
- **Discarded Cards list**: collapsible, searchable by name. Shows all discarded card names + subType.
- **RESTORE button**: moves that card from discard back to draw pile (adds it back at a random position). Tracks restored cards in `manuallyRestored` array for audit purposes.
- Do NOT show card content/text in this panel — name and subType only. Full card content is for the Live Battle Tracker (Agent E).

### Initialization:
If a player's `settlement_item_deck` is null or empty (new player), auto-initialize it: take all IDs from `items.json`, shuffle them, set as `drawPile`. Show a one-time message: "Settlement Item Deck initialized with X cards."

## State Shape
```javascript
settlementItemDeck: {
  drawPile: ["itemId1", "itemId2", ...],  // shuffled, draw from index 0
  discardPile: ["itemId3", ...],           // permanent discard
  manuallyRestored: ["itemId4", ...]       // audit trail
}
```

## Saving State
- Online: call `patchSettlementItemDeck(campaignId, userId, newState)` via Supabase RPC (Agent A creates this RPC — stub it if not yet available)
- Offline: merge into the localStorage state under key `settlementItemDeck`
- Debounce saves by 500ms (match the pattern in `useCampaignSync.js`)

## Export Required
Export a `useSettlementItemDeck` hook or equivalent that Agent C (Battle Setup) can call to:
- Get current `drawPile` and `discardPile`
- Call `contributeCardsToBattle(n)` — removes `n` random cards from draw pile → discard pile and returns their IDs (Agent C uses these IDs to populate the Wasteland Items Deck)

## Styling
- Match the existing terminal aesthetic — dark background, pip-green labels, amber accents for warnings
- Use the same card/panel pattern as `BattleDeckPanel.jsx`
- "Deck exhausted" alert: use amber/warning colour, auto-dismiss after 4 seconds
- Collapsible sections: use the same chevron + toggle pattern already in the app

## Definition of Done
- Panel renders in Settlement page → Item & Boost Decks tab
- Draw, discard, auto-reshuffle, restore all work correctly
- Initializes from `items.json` for new players
- State persists (online + offline)
- `contributeCardsToBattle(n)` is exported and callable
- `npm run build` passes with 0 errors
- `git add` + `git commit`: `feat: settlement item deck UI and draw mechanics`

## Report Back
When done, report:
1. Where the hook/function is exported from
2. Exact signature of `contributeCardsToBattle`
3. Any items in `items.json` that had missing/unexpected data you had to handle
4. Screenshot or description of the panel in the UI
