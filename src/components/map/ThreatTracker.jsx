import { FACTIONS, THREAT_FACTIONS } from '../../data/campaignMap'

export default function ThreatTracker({ threats, setThreat }) {
  return (
    <div className="border border-pip-mid/40 rounded bg-panel">
      <div className="px-3 py-2 border-b border-pip-mid/30">
        <h3 className="text-amber text-xs tracking-widest font-bold">FACTION THREAT</h3>
        <p className="text-muted/60 text-[10px] tracking-wider mt-0.5">0 quiet · 5 raid imminent</p>
      </div>
      <div className="p-2 space-y-1.5">
        {THREAT_FACTIONS.map(fac => {
          const info = FACTIONS[fac]
          const lvl = threats?.[fac] ?? 0
          return (
            <div key={fac} className="flex items-center gap-2 text-[11px]">
              <span
                className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold shrink-0"
                style={{
                  color: info?.color ?? '#fff',
                  background: 'rgba(0,0,0,0.45)',
                  border: `1px solid ${info?.color ?? '#fff'}`,
                  textShadow: `0 0 4px ${info?.color ?? '#fff'}`,
                }}
              >
                {info?.label?.[0] ?? '?'}
              </span>
              <span className="text-pip flex-1 truncate tracking-wider">{info?.label ?? fac}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setThreat(fac, lvl - 1)}
                  disabled={lvl <= 0}
                  className="w-5 h-5 border border-muted/40 rounded text-muted hover:text-pip hover:border-pip disabled:opacity-30 text-xs leading-none"
                >−</button>
                <div className="flex items-center gap-0.5 px-1" aria-label={`Threat level ${lvl}`}>
                  {[1,2,3,4,5].map(n => (
                    <span
                      key={n}
                      className="block w-1.5 h-3 rounded-sm"
                      style={{
                        background: n <= lvl ? (info?.color ?? '#fff') : 'transparent',
                        border: `1px solid ${info?.color ?? '#fff'}`,
                        opacity: n <= lvl ? 1 : 0.35,
                        boxShadow: n <= lvl ? `0 0 4px ${info?.color ?? '#fff'}` : 'none',
                      }}
                    />
                  ))}
                </div>
                <button
                  onClick={() => setThreat(fac, lvl + 1)}
                  disabled={lvl >= 5}
                  className="w-5 h-5 border border-muted/40 rounded text-muted hover:text-pip hover:border-pip disabled:opacity-30 text-xs leading-none"
                >+</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
