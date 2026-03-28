import { useState } from 'react'
import { Users, Building2, Zap, Droplets, ScrollText, ChevronLeft, ChevronRight, Target, Plus, Minus, Map } from 'lucide-react'
import { useCampaign } from '../../context/CampaignContext'
import { calcPowerGenerated, calcPowerConsumed, calcWaterGenerated, calcWaterConsumed, calcRosterTotalCaps, getStructureRef } from '../../utils/calculations'
import CardDrawer from './CardDrawer'
import ActiveEvents from './ActiveEvents'
import NewRoundModal from './NewRoundModal'
import { SCAVENGER_OBJECTIVES } from '../../data/scavengerObjectives'

const PHASES = [
  { num: 1, name: 'THE ROAD AHEAD',        subtitle: 'Build your starting roster. 750 cap limit.' },
  { num: 2, name: 'GATHER SUPPLIES',        subtitle: 'Track Fate only. Permanent deaths. No injuries tracked.' },
  { num: 3, name: 'STAKING A CLAIM',        subtitle: 'Spend caps on structures and recruits only.' },
  { num: 4, name: 'FIGHTING FOR THE FRONTIER', subtitle: 'Open campaign loop. Fight, build, grow.' },
]

const UNAVAILABLE_FATES = ['Lost', 'Captured', 'Delayed', 'Injured', 'Shaken']

export default function OverviewPage({ onTabChange }) {
  const { state, setState, updateShared, isOnline } = useCampaign()
  const [editingCaps, setEditingCaps] = useState(false)
  const [capsInput, setCapsInput] = useState('')
  const [capsAdjust, setCapsAdjust] = useState('')
  const [showNewRound, setShowNewRound] = useState(false)

  const { roster, settlement, player, round } = state
  const structures = settlement.structures || []
  const caps = state.caps ?? 0
  const phase = state.phase ?? 1
  const phaseInfo = PHASES[phase - 1] || PHASES[0]
  const exploreCards = state.exploreCardsThisRound ?? 0

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

  function handleRoundChange(value) {
    const num = parseInt(value, 10)
    const newRound = isNaN(num) ? 0 : num
    if (isOnline) { updateShared('round', newRound) }
    else { setState(prev => ({ ...prev, round: newRound })) }
  }

  function handlePhaseChange(delta) {
    const newPhase = Math.max(1, Math.min(4, (state.phase ?? 1) + delta))
    if (isOnline) { updateShared('phase', newPhase) }
    else { setState(prev => ({ ...prev, phase: newPhase })) }
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
    if (isOnline) { updateShared('battleCount', newCount) }
    else { setState(prev => ({ ...prev, battleCount: newCount })) }
  }

  return (
    <div className="p-4 space-y-5 max-w-5xl mx-auto">

      {/* Phase Banner */}
      <div className="bg-panel-light border border-amber/40 rounded-lg px-5 py-3" style={{ boxShadow: '0 0 12px var(--color-amber-glow)' }}>
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-amber text-base font-bold tracking-widest">PHASE {phase}</span>
          <span className="text-pip text-base font-bold tracking-wider">— {phaseInfo.name}</span>
        </div>
        <p className="text-pip text-xs italic">{phaseInfo.subtitle}</p>
      </div>

      {/* Phase / Round / NEW ROUND row */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => handlePhaseChange(-1)} disabled={phase <= 1} className="p-1.5 border border-pip/40 rounded text-pip hover:text-pip hover:border-pip disabled:opacity-30 transition-colors">
            <ChevronLeft size={14} />
          </button>
          <span className="text-pip text-xs tracking-wider font-bold">PHASE {phase} / 4</span>
          <button onClick={() => handlePhaseChange(1)} disabled={phase >= 4} className="p-1.5 border border-pip/40 rounded text-pip hover:text-pip hover:border-pip disabled:opacity-30 transition-colors">
            <ChevronRight size={14} />
          </button>
          <span className="text-pip text-xs ml-3">ROUND</span>
          <input type="number" min="0" value={round} onChange={(e) => handleRoundChange(e.target.value)} className="text-xs py-1 px-2 w-16" />
          {exploreCards > 0 && (
            <span className="text-pip text-xs ml-2">Explore: <span className="text-pip font-bold">{exploreCards}</span></span>
          )}
        </div>
        <button
          onClick={() => setShowNewRound(true)}
          className="px-4 py-2 border border-pip text-pip rounded text-sm tracking-wider hover:bg-pip-dim transition-colors font-bold"
          style={{ boxShadow: '0 0 8px var(--color-pip-glow)' }}
        >
          NEW ROUND
        </button>
      </div>

      {/* Player Info */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: 'PLAYER', field: 'name' },
          { label: 'SETTLEMENT', field: 'settlement' },
          { label: 'FACTION', field: 'faction' },
          { label: 'SUB-FACTION', field: 'leader' },
        ].map(({ label, field }) => (
          <div key={field} className="flex flex-col">
            <label className="text-xs text-pip mb-1 tracking-wider">{label}</label>
            <input type="text" value={player[field] || ''} onChange={(e) => handlePlayerChange(field, e.target.value)} className="text-xs py-1 px-2" />
          </div>
        ))}
      </div>

      {/* Caps */}
      <div className="border border-amber/60 rounded-lg bg-panel p-4" style={{ boxShadow: '0 0 10px var(--color-amber-glow)' }}>
        <div className="text-xs text-pip mb-3 tracking-widest font-bold">SETTLEMENT CAPS</div>
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
            <button onClick={() => handleManualAdjust(-1)} className="px-3 py-2 border border-danger rounded text-danger hover:bg-danger/10 transition-colors">
              <Minus size={14} />
            </button>
            <input type="number" min="0" value={capsAdjust}
              onChange={(e) => setCapsAdjust(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleManualAdjust(1) }}
              placeholder="amount"
              className="w-28 text-sm py-2 px-2 text-center font-bold"
            />
            <button onClick={() => handleManualAdjust(1)} className="px-3 py-2 border border-pip rounded text-pip hover:bg-pip-dim/20 transition-colors">
              <Plus size={14} />
            </button>
          </div>
          <div className="ml-auto text-right">
            <div className="text-xs text-pip">CAMPAIGN SCORE</div>
            <div className="text-amber font-bold text-xl">{campaignScore.toLocaleString()}c</div>
          </div>
        </div>
      </div>

      {/* ── SETTLEMENT OVERVIEW ── */}
      <div className="border border-pip-mid/40 rounded-lg bg-panel overflow-hidden">
        <div className="px-4 py-2 bg-panel-light border-b border-pip-mid/30 flex items-center gap-2">
          <Building2 size={13} className="text-pip" />
          <h2 className="text-pip text-xs tracking-widest font-bold">SETTLEMENT</h2>
          <button onClick={() => onTabChange?.('settlement')} className="ml-auto text-xs text-pip hover:text-pip transition-colors">OPEN →</button>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-5 divide-x divide-pip-dim/20">
          <StatTile label="STRUCTURES" value={structures.length} onClick={() => onTabChange?.('settlement')} />
          <StatTile
            label={`SLOTS (LAND ${landCount})`}
            value={`${usedSlots}/${maxSlots}`}
            color={usedSlots >= maxSlots ? 'danger' : 'pip'}
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
          <StatTile
            label="ACTIVE EVENTS"
            value={(state.activeEvents || []).length}
            color={(state.activeEvents || []).length > 0 ? 'amber' : 'pip'}
          />
        </div>
      </div>

      {/* ── ROSTER OVERVIEW ── */}
      <div className="border border-pip-mid/40 rounded-lg bg-panel overflow-hidden">
        <div className="px-4 py-2 bg-panel-light border-b border-pip-mid/30 flex items-center gap-2">
          <Users size={13} className="text-pip" />
          <h2 className="text-pip text-xs tracking-widest font-bold">ROSTER</h2>
          <button onClick={() => onTabChange?.('roster')} className="ml-auto text-xs text-pip hover:text-pip transition-colors">OPEN →</button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-pip-dim/20">
          <StatTile label="ACTIVE" value={activeUnits} onClick={() => onTabChange?.('roster')} />
          <StatTile label="DEAD" value={deadUnits} color={deadUnits > 0 ? 'danger' : 'pip'} onClick={() => onTabChange?.('roster')} />
          <StatTile label="UNAVAILABLE" value={unavailableUnits} color={unavailableUnits > 0 ? 'amber' : 'pip'} onClick={() => onTabChange?.('roster')} />
          <StatTile label="ROSTER VALUE" value={`${rosterCaps.toLocaleString()}c`} color="amber" />
        </div>
      </div>

      {/* ── CAMPAIGN OVERVIEW ── */}
      <div className="border border-pip-mid/40 rounded-lg bg-panel overflow-hidden">
        <div className="px-4 py-2 bg-panel-light border-b border-pip-mid/30 flex items-center gap-2">
          <Map size={13} className="text-pip" />
          <h2 className="text-pip text-xs tracking-widest font-bold">CAMPAIGN</h2>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-5 divide-x divide-pip-dim/20">
          <div className="p-3 text-center">
            <div className="text-pip text-base font-bold">{state.battleCount ?? 0}</div>
            <div className="text-pip text-xs mt-0.5">BATTLES</div>
            <button onClick={handleBattleCountInc} className="mt-1 text-xs text-pip hover:text-pip border border-pip/30 hover:border-pip rounded px-2 py-0.5 transition-colors">+1</button>
          </div>
          <StatTile label="QUESTS ACTIVE" value={activeQuestCount} onClick={() => onTabChange?.('objectives')} />
          <StatTile label="QUESTS DONE" value={completedQuestCount} color="amber" onClick={() => onTabChange?.('objectives')} />
          <StatTile label="OBJECTIVES" value={completedObjectivesCount} color="amber" onClick={() => onTabChange?.('objectives')} />
          <StatTile label="PURPOSES" value={completedSecretPurposes} color="amber" onClick={() => onTabChange?.('objectives')} />
        </div>
      </div>

      {/* ── SCAVENGER OBJECTIVE ── */}
      <div className="border border-pip-mid/40 rounded bg-panel p-3">
        <div className="flex items-center gap-2 mb-2">
          <Target size={13} className="text-pip" />
          <span className="text-xs text-pip tracking-widest font-bold">ACTIVE SCAVENGER OBJECTIVE</span>
        </div>
        {activeObjective
          ? <span className="text-amber text-sm font-bold">{activeObjective.name}</span>
          : <span className="text-pip text-xs italic">None active</span>
        }
        <div className="mt-2 flex items-center gap-3 text-xs">
          <span className="text-pip">Completed:</span>
          <span className="text-pip font-bold text-sm">{completedObjectivesCount}</span>
          <button onClick={() => onTabChange?.('objectives')} className="ml-auto text-xs text-pip hover:text-pip border border-pip/30 hover:border-pip rounded px-2 py-0.5 transition-colors">
            MANAGE →
          </button>
        </div>
      </div>

      {/* ── EXPLORE CONSEQUENCES ── */}
      <div>
        <div className="flex items-center gap-2 mb-3 border-b border-pip-mid/40 pb-2">
          <ScrollText size={14} className="text-pip" />
          <h2 className="text-pip text-sm tracking-widest font-bold">EXPLORE CONSEQUENCES</h2>
          {(state.activeEvents || []).length > 0 && (
            <span className="text-amber font-bold text-xs">({state.activeEvents.length} active)</span>
          )}
        </div>
        <div className="mb-4">
          <CardDrawer deckType="explore" title="DRAW EXPLORE CARD" />
        </div>
        <ActiveEvents />
      </div>

      <NewRoundModal isOpen={showNewRound} onClose={() => setShowNewRound(false)} />
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
      <div className="text-pip text-xs mt-0.5 leading-tight">{label}</div>
    </div>
  )
}
