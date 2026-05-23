import Modal from '../layout/Modal'
import { ROUTE_STATES } from '../../data/campaignMap'

export default function RoutePanel({ route, territoryById, onClose, actions }) {
  if (!route) return null
  const from = territoryById[route.from]
  const to = territoryById[route.to]

  return (
    <Modal isOpen onClose={onClose} title={`═ ${route.name}`}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <Field label="FROM" value={from?.name ?? route.from} />
          <Field label="TO"   value={to?.name ?? route.to} />
          <Field label="STATE" value={route.state.toUpperCase()} />
          <Field label="OWNER" value={route.owner ?? '—'} />
          <Field label="INCOME / RND" value={`${route.incomeCaps ?? 0} caps`} />
          <Field label="REWARD CATEGORY" value={route.rewardCategory ?? '—'} />
          <Field label="THREAT" value={`${route.threatLevel ?? 0} / 5`} />
          <Field label="ONE-TIME REWARD" value={route.oneTimeRewardClaimed ? 'CLAIMED' : 'UNCLAIMED'} />
        </div>

        <div>
          <div className="text-label text-[10px] tracking-widest mb-1">STATE</div>
          <div className="flex flex-wrap gap-1.5">
            {ROUTE_STATES.map(s => (
              <button
                key={s}
                onClick={() => actions.setRouteState(route.id, s)}
                className={`text-[10px] tracking-wider px-2 py-1 border rounded transition-colors ${
                  route.state === s
                    ? 'border-amber text-amber bg-amber-dim/10'
                    : 'border-pip-dim/50 text-pip/70 hover:border-pip hover:text-pip'
                }`}
              >
                {s.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <ActionBtn label="REVEAL"    onClick={() => actions.revealRoute(route.id)} />
          <ActionBtn label="CLAIM"     onClick={() => actions.claimRoute(route.id, 'self')} accent="amber" />
          <ActionBtn label="BLOCK"     onClick={() => actions.blockRoute(route.id)} accent="orange" />
          <ActionBtn
            label={route.oneTimeRewardClaimed ? 'UNMARK REWARD' : 'MARK REWARD CLAIMED'}
            onClick={() => actions.claimRouteOneTimeReward(route.id, !route.oneTimeRewardClaimed)}
            accent="amber"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-label text-[10px] tracking-widest block mb-1">OWNER</label>
            <input
              value={route.owner ?? ''}
              onChange={e => actions.setRouteOwner(route.id, e.target.value || null)}
              placeholder="self / faction"
              className="w-full text-xs py-1.5 px-2"
            />
          </div>
          <div>
            <label className="text-label text-[10px] tracking-widest block mb-1">THREAT LEVEL</label>
            <div className="flex items-center gap-1">
              <button
                onClick={() => actions.setRouteThreat(route.id, (route.threatLevel ?? 0) - 1)}
                className="px-2 py-1 border border-muted/50 rounded text-muted hover:text-pip hover:border-pip text-xs"
              >−</button>
              <input
                type="number" min="0" max="5"
                value={route.threatLevel ?? 0}
                onChange={e => actions.setRouteThreat(route.id, parseInt(e.target.value || '0', 10))}
                className="text-sm py-1 px-2 w-14 text-center font-bold"
              />
              <button
                onClick={() => actions.setRouteThreat(route.id, (route.threatLevel ?? 0) + 1)}
                className="px-2 py-1 border border-muted/50 rounded text-muted hover:text-pip hover:border-pip text-xs"
              >+</button>
            </div>
          </div>
        </div>

        <div>
          <label className="text-label text-[10px] tracking-widest block mb-1">NOTES</label>
          <textarea
            value={route.notes ?? ''}
            onChange={e => actions.setRouteNotes(route.id, e.target.value)}
            placeholder="Caravan reports, ambush sites, tolls..."
            rows={3}
            className="w-full text-xs py-2 px-3 resize-none"
          />
        </div>
      </div>
    </Modal>
  )
}

function Field({ label, value }) {
  return (
    <div className="border border-pip-dim/30 rounded bg-panel-alt px-2 py-1.5">
      <div className="text-label text-[9px] tracking-widest opacity-80">{label}</div>
      <div className="text-pip text-xs tracking-wider truncate">{value}</div>
    </div>
  )
}

function ActionBtn({ label, onClick, accent = 'pip' }) {
  const accentCls = {
    pip:    'border-pip text-pip hover:bg-pip-dim/20',
    amber:  'border-amber text-amber hover:bg-amber-dim/20',
    orange: 'border-orange-400 text-orange-400 hover:bg-orange-900/20',
  }[accent] ?? 'border-pip text-pip hover:bg-pip-dim/20'
  return (
    <button onClick={onClick} className={`text-[10px] tracking-widest px-3 py-1.5 border rounded transition-colors ${accentCls}`}>
      {label}
    </button>
  )
}
