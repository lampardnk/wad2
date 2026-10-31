// ARCHIVED (not used by the app). Crew skins for the Travel Twin: nine pirate characters of our own,
// each a whole outfit in one tap. See README.md in this folder for how to put them back.
import { cleanLook } from '../../../shared/avatarCatalog.js'

export const CREW = [
  {
    id: 'marlo', name: 'Marlo Brine', role: 'Captain', tier: 1, accent: '#f2a541', tint: '#173f4a',
    portrait: { skin: '#c68a5e', hair: 'crop', hairColor: '#2b1d16', outfit: '#1d5560', hat: 'tricorn', hatColor: '#12343b', beard: true, earring: true },
    look: { skin: 'tan', hair: 'short', hairColor: 'espresso', face: 'beard', top: 'linen', topColor: 'navy', hat: 'tricorn', outerwear: 'none', bottom: 'chinos', shoes: 'slipons', bag: 'none', gear: ['earring'] }
  },
  {
    id: 'kestrel', name: 'Kestrel Vane', role: 'Lookout', tier: 1, accent: '#5ec8f2', tint: '#16344f',
    portrait: { skin: '#f1c9a5', hair: 'bob', hairColor: '#3a2a4d', outfit: '#2a5d8a', goggles: true },
    look: { skin: 'light', hair: 'bob', hairColor: 'plum', face: 'none', top: 'tee', topColor: 'navy', hat: 'none', outerwear: 'denim', bottom: 'shorts', shoes: 'sneakers', bag: 'daypack', gear: ['goggles'] }
  },
  {
    id: 'bo', name: 'Bo Tallow', role: 'Galley Master', tier: 1, accent: '#f3c14b', tint: '#43361a',
    portrait: { skin: '#e9b48a', hair: 'crop', hairColor: '#6b4a2b', outfit: '#f5efe2', hat: 'bandana', hatColor: '#d9902b', stubble: true },
    look: { skin: 'light', hair: 'short', hairColor: 'chestnut', face: 'stubble', top: 'tee', topColor: 'cream', hat: 'bandana', outerwear: 'none', bottom: 'chinos', shoes: 'slipons', bag: 'none', gear: [] }
  },
  {
    id: 'isla', name: 'Isla Corrigan', role: 'Cartographer', tier: 2, accent: '#a78bfa', tint: '#2a2350',
    portrait: { skin: '#d9a07a', hair: 'bun', hairColor: '#7b3f2a', outfit: '#4b3a8c', glasses: true },
    look: { skin: 'tan', hair: 'bun', hairColor: 'auburn', face: 'none', top: 'linen', topColor: 'violet', hat: 'none', outerwear: 'none', bottom: 'chinos', shoes: 'boots', bag: 'daypack', gear: ['specs', 'pin'] }
  },
  {
    id: 'fen', name: 'Fen Okoro', role: 'Ship’s Medic', tier: 2, accent: '#4fd1a5', tint: '#123f37',
    portrait: { skin: '#5a3825', hair: 'locs', hairColor: '#1a1311', outfit: '#e8f3ee', medic: true },
    look: { skin: 'deep', hair: 'locs', hairColor: 'black', face: 'none', top: 'linen', topColor: 'cream', hat: 'none', outerwear: 'none', bottom: 'cargo', shoes: 'boots', bag: 'daypack', gear: [] }
  },
  {
    id: 'rook', name: 'Rook Halloway', role: 'Gunner', tier: 2, accent: '#ff8a3d', tint: '#3f2616',
    portrait: { skin: '#b07a52', hair: 'none', hairColor: '#2f2a26', outfit: '#3d4a57', hat: 'beanie', hatColor: '#2f3e4d', scar: true, stubble: true },
    look: { skin: 'olive', hair: 'buzz', hairColor: 'black', face: 'stubble', top: 'hoodie', topColor: 'navy', hat: 'beanie', outerwear: 'none', bottom: 'cargo', shoes: 'boots', bag: 'none', gear: [] }
  },
  {
    id: 'odessa', name: 'Odessa Thorn', role: 'Quartermaster', tier: 3, accent: '#e5484d', tint: '#3d1a22',
    portrait: { skin: '#7a4a32', hair: 'braid', hairColor: '#1b1414', outfit: '#6e1f2b', eyepatch: true },
    look: { skin: 'brown', hair: 'braid', hairColor: 'black', face: 'none', top: 'linen', topColor: 'sunset', hat: 'none', outerwear: 'explorer', bottom: 'jeans', shoes: 'boots', bag: 'none', gear: ['eyepatch', 'passport'] }
  },
  {
    id: 'wren', name: 'Wren Sallow', role: 'Rigger', tier: 3, accent: '#ff6f91', tint: '#47202e',
    portrait: { skin: '#f4d2b8', hair: 'ponytail', hairColor: '#b5833f', outfit: '#2e6f6a', headband: '#ff6f91' },
    look: { skin: 'porcelain', hair: 'pony', hairColor: 'honey', face: 'none', top: 'tee', topColor: 'teal', hat: 'none', outerwear: 'none', bottom: 'shorts', shoes: 'sneakers', bag: 'daypack', gear: ['headband'] }
  },
  {
    id: 'tamsin', name: 'Tamsin Gale', role: 'Storm Caller', tier: 3, accent: '#7c83ff', tint: '#22264d',
    portrait: { skin: '#e6c1a3', hair: 'long', hairColor: '#e9e6f2', outfit: '#3a3f7a', earring: true, wrinkles: true },
    look: { skin: 'light', hair: 'long', hairColor: 'silver', face: 'none', top: 'linen', topColor: 'violet', hat: 'none', outerwear: 'puffer', bottom: 'chinos', shoes: 'boots', bag: 'none', gear: ['earring', 'badges'] }
  }
]

// Is this look exactly a crew skin? (so its card shows as picked)
export function isCrewLook(look, c) {
  return JSON.stringify(cleanLook(look)) === JSON.stringify(cleanLook(c.look))
}
