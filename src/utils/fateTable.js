export const FATE_TABLE = [
  { roll: '1', result: 'Nothing', description: 'Full recovery.' },
  { roll: '2-4', result: 'Delayed', description: 'Misses next battle.' },
  { roll: '5-7', result: 'Lost', description: 'Missing — rescue needed.' },
  { roll: '8', result: 'Inj-Arm', description: 'Crippled Arm until healed.' },
  { roll: '9', result: 'Inj-Leg', description: 'Crippled Leg until healed.' },
  { roll: '10-11', result: 'Captured', description: 'Held captive.' },
  { roll: '12', result: 'Dead', description: 'Permanently removed.' },
]

export function rollFate() {
  const roll = Math.floor(Math.random() * 12) + 1
  if (roll === 1) return { roll, ...FATE_TABLE[0] }
  if (roll <= 4) return { roll, ...FATE_TABLE[1] }
  if (roll <= 7) return { roll, ...FATE_TABLE[2] }
  if (roll === 8) return { roll, ...FATE_TABLE[3] }
  if (roll === 9) return { roll, ...FATE_TABLE[4] }
  if (roll <= 11) return { roll, ...FATE_TABLE[5] }
  return { roll, ...FATE_TABLE[6] }
}

export const STATUS_OPTIONS = ['Active', 'Delayed', 'Lost', 'Captured', 'Inj-Arm', 'Inj-Leg', 'Dead']
