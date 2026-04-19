import { useState, useEffect } from 'react'
import { ScrollText, Target, Plus, Minus, X, ChevronDown } from 'lucide-react'
import { useCampaign } from '../../context/CampaignContext'
import { calcPowerGenerated, calcPowerConsumed, calcWaterGenerated, calcWaterConsumed, calcRosterTotalCaps, getStructureRef, calcDefenseRating } from '../../utils/calculations'
import { SCAVENGER_OBJECTIVES } from '../../data/scavengerObjectives'

const FACTIONS = [
  'Arcadia Renegades', 'Brotherhood of Steel', "Caesar's Legion",
  'Children of Atom', 'Creatures', 'Cult of the Mothman', 'Enclave',
  'Gunners', 'Institute', 'New California Republic', 'RPG Archetypes',
  'Raiders', 'Railroad', 'Robots', 'Super Mutants', 'Survivors',
  'The Harbormen', 'The Scorched', 'Trappers', 'Zetan',
]

const UNAVAILABLE_FATES = ['Lost', 'Captured', 'Delayed', 'Injured', 'Shaken']

export default function OverviewPage({ onTabChange }) {
  const { state, setState } = useCampaign()
  const [editingCaps, setEditingCaps] = useState(false)
  const [capsInput, setCapsInput] = useState('')
  const [capsAdjust, setCapsAdjust] = useState('')

  const { roster, settlement, player, round } = state
  const structures = settlement.structures || []
  const caps = state.caps ?? 0

  // Settlement stats
  const pwrGen = calcPowerGenerated(structures)
  const pwrUsed = calcPowerConsumed(structures)
  const waterGen = calcWaterGenerated(structures)
  const waterUsed = calcWaterConsumed(structures)
  const landCount = settlement.landCount ?? (settlement.landPurchased ? 1 : 0)
  const maxSlots = 15 + (landCount * 10)
  const usedSlots = structures.reduce((sum, s) => sum + (getStructureRef(s.structureId)?.size || 1), 0)

  // Roster stats
  const activeUnits = roster.filter(u => u.fate !== 'Dead' && !UNAVAILABLE_FATES.includes(u.fate)).length
  const deadUnits = roster.filter(u => u.fate === 'Dead').length
  const unavailableUnits = roster.filter(u => UNAVAILABLE_FATES.includes(u.fate)).length
  const nonDeadRoster = roster.filter(u => u.fate !== 'Dead')
  const rosterCaps = calcRosterTotalCaps(nonDeadRoster)
  const campaignScore = caps + rosterCaps

  // Campaign stats
  const activeQuestCount = (state.questCards || []).filter(q => q.status === 'Active').length
  const completedQuestCount = (state.questCards || []).filter(q => q.status === 'Complete').length
  const completedObjectivesCount = (state.completedObjectives || []).length
  const completedSecretPurposes = (state.secretPurposeHistory || []).length

  const activeObjective = state.activeScavengerObjective != null
    ? SCAVENGER_OBJECTIVES.find(o => o.id === state.activeScavengerObjective)
    : null

  function handlePlayerChange(field, value) {
    setState(prev => ({ ...prev, player: { ...prev.player, [field]: value } }))
  }

  function handleCapsEdit() {
    setCapsInput(String(caps))
    setEditingCaps(true)
  }

  function handleCapsCommit() {
    const val = parseInt(capsInput, 10)
    if (!isNaN(val)) setState(prev => ({ ...prev, caps: Math.max(0, val) }))
    setEditingCaps(false)
  }

  function handleManualAdjust(sign) {
    const val = parseInt(capsAdjust, 10)
    if (isNaN(val) || val <= 0) return
    setState(prev => ({ ...prev, caps: Math.max(0, (prev.caps ?? 0) + sign * val) }))
    setCapsAdjust('')
  }

  function handleBattleCountInc() {
    const newCount = (state.battleCount ?? 0) + 1
    setState(prev => ({ ...prev, battleCount: newCount }))
  }

  const phase = state.phase ?? 1
  const defenseRating = calcDefenseRating(structures)
  const phase1CapLimit = state.phase1CapLimit ?? 750

  const desktopDefault = () => typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches
  const [openCampaign, setOpenCampaign] = useState(desktopDefault)
  const [openSettlement, setOpenSettlement] = useState(desktopDefault)
  const [openRoster, setOpenRoster] = useState(desktopDefault)
  const [openQuests, setOpenQuests] = useState(desktopDefault)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    function sync() {
      const d = mq.matches
      setOpenCampaign(d)
      setOpenSettlement(d)
      setOpenRoster(d)
      setOpenQuests(d)
    }
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  return (
    <div className="p-4 space-y-5 max-w-5xl mx-auto">

      <OverviewSection title="CAMPAIGN" open={openCampaign} onToggle={() => setOpenCampaign(o => !o)}>
        <div className="space-y-4 px-4 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="flex flex-col">
              <label className="text-xs text-info mb-1 tracking-wider">PLAYER</label>
              <input type="text" value={player['name'] || ''} onChange={(e) => handlePlayerChange('name', e.target.value)} className="text-xs py-1 px-2" />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-info mb-1 tracking-wider">SETTLEMENT</label>
              <input type="text" value={player['settlement'] || ''} onChange={(e) => handlePlayerChange('settlement', e.target.value)} className="text-xs py-1 px-2" />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-info mb-1 tracking-wider">FACTION</label>
              <select
                value={player['faction'] || ''}
                onChange={(e) => handlePlayerChange('faction', e.target.value)}
                className="text-xs py-1 px-2"
              >
                <option value="">Select faction...</option>
                {FACTIONS.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-info mb-1 tracking-wider">SUB-FACTION</label>
              <input type="text" value={player['leader'] || ''} onChange={(e) => handlePlayerChange('leader', e.target.value)} className="text-xs py-1 px-2" />
            </div>
          </div>

          <div className="border border-amber/60 rounded-lg bg-panel p-4" style={{ boxShadow: '0 0 10px var(--color-amber-glow)' }}>
            <div className="text-xs text-amber mb-3 tracking-widest font-bold">SETTLEMENT CAPS</div>
            <div className="flex items-center gap-4 flex-wrap">
              {editingCaps ? (
                <input type="number" min="0" value={capsInput}
                  onChange={(e) => setCapsInput(e.target.value)}
                  onBlur={handleCapsCommit}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCapsCommit() }}
                  className="text-3xl text-amber font-bold w-36 py-1 px-2"
                  autoFocus
                />
              ) : (
                <button onClick={handleCapsEdit} className="text-3xl text-amber font-bold hover:text-pip transition-colors">
                  {caps.toLocaleString()}c
                </button>
              )}
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => handleManualAdjust(-1)} className="px-3 py-2 border border-danger rounded text-danger hover:bg-danger/10 transition-colors">
                  <Minus size={14} />
                </button>
                <input type="number" min="0" value={capsAdjust}
                  onChange={(e) => setCapsAdjust(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleManualAdjust(1) }}
                  placeholder="amount"
                  className="w-28 text-sm py-2 px-2 text-center font-bold"
                />
                <button type="button" onClick={() => handleManualAdjust(1)} className="px-3 py-2 border border-pip rounded text-pip hover:bg-pip-dim/20 transition-colors">
                  <Plus size={14} />
                </button>
              </div>
              <div className="ml-auto text-right">
                <div className="text-xs text-info">CAMPAIGN SCORE</div>
                <div className="text-amber font-bold text-xl">{campaignScore.toLocaleString()}c</div>
              </div>
            </div>
          </div>

          <div className="text-xs text-pip border border-pip-dim/30 rounded px-3 py-2 bg-panel-alt space-y-1">
            <div>
              <span className="text-amber font-bold">Phase {phase}</span>
              {' · '}
              <span>Round {round ?? 0}</span>
              {' · '}
              <span>Battles recorded: {state.battleCount ?? 0}</span>
            </div>
          </div>

          <div className="border border-pip-mid/40 rounded bg-panel p-3">
            <div className="flex items-center gap-2 mb-2">
              <Target size={13} className="text-pip" />
              <span className="text-xs text-amber tracking-widest font-bold">ACTIVE SCAVENGER OBJECTIVE</span>
            </div>
            {activeObjective
              ? <span className="text-amber text-sm font-bold">{activeObjective.name}</span>
              : <span className="text-pip text-xs italic">None active</span>
            }
            <div className="mt-2 flex items-center gap-3 text-xs">
              <span className="text-pip">Objectives completed:</span>
              <span className="text-pip font-bold text-sm">{completedObjectivesCount}</span>
              <button type="button" onClick={() => onTabChange?.('battles')} className="ml-auto text-xs text-pip border border-pip/30 hover:border-pip rounded px-2 py-0.5 transition-colors">
                BATTLES →
              </button>
            </div>
          </div>
        </div>
      </OverviewSection>

      <OverviewSection
        title="SETTLEMENT"
        open={openSettlement}
        onToggle={() => setOpenSettlement(o => !o)}
        actions={(
          <button type="button" onClick={(e) => { e.stopPropagation(); onTabChange?.('settlement') }} className="text-xs text-pip shrink-0 px-2 py-1 min-h-[44px]">OPEN →</button>
        )}
      >
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 divide-x divide-pip-dim/20 border-t border-pip-dim/20">
          <StatTile label="STRUCTURES" value={structures.length} onClick={() => onTabChange?.('settlement')} />
          <StatTile
            label="SLOTS"
            value={`${usedSlots}/${maxSlots}`}
            color={usedSlots >= maxSlots ? 'danger' : 'pip'}
          />
          <StatTile
            label={`LAND (${landCount})`}
            value={landCount}
            color="pip"
            onClick={() => onTabChange?.('settlement')}
          />
          <StatTile
            label={`POWER ${pwrGen}gen/${pwrUsed}use`}
            value={`${pwrGen - pwrUsed >= 0 ? '+' : ''}${pwrGen - pwrUsed}`}
            color={pwrGen - pwrUsed < 0 ? 'danger' : 'pip'}
          />
          <StatTile
            label={`WATER ${waterGen}gen/${waterUsed}use`}
            value={`${waterGen - waterUsed >= 0 ? '+' : ''}${waterGen - waterUsed}`}
            color={waterGen - waterUsed < 0 ? 'danger' : 'pip'}
          />
          <StatTile label="DEFENSE" value={defenseRating} color="pip" />
          <StatTile
            label="ACTIVE EVENTS"
            value={(state.activeEvents || []).length}
            color={(state.activeEvents || []).length > 0 ? 'amber' : 'pip'}
          />
        </div>
      </OverviewSection>

      <OverviewSection
        title="ROSTER"
        open={openRoster}
        onToggle={() => setOpenRoster(o => !o)}
        actions={(
          <button type="button" onClick={(e) => { e.stopPropagation(); onTabChange?.('roster') }} className="text-xs text-pip shrink-0 px-2 py-1 min-h-[44px]">OPEN →</button>
        )}
      >
        <div className="space-y-2 border-t border-pip-dim/20 px-4 py-3">
          {phase === 1 && (
            <p className="text-xs text-muted">
              Phase 1 roster caps limit: <span className="text-amber font-bold">{phase1CapLimit}c</span>
            </p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-pip-dim/20">
            <StatTile label="ACTIVE" value={activeUnits} onClick={() => onTabChange?.('roster')} />
            <StatTile label="DEAD" value={deadUnits} color={deadUnits > 0 ? 'danger' : 'pip'} onClick={() => onTabChange?.('roster')} />
            <StatTile label="UNAVAILABLE" value={unavailableUnits} color={unavailableUnits > 0 ? 'amber' : 'pip'} onClick={() => onTabChange?.('roster')} />
            <StatTile label="ROSTER VALUE" value={`${rosterCaps.toLocaleString()}c`} color="amber" />
          </div>
        </div>
      </OverviewSection>

      <OverviewSection title="QUESTS" open={openQuests} onToggle={() => setOpenQuests(o => !o)}>
        <div className="space-y-4 px-4 pb-4 border-t border-pip-dim/20 pt-3">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 divide-x divide-pip-dim/20 border border-pip-dim/30 rounded overflow-hidden">
            <div className="p-3 text-center col-span-2 sm:col-span-1">
              <div className="text-pip text-base font-bold">{state.battleCount ?? 0}</div>
              <div className="text-pip text-xs mt-0.5">BATTLES</div>
              <button type="button" onClick={handleBattleCountInc} className="mt-1 text-xs text-pip border border-pip/30 hover:border-pip rounded px-2 py-0.5 transition-colors min-h-[44px]">+1</button>
            </div>
            <StatTile label="QUESTS ACTIVE" value={activeQuestCount} onClick={() => onTabChange?.('battles')} />
            <StatTile label="QUESTS DONE" value={completedQuestCount} color="amber" onClick={() => onTabChange?.('battles')} />
            <StatTile label="OBJECTIVES" value={completedObjectivesCount} color="amber" onClick={() => onTabChange?.('battles')} />
            <StatTile label="PURPOSES" value={completedSecretPurposes} color="amber" onClick={() => onTabChange?.('battles')} />
          </div>

          <div className="border border-pip-mid/40 rounded-lg bg-panel p-4">
            <div className="flex items-center gap-2 mb-2">
              <ScrollText size={14} className="text-pip" />
              <h2 className="text-amber text-sm tracking-widest font-bold">BATTLES</h2>
              {(state.activeEvents || []).length > 0 && (
                <span className="text-amber font-bold text-xs">({state.activeEvents.length} active events)</span>
              )}
            </div>
            <p className="text-muted text-xs mb-3">
              Draw explore/settlement event cards and manage active consequences on the <strong className="text-pip">BATTLES</strong> tab.
            </p>
            <button
              type="button"
              onClick={() => onTabChange?.('battles')}
              className="text-xs border border-amber text-amber font-bold px-4 py-2 rounded hover:bg-amber/10 min-h-[44px]"
            >
              OPEN BATTLES →
            </button>
          </div>
        </div>
      </OverviewSection>

      <NarrativeSection state={state} setState={setState} round={state.round ?? 0} />

    </div>
  )
}

function OverviewSection({ title, open, onToggle, actions = null, children }) {
  return (
    <div className="border border-pip-mid/40 rounded-lg bg-panel overflow-hidden">
      <div className="flex items-stretch gap-2 min-h-[44px] px-3 py-2 bg-panel-light border-b border-pip-mid/30">
        <button type="button" className="flex flex-1 items-center justify-between gap-2 text-left min-w-0" onClick={onToggle}>
          <span className="text-amber text-xs tracking-widest font-bold">{title}</span>
          <ChevronDown className={`text-muted shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} size={18} />
        </button>
        {actions}
      </div>
      {open && <div>{children}</div>}
    </div>
  )
}

function NarrativeSection({ state, setState, round }) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')

  const entries = state.narrativeLog || []

  function handleAdd() {
    if (!newTitle.trim() && !newContent.trim()) return
    const entry = {
      id: Date.now(),
      title: newTitle.trim() || 'Untitled',
      content: newContent.trim(),
      round: round ?? 0,
    }
    setState(prev => ({ ...prev, narrativeLog: [...(prev.narrativeLog || []), entry] }))
    setNewTitle('')
    setNewContent('')
    setShowAddModal(false)
  }

  function handleRemove(id) {
    setState(prev => ({ ...prev, narrativeLog: (prev.narrativeLog || []).filter(e => e.id !== id) }))
  }

  return (
    <div className="border border-pip-mid/40 rounded-lg bg-panel overflow-hidden">
      <div className="px-4 py-2 bg-panel-light border-b border-pip-mid/30 flex items-center gap-2">
        <span className="text-amber text-xs tracking-widest font-bold flex-1">NARRATIVE LOG</span>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1 text-xs border border-pip text-pip rounded px-3 py-1 hover:bg-pip-dim/20 transition-colors font-bold"
        >
          + ADD ENTRY
        </button>
      </div>

      {/* Add modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4" onClick={() => setShowAddModal(false)}>
          <div className="max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <div className="bg-panel border border-pip rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-pip text-sm font-bold tracking-wider">NEW NARRATIVE ENTRY</span>
                <span className="text-muted text-xs">Round {round ?? 0}</span>
              </div>
              <div>
                <label className="text-muted text-xs block mb-1 tracking-wider">TITLE</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Entry title..."
                  className="w-full text-xs"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-muted text-xs block mb-1 tracking-wider">NARRATIVE</label>
                <textarea
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  placeholder="Describe what happened this round..."
                  rows={5}
                  className="w-full text-xs resize-none"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleAdd}
                  disabled={!newTitle.trim() && !newContent.trim()}
                  className="flex-1 py-2 border border-amber text-amber text-xs font-bold rounded hover:bg-amber/10 disabled:opacity-40 transition-colors"
                >
                  ADD TO LOG
                </button>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-muted/30 text-muted text-xs rounded hover:text-pip transition-colors"
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Entries table */}
      {entries.length === 0 ? (
        <p className="text-muted text-xs text-center py-6">No narrative entries yet. Record your campaign story.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-pip-dim/30">
                <th className="text-left text-info px-4 py-2 tracking-wider font-normal w-12">RND</th>
                <th className="text-left text-info px-4 py-2 tracking-wider font-normal w-36">TITLE</th>
                <th className="text-left text-info px-4 py-2 tracking-wider font-normal">NARRATIVE</th>
                <th className="w-8 px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {[...entries].reverse().map((entry, i) => (
                <tr key={entry.id ?? i} className="border-b border-pip-dim/20 hover:bg-panel-light transition-colors">
                  <td className="px-4 py-2 text-pip font-bold">{entry.round ?? '—'}</td>
                  <td className="px-4 py-2 text-amber font-bold">{entry.title}</td>
                  <td className="px-4 py-2 text-pip leading-relaxed whitespace-pre-wrap">{entry.content}</td>
                  <td className="px-2 py-2">
                    <button
                      onClick={() => handleRemove(entry.id)}
                      className="text-muted hover:text-danger p-0.5 transition-colors"
                      title="Remove entry"
                    >
                      <X size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function StatTile({ label, value, color = 'pip', onClick }) {
  const colorClass = color === 'amber' ? 'text-amber' : color === 'danger' ? 'text-danger' : 'text-pip'
  return (
    <div
      className={`p-3 text-center ${onClick ? 'cursor-pointer hover:bg-panel-light transition-colors' : ''}`}
      onClick={onClick}
    >
      <div className={`${colorClass} text-base font-bold`}>{value}</div>
      <div className="text-info text-xs mt-0.5 leading-tight">{label}</div>
    </div>
  )
}
