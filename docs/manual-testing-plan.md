# FWW: Alone Together Tracker — Manual QA Plan (Mission-Based)

**Application:** [FWW: Alone Together Tracker](https://fww-alonetogether-tracker.vercel.app/)  
**Type:** Live browser testing (Chrome) with optional **Kapture** capture/DOM inspection.

This plan mirrors the **Campaign Console** methodology (`campaign-console-live/docs/v1-testing-plan.md`): numbered **missions** (sections), **start state**, step tables (**Action → Expected → Verify**), persistence checks, and Kapture evidence (screenshots, console).

**Reference repos**

- Campaign Console (pattern source): `D:\AI-Workstation\Antigravity\apps\campaign-console-live`
- QA handoff / Kapture workflow: `campaign-console-live/docs/QA_AGENT_HANDOFF.md` (if present in your clone)

---

## Testing methodology

### How to run a mission

1. Note **Start state** (clean profile vs continued session).
2. Execute each **step** in order in Chrome (or via Kapture: `navigate`, `click`, `fill`, etc.).
3. After materially changing data: **hard refresh** (`Ctrl+Shift+R`) and confirm **persistence** (localStorage / cloud sync per mode).
4. After each mission (or on any failure): **Kapture** — screenshot + `console_logs` (errors/warnings).
5. Record **PASS / FAIL** per step; on FAIL, note expected vs actual and attach screenshot + console snippet.

### Kapture alignment (Campaign Console pattern)

| Checkpoint | Kapture / manual |
|------------|------------------|
| Page loaded | `list_tabs` → confirm tab URL; `screenshot` |
| After clicks / navigation | `screenshot` |
| Silent failure | `console_logs` (limit as needed) |
| Sticky focus / scroll regions | `focus` + `keypress` (e.g. Space on button) if click misses |
| Dynamic selectors | `elements` with visible filter; use stable text/roles where possible |

Tab id changes per session; always resolve with `list_tabs` after connecting Kapture.

### Deployment vs local

- **Production:** `https://fww-alonetogether-tracker.vercel.app/`
- **Local:** `npm run dev` (default Vite port) — same missions apply.

### Auth modes (mission branching)

| Mode | How you enter | What to test |
|------|----------------|-------------|
| **Solo / no cloud** | App loads tracker directly when Supabase is not configured, or use **Solo** from login if shown | Missions **1–8** (skip multi-device sync in M8) |
| **Supabase + login** | Sign in; choose or create campaign from lobby | Missions **1–8**; add **M8** multi-session if you use two browsers |

---

## Standard test data

Use consistent labels so you can find state after refresh/import.

| Field | Suggested value |
|-------|-----------------|
| Player / settlement name | `QA Settlement` |
| Caps (initial edit) | `500` (or phase-appropriate) |
| Round | `3` |
| Import file | Export JSON once, tweak in editor for negative tests |

---

# Mission 0 — Environment and baseline

**Goal:** Correct URL, shell visible, no console errors on first paint.

**Start state:** Fresh Chrome profile or incognito (optional); navigate to production URL.

| Step | Action | Expected result | Verify by |
|------|--------|-----------------|-----------|
| 0.1 | Open `https://fww-alonetogether-tracker.vercel.app/` | App shell loads | Header shows FWW / ALONE TOGETHER; bottom nav/tabs visible (Overview, Roster, …) |
| 0.2 | Open DevTools → Console | No red uncaught errors on load | Console clear or only benign warnings |
| 0.3 | Resize window narrow ↔ wide | Tabs remain usable; primary nav not broken | Layout acceptable at mobile width |
| 0.4 | Kapture: `screenshot` | Matches above | Archive for baseline |

**Exit criteria:** M0 steps PASS.

---

# Mission 1 — Navigation shell (all tabs)

**Goal:** Every primary tab mounts without error.

**Start state:** On production URL, solo or logged-in as applicable.

| Step | Action | Expected result | Verify by |
|------|--------|-----------------|-----------|
| 1.1 | Click **OVERVIEW** | Overview content visible (phase banner, stats) | Title “ALONE TOGETHER” or phase block visible |
| 1.2 | Click **ROSTER** | Roster UI | Add/search affordances visible |
| 1.3 | Click **SETTLEMENT** | Settlement / structures UI | Structure list or empty state |
| 1.4 | Click **OBJECTIVES** | Objectives with sub-tabs (Secret / Scavenger / Quest) | Three sub-tabs |
| 1.5 | Click **EVENTS** | Events deck UI | Filters (e.g. settlement/explore) / stats row |
| 1.6 | Refresh; repeat 1.1–1.5 quickly | No blank screens; no stuck loading | Each tab renders |

**Kapture:** Screenshot per tab once per release candidate.

---

# Mission 2 — Persistence (local campaign)

**Goal:** Core state survives refresh (localStorage path).

**Start state:** Clear site data *or* note existing key `fww-campaign-state` (DevTools → Application) before starting if you need a clean baseline.

| Step | Action | Expected result | Verify by |
|------|--------|-----------------|-----------|
| 2.1 | **Overview:** set round to a distinct value (e.g. `7`) | Round displays `R7` (or UI equivalent) | Visible on overview |
| 2.2 | Hard refresh | Round still `7` | Persists |
| 2.3 | **Overview:** adjust caps (edit or `+`/`-`) to a memorable value | Caps updated | Stat matches |
| 2.4 | Refresh | Caps unchanged | Persists |
| 2.5 | Optional: bump **phase** with phase control | Phase changes | After refresh, phase sticks |

**Exit criteria:** 2.2 and 2.4 PASS.

---

# Mission 3 — Overview: phase, round, caps, card drawer, new round

**Goal:** Campaign loop controls and auxiliary panels work.

**Start state:** Overview tab.

| Step | Action | Expected result | Verify by |
|------|--------|-----------------|-----------|
| 3.1 | Change **phase** up/down | Phase name updates (Road Ahead → …) | Banner shows phase 1–4 |
| 3.2 | Open **New Round** (or equivalent control) if present | Modal opens | Confirm/cancel |
| 3.3 | Complete or cancel without breaking state | No data loss | Refresh; prior caps/roster intact unless modal committed |
| 3.4 | Open **card drawer** (settlement/explore draw) on Overview | Drawer works; lock/hold if implemented | Cards can be drawn per rules |
| 3.5 | **Active events** strip | Lists or empty state consistent | No duplicate phantom entries |

Use Kapture if modals trap focus incorrectly.

---

# Mission 4 — Roster

**Goal:** Add/edit/remove units; fate/damage; equipment if present.

**Start state:** Roster tab.

| Step | Action | Expected result | Verify by |
|------|--------|-----------------|-----------|
| 4.1 | **Add** a unit (search + add) | Unit appears in list | Name visible |
| 4.2 | Edit **fate** / damage / battle count | UI updates | Reflects in row |
| 4.3 | Assign **item** from catalog (if available) | Item shows on unit | |
| 4.4 | Remove unit or mark **Dead** | List updates; caps/score if tied | Overview campaign score react |
| 4.5 | Refresh | Roster reflects last actions | Persistence |

---

# Mission 5 — Settlement

**Goal:** Structures, power/water, usage flags, item pool if shown.

**Start state:** Settlement tab.

| Step | Action | Expected result | Verify by |
|------|--------|-----------------|-----------|
| 5.1 | **Add structure** | Appears in list; power/water stats update | Numbers or breakdown visible |
| 5.2 | Mark **used this round** / reset usage | Toggles work | |
| 5.3 | Remove / damage structure if UI supports | List and stats update | |
| 5.4 | Refresh | Structures persisted | |

---

# Mission 6 — Objectives (secret, scavenger, quests)

**Goal:** All three sub-systems usable; quest text modal and flip.

**Start state:** Objectives → **SECRET PURPOSES**.

| Step | Action | Expected result | Verify by |
|------|--------|-----------------|-----------|
| 6.1 | **Draw random** secret purpose | One card highlighted or selected | |
| 6.2 | **Mark complete** (if applicable) | History/alert; state updates | |
| 6.3 | Switch to **SCAVENGER OBJECTIVES** | Set player count ≥2; set active objective | Progress controls work |
| 6.4 | Adjust progress; **mark complete** | Active clears; completed tracked | |
| 6.5 | Switch to **QUEST CARDS** | Deck counts shown | Draw / browse / reset deck |
| 6.6 | **Draw** quest; open **read** (book) modal | Modal shows **front** text | |
| 6.7 | **FLIP** | **Back** title + rules text | Matches physical card intent (known OCR limits) |
| 6.8 | **Add to quest log**; verify max 3 active | Warning or block at 3 | |
| 6.9 | Toggle complete / remove | List updates | |
| 6.10 | Refresh | Quest log and deck IDs persisted | |

---

# Mission 7 — Events

**Goal:** Settlement and explore decks; filters *DRAWN / IN PLAY / DONE* (or labeled); reset.

**Start state:** Events tab.

| Step | Action | Expected result | Verify by |
|------|--------|-----------------|-----------|
| 7.1 | Filter by deck type | List matches filter | |
| 7.2 | **Draw** card; move to **in play** / resolve | Counts update | |
| 7.3 | Complete / discard per UI | Card in DONE or equivalent | |
| 7.4 | **Reset deck** (with confirm) | Drawn/in-play clears per rules | |
| 7.5 | Refresh | Event state persisted | |

---

# Mission 8 — Export / import

**Goal:** Backup and restore campaign JSON.

**Start state:** Arbitrary non-empty state (optional).

| Step | Action | Expected result | Verify by |
|------|--------|-----------------|-----------|
| 8.1 | Click **export** (download) | `.json` downloads | File opens; has expected keys |
| 8.2 | Change something visible (e.g. caps) | — | |
| 8.3 | **Import** prior JSON | Confirmation; state replaced or merged per app behavior | Matches file |
| 8.4 | Import **invalid** file | Error alert; no white screen | User-visible error |
| 8.5 | Kapture `console_logs` on 8.4 | No uncaught exception | |

---

# Mission 9 — Cloud / lobby (only if Supabase enabled on this deployment)

**Goal:** Login, solo escape hatch, campaign selection.

**Start state:** Deployment with env vars set; clear cookies OR use incognito.

| Step | Action | Expected result | Verify by |
|------|--------|-----------------|-----------|
| 9.1 | Load app | **Login** or **Solo** path | Matches configuration |
| 9.2 | **Solo** bypass | Full tracker without campaign id | |
| 9.3 | Login + **lobby**: create/open campaign | `CampaignProvider` receives context | Second browser: join if supported |
| 9.4 | Edit round in A; refresh in B (if sync implemented) | Events match or last-write rules documented | |

If production is solo-only, mark **N/A** and run 9.x only on a Supabase-enabled preview.

---

## Bug report template

```markdown
**Mission / step:** M_x.y
**URL:** https://fww-alonetogether-tracker.vercel.app/ …
**Expected:**
**Actual:**
**Console:** (paste or “none”)
**Kapture:** screenshot filename / tab id
**Severity:** Critical / High / Medium / Low
```

---

## Suggested run order (single session)

`M0 → M1 → M2 → M3 → M4 → M5 → M6 → M7 → M8`  
Add `M9` when testing cloud builds.

**Traceability:** File issues with mission id (e.g. `FAIL M6.7 — flip shows wrong face`) so fixes map back to steps.

---

## Tools and dependencies

| Need | Notes |
|------|--------|
| **Chrome** | Primary browser |
| **Kapture** | Extension + MCP; connect tab before automated steps |
| **Tracker repo** | No extra npm install required **for manual QA** only |
| **Playwright** | Optional future automation; not required for this manual plan |

Regenerating quest OCR / export CSV is separate (`npm run build:quest-content`, `npm run export:quest-text-review`) and does not block manual UI missions.
