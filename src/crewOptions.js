// Choices for the crew "Your details" form (used by CrewView and CrewDetailsForm)

// Food needs. "common" ones show straight away; the rest appear when you type.
export const DIETS = [
  { key: 'halal', icon: '☪️', label: 'Halal', common: true },
  { key: 'vegetarian', icon: '🌱', label: 'Vegetarian', common: true },
  { key: 'vegan', icon: '🥦', label: 'Vegan', common: true },
  { key: 'no-pork', icon: '🐖', label: 'No pork', common: true },
  { key: 'no-beef', icon: '🐄', label: 'No beef', common: true },
  { key: 'gluten-free', icon: '🌾', label: 'Gluten-free', common: true },
  { key: 'shellfish-allergy', icon: '🦐', label: 'Shellfish allergy', allergy: true, common: true },
  { key: 'nut-allergy', icon: '🥜', label: 'Nut allergy', allergy: true, common: true },
  { key: 'seafood-allergy', icon: '🐟', label: 'Seafood allergy', allergy: true },
  { key: 'egg-allergy', icon: '🥚', label: 'Egg allergy', allergy: true },
  { key: 'kosher', icon: '✡️', label: 'Kosher' },
  { key: 'lactose-free', icon: '🥛', label: 'Lactose-free' }
]

// A saved tag -> what to show. Custom tags like "No spicy food" are kept as typed.
export function dietTag(tag) {
  for (const d of DIETS) {
    if (d.key === tag) return d
  }
  return { key: tag, icon: '🍽', label: tag, allergy: /allerg/i.test(tag) }
}

export const PERSONAS = ['Chief Foodie', 'Navigator', 'Photographer', 'Budget Keeper']

export const PHONE_CODES = [
  { value: '+65', label: '+65', icon: '🇸🇬', description: 'Singapore' },
  { value: '+60', label: '+60', icon: '🇲🇾', description: 'Malaysia' },
  { value: '+62', label: '+62', icon: '🇮🇩', description: 'Indonesia' },
  { value: '+66', label: '+66', icon: '🇹🇭', description: 'Thailand' },
  { value: '+63', label: '+63', icon: '🇵🇭', description: 'Philippines' },
  { value: '+84', label: '+84', icon: '🇻🇳', description: 'Vietnam' },
  { value: '+81', label: '+81', icon: '🇯🇵', description: 'Japan' },
  { value: '+82', label: '+82', icon: '🇰🇷', description: 'South Korea' },
  { value: '+86', label: '+86', icon: '🇨🇳', description: 'China' },
  { value: '+852', label: '+852', icon: '🇭🇰', description: 'Hong Kong' },
  { value: '+886', label: '+886', icon: '🇹🇼', description: 'Taiwan' },
  { value: '+91', label: '+91', icon: '🇮🇳', description: 'India' },
  { value: '+61', label: '+61', icon: '🇦🇺', description: 'Australia' },
  { value: '+44', label: '+44', icon: '🇬🇧', description: 'United Kingdom' },
  { value: '+1', label: '+1', icon: '🇺🇸', description: 'US / Canada' }
]
