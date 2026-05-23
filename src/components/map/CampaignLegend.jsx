import { TERRITORY_TYPES } from '../../data/campaignMap'

const STATE_ROWS = [
  { state: 'hidden',     color: '#1a261a', label: 'Hidden — fog of war' },
  { state: 'rumored',    color: '#4db87a', label: 'Rumored — intel only' },
  { state: 'revealed',   color: '#4db87a', label: 'Revealed — sighted' },
  { state: 'explored',   color: '#00e676', label: 'Explored — scouted' },
  { state: 'controlled', color: '#ffd700', label: 'Controlled — claimed' },
  { state: 'contested',  color: '#ff9100', label: 'Contested — under fire' },
  { state: 'ruined',     color: '#5a4a30', label: 'Ruined — burned out' },
  { state: 'threatened', color: '#ff3c3c', label: 'Threatened — incoming raid' },
]

export default function CampaignLegend() {
  return (
    <div className="border border-pip-mid/40 rounded bg-panel">
      <div className="px-3 py-2 border-b border-pip-mid/30">
        <h3 className="text-amber text-xs tracking-widest font-bold">LEGEND</h3>
      </div>
      <div className="p-2 space-y-2">
        <div>
          <div className="text-pip text-[10px] tracking-widest mb-1 opacity-70">STATE</div>
          <div className="grid grid-cols-1 gap-0.5">
            {STATE_ROWS.map(r => (
              <div key={r.state} className="flex items-center gap-2 text-[10px]">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: r.color, boxShadow: `0 0 4px ${r.color}` }}
                />
                <span className="text-pip tracking-wider">{r.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="border-t border-pip-mid/20 pt-2">
          <div className="text-pip text-[10px] tracking-widest mb-1 opacity-70">TYPE</div>
          <div className="grid grid-cols-2 gap-0.5">
            {Object.entries(TERRITORY_TYPES).map(([key, t]) => (
              <div key={key} className="flex items-center gap-1.5 text-[10px]">
                <span className="text-pip font-bold w-3 text-center">{t.glyph}</span>
                <span className="text-muted tracking-wider">{t.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
