import Modal from '../layout/Modal'
import {
  TERRITORY_TYPES,
  TERRITORY_STATES,
  FACTIONS,
  SEED_ROUTES,
} from '../../data/campaignMap'

export default function TerritoryPanel({
  territory,
  territoryById,
  routes,
  onClose,
  actions,
}) {
  if (!territory) return null
  const type = TERRITORY_TYPES[territory.type]
  const faction = FACTIONS[territory.factionPressure]
  const connected = SEED_ROUTES
    .filter(r => r.from === territory.id || r.to === territory.id)
    .map(seedRoute => {
      const otherId = seedRoute.from === territory.id ? seedRoute.to : seedRoute.from
      const other = territoryById[otherId]
      const live = routes.find(r => r.id === seedRoute.id)
      return { seed: seedRoute, other, live }
    })

  return (
    <Modal isOpen onClose={onClose} wide title={`${type?.glyph ?? '◯'} ${territory.name}`}>
      <div className="space-y-4">
        {/* Header strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <Field label="TYPE" value={type?.label ?? territory.type} />
          <Field label="STATE" value={territory.state.toUpperCase()} />
          <Field label="OWNER" value={territory.owner || '—'} />
          <Field label="FACTION PRESSURE" value={faction?.label ?? '—'} color={faction?.color} />
          <Field label="THREAT" value={`${territory.threatLevel ?? 0} / 5`} />
          <Field label="REWARD" value={territory.rewardSummary || '—'} />
          <Field label="REWARD TYPE" value={territory.rewardType || '—'} />
          <Field label="REWARD CLAIMED" value={territory.rewardClaimed ? 'YES' : 'NO'} />
        </div>

        {/* State picker */}
        <div>
          <div className="text-label text-[10px] tracking-widest mb-1">STATE</div>
          <div className="flex flex-wrap gap-1.5">
            {TERRITORY_STATES.map(s => (
              <button
                key={s}
                onClick={() => actions.setTerritoryState(territory.id, s)}
                className={`text-[10px] tracking-wider px-2 py-1 border rounded transition-colors ${
                  territory.state === s
                    ? 'border-amber text-amber bg-amber-dim/10'
                    : 'border-pip-dim/50 text-pip/70 hover:border-pip hover:text-pip'
                }`}
              >
                {s.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap gap-2">
          <ActionBtn label="REVEAL ADJACENT" onClick={() => actions.exploreTerritory(territory.id)} />
          <ActionBtn label="MARK EXPLORED"   onClick={() => actions.setTerritoryState(territory.id, 'explored')} />
          <ActionBtn label="CLAIM"           onClick={() => actions.claimTerritory(territory.id, 'self')} />
          <ActionBtn label="CONTEST"         onClick={() => actions.contestTerritory(territory.id)} accent="orange" />
          <ActionBtn label="HIDE"            onClick={() => actions.hideTerritory(territory.id)} accent="muted" />
          <ActionBtn
            label={territory.rewardClaimed ? 'UNMARK REWARD' : 'MARK REWARD CLAIMED'}
            onClick={() => actions.markRewardClaimed(territory.id, !territory.rewardClaimed)}
            accent="amber"
          />
        </div>

        {/* Owner / threat / notes */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-label text-[10px] tracking-widest block mb-1">OWNER</label>
            <input
              value={territory.owner ?? ''}
              onChange={e => actions.setTerritoryOwner(territory.id, e.target.value || null)}
              placeholder="self / faction / player name"
              className="w-full text-xs py-1.5 px-2"
            />
          </div>
          <div>
            <label className="text-label text-[10px] tracking-widest block mb-1">THREAT LEVEL</label>
            <div className="flex items-center gap-1">
              <button
                onClick={() => actions.setTerritoryThreat(territory.id, (territory.threatLevel ?? 0) - 1)}
                className="px-2 py-1 border border-muted/50 rounded text-muted hover:text-pip hover:border-pip text-xs"
              >−</button>
              <input
                type="number" min="0" max="5"
                value={territory.threatLevel ?? 0}
                onChange={e => actions.setTerritoryThreat(territory.id, parseInt(e.target.value || '0', 10))}
                className="text-sm py-1 px-2 w-14 text-center font-bold"
              />
              <button
                onClick={() => actions.setTerritoryThreat(territory.id, (territory.threatLevel ?? 0) + 1)}
                className="px-2 py-1 border border-muted/50 rounded text-muted hover:text-pip hover:border-pip text-xs"
              >+</button>
            </div>
          </div>
        </div>

        <div>
          <label className="text-label text-[10px] tracking-widest block mb-1">NOTES</label>
          <textarea
            value={territory.notes ?? ''}
            onChange={e => actions.setTerritoryNotes(territory.id, e.target.value)}
            placeholder="Recon notes, encounters, intel..."
            rows={3}
            className="w-full text-xs py-2 px-3 resize-none"
          />
        </div>

        {/* Connected routes */}
        <div>
          <div className="text-amber text-xs tracking-widest font-bold mb-2 border-b border-pip-mid/30 pb-1">
            CONNECTED ROUTES
          </div>
          {connected.length === 0 ? (
            <p className="text-muted text-xs">No connecting routes.</p>
          ) : (
            <div className="space-y-1.5">
              {connected.map(({ seed, other, live }) => (
                <div key={seed.id} className="flex items-center gap-2 border border-pip-dim/30 rounded px-2 py-1.5 bg-panel-alt text-xs">
                  <span className="text-pip font-bold flex-1 truncate">
                    {seed.name} <span className="text-muted">→ {other?.name ?? '—'}</span>
                  </span>
                  <span className="text-amber tracking-wider">{(live?.state ?? 'hidden').toUpperCase()}</span>
                  <span className="text-pip">+{seed.incomeCaps}c</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

function Field({ label, value, color }) {
  return (
    <div className="border border-pip-dim/30 rounded bg-panel-alt px-2 py-1.5">
      <div className="text-label text-[9px] tracking-widest opacity-80">{label}</div>
      <div className="text-pip text-xs tracking-wider truncate"
        style={color ? { color, textShadow: `0 0 4px ${color}` } : undefined}>
        {value}
      </div>
    </div>
  )
}

function ActionBtn({ label, onClick, accent = 'pip' }) {
  const accentCls = {
    pip:    'border-pip text-pip hover:bg-pip-dim/20',
    amber:  'border-amber text-amber hover:bg-amber-dim/20',
    orange: 'border-orange-400 text-orange-400 hover:bg-orange-900/20',
    muted:  'border-muted/40 text-muted hover:border-pip hover:text-pip',
  }[accent] ?? 'border-pip text-pip hover:bg-pip-dim/20'
  return (
    <button onClick={onClick} className={`text-[10px] tracking-widest px-3 py-1.5 border rounded transition-colors ${accentCls}`}>
      {label}
    </button>
  )
}
