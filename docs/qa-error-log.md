# QA error & issue log — FWW Alone Together Tracker

**Purpose:** Running list for another agent to debug/fix. Add new entries at the **top** under the latest session.

**Environment:** Production `https://fww-alonetogether-tracker.vercel.app/` unless noted.  
**Tester:** Manual + Kapture MCP.

---

## Session: 2026-03-27 — Cloud / multiplayer focus

### Code / architecture (pre-test static review)

| ID | Severity | Area | Summary |
|----|----------|------|---------|
| ARCH-001 | High | Multiplayer | `useCampaignSync` exists in `src/hooks/useCampaignSync.js` but is **not imported or used** by `CampaignProvider` (`src/context/CampaignContext.jsx`). Logged-in users selecting a campaign still use `usePersistedState` (localStorage key `fww-campaign` only). **Cloud campaign selection does not persist/sync player state to `player_data` / shared `campaigns` rows** via this hook — multiplayer sync may be incomplete or dead code. |

### Runtime (live pass — production, Kapture tab `1370540122`)

| ID | Severity | Mission / area | Steps | Expected | Actual | Console |
|----|----------|----------------|-------|----------|--------|---------|
| RUN-001 | **Blocker** | M9 — Create campaign | Logged in as `testies123@fww-tracker.app` → **+ CREATE CAMPAIGN** → name `QA Multiplayer Campaign` → **CREATE** | Campaign row inserted; invite shown or enter campaign | Red error: **new row violates row-level security policy for table "campaigns"** | No `error`-level logs captured (message is UI-only from Supabase client). |
| RUN-002 | Info | M9 — Join (negative) | **JOIN CAMPAIGN** → code `ZZZZZZ` → **JOIN** | Friendly “not found” | **Campaign not found. Check the invite code.** | — |
| RUN-003 | Info | Auth | **SIGN OUT** → login again `Testies123` / `Testies123` | Return to lobby | **PASS** — lobby shows logged-in user again | — |
| RUN-004 | Info | Automation | From lobby, **SOLO PLAY (LOCAL ONLY)** — multiple CDP `click`, `focus` + `Enter` / `Space` | Main tracker shell (`<nav>` tabs) | DOM stayed on lobby card (`domSize` ~13877) | — |
| UX-001 | Low | Copy | Compare login vs lobby solo buttons | Same label/help text | **Login:** `PLAY SOLO (NO ACCOUNT)` + “Uses local storage only”. **Lobby:** `SOLO PLAY (LOCAL ONLY)` + “No sync — uses this device only”. Inconsistent wording. | — |

**RUN-004:** Treat as **Kapture/CDP vs React** until a human confirms the same button works in a normal Chrome click. If human repro shows no navigation, investigate `onSolo` / `setSoloMode` in `App.jsx`.

**Blocked for true multi-device / cloud state testing until RUN-001 is fixed** (Supabase RLS or policy drift vs `src/lib/supabaseSchema.sql`). After RUN-001, re-verify ARCH-001 (wire `useCampaignSync` + pass `campaignId` / `userId` from `App.jsx`).

**App-level QA** can continue on **PLAY SOLO (NO ACCOUNT)** for tabs, drawers, export button, etc.; that path is unaffected by campaign RLS.

---

---

## How to use

- **Severity:** Blocker / High / Medium / Low / Info  
- Include **steps**, **expected**, **actual**, and **console** snippet if relevant.  
- Reference mission step from `docs/manual-testing-plan.md` when applicable (e.g. `M9.3`).
