import { ChevronDown, ChevronUp } from 'lucide-react'

/**
 * Full-catalog Settlement Item Deck (items.json) — name/subType only, terminal styling.
 */
export default function SettlementItemDeckPanel({
  drawCount,
  discardCount,
  catalogTotal,
  drawCard,
  lastDrawn,
  exhaustAlert,
  initNotice,
  discardOpen,
  setDiscardOpen,
  discardSearch,
  setDiscardSearch,
  filteredDiscard,
  restoreCard,
}) {
  return (
    <div className="border border-pip-dim/40 rounded-lg bg-panel p-3 space-y-3">
      <div className="flex flex-wrap items-center gap-2 border-b border-pip-dim/30 pb-2">
        <h3 className="text-pip text-xs font-bold tracking-widest flex-1">SETTLEMENT ITEM DECK</h3>
        <span className="text-muted text-xs">
          Draw Pile: <span className="text-pip font-bold">{drawCount}</span> cards
          <span className="mx-1.5 text-pip-dim">|</span>
          Discarded: <span className="text-pip font-bold">{discardCount}</span>
        </span>
      </div>

      {initNotice && (
        <div className="text-pip text-xs border border-pip/30 rounded px-2 py-1.5 bg-pip-dim/10">
          {initNotice}
        </div>
      )}

      {exhaustAlert && (
        <div
          className="text-amber text-xs border border-amber/50 rounded px-2 py-1.5 bg-amber/5"
          style={{ boxShadow: '0 0 6px var(--color-amber-glow)' }}
        >
          {exhaustAlert}
        </div>
      )}

      <div>
        <button
          type="button"
          onClick={drawCard}
          disabled={drawCount === 0 && discardCount === 0}
          className="text-xs border border-amber text-amber font-bold px-4 py-2 rounded hover:bg-amber/10 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ boxShadow: '0 0 6px var(--color-amber-glow)' }}
        >
          DRAW CARD
        </button>
      </div>

      {lastDrawn && (
        <p className="text-pip text-xs">
          Last drawn:{' '}
          <span className="font-bold">{lastDrawn.name}</span>
          <span className="text-muted"> ({lastDrawn.subType})</span>
        </p>
      )}

      <div>
        <button
          type="button"
          onClick={() => setDiscardOpen(v => !v)}
          className="flex items-center gap-1.5 text-xs text-muted border border-muted/30 rounded px-2 py-1.5 hover:text-pip hover:border-pip w-full justify-between"
        >
          <span className="flex items-center gap-1">
            {discardOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            DISCARDED CARDS ({discardCount})
          </span>
        </button>

        {discardOpen && (
          <div className="mt-2 border border-pip-dim/30 rounded bg-panel-dark p-2 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-muted text-xs shrink-0">Search:</span>
              <input
                type="text"
                value={discardSearch}
                onChange={e => setDiscardSearch(e.target.value)}
                placeholder="Filter by name…"
                className="flex-1 text-xs py-1 px-2 rounded border border-pip-dim/40 bg-panel min-w-0"
              />
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {filteredDiscard.length === 0 ? (
                <p className="text-muted text-xs px-1">No matching cards.</p>
              ) : (
                filteredDiscard.map((entry, i) => (
                  <div
                    key={`${entry.id}-${i}`}
                    className="flex items-center gap-2 px-2 py-1 rounded text-xs border border-pip-dim/20"
                  >
                    <span className="text-pip flex-1 min-w-0 truncate">
                      • {entry.name}{' '}
                      <span className="text-muted">({entry.subType})</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => restoreCard(entry.id)}
                      className="shrink-0 text-xs border border-pip/40 text-pip rounded px-2 py-0.5 hover:bg-pip-dim/20 font-bold"
                    >
                      RESTORE
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <p className="text-muted text-[10px] leading-relaxed">
        Full catalog ({catalogTotal} cards). Draw permanently discards. When the draw pile empties, discards reshuffle automatically.
      </p>
    </div>
  )
}
