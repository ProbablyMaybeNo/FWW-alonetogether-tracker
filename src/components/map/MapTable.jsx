import { Trash2 } from 'lucide-react'
import { MARKER_KINDS } from '../../data/campaignMap'

const MARKER_INDEX = Object.fromEntries(MARKER_KINDS.map(m => [m.kind, m]))

// Auto-populating detail table. One row per placed icon; textual detail
// (owner/faction/rules/buffs/notes) lives under table[id], while name/colour
// live on the marker itself and mirror live onto the canvas. The map stays
// purely visual — this table is the edit surface.
//
// Selecting a row highlights its icon on the canvas and vice-versa (selectedId
// is lifted into CampaignMapPage).
export default function MapTable({
  markers,
  lines = [],
  table,
  canEdit,
  selectedId,
  onSelect,
  setMarkerColor,
  setMarkerLabel,
  setTableField,
  onRemoveMarker,
  onRemoveLine,
}) {
  if (!markers.length && !lines.length) {
    return (
      <div className="border border-pip-mid/40 rounded bg-panel">
        <div className="px-3 py-2 border-b border-pip-mid/30">
          <h3 className="text-amber text-xs tracking-widest font-bold">MAP TABLE</h3>
        </div>
        <p className="text-muted/60 text-[11px] tracking-wider px-3 py-4">
          {canEdit ? 'Place an icon on the map to add a location row.' : 'No locations yet.'}
        </p>
      </div>
    )
  }

  // Resolve a marker's display name for route "Connects" derivation.
  const nameFor = (id) => {
    const m = markers.find(mk => mk.id === id)
    if (!m) return '—'
    return m.label?.trim() || 'Unnamed location'
  }

  return (
    <div className="border border-pip-mid/40 rounded bg-panel">
      <div className="px-3 py-2 border-b border-pip-mid/30 flex items-center gap-2">
        <h3 className="text-amber text-xs tracking-widest font-bold">MAP TABLE</h3>
        <span className="text-muted/50 text-[10px] tracking-widest ml-auto">
          {markers.length} {markers.length === 1 ? 'LOCATION' : 'LOCATIONS'}
          {lines.length > 0 && <> · {lines.length} {lines.length === 1 ? 'ROUTE' : 'ROUTES'}</>}
        </span>
      </div>

      <div className="p-2 space-y-2">
        {markers.map(m => {
          const info = MARKER_INDEX[m.kind]
          const color = m.color ?? info?.color ?? '#00e676'
          const row = table?.[m.id] ?? {}
          const selected = selectedId === m.id
          return (
            <LocationRow
              key={m.id}
              marker={m}
              glyph={info?.glyph ?? '⬤'}
              color={color}
              row={row}
              selected={selected}
              canEdit={canEdit}
              onSelect={() => onSelect?.(selected ? null : m.id)}
              setMarkerColor={setMarkerColor}
              setMarkerLabel={setMarkerLabel}
              setTableField={setTableField}
              onRemoveMarker={onRemoveMarker}
            />
          )
        })}
      </div>

      {lines.length > 0 && (
        <>
          <div className="px-3 py-1.5 border-y border-pip-mid/30 bg-panel-alt/40">
            <h4 className="text-pip text-[11px] tracking-widest font-bold">ROUTES</h4>
          </div>
          <div className="p-2 space-y-2">
            {lines.map(l => {
              const row = table?.[l.id] ?? {}
              const selected = selectedId === l.id
              return (
                <RouteRow
                  key={l.id}
                  line={l}
                  row={row}
                  connects={`${nameFor(l.fromId)} → ${nameFor(l.toId)}`}
                  selected={selected}
                  canEdit={canEdit}
                  onSelect={() => onSelect?.(selected ? null : l.id)}
                  setTableField={setTableField}
                  onRemoveLine={onRemoveLine}
                />
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

function RouteRow({ line, row, connects, selected, canEdit, onSelect, setTableField, onRemoveLine }) {
  const id = line.id
  return (
    <div
      onClick={onSelect}
      className={`rounded border bg-panel-alt transition-colors cursor-pointer ${
        selected ? 'border-amber/70' : 'border-pip-dim/40 hover:border-pip-mid'
      }`}
      style={selected ? { boxShadow: '0 0 10px var(--color-amber-glow)' } : undefined}
    >
      <div className="flex items-center gap-2 px-2 py-1.5 border-b border-pip-dim/30">
        <span className="text-pip/70 text-[11px] shrink-0" aria-hidden>⎯</span>
        {canEdit ? (
          <input
            value={row.name ?? ''}
            onChange={e => setTableField(id, 'name', e.target.value)}
            onClick={e => e.stopPropagation()}
            placeholder="Route name"
            className="flex-1 min-w-0 text-xs !py-1 !px-2"
          />
        ) : (
          <span className="flex-1 min-w-0 text-pip text-xs tracking-wider truncate">
            {row.name || <span className="text-muted/50">Unnamed route</span>}
          </span>
        )}
        {canEdit && (
          <button
            onClick={e => { e.stopPropagation(); onRemoveLine(id) }}
            title="Delete this route + line"
            className="inline-flex items-center justify-center w-6 h-6 rounded border border-muted/40 text-muted hover:border-danger hover:text-danger transition-colors shrink-0"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>

      <div className="p-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="block">
          <span className="block text-muted/60 text-[10px] tracking-widest mb-0.5">CONNECTS</span>
          <p className="text-pip/90 text-xs tracking-wider break-words min-h-[1.25rem]">{connects}</p>
        </div>
        <Field label="Owner" value={row.owner} canEdit={canEdit}
          onChange={v => setTableField(id, 'owner', v)} />
        <Field label="Buffs" value={row.buffs} canEdit={canEdit} area
          onChange={v => setTableField(id, 'buffs', v)} className="sm:col-span-2" />
        <Field label="Notes" value={row.notes} canEdit={canEdit} area
          onChange={v => setTableField(id, 'notes', v)} className="sm:col-span-2" />
      </div>
    </div>
  )
}

function LocationRow({
  marker, glyph, color, row, selected, canEdit,
  onSelect, setMarkerColor, setMarkerLabel, setTableField, onRemoveMarker,
}) {
  const id = marker.id
  return (
    <div
      onClick={onSelect}
      className={`rounded border bg-panel-alt transition-colors cursor-pointer ${
        selected ? 'border-amber/70' : 'border-pip-dim/40 hover:border-pip-mid'
      }`}
      style={selected ? { boxShadow: '0 0 10px var(--color-amber-glow)' } : undefined}
    >
      {/* Header line: icon glyph + name + colour + delete */}
      <div className="flex items-center gap-2 px-2 py-1.5 border-b border-pip-dim/30">
        <span
          className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold shrink-0"
          style={{ color, background: 'rgba(0,0,0,0.45)', border: `1px solid ${color}`, textShadow: `0 0 4px ${color}` }}
        >
          {glyph}
        </span>
        {canEdit ? (
          <input
            value={marker.label ?? ''}
            onChange={e => setMarkerLabel(id, e.target.value)}
            onClick={e => e.stopPropagation()}
            placeholder="Location name"
            className="flex-1 min-w-0 text-xs !py-1 !px-2"
          />
        ) : (
          <span className="flex-1 min-w-0 text-pip text-xs tracking-wider truncate">
            {marker.label || <span className="text-muted/50">Unnamed location</span>}
          </span>
        )}
        {canEdit && (
          <>
            <input
              type="color"
              value={color}
              onChange={e => setMarkerColor(id, e.target.value)}
              onClick={e => e.stopPropagation()}
              title="Icon colour"
              className="w-6 h-6 !p-0.5 shrink-0 cursor-pointer"
            />
            <button
              onClick={e => { e.stopPropagation(); onRemoveMarker(id) }}
              title="Delete this location + its icon"
              className="inline-flex items-center justify-center w-6 h-6 rounded border border-muted/40 text-muted hover:border-danger hover:text-danger transition-colors shrink-0"
            >
              <Trash2 size={12} />
            </button>
          </>
        )}
      </div>

      {/* Detail fields */}
      <div className="p-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Field label="Owner / assignment" value={row.owner} canEdit={canEdit}
          onChange={v => setTableField(id, 'owner', v)} />
        <Field label="Faction" value={row.faction} canEdit={canEdit}
          onChange={v => setTableField(id, 'faction', v)} />
        <Field label="Rules" value={row.rules} canEdit={canEdit} area
          onChange={v => setTableField(id, 'rules', v)} className="sm:col-span-2" />
        <Field label="Buffs" value={row.buffs} canEdit={canEdit} area
          onChange={v => setTableField(id, 'buffs', v)} className="sm:col-span-2" />
        <Field label="Notes" value={row.notes} canEdit={canEdit} area
          onChange={v => setTableField(id, 'notes', v)} className="sm:col-span-2" />
      </div>
    </div>
  )
}

function Field({ label, value, canEdit, onChange, area, className = '' }) {
  return (
    <label className={`block ${className}`} onClick={e => e.stopPropagation()}>
      <span className="block text-muted/60 text-[10px] tracking-widest mb-0.5">{label.toUpperCase()}</span>
      {canEdit ? (
        area ? (
          <textarea
            value={value ?? ''}
            onChange={e => onChange(e.target.value)}
            rows={2}
            className="w-full text-xs resize-none !py-1 !px-2"
          />
        ) : (
          <input
            value={value ?? ''}
            onChange={e => onChange(e.target.value)}
            className="w-full text-xs !py-1 !px-2"
          />
        )
      ) : (
        <p className="text-pip/90 text-xs tracking-wider whitespace-pre-wrap break-words min-h-[1.25rem]">
          {value || <span className="text-muted/40">—</span>}
        </p>
      )}
    </label>
  )
}
