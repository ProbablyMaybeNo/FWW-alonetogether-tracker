import { useState } from 'react'
import { X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

export default function AccountModal({ onClose }) {
  const { user, profile, signOut } = useAuth()
  const [changingPw, setChangingPw] = useState(false)
  const [pw, setPw] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const rawEmail = user?.email ?? ''
  const displayEmail = rawEmail.endsWith('@fww-tracker.app') ? null : rawEmail

  async function handleChangePw(e) {
    e.preventDefault()
    setPwError('')
    if (pw !== pwConfirm) { setPwError('Passwords do not match.'); return }
    if (pw.length < 6) { setPwError('Minimum 6 characters.'); return }
    setPwLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: pw })
      if (error) throw error
      setPwSuccess('Password updated successfully.')
      setPw('')
      setPwConfirm('')
      setChangingPw(false)
    } catch (e) {
      setPwError(e.message)
    } finally {
      setPwLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }}>
      <div className="w-full max-w-sm bg-panel border border-pip-mid/50 rounded font-mono" style={{ boxShadow: '0 0 30px var(--color-pip-glow)' }}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-pip-mid/30">
          <span className="text-title text-xs font-bold tracking-widest">ACCOUNT</span>
          <button onClick={onClose} className="text-muted hover:text-pip transition-colors"><X size={14} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="space-y-3">
            <div>
              <div className="text-label text-xs tracking-wider mb-0.5">USERNAME</div>
              <div className="text-pip font-bold">{profile?.username ?? '—'}</div>
            </div>
            {displayEmail && (
              <div>
                <div className="text-label text-xs tracking-wider mb-0.5">EMAIL</div>
                <div className="text-pip">{displayEmail}</div>
              </div>
            )}
          </div>

          <div className="border-t border-pip-mid/20 pt-4">
            {!changingPw ? (
              <button
                onClick={() => { setChangingPw(true); setPwSuccess('') }}
                className="text-xs text-pip border border-pip-mid/40 px-3 py-1.5 rounded hover:bg-pip-dim/20 transition-colors"
              >
                CHANGE PASSWORD
              </button>
            ) : (
              <form onSubmit={handleChangePw} className="space-y-2">
                <div className="text-title text-xs font-bold tracking-wider mb-2">CHANGE PASSWORD</div>
                <input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="New password" className="w-full text-sm py-2 px-3" autoFocus />
                <input type="password" value={pwConfirm} onChange={e => setPwConfirm(e.target.value)} placeholder="Confirm password" className="w-full text-sm py-2 px-3" />
                {pwError && <div className="text-danger text-xs">{pwError}</div>}
                <div className="flex gap-2">
                  <button type="submit" disabled={pwLoading} className="px-3 py-1.5 text-xs border border-pip text-pip rounded hover:bg-pip-dim/20">
                    {pwLoading ? 'SAVING...' : 'SAVE'}
                  </button>
                  <button type="button" onClick={() => setChangingPw(false)} className="px-3 py-1.5 text-xs border border-muted/30 text-muted rounded hover:text-pip hover:border-pip">
                    CANCEL
                  </button>
                </div>
              </form>
            )}
            {pwSuccess && <div className="text-pip text-xs mt-2">{pwSuccess}</div>}
          </div>

          <div className="border-t border-danger/20 pt-4">
            {!deleteConfirm ? (
              <button onClick={() => setDeleteConfirm(true)} className="text-xs text-danger border border-danger/30 px-3 py-1.5 rounded hover:bg-danger/10 transition-colors">
                DELETE ACCOUNT
              </button>
            ) : (
              <div className="space-y-2">
                <div className="text-danger text-xs">Sign out and contact support to delete your account.</div>
                <div className="flex gap-2">
                  <button onClick={signOut} className="px-3 py-1.5 text-xs border border-danger text-danger rounded hover:bg-danger/10">SIGN OUT</button>
                  <button onClick={() => setDeleteConfirm(false)} className="px-3 py-1.5 text-xs border border-muted/30 text-muted rounded hover:text-pip hover:border-pip">CANCEL</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
