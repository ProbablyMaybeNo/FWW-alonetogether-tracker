# Campaign Map Rebuild — Milestone Plan

Autonomous build checklist for the map rebuild. Full intent + locked decisions live in
`docs/vercel-comments/MAP_DESIGN.md` — **read it before starting.** Work happens on branch
`feat/map-rebuild` (already checked out). P1 (strip) and P2 (image upload) are **done**.

## Working conventions (read before any milestone)

- **Scope:** only `src/components/map/**`, `src/hooks/useCampaignMapState.js`,
  `src/data/campaignMap.js`, and (only if a shared-shape change is needed)
  `src/hooks/useCampaignSync.js`. Do **not** edit unrelated files or refactor outside scope.
- **Stack:** React 19 + Vite, Tailwind v4, Supabase. ES modules. Pip-Boy terminal theme —
  reuse existing classes (`text-amber`, `text-pip`, `text-muted`, `text-danger`,
  `border-pip-mid`, `border-pip-dim`, `bg-panel`, `bg-panel-alt`, `bg-panel-light`) and the
  glow style patterns already in `CampaignMapPage.jsx` / `MapImageControls.jsx`. Match the
  surrounding code's idiom and comment density.
- **Data model** (in `campaign_map_state` jsonb, see MAP_DESIGN.md):
  `{ background:{url,path}|null, markers:[{id,kind,x,y,color?,label?}], lines:[{id,fromId,toId,color?}], table:{ [id]:{ owner?,faction?,rules?,buffs?,notes?,name? } } }`.
  All writes go through `useCampaignMapState` → `patchMap` → `saveCampaignMapState` (already
  wired for solo + online shared sync). Never write Supabase directly from components except
  Storage uploads (see `MapImageControls.jsx`).
- **Edit gating:** `useCampaignMapState` exposes `canEdit` (solo, or online campaign
  creator). Editing affordances must be hidden/disabled when `!canEdit`; view-only users see
  a read-only render.
- **Verification gate (no unit-test suite exists):** a milestone is GREEN only when
  `npm run build` passes AND `npm run lint` introduces **no new** errors/warnings beyond the
  pre-existing baseline (**38 errors, 7 warnings**, all in non-map files — do NOT try to fix
  those, they are out of scope). Confirm your touched files produce zero lint output.
- **Commit per milestone** on `feat/map-rebuild`, message style `feat(map): <Pn> <summary>`,
  ending with the line `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
  Do NOT merge to `main` and do NOT open a PR — leave the branch for Ross to review.
- **Halt and report** (don't guess) if: build/lint can't go green, a milestone needs a
  design decision not covered by MAP_DESIGN.md, or a change would force edits outside scope.

## Milestones

- [ ] **P4 — Map table (icon rows).** Add a `MapTable` component rendered below the canvas on
  `CampaignMapPage`. It auto-renders one row per placed icon (`markers`), creating the row
  lazily — no row needs to pre-exist in `table`.
  - Row fields, all editable inline and persisted: **Name** (`label` on the marker),
    **Colour** (colour picker → writes `marker.color`, mirrors live onto the canvas icon),
    **Owner/assignment** (text), **Faction** (text), **Rules** (textarea), **Buffs**
    (textarea), **Notes** (textarea). `owner/faction/rules/buffs/notes` persist under
    `table[id]`; `name`/`color` persist on the marker itself.
  - Add hook actions as needed: `setMarkerColor(id,color)`, `setMarkerLabel(id,label)`,
    `setTableField(id,key,value)`, and ensure `removeMarker` also deletes `table[id]`.
  - Selecting a row highlights its icon on the canvas and vice-versa (lift a
    `selectedId` state into `CampaignMapPage`; pass to canvas + table). A delete control on
    the row removes the icon + its table entry.
  - `!canEdit` → table renders read-only (no inputs, no delete), no selection editing.
  - Acceptance: place 2 icons → 2 rows appear; rename + recolour a row → canvas icon updates
    live; fill rules/buffs → persists across reload; delete row → icon + entry gone; build +
    lint green.

- [ ] **P5 — Snap-to-icon route lines.** Add line drawing between icons.
  - A **DRAW LINE** toggle button (editor-only, in the aside). When active, the user clicks
    one icon then a second icon; on the second click create a line
    `{ id, fromId, toId, color? }` in `lines` and exit draw mode. Show a hint while active;
    allow Esc / clicking empty canvas to cancel.
  - Render each line in the canvas SVG **under** the icons, endpoints anchored to the two
    icons' current `x,y` (so lines follow icons when moved — that's the "snap"). Skip/guard
    lines whose endpoint icon no longer exists.
  - Each line auto-creates a table row (in the same `MapTable`, a ROUTES section or merged):
    **Name** (`table[lineId].name`), **Owner** (text), **Connects** (auto-derived, read-only:
    the two icons' labels/names), **Buffs** (textarea), **Notes** (textarea). Persist route
    detail under `table[lineId]` (reuse `setTableField`).
  - Removing a line: a delete control on its row and/or right-click the line; also delete
    `table[lineId]`. When an icon is removed, remove any lines referencing it (+ their table
    entries).
  - Add hook actions: `addLine(fromId,toId)`, `removeLine(id)`, `setLineColor(id,color)`.
  - `!canEdit` → no draw button, lines render but are not editable/removable.
  - Acceptance: draw a line between two icons → line appears + a route row appears with
    Connects auto-filled; move an icon → line follows; delete an icon → its lines vanish;
    persists across reload; build + lint green.

- [ ] **P6 — Gating finalize + cleanup.** Lock down and tidy.
  - Canvas must respect `canEdit`: when `!canEdit`, disable icon drag-move, right-click
    remove, and line-draw (pass `canEdit` into `CampaignMapCanvas` and guard the handlers).
  - `resetMap` should also remove the background image from Storage (best-effort, like
    `MapImageControls` remove) so a reset doesn't orphan the uploaded file.
  - Remove any dead code/exports left from the strip across the map module (unused imports,
    unused `MARKER_KINDS` fields, etc.). Do a final `npm run build` + `npm run lint`.
  - Acceptance: a non-creator account cannot modify the map in any way (icons, lines,
    image, reset all hidden/disabled); reset clears the stored image; no dead code; green.

## After all three

Update `docs/vercel-comments/JOBS.md` Wave 5 status (J21–J24c) to done, mark these boxes
`[x]`, and leave a short final report: what shipped, anything deferred, and the exact manual
QA steps Ross should run (creator vs view-only, solo vs online, upload→icons→table→lines→reset).
