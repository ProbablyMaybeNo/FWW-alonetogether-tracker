import { useState, useMemo, useEffect, useCallback } from 'react'
import { Plus, Trash2, Dices } from 'lucide-react'
import { useCampaign } from '../../context/CampaignContext'
import { useAuth } from '../../context/AuthContext'
import unitsData from '../../data/units.json'
import Modal from '../layout/Modal'
import {
  defaultInhabitantsState,
  getPoolUnits,
  sampleRandomDeckCards,
  shuffleIndices,
  unitToInhabitantCard,
  rollFwRedDiceMinusOne,
} from '../../utils/inhabitantsState'

function getDeck(inn, deckId) {
  return inn.decks.find(d => d.id === deckId)
}

function InhabitantDrawOverlay({ card, onAdd, onDiscard }) {
  const [rollDetail, setRollDetail] = useState(null)

  useEffect(() => {
    const esc = (e) => {
      if (e.key === 'Escape') onDiscard()
    }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onDiscard])

  function handleUnitCount() {
    setRollDetail(rollFwRedDiceMinusOne())
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80"
      role="dialog"
      aria-modal="true"
      aria-labelledby="inhabitant-draw-title"
    >
      <div
        className="w-full max-w-md border border-amber/50 rounded-lg bg-panel shadow-lg overflow-hidden flex flex-col"
        style={{ boxShadow: '0 0 20px var(--color-amber-glow)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 border-b border-pip-dim/50 text-center">
          <div className="text-muted text-xs tracking-widest mb-2">DRAWN CARD</div>
          <h2 id="inhabitant-draw-title" className="text-pip text-xl font-bold tracking-wide break-words">
            {card.name}
          </h2>
          <p className="text-amber text-sm mt-2 tracking-wider">{card.faction}</p>
          {rollDetail && (
            <p className="text-muted text-xs mt-3 border border-pip-mid/30 rounded px-2 py-1.5 inline-block">
              <span className="text-pip font-bold">Models: {rollDetail.models}</span>
              <span className="text-muted/80 ml-2">(d12={rollDetail.d12} → red {rollDetail.red} − 1)</span>
            </p>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2 p-4 border-t border-pip-dim/40">
          <button
            type="button"
            onClick={() => onAdd(rollDetail?.models ?? null)}
            className="py-2.5 text-xs font-bold border border-pip text-pip rounded hover:bg-pip-dim/20 transition-colors"
          >
            ADD
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="py-2.5 text-xs font-bold border border-danger/50 text-danger rounded hover:bg-danger/10 transition-colors"
          >
            DISCARD
          </button>
          <button
            type="button"
            onClick={handleUnitCount}
            className="py-2.5 text-xs font-bold border border-amber text-amber rounded hover:bg-amber/10 transition-colors flex items-center justify-center gap-1"
          >
            <Dices size={14} /> UNIT COUNT
          </button>
        </div>
      </div>
    </div>
  )
}

export default function InhabitantsDeckSection({ round }) {
  const { state, saveInhabitantsState, isOnline, sharedState } = useCampaign()
  const { user } = useAuth()
  const isCreator = !!(user?.id && sharedState?.createdBy && user.id === sharedState.createdBy)

  const inn = useMemo(
    () => ({ ...defaultInhabitantsState(), ...state?.inhabitantsState }),
    [state?.inhabitantsState]
  )

  const pending = inn.pendingDraw
  const pendingDeck = pending ? getDeck(inn, pending.deckId) : null
  const pendingCard = pendingDeck && pending ? pendingDeck.cards[pending.cardIndex] : null

  const patchInn = useCallback(
    async (next) => {
      await saveInhabitantsState({ ...defaultInhabitantsState(), ...inn, ...next })
    },
    [inn, saveInhabitantsState]
  )

  // Keep session.round aligned with campaign round; clear stale items
  useEffect(() => {
    if (inn.session.round !== round) {
      patchInn({
        session: { round, items: [] },
        pendingDraw: null,
      })
    }
  }, [round, inn.session.round, patchInn])

  const factions = useMemo(() => {
    const s = new Set(unitsData.map(u => u.faction))
    return Array.from(s).sort()
  }, [])

  async function handleDraw(deckId) {
    if (inn.pendingDraw) return
    const deck = getDeck(inn, deckId)
    if (!deck || !deck.cards?.length) return

    let drawPile = [...(deck.drawPile ?? [])]
    let discardPile = [...(deck.discardPile ?? [])]

    if (drawPile.length === 0 && discardPile.length > 0) {
      drawPile = shuffleIndices(discardPile.length).map(i => discardPile[i])
      discardPile = []
    }
    if (drawPile.length === 0) return

    const cardIndex = drawPile[0]
    const newDrawPile = drawPile.slice(1)

    const decks = inn.decks.map(d =>
      d.id === deckId ? { ...d, drawPile: newDrawPile, discardPile } : d
    )

    await patchInn({ decks, pendingDraw: { deckId, cardIndex } })
  }

  async function finalizeDraw(deckId, cardIndex, { addToSession, modelCount }) {
    const deck = getDeck(inn, deckId)
    if (!deck) return

    const card = deck.cards[cardIndex]
    if (!card) return

    let session = { ...inn.session, round }
    if (addToSession) {
      session = {
        ...session,
        items: [
          ...session.items,
          {
            id: crypto.randomUUID(),
            deckId,
            name: card.name,
            faction: card.faction,
            modelCount: modelCount !== null && modelCount !== undefined ? modelCount : null,
          },
        ],
      }
    }

    const discardPile = [...(deck.discardPile ?? []), cardIndex]
    const decks = inn.decks.map(d =>
      d.id === deckId ? { ...d, discardPile } : d
    )

    await patchInn({ decks, session, pendingDraw: null })
  }

  return (
    <div className="border border-pip-mid/30 rounded-lg bg-panel p-4 space-y-4">
      <div className="border-b border-pip-mid/50 pb-2">
        <h2 className="text-pip text-sm tracking-widest font-bold">INHABITANT DECKS</h2>
        <p className="text-muted text-xs mt-1 italic">
          Shared decks (creator builds). Anyone can draw. Inhabitants list clears when a player or creator reports battle results for this round, or when the round number changes.
        </p>
      </div>

      {pendingCard && (
        <InhabitantDrawOverlay
          card={pendingCard}
          onAdd={(modelCount) => finalizeDraw(pending.deckId, pending.cardIndex, { addToSession: true, modelCount })}
          onDiscard={() => finalizeDraw(pending.deckId, pending.cardIndex, { addToSession: false, modelCount: null })}
        />
      )}

      {isCreator && (
        <CreatorDeckControls inn={inn} factions={factions} patchInn={patchInn} />
      )}

      {/* All players: deck list + draw */}
      <div className="space-y-3">
        {inn.decks.length === 0 && (
          <p className="text-muted text-xs">
            {isCreator ? 'Add a deck to get started.' : 'No inhabitant decks yet — waiting for campaign creator.'}
          </p>
        )}
        {inn.decks.map(deck => {
          const remaining = deck.drawPile?.length ?? 0
          const disc = deck.discardPile?.length ?? 0
          const total = deck.cards?.length ?? 0
          return (
            <div key={deck.id} className="border border-pip-dim/40 rounded p-3 space-y-2 bg-panel-light/30">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-pip font-bold text-sm">{deck.name}</span>
                <span className="text-muted text-xs">
                  {remaining}/{total} in deck · {disc} discarded
                </span>
              </div>
              <div className="text-muted text-xs max-h-24 overflow-y-auto space-y-0.5">
                {(deck.cards ?? []).map((c, idx) => (
                  <div key={idx}>
                    <span className="text-pip/90">{c.name}</span>
                    <span className="text-muted"> — {c.faction}</span>
                  </div>
                ))}
              </div>
              <button
                type="button"
                disabled={!!inn.pendingDraw || total === 0}
                onClick={() => handleDraw(deck.id)}
                className="text-xs border border-amber text-amber font-bold px-4 py-2 rounded hover:bg-amber/10 transition-colors disabled:opacity-40"
                style={!inn.pendingDraw && total > 0 ? { boxShadow: '0 0 6px var(--color-amber-glow)' } : {}}
              >
                DRAW CARD
              </button>
            </div>
          )
        })}
      </div>

      {/* Inhabitants this round */}
      <div className="border-t border-pip-dim/40 pt-4 space-y-2">
        <h3 className="text-pip text-xs tracking-widest font-bold">INHABITANTS THIS ROUND</h3>
        <p className="text-muted text-xs uppercase tracking-wider">Round {round}</p>
        {(inn.session.items ?? []).length === 0 ? (
          <p className="text-muted text-xs">No inhabitants added yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {inn.session.items.map(item => (
              <li
                key={item.id}
                className="flex flex-wrap items-baseline gap-2 border border-pip-dim/30 rounded px-2 py-1.5 text-xs"
              >
                <span className="text-pip font-bold">{item.name}</span>
                <span className="text-muted">{item.faction}</span>
                <span className="text-amber ml-auto">
                  {item.modelCount !== null && item.modelCount !== undefined
                    ? `${item.modelCount} model${item.modelCount === 1 ? '' : 's'}`
                    : '—'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {!isOnline && (
        <p className="text-muted text-xs">Solo mode: inhabitant data is stored in your local save.</p>
      )}
    </div>
  )
}

function CreatorDeckControls({ inn, factions, patchInn }) {
  const [showNew, setShowNew] = useState(false)
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setShowNew(true)}
        className="flex items-center gap-1 text-xs border border-pip text-pip rounded px-3 py-1.5 hover:bg-pip-dim/20"
      >
        <Plus size={14} /> NEW DECK
      </button>
      {showNew && (
        <DeckBuilderModal
          isOpen={showNew}
          onClose={() => setShowNew(false)}
          inn={inn}
          factions={factions}
          patchInn={patchInn}
          existingDeck={null}
        />
      )}
      {inn.decks.map(deck => (
        <div key={deck.id} className="flex flex-wrap gap-2 items-center">
          <DeckEditorInline deck={deck} inn={inn} factions={factions} patchInn={patchInn} />
        </div>
      ))}
    </div>
  )
}

function DeckEditorInline({ deck, inn, factions, patchInn }) {
  const [showEdit, setShowEdit] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setShowEdit(true)}
        className="text-xs border border-muted/40 text-muted rounded px-2 py-1 hover:text-pip hover:border-pip"
      >
        Edit / rebuild “{deck.name}”
      </button>
      <button
        type="button"
        onClick={async () => {
          if (!confirm(`Delete deck “${deck.name}”?`)) return
          const decks = inn.decks.filter(d => d.id !== deck.id)
          await patchInn({
            decks,
            pendingDraw: inn.pendingDraw?.deckId === deck.id ? null : inn.pendingDraw,
          })
        }}
        className="text-xs border border-danger/40 text-danger rounded px-2 py-1 hover:bg-danger/10"
      >
        <Trash2 size={12} className="inline mr-1" /> Delete
      </button>
      {showEdit && (
        <DeckBuilderModal
          isOpen={showEdit}
          onClose={() => setShowEdit(false)}
          inn={inn}
          factions={factions}
          patchInn={patchInn}
          existingDeck={deck}
        />
      )}
    </>
  )
}

function DeckBuilderModal({ isOpen, onClose, inn, factions, patchInn, existingDeck }) {
  const [name, setName] = useState('')
  const [deckSize, setDeckSize] = useState(5)
  const [poolMode, setPoolMode] = useState('all')
  const [faction, setFaction] = useState('')
  const [buildMode, setBuildMode] = useState('random')
  const [customIds, setCustomIds] = useState(() => new Set())
  const [search, setSearch] = useState('')
  const [manualSet, setManualSet] = useState(() => new Set())

  useEffect(() => {
    if (!isOpen) return
    setName(existingDeck?.name ?? `Deck ${(inn.decks?.length ?? 0) + 1}`)
    setDeckSize(existingDeck?.deckSize ?? 5)
    setPoolMode(existingDeck?.poolMode ?? 'all')
    setFaction(existingDeck?.faction ?? '')
    setBuildMode(existingDeck?.buildMode ?? 'random')
    setCustomIds(new Set(existingDeck?.customPoolUnitIds ?? []))
    setManualSet(new Set(existingDeck?.manualSelectedUnitIds ?? []))
    setSearch('')
  }, [isOpen, existingDeck, inn.decks?.length])

  const pool = useMemo(
    () => getPoolUnits(unitsData, { poolMode, faction: faction || null, customPoolUnitIds: [...customIds] }),
    [poolMode, faction, customIds]
  )

  const filteredBrowse = useMemo(() => {
    const q = search.toLowerCase()
    return unitsData.filter(u => {
      if (poolMode === 'faction' && faction && u.faction !== faction) return false
      if (!q) return true
      return u.name.toLowerCase().includes(q)
    }).slice(0, 80)
  }, [search, poolMode, faction])

  async function buildDeck() {
    const n = Math.max(1, Math.min(40, parseInt(String(deckSize), 10) || 1))
    if (poolMode === 'faction' && !faction) {
      alert('Select a faction.')
      return
    }
    if (poolMode === 'custom' && customIds.size === 0) {
      alert('Add at least one unit to the custom pool.')
      return
    }
    let cards
    if (buildMode === 'random') {
      const sampled = sampleRandomDeckCards(pool, n, { allowDuplicateGenerics: false })
      if (sampled === null) {
        alert(`Pool has only ${pool.length} unique units; reduce deck size or allow larger pool.`)
        return
      }
      cards = sampled
    } else {
      if (manualSet.size !== n) {
        alert(`Select exactly ${n} units (currently ${manualSet.size}).`)
        return
      }
      cards = [...manualSet]
        .map(id => unitsData.find(u => u.id === id))
        .filter(Boolean)
        .map(unitToInhabitantCard)
    }

    const drawPile = shuffleIndices(cards.length)
    const deckPayload = {
      id: existingDeck?.id ?? crypto.randomUUID(),
      name: name.trim() || 'Deck',
      deckSize: n,
      poolMode,
      faction: poolMode === 'faction' ? faction : null,
      customPoolUnitIds: poolMode === 'custom' ? [...customIds] : [],
      buildMode,
      manualSelectedUnitIds: buildMode === 'manual' ? [...manualSet] : [],
      cards,
      drawPile,
      discardPile: [],
    }

    const decks = existingDeck
      ? inn.decks.map(d => (d.id === existingDeck.id ? deckPayload : d))
      : [...inn.decks, deckPayload]

    await patchInn({ decks, pendingDraw: inn.pendingDraw })
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={existingDeck ? 'REBUILD INHABITANT DECK' : 'NEW INHABITANT DECK'} wide>
      <div className="space-y-3 text-xs">
        <div>
          <label className="text-muted block mb-1">NAME</label>
          <input value={name} onChange={e => setName(e.target.value)} className="w-full" />
        </div>
        <div>
          <label className="text-muted block mb-1">DECK SIZE (CARD COUNT)</label>
          <input
            type="number"
            min={1}
            max={40}
            value={deckSize}
            onChange={e => setDeckSize(parseInt(e.target.value, 10) || 1)}
            className="w-24"
          />
        </div>
        <div>
          <label className="text-muted block mb-1">POOL</label>
          <select value={poolMode} onChange={e => setPoolMode(e.target.value)} className="w-full mb-2">
            <option value="all">All units</option>
            <option value="faction">Faction</option>
            <option value="custom">Custom list</option>
          </select>
          {poolMode === 'faction' && (
            <select value={faction} onChange={e => setFaction(e.target.value)} className="w-full">
              <option value="">Select faction…</option>
              {factions.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          )}
          {poolMode === 'custom' && (
            <div className="border border-pip-dim/40 rounded p-2 max-h-40 overflow-y-auto space-y-1">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search units…"
                className="w-full mb-2"
              />
              {filteredBrowse.map(u => (
                <label key={u.id} className="flex items-center gap-2 cursor-pointer hover:bg-pip-dim/10 px-1">
                  <input
                    type="checkbox"
                    checked={customIds.has(u.id)}
                    onChange={() => {
                      setCustomIds(prev => {
                        const n = new Set(prev)
                        if (n.has(u.id)) n.delete(u.id)
                        else n.add(u.id)
                        return n
                      })
                    }}
                  />
                  <span>{u.name}</span>
                  <span className="text-muted">({u.faction})</span>
                </label>
              ))}
            </div>
          )}
        </div>
        <div>
          <label className="text-muted block mb-1">BUILD</label>
          <div className="flex gap-2">
            {['random', 'manual'].map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setBuildMode(m)}
                className={`px-3 py-1 border rounded capitalize ${
                  buildMode === m ? 'border-pip text-pip bg-pip-dim/20' : 'border-muted/30 text-muted'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        {buildMode === 'manual' && (
          <div className="border border-pip-dim/40 rounded p-2 max-h-48 overflow-y-auto">
            <p className="text-muted mb-2">Pick exactly {deckSize} units from pool ({manualSet.size}/{deckSize})</p>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full mb-2"
            />
            {pool.filter(u => !search || u.name.toLowerCase().includes(search.toLowerCase())).map(u => (
              <label key={u.id} className="flex items-center gap-2 cursor-pointer hover:bg-pip-dim/10 px-1">
                <input
                  type="checkbox"
                  checked={manualSet.has(u.id)}
                  onChange={() => {
                    setManualSet(prev => {
                      const n = new Set(prev)
                      if (n.has(u.id)) n.delete(u.id)
                      else {
                        if (n.size >= deckSize) {
                          alert(`Already at ${deckSize} units.`)
                          return prev
                        }
                        n.add(u.id)
                      }
                      return n
                    })
                  }}
                />
                <span>{u.name}</span>
                <span className="text-muted">({u.faction})</span>
              </label>
            ))}
          </div>
        )}
        <p className="text-muted text-xs">Pool size: {pool.length} units</p>
        <button
          type="button"
          onClick={buildDeck}
          className="w-full py-2 border border-amber text-amber font-bold rounded hover:bg-amber/10"
        >
          {existingDeck ? 'REBUILD DECK' : 'CREATE DECK'}
        </button>
      </div>
    </Modal>
  )
}
