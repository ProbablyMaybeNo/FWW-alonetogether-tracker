import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

export default function LoginPage({ onSolo }) {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!username.trim()) { setError('Username is required.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }

    setLoading(true)
    try {
      if (mode === 'login') {
        await signIn(username, password)
      } else {
        await signUp(username, password)
      }
    } catch (err) {
      // Surface a friendlier message for common errors
      const msg = err?.message ?? 'Unknown error'
      if (msg.includes('Invalid login credentials')) {
        setError('Invalid username or password.')
      } else if (msg.includes('User already registered')) {
        setError('That username is already taken.')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.root}>
      {/* Scanline handled by body::after in index.css */}
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.logo}>FWW</div>
          <div style={styles.subtitle}>ALONE TOGETHER</div>
          <div style={styles.tagline}>CAMPAIGN TRACKER v3</div>
        </div>

        {/* Mode toggle */}
        <div style={styles.toggle}>
          <button
            style={{ ...styles.toggleBtn, ...(mode === 'login' ? styles.toggleActive : {}) }}
            onClick={() => { setMode('login'); setError('') }}
            type="button"
          >
            LOGIN
          </button>
          <button
            style={{ ...styles.toggleBtn, ...(mode === 'signup' ? styles.toggleActive : {}) }}
            onClick={() => { setMode('signup'); setError('') }}
            type="button"
          >
            CREATE ACCOUNT
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>USERNAME OR EMAIL</label>
          <input
            style={styles.input}
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="vault_dweller_77 or you@gmail.com"
            autoComplete="username"
            spellCheck={false}
            disabled={loading}
          />

          <label style={styles.label}>PASSWORD</label>
          <input
            style={styles.input}
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            disabled={loading}
          />

          {error && <div style={styles.error}>{error}</div>}

          <button
            style={{ ...styles.btn, ...(loading ? styles.btnDisabled : {}) }}
            type="submit"
            disabled={loading}
          >
            {loading ? 'PLEASE WAIT...' : mode === 'login' ? 'LOGIN' : 'CREATE ACCOUNT'}
          </button>
        </form>

        {/* Divider */}
        <div style={styles.divider}>
          <span style={styles.dividerLine} />
          <span style={styles.dividerText}>OR</span>
          <span style={styles.dividerLine} />
        </div>

        {/* Solo play */}
        <button
          style={styles.soloBtn}
          onClick={onSolo}
          type="button"
        >
          PLAY SOLO (LOCAL ONLY)
        </button>
        <div style={styles.soloNote}>
          No sync — uses this device only
        </div>
      </div>
    </div>
  )
}

// Inline styles using the pip-boy palette
const styles = {
  root: {
    minHeight: '100vh',
    background: 'var(--color-terminal)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-family-mono)',
    padding: '1rem',
  },
  card: {
    width: '100%',
    maxWidth: '380px',
    background: 'var(--color-panel)',
    border: '1px solid var(--color-pip-dim)',
    boxShadow: '0 0 30px var(--color-pip-glow), 0 0 60px rgba(0,0,0,0.8)',
    padding: '2rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  header: {
    textAlign: 'center',
    borderBottom: '1px solid var(--color-pip-dim)',
    paddingBottom: '1.25rem',
  },
  logo: {
    color: 'var(--color-pip)',
    fontSize: '2.5rem',
    fontWeight: 'bold',
    letterSpacing: '0.4em',
    textShadow: '0 0 20px var(--color-pip), 0 0 40px var(--color-pip-glow)',
    lineHeight: 1,
  },
  subtitle: {
    color: 'var(--color-amber)',
    fontSize: '0.7rem',
    letterSpacing: '0.25em',
    marginTop: '0.25rem',
  },
  tagline: {
    color: 'var(--color-muted)',
    fontSize: '0.6rem',
    letterSpacing: '0.2em',
    marginTop: '0.25rem',
  },
  toggle: {
    display: 'flex',
    border: '1px solid var(--color-pip-dim)',
  },
  toggleBtn: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    color: 'var(--color-muted)',
    fontFamily: 'var(--font-family-mono)',
    fontSize: '0.65rem',
    letterSpacing: '0.15em',
    padding: '0.6rem',
    cursor: 'pointer',
    transition: 'color 0.15s, background 0.15s',
  },
  toggleActive: {
    background: 'var(--color-pip-dim)',
    color: 'var(--color-pip)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  label: {
    color: 'var(--color-muted)',
    fontSize: '0.6rem',
    letterSpacing: '0.2em',
    marginTop: '0.25rem',
  },
  input: {
    background: 'var(--color-terminal)',
    border: '1px solid var(--color-pip-dim)',
    color: 'var(--color-pip)',
    fontFamily: 'var(--font-family-mono)',
    fontSize: '0.85rem',
    padding: '0.6rem 0.75rem',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  },
  error: {
    background: 'var(--color-danger-dim)',
    border: '1px solid var(--color-danger)',
    color: 'var(--color-danger)',
    fontSize: '0.7rem',
    letterSpacing: '0.05em',
    padding: '0.5rem 0.75rem',
    marginTop: '0.25rem',
  },
  btn: {
    background: 'var(--color-pip-dim)',
    border: '1px solid var(--color-pip)',
    color: 'var(--color-pip)',
    fontFamily: 'var(--font-family-mono)',
    fontSize: '0.75rem',
    letterSpacing: '0.2em',
    padding: '0.75rem',
    cursor: 'pointer',
    marginTop: '0.5rem',
    textShadow: '0 0 8px var(--color-pip)',
    boxShadow: '0 0 10px var(--color-pip-glow)',
    transition: 'background 0.15s, box-shadow 0.15s',
  },
  btnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
    boxShadow: 'none',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    background: 'var(--color-pip-dim)',
    display: 'block',
  },
  dividerText: {
    color: 'var(--color-muted)',
    fontSize: '0.6rem',
    letterSpacing: '0.2em',
  },
  soloBtn: {
    background: 'transparent',
    border: '1px solid var(--color-pip-dim)',
    color: 'var(--color-muted)',
    fontFamily: 'var(--font-family-mono)',
    fontSize: '0.7rem',
    letterSpacing: '0.15em',
    padding: '0.65rem',
    cursor: 'pointer',
    transition: 'color 0.15s, border-color 0.15s',
    width: '100%',
  },
  soloNote: {
    color: 'var(--color-pip-dim)',
    fontSize: '0.6rem',
    letterSpacing: '0.05em',
    textAlign: 'center',
    marginTop: '-0.75rem',
  },
}
