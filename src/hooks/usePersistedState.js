import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'fww-campaign'

const DEFAULT_STATE = {
  version: 2,
  player: {
    name: '',
    settlement: '',
    faction: '',
    leader: '',
    campaignStart: '',
  },
  phase: 1,
  round: 0,
  battleCount: 0,
  caps: 0,
  roster: [],
  settlement: {
    structures: [],
    landPurchased: false,
  },
  itemPool: {
    items: [],
  },
  eventCards: {},
  activeEvents: [],
  questCards: [],
  activeScavengerObjective: null,
  completedObjectives: [],
  objectiveProgress: {},
  secretPurposeHistory: [],
}

function migrateState(stored) {
  if (!stored.version || stored.version === 1) {
    const migrated = {
      ...DEFAULT_STATE,
      ...stored,
      version: 2,
      phase: stored.phase ?? 1,
      battleCount: stored.battleCount ?? 0,
      caps: stored.settlement?.capsTotal ?? stored.caps ?? 0,
      settlement: {
        structures: stored.settlement?.structures ?? [],
        landPurchased: false,
      },
      player: {
        name: stored.player?.name ?? '',
        settlement: stored.player?.settlement ?? '',
        faction: stored.player?.faction ?? '',
        leader: stored.player?.leader ?? '',
        campaignStart: stored.player?.campaignStart ?? '',
      },
      questCards: (stored.questCards || []).map(q => ({
        id: q.id ?? Date.now() + Math.random(),
        name: q.name ?? '',
        part: q.part ?? 1,
        status: q.status ?? (q.active ? 'Active' : 'Active'),
        startedRound: q.startedRound ?? 0,
      })),
      roster: (stored.roster || []).map(u => ({
        ...u,
        lucScore: u.lucScore ?? 3,
        perks: u.perks ?? [],
        addiction: u.addiction ?? '',
        capturedBy: u.capturedBy ?? '',
        captureRound: u.captureRound ?? null,
      })),
      activeScavengerObjective: stored.activeScavengerObjective ?? null,
      completedObjectives: stored.completedObjectives ?? [],
      objectiveProgress: stored.objectiveProgress ?? {},
      secretPurposeHistory: stored.secretPurposeHistory ?? [],
    }
    return migrated
  }
  return stored
}

function loadState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      const migrated = migrateState(parsed)
      return { ...DEFAULT_STATE, ...migrated }
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
          const migrated = migrateState(data)
          setState({ ...DEFAULT_STATE, ...migrated })
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
