/**
 * One file for hand-editing all quest card text, then import back into the app.
 *
 * Reads:  src/data/questCardDeck.json (order + exact NAME lines)
 *         src/data/questCardContent.json
 * Writes: exports/quest-cards-manual-edit.txt
 *
 * Edit only inside the marked sections. Keep each "NAME:" line exactly as-is
 * (it must match the deck) or import will skip/update the wrong row.
 *
 * Usage: node scripts/export-quest-cards-manual-edit.mjs
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.join(__dirname, '..')

function norm(s) {
  return String(s || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

function contentByName(rows) {
  const m = new Map()
  for (const r of rows) {
    m.set(norm(r.name), r)
  }
  return m
}

function main() {
  const deckPath = path.join(rootDir, 'src', 'data', 'questCardDeck.json')
  const contentPath = path.join(rootDir, 'src', 'data', 'questCardContent.json')
  const outPath = path.join(rootDir, 'exports', 'quest-cards-manual-edit.txt')

  const deck = JSON.parse(fs.readFileSync(deckPath, 'utf8'))
  const contentRows = JSON.parse(fs.readFileSync(contentPath, 'utf8'))
  const byName = contentByName(contentRows)

  const header = `# Quest cards — manual edit file
# Generated for: ${new Date().toISOString()}
#
# Rules:
# - Do not change "=== CARD ===" or "NAME:" lines (NAME must match the deck exactly).
# - Edit only the text under --- FRONT ---, --- BACK TITLE ---, --- BACK BODY ---.
# - Save this file as UTF-8, then run: npm run import:quest-manual
#

`

  const parts = [header]
  for (const card of deck) {
    const row = byName.get(norm(card.name))
    const front = row?.frontText ?? ''
    const backTitle = row?.backTitle ?? ''
    const backBody = row?.backText ?? ''
    const flag = row ? '' : '\n# [WARN: no questCardContent.json row for this deck card — fill in below]\n'

    parts.push(`=== CARD ===
NAME: ${card.name}${flag}
--- FRONT ---
${front}

--- BACK TITLE ---
${backTitle}

--- BACK BODY ---
${backBody}

`)
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, parts.join(''), 'utf8')
  console.log(`Wrote ${path.relative(rootDir, outPath)} (${deck.length} cards)`)
}

main()
