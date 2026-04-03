import { useState } from 'react'
import { Users, Building2, Zap, Droplets, ScrollText, Target, Plus, Minus, Map } from 'lucide-react'
import { useCampaign } from '../../context/CampaignContext'
import { calcPowerGenerated, calcPowerConsumed, calcWaterGenerated, calcWaterConsumed, calcRosterTotalCaps, getStructureRef } from '../../utils/calculations'
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
  const { state, setState, isOnline } = useCampaign()
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

  return (
    <div className="p-4 space-y-5 max-w-5xl mx-auto">

      {/* Player Info */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="flex flex-col">
          <label className="text-xs text-pip mb-1 tracking-wider">PLAYER</label>
          <input type="text" value={player['name'] || ''} onChange={(e) => handlePlayerChange('name', e.target.value)} className="text-xs py-1 px-2" />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-pip mb-1 tracking-wider">SETTLEMENT</label>
          <input type="text" value={player['settlement'] || ''} onChange={(e) => handlePlayerChange('settlement', e.target.value)} className="text-xs py-1 px-2" />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-pip mb-1 tracking-wider">FACTION</label>
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
          <label className="text-xs text-pip mb-1 tracking-wider">SUB-FACTION</label>
          <input type="text" value={player['leader'] || ''} onChange={(e) => handlePlayerChange('leader', e.target.value)} className="text-xs py-1 px-2" />
        </div>
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
        <div className="grid grid-cols-3 sm:grid-cols-6 divide-x divide-pip-dim/20">
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
          <StatTile label="QUESTS ACTIVE" value={activeQuestCount} onClick={() => onTabChange?.('battles')} />
          <StatTile label="QUESTS DONE" value={completedQuestCount} color="amber" onClick={() => onTabChange?.('battles')} />
          <StatTile label="OBJECTIVES" value={completedObjectivesCount} color="amber" onClick={() => onTabChange?.('battles')} />
          <StatTile label="PURPOSES" value={completedSecretPurposes} color="amber" onClick={() => onTabChange?.('battles')} />
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
          <button onClick={() => onTabChange?.('battles')} className="ml-auto text-xs text-pip hover:text-pip border border-pip/30 hover:border-pip rounded px-2 py-0.5 transition-colors">
            BATTLES →
          </button>
        </div>
      </div>

      {/* ── BATTLES (explore draws & active events) ── */}
      <div className="border border-pip-mid/40 rounded-lg bg-panel p-4">
        <div className="flex items-center gap-2 mb-2">
          <ScrollText size={14} className="text-pip" />
          <h2 className="text-pip text-sm tracking-widest font-bold">BATTLES</h2>
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
          className="text-xs border border-amber text-amber font-bold px-4 py-2 rounded hover:bg-amber/10"
        >
          OPEN BATTLES →
        </button>
      </div>

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
