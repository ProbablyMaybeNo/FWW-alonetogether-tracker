import { useState, useMemo } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import itemsData from '../../data/items.json'
import WastelandItemBattleDeck from './WastelandItemBattleDeck'

/**
 * Wasteland Items: Browse pool from items.json; Build mode explains auto-build.
 * Delegates draw/contributions to WastelandItemBattleDeck (unchanged).
 */
export default function ItemsDeckPanel({ battlePage, patchBattle, isOnline }) {
  const [uiMode, setUiMode] = useState('browse')
  const [filterText, setFilterText] = useState('')
  const [subTypeFilter, setSubTypeFilter] = useState('')
  const [expanded, setExpanded] = useState(() => new Set())

  const subTypes = useMemo(() => {
    const s = new Set(itemsData.map(i => i.subType).filter(Boolean))
    return [...s].sort()
  }, [])

  const filteredItems = useMemo(() => {
    const q = filterText.trim().toLowerCase()
    return itemsData.filter(item => {
      if (subTypeFilter && item.subType !== subTypeFilter) return false
      if (!q) return true
      const blob = [item.name, item.subType, item.type, String(item.caps ?? '')].join(' ').toLowerCase()
      return blob.includes(q)
    })
  }, [filterText, subTypeFilter])

  function toggleExpanded(id) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-3">
      <div className="border border-deck-item/40 rounded-lg bg-panel p-3 space-y-2">
        <div className="flex flex-wrap items-center gap-2 border-b border-deck-item/20 pb-2">
          <h3 className="text-deck-item text-xs font-bold tracking-widest flex-1">ITEMS (WASTELAND)</h3>
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

        {uiMode === 'browse' && (
          <>
            <div className="flex flex-wrap gap-2 items-center">
              <input
                type="text"
                value={filterText}
                onChange={e => setFilterText(e.target.value)}
                placeholder="Search items…"
                className="flex-1 min-w-[8rem] text-xs py-1 px-2 rounded border border-pip-dim/40 bg-panel-dark"
              />
              <select
                value={subTypeFilter}
                onChange={e => setSubTypeFilter(e.target.value)}
                className="text-xs py-1 px-2 rounded border border-pip-dim/40 bg-panel-dark min-w-[8rem]"
              >
                <option value="">All sub-types</option>
                {subTypes.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <p className="text-muted text-xs">{filteredItems.length} items match</p>
            <div className="max-h-[min(52vh,28rem)] overflow-y-auto space-y-1 pr-0.5">
              {filteredItems.map(item => {
                const isOpen = expanded.has(item.id)
                return (
                  <div key={item.id} className="border border-pip-dim/35 rounded bg-panel-dark/80 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleExpanded(item.id)}
                      className="w-full flex items-center gap-2 px-2 py-2 text-left"
                    >
                      <span className="text-pip text-xs font-bold flex-1 min-w-0">{item.name}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded border bg-amber-dim/20 text-amber border-amber/35 shrink-0">
                        {item.subType}
                      </span>
                      {isOpen ? <ChevronUp size={14} className="text-muted shrink-0" /> : <ChevronDown size={14} className="text-muted shrink-0" />}
                    </button>
                    {isOpen && (
                      <div className="px-2 pb-2 pt-0 border-t border-pip-dim/25 text-xs text-pip/90 space-y-1">
                        <p><span className="text-muted">Type:</span> {item.type}</p>
                        <p><span className="text-muted">Caps:</span> {item.caps}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}

        {uiMode === 'build' && (
          <div className="border border-pip-dim/30 rounded bg-panel-dark/50 p-4 space-y-3 text-xs text-pip/90">
            <p className="leading-relaxed">
              The Wasteland Items Deck is built automatically during battle setup.
              Each player contributes cards from their Settlement Item Deck.
              Browse the full item pool above to see what could appear.
            </p>
            <p className="text-muted border-t border-pip-dim/25 pt-2">
              Live draw and discard piles during battle will be surfaced here (in development).
            </p>
          </div>
        )}
      </div>

      <WastelandItemBattleDeck battlePage={battlePage} patchBattle={patchBattle} isOnline={isOnline} />
    </div>
  )
}
