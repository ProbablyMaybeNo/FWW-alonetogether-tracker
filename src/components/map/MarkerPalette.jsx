import { MARKER_KINDS } from '../../data/campaignMap'

// Draggable palette: drag a kind from here onto the canvas to drop a marker.
// We rely on the HTML5 drag-and-drop dataTransfer string `marker:<kind>` and the
// canvas reads it on drop.
export default function MarkerPalette() {
  return (
    <div className="border border-pip-mid/40 rounded bg-panel">
      <div className="px-3 py-2 border-b border-pip-mid/30">
        <h3 className="text-amber text-xs tracking-widest font-bold">MARKERS</h3>
        <p className="text-muted/60 text-[10px] tracking-wider mt-0.5">Drag onto map · Right-click to remove</p>
      </div>
      <div className="p-2 grid grid-cols-3 gap-1.5">
        {MARKER_KINDS.map(m => (
          <div
            key={m.kind}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('text/plain', `marker:${m.kind}`)
              e.dataTransfer.effectAllowed = 'copy'
            }}
            className="flex items-center gap-1.5 border border-pip-dim/50 rounded px-1.5 py-1 bg-panel-alt hover:bg-pip-dim/20 transition-colors cursor-grab active:cursor-grabbing"
            title={`Drag to place ${m.label}`}
          >
            <span
              className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold shrink-0"
              style={{
                color: m.color,
                background: 'rgba(0,0,0,0.45)',
                border: `1px solid ${m.color}`,
                textShadow: `0 0 4px ${m.color}`,
              }}
            >
              {m.glyph}
            </span>
            <span className="text-pip text-[10px] tracking-wider truncate">{m.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
