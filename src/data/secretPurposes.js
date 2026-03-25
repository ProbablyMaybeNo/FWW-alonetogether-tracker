export const SECRET_PURPOSES = [
  { id: 1, name: 'Clear',     objective: 'Defeat more Inhabitants than all other players.',                          completedWhen: 'All Inhabitants have been removed from the board.' },
  { id: 2, name: 'Eliminate', objective: 'Defeat the highest-value Inhabitant from the Local Population deck.',      completedWhen: 'The designated target has been removed.' },
  { id: 3, name: 'Scout',     objective: 'Reveal more Investigation Markers than all other players.',                completedWhen: 'All Investigation Markers on the board have been revealed.' },
  { id: 4, name: 'Secure',    objective: 'Resolve more dangerous Searchables than all other players.',               completedWhen: 'Five dangerous Searchables have been removed.' },
  { id: 5, name: 'Scavenge',  objective: 'Collect more Item cards from Searchables than all other players.',         completedWhen: 'The required number of items has been collected.' },
  { id: 6, name: 'Find',      objective: 'Be the first to reveal an Investigation Marker showing a Searchable icon.', completedWhen: "A player's model reveals the required marker." },
  { id: 7, name: 'Raid',      objective: 'Secure more items from Searchables within Yellow of an Inhabitant.',       completedWhen: 'The required number of items are held by player models.' },
  { id: 8, name: 'Expertise', objective: 'Pass more Use Expertise tests on Searchable Markers than all other players.', completedWhen: 'All Searchables requiring Expertise have been resolved.' },
]
