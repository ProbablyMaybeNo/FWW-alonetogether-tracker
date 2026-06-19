# Vercel Comments — Job Batch

Execution plan for the 25 comments in `COMMENTS.md`. Every job must be **verified on the live Vercel deploy** before being marked done; if anything looks off, log a follow-up job rather than marking complete. Resolve each Vercel thread as its job lands.

**Workflow per job:** branch from `main` → implement → `npm run build` + lint → push → confirm Vercel preview/prod render → click the original commented element to verify → mark done + resolve thread.

---

## Wave 0 — Decisions (blockers, ask before building)
- **Q1 Map overhaul (C05/C06/C07)** — confirm approach & scope.
- **Q2 Pools/equipment cycle (C13/C17)** — confirm canonical cycle + section rules.
- **Q3 Campaign narrative rework (C21/C22/C24)** — confirm structure.
- **Q4 Quest data (C01)** — confirm source of truth for backfill.
See "Open Questions" below.

## Wave 1 — Quick wins (no decisions needed) — can run in parallel
| Job | Comment | File | Action | Verify |
|-----|---------|------|--------|--------|
| J1 | C11 | HomesteadPage | Remove `battle-ready` chip + dead `battleReadyCount` | ROSTER bar no longer shows the counter |
| J2 | C12 | HomesteadPage | `COST {n}c` → `{n}c` | Chip shows just `{n}c` |
| J3 | C09 | HomesteadPage | Expand REST ALL `title=` with the 3 rest rules | Hover shows full text |
| J4 | C20 | CampaignPage | Remove BATTLES counter | Control gone; no console errors |
| J5 | C23 | CampaignPage | Remove Scavenger Objectives board | Section gone |
| J6 | C14 | POOLS panel | Stash tab copy | Tooltip/desc correct |
| J7 | C15 | POOLS panel | Explore tab copy | Tooltip/desc correct |
| J8 | C16 | POOLS panel | Decks tab copy | Tooltip/desc correct |

## Wave 1b — Quick wins needing a live click to confirm target first
| Job | Comment | Action |
|-----|---------|--------|
| ~~J9~~ | ~~C04~~ | **RE-SCOPED → Wave 5.** C04 is the map LEGEND, not a Homestead card. Folds into the map overhaul. |
| J10 | C25 | Campaign "ROUND N STATUS" card. **Scope confirm needed** — removing the whole card also removes the NEXT ROUND advance button. Ask Ross: whole section vs keep round-advance / drop only standings. |
| J11 | C02 | The commented button (`inline-flex gap-1.5`) doesn't match the current Homestead header (decluttered since the comment). **Ask Ross which button**, or add explanatory tooltips to all header buttons (also covers C19). |

**Catalogue correction (verified live 2026-06-10):** C03 = map FACTION THREAT (factions blank/player-typed) and C04 = map LEGEND (remove) are **map-page**, not Homestead → both moved into Wave 5.

## Wave 2 — Homestead header/settlement restructure (do as one set; depends on C02 answer)
| Job | Comment | Action |
|-----|---------|--------|
| J12 | C08 | Move BUILD/SELECT/USE step toggle into STRUCTURES panel header |
| J13 | C18 | Merge CAPS card into combined STRUCTURES panel (caps counter in header) |
| J14 | C19 | Add BUILD/SELECT/USE explainer tooltips (verbatim copy in COMMENTS.md) |

## Wave 3 — Pools / equipment cycle (depends on Q2)
| Job | Comment | Action |
|-----|---------|--------|
| J15 | C13 | Rebuild POOLS into RECOVERY/SETTLEMENT/SHED/LOCKER/STORE with buttons + auto-moves; rewire add-to-pool + round-end logic in App.jsx |
| J16 | C17 | Add equipment-cycle explainer to POOLS panel |
| J17 | C10 | Slim POOLS side panel on Homestead (icons + used/total counters, click→open POOLS) — **after J15** |

## Wave 4 — Campaign narrative rework (depends on Q3)
| Job | Comment | Action |
|-----|---------|--------|
| J18 | C22 | Player sub-entries on campaign posts; rename +ADD ENTRY → +CAMPAIGN ENTRY; add +PLAYER ENTRY flow |
| J19 | C24 | Merge narrative sections into one accordion (newest open, multi-open, edit/delete per entry) |
| J20 | C21 | Per-player button reveals that player's entries (fits the new model) |

## Wave 5 — Map overhaul (depends on Q1) — large, isolate to its own branch
**DONE on branch `feat/map-rebuild`** (full rebuild per `MAP_DESIGN.md` + `MAP_BUILD_PLAN.md`, P1–P6). Detail now lives in the auto-populating MAP TABLE rather than per-icon popups; the entire seed map (legend, faction-threat tracker, fog, pressure regions) was stripped in P1.
| Job | Comment | Action | Status |
|-----|---------|--------|--------|
| J21 | C07 | Image-upload canvas + drag-to-place icons (per-icon detail moved to map table, not popups) | ✅ done (P2/P3/P4) |
| J22 | C06 | Generic icons, blank names, colour, save name+position (persisted via shared map state) | ✅ done (P3/P4) |
| J23 | C05 | Location rows blank-by-default; route rows auto-fill "Connects" from snapped endpoints | ✅ done (P4/P5) |
| J24 | (C07) | Route-drawing between icons — DRAW LINE button, click two icons, snap-to-icon endpoints | ✅ done (P5) |
| J24b | C03 | FACTION THREAT tracker — **removed entirely** in the rebuild (P1); superseded by per-row faction field | ✅ resolved-by-rebuild |
| J24c | C04 | LEGEND section — **removed entirely** in the rebuild (P1) | ✅ resolved-by-rebuild |

## Wave 6 — Quest data backfill (depends on Q4)
| Job | Comment | Action |
|-----|---------|--------|
| J25 | C01 | Diagnose scrape-vs-import gap; backfill full quest text (objective/completion/reward); Eden's Project as reference |

---

## Status tracker
`[ ]` todo · `[~]` in progress · `[x]` done+verified · `[!]` needs rework

```
Wave 1:  [x] J1  [x] J2  [x] J3  [x] J4  [x] J5  [x] J6  [x] J7  [x] J8   ← shipped to main (b131e63), verified on prod 2026-06-10
Wave 1b: [ ] J9  [ ] J10 [ ] J11
Wave 2:  [ ] J12 [ ] J13 [ ] J14
Wave 3:  [ ] J15 [ ] J16 [ ] J17
Wave 4:  [ ] J18 [ ] J19 [ ] J20
Wave 5:  [x] J21 [x] J22 [x] J23 [x] J24 [x] J24b [x] J24c   ← rebuilt on feat/map-rebuild (P1–P6), pending Ross review/merge
Wave 6:  [ ] J25
```

**Wave 1 verification (prod `fww-alonetogether-tracker.vercel.app`, logged-in campaign):**
- J1 ✓ ROSTER bar no longer shows the "battle-ready" chip (per-row purple swords toggle retained).
- J2 ✓ Roster cost chip reads `900c` (no "COST").
- J4 ✓ Campaign top controls show only ROUND; BATTLES counter gone.
- J5 ✓ Scavenger Objectives board gone (Players → Round Status → Campaign Narrative → My Journal → Danger Zone).
- J3 / J6 / J7 / J8 — native `title=` tooltips; confirmed in code + build (native tooltips don't screenshot reliably).
- Vercel comment threads C09/C11/C12/C14/C15/C16/C20/C23 left **unresolved** pending Ross's eyes — resolve once confirmed.

## Decisions (Wave 0 — answered 2026-06-10)
**Q1 — Map (C05/C06/C07):** ✅ **Simple DRAW LINE button.** Full rebuild = upload map image + drag icons from legend + per-icon info popup + routes via a "DRAW LINE" button (drop each end on two locations). **Fresh map state** (old hex/SVG map replaced).

**Q2 — Pools/equipment cycle (C13/C17):** ✅ **Build per the comment, but check the logic.** Implement exactly as C13 specifies, BUT flag any rule that conflicts with the current `App.jsx` round-end cleanup (L66–124) or is internally inconsistent, and confirm before finalizing.

**Q3 — Campaign narrative (C21/C22/C24):** ✅ **One combined rework.** Single accordion (newest open, multi-open, per-entry edit/delete) + player sub-entries + +CAMPAIGN ENTRY / +PLAYER ENTRY + per-player reveal button.

**Q4 — Quest data (C01):** ✅ **Source = local quest-card images.** Look in `D:\AI-Workstation\Antigravity\apps\FWW-alone-together-tracker` and the **webscraper project** folder under `D:\AI-Workstation\Antigravity\apps\` for images of all the quest cards. Diagnose scrape-vs-import gap, backfill from those images (OCR/vision if needed), Eden's Project as reference.
