# FWW: Alone Together Campaign Tracker

A Pip-Boy themed web app for tracking your Fallout: Wasteland Warfare "Alone Together" campaign. Replaces the Google Sheets spreadsheet with a sleek, interactive interface.

## Features

- **Overview Dashboard** - At-a-glance stats: caps, roster, structures, power, water, defense, resources
- **Card Draw System** - Independent random draws for Settlement Events and Explore Cards with lock/hold
- **Active Events Tracking** - Track consequence cards and events currently in play
- **Unit Roster** - Add/remove units, track battles, damage, fate, status, conditions, and equipped items
- **Item Equipment** - Searchable/filterable item catalog (907 items) with per-unit assignment
- **Settlement Management** - Build structures, track power/water generation and consumption
- **Structure Usage** - Mark structures as used each round with one-click reset
- **Event Deck Management** - Full 100-card deck browser with drawn/in-play/complete tracking
- **Data Persistence** - Auto-saves to localStorage with JSON export/import backup
- **Quest Cards** - Track active quests

## Tech Stack

- React 18 + Vite
- Tailwind CSS (Pip-Boy green terminal theme)
- localStorage for persistence
- No backend required - runs entirely in the browser

## Getting Started

```bash
npm install
npm run dev
```

## Data

Reference data extracted from the original Google Sheets tracker:
- 302 units across 23 factions
- 907 items (armor, weapons, chems, food, mods, perks, etc.)
- 83 settlement structures
- 100 event cards (53 Settlement Events + 47 Explore Cards)

## Export / Import

Use the download/upload buttons in the top-right corner to export your campaign as JSON or import from a backup file.
