import { useState, useMemo } from 'react'
import { Shuffle } from 'lucide-react'
import { shuffleIndices } from '../../utils/inhabitantsState'
import { buildShuffledIndexPile } from '../../utils/battlePageState'
import { inferFactionFromCard, cardSearchBlob, getCardBodyText } from '../../utils/battleDeckCardUtils'

const DECK_BADGE = {
  creature: { className: 'bg-pip-dim/50 text-pip border-pip/40', label: 'Creature' },
  stranger: { className: 'bg-info-dim/40 text-info border border-info/30', label: 'Stranger' },
  danger: { className: 'bg-amber-dim/30 text-amber border border-amber/40', label: 'Danger' },
  explore: { className: 'bg-pip-dim/50 text-pip-label border border-pip-mid/40', label: 'Explore' },
  event: { className: 'bg-amber-dim/20 text-amber border border-amber/35', label: 'Event' },
}

const RANDOM_OPTIONS = [5, 10, 15, 20, 'all']

/**
 * Index-based battle deck (creature, stranger, danger, explore, event).
 * Browse / Build modes for setup; draw mode preserved when deck has cards.
 */
export default function BattleDeckPanel({ title, deckKey, cards, battlePage, patchBattle }) {
  const [uiMode, setUiMode] = useState('browse')
  const [pendingIndex, setPendingIndex] = useState(null)
  const [filterText, setFilterText] = useState('')
  const [factionFilter, setFactionFilter] = useState('')
  const [expanded, setExpanded] = useState(() => new Set()) // unused until card body data exists
  const [selectedIndices, setSelectedIndices] = useState(() => new Set(cards.map((_, i) => i)))
  const [presetName, setPresetName] = useState('')
  const [randomN, setRandomN] = useState(10)

  const ds = battlePage.deckStates[deckKey] || { drawPile: [], discardPile: [] }
  const drawPile = ds.drawPile || []
  const discardPile = ds.discardPile || []
  const total = cards.length
  const remaining = drawPile.length
  const disc = discardPile.length
  const isEmpty = remaining === 0 && disc === 0

  const badge = DECK_BADGE[deckKey] || DECK_BADGE.creature

  const cardRows = useMemo(() => cards.map((c, i) => ({
    ...c,
    idx: i,
    faction: inferFactionFromCard(c.id, c.name),
    searchBlob: cardSearchBlob(c),
    body: getCardBodyText(c),
  })), [cards])

  const factions = useMemo(() => {
    const s = new Set(cardRows.map(r => r.faction))
    return [...s].sort()
  }, [cardRows])

  const filteredRows = useMemo(() => {
    const q = filterText.trim().toLowerCase()
    return cardRows.filter(row => {
      if (factionFilter && row.faction !== factionFilter) return false
      if (!q) return true
      return row.searchBlob.toLowerCase().includes(q) || row.name?.toLowerCase().includes(q)
    })
  }, [cardRows, filterText, factionFilter])

  const filteredIndexSet = useMemo(() => new Set(filteredRows.map(r => r.idx)), [filteredRows])

  function resolveDrawPile(drawP, discP) {
    let dp = [...drawP]
    let di = [...discP]
    if (dp.length === 0 && di.length > 0) {
      dp = shuffleIndices(di.length).map(i => di[i])
      di = []
    }
    return { dp, di }
  }

  function shuffleFromSelection() {
    const idxArray = [...selectedIndices].filter(i => filteredIndexSet.has(i))
    if (!idxArray.length) return
    const shuffled = idxArray
      .map(v => ({ v, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ v }) => v)
    patchBattle(b => ({
      ...b,
      undo: null,
      deckStates: { ...b.deckStates, [deckKey]: { drawPile: shuffled, discardPile: [] } },
    }))
    setPendingIndex(null)
  }

  function handleShuffleAll() {
    patchBattle(b => ({
      ...b,
      undo: { deckKey, before: { drawPile: [...(b.deckStates[deckKey]?.drawPile || [])], discardPile: [...(b.deckStates[deckKey]?.discardPile || [])] } },
      deckStates: { ...b.deckStates, [deckKey]: { drawPile: buildShuffledIndexPile(total), discardPile: [] } },
    }))
    setPendingIndex(null)
  }

  function handleReset() {
    patchBattle(b => ({
      ...b,
      undo: null,
      deckStates: { ...b.deckStates, [deckKey]: { drawPile: [], discardPile: [] } },
    }))
    setPendingIndex(null)
    setSelectedIndices(new Set(cards.map((_, i) => i)))
  }

  function handleDraw() {
    if (pendingIndex !== null) return
    const { dp, di } = resolveDrawPile(drawPile, discardPile)
    if (dp.length === 0) return
    const idx = dp[0]
    const newDraw = dp.slice(1)
    patchBattle(b => ({
      ...b,
      undo: { deckKey, before: { drawPile: [...drawPile], discardPile: [...discardPile] } },
      deckStates: { ...b.deckStates, [deckKey]: { drawPile: newDraw, discardPile: di } },
    }))
    setPendingIndex(idx)
  }

  function confirmDraw() {
    if (pendingIndex === null) return
    const idx = pendingIndex
    patchBattle(b => {
      const cur = b.deckStates[deckKey]
      return {
        ...b,
        deckStates: {
          ...b.deckStates,
          [deckKey]: { ...cur, discardPile: [...(cur.discardPile || []), idx] },
        },
      }
    })
    setPendingIndex(null)
  }

  function handleUndo() {
    const u = battlePage.undo
    if (!u || u.deckKey !== deckKey || !u.before) return
    patchBattle(b => ({
      ...b,
      deckStates: { ...b.deckStates, [deckKey]: { drawPile: u.before.drawPile, discardPile: u.before.discardPile } },
      undo: null,
    }))
    setPendingIndex(null)
  }

  function toggleCard(idx) {
    setSelectedIndices(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  function clearAllSelection() {
    setSelectedIndices(new Set())
  }

  function randomPickFromFiltered() {
    const pool = filteredRows.map(r => r.idx)
    if (!pool.length) return
    let n = randomN === 'all' ? pool.length : Number(randomN)
    n = Math.min(n, pool.length)
    const shuffled = [...pool].sort(() => Math.random() - 0.5)
    setSelectedIndices(new Set(shuffled.slice(0, n)))
  }

  function savePreset() {
    const name = presetName.trim()
    if (!name) return
    const keyList = [...selectedIndices]
    patchBattle(b => ({
      ...b,
      deckPresets: {
        ...b.deckPresets,
        [deckKey]: { ...b.deckPresets[deckKey], [name]: keyList },
      },
    }))
    setPresetName('')
  }

  function loadPreset(name) {
    const list = battlePage.deckPresets?.[deckKey]?.[name]
    if (!Array.isArray(list) || !list.length) return
    const valid = new Set(list.filter(i => typeof i === 'number' && i >= 0 && i < total))
    setSelectedIndices(valid)
  }

  const presetNames = Object.keys(battlePage.deckPresets?.[deckKey] || {}).sort()

  const pendingCard = pendingIndex != null ? cards[pendingIndex] : null
  const selectedInFilter = [...selectedIndices].filter(i => filteredIndexSet.has(i)).length
  const buildLocked = !isEmpty

  function pileStatus(idx) {
    if (drawPile.includes(idx)) return 'draw'
    if (discardPile.includes(idx)) return 'discard'
    return null
  }

  return (
    <div className="border border-pip-dim/40 rounded-lg bg-panel p-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2 border-b border-pip-dim/30 pb-2">
        <h3 className="text-title text-xs font-bold tracking-widest flex-1 min-w-0">{title}</h3>
        <span className="text-muted text-xs whitespace-nowrap">
          {isEmpty ? `${total} cards` : `${remaining} draw · ${disc} discard`}
        </span>
        <div className="flex rounded border border-pip-dim/50 overflow-hidden text-xs shrink-0">
          <button
            type="button"
            onClick={() => setUiMode('browse')}
            className={`px-2 py-1 font-bold ${uiMode === 'browse' ? 'bg-pip text-terminal shadow-[0_0_10px_var(--color-pip-glow)]' : 'text-muted hover:text-pip'}`}
          >
            BROWSE
          </button>
          <button
            type="button"
            onClick={() => setUiMode('build')}
            className={`px-2 py-1 font-bold border-l border-pip-dim/40 ${uiMode === 'build' ? 'bg-pip text-terminal shadow-[0_0_10px_var(--color-pip-glow)]' : 'text-muted hover:text-pip'}`}
          >
            BUILD
          </button>
        </div>
      </div>

      {!isEmpty && (
        <div className="space-y-2 border border-pip-dim/25 rounded bg-panel-light/30 p-2">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleDraw}
              disabled={pendingIndex !== null || (remaining === 0 && disc === 0)}
              className="text-xs border border-amber text-amber font-bold px-3 py-1.5 rounded hover:bg-amber/10 disabled:opacity-40"
            >
              DRAW
            </button>
            {remaining === 0 && disc > 0 && (
              <span className="text-muted text-xs">Deck empty — next draw reshuffles discard</span>
            )}
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-muted border border-muted/30 rounded px-2 py-1 hover:text-danger hover:border-danger/40 ml-auto"
            >
              RESET DECK
            </button>
            {battlePage.undo?.deckKey === deckKey && (
              <button type="button" onClick={handleUndo} className="text-xs text-amber border border-amber/40 rounded px-2 py-1">
                UNDO
              </button>
            )}
          </div>
          {pendingCard && (
            <div className="border border-amber/40 rounded p-3 space-y-2" style={{ boxShadow: '0 0 8px var(--color-amber-glow)' }}>
              <p className="text-muted text-xs tracking-wider">DRAWN</p>
              <p className="text-pip font-bold text-sm">{pendingCard.name}</p>
              <button
                type="button"
                onClick={confirmDraw}
                className="w-full text-xs py-2 border border-pip text-pip rounded hover:bg-pip-dim/20 font-bold"
              >
                RESOLVED → DISCARD
              </button>
            </div>
          )}
        </div>
      )}

      {uiMode === 'browse' && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2 items-center">
            <input
              type="text"
              value={filterText}
              onChange={e => setFilterText(e.target.value)}
              placeholder="Search name / text…"
              className="flex-1 min-w-[8rem] text-xs py-1 px-2 rounded border border-pip-dim/40 bg-panel-dark"
            />
            <select
              value={factionFilter}
              onChange={e => setFactionFilter(e.target.value)}
              className="text-xs py-1 px-2 rounded border border-pip-dim/40 bg-panel-dark min-w-[7rem]"
            >
              <option value="">All tags</option>
              {factions.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
          <div className="max-h-[min(52vh,28rem)] overflow-y-auto space-y-1 pr-0.5">
            {filteredRows.map(row => {
              const ps = buildLocked ? pileStatus(row.idx) : null
              return (
                <div
                  key={row.idx}
                  className="flex items-center gap-2 px-2 py-2 border border-pip-dim/35 rounded bg-panel-dark/80 text-xs"
                >
                  {ps && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${ps === 'draw' ? 'bg-pip' : 'bg-dim'}`}
                      title={ps === 'draw' ? 'In draw pile' : 'Discarded'}
                    />
                  )}
                  <span className={`text-pip font-bold flex-1 min-w-0 ${ps === 'discard' ? 'line-through opacity-60' : ''}`}>{row.name}</span>
                  <span className={`px-1.5 py-0.5 rounded border shrink-0 ${badge.className}`}>
                    {badge.label}/{row.faction}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {uiMode === 'build' && (
        <div className="space-y-3">
          {buildLocked && (
            <p className="text-amber text-xs border border-amber/30 rounded px-2 py-1.5 bg-amber/5">
              Deck is in play. Reset the deck to change the build, or use Browse to reference cards.
            </p>
          )}
          <div className="flex flex-wrap gap-2 items-center">
            <input
              type="text"
              value={filterText}
              onChange={e => setFilterText(e.target.value)}
              placeholder="Filter list…"
              className="flex-1 min-w-[8rem] text-xs py-1 px-2 rounded border border-pip-dim/40 bg-panel-dark"
            />
            <select
              value={factionFilter}
              onChange={e => setFactionFilter(e.target.value)}
              className="text-xs py-1 px-2 rounded border border-pip-dim/40 bg-panel-dark min-w-[7rem]"
            >
              <option value="">All tags</option>
              {factions.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          <p className="text-muted text-xs">
            Selected: {selectedInFilter} / {filteredRows.length} visible ({selectedIndices.size} / {total} total)
          </p>

          <div className="max-h-[min(40vh,22rem)] overflow-y-auto space-y-1 pr-0.5">
            {filteredRows.map(row => {
              const on = selectedIndices.has(row.idx)
              return (
                <div
                  key={row.idx}
                  className={`flex items-center gap-2 px-2 py-2 rounded border text-xs transition-colors ${
                    on ? 'border-l-4 border-l-pip border-pip/50 bg-pip-dim/15' : 'border-pip-dim/30 bg-panel-dark/50'
                  }`}
                >
                  <span className="text-pip font-bold flex-1 min-w-0">{row.name}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded border shrink-0 ${badge.className}`}>
                    {badge.label}/{row.faction}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleCard(row.idx)}
                    disabled={buildLocked}
                    className={`shrink-0 text-xs font-bold px-2 py-1 rounded border ${
                      on ? 'border-pip text-pip bg-pip/10' : 'border-muted/40 text-muted hover:border-pip hover:text-pip'
                    } disabled:opacity-40 disabled:pointer-events-none`}
                  >
                    {on ? '✓ IN DECK' : '+ ADD'}
                  </button>
                </div>
              )
            })}
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <label className="text-muted text-xs flex items-center gap-1">
              Random
              <select
                value={randomN}
                onChange={e => setRandomN(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="text-xs py-1 px-1 rounded border border-pip-dim/40 bg-panel-dark"
              >
                {RANDOM_OPTIONS.map(n => (
                  <option key={n} value={n}>{n === 'all' ? 'All' : n}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={randomPickFromFiltered}
              disabled={!filteredRows.length || buildLocked}
              className="text-xs border border-pip/50 text-pip rounded px-2 py-1 hover:bg-pip-dim/20 disabled:opacity-40"
            >
              Random pick
            </button>
            <button
              type="button"
              onClick={clearAllSelection}
              disabled={buildLocked}
              className="text-xs border border-muted/30 text-muted rounded px-2 py-1 hover:text-danger disabled:opacity-40"
            >
              Clear all
            </button>
          </div>

          <div className="flex flex-wrap gap-2 items-end border border-pip-dim/30 rounded p-2 bg-panel-dark/40">
            <div className="flex-1 min-w-[10rem]">
              <span className="text-muted text-xs block mb-0.5">Save as preset</span>
              <input
                type="text"
                value={presetName}
                onChange={e => setPresetName(e.target.value)}
                placeholder="Preset name"
                className="w-full text-xs py-1 px-2 rounded border border-pip-dim/40"
              />
            </div>
            <button
              type="button"
              onClick={savePreset}
              disabled={buildLocked || !presetName.trim() || selectedIndices.size === 0}
              className="text-xs border border-amber text-amber font-bold px-3 py-1.5 rounded hover:bg-amber/10 disabled:opacity-40"
            >
              SAVE
            </button>
            {presetNames.length > 0 && (
              <label className="text-xs text-muted flex items-center gap-1">
                Load
                <select
                  className="text-xs py-1 px-1 rounded border border-pip-dim/40 bg-panel-dark max-w-[10rem]"
                  value=""
                  disabled={buildLocked}
                  onChange={e => {
                    if (e.target.value) loadPreset(e.target.value)
                    e.target.value = ''
                  }}
                >
                  <option value="">—</option>
                  {presetNames.map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <button
            type="button"
            onClick={shuffleFromSelection}
            disabled={buildLocked || selectedIndices.size === 0}
            className="w-full text-xs py-2.5 border border-amber text-amber font-bold rounded-lg hover:bg-amber/10 shadow-[0_0_12px_var(--color-amber-glow)] disabled:opacity-40"
          >
            <Shuffle size={14} className="inline mr-1 align-text-bottom" />
            SHUFFLE & SAVE
          </button>

          <div className="flex gap-2 flex-wrap justify-center">
            <button
              type="button"
              onClick={handleShuffleAll}
              disabled={buildLocked}
              className="text-xs border border-pip-dim/40 text-muted px-3 py-1.5 rounded hover:border-pip hover:text-pip disabled:opacity-40"
            >
              Shuffle all {total} cards
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
