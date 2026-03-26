/**
 * Merge exports/quest-cards-manual-edit.txt into src/data/questCardContent.json
 *
 * Matches rows by normalised NAME (same rules as the app). Deck order is irrelevant;
 * only the NAME: line and the three body sections matter.
 *
 * Usage:
 *   node scripts/import-quest-cards-manual-edit.mjs
 *   node scripts/import-quest-cards-manual-edit.mjs --path ./exports/my-edits.txt
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

function parseManualFile(text) {
  const blocks = text.split(/\n=== CARD ===\r?\n/)
  const parsed = []
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i].trim()
    if (!block || block.startsWith('#')) continue

    const nameMatch = block.match(/^NAME:\s*(.+)$/m)
    if (!nameMatch) {
      console.warn('Skipping block without NAME: line')
      continue
    }
    const name = nameMatch[1].trim()

    function section(label) {
      const re = new RegExp(
        `^--- ${label} ---\\s*\\n([\\s\\S]*?)(?=\\n--- [A-Z ]+ ---|\\n=== CARD ===|$)`,
        'm',
      )
      const m = block.match(re)
      return m ? m[1].trim() : ''
    }

    parsed.push({
      name,
      frontText: section('FRONT'),
      backTitle: section('BACK TITLE'),
      backText: section('BACK BODY'),
    })
  }
  return parsed
}

function main() {
  const args = process.argv.slice(2)
  let fileArg = null
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--path' && args[i + 1]) {
      fileArg = args[i + 1]
      break
    }
  }

  const srcPath = path.resolve(
    rootDir,
    fileArg || path.join('exports', 'quest-cards-manual-edit.txt'),
  )
  const contentPath = path.join(rootDir, 'src', 'data', 'questCardContent.json')

  if (!fs.existsSync(srcPath)) {
    console.error('File not found:', srcPath)
    process.exit(1)
  }

  const parsed = parseManualFile(fs.readFileSync(srcPath, 'utf8'))
  const existing = JSON.parse(fs.readFileSync(contentPath, 'utf8'))
  const index = new Map()
  for (let i = 0; i < existing.length; i++) {
    index.set(norm(existing[i].name), i)
  }

  let updated = 0
  let missing = 0
  for (const p of parsed) {
    const k = norm(p.name)
    const idx = index.get(k)
    if (idx === undefined) {
      console.warn(`No questCardContent row for NAME: "${p.name}" — skipping`)
      missing++
      continue
    }
    existing[idx] = {
      name: existing[idx].name,
      frontText: p.frontText,
      backTitle: p.backTitle,
      backText: p.backText,
    }
    updated++
  }

  fs.writeFileSync(contentPath, `${JSON.stringify(existing, null, 2)}\n`, 'utf8')
  console.log(`Updated ${updated} rows in questCardContent.json`)
  if (missing) console.warn(`Skipped ${missing} unknown NAME(s)`)
}

main()
