/**
 * Generates src/data/battle/*.json from Maloric-style scrape (fww_cards.json).
 * Run: node scripts/generate-battle-decks.mjs
 * Override input: FWW_CARDS_JSON=path/to/fww_cards.json
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const defaultInput = path.join(root, '..', 'Webscraper', 'data', 'fww_cards.json')
const input = process.env.FWW_CARDS_JSON || defaultInput
const outDir = path.join(root, 'src', 'data', 'battle')

const ENTITY_FILES = [
  ['creatures', 'battleCreatures.json'],
  ['strangers', 'battleStrangers.json'],
  ['dangers', 'battleDangers.json'],
  ['explores', 'battleExplores.json'],
  ['events', 'battleEvents.json'],
  ['environments', 'battleEnvironments.json'],
  ['battlefields', 'battleBattlefields.json'],
  ['purposes', 'battlePurposes.json'],
]

function main() {
  if (!fs.existsSync(input)) {
    console.error('Missing input:', input)
    console.error('Set FWW_CARDS_JSON or place Webscraper/data/fww_cards.json next to this app folder.')
    process.exit(1)
  }
  const raw = JSON.parse(fs.readFileSync(input, 'utf8'))
  fs.mkdirSync(outDir, { recursive: true })

  for (const [entity, filename] of ENTITY_FILES) {
    const rows = raw.filter(
      c => (c.extra_data?.entityType || c.extra_data?.entity_type) === entity
    )
    const seen = new Set()
    const cards = []
    for (const c of rows) {
      const id = c.extra_data?.id ?? c.extra_data?.key ?? c.name
      const name = c.name || c.extra_data?.freeTextLabels?.NAME || String(id)
      const k = `${id}::${name}`
      if (seen.has(k)) continue
      seen.add(k)
      cards.push({ id, name })
    }
    cards.sort((a, b) => a.name.localeCompare(b.name))
    const outPath = path.join(outDir, filename)
    fs.writeFileSync(outPath, JSON.stringify(cards, null, 2) + '\n')
    console.log(filename, cards.length)
  }

  const meta = {
    generatedAt: new Date().toISOString(),
    source: path.basename(input),
    version: 1,
  }
  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(meta, null, 2) + '\n')
  console.log('Done →', outDir)
}

main()
