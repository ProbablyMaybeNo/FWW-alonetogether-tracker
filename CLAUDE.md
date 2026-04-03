# FWW Alone Together Tracker

Quest card tracker for FWW (Flesh and Blood) — Vite + React, deployed on Vercel.

## Commands
```bash
npm run dev                          # Vite dev server
npm run build                        # production build
npm run preview                      # preview production build
npm run lint                         # eslint

# Quest content pipeline
npm run build:quest-content          # build quest card content
npm run import:quest-content         # import from vision cache
npm run export:quest-text-review     # export for text review
npm run export:quest-manual          # export for manual edit
npm run import:quest-manual          # import manual edits
```

## Stack
- React 19 + Vite (not Next.js — pure client-side SPA)
- Tailwind v4
- Supabase for backend/DB (`@supabase/supabase-js`)
- Tesseract.js for OCR (card text recognition)
- Lucide React icons
- Package manager: npm
- Deployment: Vercel (`vercel.json` in root)

## Architecture
- `src/` — React app
- `scripts/` — quest content pipeline scripts (mjs format)
- `public/` — static assets
- `exports/` — generated export files
- `dist/` — build output

## Key Notes
- This is an ES module project (`"type": "module"` in package.json)
- Scripts use `.mjs` extension — don't convert to CommonJS
- Supabase credentials are in environment variables — check `.env` or Vercel dashboard
- OCR pipeline: `debug_fww.py` and other Python scripts exist at root for data processing
- `analysis.txt` has research/notes — read before changing card data logic
