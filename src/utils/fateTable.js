const HOMESTEAD_OUTCOMES = [
  { result: 'Success',     weight: 9,  fate: 'Fine',     description: 'Full recovery. Model returns next battle.' },
  { result: 'Bottle',      weight: 6,  fate: 'Delayed',  description: 'Unavailable for 1 battle.' },
  { result: '2× Bottle',   weight: 2,  fate: 'Lost',     description: 'Missing until found via Explore cards.' },
  { result: 'Star',        weight: 4,  fate: 'Shaken',   description: 'Cannot remove last 2 Regular Damage next battle.' },
  { result: 'Nuke',        weight: 2,  fate: 'Captured', description: 'Unavailable until ransomed or rescued.' },
  { result: '2× Star',     weight: 2,  fate: 'Injured',  description: 'Gains Injured Arm for next battle only.' },
  { result: 'Bottle+Star', weight: 1,  fate: 'Dead',     description: 'Permanently removed from roster.' },
]

export const FATE_TABLE = HOMESTEAD_OUTCOMES

const TOTAL_WEIGHT = HOMESTEAD_OUTCOMES.reduce((s, o) => s + o.weight, 0)

function weightedRoll() {
  let r = Math.floor(Math.random() * TOTAL_WEIGHT)
  for (const outcome of HOMESTEAD_OUTCOMES) {
    if (r < outcome.weight) return outcome
    r -= outcome.weight
  }
  return HOMESTEAD_OUTCOMES[HOMESTEAD_OUTCOMES.length - 1]
}

export function rollFate(lucScore = 3, timesRemoved = 0) {
  const threshold = lucScore + 5 - timesRemoved

  let outcome = weightedRoll()

  if (threshold >= 10 && outcome.fate === 'Dead') {
    outcome = weightedRoll()
  } else if (threshold >= 8 && (outcome.fate === 'Dead' || outcome.fate === 'Injured')) {
    outcome = weightedRoll()
  } else if (threshold <= 2 && outcome.fate === 'Fine') {
    outcome = weightedRoll()
  }

  if (threshold <= 0 && outcome.fate === 'Fine') {
    outcome = HOMESTEAD_OUTCOMES[1] // Delayed minimum
  }

  return {
    diceResult: outcome.result,
    fate: outcome.fate,
    description: outcome.description,
    threshold,
  }
}

export const STATUS_OPTIONS = ['Active', 'Delayed', 'Lost', 'Shaken', 'Captured', 'Injured', 'Dead']
