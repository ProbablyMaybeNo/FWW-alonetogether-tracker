import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

const FACTIONS = [
  'Arcadia Renegades', 'Brotherhood of Steel', "Caesar's Legion",
  'Children of Atom', 'Creatures', 'Cult of the Mothman', 'Enclave',
  'Gunners', 'Institute', 'New California Republic', 'RPG Archetypes',
  'Raiders', 'Railroad', 'Robots', 'Super Mutants', 'Survivors',
  'The Harbormen', 'The Scorched', 'Trappers', 'Zetan',
]

export default function CampaignLobby({ onEnterCampaign, onSolo }) {
  const { user, profile, signOut } = useAuth()

  const [panel, setPanel] = useState(null) // null | 'create' | 'join'
  const [createName, setCreateName] = useState('')
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState('')
  const [newCampaign, setNewCampaign] = useState(null)

  const [joinCode, setJoinCode] = useState('')
  const [joinLoading, setJoinLoading] = useState(false)
  const [joinError, setJoinError] = useState('')

  const [campaigns, setCampaigns] = useState([])
  const [campaignsLoading, setCampaignsLoading] = useState(true)
  const [lastCampaign, setLastCampaign] = useState(null)

  // Player setup step: shown after create or first-time join
  const [playerSetup, setPlayerSetup] = useState(null) // { campaignId } | null
  const [playerName, setPlayerName] = useState(profile?.username ?? '')
  const [playerSettlement, setPlayerSettlement] = useState('')
  const [playerFaction, setPlayerFaction] = useState('')

  useEffect(() => {
    const stored = localStorage.getItem('fww-last-campaign')
    if (stored) {
      try { setLastCampaign(JSON.parse(stored)) } catch { /* ignore */ }
    }
    fetchCampaigns()
  }, [])

  async function fetchCampaigns() {
    setCampaignsLoading(true)
    try {
      const { data, error } = await supabase
        .from('campaign_players')
        .select('campaign_id, campaigns(id, name, invite_code, phase, round)')
        .eq('user_id', user.id)
      if (!error && data) {
        setCampaigns(data.map(r => r.campaigns).filter(Boolean))
      }
    } catch (e) {
      console.error('fetchCampaigns error:', e)
    } finally {
      setCampaignsLoading(false)
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
        .insert({ name: createName.trim(), created_by: user.id, phase: 1, round: 0, battle_count: 0 })
        .select()
        .single()
      if (campErr) throw campErr

      const { error: playerErr } = await supabase
        .from('campaign_players')
        .insert({ campaign_id: camp.id, user_id: user.id, player_name: profile?.username ?? 'Unknown' })
      if (playerErr) throw playerErr

      localStorage.setItem('fww-last-campaign', JSON.stringify({ id: camp.id, name: camp.name }))
      setNewCampaign(camp)
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
        .from('campaigns')
        .select('*')
        .eq('invite_code', code)
        .single()
      if (findErr || !camp) throw new Error('Campaign not found. Check the invite code.')

      const { data: existing } = await supabase
        .from('campaign_players')
        .select('id')
        .eq('campaign_id', camp.id)
        .eq('user_id', user.id)
        .single()

      if (!existing) {
        const { error: joinErr } = await supabase
          .from('campaign_players')
          .insert({ campaign_id: camp.id, user_id: user.id, player_name: profile?.username ?? 'Unknown' })
        if (joinErr) throw joinErr
      }

      localStorage.setItem('fww-last-campaign', JSON.stringify({ id: camp.id, name: camp.name }))
      // Show player setup if first time joining (no existing record)
      if (!existing) {
        setPlayerSetup({ campaignId: camp.id })
        setPanel(null)
      } else {
        onEnterCampaign(camp.id)
      }
    } catch (err) {
      setJoinError(err?.message ?? 'Failed to join campaign.')
    } finally {
      setJoinLoading(false)
    }
  }

  function enterCampaign(campaignId) {
    const camp = campaigns.find(c => c.id === campaignId)
    if (camp) localStorage.setItem('fww-last-campaign', JSON.stringify({ id: camp.id, name: camp.name }))
    onEnterCampaign(campaignId)
  }

  function handlePlayerSetupSubmit(e) {
    e.preventDefault()
    const cid = playerSetup?.campaignId ?? newCampaign?.id
    if (!cid) return
    // Save pending player data — picked up by useCampaignSync on first load
    localStorage.setItem('fww-pending-player', JSON.stringify({
      campaignId: cid,
      player: { name: playerName.trim(), settlement: playerSettlement.trim(), faction: playerFaction },
    }))
    onEnterCampaign(cid)
  }

  // Player setup screen (shown after create or first join)
  if (playerSetup || newCampaign) {
    const isAfterCreate = !!newCampaign
    return (
      <div style={s.root}>
        <div style={s.card}>
          <div style={s.header}>
            <div style={s.logo}>FWW</div>
            <div style={s.subtitle}>ALONE TOGETHER</div>
          </div>

          <div style={{ color: 'var(--color-amber)', fontSize: '0.65rem', letterSpacing: '0.2em', textAlign: 'center', marginTop: '-0.25rem' }}>
            {isAfterCreate ? `CAMPAIGN CREATED — ${newCampaign.name}` : 'CAMPAIGN JOINED'}
          </div>

          {isAfterCreate && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: 'var(--color-muted)', fontSize: '0.6rem', letterSpacing: '0.1em', marginBottom: '0.35rem' }}>
                Share this invite code with your party:
              </div>
              <div style={s.inviteCode}>{newCampaign.invite_code}</div>
            </div>
          )}

          <form onSubmit={handlePlayerSetupSubmit} style={s.panel}>
            <div style={s.panelTitle}>SET UP YOUR CHARACTER</div>

            <label style={s.label}>PLAYER NAME</label>
            <input
              style={s.input}
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              placeholder="Your name"
              spellCheck={false}
            />

            <label style={s.label}>SETTLEMENT NAME</label>
            <input
              style={s.input}
              value={playerSettlement}
              onChange={e => setPlayerSettlement(e.target.value)}
              placeholder="Your settlement"
              spellCheck={false}
            />

            <label style={s.label}>FACTION</label>
            <select
              style={{ ...s.input, cursor: 'pointer' }}
              value={playerFaction}
              onChange={e => setPlayerFaction(e.target.value)}
            >
              <option value="">Select faction...</option>
              {FACTIONS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>

            <button style={s.submitBtn} type="submit">
              ENTER CAMPAIGN
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div style={s.root}>
      <div style={s.card}>
        <div style={s.header}>
          <div style={s.logo}>FWW</div>
          <div style={s.subtitle}>ALONE TOGETHER</div>
        </div>

        <div style={s.userRow}>
          <span style={s.userLabel}>LOGGED IN AS</span>
          <span style={s.username}>{profile?.username ?? user?.email}</span>
          <button style={s.signOutBtn} onClick={signOut} type="button">SIGN OUT</button>
        </div>

        {lastCampaign && campaigns.find(c => c.id === lastCampaign.id) && (
          <div style={s.section}>
            <div style={s.sectionTitle}>RECENT</div>
            <button style={s.rejoinBtn} onClick={() => enterCampaign(lastCampaign.id)} type="button">
              REJOIN — {lastCampaign.name}
            </button>
          </div>
        )}

        <div style={s.section}>
          <div style={s.sectionTitle}>MY CAMPAIGNS</div>
          {campaignsLoading ? (
            <div style={s.muted}>Loading...</div>
          ) : campaigns.length === 0 ? (
            <div style={s.muted}>No campaigns yet.</div>
          ) : (
            <div style={s.campaignList}>
              {campaigns.map(c => (
                <button key={c.id} style={s.campaignBtn} onClick={() => enterCampaign(c.id)} type="button">
                  <span style={s.campName}>{c.name}</span>
                  <span style={s.campMeta}>Phase {c.phase ?? 1} · Round {c.round ?? 0}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={s.actions}>
          <button style={s.actionBtn} onClick={() => setPanel(panel === 'create' ? null : 'create')} type="button">
            {panel === 'create' ? 'CANCEL' : '+ CREATE CAMPAIGN'}
          </button>
          <button style={s.actionBtn} onClick={() => setPanel(panel === 'join' ? null : 'join')} type="button">
            {panel === 'join' ? 'CANCEL' : 'JOIN CAMPAIGN'}
          </button>
        </div>

        {panel === 'create' && (
          <form onSubmit={handleCreate} style={s.panel}>
            <div style={s.panelTitle}>NEW CAMPAIGN</div>
            <label style={s.label}>CAMPAIGN NAME</label>
            <input
              style={s.input}
              value={createName}
              onChange={e => setCreateName(e.target.value)}
              placeholder="The Commonwealth Run"
              disabled={createLoading}
              spellCheck={false}
            />
            {createError && <div style={s.error}>{createError}</div>}
            <button style={{ ...s.submitBtn, ...(createLoading ? s.disabled : {}) }} type="submit" disabled={createLoading}>
              {createLoading ? 'CREATING...' : 'CREATE'}
            </button>
          </form>
        )}

        {panel === 'join' && (
          <form onSubmit={handleJoin} style={s.panel}>
            <div style={s.panelTitle}>JOIN CAMPAIGN</div>
            <label style={s.label}>INVITE CODE</label>
            <input
              style={{ ...s.input, textTransform: 'uppercase', letterSpacing: '0.3em', textAlign: 'center' }}
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={6}
              disabled={joinLoading}
              spellCheck={false}
            />
            {joinError && <div style={s.error}>{joinError}</div>}
            <button style={{ ...s.submitBtn, ...(joinLoading ? s.disabled : {}) }} type="submit" disabled={joinLoading}>
              {joinLoading ? 'JOINING...' : 'JOIN'}
            </button>
          </form>
        )}

        <div style={s.divider}>
          <span style={s.dividerLine} />
          <span style={s.dividerText}>OR</span>
          <span style={s.dividerLine} />
        </div>

        <button style={s.soloBtn} onClick={onSolo} type="button">SOLO PLAY (LOCAL ONLY)</button>
        <div style={s.soloNote}>No sync — uses this device only</div>
      </div>
    </div>
  )
}

const s = {
  root: { minHeight: '100vh', background: 'var(--color-terminal)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-family-mono)', padding: '1rem' },
  card: { width: '100%', maxWidth: '420px', background: 'var(--color-panel)', border: '1px solid var(--color-pip-dim)', boxShadow: '0 0 30px var(--color-pip-glow), 0 0 60px rgba(0,0,0,0.8)', padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' },
  header: { textAlign: 'center', borderBottom: '1px solid var(--color-pip-dim)', paddingBottom: '1rem' },
  logo: { color: 'var(--color-pip)', fontSize: '2rem', fontWeight: 'bold', letterSpacing: '0.4em', textShadow: '0 0 20px var(--color-pip)', lineHeight: 1 },
  subtitle: { color: 'var(--color-amber)', fontSize: '0.65rem', letterSpacing: '0.25em', marginTop: '0.25rem' },
  userRow: { display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', borderBottom: '1px solid var(--color-pip-dim)', paddingBottom: '1rem' },
  userLabel: { color: 'var(--color-muted)', fontSize: '0.6rem', letterSpacing: '0.15em' },
  username: { color: 'var(--color-pip)', fontSize: '0.8rem', flex: 1 },
  signOutBtn: { background: 'transparent', border: '1px solid var(--color-pip-dim)', color: 'var(--color-muted)', fontFamily: 'var(--font-family-mono)', fontSize: '0.6rem', letterSpacing: '0.1em', padding: '0.25rem 0.5rem', cursor: 'pointer' },
  section: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  sectionTitle: { color: 'var(--color-muted)', fontSize: '0.6rem', letterSpacing: '0.2em' },
  muted: { color: 'var(--color-muted)', fontSize: '0.7rem' },
  campaignList: { display: 'flex', flexDirection: 'column', gap: '0.35rem' },
  campaignBtn: { background: 'var(--color-panel-light)', border: '1px solid var(--color-pip-dim)', color: 'var(--color-pip)', fontFamily: 'var(--font-family-mono)', padding: '0.6rem 0.75rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left', width: '100%' },
  campName: { fontSize: '0.8rem' },
  campMeta: { fontSize: '0.6rem', color: 'var(--color-muted)' },
  rejoinBtn: { background: 'var(--color-amber-dim)', border: '1px solid var(--color-amber)', color: 'var(--color-amber)', fontFamily: 'var(--font-family-mono)', fontSize: '0.7rem', letterSpacing: '0.1em', padding: '0.65rem', cursor: 'pointer', width: '100%' },
  actions: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' },
  actionBtn: { background: 'transparent', border: '1px solid var(--color-pip-dim)', color: 'var(--color-pip)', fontFamily: 'var(--font-family-mono)', fontSize: '0.65rem', letterSpacing: '0.1em', padding: '0.65rem 0.5rem', cursor: 'pointer', transition: 'background 0.15s' },
  panel: { background: 'var(--color-panel-alt)', border: '1px solid var(--color-pip-dim)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  panelTitle: { color: 'var(--color-pip)', fontSize: '0.65rem', letterSpacing: '0.2em', marginBottom: '0.25rem' },
  label: { color: 'var(--color-muted)', fontSize: '0.6rem', letterSpacing: '0.15em' },
  input: { background: 'var(--color-terminal)', border: '1px solid var(--color-pip-dim)', color: 'var(--color-pip)', fontFamily: 'var(--font-family-mono)', fontSize: '0.85rem', padding: '0.55rem 0.75rem', outline: 'none', width: '100%', boxSizing: 'border-box' },
  error: { background: 'var(--color-danger-dim)', border: '1px solid var(--color-danger)', color: 'var(--color-danger)', fontSize: '0.65rem', padding: '0.4rem 0.6rem' },
  submitBtn: { background: 'var(--color-pip-dim)', border: '1px solid var(--color-pip)', color: 'var(--color-pip)', fontFamily: 'var(--font-family-mono)', fontSize: '0.7rem', letterSpacing: '0.15em', padding: '0.65rem', cursor: 'pointer', textShadow: '0 0 8px var(--color-pip)', marginTop: '0.25rem', width: '100%' },
  disabled: { opacity: 0.5, cursor: 'not-allowed' },
  inviteCode: { color: 'var(--color-amber)', fontSize: '2rem', letterSpacing: '0.4em', textAlign: 'center', textShadow: '0 0 20px var(--color-amber)', padding: '0.5rem 0', border: '1px solid var(--color-amber-dim)', background: 'var(--color-amber-dim)', margin: '0.25rem 0' },
  divider: { display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '-0.25rem' },
  dividerLine: { flex: 1, height: '1px', background: 'var(--color-pip-dim)', display: 'block' },
  dividerText: { color: 'var(--color-muted)', fontSize: '0.6rem', letterSpacing: '0.2em' },
  soloBtn: { background: 'transparent', border: '1px solid var(--color-pip-dim)', color: 'var(--color-muted)', fontFamily: 'var(--font-family-mono)', fontSize: '0.7rem', letterSpacing: '0.15em', padding: '0.65rem', cursor: 'pointer', width: '100%' },
  soloNote: { color: 'var(--color-pip-dim)', fontSize: '0.6rem', letterSpacing: '0.05em', textAlign: 'center', marginTop: '-0.75rem' },
}
