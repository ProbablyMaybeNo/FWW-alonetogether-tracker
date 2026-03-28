import { useState } from 'react'
import { useCampaign } from '../../context/CampaignContext'
import { SECRET_PURPOSES } from '../../data/secretPurposes'
import { SCAVENGER_OBJECTIVES } from '../../data/scavengerObjectives'
import questCardDeck from '../../data/questCardDeck.json'
import { Plus, X, Check, Shuffle, ChevronDown, ChevronRight, BookOpen } from 'lucide-react'
import questCardContent from '../../data/questCardContent.json'

function useCardContent(cardName, cardId) {
  if (!cardName || questCardContent.length === 0) return null
  const normalise = s => s.toUpperCase().replace(/[^A-Z0-9]/g, '')
  const byName = name => {
    const target = normalise(name)
    return questCardContent.find(c => normalise(c.name) === target) ?? null
  }
  const direct = byName(cardName)
  if (direct) return direct
  if (cardId != null) {
    const deckCard = questCardDeck.find(c => c.id === cardId)
    if (deckCard) return byName(deckCard.name)
  }
  return null
}

/* ── Text-based card viewer modal ── */
function QuestCardViewer({ cardName, cardId, onClose }) {
  const [showBack, setShowBack] = useState(false)
  const content = useCardContent(cardName, cardId)

  return (
    <div
      className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div className="max-w-xl w-full" onClick={e => e.stopPropagation()}>
        <div className="bg-panel border border-pip rounded p-4 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="text-pip text-xs font-bold tracking-wider uppercase">{cardName}</span>
            <button onClick={onClose} className="text-pip hover:text-danger p-1"><X size={14} /></button>
          </div>

          {content ? (
            <>
              {!showBack ? (
                <div className="bg-panel-alt border border-pip-dim/20 rounded p-4 min-h-24">
                  <p className="text-pip text-sm leading-relaxed italic">{content.frontText || '—'}</p>
                </div>
              ) : (
                <div className="bg-panel-alt border border-amber/30 rounded p-4 min-h-24 space-y-2">
                  {content.backTitle && (
                    <p className="text-amber text-xs font-bold tracking-wider uppercase">{content.backTitle}</p>
                  )}
                  <p className="text-pip text-sm leading-relaxed">{content.backText || '—'}</p>
                </div>
              )}

              <button
                onClick={() => setShowBack(b => !b)}
                className="w-full py-2 border border-pip text-pip text-xs rounded font-bold tracking-wider hover:bg-pip-dim/20 transition-colors"
              >
                {showBack ? '◀ FRONT' : 'FLIP ▶'}
              </button>
            </>
          ) : (
            <p className="text-center py-8 text-pip text-xs">Card content not in library yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Inline drawn card display with flip ── */
function DrawnCardContent({ cardName, cardId }) {
  const [showBack, setShowBack] = useState(false)
  const content = useCardContent(cardName, cardId)

  if (!content) return null

  return (
    <div className="space-y-2">
      {!showBack ? (
        <div className="bg-panel-alt border border-pip-dim/20 rounded p-3">
          <p className="text-pip text-xs leading-relaxed italic">{content.frontText || '—'}</p>
        </div>
      ) : (
        <div className="bg-panel-alt border border-amber/30 rounded p-3 space-y-1">
          {content.backTitle && (
            <p className="text-amber text-xs font-bold tracking-wider uppercase">{content.backTitle}</p>
          )}
          <p className="text-pip text-xs leading-relaxed">{content.backText || '—'}</p>
        </div>
      )}
      <button
        onClick={() => setShowBack(b => !b)}
        className="w-full py-1.5 border border-pip text-pip text-xs rounded font-bold tracking-wider hover:bg-pip-dim/20 transition-colors"
      >
        {showBack ? '◀ FRONT' : 'FLIP ▶'}
      </button>
    </div>
  )
}

const SUB_TABS = [
  { id: 'secret',    label: 'SECRET PURPOSES' },
  { id: 'scavenger', label: 'SCAVENGER OBJECTIVES' },
  { id: 'quests',    label: 'QUEST CARDS' },
]

export default function ObjectivesPage() {
  const [subTab, setSubTab] = useState('secret')

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <h2 className="text-pip text-sm tracking-widest mb-4 border-b border-pip-mid/50 pb-2 font-bold">OBJECTIVES</h2>

      {/* Sub-tabs */}
      <div className="flex gap-1 mb-6">
        {SUB_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={`flex-1 py-2 text-xs rounded border transition-colors font-bold tracking-wider ${
              subTab === t.id ? 'border-pip bg-panel-light text-pip' : 'border-pip/30 text-pip hover:text-amber hover:border-amber'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'secret'    && <SecretPurposes />}
      {subTab === 'scavenger' && <ScavengerObjectives />}
      {subTab === 'quests'    && <QuestCardsPanel />}
    </div>
  )
}

/* ── Secret Purposes ── */
function SecretPurposes() {
  const { state, setState } = useCampaign()
  const [currentId, setCurrentId] = useState(null)
  const [justCompleted, setJustCompleted] = useState(null)

  const history = state.secretPurposeHistory || []

  function handleDraw() {
    const idx = Math.floor(Math.random() * SECRET_PURPOSES.length)
    setCurrentId(SECRET_PURPOSES[idx].id)
    setJustCompleted(null)
  }

  function handleMarkComplete(id) {
    setState(prev => ({
      ...prev,
      secretPurposeHistory: [...(prev.secretPurposeHistory || []), { id, completedOnRound: prev.round ?? 0 }],
    }))
    setCurrentId(null)
    setJustCompleted(id)
  }

  function handleUndoLast() {
    setState(prev => {
      const h = [...(prev.secretPurposeHistory || [])]
      h.pop()
      return { ...prev, secretPurposeHistory: h }
    })
    setJustCompleted(null)
  }

  function getHistory(id) {
    return history.filter(h => h.id === id)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={handleDraw}
          className="flex items-center gap-2 px-4 py-2 border border-pip rounded text-pip text-xs font-bold hover:bg-pip-dim/30 transition-colors"
        >
          <Shuffle size={12} /> DRAW RANDOM
        </button>
        {currentId && (
          <span className="text-xs text-pip">Active: <span className="text-amber font-bold">{SECRET_PURPOSES.find(p => p.id === currentId)?.name}</span></span>
        )}
        {justCompleted && (
          <div className="flex items-center gap-2 text-xs text-pip border border-pip/40 rounded px-3 py-1.5 bg-pip-dim/10">
            <Check size={12} className="text-pip" />
            Purpose complete — earn a Perk for a qualifying model
            <button onClick={handleUndoLast} className="ml-2 text-muted hover:text-danger transition-colors">undo</button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {SECRET_PURPOSES.map(purpose => {
          const isCurrent = purpose.id === currentId
          const purposeHistory = getHistory(purpose.id)
          const count = purposeHistory.length

          return (
            <div
              key={purpose.id}
              className={`border rounded p-3 bg-panel transition-colors ${
                isCurrent ? 'border-amber bg-amber-dim/10' : 'border-pip-dim/40'
              }`}
            >
              <div className="flex items-start justify-between mb-2 gap-2">
                <span className={`text-sm font-bold tracking-wider ${isCurrent ? 'text-amber' : 'text-pip'}`}>
                  {isCurrent && '▶ '}{purpose.name}
                </span>
                {count > 0 && (
                  <span className="text-xs px-2 py-0.5 border border-pip/40 rounded text-pip shrink-0">
                    ✓ {count}×
                  </span>
                )}
              </div>
              <p className="text-muted text-xs leading-relaxed mb-1">{purpose.objective}</p>
              <p className="text-muted/60 text-xs italic mb-2">Complete when: {purpose.completedWhen}</p>

              {purposeHistory.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {purposeHistory.map((h, i) => (
                    <span key={i} className="text-xs px-1.5 py-0.5 border border-pip/30 rounded text-pip">R{h.completedOnRound}</span>
                  ))}
                </div>
              )}

              <button
                onClick={() => isCurrent ? handleMarkComplete(purpose.id) : setCurrentId(purpose.id)}
                className={`w-full py-1.5 text-xs rounded border transition-colors font-bold ${
                  isCurrent
                    ? 'border-pip text-pip hover:bg-pip-dim/30'
                    : 'border-muted/30 text-muted hover:border-pip hover:text-pip'
                }`}
              >
                {isCurrent ? '✓ MARK COMPLETE' : 'SET ACTIVE'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Scavenger Objectives ── */
function ScavengerObjectives() {
  const { state, setState } = useCampaign()
  const [playerCount, setPlayerCount] = useState(2)

  const activeId = state.activeScavengerObjective
  const completed = state.completedObjectives || []
  const progress = state.objectiveProgress || {}

  function handleSetActive(id) {
    setState(prev => ({ ...prev, activeScavengerObjective: id }))
  }

  function handleMarkComplete(id) {
    const obj = SCAVENGER_OBJECTIVES.find(o => o.id === id)
    setState(prev => ({
      ...prev,
      activeScavengerObjective: null,
      completedObjectives: [...(prev.completedObjectives || []), id],
    }))
    alert(`Objective complete! Reward: ${obj?.reward || '—'}`)
  }

  function handleProgressChange(id, delta) {
    setState(prev => {
      const obj = SCAVENGER_OBJECTIVES.find(o => o.id === id)
      const scaled = (obj?.progressMax ?? 0) + (playerCount - 2)
      const cur = (prev.objectiveProgress || {})[id] || 0
      const next = Math.max(0, Math.min(scaled, cur + delta))
      return { ...prev, objectiveProgress: { ...prev.objectiveProgress, [id]: next } }
    })
  }

  return (
    <div className="space-y-4">
      {/* Player count */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted">PLAYERS AT TABLE:</span>
        {[2, 3, 4].map(n => (
          <button
            key={n}
            onClick={() => setPlayerCount(n)}
            className={`px-3 py-1 text-xs border rounded transition-colors ${
              playerCount === n ? 'border-pip text-pip bg-pip-dim/20' : 'border-pip/30 text-pip hover:text-amber hover:border-amber'
            }`}
          >
            {n}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {SCAVENGER_OBJECTIVES.map(obj => {
          const isActive = activeId === obj.id
          const isComplete = completed.includes(obj.id)
          const scaledMax = obj.hasProgress ? obj.progressMax + (playerCount - 2) : null
          const cur = progress[obj.id] || 0

          return (
            <div
              key={obj.id}
              className={`border rounded p-3 transition-colors ${
                isComplete ? 'border-pip-dim/20 bg-panel-alt opacity-50' :
                isActive ? 'border-amber bg-amber-dim/10' :
                'border-pip-dim/40 bg-panel'
              }`}
            >
              <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${isActive ? 'text-amber' : isComplete ? 'text-pip-dim' : 'text-pip'}`}>
                    {obj.name}
                  </span>
                  <span className="text-xs px-2 py-0.5 border border-pip/30 rounded text-pip">{obj.mode}</span>
                  {isActive && <span className="text-xs px-2 py-0.5 border border-amber rounded text-amber font-bold" style={{ boxShadow: '0 0 4px var(--color-amber-glow)' }}>● ACTIVE</span>}
                  {isComplete && <span className="text-xs px-2 py-0.5 border border-pip rounded text-pip">✓ DONE</span>}
                </div>
                <span className="text-xs text-amber">{obj.reward}</span>
              </div>
              <p className="text-muted/80 text-xs italic mb-1">{obj.narrative}</p>
              <p className="text-muted text-xs leading-relaxed mb-2">{obj.objective}</p>

              {obj.hasProgress && !isComplete && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-muted">{obj.progressLabel}:</span>
                  <button onClick={() => handleProgressChange(obj.id, -1)} className="px-2 py-0.5 border border-muted/30 rounded text-muted hover:text-pip hover:border-pip text-xs transition-colors">−</button>
                  <span className="text-pip text-sm font-bold w-8 text-center">{cur}</span>
                  <span className="text-muted text-xs">/ {scaledMax}</span>
                  <button onClick={() => handleProgressChange(obj.id, 1)} className="px-2 py-0.5 border border-muted/30 rounded text-muted hover:text-pip hover:border-pip text-xs transition-colors">+</button>
                </div>
              )}

              {!isComplete && (
                <div className="flex gap-2">
                  {!isActive && (
                    <button
                      onClick={() => handleSetActive(obj.id)}
                      disabled={activeId != null}
                      className="px-3 py-1.5 border border-pip text-pip text-xs rounded hover:bg-pip-dim/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-bold"
                    style={{ boxShadow: '0 0 4px var(--color-pip-glow)' }}
                    >
                      SET ACTIVE
                    </button>
                  )}
                  {isActive && (
                    <button
                      onClick={() => handleMarkComplete(obj.id)}
                      className="px-3 py-1 border border-amber text-amber text-xs rounded hover:bg-amber-dim/20 transition-colors"
                    >
                      MARK COMPLETE
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Quest Cards ── */
function QuestCardsPanel() {
  const { state, setState } = useCampaign()
  const [newName, setNewName] = useState('')
  const [newPart, setNewPart] = useState('1')
  const [drawnCard, setDrawnCard] = useState(null)
  const [showDeckBrowser, setShowDeckBrowser] = useState(false)
  const [deckSearch, setDeckSearch] = useState('')
  const [viewingCard, setViewingCard] = useState(null)

  const quests = state.questCards || []
  const drawnQuestIds = state.drawnQuestIds || []
  const discardedQuestIds = state.discardedQuestIds || []
  const activeCount = quests.filter(q => q.status === 'Active').length

  const usedIds = new Set([...drawnQuestIds, ...discardedQuestIds])
  const remainingDeck = questCardDeck.filter(c => !usedIds.has(c.id))

  function handleDrawRandom() {
    if (remainingDeck.length === 0) return
    const idx = Math.floor(Math.random() * remainingDeck.length)
    const card = remainingDeck[idx]
    setDrawnCard(card)
    setState(prev => ({
      ...prev,
      drawnQuestIds: [...(prev.drawnQuestIds || []), card.id],
    }))
  }

  function handleAddDrawnToQuests() {
    if (!drawnCard || activeCount >= 3) return
    setState(prev => ({
      ...prev,
      questCards: [...(prev.questCards || []), {
        id: Date.now(),
        cardId: drawnCard.id,
        name: drawnCard.name,
        part: drawnCard.part || '1',
        status: 'Active',
        startedRound: prev.round ?? 0,
      }],
    }))
    setDrawnCard(null)
  }

  function handleDiscardDrawnCard() {
    if (!drawnCard) return
    setState(prev => ({
      ...prev,
      discardedQuestIds: [...(prev.discardedQuestIds || []), drawnCard.id],
      drawnQuestIds: (prev.drawnQuestIds || []).filter(id => id !== drawnCard.id),
    }))
    setDrawnCard(null)
  }

  function handleAddManual() {
    if (!newName.trim() || activeCount >= 3) return
    setState(prev => ({
      ...prev,
      questCards: [...(prev.questCards || []), {
        id: Date.now(),
        name: newName.trim(),
        part: newPart,
        status: 'Active',
        startedRound: prev.round ?? 0,
      }],
    }))
    setNewName('')
    setNewPart('1')
  }

  function handleToggleStatus(id) {
    setState(prev => ({
      ...prev,
      questCards: prev.questCards.map(q =>
        q.id === id ? { ...q, status: q.status === 'Active' ? 'Complete' : 'Active' } : q
      ),
    }))
  }

  function handleRemove(id) {
    setState(prev => ({ ...prev, questCards: prev.questCards.filter(q => q.id !== id) }))
  }

  function handleResetDeck() {
    if (!confirm('Reset quest deck? This clears all drawn/discarded tracking. Your active quest log is unaffected.')) return
    setState(prev => ({ ...prev, drawnQuestIds: [], discardedQuestIds: [] }))
    setDrawnCard(null)
  }

  function handleDeckPickCard(card) {
    if (usedIds.has(card.id)) return
    setDrawnCard(card)
    setState(prev => ({
      ...prev,
      drawnQuestIds: [...(prev.drawnQuestIds || []), card.id],
    }))
    setShowDeckBrowser(false)
  }

  const filteredDeck = deckSearch
    ? questCardDeck.filter(c => c.name.toLowerCase().includes(deckSearch.toLowerCase()))
    : questCardDeck

  return (
    <div className="space-y-5">

      {viewingCard && (
        <QuestCardViewer
          key={`${viewingCard.name}-${String(viewingCard.cardId ?? '')}`}
          cardName={viewingCard.name}
          cardId={viewingCard.cardId}
          onClose={() => setViewingCard(null)}
        />
      )}

      {/* Deck Status */}
      <div className="border border-pip-dim/30 rounded bg-panel-alt px-3 py-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex gap-4 text-xs">
            <span className="text-pip">{remainingDeck.length} <span className="text-pip">in deck</span></span>
            <span className="text-pip">{drawnQuestIds.length} drawn</span>
            <span className="text-pip">{discardedQuestIds.length} discarded</span>
            <span className="text-pip">{questCardDeck.length} total</span>
          </div>
          <button onClick={handleResetDeck} className="text-xs text-danger-dim hover:text-danger">RESET DECK</button>
        </div>
      </div>

      {/* Draw Controls */}
      <div className="space-y-2">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleDrawRandom}
            disabled={remainingDeck.length === 0}
            className="flex items-center gap-2 px-4 py-2 border border-pip rounded text-pip text-xs hover:bg-pip-dim/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Shuffle size={12} /> DRAW RANDOM ({remainingDeck.length})
          </button>
          <button
            onClick={() => setShowDeckBrowser(b => !b)}
            className="flex items-center gap-2 px-3 py-2 border border-pip/30 rounded text-pip text-xs hover:text-amber transition-colors"
          >
            {showDeckBrowser ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            BROWSE DECK
          </button>
        </div>

        {/* Deck Browser */}
        {showDeckBrowser && (
          <div className="border border-pip-dim/30 rounded bg-panel-alt p-3 space-y-2">
            <input
              type="text"
              value={deckSearch}
              onChange={e => setDeckSearch(e.target.value)}
              placeholder="Search quest cards..."
              className="w-full text-xs"
            />
            <div className="max-h-48 overflow-y-auto space-y-1">
              {filteredDeck.map(card => {
                const isUsed = usedIds.has(card.id)
                return (
                  <div key={card.id} className="flex items-center gap-1">
                    <button
                      onClick={() => handleDeckPickCard(card)}
                      disabled={isUsed}
                      className={`flex-1 text-left px-2 py-1 rounded text-xs transition-colors ${
                        isUsed
                          ? 'text-pip-dim/40 cursor-not-allowed line-through'
                          : 'text-pip hover:bg-pip-dim/20 cursor-pointer'
                      }`}
                    >
                      <span className="font-bold">{card.name}</span>
                      {card.isMultiPart && (
                        <span className="text-pip ml-2">[{card.series}]</span>
                      )}
                    </button>
                    <button
                      onClick={() => setViewingCard({ name: card.name, cardId: card.id })}
                      className="p-1 text-pip hover:text-pip transition-colors flex-shrink-0"
                      title="Read card"
                    >
                      <BookOpen size={10} />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Drawn Card Display */}
        {drawnCard && (
          <div className="border border-amber rounded p-3 bg-amber-dim/5 space-y-2">
            <div className="text-xs text-amber font-bold tracking-wider">DRAWN CARD</div>
            <div className="text-pip font-bold text-sm">{drawnCard.name}</div>
            {drawnCard.isMultiPart && (
              <div className="text-pip text-xs">
                Series: <span className="text-pip">{drawnCard.series}</span>
                {' — '}<span className="text-amber">Part {drawnCard.part}</span>
              </div>
            )}
            <DrawnCardContent key={drawnCard.id} cardName={drawnCard.name} cardId={drawnCard.id} />
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleAddDrawnToQuests}
                disabled={activeCount >= 3}
                className="flex-1 py-1.5 border border-pip text-pip text-xs rounded hover:bg-pip-dim/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ADD TO QUEST LOG
              </button>
              <button
                onClick={handleDiscardDrawnCard}
                className="px-3 py-1.5 border border-pip/30 text-pip text-xs rounded hover:text-danger transition-colors"
              >
                DISCARD
              </button>
            </div>
          </div>
        )}
      </div>

      {activeCount >= 3 && (
        <div className="border border-amber rounded px-3 py-2 text-amber text-xs">
          ⚠ Max 3 active quests
        </div>
      )}

      {/* Quest Log */}
      <div>
        <h3 className="text-pip text-xs tracking-wider mb-2 border-b border-pip-dim/30 pb-1">QUEST LOG</h3>

        {quests.length === 0 ? (
          <p className="text-pip text-xs text-center py-4">No quests in log. Draw a card or add manually below.</p>
        ) : (
          <div className="space-y-2">
            {quests.map(q => (
              <div
                key={q.id}
                className={`flex items-center gap-3 border rounded px-3 py-2 transition-colors ${
                  q.status === 'Complete' ? 'border-pip-dim/20 bg-panel-alt opacity-60' : 'border-pip-dim/40 bg-panel'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm ${q.status === 'Complete' ? 'text-pip-dim line-through' : 'text-pip'}`}>{q.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded border ${
                      q.part && q.part !== '1' ? 'border-amber/50 text-amber' : 'border-pip/40 text-pip'
                    }`}>
                      Part {q.part || '1'}
                    </span>
                    <span className="text-pip text-xs">R{q.startedRound ?? 0}</span>
                  </div>
                </div>
                <button
                  onClick={() => setViewingCard({ name: q.name, cardId: q.cardId })}
                  className="p-1.5 border border-pip/30 rounded text-pip hover:text-amber transition-colors"
                  title="Read card"
                >
                  <BookOpen size={12} />
                </button>
                <button
                  onClick={() => handleToggleStatus(q.id)}
                  className={`p-1.5 border rounded text-xs transition-colors ${
                    q.status === 'Complete' ? 'border-pip text-pip' : 'border-pip/30 text-pip hover:text-amber'
                  }`}
                  title={q.status === 'Complete' ? 'Mark Active' : 'Mark Complete'}
                >
                  <Check size={12} />
                </button>
                <button onClick={() => handleRemove(q.id)} className="text-pip hover:text-danger p-1">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Manual Add */}
      <div>
        <h3 className="text-pip text-xs tracking-wider mb-2 border-b border-pip-dim/30 pb-1">ADD MANUALLY</h3>
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddManual() }}
            placeholder="Quest name..."
            className="flex-1 text-xs"
          />
          <div className="flex gap-1">
            {['1', '2', '3', '2A', '2B'].map(p => (
              <button
                key={p}
                onClick={() => setNewPart(p)}
                className={`px-2 py-1 text-xs border rounded transition-colors ${
                  newPart === p ? 'border-pip text-pip bg-pip-dim/20' : 'border-pip/30 text-pip hover:text-amber hover:border-amber'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <button
            onClick={handleAddManual}
            disabled={activeCount >= 3}
            className="px-3 py-1 border border-pip-dim text-pip text-sm rounded hover:bg-pip-dim/30 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
