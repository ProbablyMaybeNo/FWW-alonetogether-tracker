import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Tab render crashed:', error, info?.componentStack)
  }

  componentDidUpdate(prevProps) {
    // Clear the error when the user switches tabs so a crash in one tab
    // doesn't trap the whole app.
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null })
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="p-8 max-w-2xl mx-auto">
          <div className="border border-danger rounded-lg bg-danger-dim/15 p-5"
            style={{ boxShadow: '0 0 12px var(--color-danger-glow)' }}>
            <div className="text-danger text-sm font-bold tracking-widest mb-2">SOMETHING WENT WRONG</div>
            <p className="text-pip text-xs mb-3">
              This screen hit an error and couldn't render. Your campaign data is safe — switch to another tab
              and back, or reload the page.
            </p>
            <pre className="text-muted text-[11px] whitespace-pre-wrap break-words bg-panel-alt rounded p-2 border border-pip-dim/30 mb-3">
              {String(this.state.error?.message || this.state.error)}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="text-[10px] tracking-widest px-3 py-1.5 border border-pip text-pip rounded hover:bg-pip-dim/20 font-bold"
            >
              RELOAD
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
