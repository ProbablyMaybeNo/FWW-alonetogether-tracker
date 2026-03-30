import { useState } from 'react'
import { X, Save, RotateCcw, Trash2, Users } from 'lucide-react'
import { useCampaign } from '../../context/CampaignContext'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

const STORAGE_KEY = 'fww-snapshots'
const MAX_SNAPSHOTS = 15

function loadSnapshots() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveSnapshots(snaps) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(snaps)) } catch {}
}

export default function SnapshotModal({ campaignId, onClose }) {
  const { state, setState } = useCampaign()
  const { user } = useAuth()
  const [snapshots, setSnapshots] = useState(loadSnapshots)
  const [nameInput, setNameInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [restoreConfirm, setRestoreConfirm] = useState(null) // snapshot id

  async function handleSave() {
    setSaving(true)
    const name = nameInput.trim() || `Snapshot ${new Date().toLocaleString()}`

    // Fetch all players' data from Supabase if online
    let allPlayers = []
    if (supabase && campaignId) {
      try {
        const { data: pd } = await supabase
          .from('player_data')
          .select('user_id, caps, roster, settlement, item_pool, boost_hand, boost_deck, boost_discard, player_info')
          .eq('campaign_id', campaignId)
        if (pd) allPlayers = pd
      } catch (e) {
        console.error('snapshot fetch error:', e)
      }
    }

    // Always include current user's local state (most up-to-date)
    const myEntry = {
      user_id: user?.id ?? 'solo',
      caps: state.caps ?? 0,
      roster: state.roster ?? [],
      settlement: state.settlement ?? { structures: [], landPurchased: false },
      item_pool: state.itemPool ?? { items: [] },
      boost_hand: state.boostHand ?? [],
      boost_deck: state.boostDeck ?? [],
      boost_discard: state.boostDiscard ?? [],
      player_info: state.player ?? {},
    }
    // Replace or add current user's entry with the local (fresher) version
    const otherPlayers = allPlayers.filter(p => p.user_id !== myEntry.user_id)
    const players = [myEntry, ...otherPlayers]

    const snap = {
      id: Date.now(),
      name,
      savedAt: new Date().toISOString(),
      campaignId: campaignId ?? null,
      players,
    }

    const updated = [snap, ...snapshots].slice(0, MAX_SNAPSHOTS)
    setSnapshots(updated)
    saveSnapshots(updated)
    setNameInput('')
    setSaving(false)
  }

  function handleRestore(snap) {
    // Find this user's entry in the snapshot
    const myEntry = snap.players?.find(p => p.user_id === (user?.id ?? 'solo'))
      ?? snap.players?.[0]
    if (!myEntry) { setRestoreConfirm(null); return }

    setState(prev => ({
      ...prev,
      caps: myEntry.caps ?? prev.caps,
      roster: myEntry.roster ?? prev.roster,
      settlement: myEntry.settlement ?? prev.settlement,
      itemPool: myEntry.item_pool ?? prev.itemPool,
      boostHand: myEntry.boost_hand ?? [],
      boostDeck: myEntry.boost_deck ?? [],
      boostDiscard: myEntry.boost_discard ?? [],
    }))
    setRestoreConfirm(null)
    onClose()
  }

  function handleDelete(id) {
    const updated = snapshots.filter(s => s.id !== id)
    setSnapshots(updated)
    saveSnapshots(updated)
  }

  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleString(undefined, {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    } catch { return iso }
  }

  function snapSummary(snap) {
    if (!snap.players?.length) return '—'
    const me = snap.players.find(p => p.user_id === (user?.id ?? 'solo'))
    const myName = me?.player_info?.name || 'You'
    const myUnits = me?.roster?.length ?? 0
    const myStructures = me?.settlement?.structures?.length ?? 0
    const myCaps = me?.caps ?? 0
    const others = snap.players.length - 1
    return `${myName}: ${myCaps.toLocaleString()}c · ${myUnits} units · ${myStructures} structures${others > 0 ? ` · +${others} other player${others > 1 ? 's' : ''}` : ''}`
  }

  const myRoster = state.roster ?? []
  const myStructures = state.settlement?.structures ?? []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-panel border border-pip-mid/50 rounded-lg w-full max-w-lg flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-pip-mid/30 shrink-0">
          <div>
            <div className="text-pip text-sm font-bold tracking-widest">SNAPSHOTS</div>
            <div className="text-muted text-xs mt-0.5">
              {campaignId ? 'Saves your data + all other players in the campaign' : 'Save your roster & settlement state to restore later'}
            </div>
          </div>
          <button onClick={onClose} className="text-muted hover:text-pip transition-colors ml-4 shrink-0">
            <X size={16} />
          </button>
        </div>

        {/* Save new */}
        <div className="px-5 py-4 border-b border-pip-mid/20 shrink-0">
          <div className="text-xs text-muted tracking-wider mb-2">SAVE CURRENT STATE</div>
          <div className="flex gap-2">
            <input
              type="text"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="Snapshot name (optional)"
              className="flex-1 text-xs py-2 px-3"
            />
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 border border-pip text-pip text-xs font-bold tracking-wider rounded hover:bg-pip-dim/20 transition-colors disabled:opacity-50"
              style={{ boxShadow: '0 0 6px var(--color-pip-glow)' }}
            >
              <Save size={12} /> {saving ? 'SAVING...' : 'SAVE'}
            </button>
          </div>
          <div className="flex items-center gap-1.5 text-muted/60 text-xs mt-1.5">
            {campaignId && <Users size={10} />}
            <span>
              {(state.caps ?? 0).toLocaleString()}c · {myRoster.length} units · {myStructures.length} structures
              {campaignId ? ' · all players included' : ''}
            </span>
          </div>
        </div>

        {/* Snapshot list */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
          {snapshots.length === 0 ? (
            <p className="text-muted text-xs text-center py-6 italic">No snapshots saved yet.</p>
          ) : (
            snapshots.map(snap => (
              <div key={snap.id} className="border border-pip-dim/40 rounded bg-panel-light px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-pip text-xs font-bold truncate">{snap.name}</div>
                    <div className="text-muted text-xs mt-0.5">{formatDate(snap.savedAt)}</div>
                    <div className="text-muted/70 text-xs mt-0.5">{snapSummary(snap)}</div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {restoreConfirm === snap.id ? (
                      <>
                        <button
                          onClick={() => handleRestore(snap)}
                          className="text-xs px-2 py-1 border border-amber text-amber rounded font-bold hover:bg-amber/10 transition-colors"
                        >CONFIRM</button>
                        <button
                          onClick={() => setRestoreConfirm(null)}
                          className="text-xs px-2 py-1 border border-muted/40 text-muted rounded hover:text-pip transition-colors"
                        >CANCEL</button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setRestoreConfirm(snap.id)}
                          className="flex items-center gap-1 text-xs px-2 py-1 border border-pip/50 text-pip rounded hover:bg-pip-dim/20 transition-colors font-bold"
                        >
                          <RotateCcw size={11} /> RESTORE
                        </button>
                        <button
                          onClick={() => handleDelete(snap.id)}
                          className="p-1 text-muted hover:text-danger transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {restoreConfirm === snap.id && (
                  <div className="mt-2 text-xs text-amber border-t border-amber/20 pt-2">
                    Restores your roster, settlement, caps, and item pool from this snapshot. Continue?
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="px-5 py-3 border-t border-pip-mid/20 shrink-0">
          <p className="text-muted/50 text-xs">Stored locally in your browser. Up to {MAX_SNAPSHOTS} snapshots.</p>
        </div>
      </div>
    </div>
  )
}
