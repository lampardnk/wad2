// Comments on places: one thread per place, shared by Places > Wishlist, Places > Group decisions
// and the itinerary stop with the same name (a place is known by its name, in lowercase),
// so a comment posted in one shows in the others without reloading.
import { reactive } from 'vue'
import axios from 'axios'
import { notify, errorText } from '../ui/notify.js'

export const placeComments = reactive({ tripId: '', list: [] })

// Loaded each time a Places tab opens, so new comments from the group show up
export async function loadPlaceComments(tripId) {
  if (placeComments.tripId !== tripId) placeComments.list = [] // another trip's comments never show here
  placeComments.tripId = tripId
  try {
    const res = await axios.get('/api/trips/' + tripId + '/place-comments')
    if (placeComments.tripId === tripId) placeComments.list = res.data
  } catch (err) {
    notify(errorText(err, 'Could not load comments.'), () => loadPlaceComments(tripId))
  }
}

export function placeKey(name) {
  return String(name || '').trim().toLowerCase()
}

export function commentsOn(placeName) {
  const key = placeKey(placeName)
  return placeComments.list.filter((c) => c.place === key)
}

// true when it was saved
export async function addPlaceComment(tripId, placeName, text) {
  try {
    const res = await axios.post('/api/trips/' + tripId + '/place-comments', { place: placeName, text })
    placeComments.list.push(res.data)
    return true
  } catch (err) {
    notify(errorText(err, 'Could not post your comment.'))
    return false
  }
}

export async function deletePlaceComment(tripId, id) {
  try {
    await axios.delete('/api/trips/' + tripId + '/place-comments/' + id)
    placeComments.list = placeComments.list.filter((c) => c.id !== id)
    return true
  } catch (err) {
    notify(errorText(err, 'Could not delete the comment.'))
    return false
  }
}
