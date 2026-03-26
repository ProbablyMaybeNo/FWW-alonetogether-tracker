/**
 * OCR quest card images (front + back) from the Webscraper pairs manifest
 * and write src/data/questCardContent.json for the tracker UI.
 *
 * Requires: npm install (tesseract.js), network on first run (downloads eng.traineddata).
 *
 * Env (via .env + node --env-file): WEBSCRAPER_ROOT
 * Optional: QUEST_OCR_LIMIT=n  — process only first n deck cards (debug)
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createWorker } from 'tesseract.js'

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

function cleanOcr(text) {
  return String(text || '')
    .replace(/\f/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function splitBack(text) {
  const t = cleanOcr(text)
  const lines = t.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  if (lines.length >= 2 && lines[0].length <= 72) {
    return { backTitle: lines[0], backText: lines.slice(1).join('\n').trim() }
  }
  return { backTitle: null, backText: t }
}

async function main() {
  const webscraperRoot =
    process.env.WEBSCRAPER_ROOT || 'D:/AI-Workstation/Antigravity/apps/Webscraper'

  const pairsPath = path.join(webscraperRoot, 'data', 'images', 'fww', 'quest_card_pairs.json')
  const deckPath = path.join(rootDir, 'src', 'data', 'questCardDeck.json')
  const outPath = path.join(rootDir, 'src', 'data', 'questCardContent.json')

  const pairs = JSON.parse(fs.readFileSync(pairsPath, 'utf8'))
  /** @type {{ id:number, name:string }[]} */
  const deck = JSON.parse(fs.readFileSync(deckPath, 'utf8'))

  const pairByNorm = new Map()
  for (const q of pairs.quests) {
    pairByNorm.set(norm(q.name), q)
  }

  const limitRaw = process.env.QUEST_OCR_LIMIT
  const limit = limitRaw ? Math.max(1, parseInt(limitRaw, 10)) : null
  const deckSlice = limit ? deck.slice(0, limit) : deck

  const worker = await createWorker('eng', 1, { logger: () => {} })
  await worker.setParameters({
    tessedit_pageseg_mode: '6',
  })

  const out = []
  let i = 0
  for (const card of deckSlice) {
    i += 1
    const p = pairByNorm.get(norm(card.name))
    if (!p) {
      console.warn(`[${i}/${deckSlice.length}] No pair for deck card: ${card.name}`)
      continue
    }
    const frontAbs = path.join(webscraperRoot, ...p.front_path.split('/'))
    const backAbs = path.join(webscraperRoot, ...p.back_path.split('/'))
    if (!fs.existsSync(frontAbs)) {
      console.warn(`[${i}/${deckSlice.length}] Missing front file: ${frontAbs}`)
      continue
    }
    if (!fs.existsSync(backAbs)) {
      console.warn(`[${i}/${deckSlice.length}] Missing back file: ${backAbs}`)
      continue
    }

    process.stdout.write(`[${i}/${deckSlice.length}] OCR ${card.name}…\n`)
    const frontRes = await worker.recognize(frontAbs)
    const backRes = await worker.recognize(backAbs)
    const frontText = cleanOcr(frontRes.data.text)
    const { backTitle, backText } = splitBack(backRes.data.text)

    out.push({
      name: card.name,
      frontText,
      backTitle,
      backText,
    })
  }

  await worker.terminate()
  fs.writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`, 'utf8')
  console.log(`Wrote ${out.length} entries → ${path.relative(rootDir, outPath)}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
