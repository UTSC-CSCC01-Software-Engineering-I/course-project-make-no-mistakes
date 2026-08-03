export const RIDING_OPTIONS = [
  {
    id: 1,
    name: 'Toronto Centre',
  },
  {
    id: 2,
    name: 'Spadina-Fort York',
  },
  {
    id: 3,
    name: 'Scarborough North',
  },
  {
    id: 4,
    name: 'Ottawa West-Nepean',
  },
  {
    id: 5,
    name: 'Hamilton Mountain',
  },
  {
    id: 6,
    name: 'Mississauga East-Cooksville',
  },
]

const RIDING_NAMES_BY_ID = RIDING_OPTIONS.reduce((namesById, riding) => ({
  ...namesById,
  [riding.id]: riding.name,
}), {})

export function getRidingName(ridingId) {
  return RIDING_NAMES_BY_ID[Number(ridingId)] || `Riding ${ridingId}`
}
