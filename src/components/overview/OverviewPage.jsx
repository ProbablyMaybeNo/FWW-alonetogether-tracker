import { Users, Building2, Zap, Droplets, Package, Swords, Coins, Shield, ScrollText, Archive } from 'lucide-react'
import { useCampaign } from '../../context/CampaignContext'
import { calcPowerGenerated, calcPowerConsumed, calcWaterGenerated, calcWaterConsumed, calcDefenseRating, calcRosterTotalCaps, calcItemPoolCounts } from '../../utils/calculations'
import StatCard from '../layout/StatCard'
import CardDrawer from './CardDrawer'
import ActiveEvents from './ActiveEvents'
import QuestCards from './QuestCards'

export default function OverviewPage() {
  const { state, setState } = useCampaign()
  const { roster, settlement, player, round } = state

  const structures = settlement.structures || []
  const pwrGen = calcPowerGenerated(structures)
  const pwrUsed = calcPowerConsumed(structures)
  const waterGen = calcWaterGenerated(structures)
  const waterUsed = calcWaterConsumed(structures)
  const defense = calcDefenseRating(structures)
  const rosterCaps = calcRosterTotalCaps(roster)
  const poolCounts = calcItemPoolCounts(state.itemPool)
  const activeUnits = roster.filter(u => u.fate === 'Active').length

  function handlePlayerChange(field, value) {
    setState(prev => ({ ...prev, player: { ...prev.player, [field]: value } }))
  }

  function handleRoundChange(value) {
    const num = parseInt(value, 10)
    setState(prev => ({ ...prev, round: isNaN(num) ? 0 : num }))
  }

  return (
    <div className="p-4 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center border-b border-pip-dim pb-4">
        <h1 className="text-pip text-xl tracking-widest mb-1">ALONE TOGETHER</h1>
        <p className="text-pip-dim text-xs tracking-wider">FALLOUT: WASTELAND WARFARE CAMPAIGN TRACKER</p>
      </div>

      {/* Player Info */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <div className="flex flex-col">
          <label className="text-xs text-pip-dim mb-1">PLAYER</label>
          <input type="text" value={player.name} onChange={(e) => handlePlayerChange('name', e.target.value)} className="text-xs py-1 px-2" />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-pip-dim mb-1">SETTLEMENT</label>
          <input type="text" value={player.settlement} onChange={(e) => handlePlayerChange('settlement', e.target.value)} className="text-xs py-1 px-2" />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-pip-dim mb-1">FACTION</label>
          <input type="text" value={player.faction} onChange={(e) => handlePlayerChange('faction', e.target.value)} className="text-xs py-1 px-2" />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-pip-dim mb-1">LEADER</label>
          <input type="text" value={player.leader} onChange={(e) => handlePlayerChange('leader', e.target.value)} className="text-xs py-1 px-2" />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-pip-dim mb-1">DIFFICULTY</label>
          <select value={player.difficulty} onChange={(e) => handlePlayerChange('difficulty', e.target.value)} className="text-xs py-1 px-2">
            <option>Standard</option>
            <option>Hard</option>
            <option>Very Hard</option>
            <option>Survival</option>
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-pip-dim mb-1">ROUND</label>
          <input type="number" min="0" value={round} onChange={(e) => handleRoundChange(e.target.value)} className="text-xs py-1 px-2" />
        </div>
      </div>

      {/* Stats Grid */}
      <div>
        <h2 className="text-pip text-sm tracking-wider mb-3 border-b border-pip-dim/30 pb-1">CAMPAIGN SNAPSHOT</h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          <StatCard label="CAPS VALUE" value={state.settlement.capsTotal || 0} icon={Coins} color="amber" />
          <StatCard label="ROSTER CAPS" value={rosterCaps} icon={Swords} color="amber" />
          <StatCard label="UNITS" value={`${activeUnits}/${roster.length}`} icon={Users} />
          <StatCard label="STRUCTURES" value={structures.length} icon={Building2} />
          <StatCard label="POWER" value={`${pwrGen - pwrUsed}`} icon={Zap} color={pwrGen - pwrUsed < 0 ? 'danger' : 'pip'} />
          <StatCard label="WATER" value={`${waterGen - waterUsed}`} icon={Droplets} color={waterGen - waterUsed < 0 ? 'danger' : 'pip'} />
          <StatCard label="RESOURCES" value={state.settlement.resourcesAvailable || 0} icon={Package} />
          <StatCard label="DEFENSE" value={defense} icon={Shield} />
          <StatCard label="STORES" value={`${poolCounts['Stores']}/6`} icon={Archive} small />
          <StatCard label="MAINT SHED" value={`${poolCounts['Maint. Shed']}/6`} icon={Archive} small />
          <StatCard label="LOCKERS" value={`${poolCounts['Locker']}/6`} icon={Archive} small />
          <StatCard label="EVENTS" value={(state.activeEvents || []).length} icon={ScrollText} color={state.activeEvents?.length > 0 ? 'amber' : 'pip'} />
        </div>
      </div>

      {/* Card Draws */}
      <div>
        <h2 className="text-pip text-sm tracking-wider mb-3 border-b border-pip-dim/30 pb-1">CARD DRAWS</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CardDrawer deckType="settlement" title="SETTLEMENT EVENT" />
          <CardDrawer deckType="explore" title="EXPLORE CARD" />
        </div>
      </div>

      {/* Active Events */}
      <div>
        <h2 className="text-pip text-sm tracking-wider mb-3 border-b border-pip-dim/30 pb-1">
          ACTIVE EVENTS IN PLAY ({(state.activeEvents || []).length})
        </h2>
        <ActiveEvents />
      </div>

      {/* Quest Cards */}
      <div>
        <h2 className="text-pip text-sm tracking-wider mb-3 border-b border-pip-dim/30 pb-1">
          QUEST CARDS ({(state.questCards || []).length})
        </h2>
        <QuestCards />
      </div>
    </div>
  )
}
