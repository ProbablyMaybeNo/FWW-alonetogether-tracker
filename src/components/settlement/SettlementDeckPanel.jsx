import { useState } from 'react'
import { Shuffle, Sparkles, Plus, X } from 'lucide-react'
import { useCampaign } from '../../context/CampaignContext'
import { getStructureRef } from '../../utils/calculations'
import itemsData from '../../data/items.json'
import boostsData from '../../data/boosts.json'

// Settlement Item Deck panel — persistent item + boost decks, manual draw,
// reshuffle, full reset, plus RECOVERY POOL and SETTLEMENT POOL renderers.
// Self-contained: owns its own state (deckFilter, recentlyDrawn), uses
// useCampaign for global state. Used by SETTLEMENT (and the HOMESTEAD slide-out).

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
  tactical:    { color: '#fbbf24', shadow: 'rgba(251,191,36,0.55)', label: 'TACTICAL' },
  instinctive: { color: '#00b65a', shadow: 'rgba(0,182,90,0.55)',   label: 'INSTINCTIVE' },
  cunning:     { color: '#00a0ff', shadow: 'rgba(0,160,255,0.55)',  label: 'CUNNING' },
  practiced:   { color: '#a855f7', shadow: 'rgba(168,85,247,0.55)', label: 'PRACTICED' },
}

const DECK_SUBTYPE_COLOR = {
  Pistol: 'text-amber', Rifle: 'text-amber', 'Heavy Weapon': 'text-amber', Melee: 'text-amber',
  Grenade: 'text-danger', Mine: 'text-danger',
  Armor: 'text-info', Clothing: 'text-info',
  Food: 'text-pip', Drink: 'text-pip', Chem: 'text-pip',
  Mod: 'text-amber', Utility: 'text-muted',
}

function buildBoostDeckIds() { return boostsData.map(b => b.id) }
function buildFullDeckIds() { return itemsData.map(i => i.id) }

export default function SettlementDeckPanel({ structures }) {
  const { state, setState } = useCampaign()
  const [deckFilter, setDeckFilter] = useState('any')
  const [recentlyDrawn, setRecentlyDrawn] = useState([])

  const allIds = buildFullDeckIds()
  const deck = state?.settlementDeck ?? []
  const discard = state?.settlementDiscard ?? []
  const total = allIds.length
  const deckCount = (deck.length === 0 && discard.length === 0) ? total : deck.length
  const discardCount = discard.length
  const [pooledSet, setPooledSet] = useState(new Set())
  const [recoveryFilter, setRecoveryFilter] = useState('any')
  const [settlementFilter, setSettlementFilter] = useState('any')
  const [showAddRecovery, setShowAddRecovery] = useState(false)
  const [addRecoverySearch, setAddRecoverySearch] = useState('')
  const [addRecoveryResults, setAddRecoveryResults] = useState([])

  // Boost deck state
  const boostDeck = state?.boostDeck ?? []
  const boostDiscard = state?.boostDiscard ?? []
  const allBoostIds = buildBoostDeckIds()
  const boostDeckCount = (boostDeck.length === 0 && boostDiscard.length === 0) ? allBoostIds.length : boostDeck.length
  const boostDiscardCount = boostDiscard.length
  const [showBoostBrowse, setShowBoostBrowse] = useState(false)
  const [boostBrowseSearch, setBoostBrowseSearch] = useState('')
  const [boostBrowseType, setBoostBrowseType] = useState('all')

  const items = state?.itemPool?.items ?? []
  const roster = state?.roster ?? []

  const shedCount = (structures || []).filter(s => getStructureRef(s.structureId)?.name === 'Maintenance Shed').length
  const lockerCount = (structures || []).filter(s => getStructureRef(s.structureId)?.name === 'Lockers').length
  const storesCount = (structures || []).filter(s => getStructureRef(s.structureId)?.name === 'Stores').length

  const recoveryItems = items.filter(i => i.location === 'recovery' || i.location === 'Temp Pool')
  const storedItems = items.filter(i => i.location === 'stored' || i.location === 'Maint. Shed')
  const lockerItems = items.filter(i => i.location === 'locker' || i.location === 'Locker')
  const storesItems = items.filter(i => i.location === 'stores' || i.location === 'Stores')

  const recoveryFilterTypes = DECK_FILTER_OPTIONS.find(f => f.id === recoveryFilter)?.types ?? [...SETTLEMENT_DECK_TYPES, 'Boost']
  const settlementFilterTypes = DECK_FILTER_OPTIONS.find(f => f.id === settlementFilter)?.types ?? [...SETTLEMENT_DECK_TYPES, 'Boost']

  const filteredRecovery = recoveryItems.filter(i => recoveryFilterTypes.includes(i.subType))
  const filteredStored = storedItems.filter(i => settlementFilterTypes.includes(i.subType))

  // ── Deck helpers ──
  function getInitializedDeck() {
    if (deck.length === 0 && discard.length === 0) {
      return { deck: [...buildFullDeckIds()].sort(() => Math.random() - 0.5), discard: [] }
    }
    return { deck, discard }
  }

  function drawManualFromDeck() {
    const filterTypes = DECK_FILTER_OPTIONS.find(f => f.id === deckFilter)?.types || SETTLEMENT_DECK_TYPES
    let { deck: d, discard: dc } = getInitializedDeck()
    d = [...d]
    dc = [...dc]

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
      if (filterTypes.includes(item.subType)) {
        foundItem = item
        break
      }
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

  // ── Boost deck functions ──
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

  function handleMoveBoostToHand(item) {
    setState(prev => ({
      ...prev,
      itemPool: { ...prev.itemPool, items: prev.itemPool.items.filter(i => i.id !== item.id) },
      boostHand: [...(prev.boostHand ?? []), {
        instanceId: item.id,
        boostId: item.boostId,
        name: item.name,
        boostType: item.boostType,
        usedThisRound: false,
      }],
    }))
  }

  function handleMoveBoostToStores(item) {
    updateItem(item.id, { location: 'stores', assignedUnit: null })
  }

  function handleDiscardBoostItem(item) {
    setState(prev => ({
      ...prev,
      itemPool: { ...prev.itemPool, items: prev.itemPool.items.filter(i => i.id !== item.id) },
    }))
  }

  function updateItem(id, changes) {
    setState(prev => ({
      ...prev,
      itemPool: {
        ...prev.itemPool,
        items: prev.itemPool.items.map(i => i.id === id ? { ...i, ...changes } : i),
      },
    }))
  }

  function removeItemAndAddCaps(item) {
    setState(prev => ({
      ...prev,
      caps: (prev.caps ?? 0) + (item.caps ?? 0),
      itemPool: {
        ...prev.itemPool,
        items: prev.itemPool.items.filter(i => i.id !== item.id),
      },
    }))
  }

  function handleSellAllRecovery() {
    const total = recoveryItems.reduce((s, i) => s + (i.caps ?? 0), 0)
    if (!confirm(`Sell all ${recoveryItems.length} recovery items for ${total}c?`)) return
    setState(prev => ({
      ...prev,
      caps: (prev.caps ?? 0) + total,
      itemPool: {
        ...prev.itemPool,
        items: prev.itemPool.items.filter(i => i.location !== 'recovery' && i.location !== 'Temp Pool'),
      },
    }))
  }

  function handleMoveToSettlement(item) {
    const nonBoostStored = storedItems.filter(i => !i.isBoost).length
    if (!item.isBoost && shedCount > 0 && nonBoostStored >= shedCount) {
      alert(`Maintenance Shed full (${shedCount} slot${shedCount !== 1 ? 's' : ''})`)
      return
    }
    updateItem(item.id, { location: 'stored' })
  }

  function handleMoveToLocker(item) {
    if (lockerCount > 0 && lockerItems.length >= lockerCount) {
      alert(`Lockers full (${lockerCount} slot${lockerCount !== 1 ? 's' : ''})`)
      return
    }
    updateItem(item.id, { location: 'locker' })
  }

  function handleEquipItem(item, unitSlotId) {
    if (storesCount > 0 && storesItems.length >= storesCount) {
      alert(`Stores full (${storesCount} slot${storesCount !== 1 ? 's' : ''})`)
      return
    }
    updateItem(item.id, { location: 'stores', assignedUnit: parseInt(unitSlotId) })
  }

  function handleAddToRecovery(item) {
    setState(prev => ({
      ...prev,
      itemPool: {
        ...prev.itemPool,
        items: [
          ...(prev.itemPool?.items ?? []),
          {
            id: Date.now() + Math.random(),
            catalogId: item.id,
            name: item.name,
            caps: item.caps,
            subType: item.subType,
            isBoost: false,
            location: 'recovery',
            assignedUnit: null,
          },
        ],
      },
    }))
  }

  function handleAddRecoverySearchChange(val) {
    setAddRecoverySearch(val)
    if (!val.trim()) { setAddRecoveryResults([]); return }
    const q = val.toLowerCase()
    setAddRecoveryResults(itemsData.filter(i => i.name.toLowerCase().includes(q)).slice(0, 20))
  }

  function handleAddToPool(item, drawnAt) {
    addRecentlyDrawnToPool(item)
    setPooledSet(prev => new Set([...prev, drawnAt]))
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
            <p className="text-muted text-xs italic">Draw boost cards during settlement phase. Boosts go to your Recovery Pool — move to hand before battle or to Stores to keep them. Unused boosts are discarded at round end.</p>

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

      <div className="border-2 border-white/20 rounded-xl p-3 space-y-3 mt-4">
        <h3 className="text-title text-xs font-bold tracking-widest border-b border-white/20 pb-1">POOLS</h3>

        {/* RECOVERY POOL */}
        <div className="border rounded bg-panel mt-2" style={{ borderColor: 'rgba(255,145,0,0.55)', boxShadow: '0 0 10px rgba(255,145,0,0.15)' }}>
          <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'rgba(255,145,0,0.3)' }}>
            <h3 className="text-pool-recovery text-sm font-bold tracking-wider flex-1">RECOVERY POOL ({recoveryItems.length})</h3>
          </div>
          <div className="p-4 space-y-3">
            <p className="text-muted text-xs">Items gathered from battle. Use Maintenance Sheds to process into your Settlement Pool.</p>

            <div className="flex gap-1.5 flex-wrap items-center">
              {DECK_FILTER_OPTIONS.map(f => (
                <button key={f.id} onClick={() => setRecoveryFilter(f.id)} className={`text-xs px-2 py-0.5 border rounded transition-colors ${recoveryFilter === f.id ? 'border-pip text-pip bg-pip-dim/20 font-bold' : 'border-muted/30 text-muted hover:text-pip hover:border-pip'}`}>{f.label}</button>
              ))}
              <button onClick={() => { setShowAddRecovery(true); setAddRecoverySearch(''); setAddRecoveryResults([]) }} className="ml-auto flex items-center gap-1 text-xs px-3 py-1 border border-muted rounded text-muted hover:text-pip hover:border-pip transition-colors">
                <Plus size={11} /> ADD ITEM
              </button>
            </div>

            {showAddRecovery && (
              <div className="border border-pip-mid/40 rounded bg-panel-alt p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted text-xs tracking-wider">ADD ITEM TO RECOVERY</span>
                  <button onClick={() => setShowAddRecovery(false)} className="text-muted hover:text-danger"><X size={13} /></button>
                </div>
                <input type="text" value={addRecoverySearch} onChange={e => handleAddRecoverySearchChange(e.target.value)} placeholder="Search items by name..." className="w-full text-xs py-1 px-2" autoFocus />
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {addRecoveryResults.length === 0 && addRecoverySearch.trim() && (
                    <p className="text-muted text-xs">No results found.</p>
                  )}
                  {addRecoveryResults.map(item => (
                    <div key={item.id} onClick={() => { handleAddToRecovery(item); setShowAddRecovery(false) }} className="flex items-center justify-between border border-muted/40 rounded px-3 py-2 hover:bg-panel cursor-pointer">
                      <span className="text-pip text-xs">{item.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted text-xs">{item.subType}</span>
                        <span className="text-amber text-xs font-bold">{item.caps}c</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {filteredRecovery.length === 0 ? (
              <p className="text-muted text-xs">No items in recovery pool.</p>
            ) : (
              <div className="space-y-1">
                {filteredRecovery.map(item => {
                  if (item.isBoost) {
                    const bs = BOOST_TYPE_STYLE[item.boostType] || {}
                    const boostRef = boostsData.find(b => b.id === item.boostId)
                    return (
                      <div key={item.id} className="border rounded px-3 py-2 bg-panel-light space-y-1" style={{ borderColor: `${bs.color || '#a855f7'}40` }}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Sparkles size={11} style={{ color: bs.color }} />
                          <span className="text-xs font-bold flex-1 min-w-0" style={{ color: bs.color }}>{item.name}</span>
                          <span className="text-xs px-1.5 py-0.5 border rounded" style={{ color: bs.color, borderColor: `${bs.color}50` }}>{bs.label || item.boostType}</span>
                          <div className="flex gap-1 flex-wrap">
                            <button onClick={() => handleMoveBoostToHand(item)} className="text-xs px-2 py-0.5 border font-bold rounded hover:opacity-80 transition-colors" style={{ color: bs.color, borderColor: `${bs.color}70` }}>TO HAND</button>
                            <button onClick={() => handleMoveBoostToStores(item)} className="text-xs px-2 py-0.5 border border-muted rounded text-muted hover:text-pip hover:border-pip transition-colors">TO STORES</button>
                            <button onClick={() => handleDiscardBoostItem(item)} className="text-xs px-2 py-0.5 border border-muted/30 rounded text-dim hover:text-danger hover:border-danger/40 transition-colors">DISCARD</button>
                          </div>
                        </div>
                        {boostRef && <p className="text-muted text-xs leading-relaxed pl-5">{boostRef.effect}</p>}
                      </div>
                    )
                  }
                  return (
                    <div key={item.id} className="flex items-center gap-2 border border-pip-mid/30 rounded px-3 py-2 bg-panel-light flex-wrap">
                      <span className="text-pip text-xs flex-1 min-w-0">{item.name}</span>
                      <span className={`text-xs px-1.5 py-0.5 border border-current/30 rounded ${DECK_SUBTYPE_COLOR[item.subType] || 'text-muted'}`}>{item.subType}</span>
                      <span className="text-amber text-xs font-bold">{item.caps}c</span>
                      <div className="flex gap-1 flex-wrap">
                        <button onClick={() => handleMoveToSettlement(item)} disabled={shedCount > 0 && storedItems.filter(i => !i.isBoost).length >= shedCount} className="text-xs px-2 py-0.5 border border-muted rounded text-muted hover:text-pip hover:border-pip disabled:opacity-40 disabled:cursor-not-allowed transition-colors" title={`Move to Settlement Pool (${storedItems.filter(i => !i.isBoost).length}/${shedCount} shed slots)`}>TO SETTLEMENT</button>
                        <button onClick={() => handleMoveToLocker(item)} disabled={lockerCount > 0 && lockerItems.length >= lockerCount} className="text-xs px-2 py-0.5 border border-muted rounded text-muted hover:text-pip hover:border-pip disabled:opacity-40 disabled:cursor-not-allowed transition-colors" title={`Move to Locker (${lockerItems.length}/${lockerCount} slots)`}>LOCKER</button>
                        <button onClick={() => removeItemAndAddCaps(item)} className="text-xs px-2 py-0.5 border border-amber/40 rounded text-amber hover:bg-amber-dim/20 transition-colors">SELL {item.caps}c</button>
                      </div>
                    </div>
                  )
                })}
                <div className="pt-2">
                  <button onClick={handleSellAllRecovery} className="text-xs px-4 py-2 border border-danger/40 text-danger rounded hover:bg-danger-dim/10 transition-colors">
                    SELL ALL ({recoveryItems.filter(i => !i.isBoost).reduce((s, i) => s + (i.caps ?? 0), 0)}c)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SETTLEMENT POOL */}
        <div className="border rounded bg-panel" style={{ borderColor: 'rgba(0,160,255,0.55)', boxShadow: '0 0 10px rgba(0,160,255,0.15)' }}>
          <div className="flex items-center gap-3 px-4 py-3 border-b flex-wrap gap-y-1" style={{ borderColor: 'rgba(0,160,255,0.3)' }}>
            <h3 className="text-sm font-bold tracking-wider flex-1" style={{ color: '#00a0ff', textShadow: '0 0 8px rgba(0,160,255,0.6)' }}>SETTLEMENT POOL ({storedItems.length})</h3>
            <span className="text-muted text-xs">
              SHED {storedItems.filter(i => !i.isBoost).length}/{shedCount} · LOCKERS {lockerItems.length}/{lockerCount} · STORES {storesItems.length}/{storesCount}
            </span>
          </div>
          <div className="p-4 space-y-3">
            <p className="text-muted text-xs">Items available for equipping or storing. Unsaved items are sold at round end.</p>

            <div className="flex gap-1.5 flex-wrap">
              {DECK_FILTER_OPTIONS.map(f => (
                <button key={f.id} onClick={() => setSettlementFilter(f.id)} className={`text-xs px-2 py-0.5 border rounded transition-colors ${settlementFilter === f.id ? 'border-pip text-pip bg-pip-dim/20 font-bold' : 'border-muted/30 text-muted hover:text-pip hover:border-pip'}`}>{f.label}</button>
              ))}
            </div>

            {filteredStored.length === 0 ? (
              <p className="text-muted text-xs">No items in settlement pool.</p>
            ) : (
              <div className="space-y-1">
                {filteredStored.map(item => (
                  <SettlementPoolItem
                    key={item.id}
                    item={item}
                    roster={roster}
                    storesCount={storesCount}
                    storesItems={storesItems}
                    lockerCount={lockerCount}
                    lockerItems={lockerItems}
                    onEquip={(unitSlotId) => handleEquipItem(item, unitSlotId)}
                    onLocker={() => handleMoveToLocker(item)}
                    onSell={() => removeItemAndAddCaps(item)}
                    onMoveBoostToHand={() => handleMoveBoostToHand(item)}
                    onDiscardBoost={() => handleDiscardBoostItem(item)}
                  />
                ))}
              </div>
            )}

            <div className="border-t border-muted/20 pt-3">
              <div className="text-muted text-xs font-bold tracking-wider mb-2">
                LOCKERS ({lockerItems.length}/{lockerCount})
              </div>
              {lockerItems.length === 0 ? (
                <p className="text-muted text-xs">No items in lockers.</p>
              ) : (
                <div className="space-y-1 ml-2">
                  {lockerItems.map(item => (
                    <div key={item.id} className="flex items-center gap-2 border border-pip-mid/30 rounded px-3 py-2 bg-panel-light flex-wrap">
                      <span className="text-pip text-xs flex-1 min-w-0">{item.name}</span>
                      <span className={`text-xs px-1.5 py-0.5 border border-current/30 rounded ${DECK_SUBTYPE_COLOR[item.subType] || 'text-muted'}`}>{item.subType}</span>
                      <span className="text-amber text-xs font-bold">{item.caps}c</span>
                      <div className="flex gap-1">
                        <button onClick={() => updateItem(item.id, { location: 'stored' })} className="text-xs px-2 py-0.5 border border-muted rounded text-muted hover:text-pip hover:border-pip transition-colors">RETURN TO POOL</button>
                        <button onClick={() => removeItemAndAddCaps(item)} className="text-xs px-2 py-0.5 border border-amber/40 rounded text-amber hover:bg-amber-dim/20 transition-colors">SELL {item.caps}c</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-muted/20 pt-3">
              <div className="text-muted text-xs font-bold tracking-wider mb-2">
                EQUIPPED / STORES ({storesItems.length}/{storesCount})
              </div>
              {storesItems.length === 0 ? (
                <p className="text-muted text-xs">No items equipped or in stores.</p>
              ) : (
                <div className="space-y-3 ml-2">
                  {(() => {
                    const groups = {}
                    storesItems.forEach(item => {
                      const key = item.assignedUnit != null ? String(item.assignedUnit) : 'unassigned'
                      if (!groups[key]) groups[key] = []
                      groups[key].push(item)
                    })
                    return Object.entries(groups).map(([unitKey, groupItems]) => {
                      const unit = roster.find(u => String(u.slotId) === unitKey)
                      return (
                        <div key={unitKey}>
                          <div className="text-muted text-xs mb-1 font-bold">
                            {unit ? unit.unitName : 'Unassigned'}
                          </div>
                          <div className="space-y-1">
                            {groupItems.map(item => (
                              <div key={item.id} className="flex items-center gap-2 border border-pip-mid/30 rounded px-3 py-2 bg-panel-light flex-wrap">
                                <span className="text-pip text-xs flex-1 min-w-0">{item.name}</span>
                                <span className={`text-xs px-1.5 py-0.5 border border-current/30 rounded ${DECK_SUBTYPE_COLOR[item.subType] || 'text-muted'}`}>{item.subType}</span>
                                <span className="text-amber text-xs font-bold">{item.caps}c</span>
                                <div className="flex gap-1">
                                  <button onClick={() => updateItem(item.id, { location: 'stored', assignedUnit: null })} className="text-xs px-2 py-0.5 border border-muted rounded text-muted hover:text-pip hover:border-pip transition-colors">UNEQUIP</button>
                                  <button onClick={() => removeItemAndAddCaps(item)} className="text-xs px-2 py-0.5 border border-amber/40 rounded text-amber hover:bg-amber-dim/20 transition-colors">SELL {item.caps}c</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SettlementPoolItem({ item, roster, storesCount, storesItems, lockerCount, lockerItems, onEquip, onLocker, onSell, onMoveBoostToHand, onDiscardBoost }) {
  const [pickingUnit, setPickingUnit] = useState(false)

  if (item.isBoost) {
    const bs = BOOST_TYPE_STYLE[item.boostType] || {}
    const boostRef = boostsData.find(b => b.id === item.boostId)
    return (
      <div className="border rounded px-3 py-2 bg-panel-light space-y-1" style={{ borderColor: `${bs.color || '#a855f7'}40` }}>
        <div className="flex items-center gap-2 flex-wrap">
          <Sparkles size={11} style={{ color: bs.color }} />
          <span className="text-xs font-bold flex-1 min-w-0" style={{ color: bs.color }}>{item.name}</span>
          <span className="text-xs px-1.5 py-0.5 border rounded" style={{ color: bs.color, borderColor: `${bs.color}50` }}>{bs.label || item.boostType}</span>
          <div className="flex gap-1">
            <button onClick={onMoveBoostToHand} className="text-xs px-2 py-0.5 border font-bold rounded hover:opacity-80 transition-colors" style={{ color: bs.color, borderColor: `${bs.color}70` }}>TO HAND</button>
            <button onClick={onDiscardBoost} className="text-xs px-2 py-0.5 border border-muted/30 rounded text-dim hover:text-danger hover:border-danger/40 transition-colors">DISCARD</button>
          </div>
        </div>
        {boostRef && <p className="text-muted text-xs leading-relaxed pl-5">{boostRef.effect}</p>}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 border border-pip-mid/30 rounded px-3 py-2 bg-panel-light flex-wrap">
      <span className="text-pip text-xs flex-1 min-w-0">{item.name}</span>
      <span className={`text-xs px-1.5 py-0.5 border border-current/30 rounded ${DECK_SUBTYPE_COLOR[item.subType] || 'text-muted'}`}>{item.subType}</span>
      <span className="text-amber text-xs font-bold">{item.caps}c</span>
      <div className="flex gap-1 flex-wrap items-center">
        {pickingUnit ? (
          <>
            <select autoFocus defaultValue="" onChange={e => { if (e.target.value) { onEquip(e.target.value); setPickingUnit(false) } }} className="text-xs py-0.5 px-1">
              <option value="">Pick unit...</option>
              {roster.map(u => (
                <option key={u.slotId} value={u.slotId}>{u.unitName}</option>
              ))}
            </select>
            <button onClick={() => setPickingUnit(false)} className="text-muted hover:text-danger"><X size={12} /></button>
          </>
        ) : (
          <button onClick={() => setPickingUnit(true)} disabled={storesCount > 0 && storesItems.length >= storesCount} className="text-xs px-2 py-0.5 border border-muted rounded text-muted hover:text-pip hover:border-pip disabled:opacity-40 disabled:cursor-not-allowed transition-colors">EQUIP</button>
        )}
        <button onClick={onLocker} disabled={lockerCount > 0 && lockerItems.length >= lockerCount} className="text-xs px-2 py-0.5 border border-muted rounded text-muted hover:text-pip hover:border-pip disabled:opacity-40 disabled:cursor-not-allowed transition-colors">LOCKER</button>
        <button onClick={onSell} className="text-xs px-2 py-0.5 border border-amber/40 rounded text-amber hover:bg-amber-dim/20 transition-colors">SELL {item.caps}c</button>
      </div>
    </div>
  )
}
