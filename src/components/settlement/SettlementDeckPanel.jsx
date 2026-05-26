import { useState } from 'react'
import { Shuffle, Sparkles, Plus, X } from 'lucide-react'
import { useCampaign } from '../../context/CampaignContext'
import itemsData from '../../data/items.json'
import boostsData from '../../data/boosts.json'

// Persistent Settlement Item Deck + Boost Deck panel. Manual draw / reshuffle /
// reset, plus a "RECENTLY DRAWN" tray that lets you push items into the
// settlement pool. Pool/locker/store management lives in the dedicated
// ItemPoolPanel — this component is decks-only.

const SETTLEMENT_DECK_TYPES = ['Pistol', 'Rifle', 'Heavy Weapon', 'Melee', 'Grenade', 'Mine', 'Armor', 'Clothing', 'Food', 'Drink', 'Chem', 'Utility', 'Mod']

const DECK_FILTER_OPTIONS = [
  { id: 'any',        label: 'ANY',        types: [...SETTLEMENT_DECK_TYPES, 'Boost'] },
  { id: 'weapon',     label: 'WEAPON',     types: ['Pistol', 'Rifle', 'Heavy Weapon', 'Melee', 'Grenade', 'Mine'] },
  { id: 'armor',      label: 'ARMOR',      types: ['Armor', 'Clothing'] },
  { id: 'consumable', label: 'CONSUMABLE', types: ['Food', 'Drink', 'Chem'] },
  { id: 'mod',        label: 'MOD',        types: ['Mod'] },
  { id: 'utility',    label: 'UTILITY',    types: ['Utility'] },
  { id: 'boost',      label: 'BOOST',      types: ['Boost'] },
]

const BOOST_TYPE_STYLE = {
  tactical:    { color: '#fbbf24', label: 'TACTICAL' },
  instinctive: { color: '#00b65a', label: 'INSTINCTIVE' },
  cunning:     { color: '#00a0ff', label: 'CUNNING' },
  practiced:   { color: '#a855f7', label: 'PRACTICED' },
}

const DECK_SUBTYPE_COLOR = {
  Pistol: 'text-amber', Rifle: 'text-amber', 'Heavy Weapon': 'text-amber', Melee: 'text-amber',
  Grenade: 'text-danger', Mine: 'text-danger',
  Armor: 'text-info', Clothing: 'text-info',
  Food: 'text-pip', Drink: 'text-pip', Chem: 'text-pip',
  Mod: 'text-amber', Utility: 'text-muted',
}

function buildBoostDeckIds() { return boostsData.map(b => b.id) }

// Drops Perk / Leader / Automatron Part — items normal rosters can't equip.
const EQUIPPABLE_SUBTYPES = new Set([
  'Melee', 'Mod', 'Armor', 'Rifle', 'Pistol', 'Clothing', 'Utility',
  'Food', 'Chem', 'Grenade', 'Heavy Weapon', 'Drink', 'Mine',
])
function buildFullDeckIds() { return itemsData.filter(i => EQUIPPABLE_SUBTYPES.has(i.subType)).map(i => i.id) }

export default function SettlementDeckPanel() {
  const { state, setState } = useCampaign()
  const [deckFilter, setDeckFilter] = useState('any')
  const [recentlyDrawn, setRecentlyDrawn] = useState([])
  const [pooledSet, setPooledSet] = useState(new Set())

  const allIds = buildFullDeckIds()
  const deck = state?.settlementDeck ?? []
  const discard = state?.settlementDiscard ?? []
  const total = allIds.length
  const deckCount = (deck.length === 0 && discard.length === 0) ? total : deck.length
  const discardCount = discard.length

  // Boost deck
  const boostDeck = state?.boostDeck ?? []
  const boostDiscard = state?.boostDiscard ?? []
  const allBoostIds = buildBoostDeckIds()
  const boostDeckCount = (boostDeck.length === 0 && boostDiscard.length === 0) ? allBoostIds.length : boostDeck.length
  const boostDiscardCount = boostDiscard.length
  const [showBoostBrowse, setShowBoostBrowse] = useState(false)
  const [boostBrowseSearch, setBoostBrowseSearch] = useState('')
  const [boostBrowseType, setBoostBrowseType] = useState('all')

  function getInitializedDeck() {
    if (deck.length === 0 && discard.length === 0) {
      return { deck: [...buildFullDeckIds()].sort(() => Math.random() - 0.5), discard: [] }
    }
    return { deck, discard }
  }

  function drawManualFromDeck() {
    const filterTypes = DECK_FILTER_OPTIONS.find(f => f.id === deckFilter)?.types || SETTLEMENT_DECK_TYPES
    let { deck: d, discard: dc } = getInitializedDeck()
    d = [...d]; dc = [...dc]
    if (d.length === 0 && dc.length === 0) return null

    let foundItem = null
    let attempts = 0
    const maxAttempts = allIds.length + 10
    while (attempts < maxAttempts) {
      if (d.length === 0) {
        if (dc.length === 0) break
        d = [...dc].sort(() => Math.random() - 0.5)
        dc = []
      }
      const id = d.shift()
      const item = itemsData.find(i => i.id === id)
      if (!item) { attempts++; continue }
      dc.push(id)
      if (filterTypes.includes(item.subType)) { foundItem = item; break }
      attempts++
    }

    setState(prev => ({ ...prev, settlementDeck: d, settlementDiscard: dc }))
    if (foundItem) {
      setRecentlyDrawn(prev => [{ ...foundItem, drawnAt: Date.now() }, ...prev.slice(0, 19)])
    }
    return foundItem
  }

  function reshuffleDeck() {
    const dc = state?.settlementDiscard ?? []
    setState(prev => ({
      ...prev,
      settlementDeck: [...dc].sort(() => Math.random() - 0.5),
      settlementDiscard: [],
    }))
  }

  function fullResetDeck() {
    if (!confirm('Reset Settlement Item Deck? This shuffles all cards back in.')) return
    setState(prev => ({
      ...prev,
      settlementDeck: [...buildFullDeckIds()].sort(() => Math.random() - 0.5),
      settlementDiscard: [],
    }))
    setRecentlyDrawn([])
  }

  function addRecentlyDrawnToPool(item) {
    setState(prev => ({
      ...prev,
      itemPool: {
        ...prev.itemPool,
        items: [
          ...(prev.itemPool?.items || []),
          {
            id: Date.now() + Math.random(),
            catalogId: item.id,
            name: item.name,
            caps: item.caps,
            subType: item.subType,
            isBoost: false,
            location: 'stored',
            assignedUnit: null,
          },
        ],
      },
    }))
  }

  function handleAddToPool(item, drawnAt) {
    addRecentlyDrawnToPool(item)
    setPooledSet(prev => new Set([...prev, drawnAt]))
  }

  function handleDrawRandomBoost() {
    let bdeck = [...boostDeck]
    let bdiscard = [...boostDiscard]
    if (bdeck.length === 0 && bdiscard.length === 0) {
      bdeck = [...allBoostIds].sort(() => Math.random() - 0.5)
    }
    if (bdeck.length === 0 && bdiscard.length > 0) {
      bdeck = [...bdiscard].sort(() => Math.random() - 0.5)
      bdiscard = []
    }
    if (bdeck.length === 0) return
    const boostId = bdeck.shift()
    bdiscard.push(boostId)
    const boost = boostsData.find(b => b.id === boostId)
    if (!boost) { setState(prev => ({ ...prev, boostDeck: bdeck, boostDiscard: bdiscard })); return }
    setState(prev => ({
      ...prev,
      boostDeck: bdeck,
      boostDiscard: bdiscard,
      itemPool: {
        ...prev.itemPool,
        items: [...(prev.itemPool?.items ?? []), {
          id: Date.now() + Math.random(),
          boostId: boost.id,
          name: boost.name,
          caps: 0,
          subType: 'Boost',
          isBoost: true,
          boostType: boost.boostType,
          location: 'recovery',
          assignedUnit: null,
        }],
      },
    }))
  }

  function handleAddBoostToRecovery(boost) {
    setState(prev => ({
      ...prev,
      itemPool: {
        ...prev.itemPool,
        items: [...(prev.itemPool?.items ?? []), {
          id: Date.now() + Math.random(),
          boostId: boost.id,
          name: boost.name,
          caps: 0,
          subType: 'Boost',
          isBoost: true,
          boostType: boost.boostType,
          location: 'recovery',
          assignedUnit: null,
        }],
      },
    }))
  }

  return (
    <div className="space-y-4">
      <div className="border-2 border-white/20 rounded-xl p-3 space-y-3">
        <h3 className="text-title text-xs font-bold tracking-widest border-b border-white/20 pb-1">DECKS</h3>

        <div className="border border-deck-item/50 rounded-lg bg-deck-item-dim/20 p-3 space-y-3">
          <div className="flex items-center gap-3 border-b border-deck-item/20 pb-2 flex-wrap gap-y-2">
            <h2 className="text-deck-item text-sm tracking-widest font-bold flex-1">ITEM DECK</h2>
            <span className="text-muted text-xs">{deckCount}/{total} remaining · {discardCount} in discard</span>
            {deck.length === 0 && discard.length > 0 && (
              <button onClick={reshuffleDeck} className="flex items-center gap-1 text-xs text-amber border border-amber/50 rounded px-2 py-1 hover:bg-amber/10 transition-colors font-bold">
                <Shuffle size={11} /> RESHUFFLE DISCARD
              </button>
            )}
            {(deck.length > 0 || discard.length > 0) && (
              <button onClick={reshuffleDeck} className="flex items-center gap-1 text-xs text-muted hover:text-amber border border-muted/30 hover:border-amber/60 rounded px-2 py-1 transition-colors">
                <Shuffle size={11} /> RESHUFFLE
              </button>
            )}
            <button onClick={fullResetDeck} className="text-xs text-muted hover:text-danger border border-muted/30 hover:border-danger/60 rounded px-2 py-1 transition-colors">FULL RESET</button>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="border border-pip-mid/50 rounded bg-panel p-3">
              <div className="text-pip font-bold text-lg">{deckCount}</div>
              <div className="text-muted text-xs">IN DECK</div>
            </div>
            <div className="border border-pip-mid/50 rounded bg-panel p-3">
              <div className="text-pip font-bold text-lg">{discardCount}</div>
              <div className="text-muted text-xs">DISCARDED</div>
            </div>
            <div className="border border-pip-mid/50 rounded bg-panel p-3">
              <div className="text-muted font-bold text-lg">{total}</div>
              <div className="text-muted text-xs">TOTAL</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {DECK_FILTER_OPTIONS.map(f => (
              <button
                key={f.id}
                onClick={() => setDeckFilter(f.id)}
                className={`text-xs px-2.5 py-1 border rounded transition-colors ${
                  deckFilter === f.id ? 'border-pip text-pip bg-pip-dim/20 font-bold' : 'border-muted/30 text-muted hover:text-pip hover:border-pip'
                }`}
              >{f.label}</button>
            ))}
            <button
              onClick={drawManualFromDeck}
              disabled={deckCount === 0 && discardCount === 0}
              className="ml-auto text-xs border border-amber text-amber font-bold hover:bg-amber-dim/30 rounded px-4 py-1 transition-colors disabled:opacity-40"
              style={{ boxShadow: '0 0 6px var(--color-amber-glow)' }}
            >DRAW CARD</button>
          </div>

          <p className="text-muted text-xs italic">
            Draws sequentially through the deck. All drawn cards go to discard — even items added to your Settlement Pool.
            When the deck runs empty the discard pile reshuffles into a new deck.
          </p>

          {recentlyDrawn.length > 0 && (
            <div>
              <div className="text-muted text-xs tracking-wider mb-2">RECENTLY DRAWN</div>
              <div className="space-y-1.5">
                {recentlyDrawn.map((item, i) => {
                  const added = pooledSet.has(item.drawnAt)
                  return (
                    <div key={item.drawnAt} className={`flex items-center gap-3 border rounded px-3 py-2 ${added ? 'border-pip-dim/30 opacity-60' : 'border-pip-mid/40 bg-panel-light'}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-pip text-xs font-bold">{item.name}</span>
                          <span className={`text-xs px-1.5 py-0.5 border border-current/30 rounded ${DECK_SUBTYPE_COLOR[item.subType] || 'text-muted'}`}>{item.subType}</span>
                          {item.caps != null && <span className="text-muted text-xs">{item.caps}c</span>}
                          {added && <span className="text-pip text-xs">✓ ADDED TO POOL</span>}
                        </div>
                      </div>
                      {!added && (
                        <button onClick={() => handleAddToPool(item, item.drawnAt)} className="text-xs border border-pip text-pip hover:bg-pip-dim rounded px-2 py-1 transition-colors font-bold shrink-0">
                          ADD TO POOL
                        </button>
                      )}
                      <button onClick={() => setRecentlyDrawn(prev => prev.filter((_, j) => j !== i))} className="text-xs border border-muted/30 text-muted hover:text-pip rounded px-2 py-1 transition-colors shrink-0">
                        DISCARD
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {deckCount === 0 && discardCount === 0 && recentlyDrawn.length === 0 && (
            <p className="text-center py-8 text-muted text-xs border border-dashed border-muted/30 rounded">
              No deck initialized — draw a card or use a structure to start.
            </p>
          )}
        </div>

        {/* BOOST DECK */}
        <div className="border rounded bg-deck-boost-dim/20" style={{ borderColor: 'rgba(29,233,182,0.5)', boxShadow: '0 0 10px rgba(29,233,182,0.12)' }}>
          <div className="flex items-center gap-3 px-4 py-3 border-b flex-wrap gap-y-1" style={{ borderColor: 'rgba(29,233,182,0.25)' }}>
            <Sparkles size={13} className="text-deck-boost" />
            <h3 className="text-deck-boost text-sm font-bold tracking-wider flex-1">BOOST DECK</h3>
            <span className="text-muted text-xs">{boostDeckCount}/{allBoostIds.length} remaining · {boostDiscardCount} discarded</span>
            {boostDeck.length === 0 && boostDiscard.length > 0 && (
              <button
                onClick={() => setState(prev => ({ ...prev, boostDeck: [...(prev.boostDiscard ?? [])].sort(() => Math.random() - 0.5), boostDiscard: [] }))}
                className="flex items-center gap-1 text-xs border rounded px-2 py-1 hover:opacity-80 transition-colors font-bold text-deck-boost border-deck-boost/60"
              ><Shuffle size={11} /> RESHUFFLE</button>
            )}
            {(boostDeck.length > 0 || boostDiscard.length > 0) && (
              <button
                onClick={() => { if (!confirm('Reset Boost Deck? This reshuffles all boost cards back in.')) return; setState(prev => ({ ...prev, boostDeck: [...buildBoostDeckIds()].sort(() => Math.random() - 0.5), boostDiscard: [] })) }}
                className="text-xs border rounded px-2 py-1 transition-colors text-muted hover:text-danger border-muted/30 hover:border-danger/50"
              >RESET</button>
            )}
          </div>
          <div className="p-4 space-y-3">
            <p className="text-muted text-xs italic">Draw boost cards during settlement phase. Boosts go to your Recovery Pool — manage them from the ITEM POOL tab.</p>

            <div className="flex gap-2 flex-wrap">
              <button onClick={handleDrawRandomBoost} className="flex items-center gap-1.5 text-xs border font-bold rounded px-4 py-1.5 hover:opacity-80 transition-colors text-deck-boost border-deck-boost/70" style={{ boxShadow: '0 0 6px rgba(29,233,182,0.25)' }}>
                <Sparkles size={11} /> DRAW RANDOM BOOST
              </button>
              <button onClick={() => { setShowBoostBrowse(v => !v); setBoostBrowseSearch('') }} className="flex items-center gap-1.5 text-xs border rounded px-3 py-1.5 transition-colors text-muted hover:text-pip hover:border-pip border-muted/40">
                <Plus size={11} /> ADD MANUALLY
              </button>
            </div>

            {showBoostBrowse && (
              <div className="border rounded p-3 space-y-2 bg-panel-alt border-deck-boost/30">
                <div className="flex items-center justify-between">
                  <span className="text-deck-boost text-xs tracking-wider">BROWSE BOOSTS</span>
                  <button onClick={() => setShowBoostBrowse(false)} className="text-muted hover:text-danger"><X size={13} /></button>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <input type="text" value={boostBrowseSearch} onChange={e => setBoostBrowseSearch(e.target.value)} placeholder="Search boost name..." className="flex-1 text-xs py-1 px-2 min-w-0" autoFocus />
                  <select value={boostBrowseType} onChange={e => setBoostBrowseType(e.target.value)} className="text-xs py-1 px-1">
                    <option value="all">All Types</option>
                    <option value="tactical">Tactical</option>
                    <option value="instinctive">Instinctive</option>
                    <option value="cunning">Cunning</option>
                    <option value="practiced">Practiced</option>
                  </select>
                </div>
                <div className="max-h-56 overflow-y-auto space-y-1">
                  {boostsData
                    .filter(b => (boostBrowseType === 'all' || b.boostType === boostBrowseType) && (!boostBrowseSearch.trim() || b.name.toLowerCase().includes(boostBrowseSearch.toLowerCase())))
                    .map(b => {
                      const s = BOOST_TYPE_STYLE[b.boostType] || {}
                      return (
                        <div key={b.id} onClick={() => { handleAddBoostToRecovery(b); setShowBoostBrowse(false) }} className="flex items-start gap-2 border rounded px-3 py-2 cursor-pointer hover:opacity-80 transition-colors" style={{ borderColor: `${s.color}40` }}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold" style={{ color: s.color }}>{b.name}</span>
                              <span className="text-xs px-1 rounded border" style={{ color: s.color, borderColor: `${s.color}50` }}>{s.label}</span>
                            </div>
                            <p className="text-muted text-xs mt-0.5 leading-relaxed">{b.effect}</p>
                          </div>
                          <Plus size={12} className="text-muted shrink-0 mt-0.5" />
                        </div>
                      )
                    })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
