// Comments on saved places, shared by Places > Wishlist and Places > Group decisions,
// so a comment posted on one tab shows on the other without reloading.
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

export function commentsOn(wishId) {
  return placeComments.list.filter((c) => c.wishId === wishId)
}

// true when it was saved
export async function addPlaceComment(tripId, wishId, text) {
  try {
    const res = await axios.post('/api/trips/' + tripId + '/place-comments', { wishId, text })
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
