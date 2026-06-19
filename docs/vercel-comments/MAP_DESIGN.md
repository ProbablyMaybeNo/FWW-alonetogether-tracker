# Campaign Map — Rebuild Spec (canonical)

Supersedes the Wave 5 notes in `JOBS.md` (J21–J24c) and map comments C03–C07. This is
Ross's actual intent, restated 2026-06-18 and confirmed. The earlier catalogue captured
the *trimmed* suggestions; this doc is the ground truth the build follows.

## Premise

The current map is over-built: a hardcoded 24-territory Colorado map (`SEED_TERRITORIES`),
faction pressure-region polygons, fog-of-war, a faction-threat tracker, a legend/state key,
and seed trade routes. **All of that is removed.** It is replaced by a blank, fully
player-authored map.

## The whole feature (nothing more than this)

1. **Large map at the top of the page**, above the header/settlement sections.
   - The map is a **blank black canvas** until a campaign admin **uploads a map image**
     to use as the background.

2. **Slide-out icon palette to the right of the map.**
   - Holds a variety of generic icons/symbols (not lettered — assignable to anything).
   - **Campaign creator + anyone granted admin rights** can place icons on the map to mark
     locations: drag/drop onto the canvas, then customize — **change colour, add text** —
     via simple controls. Use them however they want.

3. **Snap-to-icon route lines.**
   - Draw a line; its ends **snap to icons**, producing clean connections (no wobbly
     free-floating lines).

4. **Auto-populating map table** (the single place all detail lives — no cluttered per-icon
   popups).
   - **Placing an icon auto-creates a location row.**
   - **Drawing a line auto-creates a route row.**
   - Location rows: name/text, colour (mirrors the icon), **assign to a player/faction
     (token)**, **territory-ownership rules**, buffs, notes, etc.
   - Route rows: **ownership**, **which territories it connects** (auto-filled from the
     snapped endpoints), **buffs for the route owner**, notes.
   - Rows are the edit surface; the map stays purely visual.

That's it. No legend key, no faction-threat tracker, no fog-of-war, no hex grid, no pressure
regions.

## What survives from the current code (the easy part)

The persistence backbone is reused as-is:
- `campaigns.campaign_map_state` (jsonb) + `patch_campaign_map_state` RPC — already shared
  across every player in a campaign and across their devices. (`supabaseCampaignMapMigration.sql`)
- The freeform **marker** pattern (`addMarker`/`moveMarker`/`removeMarker`, x/y in 0..100)
  is the seed of the new "icon" model — generalize it.
- `CampaignMapCanvas` drag/drop + the shared-state hook shape.

## What is deleted

- `data/campaignMap.js` seed content: `SEED_TERRITORIES`, `SEED_ROUTES`, `PRESSURE_REGIONS`,
  `FACTIONS`, `TERRITORY_TYPES`, `STARTER_REVEALED_IDS`, the threat factions.
- Components: `ThreatTracker`, `CampaignLegend`, `FogOfWarLayer`, `TerritoryNode`,
  `TradeRouteLine` (seed-route renderer), the seed-driven `TerritoryPanel`/`RoutePanel`.
- Hook logic tied to seeds: `exploreTerritory`/`adjacency`/reveal/threat/`showHidden` GM view.
- Header stats (REVEALED/EXPLORED/CLAIMED/ROUTES/INCOME) tied to seed states.

## New data model (in `campaign_map_state` jsonb)

```
{
  background: { ... },          // uploaded map image reference (see Decision M1)
  icons: [                      // formerly "markers" — user-placed locations
    { id, kind, x, y, color, label }
  ],
  lines: [                      // routes; endpoints reference icon ids
    { id, fromIconId, toIconId, color }
  ],
  table: {                      // editable detail keyed by icon/line id
    [id]: { owner, faction, rules, buffs, notes, ... }
  }
}
```
- A `table` row is created lazily whenever an icon/line exists without one; the UI renders a
  row per icon and per line. Route rows show connected-territory names resolved from
  `fromIconId`/`toIconId` → icon labels.

## Build phases

- **P1 — Strip:** remove seed territories/routes/pressure/threat/fog/legend; reduce the page
  to canvas + icon palette, keeping persistence. Map renders blank.
- **P2 — Image upload:** admin uploads a background image; renders behind the canvas.
- **P3 — Icons:** generic palette, drag-to-place, recolour, label, move, delete. Persist.
- **P4 — Table:** auto-row per icon; edit owner/faction/rules/buffs/notes; colour mirrors.
- **P5 — Lines:** draw with snap-to-icon endpoints; auto-row per line; auto-fill connected
  territories; owner/buffs editable in the row.
- **P6 — Admin gating:** restrict placing/editing to campaign creator + admins; others view.

## Decisions (locked 2026-06-18)

- **M1 — Map image storage → Supabase Storage bucket.** Reuse the existing Supabase project
  (already the app's backend). Create a bucket (e.g. `campaign-maps`) + access policy;
  uploads go there and only the public/signed URL is stored in `campaign_map_state.background`.
  Full-quality images, light sync payload. No new service or cost tier.
- **M2 — Admin = campaign creator only (for now).** Creator places/edits icons, lines, and
  table rows; all other players view read-only. A grantable per-player admin flag can be
  added later without reworking this.
