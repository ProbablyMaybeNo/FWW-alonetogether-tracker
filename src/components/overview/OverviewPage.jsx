import { useState } from 'react'
import { Users, Building2, Zap, Droplets, Coins, ScrollText, Archive, ChevronLeft, ChevronRight, Target, Plus, Minus } from 'lucide-react'
import { useCampaign } from '../../context/CampaignContext'
import { calcPowerGenerated, calcPowerConsumed, calcWaterGenerated, calcWaterConsumed, calcRosterTotalCaps, calcItemPoolCounts } from '../../utils/calculations'
import StatCard from '../layout/StatCard'
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

  const pwrGen = calcPowerGenerated(structures)
  const pwrUsed = calcPowerConsumed(structures)
  const waterGen = calcWaterGenerated(structures)
  const waterUsed = calcWaterConsumed(structures)
  const poolCounts = calcItemPoolCounts(state.itemPool)
  const activeUnits = roster.filter(u => u.fate !== 'Dead').length
  const nonDeadRoster = roster.filter(u => u.fate !== 'Dead')
  const rosterCaps = calcRosterTotalCaps(nonDeadRoster)
  const campaignScore = caps + rosterCaps
  const activeQuestCount = (state.questCards || []).filter(q => q.status === 'Active').length

  const activeObjective = state.activeScavengerObjective != null
    ? SCAVENGER_OBJECTIVES.find(o => o.id === state.activeScavengerObjective)
    : null

  function handlePlayerChange(field, value) {
    setState(prev => ({ ...prev, player: { ...prev.player, [field]: value } }))
  }

  function handleRoundChange(value) {
    const num = parseInt(value, 10)
    const newRound = isNaN(num) ? 0 : num
    if (isOnline) {
      updateShared('round', newRound)
    } else {
      setState(prev => ({ ...prev, round: newRound }))
    }
  }

  function handlePhaseChange(delta) {
    const newPhase = Math.max(1, Math.min(4, (state.phase ?? 1) + delta))
    if (isOnline) {
      updateShared('phase', newPhase)
    } else {
      setState(prev => ({ ...prev, phase: newPhase }))
    }
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

  function handleCapsAdjust(amount) {
    setState(prev => ({ ...prev, caps: Math.max(0, (prev.caps ?? 0) + amount) }))
  }

  function handleManualAdjust(sign) {
    const val = parseInt(capsAdjust, 10)
    if (isNaN(val) || val <= 0) return
    setState(prev => ({ ...prev, caps: Math.max(0, (prev.caps ?? 0) + sign * val) }))
    setCapsAdjust('')
  }

  function handleBattleCountInc() {
    const newCount = (state.battleCount ?? 0) + 1
    if (isOnline) {
      updateShared('battleCount', newCount)
    } else {
      setState(prev => ({ ...prev, battleCount: newCount }))
    }
  }

  return (
    <div className="p-4 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center border-b border-pip-mid/50 pb-4">
        <h1 className="text-pip text-xl tracking-widest mb-1 font-bold" style={{ textShadow: '0 0 12px var(--color-pip-glow)' }}>ALONE TOGETHER</h1>
        <p className="text-muted text-xs tracking-wider">FALLOUT: WASTELAND WARFARE CAMPAIGN TRACKER</p>
      </div>

      {/* Phase Banner */}
      <div className="bg-panel-light border border-amber/40 rounded-lg px-5 py-3" style={{ boxShadow: '0 0 12px var(--color-amber-glow)' }}>
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-amber text-base font-bold tracking-widest">PHASE {phase}</span>
          <span className="text-pip text-base font-bold tracking-wider">— {phaseInfo.name}</span>
        </div>
        <p className="text-muted text-xs italic">{phaseInfo.subtitle}</p>
      </div>

      {/* Phase Stepper + NEW ROUND */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <button
            onClick={() => handlePhaseChange(-1)}
            disabled={phase <= 1}
            className="p-1.5 border border-muted rounded text-muted hover:text-pip hover:border-pip disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-muted text-xs tracking-wider">PHASE {phase} OF 4</span>
          <button
            onClick={() => handlePhaseChange(1)}
            disabled={phase >= 4}
            className="p-1.5 border border-muted rounded text-muted hover:text-pip hover:border-pip disabled:opacity-30 transition-colors"
          >
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="flex items-center gap-3">
          {exploreCards > 0 && (
            <span className="text-muted text-xs">
              Explore Cards This Round: <span className="text-pip font-bold">{exploreCards}</span>
            </span>
          )}
          <button
            onClick={() => setShowNewRound(true)}
            className="px-4 py-2 border border-pip text-pip rounded text-sm tracking-wider hover:bg-pip-dim hover:text-pip transition-colors font-bold"
            style={{ boxShadow: '0 0 8px var(--color-pip-glow)' }}
          >
            NEW ROUND
          </button>
        </div>
      </div>

      {/* Player Info */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        <div className="flex flex-col">
          <label className="text-xs text-muted mb-1 tracking-wider">PLAYER</label>
          <input type="text" value={player.name} onChange={(e) => handlePlayerChange('name', e.target.value)} className="text-xs py-1 px-2" />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-muted mb-1 tracking-wider">SETTLEMENT</label>
          <input type="text" value={player.settlement} onChange={(e) => handlePlayerChange('settlement', e.target.value)} className="text-xs py-1 px-2" />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-muted mb-1 tracking-wider">FACTION</label>
          <input type="text" value={player.faction} onChange={(e) => handlePlayerChange('faction', e.target.value)} className="text-xs py-1 px-2" />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-muted mb-1 tracking-wider">LEADER</label>
          <input type="text" value={player.leader} onChange={(e) => handlePlayerChange('leader', e.target.value)} className="text-xs py-1 px-2" />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-muted mb-1 tracking-wider">ROUND</label>
          <input type="number" min="0" value={round} onChange={(e) => handleRoundChange(e.target.value)} className="text-xs py-1 px-2" />
        </div>
      </div>

      {/* Caps Display */}
      <div className="border border-amber/60 rounded-lg bg-panel p-4" style={{ boxShadow: '0 0 10px var(--color-amber-glow)' }}>
        <div className="text-xs text-muted mb-2 tracking-widest font-bold">SETTLEMENT CAPS</div>
        <div className="flex items-center gap-3 flex-wrap">
          {editingCaps ? (
            <input
              type="number" min="0"
              value={capsInput}
              onChange={(e) => setCapsInput(e.target.value)}
              onBlur={handleCapsCommit}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCapsCommit() }}
              className="text-2xl text-amber font-bold w-32 py-1 px-2"
              autoFocus
            />
          ) : (
            <button onClick={handleCapsEdit} className="text-2xl text-amber font-bold hover:text-pip transition-colors">
              {caps.toLocaleString()}c
            </button>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => handleCapsAdjust(50)} className="px-3 py-1.5 border border-pip-mid/60 text-pip text-xs rounded hover:bg-pip-dim hover:border-pip transition-colors">+50</button>
            <button onClick={() => handleCapsAdjust(200)} className="px-3 py-1.5 border border-pip-mid/60 text-pip text-xs rounded hover:bg-pip-dim hover:border-pip transition-colors">+200</button>
            <div className="flex items-center gap-1">
              <button onClick={() => handleManualAdjust(-1)} className="p-1.5 border border-muted rounded text-muted hover:text-danger hover:border-danger transition-colors"><Minus size={12} /></button>
              <input
                type="number" min="0"
                value={capsAdjust}
                onChange={(e) => setCapsAdjust(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleManualAdjust(1) }}
                placeholder="amt"
                className="w-16 text-xs py-1 px-2 text-center"
              />
              <button onClick={() => handleManualAdjust(1)} className="p-1.5 border border-muted rounded text-muted hover:text-pip hover:border-pip transition-colors"><Plus size={12} /></button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div>
        <h2 className="text-pip text-sm tracking-widest mb-3 border-b border-pip-mid/50 pb-1 font-bold">CAMPAIGN SNAPSHOT</h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          <StatCard label="CAMPAIGN SCORE" value={campaignScore.toLocaleString()} icon={Coins} color="amber" />
          <div className="border border-pip-mid/60 rounded bg-panel p-2 text-center">
            <div className="text-sm font-bold text-pip">{state.battleCount ?? 0}</div>
            <div className="text-xs text-muted">BATTLES</div>
            <button onClick={handleBattleCountInc} className="mt-1 text-xs text-muted hover:text-pip border border-muted/40 hover:border-pip rounded px-2 py-0.5 transition-colors">+1</button>
          </div>
          <StatCard label="UNITS" value={`${activeUnits}/${roster.length}`} icon={Users} />
          <StatCard label="STRUCTURES" value={structures.length} icon={Building2} />
          <div className={`border ${pwrGen - pwrUsed < 0 ? 'text-danger border-danger/60' : 'text-pip border-pip-mid/60'} bg-panel rounded-lg p-3 flex flex-col items-center gap-1`}>
            <Zap size={18} />
            <span className="text-2xl font-bold">{pwrGen - pwrUsed}</span>
            <span className="text-xs text-muted text-center leading-tight">POWER</span>
            <span className="text-xs text-muted/70">{pwrGen}gen / {pwrUsed}used</span>
          </div>
          <div className={`border ${waterGen - waterUsed < 0 ? 'text-danger border-danger/60' : 'text-pip border-pip-mid/60'} bg-panel rounded-lg p-3 flex flex-col items-center gap-1`}>
            <Droplets size={18} />
            <span className="text-2xl font-bold">{waterGen - waterUsed}</span>
            <span className="text-xs text-muted text-center leading-tight">WATER</span>
            <span className="text-xs text-muted/70">{waterGen}gen / {waterUsed}used</span>
          </div>
          <StatCard label="STORED" value={poolCounts.stored} icon={Archive} small />
          <StatCard label="LOCKERS" value={poolCounts.locker} icon={Archive} small />
          <StatCard label="STORES" value={poolCounts.stores} icon={Archive} small />
          <StatCard label="EVENTS" value={(state.activeEvents || []).length} icon={ScrollText} color={state.activeEvents?.length > 0 ? 'amber' : 'pip'} />
          <div
            className="border border-pip-mid/50 rounded bg-panel p-2 text-center cursor-pointer hover:bg-panel-light hover:border-pip transition-colors"
            onClick={() => onTabChange?.('objectives')}
          >
            <Target size={14} className="mx-auto mb-1 text-pip" />
            <div className="text-sm font-bold text-pip">{activeQuestCount}</div>
            <div className="text-xs text-muted">QUESTS ACTIVE</div>
          </div>
        </div>
      </div>

      {/* Scavenger Objective */}
      <div className="border border-pip-mid/40 rounded bg-panel p-3">
        <div className="text-xs text-muted mb-1 tracking-widest font-bold">ACTIVE SCAVENGER OBJECTIVE</div>
        {activeObjective
          ? <span className="text-amber text-sm font-bold">{activeObjective.name}</span>
          : <span className="text-muted text-xs">None active</span>
        }
      </div>

      {/* Active Explore Consequences + Explore Card Draw */}
      <div>
        <h2 className="text-pip text-sm tracking-widest mb-3 border-b border-pip-mid/50 pb-1 font-bold">
          ACTIVE EXPLORE CONSEQUENCES ({(state.activeEvents || []).length})
        </h2>
        <div className="mb-4">
          <CardDrawer deckType="explore" title="EXPLORE CARD" compact />
        </div>
        <ActiveEvents />
      </div>

      <NewRoundModal isOpen={showNewRound} onClose={() => setShowNewRound(false)} />
    </div>
  )
}
