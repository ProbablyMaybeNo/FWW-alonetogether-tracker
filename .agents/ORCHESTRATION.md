# FWW Live Battle System — Agent Orchestration

## Branch
All agents work on: `feature/live-battle-system`
Do not commit to `main`. Do not push unless instructed.

## Full Plan
`BATTLE_REDESIGN_PLAN.md` in the project root. Read the **FINALIZED DECISIONS LOG** section — it is the source of truth.

## Agent Assignments & Dependency Order

```
WAVE 1 — Start immediately, no dependencies
├── Agent A: Schema Migration          (.agents/AGENT_A_schema.md)
└── Agent G: Mobile UI Improvements   (.agents/AGENT_G_mobile_ui.md)

WAVE 2 — Start after Agent A confirms schema is live
├── Agent B: Settlement Item Deck UI  (.agents/AGENT_B_settlement_deck.md)
├── Agent C: Battle Setup Wizard      (.agents/AGENT_C_battle_setup.md)
└── Agent D: Deck Builder             (.agents/AGENT_D_deck_builder.md)

WAVE 3 — Start after Agent C confirms FIGHT! writes to active_battle
└── Agent E: Live Battle Tracker      (.agents/AGENT_E_live_battle.md)

WAVE 4 — Start after Agent E confirms active_battle.status === 'ended' works
└── Agent F: Post-Battle Summary      (.agents/AGENT_F_post_battle.md)
```

## Merge Protocol
When an agent reports completion, return their report to the orchestrating Claude session for review before that agent's work is considered done. Do not start Wave N+1 until Wave N is reviewed and cleared.

## Shared Rules for All Agents
- Branch: `feature/live-battle-system` only
- Run `npm run build` before committing — 0 errors required
- Do not touch files outside your assigned scope
- Do not change existing data shapes unless explicitly required by your brief
- Commit message format: `feat: [description]` — one commit per agent
- If you discover a conflict or ambiguity not covered in your brief, document it in your report and make a reasonable decision — do not block on it
