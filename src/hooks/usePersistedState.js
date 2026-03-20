import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'fww-campaign'

const DEFAULT_STATE = {
  version: 1,
  player: {
    name: '',
    settlement: '',
    faction: '',
    leader: '',
    campaignStart: '',
    difficulty: 'Standard',
  },
  round: 0,
  roster: [],
  settlement: {
    capsTotal: 0,
    resourcesAvailable: 0,
    structures: [],
  },
  itemPool: {
    items: [],
  },
  eventCards: {},
  questCards: [],
  activeEvents: [],
}

function loadState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return { ...DEFAULT_STATE, ...parsed }
    }
  } catch (e) {
    console.error('Failed to load campaign state:', e)
  }
  return DEFAULT_STATE
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (e) {
    console.error('Failed to save campaign state:', e)
  }
}

export function usePersistedState() {
  const [state, setState] = useState(loadState)

  useEffect(() => {
    saveState(state)
  }, [state])

  const updateState = useCallback((updater) => {
    setState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      return { ...prev, ...next }
    })
  }, [])

  const exportData = useCallback(() => {
    const dataStr = JSON.stringify(state, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fww-campaign-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [state])

  const importData = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result)
          setState({ ...DEFAULT_STATE, ...data })
          resolve()
        } catch (err) {
          reject(err)
        }
      }
      reader.onerror = reject
      reader.readAsText(file)
    })
  }, [])

  return { state, setState, updateState, exportData, importData }
}

export { DEFAULT_STATE }
