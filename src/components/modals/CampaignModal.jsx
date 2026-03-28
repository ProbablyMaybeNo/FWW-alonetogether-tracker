import { useState, useEffect } from 'react'
import { X, Copy, RefreshCw, Check } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

export default function CampaignModal({ campaignId, onClose, onLeaveCampaign, onReset }) {
  const { user } = useAuth()
  const [campaign, setCampaign] = useState(null)
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [renaming, setRenaming] = useState(false)
  const [newName, setNewName] = useState('')
  const [renameLoading, setRenameLoading] = useState(false)
  const [resetConfirm, setResetConfirm] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function load() {
      const [{ data: camp }, { data: pl }] = await Promise.all([
        supabase.from('campaigns').select('*').eq('id', campaignId).single(),
        supabase.from('campaign_players').select('user_id, player_name').eq('campaign_id', campaignId),
      ])
      if (camp) { setCampaign(camp); setNewName(camp.name) }
      if (pl) setPlayers(pl)
      setLoading(false)
    }
    load()
  }, [campaignId])

  const isCreator = campaign?.created_by === user?.id

  async function handleRename(e) {
    e.preventDefault()
    if (!newName.trim()) return
    setRenameLoading(true)
    const { error } = await supabase.from('campaigns').update({ name: newName.trim() }).eq('id', campaignId)
    if (!error) { setCampaign(prev => ({ ...prev, name: newName.trim() })); setRenaming(false) }
    setRenameLoading(false)
  }

  async function handleNewCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    const newCode = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    const { error } = await supabase.from('campaigns').update({ invite_code: newCode }).eq('id', campaignId)
    if (!error) setCampaign(prev => ({ ...prev, invite_code: newCode }))
  }

  function copyCode() {
    navigator.clipboard.writeText(campaign.invite_code).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleReset() {
    await supabase.from('player_data').delete().eq('campaign_id', campaignId)
    await supabase.from('campaigns').update({ phase: 1, round: 0, battle_count: 0 }).eq('id', campaignId)
    setResetConfirm(false)
    onReset?.()
    onClose()
  }

  async function handleDelete() {
    setDeleteError('')
    try {
      // Delete child records first (in case DB lacks cascade)
      await supabase.from('player_data').delete().eq('campaign_id', campaignId)
      await supabase.from('campaign_players').delete().eq('campaign_id', campaignId)
      const { error } = await supabase.from('campaigns').delete().eq('id', campaignId)
      if (error) throw error
      onLeaveCampaign?.()
      onClose()
    } catch (e) {
      console.error('Delete campaign error:', e)
      setDeleteError(e?.message ?? 'Failed to delete. Check your permissions.')
    }
  }

  async function handleLeave() {
    await supabase.from('campaign_players').delete().eq('campaign_id', campaignId).eq('user_id', user.id)
    onLeaveCampaign?.()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }}>
      <div className="w-full max-w-sm bg-panel border border-pip-mid/50 rounded font-mono max-h-[90vh] overflow-y-auto" style={{ boxShadow: '0 0 30px var(--color-pip-glow)' }}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-pip-mid/30">
          <span className="text-pip text-xs font-bold tracking-widest">CAMPAIGN SETTINGS</span>
          <button onClick={onClose} className="text-muted hover:text-pip transition-colors"><X size={14} /></button>
        </div>

        {loading ? (
          <div className="p-6 text-center text-pip text-xs tracking-widest">LOADING...</div>
        ) : (
          <div className="p-5 space-y-5">
            {/* Campaign name */}
            <div>
              <div className="text-label text-xs tracking-wider mb-1">CAMPAIGN NAME</div>
              {renaming ? (
                <form onSubmit={handleRename} className="flex gap-2">
                  <input value={newName} onChange={e => setNewName(e.target.value)} className="flex-1 text-sm py-1.5 px-2" autoFocus />
                  <button type="submit" disabled={renameLoading} className="px-2 py-1 text-xs border border-pip text-pip rounded">{renameLoading ? '...' : 'SAVE'}</button>
                  <button type="button" onClick={() => setRenaming(false)} className="px-2 py-1 text-xs border border-muted/30 text-muted rounded hover:text-pip hover:border-pip">✕</button>
                </form>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-pip font-bold flex-1 text-sm">{campaign?.name}</span>
                  {isCreator && (
                    <button onClick={() => setRenaming(true)} className="text-xs text-pip border border-pip-mid/40 px-2 py-1 rounded hover:bg-pip-dim/20">RENAME</button>
                  )}
                </div>
              )}
            </div>

            {/* Invite code */}
            <div>
              <div className="text-label text-xs tracking-wider mb-1">INVITE CODE</div>
              <div className="flex items-center gap-3">
                <div className="text-amber font-bold text-2xl tracking-[0.35em] flex-1" style={{ textShadow: '0 0 14px var(--color-amber)' }}>
                  {campaign?.invite_code}
                </div>
                <button onClick={copyCode} className="p-1.5 text-pip border border-pip-mid/40 rounded hover:bg-pip-dim/20 transition-colors" title="Copy code">
                  {copied ? <Check size={13} className="text-pip" /> : <Copy size={13} />}
                </button>
                {isCreator && (
                  <button onClick={handleNewCode} className="p-1.5 text-pip border border-pip-mid/40 rounded hover:bg-pip-dim/20 transition-colors" title="Generate new code">
                    <RefreshCw size={13} />
                  </button>
                )}
              </div>
              <div className="text-pip text-xs mt-1">Share with players to invite them</div>
            </div>

            {/* Players */}
            <div>
              <div className="text-label text-xs tracking-wider mb-2">PLAYERS ({players.length})</div>
              <div className="space-y-1.5">
                {players.map(p => (
                  <div key={p.user_id} className="flex items-center gap-2 text-xs">
                    <span className="text-pip flex-1">{p.player_name || 'Unknown'}</span>
                    {p.user_id === campaign?.created_by && (
                      <span className="text-amber text-xs tracking-wider">GM</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Danger zone */}
            <div className="border-t border-pip-mid/20 pt-4 space-y-2">
              <div className="text-label text-xs tracking-wider mb-2">CAMPAIGN ACTIONS</div>

              {isCreator && !resetConfirm && (
                <button onClick={() => setResetConfirm(true)} className="w-full py-2 text-xs border border-amber/40 text-amber rounded hover:bg-amber/10 transition-colors">
                  RESET CAMPAIGN DATA
                </button>
              )}
              {resetConfirm && (
                <div className="space-y-2 border border-amber/30 rounded p-3 bg-amber/5">
                  <div className="text-amber text-xs">Reset all player data to defaults? Cannot be undone.</div>
                  <div className="flex gap-2">
                    <button onClick={handleReset} className="px-3 py-1.5 text-xs border border-amber text-amber rounded hover:bg-amber/10">CONFIRM RESET</button>
                    <button onClick={() => setResetConfirm(false)} className="px-3 py-1.5 text-xs border border-muted/30 text-muted rounded hover:text-pip hover:border-pip">CANCEL</button>
                  </div>
                </div>
              )}

              {!isCreator && (
                <button onClick={handleLeave} className="w-full py-2 text-xs border border-danger/40 text-danger rounded hover:bg-danger/10 transition-colors">
                  LEAVE CAMPAIGN
                </button>
              )}

              {isCreator && !deleteConfirm && (
                <button onClick={() => setDeleteConfirm(true)} className="w-full py-2 text-xs border border-danger/40 text-danger rounded hover:bg-danger/10 transition-colors">
                  DELETE CAMPAIGN
                </button>
              )}
              {deleteConfirm && (
                <div className="space-y-2 border border-danger/30 rounded p-3 bg-danger/5">
                  <div className="text-danger text-xs">Delete for ALL players? This cannot be undone.</div>
                  {deleteError && (
                    <div className="text-danger text-xs border border-danger/40 bg-danger/10 px-2 py-1.5 rounded">{deleteError}</div>
                  )}
                  <div className="flex gap-2">
                    <button onClick={handleDelete} className="px-3 py-1.5 text-xs border border-danger text-danger rounded hover:bg-danger/10">CONFIRM DELETE</button>
                    <button onClick={() => { setDeleteConfirm(false); setDeleteError('') }} className="px-3 py-1.5 text-xs border border-muted/30 text-muted rounded hover:text-pip hover:border-pip">CANCEL</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
