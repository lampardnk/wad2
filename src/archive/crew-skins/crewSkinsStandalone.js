// The crew: nine original pirate characters for the hero card.
// Each one is just data, so you can edit, reorder or add your own.
//   accent: borders, tags, arrows   glow: the soft light round the card   tint: the avatar's backdrop
//   look: how the SVG avatar is drawn (see CrewSkinCard.vue)
export const CREW = [
  {
    id: 'marlo',
    name: 'Marlo Brine',
    role: 'Captain',
    line: 'Keeps the ship steady when the sea isn’t.',
    tags: ['Steady helm', 'Tide reader', 'Loyal'],
    accent: '#f2a541', glow: 'rgba(242, 165, 65, 0.45)', tint: '#173f4a',
    look: { skin: '#c68a5e', hair: 'crop', hairColor: '#2b1d16', outfit: '#1d5560', hat: 'tricorn', hatColor: '#12343b', beard: true, earring: true }
  },
  {
    id: 'kestrel',
    name: 'Kestrel Vane',
    role: 'Lookout',
    line: 'Spots trouble three islands away.',
    tags: ['Sharp eyes', 'Climber', 'Early riser'],
    accent: '#5ec8f2', glow: 'rgba(94, 200, 242, 0.45)', tint: '#16344f',
    look: { skin: '#f1c9a5', hair: 'bob', hairColor: '#3a2a4d', outfit: '#2a5d8a', goggles: true }
  },
  {
    id: 'odessa',
    name: 'Odessa Thorn',
    role: 'Quartermaster',
    line: 'Counts every coin and every rope.',
    tags: ['Organised', 'Fair', 'Unflappable'],
    accent: '#e5484d', glow: 'rgba(229, 72, 77, 0.45)', tint: '#3d1a22',
    look: { skin: '#7a4a32', hair: 'braid', hairColor: '#1b1414', outfit: '#6e1f2b', eyepatch: true }
  },
  {
    id: 'bo',
    name: 'Bo Tallow',
    role: 'Galley Master',
    line: 'Nobody mutinies on a full stomach.',
    tags: ['Stew wizard', 'Cheerful', 'Night owl'],
    accent: '#f3c14b', glow: 'rgba(243, 193, 75, 0.45)', tint: '#43361a',
    look: { skin: '#e9b48a', hair: 'crop', hairColor: '#6b4a2b', outfit: '#f5efe2', hat: 'bandana', hatColor: '#d9902b', stubble: true }
  },
  {
    id: 'isla',
    name: 'Isla Corrigan',
    role: 'Cartographer',
    line: 'Draws the coastlines nobody else has.',
    tags: ['Curious', 'Precise', 'Ink-stained'],
    accent: '#a78bfa', glow: 'rgba(167, 139, 250, 0.45)', tint: '#2a2350',
    look: { skin: '#d9a07a', hair: 'bun', hairColor: '#7b3f2a', outfit: '#4b3a8c', glasses: true }
  },
  {
    id: 'fen',
    name: 'Fen Okoro',
    role: 'Ship’s Medic',
    line: 'Patches up sails and sailors alike.',
    tags: ['Calm hands', 'Herbalist', 'Patient'],
    accent: '#4fd1a5', glow: 'rgba(79, 209, 165, 0.45)', tint: '#123f37',
    look: { skin: '#5a3825', hair: 'locs', hairColor: '#1a1311', outfit: '#e8f3ee', medic: true }
  },
  {
    id: 'rook',
    name: 'Rook Halloway',
    role: 'Gunner',
    line: 'Measures twice, fires once.',
    tags: ['Steady aim', 'Gruff', 'Soft heart'],
    accent: '#ff8a3d', glow: 'rgba(255, 138, 61, 0.45)', tint: '#3f2616',
    look: { skin: '#b07a52', hair: 'none', hairColor: '#2f2a26', outfit: '#3d4a57', hat: 'beanie', hatColor: '#2f3e4d', scar: true, stubble: true }
  },
  {
    id: 'wren',
    name: 'Wren Sallow',
    role: 'Rigger',
    line: 'Lives halfway up the mast.',
    tags: ['Fearless', 'Knot expert', 'Quick'],
    accent: '#ff6f91', glow: 'rgba(255, 111, 145, 0.45)', tint: '#47202e',
    look: { skin: '#f4d2b8', hair: 'ponytail', hairColor: '#b5833f', outfit: '#2e6f6a', headband: '#ff6f91' }
  },
  {
    id: 'tamsin',
    name: 'Tamsin Gale',
    role: 'Storm Caller',
    line: 'Smells the weather before it turns.',
    tags: ['Wise', 'Weather-wise', 'Storyteller'],
    accent: '#7c83ff', glow: 'rgba(124, 131, 255, 0.45)', tint: '#22264d',
    look: { skin: '#e6c1a3', hair: 'long', hairColor: '#e9e6f2', outfit: '#3a3f7a', earring: true, wrinkles: true }
  }
]
