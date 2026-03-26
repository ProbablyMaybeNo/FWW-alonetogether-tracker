/**
 * Fill src/data/questCardContent.json from Webscraper vision cache + pair manifest.
 *
 * Pairing (front ↔ back) is defined in Webscraper’s quest_card_pairs.json (one key
 * per quest). Transcription lives in quest_review_vision_cache.json under that same key.
 * Tracker cards are matched via questCardDeck.json `name` → norm(name) → pair manifest `name`.
 *
 * Env (optional): WEBSCRAPER_ROOT — default D:/AI-Workstation/Antigravity/apps/Webscraper
 *
 * Usage: node scripts/import-quest-content-from-vision-cache.mjs
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.join(__dirname, '..')

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i === -1) continue
    const k = t.slice(0, i).trim()
    let v = t.slice(i + 1).trim()
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1)
    }
    if (process.env[k] == null || process.env[k] === '') process.env[k] = v
  }
}

loadEnvFile(path.join(rootDir, '.env'))

function norm(s) {
  return String(s || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

function main() {
  const webscraperRoot =
    process.env.WEBSCRAPER_ROOT || 'D:/AI-Workstation/Antigravity/apps/Webscraper'

  const pairsPath = path.join(webscraperRoot, 'data', 'images', 'fww', 'quest_card_pairs.json')
  const cachePath = path.join(webscraperRoot, 'data', 'quest_review_vision_cache.json')
  const deckPath = path.join(rootDir, 'src', 'data', 'questCardDeck.json')
  const outPath = path.join(rootDir, 'src', 'data', 'questCardContent.json')

  if (!fs.existsSync(pairsPath)) {
    console.error('Missing pairs manifest:', pairsPath)
    process.exit(1)
  }
  if (!fs.existsSync(cachePath)) {
    console.error('Missing vision cache:', cachePath)
    console.error('Run Webscraper/scripts/export_quest_review_from_images.py first.')
    process.exit(1)
  }

  const pairs = JSON.parse(fs.readFileSync(pairsPath, 'utf8'))
  const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'))
  const deck = JSON.parse(fs.readFileSync(deckPath, 'utf8'))

  const pairByNorm = new Map()
  for (const q of pairs.quests) {
    pairByNorm.set(norm(q.name), q)
  }

  const out = []
  let missingPair = 0
  let missingCache = 0
  let notOk = 0

  for (const card of deck) {
    const p = pairByNorm.get(norm(card.name))
    if (!p) {
      console.warn(`No pair manifest entry for deck card: "${card.name}" (norm=${norm(card.name)})`)
      missingPair += 1
      out.push({
        name: card.name,
        frontText: '',
        backTitle: '',
        backText: `[NO PAIR: ${card.name}]`,
      })
      continue
    }

    const rec = cache[p.key]
    if (!rec) {
      console.warn(`No vision cache for key ${p.key} (deck: ${card.name})`)
      missingCache += 1
      out.push({
        name: card.name,
        frontText: '',
        backTitle: '',
        backText: `[NO CACHE: ${p.key}]`,
      })
      continue
    }

    if (!rec._ok) {
      console.warn(`Vision failed for ${p.key}: ${rec.error || 'unknown'}`)
      notOk += 1
      out.push({
        name: card.name,
        frontText: '',
        backTitle: '',
        backText: `[EXTRACTION FAILED: ${p.key}]`,
      })
      continue
    }

    out.push({
      name: card.name,
      frontText: rec.front_text ?? '',
      backTitle: rec.back_title ?? '',
      backText: rec.back_body ?? '',
    })
  }

  fs.writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`, 'utf8')

  console.log(`Wrote ${out.length} rows → ${path.relative(rootDir, outPath)}`)
  if (missingPair || missingCache || notOk) {
    console.warn('Issues:', { missingPair, missingCache, notOk })
    process.exitCode = 2
  }
}

main()
