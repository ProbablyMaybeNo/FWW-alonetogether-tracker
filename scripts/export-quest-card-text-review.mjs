/**
 * Export quest card OCR text for manual cleanup (CSV + plain text).
 *
 * Reads:  src/data/questCardContent.json
 * Writes: exports/quest-card-text-review.csv
 *         exports/quest-card-text-review.txt
 *
 * CSV columns: name, front_text, back_title, back_text
 * - UTF-8 with BOM for Excel on Windows
 * - Multiline cells use standard CSV quoting
 *
 * After you edit the CSV (keep the name column stable), you can merge back
 * with a future import script, or paste cleaned blocks into JSON by card name.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.join(__dirname, '..')

function escCsv(cell) {
  const s = cell == null ? '' : String(cell)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function main() {
  const src = path.join(rootDir, 'src', 'data', 'questCardContent.json')
  const outDir = path.join(rootDir, 'exports')
  const rows = JSON.parse(fs.readFileSync(src, 'utf8'))

  if (!Array.isArray(rows)) {
    throw new Error('questCardContent.json must be a JSON array.')
  }

  fs.mkdirSync(outDir, { recursive: true })

  const headers = ['name', 'front_text', 'back_title', 'back_text']
  const csvLines = [
    headers.join(','),
    ...rows.map(r =>
      [r.name, r.frontText ?? '', r.backTitle ?? '', r.backText ?? '']
        .map(escCsv)
        .join(','),
    ),
  ]
  const csvPath = path.join(outDir, 'quest-card-text-review.csv')
  fs.writeFileSync(csvPath, `\uFEFF${csvLines.join('\n')}\n`, 'utf8')

  const sep = '='.repeat(80)
  const txtParts = []
  for (const r of rows) {
    txtParts.push(
      sep,
      `CARD: ${r.name}`,
      sep,
      '--- FRONT ---',
      String(r.frontText ?? '').trimEnd(),
      '',
      '--- BACK TITLE ---',
      String(r.backTitle ?? '').trimEnd(),
      '',
      '--- BACK BODY ---',
      String(r.backText ?? '').trimEnd(),
      '',
      '',
    )
  }
  const txtPath = path.join(outDir, 'quest-card-text-review.txt')
  fs.writeFileSync(txtPath, txtParts.join('\n'), 'utf8')

  console.log(`Wrote ${path.relative(rootDir, csvPath)} (${rows.length} rows)`)
  console.log(`Wrote ${path.relative(rootDir, txtPath)}`)
}

main()
