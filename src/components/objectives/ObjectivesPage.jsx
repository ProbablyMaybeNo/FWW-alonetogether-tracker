import { useState } from 'react'
import { useCampaign } from '../../context/CampaignContext'
import { SECRET_PURPOSES } from '../../data/secretPurposes'
import { SCAVENGER_OBJECTIVES } from '../../data/scavengerObjectives'
import { Plus, X, Check } from 'lucide-react'

const SUB_TABS = [
  { id: 'secret',    label: 'SECRET PURPOSES' },
  { id: 'scavenger', label: 'SCAVENGER OBJECTIVES' },
  { id: 'quests',    label: 'QUEST CARDS' },
]

export default function ObjectivesPage() {
  const [subTab, setSubTab] = useState('secret')

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <h2 className="text-pip text-sm tracking-wider mb-4 border-b border-pip-dim/30 pb-2">OBJECTIVES</h2>

      {/* Sub-tabs */}
      <div className="flex gap-1 mb-6">
        {SUB_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={`flex-1 py-2 text-xs rounded border transition-colors ${
              subTab === t.id ? 'border-pip bg-panel-light text-pip' : 'border-pip-dim/30 text-pip-dim hover:text-pip'
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

  const history = state.secretPurposeHistory || []

  function handleDraw() {
    const idx = Math.floor(Math.random() * SECRET_PURPOSES.length)
    setCurrentId(SECRET_PURPOSES[idx].id)
  }

  function handleMarkComplete() {
    if (currentId == null) return
    setState(prev => ({
      ...prev,
      secretPurposeHistory: [...(prev.secretPurposeHistory || []), { id: currentId, completedOnRound: prev.round ?? 0 }],
    }))
    alert('Perk earned! Choose any legal Perk for a qualifying model.')
  }

  function getCompletionCount(id) {
    return history.filter(h => h.id === id).length
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={handleDraw}
          className="px-4 py-2 border border-pip rounded text-pip text-sm hover:bg-pip-dim/30 transition-colors"
        >
          DRAW RANDOM
        </button>
        {currentId && (
          <span className="text-pip-dim text-xs">Currently drawn: <span className="text-amber">{SECRET_PURPOSES.find(p => p.id === currentId)?.name}</span></span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {SECRET_PURPOSES.map(purpose => {
          const isCurrent = purpose.id === currentId
          const count = getCompletionCount(purpose.id)

          return (
            <div
              key={purpose.id}
              className={`border rounded p-3 bg-panel transition-colors ${
                isCurrent ? 'border-amber bg-amber-dim/10' : 'border-pip-dim/40'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-bold tracking-wider ${isCurrent ? 'text-amber' : 'text-pip'}`}>
                  {isCurrent && '▶ '}{purpose.name}
                </span>
                {count > 0 && (
                  <span className="text-xs px-2 py-0.5 border border-pip-dim/40 rounded text-pip-dim">
                    Completed {count}×
                  </span>
                )}
              </div>
              <p className="text-pip-dim text-xs leading-relaxed mb-1">{purpose.objective}</p>
              <p className="text-pip-dim/70 text-xs italic">When: {purpose.completedWhen}</p>

              {isCurrent && (
                <button
                  onClick={handleMarkComplete}
                  className="mt-3 w-full py-1.5 border border-pip text-pip text-xs rounded hover:bg-pip-dim/30 transition-colors"
                >
                  MARK COMPLETE
                </button>
              )}
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
        <span className="text-xs text-pip-dim">PLAYERS AT TABLE:</span>
        {[2, 3, 4].map(n => (
          <button
            key={n}
            onClick={() => setPlayerCount(n)}
            className={`px-3 py-1 text-xs border rounded transition-colors ${
              playerCount === n ? 'border-pip text-pip bg-pip-dim/20' : 'border-pip-dim/30 text-pip-dim hover:text-pip'
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
                  <span className="text-xs px-2 py-0.5 border border-pip-dim/30 rounded text-pip-dim">{obj.mode}</span>
                  {isActive && <span className="text-xs px-2 py-0.5 border border-amber rounded text-amber">ACTIVE</span>}
                  {isComplete && <span className="text-xs px-2 py-0.5 border border-pip rounded text-pip">✓ DONE</span>}
                </div>
                <span className="text-xs text-amber">{obj.reward}</span>
              </div>
              <p className="text-pip-dim/70 text-xs italic mb-1">{obj.narrative}</p>
              <p className="text-pip-dim text-xs leading-relaxed mb-2">{obj.objective}</p>

              {obj.hasProgress && !isComplete && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-pip-dim">{obj.progressLabel}:</span>
                  <button onClick={() => handleProgressChange(obj.id, -1)} className="px-2 py-0.5 border border-pip-dim/30 rounded text-pip-dim hover:text-pip text-xs">−</button>
                  <span className="text-pip text-sm font-bold w-8 text-center">{cur}</span>
                  <span className="text-pip-dim text-xs">/ {scaledMax}</span>
                  <button onClick={() => handleProgressChange(obj.id, 1)} className="px-2 py-0.5 border border-pip-dim/30 rounded text-pip-dim hover:text-pip text-xs">+</button>
                </div>
              )}

              {!isComplete && (
                <div className="flex gap-2">
                  {!isActive && (
                    <button
                      onClick={() => handleSetActive(obj.id)}
                      disabled={activeId != null}
                      className="px-3 py-1 border border-pip-dim text-pip-dim text-xs rounded hover:text-pip hover:border-pip disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
  const [newPart, setNewPart] = useState(1)

  const quests = state.questCards || []
  const activeCount = quests.filter(q => q.status === 'Active').length

  function handleAdd() {
    if (!newName.trim()) return
    if (activeCount >= 3) return
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
    setNewPart(1)
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

  return (
    <div className="space-y-4">
      {activeCount >= 3 && (
        <div className="border border-amber rounded px-3 py-2 text-amber text-xs">
          ⚠ Max 3 active quests
        </div>
      )}

      {/* Add form */}
      <div className="flex gap-2 flex-wrap">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
          placeholder="Quest name..."
          className="flex-1 text-xs"
        />
        <div className="flex gap-1">
          {[1, 2].map(p => (
            <button
              key={p}
              onClick={() => setNewPart(p)}
              className={`px-3 py-1 text-xs border rounded transition-colors ${
                newPart === p ? 'border-pip text-pip bg-pip-dim/20' : 'border-pip-dim/30 text-pip-dim hover:text-pip'
              }`}
            >
              Part {p}
            </button>
          ))}
        </div>
        <button
          onClick={handleAdd}
          disabled={activeCount >= 3}
          className="px-3 py-1 border border-pip-dim text-pip text-sm rounded hover:bg-pip-dim/30 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Quest list */}
      {quests.length === 0 ? (
        <p className="text-pip-dim text-xs text-center py-4">No quests active. Add one above.</p>
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
                    q.part === 2 ? 'border-amber/50 text-amber' : 'border-pip-dim/40 text-pip-dim'
                  }`}>
                    Part {q.part}
                  </span>
                  <span className="text-pip-dim text-xs">R{q.startedRound ?? 0}</span>
                </div>
              </div>
              <button
                onClick={() => handleToggleStatus(q.id)}
                className={`p-1.5 border rounded text-xs transition-colors ${
                  q.status === 'Complete' ? 'border-pip text-pip' : 'border-pip-dim/30 text-pip-dim hover:text-pip'
                }`}
                title={q.status === 'Complete' ? 'Mark Active' : 'Mark Complete'}
              >
                <Check size={12} />
              </button>
              <button onClick={() => handleRemove(q.id)} className="text-pip-dim hover:text-danger p-1">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
