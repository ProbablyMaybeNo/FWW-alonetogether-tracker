export function drawCard(deckType, eventCardsState, allCards) {
  const available = allCards.filter(card => {
    if (card.deckType !== deckType) return false
    const state = eventCardsState[card.id]
    return !state || (!state.drawn && !state.complete)
  })
  if (available.length === 0) return null
  const pick = available[Math.floor(Math.random() * available.length)]
  return pick
}

export function getAvailableCount(deckType, eventCardsState, allCards) {
  return allCards.filter(card => {
    if (card.deckType !== deckType) return false
    const state = eventCardsState[card.id]
    return !state || (!state.drawn && !state.complete)
  }).length
}

export function getDeckStats(deckType, eventCardsState, allCards) {
  const deckCards = allCards.filter(c => c.deckType === deckType)
  const total = deckCards.length
  let drawn = 0, inPlay = 0, completed = 0
  deckCards.forEach(card => {
    const state = eventCardsState[card.id]
    if (state?.complete) completed++
    else if (state?.inPlay) inPlay++
    else if (state?.drawn) drawn++
  })
  return { total, available: total - drawn - inPlay - completed, drawn, inPlay, completed }
}
