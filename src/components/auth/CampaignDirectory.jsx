import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { User, Plus, Users, ChevronRight, Trash2, LogIn } from 'lucide-react'
import AccountModal from '../modals/AccountModal'

export default function CampaignDirectory({ onEnterCampaign, onSolo }) {
  const { user, profile, signOut } = useAuth()
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [panel, setPanel] = useState(null) // null | 'create' | 'join'
  const [createName, setCreateName] = useState('')
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState('')
  const [newCampaign, setNewCampaign] = useState(null)
  const [joinCode, setJoinCode] = useState('')
  const [joinLoading, setJoinLoading] = useState(false)
  const [joinError, setJoinError] = useState('')
  const [showAccount, setShowAccount] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [deleteError, setDeleteError] = useState('')
  const [createSettings, setCreateSettings] = useState({
    settlementMode: 'alone-together',
    useEventCards: false,
    useQuests: true,
  })
  const [createPlayer, setCreatePlayer] = useState({ name: '', faction: '', leader: '', settlement: '' })
  const [joinPlayer, setJoinPlayer] = useState({ name: '', faction: '', leader: '', settlement: '' })

  useEffect(() => { fetchCampaigns() }, [])

  useEffect(() => {
    if (profile?.username) {
      setCreatePlayer(p => ({ ...p, name: p.name || profile.username }))
      setJoinPlayer(p => ({ ...p, name: p.name || profile.username }))
    }
  }, [profile?.username])

  async function fetchCampaigns() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('campaign_players')
        .select('campaign_id, campaigns(id, name, invite_code, phase, round, created_at, created_by)')
        .eq('user_id', user.id)
      if (!error && data) {
        const camps = data.map(r => r.campaigns).filter(Boolean)
        const counts = await Promise.all(camps.map(async (c) => {
          const { count } = await supabase
            .from('campaign_players')
            .select('*', { count: 'exact', head: true })
            .eq('campaign_id', c.id)
          return { id: c.id, count: count ?? 0 }
        }))
        const countMap = Object.fromEntries(counts.map(c => [c.id, c.count]))
        setCampaigns(camps.map(c => ({ ...c, playerCount: countMap[c.id] ?? 0 })))
      }
    } catch (e) {
      console.error('fetchCampaigns error:', e)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    setCreateError('')
    if (!createName.trim()) { setCreateError('Campaign name is required.'); return }
    setCreateLoading(true)
    try {
      const { data: camp, error: campErr } = await supabase
        .from('campaigns')
        .insert({ name: createName.trim(), created_by: user.id })
        .select()
        .single()
      if (campErr) throw campErr

      const { error: playerErr } = await supabase
        .from('campaign_players')
        .insert({ campaign_id: camp.id, user_id: user.id, player_name: profile?.username ?? 'Unknown' })
      if (playerErr) throw playerErr

      setNewCampaign(camp)
      localStorage.setItem('fww-pending-settings', JSON.stringify({ campaignId: camp.id, settings: createSettings }))
      localStorage.setItem('fww-pending-player', JSON.stringify({
        campaignId: camp.id,
        player: { ...createPlayer, campaignStart: new Date().toISOString() },
      }))
      fetchCampaigns()
    } catch (err) {
      setCreateError(err?.message ?? 'Failed to create campaign.')
    } finally {
      setCreateLoading(false)
    }
  }

  async function handleJoin(e) {
    e.preventDefault()
    setJoinError('')
    const code = joinCode.trim().toUpperCase()
    if (!code) { setJoinError('Invite code is required.'); return }
    setJoinLoading(true)
    try {
      const { data: camp, error: findErr } = await supabase
        .from('campaigns').select('*').eq('invite_code', code).single()
      if (findErr || !camp) throw new Error('Campaign not found. Check the invite code.')

      const { data: existing } = await supabase
        .from('campaign_players').select('id')
        .eq('campaign_id', camp.id).eq('user_id', user.id).maybeSingle()

      if (!existing) {
        const { error: joinErr } = await supabase
          .from('campaign_players')
          .insert({ campaign_id: camp.id, user_id: user.id, player_name: profile?.username ?? 'Unknown' })
        if (joinErr) throw joinErr
      }

      localStorage.setItem('fww-last-campaign', JSON.stringify({ id: camp.id, name: camp.name }))
      localStorage.setItem('fww-pending-player', JSON.stringify({
        campaignId: camp.id,
        player: { ...joinPlayer, campaignStart: new Date().toISOString() },
      }))
      onEnterCampaign(camp.id)
    } catch (err) {
      setJoinError(err?.message ?? 'Failed to join campaign.')
    } finally {
      setJoinLoading(false)
    }
  }

  async function handleLeaveOrDelete(camp) {
    setDeleteError('')
    try {
      if (camp.created_by === user.id) {
        // Creator: delete entire campaign (cascade handles players/data)
        const { error } = await supabase.from('campaigns').delete().eq('id', camp.id)
        if (error) throw error
      } else {
        // Member: just leave
        const { error } = await supabase.from('campaign_players')
          .delete().eq('campaign_id', camp.id).eq('user_id', user.id)
        if (error) throw error
      }
      setDeleteConfirm(null)
      fetchCampaigns()
    } catch (e) {
      console.error('leave/delete campaign error:', e)
      setDeleteError(e?.message ?? 'Failed to remove campaign.')
    }
  }

  function enterCampaign(camp) {
    localStorage.setItem('fww-last-campaign', JSON.stringify({ id: camp.id, name: camp.name }))
    onEnterCampaign(camp.id)
  }

  return (
    <div className="min-h-screen bg-terminal font-mono">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-pip-dim/50 bg-panel">
        <div>
          <div className="text-pip text-xl font-bold tracking-[0.3em]" style={{ textShadow: '0 0 12px var(--color-pip-glow)' }}>FWW</div>
          <div className="text-amber text-xs tracking-[0.2em]" style={{ textShadow: '0 0 8px var(--color-amber-glow)' }}>ALONE TOGETHER</div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-pip text-xs hidden sm:inline tracking-wider">{profile?.username}</span>
          <button
            onClick={() => setShowAccount(true)}
            className="p-2 text-pip border border-pip-mid/40 rounded hover:bg-pip-dim/20 hover:border-pip transition-colors"
            title="Account"
          >
            <User size={16} />
          </button>
          <button onClick={signOut} className="text-xs text-danger border border-danger/30 px-3 py-1.5 rounded hover:bg-danger/10 transition-colors">
            SIGN OUT
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6 space-y-5">
        {/* Title row */}
        <div className="flex items-center justify-between">
          <h1 className="text-pip text-sm tracking-widest font-bold" style={{ textShadow: '0 0 8px var(--color-pip-glow)' }}>
            CAMPAIGN DIRECTORY
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => setPanel(panel === 'join' ? null : 'join')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs border rounded transition-colors ${
                panel === 'join' ? 'border-amber text-amber bg-amber/10' : 'border-pip-mid/50 text-pip hover:bg-pip-dim/20 hover:border-pip'
              }`}
            >
              <LogIn size={12} /> JOIN CAMPAIGN
            </button>
            <button
              onClick={() => setPanel(panel === 'create' ? null : 'create')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs border rounded transition-colors ${
                panel === 'create' ? 'border-amber text-amber bg-amber/10' : 'border-amber text-amber hover:bg-amber/10'
              }`}
              style={{ boxShadow: '0 0 8px var(--color-amber-glow)' }}
            >
              <Plus size={12} /> NEW CAMPAIGN
            </button>
          </div>
        </div>

        {/* Create panel */}
        {panel === 'create' && !newCampaign && (
          <form onSubmit={handleCreate} className="border border-amber/40 rounded bg-panel p-4 space-y-3" style={{ boxShadow: '0 0 12px var(--color-amber-glow)' }}>
            <div className="text-amber text-xs tracking-widest font-bold">NEW CAMPAIGN</div>
            <div>
              <label className="text-label text-xs block mb-1 tracking-wider">CAMPAIGN NAME</label>
              <input
                value={createName}
                onChange={e => setCreateName(e.target.value)}
                placeholder="The Commonwealth Run"
                className="w-full text-sm py-2 px-3"
                disabled={createLoading}
                autoFocus
              />
            </div>
            {/* Campaign Settings */}
            <div className="space-y-3 border-t border-pip-dim/30 pt-3">
              <div className="text-pip text-xs tracking-widest font-bold">CAMPAIGN SETTINGS</div>

              {/* Settlement Mode */}
              <div>
                <label className="text-label text-xs block mb-1.5 tracking-wider">SETTLEMENT MODE</label>
                <div className="space-y-1">
                  {[
                    { value: 'alone-together', label: 'ALONE TOGETHER', desc: 'Basic settlements, Survival Mode persistence, loose "Beginners" campaign structure.' },
                    { value: 'basic', label: 'BASIC', desc: 'Restricted to Campaign Handbook rules — abstract settlement sheet, no Resources, no Settlement Events' },
                    { value: 'homestead', label: 'HOMESTEAD', desc: 'Full Homestead Expansion — Resources, Settlement Events, structure damage & repair, Defense Rating, expanded structure list' },
                  ].map(opt => (
                    <label key={opt.value} className="flex items-start gap-2 cursor-pointer group">
                      <input
                        type="radio"
                        name="settlementMode"
                        value={opt.value}
                        checked={createSettings.settlementMode === opt.value}
                        onChange={() => setCreateSettings(s => ({ ...s, settlementMode: opt.value }))}
                        className="mt-0.5 shrink-0"
                      />
                      <div>
                        <span className="text-pip text-xs font-bold group-hover:text-amber transition-colors">{opt.label}</span>
                        <span className="text-pip text-xs ml-2">{opt.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <div className="flex gap-4 flex-wrap">
                {[
                  { key: 'useEventCards', label: 'EVENT CARDS' },
                  { key: 'useQuests', label: 'QUEST CARDS' },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={createSettings[key]}
                      onChange={e => setCreateSettings(s => ({ ...s, [key]: e.target.checked }))}
                      className="shrink-0"
                    />
                    <span className="text-pip text-xs group-hover:text-amber transition-colors">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Player Info */}
            <div className="space-y-2 border-t border-pip-dim/30 pt-3">
              <div className="text-pip text-xs tracking-widest font-bold">YOUR PLAYER INFO</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-label text-xs block mb-1 tracking-wider">PLAYER NAME</label>
                  <input
                    value={createPlayer.name}
                    onChange={e => setCreatePlayer(p => ({ ...p, name: e.target.value }))}
                    placeholder="Vault Dweller"
                    className="w-full text-sm py-1.5 px-2"
                    disabled={createLoading}
                  />
                </div>
                <div>
                  <label className="text-label text-xs block mb-1 tracking-wider">SETTLEMENT NAME</label>
                  <input
                    value={createPlayer.settlement}
                    onChange={e => setCreatePlayer(p => ({ ...p, settlement: e.target.value }))}
                    placeholder="Sanctuary"
                    className="w-full text-sm py-1.5 px-2"
                    disabled={createLoading}
                  />
                </div>
                <div>
                  <label className="text-label text-xs block mb-1 tracking-wider">FACTION</label>
                  <input
                    value={createPlayer.faction}
                    onChange={e => setCreatePlayer(p => ({ ...p, faction: e.target.value }))}
                    placeholder="Brotherhood of Steel"
                    className="w-full text-sm py-1.5 px-2"
                    disabled={createLoading}
                  />
                </div>
                <div>
                  <label className="text-label text-xs block mb-1 tracking-wider">LEADER / SUB-FACTION</label>
                  <input
                    value={createPlayer.leader}
                    onChange={e => setCreatePlayer(p => ({ ...p, leader: e.target.value }))}
                    placeholder="Elder Maxson"
                    className="w-full text-sm py-1.5 px-2"
                    disabled={createLoading}
                  />
                </div>
              </div>
            </div>

            {createError && (
              <div className="text-danger text-xs border border-danger/40 bg-danger/10 px-3 py-2 rounded">{createError}</div>
            )}
            <div className="flex gap-2">
              <button type="submit" disabled={createLoading} className="px-4 py-2 border border-pip text-pip text-xs rounded hover:bg-pip-dim/20 transition-colors">
                {createLoading ? 'CREATING...' : 'CREATE'}
              </button>
              <button type="button" onClick={() => { setPanel(null); setCreateName('') }} className="px-4 py-2 border border-pip/30 text-pip text-xs rounded hover:text-amber hover:border-amber transition-colors">
                CANCEL
              </button>
            </div>
          </form>
        )}

        {/* Invite code reveal after creation */}
        {newCampaign && (
          <div className="border border-amber/60 rounded bg-panel p-5 space-y-4 text-center" style={{ boxShadow: '0 0 20px var(--color-amber-glow)' }}>
            <div className="text-amber text-xs tracking-widest font-bold">CAMPAIGN CREATED</div>
            <div className="text-pip text-xs">Share this invite code with your party:</div>
            <div className="text-amber font-bold py-3" style={{ fontSize: '3rem', letterSpacing: '0.4em', textShadow: '0 0 24px var(--color-amber)' }}>
              {newCampaign.invite_code}
            </div>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => { setNewCampaign(null); setPanel(null); setCreateName(''); localStorage.removeItem('fww-tour-done'); enterCampaign(newCampaign) }}
                className="px-5 py-2 border border-pip text-pip text-xs rounded hover:bg-pip-dim/20 transition-colors"
              >
                ENTER CAMPAIGN
              </button>
              <button
                onClick={() => { setNewCampaign(null); setPanel(null); setCreateName('') }}
                className="px-5 py-2 border border-pip/30 text-pip text-xs rounded hover:text-amber hover:border-amber transition-colors"
              >
                BACK TO DIRECTORY
              </button>
            </div>
          </div>
        )}

        {/* Join panel */}
        {panel === 'join' && (
          <form onSubmit={handleJoin} className="border border-pip-mid/50 rounded bg-panel p-4 space-y-3">
            <div className="text-pip text-xs tracking-widest font-bold">JOIN CAMPAIGN</div>
            <div>
              <label className="text-label text-xs block mb-1 tracking-wider">INVITE CODE</label>
              <input
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                maxLength={6}
                className="w-full text-center text-lg py-2 px-3"
                style={{ letterSpacing: '0.4em' }}
                disabled={joinLoading}
                autoFocus
              />
            </div>
            {/* Player Info for join */}
            <div className="space-y-2 border-t border-pip-dim/30 pt-2">
              <div className="text-pip text-xs tracking-widest font-bold">YOUR PLAYER INFO</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-label text-xs block mb-1 tracking-wider">PLAYER NAME</label>
                  <input
                    value={joinPlayer.name}
                    onChange={e => setJoinPlayer(p => ({ ...p, name: e.target.value }))}
                    placeholder="Vault Dweller"
                    className="w-full text-sm py-1.5 px-2"
                    disabled={joinLoading}
                  />
                </div>
                <div>
                  <label className="text-label text-xs block mb-1 tracking-wider">SETTLEMENT NAME</label>
                  <input
                    value={joinPlayer.settlement}
                    onChange={e => setJoinPlayer(p => ({ ...p, settlement: e.target.value }))}
                    placeholder="Sanctuary"
                    className="w-full text-sm py-1.5 px-2"
                    disabled={joinLoading}
                  />
                </div>
                <div>
                  <label className="text-label text-xs block mb-1 tracking-wider">FACTION</label>
                  <input
                    value={joinPlayer.faction}
                    onChange={e => setJoinPlayer(p => ({ ...p, faction: e.target.value }))}
                    placeholder="Brotherhood of Steel"
                    className="w-full text-sm py-1.5 px-2"
                    disabled={joinLoading}
                  />
                </div>
                <div>
                  <label className="text-label text-xs block mb-1 tracking-wider">LEADER / SUB-FACTION</label>
                  <input
                    value={joinPlayer.leader}
                    onChange={e => setJoinPlayer(p => ({ ...p, leader: e.target.value }))}
                    placeholder="Elder Maxson"
                    className="w-full text-sm py-1.5 px-2"
                    disabled={joinLoading}
                  />
                </div>
              </div>
            </div>

            {joinError && (
              <div className="text-danger text-xs border border-danger/40 bg-danger/10 px-3 py-2 rounded">{joinError}</div>
            )}
            <div className="flex gap-2">
              <button type="submit" disabled={joinLoading} className="px-4 py-2 border border-pip text-pip text-xs rounded hover:bg-pip-dim/20 transition-colors">
                {joinLoading ? 'JOINING...' : 'JOIN'}
              </button>
              <button type="button" onClick={() => { setPanel(null); setJoinCode('') }} className="px-4 py-2 border border-pip/30 text-pip text-xs rounded hover:text-amber hover:border-amber transition-colors">
                CANCEL
              </button>
            </div>
          </form>
        )}

        {/* Campaign list */}
        <div className="space-y-2">
          {loading ? (
            <div className="text-pip text-xs text-center py-10 tracking-widest">LOADING CAMPAIGNS...</div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-12 border border-pip-mid/20 rounded bg-panel">
              <div className="text-pip text-sm tracking-widest mb-2">NO CAMPAIGNS YET</div>
              <div className="text-pip text-xs">Create a new campaign or join one with an invite code.</div>
            </div>
          ) : (
            campaigns.map(camp => (
              <div key={camp.id} className="border border-pip-mid/40 rounded bg-panel hover:border-pip/60 transition-colors group">
                {deleteConfirm === camp.id ? (
                  <div className="flex items-center gap-3 px-4 py-3 flex-wrap">
                    <span className="text-danger text-xs flex-1">
                      {deleteError || (camp.created_by === user.id ? 'Delete this campaign for ALL players?' : 'Leave this campaign?')}
                    </span>
                    <div className="flex gap-2">
                      <button onClick={() => handleLeaveOrDelete(camp)} className="px-3 py-1.5 text-xs border border-danger text-danger rounded hover:bg-danger/10 transition-colors">CONFIRM</button>
                      <button onClick={() => { setDeleteConfirm(null); setDeleteError('') }} className="px-3 py-1.5 text-xs border border-pip/30 text-pip rounded hover:text-amber hover:border-amber transition-colors">CANCEL</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <button onClick={() => enterCampaign(camp)} className="flex-1 flex items-center gap-4 text-left min-w-0">
                      <div className="flex-1 min-w-0">
                        <div className="text-pip text-sm font-bold truncate">{camp.name}</div>
                        <div className="text-pip text-xs mt-0.5 flex items-center gap-3">
                          <span>Phase {camp.phase} · Round {camp.round}</span>
                          <span className="hidden sm:inline text-pip">
                            {camp.created_at ? new Date(camp.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                          </span>
                        </div>
                      </div>
                      <div className="hidden sm:flex items-center gap-1 text-pip text-xs shrink-0">
                        <Users size={11} />
                        <span>{camp.playerCount}</span>
                      </div>
                      <ChevronRight size={14} className="text-pip shrink-0" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(camp.id)}
                      className="p-1.5 text-pip-mid hover:text-danger transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                      title={camp.created_by === user.id ? 'Delete campaign' : 'Leave campaign'}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Solo option */}
        <div className="flex items-center gap-4 pt-2">
          <div className="flex-1 h-px bg-pip-dim/30" />
          <button onClick={onSolo} className="text-xs text-pip hover:text-amber transition-colors px-4 py-2 border border-pip/30 rounded hover:border-amber">
            PLAY SOLO (LOCAL ONLY)
          </button>
          <div className="flex-1 h-px bg-pip-dim/30" />
        </div>
      </div>

      {showAccount && <AccountModal onClose={() => setShowAccount(false)} />}
    </div>
  )
}
